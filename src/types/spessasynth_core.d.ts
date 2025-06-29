declare module 'spessasynth_core' {
  export function loadSoundFont(buffer: ArrayBuffer): any;

  export interface PresetInfo {
    presetName: string;
    program: number;
    bank: number;
  }

  export class MIDI {
    constructor(buffer: ArrayBuffer);
  }

  export class SpessaSynthProcessor {
    constructor(sampleRate: number);
    currentSynthTime: number;
    soundfontManager: {
      reloadManager(soundFont: any): void;
      getPresetList(): PresetInfo[];
      presetList: PresetInfo[];
    };
    midiAudioChannels: Array<{
      voices: Array<{
        midiNote: number;
      }>;
      muteChannel(isMuted: boolean): void;
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