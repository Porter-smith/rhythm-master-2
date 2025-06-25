import React from 'react';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { ParsedMidiData } from '../../music/MidiParser';
import { DebugState, MidiNote } from './types';

interface MidiDataPanelProps {
  midiData: ParsedMidiData | null;
  isLoading: boolean;
  error: string | null;
  filteredNotes: MidiNote[];
  debugState: DebugState;
}

export const MidiDataPanel: React.FC<MidiDataPanelProps> = ({ 
  midiData, 
  isLoading, 
  error, 
  filteredNotes
}) => {
  if (isLoading) {
    return (
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-white">Parsing MIDI file...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6 flex items-center space-x-3">
        <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
        <div>
          <p className="text-red-400 font-semibold">Parsing Error</p>
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!midiData) return null;

  return (
    <div className="space-y-6">
      {/* MIDI File Info */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span>MIDI File Information</span>
        </h2>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div><span className="text-white/60">Format:</span> <span className="text-white font-mono">{midiData.format}</span></div>
            <div><span className="text-white/60">Tracks:</span> <span className="text-white font-mono">{midiData.trackCount}</span></div>
            <div><span className="text-white/60">Total Notes:</span> <span className="text-white font-mono">{midiData.totalNotes}</span></div>
            <div><span className="text-white/60">Duration:</span> <span className="text-white font-mono">{midiData.totalDuration.toFixed(2)}s</span></div>
          </div>
          <div className="space-y-2">
            <div><span className="text-white/60">Ticks/Quarter:</span> <span className="text-white font-mono">{midiData.ticksPerQuarter}</span></div>
            <div><span className="text-white/60">Tempo Changes:</span> <span className="text-white font-mono">{midiData.tempoChanges.length}</span></div>
            <div><span className="text-white/60">Time Signatures:</span> <span className="text-white font-mono">{midiData.timeSignatures.length}</span></div>
            <div><span className="text-white/60">Filtered Notes:</span> <span className="text-white font-mono">{filteredNotes.length}</span></div>
          </div>
        </div>
      </div>

      {/* Track Information */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <h2 className="text-xl font-bold text-white mb-4">Track Details</h2>
        
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {midiData.tracks.map((track, index) => (
            <div key={index} className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold">Track {index + 1}</span>
                <span className="text-white/60 text-sm">{track.notes.length} notes</span>
              </div>
              {track.name && (
                <div className="text-white/70 text-sm mb-1">Name: {track.name}</div>
              )}
              <div className="text-white/60 text-xs">
                Channel: {track.channel} • Events: {track.events.length}
              </div>
              {track.notes.length > 0 && (
                <div className="text-white/60 text-xs">
                  Time: {track.notes[0].time.toFixed(2)}s - {track.notes[track.notes.length - 1].time.toFixed(2)}s
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tempo Changes */}
      {midiData.tempoChanges.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-yellow-400" />
            <span>Tempo Changes</span>
          </h2>
          
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {midiData.tempoChanges.map((tempo, index) => (
              <div key={index} className="flex justify-between items-center text-sm">
                <span className="text-white/70">{tempo.time.toFixed(2)}s</span>
                <span className="text-white font-mono">{tempo.bpm.toFixed(1)} BPM</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 