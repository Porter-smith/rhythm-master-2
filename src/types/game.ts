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
  hitTimings: Array<{
    noteTime: number;
    hitTime: number;
    accuracy: 'perfect' | 'great' | 'good' | 'miss';
    pitch: number;
  }>;
  overallDifficulty: number;
  hitWindows: {
    perfect: number;
    great: number;
    good: number;
  };
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

export type GameState = 'menu' | 'songSelection' | 'gameplay' | 'settings' | 'score' | 'calibration' | 'musicPlayer' | 'smplrPlayer' | 'midiDebug' | 'multiplayerTest' | 'soundFontPOC' | 'gameplayPOC' | 'replay';

// New types for replay system
export interface GameReplay {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timestamp: number;
  score: GameScore;
  inputEvents: ReplayInputEvent[];
  gameSettings: {
    audioOffset: number;
    selectedInstrument?: {
      channel: number;
      instrument: number;
      name: string;
    };
  };
}

export interface ReplayInputEvent {
  timestamp: number;
  type: 'keydown' | 'keyup';
  keyCode: string;
  pitch: number;
  gameTime: number;
}

export interface StoredScore {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timestamp: number;
  score: GameScore;
  isReplayAvailable: boolean;
}