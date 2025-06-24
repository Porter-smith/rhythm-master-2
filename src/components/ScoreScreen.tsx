import React from 'react';
import { Trophy, Star, RotateCcw, Home } from 'lucide-react';
import { GameScore, Song } from '../types/game';

interface ScoreScreenProps {
  score: GameScore;
  song: Song;
  difficulty: 'easy' | 'medium' | 'hard';
  onReturnToMenu: () => void;
  onPlayAgain: () => void;
}

export const ScoreScreen: React.FC<ScoreScreenProps> = ({
  score,
  song,
  difficulty,
  onReturnToMenu,
  onPlayAgain
}) => {
  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'text-yellow-400';
      case 'A': return 'text-green-400';
      case 'B': return 'text-blue-400';
      case 'C': return 'text-orange-400';
      default: return 'text-red-400';
    }
  };

  const getGradeMessage = (grade: string) => {
    switch (grade) {
      case 'S': return 'Perfect! Outstanding performance!';
      case 'A': return 'Excellent! Great job!';
      case 'B': return 'Good work! Keep practicing!';
      case 'C': return 'Not bad! Room for improvement!';
      default: return 'Keep trying! Practice makes perfect!';
    }
  };

  const totalNotes = Object.values(score.hitStats).reduce((sum, count) => sum + count, 0);

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Trophy className="w-12 h-12 text-yellow-400" />
            <h1 className="text-6xl font-bold text-yellow-400" style={{ fontFamily: 'Orbitron, monospace' }}>
              Song Complete!
            </h1>
          </div>
          <p className="text-white/70 text-xl">{song.title} • {song.artist}</p>
          <p className="text-white/50 capitalize">{difficulty} difficulty</p>
        </div>

        {/* Main Score Display */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
          {/* Score and Grade */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 text-center">
            <div className="mb-6">
              <div className={`text-8xl font-black mb-4 ${getGradeColor(score.grade)}`} style={{ fontFamily: 'Orbitron, monospace' }}>
                {score.grade}
              </div>
              <p className="text-white/80 text-lg">{getGradeMessage(score.grade)}</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-4xl font-mono font-bold text-white mb-1">
                  {score.score.toLocaleString()}
                </div>
                <div className="text-white/60">Final Score</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-white mb-1">
                  {score.accuracy.toFixed(1)}%
                </div>
                <div className="text-white/60">Accuracy</div>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Statistics</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-white/70">Max Combo</span>
                <span className="text-2xl font-bold text-white">{score.combo}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-white/70">Notes Hit</span>
                <span className="text-xl font-bold text-white">
                  {totalNotes - score.hitStats.miss}/{totalNotes}
                </span>
              </div>
              
              <div className="space-y-2 pt-4 border-t border-white/20">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <span className="text-white/70">Perfect</span>
                  </div>
                  <span className="text-white font-semibold">{score.hitStats.perfect}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                    <span className="text-white/70">Great</span>
                  </div>
                  <span className="text-white font-semibold">{score.hitStats.great}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-orange-400 rounded-full"></div>
                    <span className="text-white/70">Good</span>
                  </div>
                  <span className="text-white font-semibold">{score.hitStats.good}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                    <span className="text-white/70">Miss</span>
                  </div>
                  <span className="text-white font-semibold">{score.hitStats.miss}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onPlayAgain}
            className="group relative px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold text-lg rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-green-500/25"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500 rounded-xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center space-x-3">
              <RotateCcw className="w-5 h-5" />
              <span>Play Again</span>
            </div>
          </button>
          
          <button
            onClick={onReturnToMenu}
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold text-lg rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-105 hover:shadow-blue-500/25"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 rounded-xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center space-x-3">
              <Home className="w-5 h-5" />
              <span>Return to Menu</span>
            </div>
          </button>
        </div>

        {/* Additional Info */}
        <div className="text-center mt-8 text-white/50 text-sm space-y-1">
          <p>Your audio offset has been calculated and can be used to improve</p>
          <p>timing accuracy in rhythm games and music applications</p>
        </div>
      </div>
    </div>
  );
};