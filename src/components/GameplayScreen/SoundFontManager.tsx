import { useState, useCallback, useRef } from 'react';
import { Synthetizer } from 'spessasynth_lib';
import { getAudioContext } from '../../utils/audioContext';
import { Song } from '../../types/music';

// Available soundfonts - using the working URLs from the POC
const SOUNDFONTS = {
  'Piano': 'https://smpldsnds.github.io/soundfonts/soundfonts/yamaha-grand-lite.sf2',
  'Electric Piano': 'https://smpldsnds.github.io/soundfonts/soundfonts/galaxy-electric-pianos.sf2',
  'Organ': 'https://smpldsnds.github.io/soundfonts/soundfonts/giga-hq-fm-gm.sf2',
  'GZDoom': '/soundfonts/gzdoom.sf2',  // Local GZDoom sound font
};

export interface SoundFontState {
  synth: Synthetizer | undefined;
  isReady: boolean;
  isLoading: boolean;
  selectedSoundFont: string;
  error: string | null;
  selectedInstrument?: { channel: number; instrument: number; name: string };
  isMuted: boolean;
  playingNotes: Set<number>; // Track which notes are currently playing
}

export const useSoundFontManager = () => {
  const [soundFontState, setSoundFontState] = useState<SoundFontState>({
    synth: undefined,
    isReady: false,
    isLoading: false,
    selectedSoundFont: 'Piano',
    error: null,
    selectedInstrument: undefined,
    isMuted: false,
    playingNotes: new Set()
  });

  // Use ref to always have access to current state in callbacks
  const stateRef = useRef(soundFontState);
  stateRef.current = soundFontState;

  // Load soundfont using SpessaSynth Synthetizer
  const loadSoundFont = useCallback(async (soundfontName: string): Promise<boolean> => {
    try {
      console.log(`🎹 Loading soundfont: ${soundfontName}`);
      
      setSoundFontState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        isReady: false,
        synth: undefined // Clear synth during loading
      }));

      // Disconnect existing synth
      if (stateRef.current.synth) {
        // SpessaSynth doesn't have a disconnect method, we'll just replace it
        console.log('🔄 Replacing existing synthesizer');
      }

      // Get singleton audio context
      const context = getAudioContext();
      console.log(`🎵 Audio context state: ${context.state}`);

      // Resume audio context if suspended
      if (context.state === 'suspended') {
        await context.resume();
        console.log(`🎵 Audio context resumed`);
      }

      // CRITICAL: Load the AudioWorklet module before creating Synthetizer
      console.log('🔧 Loading AudioWorklet module...');
      await context.audioWorklet.addModule('/src/components/midi-debug/worklet_processor.min.js');
      console.log('✅ AudioWorklet module loaded');

      // Get soundfont URL - handle both named soundfonts and custom URLs
      let url: string;
      if (SOUNDFONTS[soundfontName as keyof typeof SOUNDFONTS]) {
        url = SOUNDFONTS[soundfontName as keyof typeof SOUNDFONTS];
      } else {
        // Assume it's a custom URL/path
        url = soundfontName;
      }
      console.log(`📂 Soundfont URL: ${url}`);

      // Fetch the soundfont file
      console.log('📡 Fetching soundfont file...');
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch soundfont: ${response.status} ${response.statusText}`);
      }
      const soundFontBuffer = await response.arrayBuffer();
      console.log(`📦 Soundfont loaded: ${soundFontBuffer.byteLength} bytes`);

      // Create new SpessaSynth Synthetizer (following the example pattern)
      console.log('🎼 Creating SpessaSynth Synthetizer...');
      const newSynth = new Synthetizer(context.destination, soundFontBuffer);

      // Wait for the synthesizer to be ready
      console.log('⏳ Waiting for synthesizer to be ready...');
      await newSynth.isReady;
      console.log('✅ Synthetizer ready');

      // Get available presets
      const presets = newSynth.presetList || [];
      console.log(`🎵 Available presets: ${presets.length} total`);
      console.log(`🎵 First 5 presets:`, presets.slice(0, 5));

      // Load the specific instrument based on selected instrument name
      if (presets.length > 0) {
        const selectedInstrument = stateRef.current.selectedInstrument;
        
        if (selectedInstrument && selectedInstrument.name) {
          // Try to find the preset by name in the soundfont
          console.log(`🎹 Looking for instrument: "${selectedInstrument.name}"`);
          
          // Find preset by name (case-insensitive)
          const foundPreset = presets.find(preset => {
            const presetLower = preset.presetName.toLowerCase();
            const selectedLower = selectedInstrument.name.toLowerCase();
            
            // Exact match
            if (presetLower === selectedLower) return true;
            
            // Contains match (either direction)
            if (presetLower.includes(selectedLower) || selectedLower.includes(presetLower)) return true;
            
            // Handle common variations
            const variations: Record<string, string[]> = {
              'overdriven guitar': ['overdrive gt', 'overdrive', 'guitar'],
              'acoustic guitar (steel)': ['steel-str.gt', 'steel', 'guitar'],
              'acoustic guitar (nylon)': ['nylon-str.gt', 'nylon', 'guitar'],
              'electric guitar (clean)': ['clean gt', 'clean', 'guitar'],
              'electric guitar (jazz)': ['jazz gt', 'jazz', 'guitar'],
              'electric guitar (muted)': ['muted gt', 'muted', 'guitar'],
              'distortion guitar': ['distortiongt', 'distortion', 'guitar'],
              'guitar harmonics': ['gt.harmonics', 'harmonics', 'guitar'],
              'acoustic bass': ['acoustic bs', 'bass'],
              'electric bass (finger)': ['fingered bs', 'bass'],
              'electric bass (pick)': ['picked bs', 'bass'],
              'fretless bass': ['fretless bs', 'bass'],
              'slap bass 1': ['slap bass 1', 'bass'],
              'slap bass 2': ['slap bass 2', 'bass'],
              'synth bass 1': ['synth bass 1', 'bass'],
              'synth bass 2': ['synth bass 2', 'bass'],
              'drawbar organ': ['organ 1', 'organ'],
              'percussive organ': ['organ 2', 'organ'],
              'rock organ': ['organ 3', 'organ'],
              'church organ': ['church org', 'organ'],
              'reed organ': ['reed organ', 'organ'],
              'acoustic grand piano': ['piano 1', 'piano'],
              'bright acoustic piano': ['piano 2', 'piano'],
              'electric grand piano': ['piano 3', 'piano'],
              'honky-tonk piano': ['honky-tonk', 'piano'],
              'electric piano 1': ['e.piano 1', 'piano'],
              'electric piano 2': ['e.piano 2', 'piano'],
              'harpsichord': ['harpsichord', 'harpsi'],
              'clavi': ['clav', 'clavi'],
              'violin': ['violin'],
              'viola': ['viola'],
              'cello': ['cello'],
              'contrabass': ['contrabass'],
              'tremolo strings': ['tremolo str', 'strings'],
              'pizzicato strings': ['pizzicato str', 'strings'],
              'orchestral harp': ['harp'],
              'timpani': ['timpani'],
              'string ensemble 1': ['strings', 'ensemble'],
              'string ensemble 2': ['orchestra', 'ensemble'],
              'synth strings 1': ['syn.strings1', 'strings'],
              'synth strings 2': ['syn.strings2', 'strings'],
              'choir aahs': ['choir aahs', 'choir'],
              'voice oohs': ['voice oohs', 'voice'],
              'synth voice': ['synvox', 'voice'],
              'orchestra hit': ['orchestrahit', 'orchestra'],
              'trumpet': ['trumpet'],
              'trombone': ['trombone'],
              'tuba': ['tuba'],
              'muted trumpet': ['mutedtrumpet', 'trumpet'],
              'french horn': ['french horns', 'horn'],
              'brass section': ['brass 1', 'brass'],
              'synth brass 1': ['synth brass1', 'brass'],
              'synth brass 2': ['synth brass2', 'brass'],
              'soprano sax': ['soprano sax', 'sax'],
              'alto sax': ['alto sax', 'sax'],
              'tenor sax': ['tenor sax', 'sax'],
              'baritone sax': ['baritone sax', 'sax'],
              'oboe': ['oboe'],
              'english horn': ['english horn', 'horn'],
              'bassoon': ['bassoon'],
              'clarinet': ['clarinet'],
              'piccolo': ['piccolo'],
              'flute': ['flute'],
              'recorder': ['recorder'],
              'pan flute': ['pan flute', 'flute'],
              'blown bottle': ['bottle blow', 'bottle'],
              'shakuhachi': ['shakuhachi'],
              'whistle': ['whistle'],
              'ocarina': ['ocarina']
            };
            
            // Check if we have a variation mapping for the selected instrument
            const variation = variations[selectedLower];
            if (variation) {
              return variation.some((v: string) => presetLower.includes(v));
            }
            
            return false;
          });
          
          if (foundPreset) {
            console.log(`🎹 Found matching preset: "${foundPreset.presetName}" (Bank ${foundPreset.bank}, Program ${foundPreset.program})`);
            // SpessaSynth automatically loads all presets, so we don't need to explicitly load
          } else {
            console.warn(`⚠️ Could not find preset "${selectedInstrument.name}" in soundfont, using default`);
          }
        } else {
          console.log(`🎹 No specific instrument selected, using default presets`);
        }
      } else {
        console.warn(`⚠️ No presets found in sound font: ${soundfontName}`);
      }

      // IMPORTANT: Set state with the loaded synth and mark as ready
      const newState = {
        synth: newSynth,
        isReady: true,
        isLoading: false,
        selectedSoundFont: soundfontName,
        error: null,
        selectedInstrument: stateRef.current.selectedInstrument,
        isMuted: stateRef.current.isMuted,
        playingNotes: stateRef.current.playingNotes
      };

      setSoundFontState(newState);
      stateRef.current = newState; // Update ref immediately

      console.log(`🎉 Successfully loaded soundfont: ${soundfontName} with SpessaSynth`);
      console.log(`🔍 Final state: synth exists=${!!newSynth}, ready=true`);
      return true;
    } catch (err) {
      console.error('❌ Failed to load soundfont:', err);
      const errorState = {
        synth: undefined,
        isLoading: false,
        isReady: false,
        selectedSoundFont: soundfontName,
        error: err instanceof Error ? err.message : 'Unknown error',
        selectedInstrument: stateRef.current.selectedInstrument,
        isMuted: stateRef.current.isMuted,
        playingNotes: stateRef.current.playingNotes
      };
      setSoundFontState(errorState);
      stateRef.current = errorState;
      return false;
    }
  }, []);

  // Load soundfont for a specific song - uses song's soundFont if available, otherwise defaults
  const loadSongSoundFont = useCallback(async (song: Song, selectedInstrument?: { channel: number; instrument: number; name: string }): Promise<boolean> => {
    try {
      let soundFontToLoad = 'Piano'; // Default fallback

      if (song.soundFont) {
        // Use the song's custom sound font
        soundFontToLoad = song.soundFont;
        console.log(`🎹 Song has custom sound font: ${song.soundFont}`);
      } else {
        console.log(`🎹 No custom sound font for song, using default: ${soundFontToLoad}`);
      }

      // Update selected instrument in state
      if (selectedInstrument) {
        setSoundFontState(prev => ({
          ...prev,
          selectedInstrument
        }));
        stateRef.current = {
          ...stateRef.current,
          selectedInstrument
        };
        console.log(`🎹 Setting selected instrument: Channel ${selectedInstrument.channel + 1}, Program ${selectedInstrument.instrument}, Name: "${selectedInstrument.name}"`);
      }

      return await loadSoundFont(soundFontToLoad);
    } catch (err) {
      console.error('❌ Failed to load song sound font:', err);
      // Fallback to default piano
      console.log(`🔄 Falling back to default Piano sound font`);
      return await loadSoundFont('Piano');
    }
  }, [loadSoundFont]);

  // Program change - set the instrument for a channel
  const programChange = useCallback((channel: number, program: number): boolean => {
    const currentState = stateRef.current;
    
    if (!currentState.synth || !currentState.isReady) {
      console.log('❌ Cannot change program: synth not ready');
      return false;
    }

    try {
      console.log(`🎹 Setting program: channel=${channel}, program=${program}`);
      currentState.synth.programChange(channel, program);
      return true;
    } catch (err) {
      console.error('❌ Failed to change program:', err);
      return false;
    }
  }, []);

  // Play note using SpessaSynth - PROPER noteOn/noteOff pattern
  const playNote = useCallback((pitch: number, velocity: number = 80, duration: number = 0.5, channel: number = 0): number | false => {
    // ALWAYS use the current state from ref, not the stale closure state
    const currentState = stateRef.current;
    
    console.log(`🎹 SoundFont callback called:`, {
      pitch,
      velocity,
      duration,
      channel,
      synthExists: !!currentState.synth,
      isReady: currentState.isReady,
      isLoading: currentState.isLoading,
      selectedInstrument: currentState.selectedInstrument,
      isMuted: currentState.isMuted
    });

    // Check if muted first
    if (currentState.isMuted) {
      console.log('🔇 SoundFont callback skipped: Muted');
      return false;
    }

    if (!currentState.synth) {
      console.log('❌ SoundFont callback failed: No synth');
      return false;
    }

    if (!currentState.isReady) {
      console.log(`❌ SoundFont callback failed: Not ready (loading=${currentState.isLoading})`);
      return false;
    }

    try {
      // First ensure the correct program is set
      if (currentState.selectedInstrument) {
        programChange(channel, currentState.selectedInstrument.instrument);
      }

      // Use SpessaSynth's noteOn method (following the example pattern)
      const scaledVelocity = Math.min(127, velocity); // Ensure velocity is in valid range
      
      console.log(`🎵 Playing SpessaSynth note: channel=${channel}, pitch=${pitch}, velocity=${scaledVelocity}`);

      // NOTE ON - Start the note
      currentState.synth.noteOn(channel, pitch, scaledVelocity);
      
      // Add to playing notes
      setSoundFontState(prev => ({
        ...prev,
        playingNotes: new Set([...prev.playingNotes, pitch])
      }));
      
      console.log(`✅ SpessaSynth note played successfully: ${pitch} on channel ${channel}`);
      return pitch; // Return pitch as stopId
    } catch (err) {
      console.error('❌ Failed to play note with SpessaSynth:', err);
      return false;
    }
  }, []); // Empty deps - callback never changes, always uses current state

  // Stop a specific note (for key release) - PROPER noteOff
  const stopNote = useCallback((pitch: number): boolean => {
    const currentState = stateRef.current;
    
    if (!currentState.synth || !currentState.isReady) {
      console.log('❌ Cannot stop note: synth not ready');
      return false;
    }

    try {
      // Use SpessaSynth's noteOff method
      // Use the selected instrument's channel if available, otherwise default to 0
      const channel = currentState.selectedInstrument?.channel ?? 0;
      
      console.log(`🛑 Stopping SpessaSynth note: channel=${channel}, pitch=${pitch}`);
      currentState.synth.noteOff(channel, pitch);
      
      // Remove from playing notes
      setSoundFontState(prev => ({
        ...prev,
        playingNotes: new Set([...prev.playingNotes].filter(note => note !== pitch))
      }));
      
      console.log(`✅ Stopped note: ${pitch} on channel ${channel}`);
      return true;
    } catch (err) {
      console.error('❌ Failed to stop note:', err);
      return false;
    }
  }, []);

  // Stop all notes
  const stopAllNotes = useCallback((): boolean => {
    const currentState = stateRef.current;
    
    if (!currentState.synth) {
      console.log('❌ Cannot stop notes: no synth');
      return false;
    }

    try {
      // Stop all notes on all channels (0-15)
      for (let channel = 0; channel < 16; channel++) {
        // Stop all notes on this channel (pitch 0-127)
        for (let pitch = 0; pitch < 128; pitch++) {
          currentState.synth.noteOff(channel, pitch);
        }
      }
      
      // Clear playing notes
      setSoundFontState(prev => ({
        ...prev,
        playingNotes: new Set()
      }));
      
      console.log('🛑 All notes stopped on all channels');
      return true;
    } catch (err) {
      console.error('❌ Failed to stop all notes:', err);
      return false;
    }
  }, []);

  // Mute the instrument
  const mute = useCallback(() => {
    console.log('🔇 Muting SpessaSynth instrument');
    setSoundFontState(prev => ({
      ...prev,
      isMuted: true
    }));
    stateRef.current = {
      ...stateRef.current,
      isMuted: true
    };
  }, []);

  // Unmute the instrument
  const unmute = useCallback(() => {
    console.log('🔊 Unmuting SpessaSynth instrument');
    setSoundFontState(prev => ({
      ...prev,
      isMuted: false
    }));
    stateRef.current = {
      ...stateRef.current,
      isMuted: false
    };
  }, []);

  // Toggle mute state
  const toggleMute = useCallback(() => {
    const currentState = stateRef.current;
    if (currentState.isMuted) {
      unmute();
    } else {
      mute();
    }
  }, [mute, unmute]);

  return {
    soundFontState,
    loadSoundFont,
    loadSongSoundFont,
    playNote,
    stopNote,
    stopAllNotes,
    mute,
    unmute,
    toggleMute,
    programChange
  };
};