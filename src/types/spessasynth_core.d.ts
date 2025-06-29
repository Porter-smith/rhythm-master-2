declare module 'spessasynth_core' {
  export function loadSoundFont(buffer: ArrayBuffer): any;

  export class MIDI {
    constructor(buffer: ArrayBuffer);
  }

  export class SpessaSynthProcessor {
    constructor(sampleRate: number);
    currentSynthTime: number;
    soundfontManager: {
      reloadManager(soundFont: any): void;
    };
    midiAudioChannels: Array<{
      voices: Array<{
        midiNote: number;
      }>;
    }>;
    renderAudio(output: Float32Array[], reverb: Float32Array[], chorus: Float32Array[]): void;
  }

  export class SpessaSynthSequencer {
    constructor(synthesizer: SpessaSynthProcessor);
    loadNewSongList(songs: MIDI[]): void;
    play(): void;
    pause(): void;
    stop(): void;
    processTick(): void;
  }
} 