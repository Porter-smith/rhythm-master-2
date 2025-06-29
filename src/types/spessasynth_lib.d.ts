declare module 'spessasynth_lib' {
  interface PresetInfo {
    presetName: string;
    program: number;
    bank: number;
  }

  export class Synthetizer {
    constructor(destination: AudioNode, soundFontBuffer: ArrayBuffer);
    muteChannel(channel: number, isMuted: boolean): void;
    getPresetList(): PresetInfo[];
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