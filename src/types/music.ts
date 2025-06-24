/**
 * Music format types for dual-format support
 */

// Existing custom notation format
export interface CustomNote {
  time: number;
  pitch: number;
  duration: number;
}

export interface CustomSong {
  id: string;
  title: string;
  artist: string;
  duration: string;
  difficulties: Array<'easy' | 'medium' | 'hard'>;
  bpm: number;
  format: 'custom';
  notes: {
    easy?: CustomNote[];
    medium?: CustomNote[];
    hard?: CustomNote[];
  };
}

// MIDI format support with separate files per difficulty
export interface MidiNote {
  time: number;      // Time in seconds
  pitch: number;     // MIDI note number (0-127)
  duration: number;  // Duration in seconds
  velocity: number;  // Note velocity (0-127)
  channel: number;   // MIDI channel
}

export interface MidiSong {
  id: string;
  title: string;
  artist: string;
  duration: string;
  difficulties: Array<'easy' | 'medium' | 'hard'>;
  bpm: number;
  format: 'midi';
  midiFiles: {
    easy?: string;    // Path to easy MIDI file
    medium?: string;  // Path to medium MIDI file
    hard?: string;    // Path to hard MIDI file
  };
  audioFiles?: {
    easy?: string;    // Optional audio files for each difficulty
    medium?: string;
    hard?: string;
  };
  notes: {
    easy?: MidiNote[];
    medium?: MidiNote[];
    hard?: MidiNote[];
  };
}

// Union type for both formats
export type Song = CustomSong | MidiSong;

// Normalized note format for game engine
export interface GameNote {
  time: number;
  pitch: number;
  duration: number;
  velocity?: number;
  channel?: number;
}

// Music player configuration
export interface MusicPlayerConfig {
  preferredFormat: 'custom' | 'midi' | 'auto';
  enableMidiFallback: boolean;
  audioLatencyCompensation: number;
  midiSynthEnabled: boolean;
}

// Playback state
export interface PlaybackState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  format: 'custom' | 'midi';
  error?: string;
}

// Error types for better error handling
export type MusicPlayerError = 
  | 'MIDI_PARSE_ERROR'
  | 'MIDI_FILE_NOT_FOUND'
  | 'AUDIO_CONTEXT_ERROR'
  | 'UNSUPPORTED_FORMAT'
  | 'PLAYBACK_ERROR'
  | 'SYNC_ERROR';

export interface MusicPlayerErrorInfo {
  type: MusicPlayerError;
  message: string;
  originalError?: Error;
  fallbackAvailable: boolean;
}