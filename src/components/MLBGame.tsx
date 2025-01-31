import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Search, X, Check, Eye, Lightbulb } from 'lucide-react';
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
  const [playerImage, setPlayerImage] = useState('');
  const [isImageRevealed, setIsImageRevealed] = useState(false);
  const [clue, setClue] = useState('');
  const [targetPlayer] = useState({
    name: "Shohei Ohtani",
    team: "Los Angeles Dodgers",
    position: "DH",
    age: 29
  });
  const { toast } = useToast();

  const handleGuess = () => {
    if (!currentGuess) return;

    const isCorrect = currentGuess.toLowerCase() === targetPlayer.name.toLowerCase();

    const newGuess: Guess = {
      name: currentGuess,
      isCorrect,
      feedback: {
        team: true,
        position: false,
        age: 'correct',
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

  const handleGetClue = async () => {
    // In a real implementation, this would call Gemini API
    const playerInfo = `${targetPlayer.name} is a ${targetPlayer.position} for the ${targetPlayer.team}`;
    try {
      // Simulated API call
      const clueText = `This player is known for their exceptional two-way playing ability.`;
      setClue(clueText);
      toast({
        title: "-20 points",
        description: "Here's your clue!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate clue. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleRevealImage = async () => {
    // In a real implementation, this would call an image search API
    try {
      // Simulated API call
      const imageUrl = `https://example.com/${targetPlayer.name.toLowerCase().replace(' ', '-')}.jpg`;
      setPlayerImage(imageUrl);
      setIsImageRevealed(true);
      toast({
        title: "-50 points",
        description: "Image revealed!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load image. Please try again.",
        variant: "destructive",
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

          {/* Hidden Player Image Section */}
          <div className="mb-6">
            <div className={`w-full h-64 bg-gray-200 rounded-lg mb-4 overflow-hidden ${!isImageRevealed && 'filter blur-xl'}`}>
              {playerImage && (
                <img
                  src={playerImage}
                  alt="Player"
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="flex gap-4 justify-center mb-4">
              <Button
                onClick={handleGetClue}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Lightbulb className="w-4 h-4" />
                Give me a clue (-20)
              </Button>
              <Button
                onClick={handleRevealImage}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Reveal image (-50)
              </Button>
            </div>
            {clue && (
              <div className="bg-blue-50 p-4 rounded-lg text-blue-700 mb-4">
                {clue}
              </div>
            )}
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