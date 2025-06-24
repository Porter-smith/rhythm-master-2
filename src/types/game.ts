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
  difficulties: Array<'easy' | 'medium' | 'hard'>;
  bpm: number;
  format: 'custom' | 'midi';
  notes: {
    easy?: Note[];
    medium?: Note[];
    hard?: Note[];
  };
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
}

export type GameState = 'menu' | 'songSelection' | 'gameplay' | 'settings' | 'score' | 'calibration' | 'musicPlayer' | 'smplrPlayer' | 'midiDebug' | 'multiplayerTest' | 'soundFontPOC';