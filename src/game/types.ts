export interface GameNote {
  id: number;
  targetTime: number;
  x: number;
  y: number;
  hit: boolean;
  missed: boolean;
  hitTime?: number;
  hitOffset?: number;
}

export interface CalibrationHit {
  beatNumber: number;
  expectedTime: number;
  actualTime: number;
  offset: number;
}

export interface GameState {
  isPlaying: boolean;
  isPaused: boolean;
  gameTime: number;
  score: number;
  combo: number;
  maxCombo: number;
  notes: GameNote[];
  currentNoteIndex: number;
  hitStats: {
    perfect: number;
    great: number;
    good: number;
    miss: number;
  };
  // Calibration specific
  calibrationHits: CalibrationHit[];
  currentBeat: number;
  averageOffset: number;
  isCalibrating: boolean;
}

export interface HitResult {
  hit: boolean;
  offset: number;
  score: number;
  accuracy: 'perfect' | 'great' | 'good' | 'miss';
}

export interface GameConfig {
  bpm: number;
  hitWindow: number;
  perfectThreshold: number;
  greatThreshold: number;
  noteSpeed: number;
  canvasWidth: number;
  canvasHeight: number;
  targetLine: number;
}