import { useState, useCallback, useRef } from 'react';
import { Soundfont2Sampler, Reverb } from 'smplr';
import { SoundFont2 } from 'soundfont2';
import { getAudioContext } from '../../utils/audioContext';
import { Song } from '../../types/music';

// Available soundfonts - using the working URLs from the POC
const SOUNDFONTS = {
  'Piano': 'https://smpldsnds.github.io/soundfonts/soundfonts/yamaha-grand-lite.sf2',
  'Electric Piano': 'https://smpldsnds.github.io/soundfonts/soundfonts/galaxy-electric-pianos.sf2',
  'Organ': 'https://smpldsnds.github.io/soundfonts/soundfonts/giga-hq-fm-gm.sf2',
  'GZDoom': '/soundfonts/gzdoom.sf2',  // Local GZDoom sound font
};

// Global reverb instance to prevent recreation (exactly like the POC)
let reverb: Reverb | undefined;

export interface SoundFontState {
  sampler: Soundfont2Sampler | undefined;
  isReady: boolean;
  isLoading: boolean;
  selectedSoundFont: string;
  error: string | null;
  selectedInstrument?: { channel: number; instrument: number; name: string };
  isMuted: boolean;
}

export const useSoundFontManager = () => {
  const [soundFontState, setSoundFontState] = useState<SoundFontState>({
    sampler: undefined,
    isReady: false,
    isLoading: false,
    selectedSoundFont: 'Piano',
    error: null,
    selectedInstrument: undefined,
    isMuted: false
  });

  // Use ref to always have access to current state in callbacks
  const stateRef = useRef(soundFontState);
  stateRef.current = soundFontState;

  // Load soundfont using the exact working pattern from POC
  const loadSoundFont = useCallback(async (soundfontName: string): Promise<boolean> => {
    try {
      console.log(`🎹 Loading soundfont: ${soundfontName}`);
      
      setSoundFontState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        isReady: false,
        sampler: undefined // Clear sampler during loading
      }));

      // Disconnect existing sampler
      if (stateRef.current.sampler) {
        stateRef.current.sampler.disconnect();
      }

      // Get singleton audio context
      const context = getAudioContext();
      console.log(`🎵 Audio context state: ${context.state}`);

      // Resume audio context if suspended
      if (context.state === 'suspended') {
        await context.resume();
        console.log(`🎵 Audio context resumed`);
      }

      // Create global reverb if not exists (exactly like POC)
      reverb ??= new Reverb(context);

      // Get soundfont URL - handle both named soundfonts and custom URLs
      let url: string;
      if (SOUNDFONTS[soundfontName as keyof typeof SOUNDFONTS]) {
        url = SOUNDFONTS[soundfontName as keyof typeof SOUNDFONTS];
      } else {
        // Assume it's a custom URL/path
        url = soundfontName;
      }
      console.log(`📂 Soundfont URL: ${url}`);

      // Create new sampler with the exact configuration from POC
      const newSampler = new Soundfont2Sampler(context, {
        url: url,
        createSoundfont: (data) => new SoundFont2(data),
      });

      console.log('🎼 Sampler created, waiting for load...');

      // Add effects immediately (exactly like POC)
      newSampler.output.addEffect('reverb', reverb, 0.2);
      newSampler.output.setVolume(80);

      // Wait for the sampler to load (exactly like POC)
      const loadedSampler = await newSampler.load;
      console.log('✅ Sampler loaded successfully');

      // Get available instruments
      const instruments = loadedSampler.instrumentNames || [];
      console.log(`🎵 Available instruments:`, instruments);
      console.log(`🎵 Total instruments available: ${instruments.length}`);

      // Load the specific instrument based on selected instrument name
      if (instruments.length > 0) {
        const selectedInstrument = stateRef.current.selectedInstrument;
        
        if (selectedInstrument && selectedInstrument.name) {
          // Try to find the instrument by name in the soundfont
          console.log(`🎹 Looking for instrument: "${selectedInstrument.name}"`);
          console.log(`🎹 Available instruments:`, instruments);
          
          // Try to find the instrument by name in the soundfont
          const foundInstrument = instruments.find(inst => {
            const instLower = inst.toLowerCase();
            const selectedLower = selectedInstrument.name.toLowerCase();
            
            // Exact match
            if (instLower === selectedLower) return true;
            
            // Contains match (either direction)
            if (instLower.includes(selectedLower) || selectedLower.includes(instLower)) return true;
            
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
              return variation.some((v: string) => instLower.includes(v));
            }
            
            return false;
          });
          
          if (foundInstrument) {
            console.log(`🎹 Loading selected instrument: "${foundInstrument}"`);
            try {
              await loadedSampler.loadInstrument(foundInstrument);
              console.log(`✅ Selected instrument loaded: "${foundInstrument}"`);
            } catch (err) {
              console.error(`❌ Failed to load selected instrument "${foundInstrument}":`, err);
              throw new Error(`Failed to load instrument "${foundInstrument}"`);
            }
          } else {
            console.error(`❌ Could not find instrument "${selectedInstrument.name}" in soundfont`);
            throw new Error(`Instrument "${selectedInstrument.name}" not found in soundfont`);
          }
        } else {
          // No specific instrument selected, load the first instrument
          const firstInstrument = instruments[0];
          console.log(`🎹 Loading default instrument: "${firstInstrument}"`);
          await loadedSampler.loadInstrument(firstInstrument);
          console.log(`✅ Default instrument loaded: "${firstInstrument}"`);
        }
        
        // Don't load additional instruments - only load the selected one
      } else {
        console.warn(`⚠️ No instruments found in sound font: ${soundfontName}`);
      }

      // IMPORTANT: Set state with the loaded sampler and mark as ready
      const newState = {
        sampler: newSampler,
        isReady: true,
        isLoading: false,
        selectedSoundFont: soundfontName,
        error: null,
        selectedInstrument: stateRef.current.selectedInstrument,
        isMuted: stateRef.current.isMuted
      };

      setSoundFontState(newState);
      stateRef.current = newState; // Update ref immediately

      console.log(`🎉 Successfully loaded soundfont: ${soundfontName}`);
      console.log(`🔍 Final state: sampler exists=${!!newSampler}, ready=true`);
      return true;
    } catch (err) {
      console.error('❌ Failed to load soundfont:', err);
      const errorState = {
        sampler: undefined,
        isLoading: false,
        isReady: false,
        selectedSoundFont: soundfontName,
        error: err instanceof Error ? err.message : 'Unknown error',
        selectedInstrument: stateRef.current.selectedInstrument,
        isMuted: stateRef.current.isMuted
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

  // Play note using SoundFont - ENHANCED for multi-channel support
  const playNote = useCallback((pitch: number, velocity: number = 80, duration: number = 0.5, channel: number = 0): boolean => {
    // ALWAYS use the current state from ref, not the stale closure state
    const currentState = stateRef.current;
    
    console.log(`🎹 SoundFont callback called:`, {
      pitch,
      velocity,
      duration,
      channel,
      samplerExists: !!currentState.sampler,
      loadingPhase: currentState.isLoading ? 'loading' : currentState.isReady ? 'ready' : 'not-ready',
      samplerContextState: currentState.sampler?.context?.state,
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

    if (!currentState.sampler) {
      console.log('❌ SoundFont callback failed: No sampler');
      return false;
    }

    if (!currentState.isReady) {
      console.log(`❌ SoundFont callback failed: Not ready (loading=${currentState.isLoading})`);
      return false;
    }

    try {
      // For background instruments (different channels), we might want to use different instruments
      // For now, we'll use the same instrument but could be enhanced to load multiple instruments
      
      // Find the instrument by name in the soundfont
      if (!currentState.selectedInstrument || !currentState.sampler.instrumentNames) {
        console.error('❌ No selected instrument or no instrument names available');
        return false;
      }

      const instruments = currentState.sampler.instrumentNames;
      console.log(`🎹 Available instruments:`, instruments);
      console.log(`🎹 Looking for instrument: "${currentState.selectedInstrument.name}"`);
      
      // Try to find the instrument by name (case-insensitive)
      const foundInstrument = instruments.find(inst => {
        const instLower = inst.toLowerCase();
        const selectedLower = currentState.selectedInstrument!.name.toLowerCase();
        
        // Exact match
        if (instLower === selectedLower) return true;
        
        // Contains match (either direction)
        if (instLower.includes(selectedLower) || selectedLower.includes(instLower)) return true;
        
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
          return variation.some((v: string) => instLower.includes(v));
        }
        
        return false;
      });
      
      if (!foundInstrument) {
        console.error(`❌ Could not find instrument "${currentState.selectedInstrument.name}" in soundfont`);
        return false;
      }

      console.log(`🎹 Found matching instrument: "${foundInstrument}"`);

      const noteToPlay = {
        note: pitch,
        velocity: velocity,
        detune: 0,
        time: currentState.sampler.context.currentTime,
        duration: duration,
        instrument: foundInstrument
      };
      
      console.log(`🎵 Playing SoundFont note:`, noteToPlay);
      currentState.sampler.start(noteToPlay);
      console.log(`✅ SoundFont note played successfully: ${pitch} with instrument "${foundInstrument}" on channel ${channel}`);
      return true;
    } catch (err) {
      console.error('❌ Failed to play note with SoundFont:', err);
      return false;
    }
  }, []); // Empty deps - callback never changes, always uses current state

  // Mute the instrument
  const mute = useCallback(() => {
    console.log('🔇 Muting SoundFont instrument');
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
    console.log('🔊 Unmuting SoundFont instrument');
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
    mute,
    unmute,
    toggleMute
  };
};