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
    presetList: PresetInfo[];
    midiAudioChannels: MidiChannel[];
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