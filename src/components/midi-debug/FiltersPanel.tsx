import React from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';
import { ParsedMidiData } from '../../music/MidiParser';
import { DebugState } from './types';

interface FiltersPanelProps {
  midiData: ParsedMidiData | null;
  debugState: DebugState;
  onStateChange: (updates: Partial<DebugState>) => void;
  onTogglePlayback: () => void;
}

export const FiltersPanel: React.FC<FiltersPanelProps> = ({ 
  midiData, 
  debugState, 
  onStateChange, 
  onTogglePlayback 
}) => {
  if (!midiData) return null;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <h2 className="text-xl font-bold text-white mb-4">Filters</h2>
        
        <div className="space-y-4">
          {/* Track Selection */}
          <div>
            <label className="block text-white/80 text-sm mb-2">Track</label>
            <select
              value={debugState.selectedTrack}
              onChange={(e) => onStateChange({ selectedTrack: parseInt(e.target.value) })}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            >
              <option value={-1}>All Tracks</option>
              {midiData.tracks.map((track, index) => (
                <option key={index} value={index}>
                  Track {index + 1} ({track.notes.length} notes) {track.name && `- ${track.name}`}
                </option>
              ))}
            </select>
          </div>

          {/* Channel Selection */}
          <div>
            <label className="block text-white/80 text-sm mb-2">Channel</label>
            <select
              value={debugState.selectedChannel}
              onChange={(e) => onStateChange({ selectedChannel: parseInt(e.target.value) })}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
            >
              <option value={-1}>All Channels</option>
              {Array.from({ length: 16 }, (_, i) => (
                <option key={i} value={i}>Channel {i + 1}</option>
              ))}
            </select>
          </div>

          {/* Time Range */}
          <div>
            <label className="block text-white/80 text-sm mb-2">
              Time Range: {debugState.timeRange.start.toFixed(1)}s - {debugState.timeRange.end.toFixed(1)}s
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0"
                max={midiData.totalDuration}
                step="0.1"
                value={debugState.timeRange.start}
                onChange={(e) => onStateChange({
                  timeRange: { ...debugState.timeRange, start: parseFloat(e.target.value) }
                })}
                className="w-full"
              />
              <input
                type="range"
                min="0"
                max={midiData.totalDuration}
                step="0.1"
                value={debugState.timeRange.end}
                onChange={(e) => onStateChange({
                  timeRange: { ...debugState.timeRange, end: parseFloat(e.target.value) }
                })}
                className="w-full"
              />
            </div>
          </div>

          {/* Pitch Range */}
          <div>
            <label className="block text-white/80 text-sm mb-2">
              Pitch Range: {debugState.pitchRange.min} - {debugState.pitchRange.max}
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="21"
                max="108"
                value={debugState.pitchRange.min}
                onChange={(e) => onStateChange({
                  pitchRange: { ...debugState.pitchRange, min: parseInt(e.target.value) }
                })}
                className="w-full"
              />
              <input
                type="range"
                min="21"
                max="108"
                value={debugState.pitchRange.max}
                onChange={(e) => onStateChange({
                  pitchRange: { ...debugState.pitchRange, max: parseInt(e.target.value) }
                })}
                className="w-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Volume2 className="w-5 h-5 text-blue-400" />
          <span>Playback Simulation</span>
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={onTogglePlayback}
              className="bg-blue-500 hover:bg-blue-400 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              {debugState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              <span>{debugState.isPlaying ? 'Pause' : 'Play'}</span>
            </button>
            
            <div className="text-white/70 font-mono">
              {debugState.playbackPosition.toFixed(1)}s
            </div>
          </div>
          
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-blue-400 h-2 rounded-full transition-all duration-100"
              style={{ 
                width: `${((debugState.playbackPosition - debugState.timeRange.start) / (debugState.timeRange.end - debugState.timeRange.start)) * 100}%` 
              }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}; 