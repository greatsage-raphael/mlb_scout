import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Search, X, Check } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";

interface Guess {
  name: string;
  isCorrect: boolean;
  feedback: {
    team: boolean;
    position: boolean;
    age: 'higher' | 'lower' | 'correct' | null;
  };
}

const MLBGame = () => {
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [currentGuess, setCurrentGuess] = useState('');
  const [targetPlayer] = useState({
    name: "Shohei Ohtani",
    team: "Los Angeles Dodgers",
    position: "DH",
    age: 29
  });
  const { toast } = useToast();

  const handleGuess = () => {
    if (!currentGuess) return;

    // In a real implementation, we would validate against actual MLB player data
    const isCorrect = currentGuess.toLowerCase() === targetPlayer.name.toLowerCase();

    const newGuess: Guess = {
      name: currentGuess,
      isCorrect,
      feedback: {
        team: true, // This would be compared with actual data
        position: false, // This would be compared with actual data
        age: 'correct', // This would be compared with actual data
      }
    };

    setGuesses([newGuess, ...guesses]);
    setCurrentGuess('');

    if (isCorrect) {
      toast({
        title: "Congratulations! 🎉",
        description: "You've correctly guessed today's player!",
      });
    }
  };

  return (
    <div className="min-h-screen bg-baseball-cream p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-baseball-blue mb-2">MLB Player Guess</h1>
          <p className="text-baseball-gray">Guess today's MLB player!</p>
        </div>

        <Card className="p-6 mb-6 bg-white">
          <div className="flex gap-2 mb-4">
            <Input
              value={currentGuess}
              onChange={(e) => setCurrentGuess(e.target.value)}
              placeholder="Enter player name..."
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleGuess()}
            />
            <Button onClick={handleGuess} className="bg-baseball-blue hover:bg-baseball-blue/90">
              Guess
            </Button>
          </div>

          <div className="space-y-4">
            {guesses.map((guess, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  guess.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{guess.name}</span>
                  {guess.isCorrect ? (
                    <Check className="text-green-500" />
                  ) : (
                    <X className="text-red-500" />
                  )}
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <div>Team: {guess.feedback.team ? '✓' : '✗'}</div>
                  <div>Position: {guess.feedback.position ? '✓' : '✗'}</div>
                  <div>
                    Age:{' '}
                    {guess.feedback.age === 'higher' ? '↑' : guess.feedback.age === 'lower' ? '↓' : '✓'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="text-center text-baseball-gray text-sm">
          <p>New player every day!</p>
        </div>
      </div>
    </div>
  );
};

export default MLBGame;