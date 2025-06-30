export interface Note {
  time: number;
  pitch: number;
  duration: number;
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  difficulties: ('easy' | 'medium' | 'hard')[];
  bpm: number;
  format: 'custom' | 'midi';
  notes: {
    [key: string]: Note[];
  };
  overallDifficulty?: number; // 1-10, affects hit timing windows (1 = easiest, 10 = hardest)
}

export interface GameScore {
  score: number;
  accuracy: number;
  combo: number;
  hitStats: {
    perfect: number;
    great: number;
    good: number;
    miss: number;
  };
  grade: string;
  hitTimings: number[]; // Array of hit timings in milliseconds (negative = early, positive = late)
  overallDifficulty: number; // The OD value that was used
  hitWindows: {
    perfect: number;
    great: number;
    good: number;
  }; // The actual timing windows used based on OD
}

export interface GameNote {
  id: string;
  time: number;
  pitch: number;
  duration: number;
  velocity?: number;
  channel?: number;
  isHit?: boolean;
  isMissed?: boolean;
  isActive?: boolean;
}

export type GameState = 'menu' | 'songSelection' | 'gameplay' | 'settings' | 'score' | 'calibration' | 'musicPlayer' | 'smplrPlayer' | 'midiDebug' | 'multiplayerTest' | 'soundFontPOC';