import { Song, Note } from '../types/game';
import { AudioEngine } from './AudioEngine';

interface GameNote extends Note {
  id: number;
  x: number;
  y: number;
  isHit: boolean;
  isMissed: boolean;
  isActive: boolean;
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
  accuracy: 'perfect' | 'great' | 'good';
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

  constructor(song: Song, difficulty: 'easy' | 'medium' | 'hard', audioOffset: number, audioEngine: AudioEngine) {
    console.log(`🎮 GameEngine constructor called with:`, {
      songTitle: song.title,
      songFormat: song.format,
      difficulty: difficulty,
      audioOffset: audioOffset,
      availableDifficulties: song.difficulties,
      notesForDifficulty: song.notes[difficulty]?.length || 0
    });

    this.song = song;
    this.difficulty = difficulty;
    this.audioOffset = audioOffset;
    this.audioEngine = audioEngine;
    
    // Check if notes exist for this difficulty
    const notesForDifficulty = song.notes[difficulty];
    if (!notesForDifficulty || notesForDifficulty.length === 0) {
      console.error(`❌ No notes found for difficulty: ${difficulty}`);
      console.error(`📊 Available notes:`, song.notes);
      console.error(`🎵 Song format: ${song.format}`);
      
      if (song.format === 'midi') {
        console.error(`🎹 MIDI song may not have loaded properly`);
        console.error(`📂 Expected MIDI files:`, 'midiFiles' in song ? song.midiFiles : 'No midiFiles property');
      }
    }
    
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

    const gameNotes = songNotes.map((note, index) => ({
      ...note,
      id: index,
      x: 0,
      y: 0,
      isHit: false,
      isMissed: false,
      isActive: false,
      timeToHit: 0
    }));

    console.log(`🎮 Created ${gameNotes.length} game notes`);
    console.log(`🎵 First note:`, gameNotes[0]);
    console.log(`🎵 Last note:`, gameNotes[gameNotes.length - 1]);

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

  handleInput(inputTime: number): HitResult | null {
    if (!this.isPlaying || this.isPaused) return null;

    const gameTime = (inputTime - this.startTime) / 1000;
    console.log(`🎮 Input received at game time: ${gameTime.toFixed(3)}s`);
    
    // Find the closest active note
    let closestNote: GameNote | null = null;
    let closestDistance = Infinity;

    this.gameState.notes.forEach(note => {
      if (note.isHit || note.isMissed) return;
      
      const adjustedTime = note.time + (this.audioOffset / 1000);
      const distance = Math.abs(gameTime - adjustedTime);
      
      if (distance < closestDistance && distance <= 0.2) { // 200ms hit window
        closestDistance = distance;
        closestNote = note;
      }
    });

    if (closestNote) {
      closestNote.isHit = true;
      const offsetMs = closestDistance * 1000;
      
      let accuracy: 'perfect' | 'great' | 'good' = 'good';
      let points = 50;
      
      if (offsetMs <= 25) {
        accuracy = 'perfect';
        points = 100;
        this.gameState.hitStats.perfect++;
      } else if (offsetMs <= 50) {
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
        const velocity = ('velocity' in closestNote ? closestNote.velocity : 80) || 80;
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
        accuracy: accuracy
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