import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Search, X, Check, Eye, Lightbulb, User } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { getPlayerImage } from "../api/player-image";
import { GoogleGenerativeAI } from "@google/generative-ai";
import confetti from 'canvas-confetti';
import { useAuth, SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import BaseballField from "@/components/BaseballField";
import { supabase } from "@/lib/admin";
import Leaderboard from "@/components/Leaderboard";

interface Guess {
  name: string;
  isCorrect: boolean;
  playerImage?: string;
  feedback: {
    team: boolean;
    position: boolean;
    age: "higher" | "lower" | "correct" | null;
  };
}

interface Player {
  first_name: string;
  last_name: string;
  fullName: string;
  team: string;
  position: string;
  age: number;
  id: number;
}

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

const MLBGame = () => {
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [playerImage, setPlayerImage] = useState("");
  const [isImageRevealed, setIsImageRevealed] = useState(false);
  const [clue, setClue] = useState("");
  const [targetPlayer, setTargetPlayer] = useState<Player>({
    first_name: "",
    last_name: "",
    fullName: "",
    team: "",
    position: "",
    age: 0,
    id: 0
  });
  const { toast } = useToast();

  // Add new state for player data
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const { isLoaded, user } = useUser()

  const userId = user?.id

  const userName = user?.firstName

  

  //console.log("UserId", userId)

   

  const genAI = new GoogleGenerativeAI(
    "AIzaSyCCnrDaiXhJY6PwrH_RVM9N7hT6uhRzpAw"
  );
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const { isSignedIn } = useAuth();

  // Add new state for points
  const [userPoints, setUserPoints] = useState<number | null>(null);

  const fetchRandomPlayer = async () => {
    try {
      // Reset states
      setGuesses([]);
      setCurrentGuess("");
      setPlayerImage("");
      setIsImageRevealed(false);
      setClue("");
      setChatMessages([]);
      
      // First, fetch all MLB teams
      const teamsResponse = await fetch(
        "https://statsapi.mlb.com/api/v1/teams?sportId=1&season=2024"
      );
      const teamsData = await teamsResponse.json();
      const teams = teamsData.teams;

      // Select a random team
      const randomTeam = teams[Math.floor(Math.random() * teams.length)];

      // Fetch roster for random team
      const rosterResponse = await fetch(
        `https://statsapi.mlb.com/api/v1/teams/${randomTeam.id}/roster?season=2024`
      );
      const rosterData = await rosterResponse.json();
      const roster = rosterData.roster;

      // Select random player from roster
      const randomPlayer = roster[Math.floor(Math.random() * roster.length)];

      // Fetch detailed player info
      const playerResponse = await fetch(
        `https://statsapi.mlb.com/api/v1/people/${randomPlayer.person.id}`
      );
      const playerData = await playerResponse.json();
      const player = playerData.people[0];

      //console.log("player:", player.firstName)

      setTargetPlayer({
        first_name: player.firstName,
        last_name: player.lastName,
        fullName: player.fullName,
        team: randomTeam.name,
        position: randomPlayer.position.abbreviation,
        age: calculateAge(player.birthDate),
        id: player.id,
      });

      // Add initial chat message from the bot
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [
              {
                text: `You are helping users guess an MLB player. The player is ${player.fullName}. 
                Give a brief introduction and a subtle hint about the player. DO NOT reveal the player's name directly.
                Make it fun and engaging! The player is on ${randomTeam.name} and plays ${randomPlayer.position.abbreviation}.`,
              },
            ],
          },
        ],
      });

      const result = await chat.sendMessage("Please introduce yourself and give a subtle hint about today's player.");
      const response = await result.response;

      setChatMessages([
        {
          role: "model",
          content: "👋 Hi there! I'm your MLB Player Guessing assistant! I'll help you figure out today's mystery player."
        },
        {
          role: "model",
          content: response.text()
        }
      ]);

      //console.log(`Selected player: ${player.fullName} from ${randomTeam.name}`);
    } catch (error) {
      console.error("Error fetching player:", error);
      toast({
        title: "Error",
        description: "Failed to load player data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Update useEffect to use the new fetchRandomPlayer function
  useEffect(() => {
    fetchRandomPlayer();
  }, []);

  // Add useEffect to handle user signup
  useEffect(() => {
    const createBaseballFan = async () => {
      if (!userId) return;

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('baseball_fan')
        .select()
        .eq('user_id', userId)
        .single();

      if (!existingUser) {
        // Insert new user if they don't exist
        const { error } = await supabase
          .from('baseball_fan')
          .insert([{ user_id: userId, user_name: userName }])
          .select();

        if (error) {
          console.error("Error creating baseball fan:", error);
          toast({
            title: "Error",
            description: "Failed to initialize user profile.",
            variant: "destructive",
          });
        }
      }
    };

    createBaseballFan();
  }, [userId]);

  // Add useEffect to fetch user points
  useEffect(() => {
    const fetchUserPoints = async () => {
      if (!userId) return;

      const { data, error } = await supabase
        .from('baseball_fan')
        .select('points')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error("Error fetching points:", error);
        return;
      }

      setUserPoints(data.points);
    };

    fetchUserPoints();
  }, [userId]);

  const handleGuess = async () => {
    if (!currentGuess) return;

    const isCorrect = currentGuess.toLowerCase() === targetPlayer.fullName.toLowerCase();
    let playerImageUrl = '';

    try {
      if (isCorrect) {
        // Only fetch image for correct guess using targetPlayer.id
        const { imageUrl } = await getPlayerImage(targetPlayer.id);
        playerImageUrl = imageUrl;
        
        // Set player image and reveal it immediately
        setPlayerImage(imageUrl);
        setIsImageRevealed(true);
        
        // Trigger confetti animation
        confetti({
          particleCount: 100,
          spread: 100,
          origin: { y: 0.6 }
        });

        // Save to Supabase if user is signed in
        if (userId) {
          const { error } = await supabase
            .from('baseball_fans')
            .insert([
              {
                user_id: userId,
                player_id: targetPlayer.id.toString(),
                player_first_name: targetPlayer.first_name,
                player_last_name: targetPlayer.last_name,
                player_image: imageUrl,
                player_team: targetPlayer.team,
                player_position: targetPlayer.position,
                player_age: targetPlayer.age.toString()
              }
            ]);

          if (error) {
            console.error("Error saving to Supabase:", error);
            toast({
              title: "Error",
              description: "Failed to save your guess.",
              variant: "destructive",
            });
          }
        }
      }
    } catch (error) {
      console.error("Error fetching player image:", error);
    }

    const newGuess: Guess = {
      name: currentGuess,
      isCorrect,
      playerImage: playerImageUrl,
      feedback: {
        team: true,
        position: false,
        age: "correct",
      },
    };

    setGuesses([newGuess, ...guesses]);
    setCurrentGuess("");

    if (isCorrect) {
      toast({
        title: "Congratulations! 🎉",
        description: "You've correctly guessed today's player!",
      });
    }
  };

  const handleGetClue = async () => {
    try {
      if (!userId) {
        toast({
          title: "Sign in required",
          description: "Please sign in to use clues",
          variant: "destructive",
        });
        return;
      }

      // Update points in database
      const { data, error } = await supabase
        .from('baseball_fan')
        .update({ points: userPoints! - 2 })
        .eq('user_id', userId)
        .select('points')
        .single();

      if (error) throw error;

      // Update local state
      setUserPoints(data.points);

      // Generate clue
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Generate a one-sentence clue about ${targetPlayer.fullName} without directly mentioning their name.`;
      const result = await model.generateContent(prompt);
      const clueText = result.response.text();
      setClue(clueText);

      toast({
        title: "-2 points",
        description: "Here's your clue!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate clue or update points.",
        variant: "destructive",
      });
    }
  };

  const handleRevealImage = async () => {
    try {
      if (!userId) {
        toast({
          title: "Sign in required",
          description: "Please sign in to reveal image",
          variant: "destructive",
        });
        return;
      }

      // Update points in database
      const { data, error } = await supabase
        .from('baseball_fan')
        .update({ points: userPoints! - 10 })
        .eq('user_id', userId)
        .select('points')
        .single();

      if (error) throw error;

      // Update local state
      setUserPoints(data.points);

      // Fetch and reveal image
      const playerId = targetPlayer.id;
      const { imageUrl } = await getPlayerImage(playerId);
      setPlayerImage(imageUrl);
      setIsImageRevealed(true);

      toast({
        title: "-10 points",
        description: "Image revealed!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reveal image or update points.",
        variant: "destructive",
      });
    }
  };

  const handleSkipPlayer = async () => {
    try {
      if (!userId) {
        toast({
          title: "Sign in required",
          description: "Please sign in to skip player",
          variant: "destructive",
        });
        return;
      }

      // Update points in database
      const { data, error } = await supabase
        .from('baseball_fan')
        .update({ points: userPoints! - 5 })
        .eq('user_id', userId)
        .select('points')
        .single();

      if (error) throw error;

      // Update local state
      setUserPoints(data.points);

      // Fetch new player
      await fetchRandomPlayer();

      toast({
        title: "-5 points",
        description: "Skipped to new player!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to skip player or update points.",
        variant: "destructive",
      });
    }
  };

  const handleChatSubmit = async () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: chatInput,
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    try {
      const chat = model.startChat({
        history: [
          {
            role: "user",
            parts: [
              {
                text: `You are helping users guess an MLB player. The player is ${targetPlayer.fullName}. 
                          DO NOT reveal the player's name directly. If users ask about specific attributes, you can
                          give hints but keep it challenging and fun. The player is on ${targetPlayer.team} and plays ${targetPlayer.position}. Full player info here: ${targetPlayer}`,
              },
            ],
          },
          {
            role: "model",
            parts: [
              {
                text: "I understand. I'll help users guess the player without revealing their identity directly.",
              },
            ],
          },
        ],
      });

      const result = await chat.sendMessage(chatInput);
      const response = await result.response;

      const botMessage: ChatMessage = {
        role: "model",
        content: response.text(),
      };

      setChatMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsChatLoading(false);
    }
  };

  // Add helper function to calculate age
  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birth.getDate())
    ) {
      age--;
    }
    return age;
  };

  return (
    <div className="min-h-screen bg-baseball-cream p-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8 relative">
          <div className="absolute right-0 top-0 flex items-center gap-4">
            {userPoints !== null && (
              <div className="bg-baseball-blue text-white px-3 py-1 rounded-full">
                {userPoints} points
              </div>
            )}
            <UserButton afterSignOutUrl="/" />
          </div>
          
          <h1 className="text-4xl font-bold text-baseball-blue mb-2">
            MLB SCOUT ⚾⚜️
          </h1>
          <p className="text-baseball-gray">Build out your fantasy team and compete against other fans! </p>
          
          {!isSignedIn && (
            <div className="mt-4">
              <SignInButton mode="modal">
                <Button variant="outline" className="bg-white hover:bg-gray-100">
                  Sign in to save progress
                </Button>
              </SignInButton>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main game content - takes up 2/3 of the space */}
          <div className="col-span-2">
            <Card className="p-6 mb-6 bg-white">
              <div className="flex gap-2 mb-4">
                <Input
                  value={currentGuess}
                  onChange={(e) => setCurrentGuess(e.target.value)}
                  placeholder="Enter player name..."
                  className="flex-1"
                  onKeyPress={(e) => e.key === "Enter" && !guesses.some(g => g.isCorrect) && handleGuess()}
                  disabled={guesses.some(g => g.isCorrect)}
                />
                <Button
                  onClick={handleGuess}
                  className="bg-baseball-blue hover:bg-baseball-blue/90"
                  disabled={guesses.some(g => g.isCorrect)}
                >
                  Guess
                </Button>
              </div>

              {/* Image and Chat Section */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Hidden Player Image Section */}
                <div>
                  {isImageRevealed && (
                    <h2 className="text-2xl font-bold text-center mb-4 text-baseball-blue">
                      {targetPlayer.fullName}
                    </h2>
                  )}
                  <div className="relative w-full h-96 rounded-lg mb-4 overflow-hidden">
                    {playerImage && (
                      <img
                        src={playerImage}
                        alt="Player"
                        className="w-full h-full object-cover"
                      />
                    )}
                    {!isImageRevealed && (
                      <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-400">
                        {[...Array(100)].map((_, i) => (
                          <div
                            key={i}
                            className="absolute bg-white opacity-20"
                            style={{
                              top: `${Math.random() * 100}%`,
                              left: `${Math.random() * 100}%`,
                              width: `${Math.random() * 10 + 5}%`,
                              height: `${Math.random() * 10 + 5}%`,
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Chat Section */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-4">Ask About the Player</h3>
                  <div className="h-48 overflow-y-auto mb-4 space-y-2">
                    {chatMessages.map((message, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-blue-100 ml-8'
                            : 'bg-gray-100 mr-8'
                        }`}
                      >
                        {message.content}
                      </div>
                    ))}
                    {isChatLoading && (
                      <div className="bg-gray-100 mr-8 p-2 rounded-lg">
                        Thinking...
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask a question about the player..."
                      onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleChatSubmit}
                      disabled={isChatLoading}
                      className="bg-baseball-blue hover:bg-baseball-blue/90"
                    >
                      Ask
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 justify-center mb-4">
                <Button
                  onClick={handleGetClue}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={!userId || (userPoints !== null && userPoints < 2)}
                >
                  <Lightbulb className="w-4 h-4" />
                  Give me a clue (-2)
                </Button>
                <Button
                  onClick={handleRevealImage}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={!userId || (userPoints !== null && userPoints < 10)}
                >
                  <Eye className="w-4 h-4" />
                  Reveal image (-10)
                </Button>
                <Button
                  onClick={handleSkipPlayer}
                  variant="outline"
                  className="flex items-center gap-2"
                  disabled={!userId || (userPoints !== null && userPoints < 5)}
                >
                  <Search className="w-4 h-4" />
                  Skip Player (-5)
                </Button>
              </div>
              {clue && (
                <div className="bg-blue-50 p-4 rounded-lg text-blue-700 mb-4">
                  {clue}
                </div>
              )}
              <div className="space-y-4">
                {guesses.map((guess, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border ${
                      guess.isCorrect
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {guess.isCorrect && guess.playerImage ? (
                        <img
                          src={guess.playerImage}
                          alt={guess.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                          <User className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{guess.name}</span>
                          {guess.isCorrect ? (
                            <Check className="text-green-500" />
                          ) : (
                            <X className="text-red-500" />
                          )}
                        </div>
                        <div className="mt-2 text-sm text-gray-600">
                          {guess.isCorrect ? (
                            <>
                              <div>Team: {targetPlayer.team}</div>
                              <div>Position: {targetPlayer.position}</div>
                              <div>Age: {targetPlayer.age}</div>
                            </>
                          ) : (
                            <>
                              <div>Team: {guess.feedback.team ? "✓" : "✗"}</div>
                              <div>Position: {guess.feedback.position ? "✓" : "✗"}</div>
                              <div>
                                Age:{" "}
                                {guess.feedback.age === "higher"
                                  ? "↑"
                                  : guess.feedback.age === "lower"
                                  ? "↓"
                                  : "✓"}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add BaseballField component after the guesses section */}
              {isSignedIn && (
                <div className="mt-8">
                  <h2 className="text-2xl font-bold text-baseball-blue mb-4">
                    Your Fantasy Baseball Team
                  </h2>
                  <BaseballField />
                </div>
              )}
            </Card>
          </div>

          {/* Leaderboard - takes up 1/3 of the space */}
          <div className="col-span-1">
            <Leaderboard />
          </div>
        </div>

        <div className="text-center text-baseball-gray text-sm">
          <p>New player every day!</p>
        </div>
      </div>
    </div>
  );
};

export default MLBGame;
