export const GAME_CONFIG = {
  bpm: 120,
  hitWindow: 200, // larger window for calibration
  perfectThreshold: 25,
  greatThreshold: 50,
  noteSpeed: 400,
  canvasWidth: 800,
  canvasHeight: 600,
  targetLine: 150,
  
  // Audio settings
  sampleRate: 44100,
  metronomeFreq: 800,
  accentFreq: 1000,
  bufferSize: 2048,
  
  // Calibration settings
  calibrationBeats: 16, // Number of beats to collect for calibration
  minHitsRequired: 8, // Minimum hits needed for valid calibration
  
  // Visual settings
  noteWidth: 40,
  noteHeight: 10,
  approachTime: 2000,
  
  // Colors
  colors: {
    background: '#0a0a0a',
    targetLine: '#ffffff',
    noteApproaching: '#0078ff',
    noteHitWindow: '#ff8c00',
    noteHit: '#00ff00',
    noteMissed: '#ff0000',
    perfect: '#00ff88',
    great: '#ffaa00',
    good: '#ff6600',
    text: '#ffffff',
    accent: '#ff00ff'
  }
};