import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, SkipBack, SkipForward } from 'lucide-react';
import { GameReplay } from '../types/game';

interface ReplayViewerProps {
  replay: GameReplay;
  onBack: () => void;
}

export const ReplayViewer: React.FC<ReplayViewerProps> = ({ replay, onBack }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);

  const totalDuration = Math.max(...replay.inputEvents.map(e => e.gameTime), 0);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const startPlayback = () => {
    setIsPlaying(true);
    startTimeRef.current = performance.now() - (currentTime * 1000);
    
    const animate = () => {
      const elapsed = (performance.now() - startTimeRef.current) / 1000;
      const newTime = elapsed * playbackSpeed;
      
      if (newTime >= totalDuration) {
        setCurrentTime(totalDuration);
        setIsPlaying(false);
        return;
      }
      
      setCurrentTime(newTime);
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
  };

  const pausePlayback = () => {
    setIsPlaying(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };

  const resetPlayback = () => {
    pausePlayback();
    setCurrentTime(0);
  };

  const skipBackward = () => {
    const newTime = Math.max(0, currentTime - 5);
    setCurrentTime(newTime);
    if (isPlaying) {
      startTimeRef.current = performance.now() - (newTime * 1000);
    }
  };

  const skipForward = () => {
    const newTime = Math.min(totalDuration, currentTime + 5);
    setCurrentTime(newTime);
    if (isPlaying) {
      startTimeRef.current = performance.now() - (newTime * 1000);
    }
  };

  const togglePlayback = () => {
    if (isPlaying) {
      pausePlayback();
    } else {
      startPlayback();
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getCurrentEvents = () => {
    return replay.inputEvents.filter(event => 
      event.gameTime >= currentTime - 0.1 && event.gameTime <= currentTime + 0.1
    );
  };

  const getNoteNameFromPitch = (pitch: number): string => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(pitch / 12) - 1;
    const noteIndex = pitch % 12;
    return `${noteNames[noteIndex]}${octave}`;
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
          <span>Back to Leaderboard</span>
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold">{replay.songTitle}</h2>
          <p className="text-white/70">{replay.songArtist} • {replay.difficulty}</p>
          <p className="text-white/50 text-sm">Replay from {new Date(replay.timestamp).toLocaleDateString()}</p>
        </div>

        <div className="w-32"></div> {/* Spacer */}
      </div>

      {/* Score Display */}
      <div className="p-6">
        <div className="bg-gray-800/50 rounded-lg p-6 max-w-2xl mx-auto">
          <h3 className="text-xl font-bold mb-4">Performance Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{replay.score.score.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Score</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">{replay.score.accuracy.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{replay.score.combo}</div>
              <div className="text-sm text-gray-400">Max Combo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-400">{replay.score.grade}</div>
              <div className="text-sm text-gray-400">Grade</div>
            </div>
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="p-6">
        <div className="bg-gray-800/50 rounded-lg p-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <button
              onClick={skipBackward}
              className="p-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors duration-200"
              title="Skip Backward 5s"
            >
              <SkipBack className="w-5 h-5" />
            </button>
            
            <button
              onClick={resetPlayback}
              className="p-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors duration-200"
              title="Reset"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            
            <button
              onClick={togglePlayback}
              className="p-4 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors duration-200"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            </button>
            
            <button
              onClick={skipForward}
              className="p-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors duration-200"
              title="Skip Forward 5s"
            >
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-400 mb-2">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(totalDuration)}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-100"
                style={{ width: `${(currentTime / totalDuration) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Playback Speed */}
          <div className="flex items-center justify-center space-x-2">
            <span className="text-sm text-gray-400">Speed:</span>
            <select
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
              className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </div>
        </div>
      </div>

      {/* Current Events Display */}
      <div className="p-6">
        <div className="bg-gray-800/50 rounded-lg p-6 max-w-2xl mx-auto">
          <h3 className="text-lg font-bold mb-4">Current Input Events</h3>
          <div className="space-y-2">
            {getCurrentEvents().length > 0 ? (
              getCurrentEvents().map((event, index) => (
                <div key={index} className="flex items-center justify-between bg-gray-700/50 p-3 rounded">
                  <div className="flex items-center space-x-4">
                    <div className={`px-2 py-1 rounded text-xs font-bold ${
                      event.type === 'keydown' ? 'bg-green-600' : 'bg-red-600'
                    }`}>
                      {event.type === 'keydown' ? 'DOWN' : 'UP'}
                    </div>
                    <div className="font-mono">{getNoteNameFromPitch(event.pitch)}</div>
                    <div className="text-gray-400">({event.pitch})</div>
                  </div>
                  <div className="text-sm text-gray-400">
                    {event.gameTime.toFixed(2)}s
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-400 py-4">
                No input events at current time
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 