import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, Music, Volume2, VolumeX, AlertCircle, CheckCircle, Piano } from 'lucide-react';
import { ParsedMidiData } from '../../music/MidiParser';
import { MidiNote } from './types';
import { getAllSoundFonts } from '../../data/soundfonts';
import { Synthetizer, Sequencer } from 'spessasynth_lib';

// MIDI instrument names (General MIDI standard)
const midiPatchNames = [
  "Acoustic Grand Piano",
  "Bright Acoustic Piano", 
  "Electric Grand Piano",
  "Honky-tonk Piano",
  "Electric Piano 1",
  "Electric Piano 2",
  "Harpsichord",
  "Clavi",
  "Celesta",
  "Glockenspiel",
  "Music Box",
  "Vibraphone",
  "Marimba",
  "Xylophone",
  "Tubular Bells",
  "Dulcimer",
  "Drawbar Organ",
  "Percussive Organ",
  "Rock Organ",
  "Church Organ",
  "Reed Organ",
  "Accordion",
  "Harmonica",
  "Tango Accordion",
  "Acoustic Guitar (nylon)",
  "Acoustic Guitar (steel)",
  "Electric Guitar (jazz)",
  "Electric Guitar (clean)",
  "Electric Guitar (muted)",
  "Overdriven Guitar",
  "Distortion Guitar",
  "Guitar Harmonics",
  "Acoustic Bass",
  "Electric Bass (finger)",
  "Electric Bass (pick)",
  "Fretless Bass",
  "Slap Bass 1",
  "Slap Bass 2",
  "Synth Bass 1",
  "Synth Bass 2",
  "Violin",
  "Viola",
  "Cello",
  "Contrabass",
  "Tremolo Strings",
  "Pizzicato Strings",
  "Orchestral Harp",
  "Timpani",
  "String Ensemble 1",
  "String Ensemble 2",
  "Synth Strings 1",
  "Synth Strings 2",
  "Choir Aahs",
  "VoiceGroup Oohs",
  "Synth Choir",
  "Orchestra Hit",
  "Trumpet",
  "Trombone",
  "Tuba",
  "Muted Trumpet",
  "French Horn",
  "Brass Section",
  "Synth Brass 1",
  "Synth Brass 2",
  "Soprano Sax",
  "Alto Sax",
  "Tenor Sax",
  "Baritone Sax",
  "Oboe",
  "English Horn",
  "Bassoon",
  "Clarinet",
  "Piccolo",
  "Flute",
  "Recorder",
  "Pan Flute",
  "Blown Bottle",
  "Shakuhachi",
  "Whistle",
  "Ocarina",
  "Lead 1 (square)",
  "Lead 2 (sawtooth)",
  "Lead 3 (calliope)",
  "Lead 4 (chiff)",
  "Lead 5 (charang)",
  "Lead 6 (voice)",
  "Lead 7 (fifths)",
  "Lead 8 (bass + lead)",
  "Pad 1 (new age)",
  "Pad 2 (warm)",
  "Pad 3 (polysynth)",
  "Pad 4 (choir)",
  "Pad 5 (bowed)",
  "Pad 6 (metallic)",
  "Pad 7 (halo)",
  "Pad 8 (sweep)",
  "FX 1 (rain)",
  "FX 2 (soundtrack)",
  "FX 3 (crystal)",
  "FX 4 (atmosphere)",
  "FX 5 (brightness)",
  "FX 6 (goblins)",
  "FX 7 (echoes)",
  "FX 8 (sci-fi)",
  "Sitar",
  "Banjo",
  "Shamisen",
  "Koto",
  "Kalimba",
  "Bagpipe",
  "Fiddle",
  "Shanai",
  "Tinkle Bell",
  "Agogo",
  "Steel Drums",
  "Woodblock",
  "Taiko Drum",
  "Melodic Tom",
  "Synth Drum",
  "Reverse Cymbal",
  "Guitar Fret Noise",
  "Breath Noise",
  "Seashore",
  "Bird Tweet",
  "Telephone Ring",
  "Attack Helicopter",
  "Applause",
  "Gunshot"
];

// Function to get instrument name (like the professional player)
const getInstrumentName = (program: number, channel?: number): string => {
  // Special handling for Channel 10 (drums)
  if (channel === 9) { // Channel 10 (0-indexed)
    // Channel 10 is always drums, regardless of program number
    if (program === 0) return "Standard Kit";
    if (program === 8) return "Room Kit";
    if (program === 16) return "Power Kit";
    if (program === 24) return "Electronic Kit";
    if (program === 25) return "TR-808 Kit";
    if (program === 32) return "Jazz Kit";
    if (program === 40) return "Brush Kit";
    if (program === 48) return "Orchestra Kit";
    if (program === 56) return "Sound Effects";
    return `Drum Kit ${program}`;
  }
  
  // Use General MIDI names for other channels
  return midiPatchNames[program] || `Unknown Instrument (${program})`;
};

interface NoteEvent {
  time: number;
  duration: number;
  pitch: number;
  velocity: number;
}

interface InstrumentInfo {
  channel: number;
  instrument: number;
  name: string;
  trackName?: string;
  noteCount: number;
  timeRange?: { start: number; end: number };
  notes: NoteEvent[];
  muted?: boolean;
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
  const [instruments, setInstruments] = useState<InstrumentInfo[]>([]);
  const [mutedInstruments, setMutedInstruments] = useState<Set<number>>(new Set());
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<Synthetizer | null>(null);
  const sequencerRef = useRef<Sequencer | null>(null);
  const timeTrackingIntervalRef = useRef<number | null>(null);
  const wasPlayingBeforeRef = useRef(false);
  const previousMidiFileRef = useRef<string | undefined>(selectedMidiFile);

  const availableSoundFonts = getAllSoundFonts();

  // Parse MIDI file to extract instrument information with detailed note events
  const parseMidiInstruments = async (midiFile: ArrayBuffer): Promise<InstrumentInfo[]> => {
    try {
      const data = new Uint8Array(midiFile);
      let pos = 0;

      // Helper functions for reading binary data
      const read32 = (): number => (data[pos++] << 24) | (data[pos++] << 16) | (data[pos++] << 8) | data[pos++];
      const read16 = (): number => (data[pos++] << 8) | data[pos++];
      const read8 = (): number => data[pos++];
      const readVarLength = (): number => {
        let value = 0;
        let byte: number;
        do {
          byte = read8();
          value = (value << 7) | (byte & 0x7F);
        } while (byte & 0x80);
        return value;
      };

      // Validate MIDI header
      if (data[0] !== 77 || data[1] !== 84 || data[2] !== 104 || data[3] !== 100) {
        throw new Error('Invalid MIDI file header');
      }
      pos = 4;

      // Read header chunk
      read32(); // Skip header length
      read16(); // Skip format
      const trackCount = read16();
      const ticksPerQuarter = read16();

      const instruments = new Map<number, InstrumentInfo>();
      const activeNotes = new Map<number, Map<number, { startTicks: number; velocity: number }>>();

      // Process each track
      for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
        // Validate track header
        if (data[pos++] !== 77 || data[pos++] !== 84 || data[pos++] !== 114 || data[pos++] !== 107) {
          continue;
        }

        const trackLength = read32();
        const trackEnd = pos + trackLength;
        let trackTicks = 0;
        let runningStatus = 0;
        let trackName: string | undefined;

        // Process track events
        while (pos < trackEnd) {
          const deltaTime = readVarLength();
          trackTicks += deltaTime;
          
          let command = read8();
          if (command < 0x80) {
            pos--;
            command = runningStatus;
          } else {
            runningStatus = command;
          }

          const messageType = command & 0xF0;
          const channel = command & 0x0F;

          if (messageType === 0xC0) {
            // Program Change (instrument selection)
            const instrument = read8();
            const instrumentName = getInstrumentName(instrument, channel);
            
            if (!instruments.has(channel)) {
              instruments.set(channel, {
                channel,
                instrument,
                name: instrumentName,
                trackName: trackName,
                noteCount: 0,
                notes: []
              });
            } else {
              const existing = instruments.get(channel)!;
              existing.instrument = instrument;
              existing.name = instrumentName;
              if (trackName) existing.trackName = trackName;
            }
          } else if (command === 0xFF) {
            // Meta event
            const metaType = read8();
            const metaLength = readVarLength();
            
            if (metaType === 0x03) {
              // Track Name
              const nameBytes = data.slice(pos, pos + metaLength);
              trackName = new TextDecoder().decode(nameBytes);
              pos += metaLength;
            } else {
              pos += metaLength;
            }
          } else if (messageType === 0x90) {
            // Note On
            const pitch = read8();
            const velocity = read8();
            
            if (velocity > 0) {
              // Initialize channel if needed
              if (!activeNotes.has(channel)) {
                activeNotes.set(channel, new Map());
              }
              if (!instruments.has(channel)) {
                instruments.set(channel, {
                  channel,
                  instrument: 0,
                  name: getInstrumentName(0, channel),
                  trackName: trackName,
                  noteCount: 0,
                  notes: []
                });
              }
              
              // Track active note
              activeNotes.get(channel)!.set(pitch, { startTicks: trackTicks, velocity });
              instruments.get(channel)!.noteCount++;
            } else {
              // Velocity 0 = note off
              processNoteOff(channel, pitch, trackTicks, activeNotes, instruments, ticksPerQuarter);
            }
          } else if (messageType === 0x80) {
            // Note Off
            const pitch = read8();
            read8(); // Skip velocity
            processNoteOff(channel, pitch, trackTicks, activeNotes, instruments, ticksPerQuarter);
          } else if (messageType === 0xA0 || messageType === 0xB0 || messageType === 0xE0) {
            // Aftertouch, Control Change, Pitch Bend (2 bytes)
            read8();
            read8();
          } else if (messageType === 0xD0) {
            // Channel Pressure (1 byte)
            read8();
          } else if (command >= 0xF0) {
            // System exclusive
            const sysexLength = readVarLength();
            pos += sysexLength;
          }
        }
      }

      // Process any remaining active notes
      activeNotes.forEach((channelNotes, channel) => {
        channelNotes.forEach((noteInfo, pitch) => {
          const startTime = noteInfo.startTicks / ticksPerQuarter * 0.5;
          const noteEvent: NoteEvent = {
            time: startTime,
            duration: 0.5, // Default duration
            pitch,
            velocity: noteInfo.velocity
          };
          instruments.get(channel)?.notes.push(noteEvent);
        });
      });

      // Calculate time ranges and sort notes
      instruments.forEach((instrument) => {
        if (instrument.notes.length > 0) {
          const times = instrument.notes.map(n => n.time);
          const endTimes = instrument.notes.map(n => n.time + n.duration);
          instrument.timeRange = {
            start: Math.min(...times),
            end: Math.max(...endTimes)
          };
          // Sort notes by time
          instrument.notes.sort((a, b) => a.time - b.time);
        }
      });

      // Log summary of what we found
      console.log('=== MIDI Instrument Parsing Summary ===');
      instruments.forEach((instrument) => {
        const gmName = getInstrumentName(instrument.instrument, instrument.channel);
        const isCustom = instrument.name !== gmName;
        console.log(`Channel ${instrument.channel + 1}: ${instrument.name} ${isCustom ? '(CUSTOM)' : '(GM)'} [Program ${instrument.instrument}]`);
      });
      console.log('=====================================');

      return Array.from(instruments.values()).sort((a, b) => a.channel - b.channel);
    } catch (error) {
      console.error('Error parsing MIDI instruments:', error);
      return [];
    }
  };

  // Helper function to process note off events
  const processNoteOff = (
    channel: number,
    pitch: number,
    endTicks: number,
    activeNotes: Map<number, Map<number, { startTicks: number; velocity: number }>>,
    instruments: Map<number, InstrumentInfo>,
    ticksPerQuarter: number
  ) => {
    const channelNotes = activeNotes.get(channel);
    if (channelNotes && channelNotes.has(pitch)) {
      const noteInfo = channelNotes.get(pitch)!;
      const startTime = noteInfo.startTicks / ticksPerQuarter * 0.5;
      const endTime = endTicks / ticksPerQuarter * 0.5;
      const duration = Math.max(0.1, endTime - startTime);
      
      const noteEvent: NoteEvent = {
        time: startTime,
        duration,
        pitch,
        velocity: noteInfo.velocity
      };
      
      instruments.get(channel)?.notes.push(noteEvent);
      channelNotes.delete(pitch);
    }
  };

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
      setInstruments([]); // Clear instruments when MIDI file changes
      
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
      
      // Parse instruments from the MIDI file
      const instrumentInfo = await parseMidiInstruments(midiFile);
      setInstruments(instrumentInfo);
      
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

  // Mute/unmute functions for individual instruments
  const toggleInstrumentMute = async (channel: number) => {
    const newMutedState = !mutedInstruments.has(channel);
    
    setMutedInstruments(prev => {
      const newSet = new Set(prev);
      if (newMutedState) {
        newSet.add(channel);
        console.log(`🔇 Muted instrument channel ${channel + 1}`);
      } else {
        newSet.delete(channel);
        console.log(`🔊 Unmuted instrument channel ${channel + 1}`);
      }
      return newSet;
    });

    // Use the native spessasynth_lib muteChannel method
    if (synthRef.current) {
      synthRef.current.muteChannel(channel, newMutedState);
      console.log(`🎛️ Channel ${channel + 1} ${newMutedState ? 'muted' : 'unmuted'} via synthesizer`);
    }
  };

  const isInstrumentMuted = (channel: number) => mutedInstruments.has(channel);

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

      {/* Info about instrument names */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
        <div className="text-sm text-blue-300">
          <div className="font-medium mb-1">Instrument Names:</div>
          <div className="text-blue-200/80">
            • <span className="text-white">Main name</span> = Instrument name based on program number and channel
            • <span className="text-white/40">"GM Category"</span> = General MIDI standard name (when different)
            • <span className="text-yellow-400">Channel 10</span> = Always drums/percussion (special MIDI standard)
            • Shows GM category only when it differs from the actual name
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

      {/* Instruments and Voices Panel */}
      {instruments.length > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20" style={{ maxHeight: 520, minHeight: 320, overflowY: 'auto' }}>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <Piano className="w-5 h-5 text-green-400" />
            <span>Instruments & Voices</span>
          </h2>
          
          <div className="space-y-3">
            {instruments.map((instrument) => {
              // Find currently playing notes for this instrument
              const currentlyPlayingNotes = instrument.notes.filter(note => 
                currentTime >= note.time && currentTime <= note.time + note.duration
              );
              
              // Check if instrument is currently active
              const isActive = currentlyPlayingNotes.length > 0;
              
              // Get note names for display
              const getNoteName = (pitch: number): string => {
                const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                const octave = Math.floor(pitch / 12) - 1;
                const noteName = noteNames[pitch % 12];
                return `${noteName}${octave}`;
              };
              
              return (
                <div key={instrument.channel} className={`bg-white/5 rounded-lg p-4 border transition-all duration-200 ${
                  isInstrumentMuted(instrument.channel)
                    ? 'border-red-400/50 bg-red-400/10 opacity-60'
                    : isActive 
                      ? 'border-green-400/50 bg-green-400/10' 
                      : 'border-white/10'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200 ${
                        isInstrumentMuted(instrument.channel)
                          ? 'bg-red-500 text-white'
                          : isActive 
                            ? 'bg-green-500 text-white animate-pulse' 
                            : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {instrument.channel + 1}
                      </div>
                      <div>
                        <div className="text-white font-medium">{instrument.name}</div>
                        <div className="text-white/60 text-sm">
                          Channel {instrument.channel + 1} • Program {instrument.instrument}
                        </div>
                        {instrument.name !== getInstrumentName(instrument.instrument, instrument.channel) && (
                          <div className="text-white/40 text-xs mt-1">
                            GM Category: {getInstrumentName(instrument.instrument, instrument.channel)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {/* Mute Button */}
                      <button
                        onClick={() => toggleInstrumentMute(instrument.channel)}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          isInstrumentMuted(instrument.channel)
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                        title={isInstrumentMuted(instrument.channel) ? 'Unmute instrument' : 'Mute instrument'}
                      >
                        {isInstrumentMuted(instrument.channel) ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      
                      {/* Note Count */}
                      <div className="text-right">
                        <div className="text-white font-mono text-sm">{instrument.noteCount}</div>
                        <div className="text-white/60 text-xs">total notes</div>
                      </div>
                    </div>
                  </div>
                  
                  {instrument.trackName && (
                    <div className="text-white/70 text-sm italic mb-2">
                      Track: "{instrument.trackName}"
                    </div>
                  )}
                  
                  {/* Currently Playing Notes */}
                  <div className="mt-2 flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      isInstrumentMuted(instrument.channel)
                        ? 'bg-red-400'
                        : isActive 
                          ? 'bg-green-400 animate-pulse' 
                          : 'bg-gray-400/40'
                    }`} />
                    <span className={`text-xs transition-colors duration-200 ${
                      isInstrumentMuted(instrument.channel)
                        ? 'text-red-400 font-medium'
                        : isActive 
                          ? 'text-green-400 font-medium' 
                          : 'text-white/40'
                    }`}>
                      {isInstrumentMuted(instrument.channel) 
                        ? 'Muted' 
                        : isActive 
                          ? `Playing ${currentlyPlayingNotes.length} note${currentlyPlayingNotes.length !== 1 ? 's' : ''}` 
                          : 'Inactive'
                      }
                    </span>
                  </div>
                  
                  {/* Show currently playing note details (always render for layout stability) */}
                  <div className="mt-2 p-2 bg-white/5 rounded border border-white/10 min-h-[44px] flex flex-col justify-center">
                    <div className="text-xs text-white/60 mb-1">Currently playing:</div>
                    {currentlyPlayingNotes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {currentlyPlayingNotes.map((note, index) => (
                          <span 
                            key={index} 
                            className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded font-mono"
                            title={`Note ${note.pitch} (${getNoteName(note.pitch)}) - Velocity: ${note.velocity}`}
                          >
                            {note.pitch}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ minHeight: 20 }} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-sm text-white/60">
              Total Instruments: {instruments.length} • 
              Total Notes: {instruments.reduce((sum, inst) => sum + inst.noteCount, 0)} •
              Currently Playing: {instruments.filter(inst => 
                inst.notes.some(note => currentTime >= note.time && currentTime <= note.time + note.duration)
              ).length} •
              Muted: {mutedInstruments.size}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
