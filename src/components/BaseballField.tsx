import { Info, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useUser } from "@clerk/clerk-react";
import { toast } from "./ui/use-toast";
import { supabase } from "@/lib/admin";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

interface PlayerCardProps {
  name: string;
  position: string;
  points: number;
  jersey: string;
  isCaptain?: boolean;
  isStarter?: boolean;
}

function PlayerCard({
  name,
  position,
  points,
  jersey,
  isCaptain,
  isStarter,
}: PlayerCardProps) {
  return (
    <div className="relative w-32 text-center">
      <div className="flex flex-col items-center">
        <div className="relative w-16 h-16">
          <img
            src={jersey}
            alt={name}
            className="relative z-10 rounded-md border border-border bg-card"
            width={64}
            height={40}
          />
          <button className="absolute -right-1 -top-1 z-20 rounded-full bg-background p-0.5 border border-border">
            <Info className="w-3 h-3" />
          </button>
          {isStarter && (
            <div className="absolute -left-1 -top-1 z-20 rounded-full bg-background p-0.5 border border-border">
              <Star className="w-3 h-3 fill-primary text-primary" />
            </div>
          )}
        </div>
        <div className="z-10 text-sm font-medium truncate mt-1">{name}</div>
        <div className="z-10 flex items-center justify-center gap-2 text-xs mt-0.5">
          <div className="px-1.5 py-0.5 rounded bg-[#FDFBF7] text-[#8B7355] font-medium">
            +{points}
          </div>
        </div>
      </div>
    </div>
  );
}

const genAI = new GoogleGenerativeAI("AIzaSyCCnrDaiXhJY6PwrH_RVM9N7hT6uhRzpAw");

const pointsSchema = {
  type: SchemaType.OBJECT,
  properties: {
    playerPoints: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          name: { type: SchemaType.STRING },
          points: { type: SchemaType.NUMBER },
        },
        required: ["name", "points"],
      },
    },
  },
  required: ["playerPoints"],
};

async function generatePlayerPoints(players: any[]) {
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: pointsSchema,
    },
  });

  const prompt = `Generate fantasy baseball points for these players: ${players
    .map((p) => p.player_first_name)
    .join(", ")}. 
    Points should be between 0 and 100. To create a scoring mechanism for grading any player based on these metrics (WAR, AB, H, HR, etc.), you'll need to:

Determine the Key Metrics

Choose the most impactful stats for evaluating overall performance.
A balanced system should include offensive, defensive, and value-based stats.
Example:
Value-Based: WAR
Hitting: BA, HR, RBI, OBP, SLG, OPS+
Speed: SB
Playing Time: AB (higher AB means more consistency)
Assign Weights to Each Metric

Not all stats contribute equally.
Example weighting:
WAR (Overall Value) → 30%
OPS+ (Adjusted Offensive Performance) → 20%
BA (Batting Average) → 10%
HR (Power Hitting) → 10%
RBI (Run Production) → 10%
OBP (On-Base Ability) → 10%
SB (Speed & Base Running) → 5%
AB (Playing Time/Consistency) → 5%

Return as JSON with playerPoints array containing objects with name and points.`;

  try {
    const result = await model.generateContent(prompt);
    const response = JSON.parse(result.response.text());

    // Calculate total score
    const totalScore = response.playerPoints.reduce(
      (sum: number, player: any) => sum + player.points,
      0
    );

    // Update points in the database and save total score
    for (const playerPoint of response.playerPoints) {
      const player = players.find(
        (p) => p.player_first_name === playerPoint.name
      );
      if (player) {
        const { error } = await supabase
          .from("baseball_fans")
          .update({ points: playerPoint.points })
          .eq("player_id", player.player_id);

        if (error) {
          console.error("Error updating points:", error);
        }
      }
    }

    // Update the total score for the user
    const { error: scoreError } = await supabase
      .from("baseball_fan")
      .update({ score: totalScore })
      .eq("user_id", players[0].user_id)
      .select();

    if (scoreError) {
      console.error("Error updating score:", scoreError);
    }

    return response.playerPoints;
  } catch (error) {
    console.error("Error generating points:", error);
    return players.map((p) => ({ name: p.player_first_name, points: 0 }));
  }
}

export default function BaseballField() {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const { user } = useUser();

  useEffect(() => {
    async function fetchPlayers() {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from("baseball_fans")
          .select("*")
          .eq("user_id", user?.id);

        if (error) throw error;

        // Generate points for players and update database
        const pointsData = await generatePlayerPoints(data);

        // Map players with their positions and points
        const playersWithPositions = data.map((player) => ({
          ...player,
          position: player.player_position,
          points:
            pointsData.find((p) => p.name === player.player_first_name)
              ?.points || 0,
        }));

        setPlayers(playersWithPositions);
      } catch (error) {
        console.error("Error fetching players:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchPlayers();
  }, [user?.id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  const getPlayerByPosition = (position: string) => {
    return players.find((p) => p.assigned_position === position) || null;
  };

  const getEligiblePlayers = (position: string) => {
    // Define position eligibility rules
    const eligibilityMap: { [key: string]: string[] } = {
      P: ["P"],
      C: ["C"],
      "1B": ["1B", "DH"],
      "2B": ["2B", "SS", "IF"],
      "3B": ["3B", "IF"],
      SS: ["SS", "2B", "IF"],
      LF: ["LF", "OF"],
      CF: ["CF", "OF"],
      RF: ["RF", "OF"],
    };

    return players.filter(
      (player) =>
        // Player is not already assigned to a position and matches eligibility
        !player.assigned_position &&
        eligibilityMap[position]?.includes(player.player_position)
    );
  };

  const handlePositionClick = (position: string) => {
    setSelectedPosition(position);
    setShowModal(true);
  };

  const assignPlayerToPosition = async (playerId: string, position: string) => {
    try {
      // Find the player currently in the selected position (if any)
      const currentPositionPlayer = players.find(
        (p) => p.assigned_position === position
      );

      // Update the local state with the swap
      setPlayers(
        players.map((player) => {
          if (player.player_id === playerId) {
            return { ...player, assigned_position: position };
          } else if (player.player_id === currentPositionPlayer?.player_id) {
            return { ...player, assigned_position: null };
          }
          return player;
        })
      );

      // Update new player's position
      const { error: error1 } = await supabase
        .from("baseball_fans")
        .update({ assigned_position: position })
        .eq("player_id", playerId)
        .select();

      if (error1) throw error1;

      // If there was a player in that position, update their position to null
      if (currentPositionPlayer) {
        const { error: error2 } = await supabase
          .from("baseball_fans")
          .update({ assigned_position: null })
          .eq("player_id", currentPositionPlayer.player_id)
          .select();

        if (error2) throw error2;
      }

      setShowModal(false);
      setSelectedPosition(null);
    } catch (error) {
      console.error("Error assigning player:", error);
      toast({
        title: "Error",
        description: "Failed to assign player. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderPlayerCard = (
    position: string,
    isStarter?: boolean,
    isCaptain?: boolean
  ) => {
    const player = getPlayerByPosition(position);
    return (
      <div onClick={() => handlePositionClick(position)}>
        <PlayerCard
          name={player ? player.player_first_name : `Add ${position}`}
          position={position}
          points={player ? player.points || 0 : 0}
          jersey={
            player ? player.player_image : "/placeholder.svg?height=64&width=64"
          }
          isStarter={isStarter}
          isCaptain={isCaptain}
        />
      </div>
    );
  };

  const saveLineup = async () => {
    try {
      setLoading(true);

      // Update each player's position one by one
      for (const player of players) {
        const { error } = await supabase
          .from("baseball_fans")
          .update({ assigned_position: player.assigned_position })
          .eq("player_id", player.player_id)
          .select();

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Your lineup has been saved.",
      });
    } catch (error) {
      console.error("Error saving lineup:", error);
      toast({
        title: "Error",
        description: "Failed to save lineup. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative aspect-[4/3] bg-[#2F6B25] rounded-lg overflow-hidden">
        {/* Baseball Diamond SVG */}
        <svg
          viewBox="0 0 400 300"
          className="absolute inset-0 w-full h-full"
          style={{ filter: "brightness(1.2)" }}
        >
          <path
            d="M200 250 L300 150 L200 50 L100 150 Z"
            fill="none"
            stroke="#8B4513"
            strokeWidth="4"
          />
          <circle cx="200" cy="150" r="50" fill="#C19A6B" />
          <path
            d="M200 250 L200 150"
            stroke="#8B4513"
            strokeWidth="4"
            strokeDasharray="4"
          />
          <path
            d="M100 150 L300 150"
            stroke="#8B4513"
            strokeWidth="4"
            strokeDasharray="4"
          />
        </svg>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full h-full">
            {/* Pitcher */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              {renderPlayerCard("P", true)}
            </div>

            {/* Catcher */}
            <div className="absolute left-1/2 bottom-[10%] -translate-x-1/2">
              {renderPlayerCard("C", false, true)}
            </div>

            {/* First Base */}
            <div className="absolute right-[30%] top-[60%] -translate-y-1/2">
              {renderPlayerCard("1B")}
            </div>

            {/* Second Base */}
            <div className="absolute right-[30%] top-[40%] -translate-y-1/2">
              {renderPlayerCard("2B")}
            </div>

            {/* Third Base */}
            <div className="absolute left-[30%] top-[60%] -translate-y-1/2">
              {renderPlayerCard("3B")}
            </div>

            {/* Shortstop */}
            <div className="absolute left-[30%] top-[40%] -translate-y-1/2">
              {renderPlayerCard("SS")}
            </div>

            {/* Left Field */}
            <div className="absolute left-[15%] top-[20%] -translate-y-1/2">
              {renderPlayerCard("LF")}
            </div>

            {/* Center Field */}
            <div className="absolute left-1/2 top-[10%] -translate-x-1/2">
              {renderPlayerCard("CF", true)}
            </div>

            {/* Right Field */}
            <div className="absolute right-[15%] top-[20%] -translate-y-1/2">
              {renderPlayerCard("RF")}
            </div>
          </div>
        </div>
      </div>

      {/* Bench - now shows all unassigned players */}
      <div className="mt-4 p-4 bg-card rounded-lg border border-border">
        <div className="text-sm font-medium mb-3">Bench</div>
        <div className="flex gap-4 overflow-x-auto pb-2">
          {players
            .filter((player) => !player.assigned_position)
            .map((player, index) => (
              <PlayerCard
                key={index}
                name={player.player_first_name}
                position={player.player_position}
                points={player.points || 0}
                jersey={player.player_image}
              />
            ))}
        </div>
      </div>

      {/* Position Selection Modal */}
      {showModal && selectedPosition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-lg max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">
              Select Player for {selectedPosition}
            </h3>
            <div className="space-y-2">
              {getEligiblePlayers(selectedPosition).map((player) => (
                <button
                  key={player.player_id}
                  className="w-full p-2 text-left hover:bg-gray-100 rounded flex items-center gap-3"
                  onClick={() =>
                    assignPlayerToPosition(player.player_id, selectedPosition)
                  }
                >
                  <img 
                    src={player.player_image} 
                    alt={player.player_first_name}
                    className="w-10 h-13 rounded-md border border-border bg-card"
                  />
                  <span>{player.player_first_name} ({player.player_position})</span>
                </button>
              ))}
            </div>
            <button
              className="mt-4 w-full p-2 bg-gray-200 rounded"
              onClick={() => setShowModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
