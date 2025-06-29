import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, FileMusic } from 'lucide-react';
import { MidiParser } from '../music/MidiParser';
import { getSoundFontForSong } from '../data/soundfonts';
import { FileSelectionPanel } from './midi-debug/FileSelectionPanel';
import { FiltersPanel } from './midi-debug/FiltersPanel';
import { MidiDataPanel } from './midi-debug/MidiDataPanel';
import { NoteVisualizationPanel } from './midi-debug/NoteVisualizationPanel';
import { SoundfontPlaybackPanel } from './midi-debug/SoundfontPlaybackPanel';
import { DebugState, MidiNote } from './midi-debug/types';

interface MidiParserDebugProps {
  onBack: () => void;
  song?: {
    soundFont?: string;
  };
}

const AVAILABLE_MIDI_FILES = [
  { path: '/midi/twinkle-easy.midi', name: 'Twinkle Twinkle (Easy)', description: 'Simple melody for testing basic parsing' },
  { path: '/midi/dooms-gate-easy.mid', name: 'Dooms Gate (Easy)', description: 'Dooms Gate melody' }
];

export const MidiParserDebug: React.FC<MidiParserDebugProps> = ({ onBack, song: initialSong }) => {
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

  const [selectedSong, setSelectedSong] = useState(initialSong);
  const midiParser = useRef(MidiParser.getInstance());
  const playbackTimer = useRef<number | null>(null);

  // Get soundfont URL from song data
  const getSoundfontUrl = (): string => {
    console.log('selectedSong', selectedSong);
    if (selectedSong) {
      console.log('selectedSong', selectedSong);
      const soundFont = getSoundFontForSong(selectedSong);
      console.log('soundFont', soundFont);
      return soundFont.url;
    }
    // Default to Equinox Grand Pianos if no song provided
    return '/soundfonts/Equinox_Grand_Pianos.sf2';
  };

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

  // Handle file selection with song
  const handleFileSelect = (file: string, song?: any) => {
    setDebugState(prev => ({ ...prev, selectedFile: file }));
    setSelectedSong(song);
    loadMidiFile(file);
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
  const getFilteredNotes = (): MidiNote[] => {
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
          <FileSelectionPanel
            selectedFile={debugState.selectedFile}
            isLoading={debugState.isLoading}
            onFileSelect={handleFileSelect}
            onReload={() => loadMidiFile(debugState.selectedFile)}
          />

          <FiltersPanel
            midiData={debugState.midiData}
            debugState={debugState}
            onStateChange={(updates) => setDebugState(prev => ({ ...prev, ...updates }))}
            onTogglePlayback={togglePlayback}
          />

          <SoundfontPlaybackPanel 
            soundfontUrl={getSoundfontUrl()}
            midiUrl={debugState.selectedFile}
          />
        </div>

        {/* Middle Panel - MIDI Data Overview */}
        <div>
          <MidiDataPanel
            midiData={debugState.midiData}
            isLoading={debugState.isLoading}
            error={debugState.error}
            filteredNotes={filteredNotes}
            debugState={debugState}
          />
        </div>

        {/* Right Panel - Note Data */}
        <div>
          <NoteVisualizationPanel
            midiData={debugState.midiData}
            filteredNotes={filteredNotes}
            debugState={debugState}
            onStateChange={(updates) => setDebugState(prev => ({ ...prev, ...updates }))}
            onExportData={exportDebugData}
          />
        </div>
      </div>
    </div>
  );
};