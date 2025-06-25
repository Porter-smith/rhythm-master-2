import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Music, Volume2, AlertCircle, CheckCircle } from 'lucide-react';
import { ParsedMidiData } from '../../music/MidiParser';
import { MidiNote } from './types';
import { getAllSoundFonts } from '../../data/soundfonts';
import { Synthetizer, Sequencer } from 'spessasynth_lib';

// Type declaration for spessasynth_lib since there are no official types
declare module 'spessasynth_lib' {
  export class Synthetizer {
    constructor(destination: AudioNode, soundFontBuffer: ArrayBuffer);
  }
  
  export class Sequencer {
    constructor(midiFiles: Array<{ binary: ArrayBuffer }>, synthesizer: Synthetizer);
    play(): void;
    pause(): void;
    stop(): void;
    currentTime: number;
    duration: number;
  }
}

interface SoundfontPlaybackPanelProps {
  midiData: ParsedMidiData | null;
  filteredNotes: MidiNote[];
  defaultSoundFontId: string;
  selectedMidiFile?: string; // Path to the selected MIDI file
}

export const SoundfontPlaybackPanel: React.FC<SoundfontPlaybackPanelProps> = ({
  midiData,
  filteredNotes,
  defaultSoundFontId,
  selectedMidiFile
}) => {
  const [message, setMessage] = useState('Please wait for the soundFont to load.');
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedSoundFontId, setSelectedSoundFontId] = useState(defaultSoundFontId);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<Synthetizer | null>(null);
  const sequencerRef = useRef<Sequencer | null>(null);
  const timeTrackingIntervalRef = useRef<number | null>(null);
  const wasPlayingBeforeRef = useRef(false);
  const previousMidiFileRef = useRef<string | undefined>(selectedMidiFile);

  const availableSoundFonts = getAllSoundFonts();

  // Load soundfont on component mount or when soundfont changes
  useEffect(() => {
    loadSoundfont();
    
    // Cleanup function
    return () => {
      if (timeTrackingIntervalRef.current) {
        clearInterval(timeTrackingIntervalRef.current);
      }
      if (sequencerRef.current) {
        sequencerRef.current.stop();
      }
    };
  }, [selectedSoundFontId]);

  // Watch for MIDI file changes and reset everything
  useEffect(() => {
    if (selectedMidiFile !== previousMidiFileRef.current) {
      console.log('MIDI file changed from', previousMidiFileRef.current, 'to', selectedMidiFile);
      
      // Remember if we were playing before
      wasPlayingBeforeRef.current = isPlaying;
      
      // Stop current playback
      if (sequencerRef.current) {
        sequencerRef.current.stop();
      }
      
      // Clear time tracking
      if (timeTrackingIntervalRef.current) {
        clearInterval(timeTrackingIntervalRef.current);
        timeTrackingIntervalRef.current = null;
      }
      
      // Reset state
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setError(null);
      
      // Update the previous file reference
      previousMidiFileRef.current = selectedMidiFile;
      
      // If we have a soundfont loaded and a new MIDI file, load and play it
      if (selectedMidiFile && synthRef.current && !isLoading) {
        setMessage('Loading new MIDI file...');
        setTimeout(() => {
          loadAndPlayMidi();
        }, 100);
      } else if (selectedMidiFile) {
        setMessage('Ready to load MIDI file. Please wait for soundfont to finish loading.');
      }
    }
  }, [selectedMidiFile, isLoading]);

  const loadSoundfont = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setMessage('Loading soundfont...');
      
      // Remember if we were playing before switching soundfonts
      wasPlayingBeforeRef.current = isPlaying;
      
      // Stop current playback if any
      if (sequencerRef.current) {
        sequencerRef.current.stop();
        setIsPlaying(false);
      }
      
      // Clear time tracking
      if (timeTrackingIntervalRef.current) {
        clearInterval(timeTrackingIntervalRef.current);
        timeTrackingIntervalRef.current = null;
      }
      
      // Reset state
      setCurrentTime(0);
      setDuration(0);
      
      const selectedSoundFont = availableSoundFonts.find(sf => sf.id === selectedSoundFontId);
      if (!selectedSoundFont) {
        throw new Error('Selected soundfont not found');
      }
      
      // Fetch the soundfont file
      const response = await fetch(selectedSoundFont.url);
      if (!response.ok) {
        throw new Error(`Failed to load soundfont: ${response.statusText}`);
      }
      
      const soundFontArrayBuffer = await response.arrayBuffer();
      
      // Create audio context
      const context = new AudioContext();
      audioContextRef.current = context;
      
      // Add the worklet module
      await context.audioWorklet.addModule('/src/components/midi-debug/worklet_processor.min.js');
      
      // Create synthesizer
      synthRef.current = new Synthetizer(context.destination, soundFontArrayBuffer);
      
      setMessage(`SoundFont "${selectedSoundFont.name}" has been loaded!`);
      setIsLoading(false);
      
      // Auto-restart playback if we were playing before and have a MIDI file
      if (wasPlayingBeforeRef.current && selectedMidiFile) {
        setTimeout(() => {
          loadAndPlayMidi();
        }, 500); // Small delay to ensure everything is ready
      }
      
    } catch (error) {
      console.error('Error loading soundfont:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      setMessage('Error loading soundfont. Please try again.');
      setIsLoading(false);
    }
  };

  const loadAndPlayMidi = async () => {
    if (!selectedMidiFile) {
      setMessage('Please select a MIDI file first.');
      return;
    }

    if (!audioContextRef.current || !synthRef.current) {
      setMessage('Audio context not ready. Please wait for soundfont to load.');
      return;
    }

    try {
      setMessage('Loading MIDI file...');
      
      // Fetch the MIDI file from the selected path
      const response = await fetch(selectedMidiFile);
      if (!response.ok) {
        throw new Error(`Failed to load MIDI file: ${response.statusText}`);
      }
      
      const midiFile = await response.arrayBuffer();
      
      // Resume audio context if needed
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      // Create sequencer and start playback
      sequencerRef.current = new Sequencer([{ binary: midiFile }], synthRef.current);
      sequencerRef.current.play();
      
      setIsPlaying(true);
      setMessage(`Now playing: ${selectedMidiFile.split('/').pop()}`);
      
      // Start time tracking
      startTimeTracking();
      
    } catch (error) {
      console.error('Error loading MIDI file:', error);
      setMessage('Error loading MIDI file. Please try again.');
    }
  };

  const startTimeTracking = () => {
    if (timeTrackingIntervalRef.current) {
      clearInterval(timeTrackingIntervalRef.current);
    }
    
    timeTrackingIntervalRef.current = window.setInterval(() => {
      if (sequencerRef.current) {
        setCurrentTime(sequencerRef.current.currentTime || 0);
        setDuration(sequencerRef.current.duration || 0);
      }
    }, 100);
  };

  const handlePlayPause = () => {
    if (!selectedMidiFile) {
      setMessage('Please select a MIDI file first.');
      return;
    }

    if (!sequencerRef.current) {
      // If no sequencer, try to load and play the MIDI file
      loadAndPlayMidi();
      return;
    }
    
    if (isPlaying) {
      sequencerRef.current.pause();
      setIsPlaying(false);
    } else {
      sequencerRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    if (!sequencerRef.current) {
      return;
    }
    
    sequencerRef.current.stop();
    setIsPlaying(false);
    setCurrentTime(0);
    
    if (timeTrackingIntervalRef.current) {
      clearInterval(timeTrackingIntervalRef.current);
      timeTrackingIntervalRef.current = null;
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* SoundFont Selection */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Volume2 className="w-5 h-5 text-blue-400" />
          <span>SoundFont Selection</span>
        </h2>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="soundfont-select" className="block text-sm font-medium text-white/70 mb-2">
              Choose SoundFont:
            </label>
            <select
              id="soundfont-select"
              value={selectedSoundFontId}
              onChange={(e) => setSelectedSoundFontId(e.target.value)}
              disabled={isLoading}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {availableSoundFonts.map((soundFont) => (
                <option key={soundFont.id} value={soundFont.id} className="bg-gray-800 text-white">
                  {soundFont.name}
                </option>
              ))}
            </select>
          </div>
          
          {selectedSoundFontId && (
            <div className="text-sm text-white/60">
              {availableSoundFonts.find(sf => sf.id === selectedSoundFontId)?.description}
            </div>
          )}
        </div>
      </div>

      {/* Status Message */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <div className="flex items-center space-x-3 mb-4">
          {error ? (
            <AlertCircle className="w-5 h-5 text-red-400" />
          ) : isLoading ? (
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-400" />
          )}
          <h2 className="text-xl font-bold text-white">Status</h2>
        </div>
        
        <p className="text-white/80">
          {message}
        </p>
        
        {error && (
          <p className="text-red-400 text-sm mt-2">
            Error: {error}
          </p>
        )}
      </div>

      {/* MIDI File Info */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
          <Music className="w-5 h-5 text-purple-400" />
          <span>MIDI File</span>
        </h2>
        
        <div className="space-y-4">
          {selectedMidiFile ? (
            <div className="text-sm text-white/80">
              <div className="font-medium mb-2">Selected File:</div>
              <div className="bg-white/5 rounded-lg p-3 font-mono text-white/90">
                {selectedMidiFile.split('/').pop()}
              </div>
            </div>
          ) : (
            <div className="text-sm text-white/60">
              No MIDI file selected. Please select a file in the main interface.
            </div>
          )}
          
          <div className="text-sm text-white/60">
            Supported formats: .mid, .rmi, .xmf, .mxmf
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      {!isLoading && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Playback Controls</h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={handlePlayPause}
                disabled={!selectedMidiFile}
                className="flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-5 h-5" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>Play</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleStop}
                disabled={!selectedMidiFile}
                className="flex items-center space-x-2 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
              >
                <Square className="w-5 h-5" />
                <span>Stop</span>
              </button>
            </div>
            
            {duration > 0 && (
              <div className="text-center">
                <div className="text-2xl font-mono text-white mb-2">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-200"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MIDI Data Info */}
      {midiData && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">MIDI Data Info</h2>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div><span className="text-white/60">Total Notes:</span> <span className="text-white font-mono">{midiData.totalNotes}</span></div>
              <div><span className="text-white/60">Duration:</span> <span className="text-white font-mono">{midiData.totalDuration.toFixed(2)}s</span></div>
            </div>
            <div className="space-y-2">
              <div><span className="text-white/60">Tracks:</span> <span className="text-white font-mono">{midiData.trackCount}</span></div>
              <div><span className="text-white/60">Filtered Notes:</span> <span className="text-white font-mono">{filteredNotes.length}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
