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