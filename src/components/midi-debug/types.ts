import { ParsedMidiData } from '../../music/MidiParser';

export interface DebugState {
  isLoading: boolean;
  error: string | null;
  midiData: ParsedMidiData | null;
  selectedFile: string;
  selectedTrack: number;
  selectedChannel: number;
  timeRange: { start: number; end: number };
  pitchRange: { min: number; max: number };
  showRawData: boolean;
  playbackPosition: number;
  isPlaying: boolean;
}

export interface MidiNote {
  time: number;
  pitch: number;
  duration: number;
  velocity: number;
  channel: number;
} 