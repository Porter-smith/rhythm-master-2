/**
 * MIDI file parser and converter
 * Uses a lightweight custom parser for better reliability
 */

import { MidiNote, MusicPlayerError, MusicPlayerErrorInfo } from '../types/music';

export interface ParsedMidiData {
  tracks: MidiTrack[];
  ticksPerQuarter: number;
  format: number;
  trackCount: number;
  tempoChanges: TempoChange[];
  timeSignatures: TimeSignature[];
  totalDuration: number;
  totalNotes: number;
}

export interface MidiTrack {
  name?: string;
  notes: MidiNote[];
  events: MidiEvent[];
  channel: number;
}

export interface MidiEvent {
  type: string;
  time: number;
  data?: any;
}

export interface TempoChange {
  ticks: number;
  time: number;
  bpm: number;
  microsecondsPerQuarter: number;
}

export interface TimeSignature {
  time: number;
  numerator: number;
  denominator: number;
}

export class MidiParser {
  private static instance: MidiParser;
  
  public static getInstance(): MidiParser {
    if (!MidiParser.instance) {
      MidiParser.instance = new MidiParser();
    }
    return MidiParser.instance;
  }

  /**
   * Parse a MIDI file from ArrayBuffer using lightweight parser
   */
  public async parseMidiFile(arrayBuffer: ArrayBuffer): Promise<ParsedMidiData> {
    try {
      console.log('🎹 Parsing MIDI file using lightweight parser...');
      console.log(`📊 ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);
      
      const data = new Uint8Array(arrayBuffer);
      let pos = 0;

      // Helper functions for reading binary data
      const read32 = (): number => (data[pos++] << 24) | (data[pos++] << 16) | (data[pos++] << 8) | data[pos++];
      const read16 = (): number => (data[pos++] << 8) | data[pos++];
      const read8 = (): number => data[pos++];
      const readVarLength = (): number => {
        let value = 0;
        let byte: number;
        do {
          byte = read8();
          value = (value << 7) | (byte & 0x7F);
        } while (byte & 0x80);
        return value;
      };

      // Validate MIDI header
      if (data[0] !== 77 || data[1] !== 84 || data[2] !== 104 || data[3] !== 100) {
        throw new Error('Invalid MIDI file header');
      }
      pos = 4;

      // Read header chunk
      const headerLength = read32();
      const format = read16();
      const trackCount = read16();
      const ticksPerQuarter = read16();

      console.log(`📈 MIDI Header: format=${format}, tracks=${trackCount}, ticks/quarter=${ticksPerQuarter}`);

      const tracks: MidiTrack[] = [];
      const tempoChanges: TempoChange[] = [];
      const timeSignatures: TimeSignature[] = [];
      let totalNotes = 0;
      let maxTicks = 0;

      // Default tempo: 120 BPM = 500,000 microseconds per quarter note
      let currentTempo = 500000;
      tempoChanges.push({
        ticks: 0,
        time: 0,
        bpm: 120,
        microsecondsPerQuarter: currentTempo
      });

      // Process each track
      for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
        console.log(`\n🎼 Processing track ${trackIndex + 1}/${trackCount}`);
        
        // Validate track header
        if (data[pos++] !== 77 || data[pos++] !== 84 || data[pos++] !== 114 || data[pos++] !== 107) {
          console.warn(`⚠️ Invalid track header for track ${trackIndex + 1}`);
          continue;
        }

        const trackLength = read32();
        const trackEnd = pos + trackLength;
        let trackTicks = 0;
        let runningStatus = 0;
        
        const trackNotes: MidiNote[] = [];
        const trackEvents: MidiEvent[] = [];
        const activeNotes = new Map<number, { startTicks: number; velocity: number }>();
        let trackName: string | undefined;

        // Process track events
        while (pos < trackEnd) {
          const deltaTime = readVarLength();
          trackTicks += deltaTime;
          
          let command = read8();
          if (command < 0x80) {
            // Use running status
            pos--;
            command = runningStatus;
          } else {
            runningStatus = command;
          }

          const messageType = command & 0xF0;
          const channel = command & 0x0F;

          // Process different message types
          if (messageType === 0x90) {
            // Note On
            const note = read8();
            const velocity = read8();
            
            if (velocity > 0) {
              // Actual note on
              activeNotes.set(note, { startTicks: trackTicks, velocity });
              totalNotes++;
            } else {
              // Velocity 0 = note off
              this.processNoteOff(note, trackTicks, activeNotes, trackNotes, channel, ticksPerQuarter, tempoChanges);
            }
          } else if (messageType === 0x80) {
            // Note Off
            const note = read8();
            const velocity = read8();
            this.processNoteOff(note, trackTicks, activeNotes, trackNotes, channel, ticksPerQuarter, tempoChanges);
          } else if (messageType === 0xA0 || messageType === 0xB0 || messageType === 0xE0) {
            // Aftertouch, Control Change, Pitch Bend (2 bytes)
            read8();
            read8();
          } else if (messageType === 0xC0 || messageType === 0xD0) {
            // Program Change, Channel Pressure (1 byte)
            read8();
          } else if (command === 0xFF) {
            // Meta event
            const metaType = read8();
            const metaLength = readVarLength();
            
            if (metaType === 0x51 && metaLength === 3) {
              // Set Tempo
              const newTempo = (read8() << 16) | (read8() << 8) | read8();
              currentTempo = newTempo;
              const bpm = 60000000 / newTempo;
              
              const time = this.convertTicksToTime(trackTicks, tempoChanges, ticksPerQuarter);
              tempoChanges.push({
                ticks: trackTicks,
                time,
                bpm,
                microsecondsPerQuarter: newTempo
              });
              
              console.log(`🎼 Tempo change: ${bpm.toFixed(1)} BPM at tick ${trackTicks}`);
            } else if (metaType === 0x58 && metaLength === 4) {
              // Time Signature
              const numerator = read8();
              const denominator = Math.pow(2, read8());
              read8(); // clocks per click
              read8(); // 32nd notes per quarter
              
              const time = this.convertTicksToTime(trackTicks, tempoChanges, ticksPerQuarter);
              timeSignatures.push({
                time,
                numerator,
                denominator
              });
              
              console.log(`🎼 Time signature: ${numerator}/${denominator} at tick ${trackTicks}`);
            } else if (metaType === 0x03) {
              // Track Name
              const nameBytes = data.slice(pos, pos + metaLength);
              trackName = new TextDecoder().decode(nameBytes);
              pos += metaLength;
              console.log(`🏷️ Track name: "${trackName}"`);
            } else {
              // Skip other meta events
              pos += metaLength;
            }
          } else if (command >= 0xF0) {
            // System exclusive
            const sysexLength = readVarLength();
            pos += sysexLength;
          }

          trackEvents.push({
            type: this.getEventTypeName(command),
            time: this.convertTicksToTime(trackTicks, tempoChanges, ticksPerQuarter),
            data: { command, ticks: trackTicks }
          });
        }

        // Process any remaining active notes
        activeNotes.forEach((noteInfo, pitch) => {
          const duration = Math.max(0.1, (maxTicks - noteInfo.startTicks) / ticksPerQuarter * 0.5);
          const startTime = this.convertTicksToTime(noteInfo.startTicks, tempoChanges, ticksPerQuarter);
          
          trackNotes.push({
            time: startTime,
            pitch,
            duration,
            velocity: noteInfo.velocity,
            channel
          });
        });

        maxTicks = Math.max(maxTicks, trackTicks);
        
        console.log(`✅ Track ${trackIndex + 1} processed: ${trackNotes.length} notes, name: "${trackName || 'Unnamed'}", max ticks: ${trackTicks}`);
        
        tracks.push({
          name: trackName,
          notes: trackNotes,
          events: trackEvents,
          channel: trackIndex
        });
      }

      // Calculate total duration
      const totalDuration = this.convertTicksToTime(maxTicks, tempoChanges, ticksPerQuarter);

      // Add default time signature if none found
      if (timeSignatures.length === 0) {
        timeSignatures.push({
          time: 0,
          numerator: 4,
          denominator: 4
        });
      }

      console.log(`🎉 MIDI parsing complete:`);
      console.log(`  📊 Total notes: ${totalNotes}`);
      console.log(`  🎼 Total tracks: ${tracks.length}`);
      console.log(`  ⏱️ Duration: ${totalDuration.toFixed(2)} seconds`);
      console.log(`  🎵 Max ticks: ${maxTicks}`);

      // Verify timing distribution
      const allNotes = tracks.flatMap(t => t.notes);
      if (allNotes.length > 0) {
        const times = allNotes.map(n => n.time);
        const notesAtZero = allNotes.filter(n => n.time === 0).length;
        console.log(`🔍 Timing verification: ${notesAtZero}/${allNotes.length} notes at time 0`);
        console.log(`⏱️ Time range: ${Math.min(...times).toFixed(3)}s - ${Math.max(...times).toFixed(3)}s`);
      }

      return {
        tracks,
        ticksPerQuarter,
        format,
        trackCount,
        tempoChanges,
        timeSignatures,
        totalDuration,
        totalNotes
      };
    } catch (error) {
      console.error('❌ MIDI parsing failed:', error);
      throw this.createError('MIDI_PARSE_ERROR', 'Failed to parse MIDI file', error as Error);
    }
  }

  /**
   * Load and parse MIDI file from URL
   */
  public async loadMidiFile(url: string): Promise<ParsedMidiData> {
    try {
      console.log(`📂 Loading MIDI file from: ${url}`);
      
      const response = await fetch(url);
      console.log(`📡 Fetch response status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log(`📦 Downloaded ${arrayBuffer.byteLength} bytes`);
      
      return this.parseMidiFile(arrayBuffer);
    } catch (error) {
      console.error(`❌ Failed to load MIDI file: ${url}`, error);
      if (error instanceof Error && error.message.includes('HTTP')) {
        throw this.createError('MIDI_FILE_NOT_FOUND', `MIDI file not found: ${url}`, error);
      }
      throw this.createError('MIDI_PARSE_ERROR', 'Failed to load MIDI file', error as Error);
    }
  }

  /**
   * Process note off event
   */
  private processNoteOff(
    pitch: number,
    endTicks: number,
    activeNotes: Map<number, { startTicks: number; velocity: number }>,
    trackNotes: MidiNote[],
    channel: number,
    ticksPerQuarter: number,
    tempoChanges: TempoChange[]
  ): void {
    const noteInfo = activeNotes.get(pitch);
    if (noteInfo) {
      const startTime = this.convertTicksToTime(noteInfo.startTicks, tempoChanges, ticksPerQuarter);
      const endTime = this.convertTicksToTime(endTicks, tempoChanges, ticksPerQuarter);
      const duration = Math.max(0.1, endTime - startTime); // Minimum 100ms duration
      
      trackNotes.push({
        time: startTime,
        pitch,
        duration,
        velocity: noteInfo.velocity,
        channel
      });
      
      activeNotes.delete(pitch);
    }
  }

  /**
   * Convert ticks to time using tempo changes
   */
  private convertTicksToTime(ticks: number, tempoChanges: TempoChange[], ticksPerQuarter: number): number {
    if (tempoChanges.length === 0) {
      // Fallback to default tempo (120 BPM)
      return (ticks / ticksPerQuarter) * 0.5;
    }

    // Find the active tempo change for this tick
    let activeTempoChange = tempoChanges[0];
    for (let i = 1; i < tempoChanges.length; i++) {
      if (ticks >= tempoChanges[i].ticks) {
        activeTempoChange = tempoChanges[i];
      } else {
        break;
      }
    }

    // Calculate time from the active tempo change
    const ticksFromTempoChange = ticks - activeTempoChange.ticks;
    const timeFromTempoChange = (ticksFromTempoChange / ticksPerQuarter) * (activeTempoChange.microsecondsPerQuarter / 1000000);
    
    return activeTempoChange.time + timeFromTempoChange;
  }

  /**
   * Get event type name for debugging
   */
  private getEventTypeName(command: number): string {
    const messageType = command & 0xF0;
    switch (messageType) {
      case 0x80: return 'Note Off';
      case 0x90: return 'Note On';
      case 0xA0: return 'Aftertouch';
      case 0xB0: return 'Control Change';
      case 0xC0: return 'Program Change';
      case 0xD0: return 'Channel Pressure';
      case 0xE0: return 'Pitch Bend';
      case 0xFF: return 'Meta Event';
      default: return 'Unknown';
    }
  }

  /**
   * Create standardized error
   */
  private createError(type: MusicPlayerError, message: string, originalError?: Error): MusicPlayerErrorInfo {
    return {
      type,
      message,
      originalError,
      fallbackAvailable: true
    };
  }

  /**
   * Get all notes from all tracks combined
   */
  public getAllNotes(parsedData: ParsedMidiData): MidiNote[] {
    const allNotes = parsedData.tracks.flatMap(track => track.notes);
    console.log(`🎵 Combined all tracks: ${allNotes.length} total notes`);
    
    // Sort by time
    allNotes.sort((a, b) => a.time - b.time);
    
    if (allNotes.length > 0) {
      console.log(`🎵 Time range: ${allNotes[0]?.time.toFixed(2)}s - ${allNotes[allNotes.length - 1]?.time.toFixed(2)}s`);
    }
    
    return allNotes;
  }

  /**
   * Get notes from a specific track
   */
  public getTrackNotes(parsedData: ParsedMidiData, trackIndex: number): MidiNote[] {
    if (trackIndex >= 0 && trackIndex < parsedData.tracks.length) {
      const track = parsedData.tracks[trackIndex];
      console.log(`🎼 Getting notes from track ${trackIndex + 1}: ${track.notes.length} notes`);
      return track.notes;
    }
    console.warn(`⚠️ Track ${trackIndex} not found`);
    return [];
  }

  /**
   * Get notes from a specific channel
   */
  public getChannelNotes(parsedData: ParsedMidiData, channel: number): MidiNote[] {
    const channelNotes = parsedData.tracks
      .flatMap(track => track.notes)
      .filter(note => note.channel === channel);
    
    console.log(`🎵 Getting notes from channel ${channel}: ${channelNotes.length} notes`);
    return channelNotes;
  }

  /**
   * Get notes within a time range
   */
  public getNotesInTimeRange(notes: MidiNote[], startTime: number, endTime: number): MidiNote[] {
    const filteredNotes = notes.filter(note => 
      note.time >= startTime && note.time <= endTime
    );
    
    console.log(`⏱️ Notes in time range ${startTime}s-${endTime}s: ${filteredNotes.length} notes`);
    return filteredNotes;
  }

  /**
   * Get notes within a pitch range
   */
  public getNotesInPitchRange(notes: MidiNote[], minPitch: number, maxPitch: number): MidiNote[] {
    const filteredNotes = notes.filter(note => 
      note.pitch >= minPitch && note.pitch <= maxPitch
    );
    
    console.log(`🎹 Notes in pitch range ${minPitch}-${maxPitch}: ${filteredNotes.length} notes`);
    return filteredNotes;
  }
}