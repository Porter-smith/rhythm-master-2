import React from 'react';
import { Download, Music } from 'lucide-react';
import { ParsedMidiData } from '../../music/MidiParser';
import { DebugState, MidiNote } from './types';

interface NoteVisualizationPanelProps {
  midiData: ParsedMidiData | null;
  filteredNotes: MidiNote[];
  debugState: DebugState;
  onStateChange: (updates: Partial<DebugState>) => void;
  onExportData: () => void;
}

export const NoteVisualizationPanel: React.FC<NoteVisualizationPanelProps> = ({ 
  midiData, 
  filteredNotes, 
  debugState, 
  onStateChange, 
  onExportData 
}) => {
  if (!midiData) return null;

  return (
    <div className="space-y-6">
      {/* Note Visualization */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <Music className="w-5 h-5 text-purple-400" />
            <span>Note Visualization</span>
          </h2>
          <button
            onClick={onExportData}
            className="bg-purple-500 hover:bg-purple-400 text-white font-bold py-2 px-3 rounded-lg transition-colors duration-200 flex items-center space-x-2 text-sm"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
        
        {/* Piano Roll Visualization */}
        <div className="bg-black/30 rounded-lg p-4 mb-4">
          <div className="relative h-64 overflow-hidden">
            <svg width="100%" height="100%" className="absolute inset-0">
              {/* Time grid */}
              {Array.from({ length: Math.ceil(debugState.timeRange.end - debugState.timeRange.start) + 1 }, (_, i) => {
                const time = debugState.timeRange.start + i;
                const x = (time - debugState.timeRange.start) / (debugState.timeRange.end - debugState.timeRange.start) * 100;
                return (
                  <line
                    key={i}
                    x1={`${x}%`}
                    y1="0"
                    x2={`${x}%`}
                    y2="100%"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth="1"
                  />
                );
              })}
              
              {/* Playback cursor */}
              {debugState.playbackPosition >= debugState.timeRange.start && debugState.playbackPosition <= debugState.timeRange.end && (
                <line
                  x1={`${((debugState.playbackPosition - debugState.timeRange.start) / (debugState.timeRange.end - debugState.timeRange.start)) * 100}%`}
                  y1="0"
                  x2={`${((debugState.playbackPosition - debugState.timeRange.start) / (debugState.timeRange.end - debugState.timeRange.start)) * 100}%`}
                  y2="100%"
                  stroke="#ff0000"
                  strokeWidth="2"
                />
              )}
              
              {/* Notes */}
              {filteredNotes.map((note, index) => {
                const x = ((note.time - debugState.timeRange.start) / (debugState.timeRange.end - debugState.timeRange.start)) * 100;
                const width = (note.duration / (debugState.timeRange.end - debugState.timeRange.start)) * 100;
                const y = ((debugState.pitchRange.max - note.pitch) / (debugState.pitchRange.max - debugState.pitchRange.min)) * 100;
                const height = 2;
                
                const isActive = debugState.playbackPosition >= note.time && debugState.playbackPosition <= note.time + note.duration;
                
                return (
                  <rect
                    key={index}
                    x={`${x}%`}
                    y={`${y}%`}
                    width={`${Math.max(width, 0.5)}%`}
                    height={`${height}%`}
                    fill={isActive ? '#ffff00' : `hsl(${(note.channel * 30) % 360}, 70%, 60%)`}
                    opacity={isActive ? 1 : 0.8}
                  />
                );
              })}
            </svg>
          </div>
          
          <div className="flex justify-between text-xs text-white/60 mt-2">
            <span>{debugState.timeRange.start.toFixed(1)}s</span>
            <span>{debugState.timeRange.end.toFixed(1)}s</span>
          </div>
        </div>
        
        <div className="text-center text-white/60 text-sm">
          Piano Roll View • {filteredNotes.length} notes displayed
        </div>
      </div>

      {/* Note Data Table */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Note Data</h2>
          <button
            onClick={() => onStateChange({ showRawData: !debugState.showRawData })}
            className="text-white/70 hover:text-white text-sm"
          >
            {debugState.showRawData ? 'Hide Raw Data' : 'Show Raw Data'}
          </button>
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white/10">
              <tr className="text-white/80">
                <th className="text-left p-2">#</th>
                <th className="text-left p-2">Time</th>
                <th className="text-left p-2">Pitch</th>
                <th className="text-left p-2">Duration</th>
                <th className="text-left p-2">Velocity</th>
                <th className="text-left p-2">Channel</th>
              </tr>
            </thead>
            <tbody>
              {filteredNotes.slice(0, 100).map((note, index) => {
                const isActive = debugState.playbackPosition >= note.time && debugState.playbackPosition <= note.time + note.duration;
                return (
                  <tr key={index} className={`${isActive ? 'bg-yellow-500/20' : 'hover:bg-white/5'} transition-colors`}>
                    <td className="p-2 text-white/60">{index + 1}</td>
                    <td className="p-2 text-white font-mono">{note.time.toFixed(3)}s</td>
                    <td className="p-2 text-white font-mono">{note.pitch}</td>
                    <td className="p-2 text-white font-mono">{note.duration.toFixed(3)}s</td>
                    <td className="p-2 text-white font-mono">{note.velocity}</td>
                    <td className="p-2 text-white font-mono">{note.channel}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {filteredNotes.length > 100 && (
            <div className="text-center text-white/60 text-sm mt-4">
              Showing first 100 of {filteredNotes.length} notes
            </div>
          )}
        </div>
      </div>

      {/* Raw MIDI Data */}
      {debugState.showRawData && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Raw MIDI Data</h2>
          
          <div className="bg-black/50 rounded-lg p-4 max-h-64 overflow-y-auto">
            <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap">
              {JSON.stringify(midiData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}; 