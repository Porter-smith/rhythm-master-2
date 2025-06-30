import React, { useEffect, useRef } from 'react';
import { loadSoundFont, MIDI, SpessaSynthProcessor, SpessaSynthSequencer } from 'spessasynth_core';

interface BackgroundAudioManagerProps {
  midiFile?: ArrayBuffer | null;
  soundFontUrl?: string;
  hideSelectedChannel?: number;
  isGamePlaying: boolean;
  onReady?: (manager: BackgroundAudioManager) => void;
}

export class BackgroundAudioManager {
  private context: AudioContext | null = null;
  private synth: SpessaSynthProcessor | null = null;
  private sequencer: SpessaSynthSequencer | null = null;
  private audioLoopInterval: number | null = null;
  private isReady = false;
  private isPlaying = false;
  private mutedChannels = new Set<number>();
  private hasStartedOnce = false; // Track if we've started playback at least once
  private channelInstruments = new Map<number, number>(); // Track channel -> instrument mapping

  async initialize(soundFontUrl: string): Promise<void> {
    try {
      console.log('🎼 Initializing background audio manager...');
      
      this.context = new AudioContext({ sampleRate: 44100 });
      await this.context.resume();

      // Fetch and load SoundFont
      const response = await fetch(soundFontUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch SoundFont: ${response.status}`);
      }
      const fontBuffer = await response.arrayBuffer();

      this.synth = new SpessaSynthProcessor(44100);
      this.synth.soundfontManager.reloadManager(loadSoundFont(fontBuffer));

      this.sequencer = new SpessaSynthSequencer(this.synth);

      // Start audio processing loop
      this.startAudioLoop();
      
      this.isReady = true;
      console.log('✅ Background audio manager ready (but not playing yet)');
    } catch (error) {
      console.error('❌ Failed to initialize background audio manager:', error);
      throw error;
    }
  }

  async loadMidi(midiFile: ArrayBuffer): Promise<void> {
    if (!this.sequencer) {
      throw new Error('Sequencer not initialized');
    }

    try {
      console.log('🎼 Loading MIDI for background audio...');
      
      // Parse MIDI to extract instrument information BEFORE loading into sequencer
      await this.parseMidiInstruments(midiFile);
      
      const midi = new MIDI(midiFile);
      this.sequencer.loadNewSongList([midi]);
      
      // IMPORTANT: Immediately pause and reset to beginning
      this.sequencer.stop();
      this.sequencer.pause();
      this.isPlaying = false;
      this.hasStartedOnce = false;
      
      console.log('✅ MIDI loaded for background audio (paused at beginning, ready to start)');
      console.log('🎹 Detected instruments:', Array.from(this.channelInstruments.entries()).map(([ch, prog]) => 
        `Channel ${ch + 1}: Program ${prog}`
      ));
    } catch (error) {
      console.error('❌ Failed to load MIDI for background audio:', error);
      throw error;
    }
  }

  private async parseMidiInstruments(midiFile: ArrayBuffer): Promise<void> {
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
      read16(); // Skip ticks per quarter

      this.channelInstruments.clear();

      // Process each track to find program changes
      for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
        // Validate track header
        if (data[pos++] !== 77 || data[pos++] !== 84 || data[pos++] !== 114 || data[pos++] !== 107) {
          continue;
        }

        const trackLength = read32();
        const trackEnd = pos + trackLength;
        let runningStatus = 0;

        // Process track events
        while (pos < trackEnd) {
          const deltaTime = readVarLength();
          
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
            this.channelInstruments.set(channel, instrument);
            console.log(`🎹 Found instrument: Channel ${channel + 1} = Program ${instrument}`);
          } else if (command === 0xFF) {
            // Meta event
            const metaType = read8();
            const metaLength = readVarLength();
            pos += metaLength;
          } else if (messageType === 0x90 || messageType === 0x80) {
            // Note On/Off (2 bytes)
            read8();
            read8();
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

      console.log(`🎼 Parsed ${this.channelInstruments.size} instruments from MIDI`);
    } catch (error) {
      console.error('❌ Error parsing MIDI instruments:', error);
    }
  }

  prepareToStart(): void {
    if (!this.sequencer || !this.isReady) {
      console.log('⚠️ Background audio not ready to prepare');
      return;
    }
    
    console.log('🎼 Preparing background audio (resetting to beginning)');
    this.sequencer.stop(); // Reset to beginning
    this.sequencer.pause(); // Make sure we're paused
    this.isPlaying = false;
    this.hasStartedOnce = false;
  }

  play(): void {
    if (!this.sequencer || !this.isReady) {
      console.log('⚠️ Background audio not ready to play');
      return;
    }
    
    console.log('▶️ Starting background audio playback');
    this.sequencer.play();
    this.isPlaying = true;
    this.hasStartedOnce = true;
  }

  pause(): void {
    if (!this.sequencer) return;
    
    console.log('⏸️ Pausing background audio playback');
    this.sequencer.pause();
    this.isPlaying = false;
  }

  stop(): void {
    if (!this.sequencer) return;
    
    console.log('⏹️ Stopping background audio playback');
    this.sequencer.stop();
    this.isPlaying = false;
    this.hasStartedOnce = false; // Reset for next play
  }

  muteChannel(channel: number, muted: boolean): void {
    if (!this.synth) return;

    try {
      if (muted) {
        this.mutedChannels.add(channel);
      } else {
        this.mutedChannels.delete(channel);
      }

      if (this.synth.midiAudioChannels[channel]) {
        this.synth.midiAudioChannels[channel].muteChannel(muted);
        console.log(`🔇 Channel ${channel + 1} ${muted ? 'muted' : 'unmuted'} in background audio`);
      }
    } catch (error) {
      console.warn('Background audio mute error:', error);
    }
  }

  getMutedChannels(): Set<number> {
    return new Set(this.mutedChannels);
  }

  getChannelInstruments(): Map<number, number> {
    return new Map(this.channelInstruments);
  }

  getVoiceList(): string[] {
    if (!this.synth) return [];

    const voiceList: string[] = [];
    for (let i = 0; i < 16; i++) {
      const instrument = this.channelInstruments.get(i);
      let text = `Channel ${i + 1}:\n`;
      
      if (instrument !== undefined) {
        // Get instrument name from GM standard
        const instrumentName = this.getInstrumentName(instrument, i);
        text += `${instrumentName}\n`;
      } else {
        text += `Unknown\n`;
      }
      
      if (this.synth.midiAudioChannels[i]) {
        this.synth.midiAudioChannels[i].voices.forEach(v => {
          text += `note: ${v.midiNote}\n`;
        });
      }
      
      voiceList[i] = text;
    }
    
    return voiceList;
  }

  private getInstrumentName(program: number, channel: number): string {
    // GM instrument names
    const gmInstruments = [
      "Acoustic Grand Piano", "Bright Acoustic Piano", "Electric Grand Piano", "Honky-tonk Piano",
      "Electric Piano 1", "Electric Piano 2", "Harpsichord", "Clavi",
      "Celesta", "Glockenspiel", "Music Box", "Vibraphone",
      "Marimba", "Xylophone", "Tubular Bells", "Dulcimer",
      "Drawbar Organ", "Percussive Organ", "Rock Organ", "Church Organ",
      "Reed Organ", "Accordion", "Harmonica", "Tango Accordion",
      "Acoustic Guitar (nylon)", "Acoustic Guitar (steel)", "Electric Guitar (jazz)", "Electric Guitar (clean)",
      "Electric Guitar (muted)", "Overdriven Guitar", "Distortion Guitar", "Guitar Harmonics",
      "Acoustic Bass", "Electric Bass (finger)", "Electric Bass (pick)", "Fretless Bass",
      "Slap Bass 1", "Slap Bass 2", "Synth Bass 1", "Synth Bass 2",
      "Violin", "Viola", "Cello", "Contrabass",
      "Tremolo Strings", "Pizzicato Strings", "Orchestral Harp", "Timpani",
      "String Ensemble 1", "String Ensemble 2", "Synth Strings 1", "Synth Strings 2",
      "Choir Aahs", "Voice Oohs", "Synth Voice", "Orchestra Hit",
      "Trumpet", "Trombone", "Tuba", "Muted Trumpet",
      "French Horn", "Brass Section", "Synth Brass 1", "Synth Brass 2",
      "Soprano Sax", "Alto Sax", "Tenor Sax", "Baritone Sax",
      "Oboe", "English Horn", "Bassoon", "Clarinet",
      "Piccolo", "Flute", "Recorder", "Pan Flute",
      "Blown Bottle", "Shakuhachi", "Whistle", "Ocarina",
      "Lead 1 (square)", "Lead 2 (sawtooth)", "Lead 3 (calliope)", "Lead 4 (chiff)",
      "Lead 5 (charang)", "Lead 6 (voice)", "Lead 7 (fifths)", "Lead 8 (bass + lead)",
      "Pad 1 (new age)", "Pad 2 (warm)", "Pad 3 (polysynth)", "Pad 4 (choir)",
      "Pad 5 (bowed)", "Pad 6 (metallic)", "Pad 7 (halo)", "Pad 8 (sweep)",
      "FX 1 (rain)", "FX 2 (soundtrack)", "FX 3 (crystal)", "FX 4 (atmosphere)",
      "FX 5 (brightness)", "FX 6 (goblins)", "FX 7 (echoes)", "FX 8 (sci-fi)",
      "Sitar", "Banjo", "Shamisen", "Koto",
      "Kalimba", "Bagpipe", "Fiddle", "Shanai",
      "Tinkle Bell", "Agogo", "Steel Drums", "Woodblock",
      "Taiko Drum", "Melodic Tom", "Synth Drum", "Reverse Cymbal",
      "Guitar Fret Noise", "Breath Noise", "Seashore", "Bird Tweet",
      "Telephone Ring", "Helicopter", "Applause", "Gunshot"
    ];

    // Special handling for Channel 10 (drums)
    if (channel === 9) {
      return "Drum Kit";
    }

    return gmInstruments[program] || `Unknown Instrument (${program})`;
  }

  isCurrentlyPlaying(): boolean {
    return this.isPlaying;
  }

  private startAudioLoop(): void {
    if (!this.context || !this.synth || !this.sequencer) return;

    this.audioLoopInterval = window.setInterval(() => {
      const synTime = this.synth!.currentSynthTime;

      if (synTime > this.context!.currentTime + 0.1) {
        return;
      }

      const BUFFER_SIZE = 512;
      const output = [new Float32Array(BUFFER_SIZE), new Float32Array(BUFFER_SIZE)];
      const reverb = [new Float32Array(BUFFER_SIZE), new Float32Array(BUFFER_SIZE)];
      const chorus = [new Float32Array(BUFFER_SIZE), new Float32Array(BUFFER_SIZE)];

      this.sequencer!.processTick();
      this.synth!.renderAudio(output, reverb, chorus);

      const outBuffer = new AudioBuffer({
        numberOfChannels: 2,
        length: 512,
        sampleRate: 44100
      });

      outBuffer.copyToChannel(output[0], 0);
      outBuffer.copyToChannel(output[1], 1);

      const source = new AudioBufferSourceNode(this.context!, {
        buffer: outBuffer
      });
      source.connect(this.context!.destination);
      source.start(synTime);
    }, 10);
  }

  destroy(): void {
    console.log('🧹 Destroying background audio manager...');
    
    if (this.audioLoopInterval) {
      clearInterval(this.audioLoopInterval);
      this.audioLoopInterval = null;
    }

    if (this.context) {
      this.context.close();
      this.context = null;
    }

    this.synth = null;
    this.sequencer = null;
    this.isReady = false;
    this.isPlaying = false;
    this.hasStartedOnce = false;
  }
}

// React component wrapper
export const BackgroundAudioManagerComponent: React.FC<BackgroundAudioManagerProps> = ({
  midiFile,
  soundFontUrl,
  hideSelectedChannel,
  isGamePlaying,
  onReady
}) => {
  const managerRef = useRef<BackgroundAudioManager | null>(null);

  useEffect(() => {
    if (!soundFontUrl) return;

    const initializeManager = async () => {
      try {
        const manager = new BackgroundAudioManager();
        await manager.initialize(soundFontUrl);
        
        if (midiFile) {
          await manager.loadMidi(midiFile);
          
          // Auto-mute the selected channel
          if (hideSelectedChannel !== undefined) {
            manager.muteChannel(hideSelectedChannel, true);
          }
        }
        
        managerRef.current = manager;
        onReady?.(manager);
        
        console.log('🎼 Background audio manager initialized and ready (waiting for game start)');
      } catch (error) {
        console.error('❌ Failed to initialize background audio manager:', error);
      }
    };

    initializeManager();

    return () => {
      if (managerRef.current) {
        managerRef.current.destroy();
        managerRef.current = null;
      }
    };
  }, [soundFontUrl, midiFile]);

  // Handle game play/pause - THIS IS THE KEY FIX
  useEffect(() => {
    if (!managerRef.current) return;

    console.log(`🎮 Game playing state changed: ${isGamePlaying}`);
    
    if (isGamePlaying) {
      console.log('🎼 Game started - starting background audio');
      managerRef.current.play();
    } else {
      console.log('🎼 Game paused/stopped - pausing background audio');
      managerRef.current.pause();
    }
  }, [isGamePlaying]);

  // Handle channel muting changes
  useEffect(() => {
    if (managerRef.current && hideSelectedChannel !== undefined) {
      managerRef.current.muteChannel(hideSelectedChannel, true);
    }
  }, [hideSelectedChannel]);

  return null; // This component doesn't render anything
};