import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Trophy } from "lucide-react";
import { supabase } from "@/lib/admin";

interface LeaderboardEntry {
  user_name: string;
  user_id: string;
  points: number;
  rank: number;
}

const Leaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data, error } = await supabase
          .from('baseball_fan')
          .select('user_id, score, user_name')
          .order('score', { ascending: false })
          .limit(10);

        if (error) throw error;

        // Add rank to each entry
        const rankedData = data.map((entry, index) => ({
          ...entry,
          points: entry.score,
          rank: index + 1
        }));

        setLeaderboardData(rankedData);
      } catch (error) {
        console.error("Error fetching leaderboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <Card className="p-4 bg-white">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h2 className="text-xl font-bold text-baseball-blue">Leaderboard</h2>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading...</div>
      ) : (
        <div className="space-y-2">
          {leaderboardData.map((entry) => (
            <div
              key={entry.user_id}
              className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
            >
              <div className="flex items-center gap-3">
                <span className={`w-6 text-center font-bold ${
                  entry.rank === 1 ? 'text-yellow-500' :
                  entry.rank === 2 ? 'text-gray-500' :
                  entry.rank === 3 ? 'text-amber-700' :
                  'text-gray-400'
                }`}>
                  {entry.rank}
                </span>
                <img 
                  src={`https://robohash.org/${entry.user_id}`}
                  alt={`Avatar for ${entry.user_id}`}
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-gray-700">{entry.user_name}</span>
              </div>
              <span className="font-semibold text-baseball-blue">
                {entry.points} pts
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default Leaderboard; 