/**
 * Integrated Music Player Component
 * Supports dual-format playback within the main game
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Pause, Square, Music, Settings, AlertCircle, CheckCircle } from 'lucide-react';
import { MusicPlayer } from '../music/MusicPlayer';
import { allSongs, getSongById } from '../data/songs';
import { Song, PlaybackState, MusicPlayerConfig } from '../types/music';

interface MusicPlayerDemoProps {
  onBack: () => void;
}

export const MusicPlayerDemo: React.FC<MusicPlayerDemoProps> = ({ onBack }) => {
  const [musicPlayer] = useState(() => MusicPlayer.getInstance());
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    format: 'custom'
  });
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [config, setConfig] = useState<MusicPlayerConfig>({
    preferredFormat: 'auto',
    enableMidiFallback: true,
    audioLatencyCompensation: 0,
    midiSynthEnabled: true
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize music player
  useEffect(() => {
    const initPlayer = async () => {
      try {
        await musicPlayer.initialize(config);
        setIsInitialized(true);
      } catch (err) {
        setError(`Failed to initialize music player: ${err}`);
      }
    };

    initPlayer();

    return () => {
      musicPlayer.destroy();
    };
  }, [musicPlayer, config]);

  // Update playback state
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaybackState(musicPlayer.getPlaybackState());
    }, 100);

    return () => clearInterval(interval);
  }, [musicPlayer]);

  const handleSongSelect = async (songId: string) => {
    const song = getSongById(songId);
    if (!song) return;

    setLoading(true);
    setError(null);

    try {
      await musicPlayer.loadSong(song);
      setCurrentSong(song);
    } catch (err: any) {
      setError(`Failed to load song: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = async () => {
    if (!currentSong) return;

    try {
      setError(null);
      await musicPlayer.play(selectedDifficulty);
    } catch (err: any) {
      setError(`Playback failed: ${err.message || err}`);
    }
  };

  const handlePause = () => {
    musicPlayer.pause();
  };

  const handleStop = () => {
    musicPlayer.stop();
  };

  const handleConfigChange = (newConfig: Partial<MusicPlayerConfig>) => {
    const updatedConfig = { ...config, ...newConfig };
    setConfig(updatedConfig);
    musicPlayer.updateConfig(updatedConfig);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Initializing Music Player...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
          <span>Back to Menu</span>
        </button>
        
        <h1 className="text-4xl font-bold text-white text-center flex-1">
          Music Player
        </h1>
        
        <div className="w-24"></div>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-400 font-semibold">Error</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Fallback Warning */}
        {playbackState.error && (
          <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4 mb-6 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <div>
              <p className="text-yellow-400 font-semibold">Fallback Active</p>
              <p className="text-yellow-300 text-sm">{playbackState.error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Song Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-2">
                <Music className="w-6 h-6" />
                <span>Song Library</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allSongs.map((song) => (
                  <div
                    key={song.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      currentSong?.id === song.id
                        ? 'border-yellow-400 bg-yellow-400/10'
                        : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                    }`}
                    onClick={() => handleSongSelect(song.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-semibold">{song.title}</h3>
                      <div className={`px-2 py-1 rounded text-xs font-mono ${
                        song.format === 'midi' 
                          ? 'bg-blue-500/20 text-blue-300' 
                          : 'bg-green-500/20 text-green-300'
                      }`}>
                        {song.format.toUpperCase()}
                      </div>
                    </div>
                    <p className="text-white/70 text-sm italic mb-1">{song.artist}</p>
                    <p className="text-white/50 text-xs">{song.duration} • {song.bpm} BPM</p>
                    <div className="flex space-x-1 mt-2">
                      {song.difficulties.map((diff) => (
                        <span
                          key={diff}
                          className={`px-2 py-1 rounded text-xs ${
                            diff === 'easy' ? 'bg-green-500/20 text-green-300' :
                            diff === 'medium' ? 'bg-orange-500/20 text-orange-300' :
                            'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {diff}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Player Controls */}
          <div className="space-y-6">
            {/* Current Song Info */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Now Playing</h2>
              {currentSong ? (
                <div>
                  <h3 className="text-white font-semibold mb-1">{currentSong.title}</h3>
                  <p className="text-white/70 text-sm italic mb-2">{currentSong.artist}</p>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className={`px-2 py-1 rounded text-xs font-mono ${
                      playbackState.format === 'midi' 
                        ? 'bg-blue-500/20 text-blue-300' 
                        : 'bg-green-500/20 text-green-300'
                    }`}>
                      {playbackState.format.toUpperCase()}
                    </div>
                    {!playbackState.error && (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>{formatTime(playbackState.currentTime)}</span>
                      <span>{formatTime(playbackState.duration)}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-yellow-400 h-2 rounded-full transition-all duration-100"
                        style={{ 
                          width: `${playbackState.duration > 0 ? (playbackState.currentTime / playbackState.duration) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-white/50">Select a song to begin</p>
              )}
            </div>

            {/* Difficulty Selection */}
            {currentSong && (
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <h3 className="text-lg font-bold text-white mb-4">Difficulty</h3>
                <div className="space-y-2">
                  {currentSong.difficulties.map((diff) => (
                    <button
                      key={diff}
                      onClick={() => setSelectedDifficulty(diff)}
                      className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
                        selectedDifficulty === diff
                          ? diff === 'easy' ? 'bg-green-500/30 border-2 border-green-400' :
                            diff === 'medium' ? 'bg-orange-500/30 border-2 border-orange-400' :
                            'bg-red-500/30 border-2 border-red-400'
                          : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                      }`}
                    >
                      <span className={`capitalize font-semibold ${
                        diff === 'easy' ? 'text-green-300' :
                        diff === 'medium' ? 'text-orange-300' :
                        'text-red-300'
                      }`}>
                        {diff}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Playback Controls */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4">Controls</h3>
              <div className="flex space-x-3">
                <button
                  onClick={handlePlay}
                  disabled={!currentSong || playbackState.isPlaying || loading}
                  className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Play className="w-4 h-4" />
                  <span>Play</span>
                </button>
                
                <button
                  onClick={handlePause}
                  disabled={!playbackState.isPlaying}
                  className="bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  <Pause className="w-4 h-4" />
                </button>
                
                <button
                  onClick={handleStop}
                  disabled={!playbackState.isPlaying && !playbackState.isPaused}
                  className="bg-red-500 hover:bg-red-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Configuration */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-white/80 text-sm mb-2">Preferred Format</label>
                  <select
                    value={config.preferredFormat}
                    onChange={(e) => handleConfigChange({ preferredFormat: e.target.value as any })}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="auto">Auto</option>
                    <option value="custom">Custom Only</option>
                    <option value="midi">MIDI Only</option>
                  </select>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="fallback"
                    checked={config.enableMidiFallback}
                    onChange={(e) => handleConfigChange({ enableMidiFallback: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="fallback" className="text-white/80 text-sm">
                    Enable MIDI Fallback
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="synth"
                    checked={config.midiSynthEnabled}
                    onChange={(e) => handleConfigChange({ midiSynthEnabled: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="synth" className="text-white/80 text-sm">
                    MIDI Synthesis
                  </label>
                </div>

                <div>
                  <label className="block text-white/80 text-sm mb-2">
                    Audio Latency Compensation: {config.audioLatencyCompensation}ms
                  </label>
                  <input
                    type="range"
                    min="-200"
                    max="200"
                    step="10"
                    value={config.audioLatencyCompensation}
                    onChange={(e) => handleConfigChange({ audioLatencyCompensation: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-white">Loading song...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};