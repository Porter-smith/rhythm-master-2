import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Star, Clock, User, Music2, FileMusic, Trophy, Target, BarChart3 } from 'lucide-react';
import { Song } from '../types/game';
import { allSongs } from '../data/songs';
import { WaveformPreview } from './WaveformPreview';
import { InstrumentSelectorPanel } from './midi-debug/InstrumentSelectorPanel';
import { SongNotePreview } from './SongNotePreview';
import { scoreDatabase } from '../utils/scoreDatabase';
import { StoredScore } from '../types/game';

interface SongSelectionProps {
  onSongSelect: (song: Song, difficulty: 'easy' | 'medium' | 'hard', instrument?: { channel: number; instrument: number; name: string }) => void;
  onBack: () => void;
  onViewReplay?: (replay: any) => void;
}

export const SongSelection: React.FC<SongSelectionProps> = ({ onSongSelect, onBack, onViewReplay }) => {
  const [hoveredSong, setHoveredSong] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [step, setStep] = useState<'song' | 'instrument'>('song');
  const [pendingSong, setPendingSong] = useState<Song | null>(null);
  const [pendingDifficulty, setPendingDifficulty] = useState<'easy' | 'medium' | 'hard' | null>(null);
  const [midiFile, setMidiFile] = useState<ArrayBuffer | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<number | null>(null);
  
  // Leaderboard state
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [scores, setScores] = useState<StoredScore[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    totalScores: number;
    totalReplays: number;
    averageAccuracy: number;
    bestScore: number;
  } | null>(null);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-orange-400';
      case 'hard': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getDifficultyStars = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 1;
      case 'medium': return 2;
      case 'hard': return 3;
      default: return 1;
    }
  };

  const getFormatIcon = (format: string) => {
    return format === 'midi' ? <FileMusic className="w-4 h-4" /> : <Music2 className="w-4 h-4" />;
  };

  const getFormatColor = (format: string) => {
    return format === 'midi' 
      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
      : 'bg-green-500/20 text-green-300 border-green-500/30';
  };

  // Load leaderboard data
  useEffect(() => {
    loadLeaderboardData();
  }, []);

  const loadLeaderboardData = async () => {
    try {
      setLoading(true);
      await scoreDatabase.initialize();
      const [loadedScores, loadedStats] = await Promise.all([
        scoreDatabase.getScores(undefined, 20), // Get top 20 scores
        scoreDatabase.getStats()
      ]);
      setScores(loadedScores);
      setStats(loadedStats);
    } catch (error) {
      console.error('Failed to load leaderboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaderboardToggle = async () => {
    if (!showLeaderboard) {
      // Refresh data when opening leaderboard
      await loadLeaderboardData();
    }
    setShowLeaderboard(!showLeaderboard);
  };

  const handleWatchReplay = async (scoreId: string) => {
    try {
      console.log('🎬 Watch replay clicked for score:', scoreId);
      const replay = await scoreDatabase.getReplay(scoreId);
      console.log('🎬 Replay loaded:', replay);
      if (replay && onViewReplay) {
        console.log('🎬 Calling onViewReplay callback');
        onViewReplay(replay);
      } else {
        console.log('🎬 No replay or callback available');
      }
    } catch (error) {
      console.error('Failed to load replay:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
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

  // Handle song/difficulty selection
  const handleSongSelect = async (song: Song, difficulty: 'easy' | 'medium' | 'hard') => {
    if (song.format === 'midi') {
      // Fetch the MIDI file for this song/difficulty
      const midiUrl = (song as any).midiFiles?.[difficulty];
      if (midiUrl) {
        const response = await fetch(midiUrl);
        const arrayBuffer = await response.arrayBuffer();
        setMidiFile(arrayBuffer);
        setPendingSong(song);
        setPendingDifficulty(difficulty);
        setStep('instrument');
        setSelectedChannel(null);
      }
    } else {
      // For non-MIDI, just start the game
      onSongSelect(song, difficulty);
    }
  };

  // Handle instrument selection
  const handleInstrumentSelect = (channel: number, instrument: number, name: string) => {
    setSelectedChannel(channel);
    if (pendingSong && pendingDifficulty) {
      onSongSelect(pendingSong, pendingDifficulty, { channel, instrument, name });
    }
  };

  // Back from instrument selection to song selection
  const handleBackToSong = () => {
    setStep('song');
    setMidiFile(null);
    setPendingSong(null);
    setPendingDifficulty(null);
    setSelectedChannel(null);
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <button
          onClick={step === 'instrument' ? handleBackToSong : onBack}
          className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
          <span>{step === 'instrument' ? 'Back to Song Selection' : 'Back to Menu'}</span>
        </button>
        <h1 className="text-4xl font-bold text-white text-center flex-1">
          {step === 'instrument' ? 'Select Your Instrument' : 'Select Your Song'}
        </h1>
        <button
          onClick={handleLeaderboardToggle}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors duration-200"
        >
          <BarChart3 className="w-5 h-5" />
          <span>Leaderboard</span>
        </button>
      </div>

      {/* Leaderboard Overlay */}
      {showLeaderboard && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen p-8">
            <div className="max-w-4xl mx-auto">
              {/* Leaderboard Header */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-white flex items-center space-x-3">
                  <Trophy className="w-8 h-8 text-yellow-400" />
                  <span>Your Leaderboard</span>
                </h2>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="text-white/70 hover:text-white text-xl"
                >
                  ✕
                </button>
              </div>

              {/* Stats Overview */}
              {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
              )}

              {/* Scores List */}
              <div className="bg-gray-800/50 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                  <Target className="w-5 h-5 text-green-400" />
                  <span>Recent Scores</span>
                </h3>
                
                {loading ? (
                  <div className="text-center py-8">
                    <div className="text-xl">Loading scores...</div>
                  </div>
                ) : scores.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="text-xl text-gray-400">No scores yet</div>
                    <div className="text-sm text-gray-500 mt-2">Play some songs to see your scores here!</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {scores.slice(0, 10).map((score, index) => (
                      <div key={score.id} className="flex items-center justify-between bg-gray-700/50 rounded-lg p-4">
                        <div className="flex items-center space-x-4">
                          <div className="text-2xl font-bold text-yellow-400 w-8">#{index + 1}</div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="text-lg font-semibold text-white">{score.songTitle}</h4>
                              <span className="text-sm text-gray-400">by {score.songArtist}</span>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${getGradeColor(score.score.grade)}`}>
                                {score.score.grade}
                              </span>
                              <span className="text-sm text-gray-400 capitalize">{score.difficulty}</span>
                            </div>
                            <div className="flex items-center space-x-4 mt-1 text-sm">
                              <div className="flex items-center space-x-1">
                                <Trophy className="w-4 h-4 text-yellow-400" />
                                <span>{score.score.score.toLocaleString()}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Target className="w-4 h-4 text-green-400" />
                                <span>{score.score.accuracy.toFixed(1)}%</span>
                              </div>
                              <div className="text-gray-400">
                                {formatDate(score.timestamp)}
                              </div>
                            </div>
                          </div>
                        </div>
                        {score.isReplayAvailable && (
                          <button
                            onClick={() => handleWatchReplay(score.id)}
                            className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm text-white transition-colors duration-200 flex items-center space-x-1"
                          >
                            <span>🎬</span>
                            <span>Watch</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'song' && (
        <>
          {/* Format Legend */}
          <div className="flex justify-center mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2">
                  <Music2 className="w-4 h-4 text-green-300" />
                  <span className="text-white/70">Custom Notation</span>
                </div>
                <div className="flex items-center space-x-2">
                  <FileMusic className="w-4 h-4 text-blue-300" />
                  <span className="text-white/70">MIDI Format</span>
                </div>
              </div>
            </div>
          </div>

          {/* Song Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {allSongs.map((song) => {
              // Pick the first available difficulty for preview
              const previewDifficulty = song.difficulties[0];
              const previewNotes = song.notes[previewDifficulty] || [];
              return (
                <div
                  key={song.id}
                  className="group relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer"
                  onMouseEnter={() => setHoveredSong(song.id)}
                  onMouseLeave={() => setHoveredSong(null)}
                  onClick={() => setSelectedSong(song)}
                >
                  {/* Format Badge */}
                  <div className="absolute top-4 right-4">
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg border text-xs font-mono ${getFormatColor(song.format)}`}>
                      {getFormatIcon(song.format)}
                      <span>{song.format.toUpperCase()}</span>
                    </div>
                  </div>

                  {/* Song Info */}
                  <div className="mb-4 pr-16">
                    <h3 className="text-2xl font-bold text-white mb-2">{song.title}</h3>
                    <div className="flex items-center space-x-2 text-white/70 mb-1">
                      <User className="w-4 h-4" />
                      <span className="italic text-lg">{song.artist}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-white/70">
                      <Clock className="w-4 h-4" />
                      <span className="font-mono">{song.duration}</span>
                      <span className="text-white/50">•</span>
                      <span className="font-mono">{song.bpm} BPM</span>
                    </div>
                  </div>

                  {/* Waveform Preview */}
                  {hoveredSong === song.id && (
                    <div className="mb-4 h-16 bg-black/30 rounded-lg overflow-hidden">
                      {/* Was causing lag */}
                      {/* <WaveformPreview song={song} /> */}
                    </div>
                  )}

                  {/* Difficulties */}
                  <div className="space-y-2">
                    <h4 className="text-white/80 font-semibold">Difficulties:</h4>
                    {song.difficulties.map((difficulty) => (
                      <button
                        key={difficulty}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSongSelect(song, difficulty);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/40 transition-colors duration-200 ${getDifficultyColor(difficulty)}`}
                      >
                        <div className="flex items-center space-x-2">
                          <div className="flex">
                            {[...Array(getDifficultyStars(difficulty))].map((_, i) => (
                              <Star key={i} className="w-4 h-4 fill-current" />
                            ))}
                          </div>
                          <span className="capitalize font-semibold">{difficulty}</span>
                        </div>
                        <Play className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </button>
                    ))}
                  </div>

                  {/* Song Note Preview (always shown) */}
                  <div className="mt-4 h-16 bg-black/30 rounded-lg overflow-hidden">
                    {/* <SongNotePreview notes={previewNotes} width={320} height={64} /> */}
                  </div>

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {step === 'instrument' && midiFile && (
        <InstrumentSelectorPanel
          midiFile={midiFile}
          selectedChannel={selectedChannel}
          onSelectInstrument={handleInstrumentSelect}
        />
      )}
    </div>
  );
};