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
      console.log('✅ Background audio manager ready');
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
      const midi = new MIDI(midiFile);
      this.sequencer.loadNewSongList([midi]);
      console.log('✅ MIDI loaded for background audio');
    } catch (error) {
      console.error('❌ Failed to load MIDI for background audio:', error);
      throw error;
    }
  }

  play(): void {
    if (!this.sequencer || !this.isReady) return;
    
    console.log('▶️ Starting background audio playback');
    this.sequencer.play();
    this.isPlaying = true;
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
    // This would need to be implemented by parsing the MIDI file
    // For now, return empty map
    return new Map();
  }

  getVoiceList(): string[] {
    if (!this.synth) return [];

    const voiceList: string[] = [];
    for (let i = 0; i < 16; i++) {
      let text = `Channel ${i + 1}:\nUnknown\n`;
      
      if (this.synth.midiAudioChannels[i]) {
        this.synth.midiAudioChannels[i].voices.forEach(v => {
          text += `note: ${v.midiNote}\n`;
        });
      }
      
      voiceList[i] = text;
    }
    
    return voiceList;
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
        
        console.log('🎼 Background audio manager initialized and ready');
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

  // Handle game play/pause
  useEffect(() => {
    if (!managerRef.current) return;

    if (isGamePlaying) {
      managerRef.current.play();
    } else {
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