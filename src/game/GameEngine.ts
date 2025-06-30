import { Song, Note, GameNote as BaseGameNote } from '../types/game';
import { AudioEngine } from './AudioEngine';

interface GameNote extends BaseGameNote {
  id: number;
  x: number;
  y: number;
  timeToHit: number;
}

interface GameState {
  notes: GameNote[];
  score: number;
  combo: number;
  maxCombo: number;
  accuracy: number;
  hitStats: {
    perfect: number;
    great: number;
    good: number;
    miss: number;
  };
  isComplete: boolean;
  gameTime: number;
}

interface HitResult {
  score: number;
  combo: number;
  accuracy: number;
  hitStats: {
    perfect: number;
    great: number;
    good: number;
    miss: number;
  };
  hitNote?: GameNote;
  hitAccuracy: 'perfect' | 'great' | 'good';
  hitTiming: number;
}

export class GameEngine {
  private song: Song;
  private difficulty: 'easy' | 'medium' | 'hard';
  private audioOffset: number;
  private audioEngine: AudioEngine;
  private gameState: GameState;
  private startTime: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  private soundFontCallback?: (pitch: number, velocity: number, duration: number) => boolean;
  private selectedInstrument?: { channel: number; instrument: number };
  private hitTimings: number[] = []; // Array to store hit timings
  private timingWindows: { perfect: number; great: number; good: number };

  // Add getter for startTime
  public getStartTime(): number {
    return this.startTime;
  }

  // Add getter for hit timings
  public getHitTimings(): number[] {
    return this.hitTimings;
  }

  // Add getter for timing windows
  public getTimingWindows(): { perfect: number; great: number; good: number } {
    return this.timingWindows;
  }

  // Calculate timing windows based on overall difficulty (1-10)
  private calculateTimingWindows(overallDifficulty: number = 5): { perfect: number; great: number; good: number } {
    // Base timing windows (OD 5)
    const baseWindows = {
      perfect: 25, // ±25ms
      great: 50,   // ±50ms
      good: 200    // ±200ms
    };

    // Make lower ODs much more lenient (exponential scaling)
    // OD 1 = 4x (Perfect: ±100ms, Great: ±200ms, Good: ±800ms)
    // OD 5 = 1x (base)
    // OD 10 = 0.6x (stricter)
    const difficultyFactor = Math.pow(1.41, 5 - overallDifficulty);
    
    return {
      perfect: Math.round(baseWindows.perfect * difficultyFactor),
      great: Math.round(baseWindows.great * difficultyFactor),
      good: Math.round(baseWindows.good * difficultyFactor)
    };
  }

  constructor(
    song: Song, 
    difficulty: 'easy' | 'medium' | 'hard', 
    audioOffset: number, 
    audioEngine: AudioEngine,
    selectedInstrument?: { channel: number; instrument: number }
  ) {
    console.log(`🎮 GameEngine constructor called with:`, {
      songTitle: song.title,
      songFormat: song.format,
      difficulty: difficulty,
      audioOffset: audioOffset,
      availableDifficulties: song.difficulties,
      notesForDifficulty: song.notes[difficulty]?.length || 0,
      selectedInstrument: selectedInstrument ? `Channel ${selectedInstrument.channel + 1}, Program ${selectedInstrument.instrument}` : 'None',
      overallDifficulty: song.overallDifficulty || 5
    });

    this.song = song;
    this.difficulty = difficulty;
    this.audioOffset = audioOffset;
    this.audioEngine = audioEngine;
    this.selectedInstrument = selectedInstrument;
    
    // Calculate timing windows based on song's overall difficulty
    this.timingWindows = this.calculateTimingWindows(song.overallDifficulty);
    console.log('🎯 Timing windows:', this.timingWindows);
    
    this.gameState = {
      notes: this.createGameNotes(),
      score: 0,
      combo: 0,
      maxCombo: 0,
      accuracy: 100,
      hitStats: { perfect: 0, great: 0, good: 0, miss: 0 },
      isComplete: false,
      gameTime: 0
    };

    console.log(`🎮 GameEngine initialized with ${this.gameState.notes.length} notes`);
  }

  /**
   * Set SoundFont callback for playing notes
   */
  public setSoundFontCallback(callback: (pitch: number, velocity: number, duration: number) => boolean): void {
    this.soundFontCallback = callback;
    console.log('🎹 SoundFont callback set for GameEngine');
  }

  private createGameNotes(): GameNote[] {
    const songNotes = this.song.notes[this.difficulty] || [];
    console.log(`🎵 Creating game notes from ${songNotes.length} song notes for ${this.difficulty} difficulty`);
    
    if (songNotes.length === 0) {
      console.warn(`⚠️ No notes available for ${this.difficulty} difficulty`);
      return [];
    }

    // Filter notes by selected instrument channel for MIDI songs
    let filteredNotes = songNotes;
    if (this.song.format === 'midi' && this.selectedInstrument) {
      filteredNotes = songNotes.filter((note) => {
        // Check if note has channel property and matches selected channel
        const midiNote = note as Note & { channel?: number };
        return midiNote.channel === this.selectedInstrument!.channel;
      });
      console.log(`🎹 Filtered notes for channel ${this.selectedInstrument.channel + 1}: ${filteredNotes.length} notes (from ${songNotes.length} total)`);
    } else if (this.song.format === 'midi' && !this.selectedInstrument) {
      console.warn(`⚠️ MIDI song but no instrument selected - using all notes`);
    }

    const gameNotes = filteredNotes.map((note, index) => {
      const midiNote = note as Note & { channel?: number; velocity?: number };
      return {
        ...note,
        id: index,
        x: 0,
        y: 0,
        isHit: false,
        isMissed: false,
        isActive: false,
        timeToHit: 0,
        channel: midiNote.channel, // Preserve channel information
        velocity: midiNote.velocity // Preserve velocity information
      };
    });

    console.log(`🎮 Created ${gameNotes.length} game notes`);
    if (gameNotes.length > 0) {
      console.log(`🎵 First note:`, gameNotes[0]);
      console.log(`🎵 Last note:`, gameNotes[gameNotes.length - 1]);
    }

    return gameNotes;
  }

  start(): void {
    console.log(`🎮 GameEngine.start() called`);
    console.log(`🎵 Starting game with ${this.gameState.notes.length} notes`);
    
    this.isPlaying = true;
    this.startTime = performance.now();
    

    
    console.log(`▶️ Game started at time: ${this.startTime}`);
  }

  pause(): void {
    console.log(`⏸️ GameEngine.pause() called`);
    this.isPaused = true;
  }

  resume(): void {
    console.log(`▶️ GameEngine.resume() called`);
    this.isPaused = false;
  }

  update(currentTime: number): GameState {
    if (!this.isPlaying || this.isPaused) return this.gameState;

    this.gameState.gameTime = (currentTime - this.startTime) / 1000;

    // Update note positions and states
    this.gameState.notes.forEach(note => {
      const adjustedTime = note.time + (this.audioOffset / 1000);
      note.timeToHit = adjustedTime - this.gameState.gameTime;
      note.isActive = Math.abs(note.timeToHit) <= 0.1; // 100ms window

      // Check for missed notes
      if (note.timeToHit < -0.2 && !note.isHit && !note.isMissed) {
        note.isMissed = true;
        this.gameState.hitStats.miss++;
        this.gameState.combo = 0;
        this.updateAccuracy();
        console.log(`❌ Note missed: ${note.id} at time ${this.gameState.gameTime.toFixed(2)}s`);
      }
    });

    // Check if game is complete
    const allNotesProcessed = this.gameState.notes.every(note => note.isHit || note.isMissed);
    if (allNotesProcessed && this.gameState.notes.length > 0) {
      this.gameState.isComplete = true;
      console.log(`🎉 Game complete! Final stats:`, {
        score: this.gameState.score,
        accuracy: this.gameState.accuracy,
        hitStats: this.gameState.hitStats
      });
    }

    return this.gameState;
  }

  handleInput(inputTime: number, targetPitch?: number): HitResult | null {
    if (!this.isPlaying || this.isPaused) return null;

    const gameTime = (inputTime - this.startTime) / 1000;
    console.log(`🎮 Input received at game time: ${gameTime.toFixed(3)}s, target pitch: ${targetPitch}`);
    
    // Find the closest active note that matches the pitch
    let closestNote: GameNote | null = null;
    let closestDistance = Infinity;

    this.gameState.notes.forEach(note => {
      if (note.isHit || note.isMissed) return;
      
      // Skip notes that don't match the target pitch (if specified)
      if (targetPitch !== undefined && note.pitch !== targetPitch) return;
      
      const adjustedTime = note.time + (this.audioOffset / 1000);
      const distance = Math.abs(gameTime - adjustedTime);
      
      if (distance < closestDistance && distance <= this.timingWindows.good / 1000) { // Use good window
        closestDistance = distance;
        closestNote = note;
      }
    });


    if (closestNote) {
      closestNote.isHit = true;
      const offsetMs = closestDistance * 1000;
      const isLate = gameTime > (closestNote.time + (this.audioOffset / 1000));
      const hitTiming = isLate ? offsetMs : -offsetMs;
      this.hitTimings.push(hitTiming);
      
      let accuracy: 'perfect' | 'great' | 'good' = 'good';
      let points = 50;
      
      if (Math.abs(offsetMs) <= this.timingWindows.perfect) {
        accuracy = 'perfect';
        points = 100;
        this.gameState.hitStats.perfect++;
      } else if (Math.abs(offsetMs) <= this.timingWindows.great) {
        accuracy = 'great';
        points = 80;
        this.gameState.hitStats.great++;
      } else {
        this.gameState.hitStats.good++;
      }
      
      this.gameState.combo++;
      this.gameState.maxCombo = Math.max(this.gameState.maxCombo, this.gameState.combo);
      
      // Apply combo multiplier
      const multiplier = Math.min(4, Math.floor(this.gameState.combo / 10) + 1);
      this.gameState.score += points * multiplier;
      
      this.updateAccuracy();
      
      // Play note with SoundFont using the exact POC pattern
      let soundPlayed = false;
      if (this.soundFontCallback) {
        const velocity = closestNote.velocity || 80;
        console.log(`🎹 Calling SoundFont callback with: pitch=${closestNote.pitch}, velocity=${velocity}, duration=${closestNote.duration}`);
        soundPlayed = this.soundFontCallback(closestNote.pitch, velocity, closestNote.duration);
        console.log(`🎹 SoundFont callback result: ${soundPlayed}`);
      }
      
      // Only use fallback if SoundFont completely failed
      if (!soundPlayed) {
        console.log('🔄 SoundFont failed, using fallback hit sound');
        this.audioEngine.playHitSound(accuracy);
      }
      
      console.log(`✅ Note hit! Note ${closestNote.id}, offset: ${offsetMs.toFixed(1)}ms, accuracy: ${accuracy}, SoundFont: ${soundPlayed ? 'Yes' : 'No'}`);
      
      return {
        score: this.gameState.score,
        combo: this.gameState.combo,
        accuracy: this.gameState.accuracy,
        hitStats: this.gameState.hitStats,
        hitNote: closestNote,
        hitAccuracy: accuracy,
        hitTiming: hitTiming
      };
    } else {
      console.log(`❌ No note in range for input at ${gameTime.toFixed(3)}s`);
    }

    return null;
  }

  private updateAccuracy(): void {
    const totalHits = Object.values(this.gameState.hitStats).reduce((sum, count) => sum + count, 0);
    if (totalHits === 0) return;
    
    const weightedScore = 
      this.gameState.hitStats.perfect * 100 +
      this.gameState.hitStats.great * 80 +
      this.gameState.hitStats.good * 50 +
      this.gameState.hitStats.miss * 0;
    
    this.gameState.accuracy = (weightedScore / (totalHits * 100)) * 100;
  }

  destroy(): void {
    console.log(`🎮 GameEngine.destroy() called`);
    this.isPlaying = false;
    this.soundFontCallback = undefined;
  }
}