/**
 * Dual-format music player
 * Supports both custom notation and MIDI files with fallback mechanisms
 */

import * as Tone from 'tone';
import { MidiParser } from './MidiParser';
import { 
  Song, 
  CustomSong, 
  MidiSong, 
  GameNote, 
  PlaybackState, 
  MusicPlayerConfig,
  MusicPlayerErrorInfo,
  MusicPlayerError
} from '../types/music';

export class MusicPlayer {
  private static instance: MusicPlayer;
  private synth: Tone.PolySynth | null = null;
  private isInitialized = false;
  private currentSong: Song | null = null;
  private currentDifficulty: 'easy' | 'medium' | 'hard' = 'easy';
  private playbackState: PlaybackState;
  private config: MusicPlayerConfig;
  private midiParser: MidiParser;
  private playbackTimer: number | null = null;
  private startTime = 0;

  private constructor() {
    this.playbackState = {
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      duration: 0,
      format: 'custom'
    };

    this.config = {
      preferredFormat: 'auto',
      enableMidiFallback: true,
      audioLatencyCompensation: 0,
      midiSynthEnabled: true
    };

    this.midiParser = MidiParser.getInstance();
  }

  public static getInstance(): MusicPlayer {
    if (!MusicPlayer.instance) {
      MusicPlayer.instance = new MusicPlayer();
    }
    return MusicPlayer.instance;
  }

  /**
   * Initialize the music player
   */
  public async initialize(config?: Partial<MusicPlayerConfig>): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🎵 Initializing MusicPlayer...');
      
      // Update configuration
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Initialize Tone.js for MIDI synthesis
      if (this.config.midiSynthEnabled) {
        console.log('🎹 Initializing Tone.js...');
        await Tone.start();
        this.synth = new Tone.PolySynth(Tone.Synth).toDestination();
        this.synth.volume.value = -10; // Reduce volume slightly
        console.log('✅ Tone.js initialized successfully');
      }

      this.isInitialized = true;
      console.log('✅ MusicPlayer initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize MusicPlayer:', error);
      throw this.createError('AUDIO_CONTEXT_ERROR', 'Failed to initialize audio context', error as Error);
    }
  }

  /**
   * Load a song (supports both formats)
   */
  public async loadSong(song: Song): Promise<void> {
    try {
      console.log(`\n🎵 ===== LOADING SONG =====`);
      console.log(`📀 Song: ${song.title}`);
      console.log(`🎨 Artist: ${song.artist}`);
      console.log(`📁 Format: ${song.format}`);
      console.log(`🎯 Available difficulties: ${song.difficulties.join(', ')}`);
      console.log(`⏱️ Duration: ${song.duration}`);
      console.log(`🥁 BPM: ${song.bpm}`);
      
      this.currentSong = song;
      
      if (song.format === 'midi') {
        console.log('🎹 Detected MIDI format - starting MIDI loading process...');
        await this.loadMidiSong(song as MidiSong);
      } else {
        console.log('📝 Detected custom format - loading custom song...');
        await this.loadCustomSong(song as CustomSong);
      }

      // Update playback state
      this.playbackState.format = song.format;
      this.playbackState.duration = this.parseDuration(song.duration);
      this.playbackState.error = undefined;

      // Debug: Log final note counts
      console.log('\n📊 ===== FINAL LOADING RESULTS =====');
      Object.entries(song.notes).forEach(([diff, notes]) => {
        const noteCount = notes?.length || 0;
        console.log(`  ${diff}: ${noteCount} notes`);
        if (notes && notes.length > 0) {
          console.log(`    ⏱️ Time range: ${notes[0].time.toFixed(2)}s - ${notes[notes.length - 1].time.toFixed(2)}s`);
          console.log(`    🎹 Pitch range: ${Math.min(...notes.map(n => n.pitch))} - ${Math.max(...notes.map(n => n.pitch))}`);
          console.log(`    🎵 First note: time=${notes[0].time}s, pitch=${notes[0].pitch}, duration=${notes[0].duration}s`);
        }
      });

      console.log(`✅ Song loaded successfully: ${song.title}`);
      console.log(`🎵 ===== LOADING COMPLETE =====\n`);
    } catch (error) {
      console.error(`❌ Failed to load song: ${song.title}`, error);
      if (this.config.enableMidiFallback && song.format === 'midi') {
        console.warn('🔄 MIDI loading failed, attempting fallback to custom format');
        await this.attemptFallback(song, error as Error);
      } else {
        throw error;
      }
    }
  }

  /**
   * Load MIDI song - RAW MIDI DATA, NO ARTIFICIAL DIFFICULTIES
   */
  private async loadMidiSong(song: MidiSong): Promise<void> {
    try {
      console.log('\n🎹 ===== MIDI LOADING PROCESS =====');
      console.log('🎼 Loading MIDI song with RAW data (no filtering)...');
      console.log('📂 MIDI files configuration:', song.midiFiles);
      
      let successfulLoads = 0;
      
      // Load MIDI files for each available difficulty
      for (const difficulty of song.difficulties) {
        console.log(`\n🎯 Processing difficulty: ${difficulty}`);
        
        const midiFile = song.midiFiles[difficulty];
        if (!midiFile) {
          console.warn(`⚠️ No MIDI file specified for ${difficulty} difficulty`);
          continue;
        }
        
        console.log(`📂 MIDI file path: ${midiFile}`);
        console.log(`🔍 Attempting to load: ${midiFile}`);
        
        try {
          console.log(`📡 Starting fetch for: ${midiFile}`);
          const midiData = await this.midiParser.loadMidiFile(midiFile);
          
          console.log(`📈 Raw MIDI data loaded for ${difficulty}:`, {
            tracks: midiData.tracks.length,
            totalNotes: midiData.totalNotes,
            duration: midiData.totalDuration.toFixed(2) + 's',
            format: midiData.format,
            ticksPerQuarter: midiData.ticksPerQuarter
          });
          
          // Get ALL notes from the MIDI file - NO FILTERING!
          const allNotes = this.midiParser.getAllNotes(midiData);
          console.log(`🎼 Raw MIDI notes for ${difficulty}: ${allNotes.length} total notes`);
          
          if (allNotes.length === 0) {
            console.warn(`⚠️ No notes found in MIDI file for ${difficulty}`);
            continue;
          }
          
          // Convert to our game format but keep ALL notes
          song.notes[difficulty] = allNotes.map(note => ({
            time: note.time,
            pitch: note.pitch,
            duration: note.duration,
            velocity: note.velocity,
            channel: note.channel
          }));
          
          console.log(`✅ Successfully loaded ${difficulty} difficulty: ${song.notes[difficulty]!.length} notes`);
          successfulLoads++;
          
          // Debug: Show note distribution
          const notesByTime = song.notes[difficulty]!.slice(0, 5);
          console.log(`🎵 First 5 notes for ${difficulty}:`, notesByTime);
          
          // Show pitch range
          const pitches = song.notes[difficulty]!.map(n => n.pitch);
          const minPitch = Math.min(...pitches);
          const maxPitch = Math.max(...pitches);
          console.log(`🎹 Pitch range for ${difficulty}: ${minPitch} - ${maxPitch} (${maxPitch - minPitch} semitones)`);
          
        } catch (difficultyError) {
          console.error(`❌ Failed to load ${difficulty} MIDI file: ${midiFile}`);
          console.error(`❌ Error details:`, difficultyError);
          // Continue loading other difficulties
        }
      }

      // Check if at least one difficulty was loaded successfully
      if (successfulLoads === 0) {
        throw new Error(`No MIDI files could be loaded for any difficulty. Checked files: ${Object.values(song.midiFiles).join(', ')}`);
      }

      console.log(`🎉 MIDI song loaded successfully: ${song.title}`);
      console.log(`📊 Successfully loaded ${successfulLoads}/${song.difficulties.length} difficulties`);
      console.log(`🎹 ===== MIDI LOADING COMPLETE =====\n`);
      
    } catch (error) {
      console.error('❌ MIDI loading failed completely:', error);
      throw this.createError('MIDI_PARSE_ERROR', `Failed to load MIDI song: ${song.title}`, error as Error);
    }
  }

  /**
   * Load custom format song
   */
  private async loadCustomSong(song: CustomSong): Promise<void> {
    console.log(`📝 Custom song loaded: ${song.title}`);
    
    // Debug: Log note counts for custom songs
    Object.entries(song.notes).forEach(([diff, notes]) => {
      console.log(`  ${diff}: ${notes?.length || 0} notes`);
      if (notes && notes.length > 0) {
        console.log(`    Time range: ${notes[0].time}s - ${notes[notes.length - 1].time}s`);
      }
    });
  }

  /**
   * Attempt fallback to custom format
   */
  private async attemptFallback(song: Song, originalError: Error): Promise<void> {
    try {
      console.log('🔄 Attempting fallback to custom format...');
      
      // Create a fallback custom song with basic notes
      const fallbackSong: CustomSong = {
        ...song,
        format: 'custom',
        notes: {}
      };

      // Generate fallback notes for each difficulty the song supports
      song.difficulties.forEach(difficulty => {
        const fallbackNotes = this.generateFallbackNotes(difficulty);
        fallbackSong.notes[difficulty] = fallbackNotes;
        console.log(`🔧 Generated ${fallbackNotes.length} fallback notes for ${difficulty}`);
      });

      await this.loadCustomSong(fallbackSong);
      this.currentSong = fallbackSong;
      this.playbackState.format = 'custom';
      this.playbackState.error = `MIDI failed, using fallback: ${originalError.message}`;
      
      console.log(`✅ Fallback successful for song: ${song.title}`);
    } catch (fallbackError) {
      throw this.createError('PLAYBACK_ERROR', 'Both MIDI and fallback loading failed', originalError);
    }
  }

  /**
   * Generate fallback notes for custom format
   */
  private generateFallbackNotes(difficulty: 'easy' | 'medium' | 'hard'): GameNote[] {
    console.log(`🎼 Generating fallback notes for ${difficulty} difficulty`);
    
    // Generate "Twinkle Twinkle Little Star" pattern
    const pattern = [60, 60, 67, 67, 69, 69, 67]; // C C G G A A G
    const notes: GameNote[] = [];
    
    const noteCount = difficulty === 'easy' ? 4 : difficulty === 'medium' ? 8 : pattern.length;
    const noteDuration = difficulty === 'easy' ? 1.0 : difficulty === 'medium' ? 0.5 : 0.5;
    
    for (let i = 0; i < noteCount; i++) {
      notes.push({
        time: i * noteDuration + 0.5, // Start after 0.5 seconds
        pitch: pattern[i % pattern.length],
        duration: noteDuration * 0.8 // Slightly shorter than the gap
      });
    }
    
    console.log(`🎵 Generated ${notes.length} fallback notes:`, notes);
    return notes;
  }

  /**
   * Play the loaded song with specific difficulty
   */
  public async play(difficulty: 'easy' | 'medium' | 'hard' = 'easy'): Promise<void> {
    if (!this.currentSong) {
      throw this.createError('PLAYBACK_ERROR', 'No song loaded');
    }

    // Check if the requested difficulty is available
    if (!this.currentSong.difficulties.includes(difficulty)) {
      throw this.createError('PLAYBACK_ERROR', `Difficulty '${difficulty}' not available for this song`);
    }

    try {
      this.currentDifficulty = difficulty;
      const notes = this.getCurrentNotes(difficulty);
      
      console.log(`🎮 Starting playback: ${this.currentSong.title} (${difficulty})`);
      console.log(`🎵 Notes to play: ${notes?.length || 0}`);
      
      if (!notes || notes.length === 0) {
        throw this.createError('PLAYBACK_ERROR', `No notes available for ${difficulty} difficulty`);
      }

      this.playbackState.isPlaying = true;
      this.playbackState.isPaused = false;
      this.startTime = Tone.now();

      // Schedule notes for playback
      if (this.currentSong.format === 'midi' && this.synth) {
        this.scheduleMidiNotes(notes);
      } else {
        this.scheduleCustomNotes(notes);
      }

      // Start playback timer
      this.startPlaybackTimer();

      console.log(`▶️ Playback started: ${this.currentSong.title} (${difficulty})`);
    } catch (error) {
      this.playbackState.isPlaying = false;
      console.error('❌ Playback failed:', error);
      throw error;
    }
  }

  /**
   * Schedule MIDI notes for playback
   */
  private scheduleMidiNotes(notes: GameNote[]): void {
    if (!this.synth) return;

    console.log(`🎹 Scheduling ${notes.length} MIDI notes for playback`);

    notes.forEach((note, index) => {
      const startTime = this.startTime + note.time + (this.config.audioLatencyCompensation / 1000);
      const frequency = Tone.Frequency(note.pitch, "midi").toFrequency();
      
      this.synth!.triggerAttackRelease(
        frequency,
        note.duration,
        startTime,
        (note.velocity || 64) / 127 // Convert MIDI velocity to gain
      );
      
      if (index < 5) {
        console.log(`🎵 Scheduled note ${index + 1}: pitch=${note.pitch}, time=${startTime.toFixed(2)}s, duration=${note.duration}s, velocity=${note.velocity}`);
      }
    });
  }

  /**
   * Schedule custom notes for playback
   */
  private scheduleCustomNotes(notes: GameNote[]): void {
    if (!this.synth) return;

    console.log(`📝 Scheduling ${notes.length} custom notes for playback`);

    notes.forEach((note, index) => {
      const startTime = this.startTime + note.time + (this.config.audioLatencyCompensation / 1000);
      const frequency = Tone.Frequency(note.pitch, "midi").toFrequency();
      
      this.synth!.triggerAttackRelease(
        frequency,
        note.duration,
        startTime,
        0.5 // Default volume for custom notes
      );
      
      if (index < 5) {
        console.log(`🎵 Scheduled note ${index + 1}: pitch=${note.pitch}, time=${startTime.toFixed(2)}s, duration=${note.duration}s`);
      }
    });
  }

  /**
   * Pause playback
   */
  public pause(): void {
    this.playbackState.isPlaying = false;
    this.playbackState.isPaused = true;
    
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }

    // Stop all scheduled notes
    if (this.synth) {
      this.synth.releaseAll();
    }
  }

  /**
   * Stop playback
   */
  public stop(): void {
    this.playbackState.isPlaying = false;
    this.playbackState.isPaused = false;
    this.playbackState.currentTime = 0;
    
    if (this.playbackTimer) {
      clearInterval(this.playbackTimer);
      this.playbackTimer = null;
    }

    // Stop all scheduled notes
    if (this.synth) {
      this.synth.releaseAll();
    }
  }

  /**
   * Get current notes for difficulty
   */
  private getCurrentNotes(difficulty: 'easy' | 'medium' | 'hard'): GameNote[] | undefined {
    if (!this.currentSong) {
      console.warn('⚠️ No current song loaded');
      return undefined;
    }
    
    console.log(`🎵 Getting notes for difficulty: ${difficulty}`);
    console.log(`📊 Available difficulties in song:`, Object.keys(this.currentSong.notes));
    
    const notes = this.currentSong.notes[difficulty];
    if (!notes) {
      console.warn(`⚠️ No notes found for difficulty: ${difficulty}`);
      console.warn(`📊 Available notes:`, this.currentSong.notes);
      return undefined;
    }

    console.log(`🎵 Retrieved ${notes.length} notes for ${difficulty} difficulty`);
    if (notes.length > 0) {
      console.log(`🎵 Note details:`, {
        first: notes[0],
        last: notes[notes.length - 1],
        timeSpan: `${notes[0].time}s - ${notes[notes.length - 1].time}s`
      });
    }

    // Convert to GameNote format if needed
    return notes.map(note => ({
      time: note.time,
      pitch: note.pitch,
      duration: note.duration,
      velocity: 'velocity' in note ? note.velocity : undefined,
      channel: 'channel' in note ? note.channel : undefined
    }));
  }

  /**
   * Start playback timer for tracking current time
   */
  private startPlaybackTimer(): void {
    this.playbackTimer = window.setInterval(() => {
      if (this.playbackState.isPlaying) {
        this.playbackState.currentTime = Tone.now() - this.startTime;
        
        // Check if playback is complete
        if (this.playbackState.currentTime >= this.playbackState.duration) {
          this.stop();
        }
      }
    }, 100); // Update every 100ms
  }

  /**
   * Parse duration string to seconds
   */
  private parseDuration(duration: string): number {
    const parts = duration.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 60; // Default 1 minute
  }

  /**
   * Get current playback state
   */
  public getPlaybackState(): PlaybackState {
    return { ...this.playbackState };
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<MusicPlayerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): MusicPlayerConfig {
    return { ...this.config };
  }

  /**
   * Create standardized error
   */
  private createError(type: MusicPlayerError, message: string, originalError?: Error): MusicPlayerErrorInfo {
    return {
      type,
      message,
      originalError,
      fallbackAvailable: this.config.enableMidiFallback
    };
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.stop();
    
    if (this.synth) {
      this.synth.dispose();
      this.synth = null;
    }
    
    this.isInitialized = false;
    console.log('MusicPlayer destroyed');
  }
}