/**
 * Background Instrument Manager
 * Handles playback of non-selected instruments during gameplay
 * Designed to be expandable for multiplayer scenarios
 */

import { Song, MidiNote } from '../types/music';

export interface BackgroundInstrument {
  channel: number;
  instrument: number;
  name: string;
  notes: MidiNote[];
  isEnabled: boolean;
  volume: number;
  isMuted: boolean;
}

export interface BackgroundPlaybackState {
  isPlaying: boolean;
  currentTime: number;
  activeNotes: Map<number, Set<number>>; // channel -> set of active pitches
  scheduledNotes: Map<string, number>; // noteId -> timeoutId
}

export class BackgroundInstrumentManager {
  private song: Song | null = null;
  private difficulty: 'easy' | 'medium' | 'hard' = 'easy';
  private selectedChannel: number | null = null;
  private backgroundInstruments: Map<number, BackgroundInstrument> = new Map();
  private playbackState: BackgroundPlaybackState;
  private soundFontCallback?: (pitch: number, velocity: number, duration: number, channel: number) => boolean;
  private startTime: number = 0;
  private gameTime: number = 0;
  private isInitialized: boolean = false;

  constructor() {
    this.playbackState = {
      isPlaying: false,
      currentTime: 0,
      activeNotes: new Map(),
      scheduledNotes: new Map()
    };
  }

  /**
   * Initialize with song data and selected instrument
   */
  public initialize(
    song: Song, 
    difficulty: 'easy' | 'medium' | 'hard', 
    selectedChannel: number | null
  ): void {
    console.log('🎼 Initializing BackgroundInstrumentManager...');
    console.log(`📀 Song: ${song.title}, Difficulty: ${difficulty}, Selected Channel: ${selectedChannel}`);

    this.song = song;
    this.difficulty = difficulty;
    this.selectedChannel = selectedChannel;
    this.backgroundInstruments.clear();

    if (song.format === 'midi') {
      this.extractBackgroundInstruments();
    }

    this.isInitialized = true;
    console.log(`✅ BackgroundInstrumentManager initialized with ${this.backgroundInstruments.size} background instruments`);
  }

  /**
   * Extract background instruments from MIDI song
   */
  private extractBackgroundInstruments(): void {
    if (!this.song || this.song.format !== 'midi') return;

    const notes = this.song.notes[this.difficulty] || [];
    console.log(`🎹 Extracting background instruments from ${notes.length} total notes`);

    // Group notes by channel
    const notesByChannel = new Map<number, MidiNote[]>();
    const instrumentsByChannel = new Map<number, { instrument: number; name: string }>();

    notes.forEach(note => {
      const midiNote = note as MidiNote;
      if (midiNote.channel !== undefined) {
        if (!notesByChannel.has(midiNote.channel)) {
          notesByChannel.set(midiNote.channel, []);
        }
        notesByChannel.get(midiNote.channel)!.push(midiNote);

        // Track instrument info (this would ideally come from program change events)
        if (!instrumentsByChannel.has(midiNote.channel)) {
          instrumentsByChannel.set(midiNote.channel, {
            instrument: 0, // Default, should be extracted from MIDI
            name: `Channel ${midiNote.channel + 1} Instrument`
          });
        }
      }
    });

    // Create background instruments (exclude selected channel)
    notesByChannel.forEach((channelNotes, channel) => {
      if (channel !== this.selectedChannel) {
        const instrumentInfo = instrumentsByChannel.get(channel)!;
        
        const backgroundInstrument: BackgroundInstrument = {
          channel,
          instrument: instrumentInfo.instrument,
          name: instrumentInfo.name,
          notes: channelNotes.sort((a, b) => a.time - b.time),
          isEnabled: true,
          volume: 0.7, // Slightly quieter than main instrument
          isMuted: false
        };

        this.backgroundInstruments.set(channel, backgroundInstrument);
        console.log(`🎵 Added background instrument: Channel ${channel + 1} with ${channelNotes.length} notes`);
      }
    });

    console.log(`🎼 Total background instruments: ${this.backgroundInstruments.size}`);
  }

  /**
   * Set SoundFont callback for playing notes
   */
  public setSoundFontCallback(callback: (pitch: number, velocity: number, duration: number, channel: number) => boolean): void {
    this.soundFontCallback = callback;
    console.log('🎹 SoundFont callback set for BackgroundInstrumentManager');
  }

  /**
   * Start background playback
   */
  public start(gameStartTime: number): void {
    if (!this.isInitialized || this.backgroundInstruments.size === 0) {
      console.log('⚠️ BackgroundInstrumentManager not ready for playback');
      return;
    }

    console.log('🎼 Starting background instrument playback...');
    this.startTime = gameStartTime;
    this.playbackState.isPlaying = true;
    this.playbackState.currentTime = 0;

    // Schedule all background notes
    this.scheduleBackgroundNotes();
  }

  /**
   * Schedule all background notes for playback
   */
  private scheduleBackgroundNotes(): void {
    console.log('📅 Scheduling background notes...');
    let totalScheduled = 0;

    this.backgroundInstruments.forEach((instrument, channel) => {
      if (!instrument.isEnabled || instrument.isMuted) {
        console.log(`⏭️ Skipping disabled/muted instrument on channel ${channel + 1}`);
        return;
      }

      console.log(`🎵 Scheduling ${instrument.notes.length} notes for channel ${channel + 1}`);

      instrument.notes.forEach((note, index) => {
        const noteId = `${channel}-${index}`;
        const playTime = note.time * 1000; // Convert to milliseconds
        
        const timeoutId = window.setTimeout(() => {
          this.playBackgroundNote(note, channel, instrument.volume);
          this.playbackState.scheduledNotes.delete(noteId);
        }, playTime);

        this.playbackState.scheduledNotes.set(noteId, timeoutId);
        totalScheduled++;
      });
    });

    console.log(`✅ Scheduled ${totalScheduled} background notes`);
  }

  /**
   * Play a single background note
   */
  private playBackgroundNote(note: MidiNote, channel: number, volume: number): void {
    if (!this.playbackState.isPlaying) return;

    // Track active notes
    if (!this.playbackState.activeNotes.has(channel)) {
      this.playbackState.activeNotes.set(channel, new Set());
    }
    this.playbackState.activeNotes.get(channel)!.add(note.pitch);

    // Play note with SoundFont
    if (this.soundFontCallback) {
      const adjustedVelocity = Math.floor((note.velocity || 80) * volume);
      const success = this.soundFontCallback(note.pitch, adjustedVelocity, note.duration, channel);
      
      if (success) {
        console.log(`🎵 Background note played: Ch${channel + 1}, Pitch${note.pitch}, Vel${adjustedVelocity}`);
      }
    }

    // Schedule note off
    setTimeout(() => {
      this.playbackState.activeNotes.get(channel)?.delete(note.pitch);
    }, note.duration * 1000);
  }

  /**
   * Update playback state (called from game loop)
   */
  public update(currentGameTime: number): void {
    if (!this.playbackState.isPlaying) return;
    
    this.gameTime = currentGameTime;
    this.playbackState.currentTime = currentGameTime;
  }

  /**
   * Pause background playback
   */
  public pause(): void {
    console.log('⏸️ Pausing background instruments');
    this.playbackState.isPlaying = false;
    this.clearScheduledNotes();
  }

  /**
   * Resume background playback
   */
  public resume(): void {
    console.log('▶️ Resuming background instruments');
    this.playbackState.isPlaying = true;
    // Re-schedule remaining notes based on current time
    this.rescheduleNotesFromCurrentTime();
  }

  /**
   * Stop background playback
   */
  public stop(): void {
    console.log('⏹️ Stopping background instruments');
    this.playbackState.isPlaying = false;
    this.clearScheduledNotes();
    this.playbackState.activeNotes.clear();
    this.playbackState.currentTime = 0;
  }

  /**
   * Clear all scheduled notes
   */
  private clearScheduledNotes(): void {
    this.playbackState.scheduledNotes.forEach(timeoutId => {
      clearTimeout(timeoutId);
    });
    this.playbackState.scheduledNotes.clear();
  }

  /**
   * Reschedule notes from current time (for resume)
   */
  private rescheduleNotesFromCurrentTime(): void {
    console.log(`🔄 Rescheduling notes from time ${this.gameTime.toFixed(2)}s`);
    
    this.backgroundInstruments.forEach((instrument, channel) => {
      if (!instrument.isEnabled || instrument.isMuted) return;

      const remainingNotes = instrument.notes.filter(note => note.time > this.gameTime);
      console.log(`📅 Rescheduling ${remainingNotes.length} remaining notes for channel ${channel + 1}`);

      remainingNotes.forEach((note, index) => {
        const noteId = `${channel}-resume-${index}`;
        const playTime = (note.time - this.gameTime) * 1000;
        
        const timeoutId = window.setTimeout(() => {
          this.playBackgroundNote(note, channel, instrument.volume);
          this.playbackState.scheduledNotes.delete(noteId);
        }, playTime);

        this.playbackState.scheduledNotes.set(noteId, timeoutId);
      });
    });
  }

  /**
   * Toggle instrument mute state
   */
  public toggleInstrumentMute(channel: number): void {
    const instrument = this.backgroundInstruments.get(channel);
    if (instrument) {
      instrument.isMuted = !instrument.isMuted;
      console.log(`🔇 Channel ${channel + 1} ${instrument.isMuted ? 'muted' : 'unmuted'}`);
    }
  }

  /**
   * Set instrument volume
   */
  public setInstrumentVolume(channel: number, volume: number): void {
    const instrument = this.backgroundInstruments.get(channel);
    if (instrument) {
      instrument.volume = Math.max(0, Math.min(1, volume));
      console.log(`🔊 Channel ${channel + 1} volume set to ${instrument.volume.toFixed(2)}`);
    }
  }

  /**
   * Get background instruments for UI
   */
  public getBackgroundInstruments(): BackgroundInstrument[] {
    return Array.from(this.backgroundInstruments.values());
  }

  /**
   * Get playback state for UI
   */
  public getPlaybackState(): BackgroundPlaybackState {
    return { ...this.playbackState };
  }

  /**
   * Enable/disable instrument
   */
  public setInstrumentEnabled(channel: number, enabled: boolean): void {
    const instrument = this.backgroundInstruments.get(channel);
    if (instrument) {
      instrument.isEnabled = enabled;
      console.log(`${enabled ? '✅' : '❌'} Channel ${channel + 1} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    console.log('🧹 Destroying BackgroundInstrumentManager');
    this.stop();
    this.backgroundInstruments.clear();
    this.soundFontCallback = undefined;
    this.isInitialized = false;
  }
}