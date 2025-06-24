import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, FileMusic, Play, Pause, Download, RefreshCw, AlertCircle, CheckCircle, Clock, Music, Volume2 } from 'lucide-react';
import { MidiParser, ParsedMidiData } from '../music/MidiParser';

interface MidiParserDebugProps {
  onBack: () => void;
}

interface DebugState {
  isLoading: boolean;
  error: string | null;
  midiData: ParsedMidiData | null;
  selectedFile: string;
  selectedTrack: number;
  selectedChannel: number;
  timeRange: { start: number; end: number };
  pitchRange: { min: number; max: number };
  showRawData: boolean;
  playbackPosition: number;
  isPlaying: boolean;
}

const AVAILABLE_MIDI_FILES = [
  { path: '/midi/twinkle-easy.midi', name: 'Twinkle Twinkle (Easy)', description: 'Simple melody for testing basic parsing' },
  { path: '/midi/twinkle-medium.mid', name: 'Twinkle Twinkle (Medium)', description: 'More complex arrangement' },
  { path: '/midi/twinkle-hard.mid', name: 'Twinkle Twinkle (Hard)', description: 'Full arrangement with multiple voices' },
  { path: '/midi/canon-medium.mid', name: 'Canon in D (Medium)', description: 'Classical piece for advanced testing' },
  { path: '/midi/fur-elise-easy.mid', name: 'Für Elise (Easy)', description: 'Beethoven melody' }
];

export const MidiParserDebug: React.FC<MidiParserDebugProps> = ({ onBack }) => {
  const [debugState, setDebugState] = useState<DebugState>({
    isLoading: false,
    error: null,
    midiData: null,
    selectedFile: AVAILABLE_MIDI_FILES[0].path,
    selectedTrack: -1, // -1 means all tracks
    selectedChannel: -1, // -1 means all channels
    timeRange: { start: 0, end: 30 },
    pitchRange: { min: 21, max: 108 }, // Full piano range
    showRawData: false,
    playbackPosition: 0,
    isPlaying: false
  });

  const midiParser = useRef(MidiParser.getInstance());
  const playbackTimer = useRef<number | null>(null);

  // Load MIDI file
  const loadMidiFile = async (filePath: string) => {
    setDebugState(prev => ({ ...prev, isLoading: true, error: null, midiData: null }));
    
    try {
      console.log(`🎹 MIDI Debug: Loading file ${filePath}`);
      const startTime = performance.now();
      
      const midiData = await midiParser.current.loadMidiFile(filePath);
      
      const loadTime = performance.now() - startTime;
      console.log(`✅ MIDI Debug: File loaded in ${loadTime.toFixed(2)}ms`);
      
      setDebugState(prev => ({
        ...prev,
        isLoading: false,
        midiData,
        timeRange: { start: 0, end: Math.min(30, midiData.totalDuration) },
        playbackPosition: 0
      }));
      
    } catch (error) {
      console.error('❌ MIDI Debug: Failed to load file:', error);
      setDebugState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  // Auto-load first file on mount
  useEffect(() => {
    loadMidiFile(debugState.selectedFile);
  }, []);

  // Playback simulation
  const togglePlayback = () => {
    if (debugState.isPlaying) {
      if (playbackTimer.current) {
        clearInterval(playbackTimer.current);
        playbackTimer.current = null;
      }
      setDebugState(prev => ({ ...prev, isPlaying: false }));
    } else {
      playbackTimer.current = window.setInterval(() => {
        setDebugState(prev => {
          const newPosition = prev.playbackPosition + 0.1;
          if (newPosition >= prev.timeRange.end) {
            if (playbackTimer.current) {
              clearInterval(playbackTimer.current);
              playbackTimer.current = null;
            }
            return { ...prev, playbackPosition: prev.timeRange.start, isPlaying: false };
          }
          return { ...prev, playbackPosition: newPosition };
        });
      }, 100);
      setDebugState(prev => ({ ...prev, isPlaying: true }));
    }
  };

  // Get filtered notes based on current settings
  const getFilteredNotes = () => {
    if (!debugState.midiData) return [];
    
    let notes = debugState.selectedTrack >= 0 
      ? midiParser.current.getTrackNotes(debugState.midiData, debugState.selectedTrack)
      : midiParser.current.getAllNotes(debugState.midiData);
    
    if (debugState.selectedChannel >= 0) {
      notes = notes.filter(note => note.channel === debugState.selectedChannel);
    }
    
    notes = midiParser.current.getNotesInTimeRange(notes, debugState.timeRange.start, debugState.timeRange.end);
    notes = midiParser.current.getNotesInPitchRange(notes, debugState.pitchRange.min, debugState.pitchRange.max);
    
    return notes.sort((a, b) => a.time - b.time);
  };

  // Export debug data
  const exportDebugData = () => {
    if (!debugState.midiData) return;
    
    const exportData = {
      file: debugState.selectedFile,
      timestamp: new Date().toISOString(),
      midiData: debugState.midiData,
      filteredNotes: getFilteredNotes(),
      settings: {
        selectedTrack: debugState.selectedTrack,
        selectedChannel: debugState.selectedChannel,
        timeRange: debugState.timeRange,
        pitchRange: debugState.pitchRange
      }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `midi-debug-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredNotes = getFilteredNotes();

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
          <span>Back to Menu</span>
        </button>
        
        <h1 className="text-4xl font-bold text-white text-center flex-1 flex items-center justify-center space-x-3">
          <FileMusic className="w-10 h-10 text-orange-400" />
          <span>MIDI Parser Debug</span>
        </h1>
        
        <div className="w-24"></div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Panel - Controls */}
        <div className="space-y-6">
          {/* File Selection */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
              <FileMusic className="w-5 h-5 text-orange-400" />
              <span>MIDI File Selection</span>
            </h2>
            
            <div className="space-y-3">
              {AVAILABLE_MIDI_FILES.map((file) => (
                <button
                  key={file.path}
                  onClick={() => {
                    setDebugState(prev => ({ ...prev, selectedFile: file.path }));
                    loadMidiFile(file.path);
                  }}
                  className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
                    debugState.selectedFile === file.path
                      ? 'bg-orange-500/30 border-2 border-orange-400'
                      : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                  }`}
                >
                  <div className="font-semibold text-white">{file.name}</div>
                  <div className="text-sm text-white/60">{file.description}</div>
                  <div className="text-xs text-white/40 font-mono">{file.path}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => loadMidiFile(debugState.selectedFile)}
              disabled={debugState.isLoading}
              className="w-full mt-4 bg-orange-500 hover:bg-orange-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${debugState.isLoading ? 'animate-spin' : ''}`} />
              <span>{debugState.isLoading ? 'Loading...' : 'Reload File'}</span>
            </button>
          </div>

          {/* Filters */}
          {debugState.midiData && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Filters</h2>
              
              <div className="space-y-4">
                {/* Track Selection */}
                <div>
                  <label className="block text-white/80 text-sm mb-2">Track</label>
                  <select
                    value={debugState.selectedTrack}
                    onChange={(e) => setDebugState(prev => ({ ...prev, selectedTrack: parseInt(e.target.value) }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  >
                    <option value={-1}>All Tracks</option>
                    {debugState.midiData.tracks.map((track, index) => (
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
                    onChange={(e) => setDebugState(prev => ({ ...prev, selectedChannel: parseInt(e.target.value) }))}
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
                      max={debugState.midiData.totalDuration}
                      step="0.1"
                      value={debugState.timeRange.start}
                      onChange={(e) => setDebugState(prev => ({
                        ...prev,
                        timeRange: { ...prev.timeRange, start: parseFloat(e.target.value) }
                      }))}
                      className="w-full"
                    />
                    <input
                      type="range"
                      min="0"
                      max={debugState.midiData.totalDuration}
                      step="0.1"
                      value={debugState.timeRange.end}
                      onChange={(e) => setDebugState(prev => ({
                        ...prev,
                        timeRange: { ...prev.timeRange, end: parseFloat(e.target.value) }
                      }))}
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
                      onChange={(e) => setDebugState(prev => ({
                        ...prev,
                        pitchRange: { ...prev.pitchRange, min: parseInt(e.target.value) }
                      }))}
                      className="w-full"
                    />
                    <input
                      type="range"
                      min="21"
                      max="108"
                      value={debugState.pitchRange.max}
                      onChange={(e) => setDebugState(prev => ({
                        ...prev,
                        pitchRange: { ...prev.pitchRange, max: parseInt(e.target.value) }
                      }))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Playback Controls */}
          {debugState.midiData && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <Volume2 className="w-5 h-5 text-blue-400" />
                <span>Playback Simulation</span>
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={togglePlayback}
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
          )}
        </div>

        {/* Middle Panel - MIDI Data Overview */}
        <div className="space-y-6">
          {/* Loading/Error State */}
          {debugState.isLoading && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
              <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-white">Parsing MIDI file...</p>
            </div>
          )}

          {debugState.error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6 flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <p className="text-red-400 font-semibold">Parsing Error</p>
                <p className="text-red-300 text-sm">{debugState.error}</p>
              </div>
            </div>
          )}

          {/* MIDI File Info */}
          {debugState.midiData && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <span>MIDI File Information</span>
              </h2>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div><span className="text-white/60">Format:</span> <span className="text-white font-mono">{debugState.midiData.format}</span></div>
                  <div><span className="text-white/60">Tracks:</span> <span className="text-white font-mono">{debugState.midiData.trackCount}</span></div>
                  <div><span className="text-white/60">Total Notes:</span> <span className="text-white font-mono">{debugState.midiData.totalNotes}</span></div>
                  <div><span className="text-white/60">Duration:</span> <span className="text-white font-mono">{debugState.midiData.totalDuration.toFixed(2)}s</span></div>
                </div>
                <div className="space-y-2">
                  <div><span className="text-white/60">Ticks/Quarter:</span> <span className="text-white font-mono">{debugState.midiData.ticksPerQuarter}</span></div>
                  <div><span className="text-white/60">Tempo Changes:</span> <span className="text-white font-mono">{debugState.midiData.tempoChanges.length}</span></div>
                  <div><span className="text-white/60">Time Signatures:</span> <span className="text-white font-mono">{debugState.midiData.timeSignatures.length}</span></div>
                  <div><span className="text-white/60">Filtered Notes:</span> <span className="text-white font-mono">{filteredNotes.length}</span></div>
                </div>
              </div>
            </div>
          )}

          {/* Track Information */}
          {debugState.midiData && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Track Details</h2>
              
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {debugState.midiData.tracks.map((track, index) => (
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
          )}

          {/* Tempo Changes */}
          {debugState.midiData && debugState.midiData.tempoChanges.length > 0 && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-yellow-400" />
                <span>Tempo Changes</span>
              </h2>
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {debugState.midiData.tempoChanges.map((tempo, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <span className="text-white/70">{tempo.time.toFixed(2)}s</span>
                    <span className="text-white font-mono">{tempo.bpm.toFixed(1)} BPM</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Note Data */}
        <div className="space-y-6">
          {/* Note Visualization */}
          {debugState.midiData && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Music className="w-5 h-5 text-purple-400" />
                  <span>Note Visualization</span>
                </h2>
                <button
                  onClick={exportDebugData}
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
          )}

          {/* Note Data Table */}
          {debugState.midiData && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Note Data</h2>
                <button
                  onClick={() => setDebugState(prev => ({ ...prev, showRawData: !prev.showRawData }))}
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
          )}

          {/* Raw MIDI Data */}
          {debugState.showRawData && debugState.midiData && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Raw MIDI Data</h2>
              
              <div className="bg-black/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <pre className="text-xs text-white/80 font-mono whitespace-pre-wrap">
                  {JSON.stringify(debugState.midiData, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};