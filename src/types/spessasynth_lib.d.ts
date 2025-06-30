declare module 'spessasynth_lib' {
  interface PresetInfo {
    presetName: string;
    program: number;
    bank: number;
  }

  interface MidiChannel {
    voices: Array<{
      midiNote: number;
    }>;
  }

  export class Synthetizer {
    constructor(destination: AudioNode, soundFontBuffer: ArrayBuffer);
    muteChannel(channel: number, isMuted: boolean): void;
    noteOn(channel: number, note: number, velocity: number): void;
    noteOff(channel: number, note: number): void;
    programChange(channel: number, program: number): void;
    presetList: PresetInfo[];
    midiAudioChannels: MidiChannel[];
    isReady: Promise<void>;
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