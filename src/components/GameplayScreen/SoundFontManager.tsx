import { useState, useCallback, useRef } from 'react';
import { Soundfont2Sampler, Reverb } from 'smplr';
import { SoundFont2 } from 'soundfont2';
import { getAudioContext } from '../../utils/audioContext';

// Available soundfonts - using the working URLs from the POC
const SOUNDFONTS = {
  'Piano': 'https://smpldsnds.github.io/soundfonts/soundfonts/yamaha-grand-lite.sf2',
  'Electric Piano': 'https://smpldsnds.github.io/soundfonts/soundfonts/galaxy-electric-pianos.sf2',
  'Organ': 'https://smpldsnds.github.io/soundfonts/soundfonts/giga-hq-fm-gm.sf2',
};

// Global reverb instance to prevent recreation (exactly like the POC)
let reverb: Reverb | undefined;

export interface SoundFontState {
  sampler: Soundfont2Sampler | undefined;
  isReady: boolean;
  isLoading: boolean;
  selectedSoundFont: string;
  error: string | null;
}

export const useSoundFontManager = () => {
  const [soundFontState, setSoundFontState] = useState<SoundFontState>({
    sampler: undefined,
    isReady: false,
    isLoading: false,
    selectedSoundFont: 'Piano',
    error: null
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

      // Get soundfont URL
      const url = SOUNDFONTS[soundfontName as keyof typeof SOUNDFONTS];
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

      // Load the first instrument
      if (instruments.length > 0) {
        const firstInstrument = instruments[0];
        console.log(`🎹 Loading instrument: ${firstInstrument}`);
        await loadedSampler.loadInstrument(firstInstrument);
        console.log(`✅ Instrument loaded: ${firstInstrument}`);
      }

      // IMPORTANT: Set state with the loaded sampler and mark as ready
      const newState = {
        sampler: newSampler,
        isReady: true,
        isLoading: false,
        selectedSoundFont: soundfontName,
        error: null
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
        error: err instanceof Error ? err.message : 'Unknown error'
      };
      setSoundFontState(errorState);
      stateRef.current = errorState;
      return false;
    }
  }, []);

  // Play note using SoundFont - ALWAYS use current state from ref
  const playNote = useCallback((pitch: number, velocity: number = 80, duration: number = 0.5): boolean => {
    // ALWAYS use the current state from ref, not the stale closure state
    const currentState = stateRef.current;
    
    console.log(`🎹 SoundFont callback called:`, {
      pitch,
      velocity,
      duration,
      samplerExists: !!currentState.sampler,
      loadingPhase: currentState.isLoading ? 'loading' : currentState.isReady ? 'ready' : 'not-ready',
      samplerContextState: currentState.sampler?.context?.state,
      isReady: currentState.isReady,
      isLoading: currentState.isLoading
    });

    if (!currentState.sampler) {
      console.log('❌ SoundFont callback failed: No sampler');
      return false;
    }

    if (!currentState.isReady) {
      console.log(`❌ SoundFont callback failed: Not ready (loading=${currentState.isLoading})`);
      return false;
    }

    try {
      const noteToPlay = {
        note: pitch,
        velocity: velocity,
        detune: 0,
        time: currentState.sampler.context.currentTime,
        duration: duration
      };
      
      console.log(`🎵 Playing SoundFont note:`, noteToPlay);
      currentState.sampler.start(noteToPlay);
      console.log(`✅ SoundFont note played successfully: ${pitch}`);
      return true;
    } catch (err) {
      console.error('❌ Failed to play note with SoundFont:', err);
      return false;
    }
  }, []); // Empty deps - callback never changes, always uses current state

  return {
    soundFontState,
    loadSoundFont,
    playNote
  };
};