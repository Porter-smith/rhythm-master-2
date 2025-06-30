import React, { useState, useEffect } from 'react';
import { StoredScore, GameReplay } from '../types/game';
import { scoreDatabase } from '../utils/scoreDatabase';
import { ArrowLeft, Play, Trash2, Trophy, Clock, Target } from 'lucide-react';

interface ScoreHistoryProps {
  onBack: () => void;
  onViewReplay?: (replay: GameReplay) => void;
}

export const ScoreHistory: React.FC<ScoreHistoryProps> = ({ onBack, onViewReplay }) => {
  const [scores, setScores] = useState<StoredScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSongId, setSelectedSongId] = useState<string | undefined>();
  const [stats, setStats] = useState<{
    totalScores: number;
    totalReplays: number;
    averageAccuracy: number;
    bestScore: number;
  } | null>(null);

  useEffect(() => {
    loadScores();
    loadStats();
  }, [selectedSongId]);

  const loadScores = async () => {
    try {
      setLoading(true);
      const loadedScores = await scoreDatabase.getScores(selectedSongId, 100);
      setScores(loadedScores);
    } catch (error) {
      console.error('Failed to load scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const loadedStats = await scoreDatabase.getStats();
      setStats(loadedStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleDeleteScore = async (scoreId: string) => {
    if (!confirm('Are you sure you want to delete this score and replay?')) {
      return;
    }

    try {
      await scoreDatabase.deleteScore(scoreId);
      await loadScores();
      await loadStats();
    } catch (error) {
      console.error('Failed to delete score:', error);
    }
  };

  const handleViewReplay = async (scoreId: string) => {
    try {
      const replay = await scoreDatabase.getReplay(scoreId);
      if (replay && onViewReplay) {
        onViewReplay(replay);
      }
    } catch (error) {
      console.error('Failed to load replay:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString() + ' ' + new Date(timestamp).toLocaleTimeString();
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'S': return 'text-yellow-400';
      case 'A': return 'text-green-400';
      case 'B': return 'text-blue-400';
      case 'C': return 'text-orange-400';
      case 'D': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-black/50">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <h1 className="text-3xl font-bold">Score History</h1>

        <div className="w-20"></div> {/* Spacer */}
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-900/50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-400">{stats.totalScores}</div>
              <div className="text-sm text-blue-300">Total Scores</div>
            </div>
            <div className="bg-green-900/50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">{stats.totalReplays}</div>
              <div className="text-sm text-green-300">Replays Available</div>
            </div>
            <div className="bg-yellow-900/50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-yellow-400">{stats.averageAccuracy.toFixed(1)}%</div>
              <div className="text-sm text-yellow-300">Avg Accuracy</div>
            </div>
            <div className="bg-purple-900/50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-400">{stats.bestScore.toLocaleString()}</div>
              <div className="text-sm text-purple-300">Best Score</div>
            </div>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="px-6 pb-4">
        <select
          value={selectedSongId || ''}
          onChange={(e) => setSelectedSongId(e.target.value || undefined)}
          className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-600"
        >
          <option value="">All Songs</option>
          {Array.from(new Set(scores.map(s => s.songId))).map(songId => {
            const score = scores.find(s => s.songId === songId);
            return (
              <option key={songId} value={songId}>
                {score?.songTitle} - {score?.songArtist}
              </option>
            );
          })}
        </select>
      </div>

      {/* Scores List */}
      <div className="px-6 pb-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="text-xl">Loading scores...</div>
          </div>
        ) : scores.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-xl text-gray-400">No scores found</div>
            <div className="text-sm text-gray-500 mt-2">Play some songs to see your scores here!</div>
          </div>
        ) : (
          <div className="space-y-4">
            {scores.map((score) => (
              <div key={score.id} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold">{score.songTitle}</h3>
                      <span className="text-sm text-gray-400">by {score.songArtist}</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${getGradeColor(score.score.grade)}`}>
                        {score.score.grade}
                      </span>
                      <span className="text-sm text-gray-400 capitalize">{score.difficulty}</span>
                    </div>
                    
                    <div className="flex items-center space-x-6 mt-2 text-sm">
                      <div className="flex items-center space-x-1">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span>{score.score.score.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Target className="w-4 h-4 text-green-400" />
                        <span>{score.score.accuracy.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-blue-400">Combo:</span>
                        <span>{score.score.combo}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-400">{formatDate(score.timestamp)}</span>
                      </div>
                    </div>

                    {/* Hit Stats */}
                    <div className="flex space-x-4 mt-2 text-xs">
                      <span className="text-green-400">Perfect: {score.score.hitStats.perfect}</span>
                      <span className="text-blue-400">Great: {score.score.hitStats.great}</span>
                      <span className="text-yellow-400">Good: {score.score.hitStats.good}</span>
                      <span className="text-red-400">Miss: {score.score.hitStats.miss}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {score.isReplayAvailable && (
                      <button
                        onClick={() => handleViewReplay(score.id)}
                        className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
                        title="View Replay"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteScore(score.id)}
                      className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200"
                      title="Delete Score"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 