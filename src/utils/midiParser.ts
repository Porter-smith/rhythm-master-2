// MIDI instrument names (General MIDI standard)
const midiPatchNames = [
  "Acoustic Grand Piano",
  "Bright Acoustic Piano", 
  "Electric Grand Piano",
  "Honky-tonk Piano",
  "Electric Piano 1",
  "Electric Piano 2",
  "Harpsichord",
  "Clavi",
  "Celesta",
  "Glockenspiel",
  "Music Box",
  "Vibraphone",
  "Marimba",
  "Xylophone",
  "Tubular Bells",
  "Dulcimer",
  "Drawbar Organ",
  "Percussive Organ",
  "Rock Organ",
  "Church Organ",
  "Reed Organ",
  "Accordion",
  "Harmonica",
  "Tango Accordion",
  "Acoustic Guitar (nylon)",
  "Acoustic Guitar (steel)",
  "Electric Guitar (jazz)",
  "Electric Guitar (clean)",
  "Electric Guitar (muted)",
  "Overdriven Guitar",
  "Distortion Guitar",
  "Guitar Harmonics",
  "Acoustic Bass",
  "Electric Bass (finger)",
  "Electric Bass (pick)",
  "Fretless Bass",
  "Slap Bass 1",
  "Slap Bass 2",
  "Synth Bass 1",
  "Synth Bass 2",
  "Violin",
  "Viola",
  "Cello",
  "Contrabass",
  "Tremolo Strings",
  "Pizzicato Strings",
  "Orchestral Harp",
  "Timpani",
  "String Ensemble 1",
  "String Ensemble 2",
  "Synth Strings 1",
  "Synth Strings 2",
  "Choir Aahs",
  "VoiceGroup Oohs",
  "Synth Choir",
  "Orchestra Hit",
  "Trumpet",
  "Trombone",
  "Tuba",
  "Muted Trumpet",
  "French Horn",
  "Brass Section",
  "Synth Brass 1",
  "Synth Brass 2",
  "Soprano Sax",
  "Alto Sax",
  "Tenor Sax",
  "Baritone Sax",
  "Oboe",
  "English Horn",
  "Bassoon",
  "Clarinet",
  "Piccolo",
  "Flute",
  "Recorder",
  "Pan Flute",
  "Blown Bottle",
  "Shakuhachi",
  "Whistle",
  "Ocarina",
  "Lead 1 (square)",
  "Lead 2 (sawtooth)",
  "Lead 3 (calliope)",
  "Lead 4 (chiff)",
  "Lead 5 (charang)",
  "Lead 6 (voice)",
  "Lead 7 (fifths)",
  "Lead 8 (bass + lead)",
  "Pad 1 (new age)",
  "Pad 2 (warm)",
  "Pad 3 (polysynth)",
  "Pad 4 (choir)",
  "Pad 5 (bowed)",
  "Pad 6 (metallic)",
  "Pad 7 (halo)",
  "Pad 8 (sweep)",
  "FX 1 (rain)",
  "FX 2 (soundtrack)",
  "FX 3 (crystal)",
  "FX 4 (atmosphere)",
  "FX 5 (brightness)",
  "FX 6 (goblins)",
  "FX 7 (echoes)",
  "FX 8 (sci-fi)",
  "Sitar",
  "Banjo",
  "Shamisen",
  "Koto",
  "Kalimba",
  "Bagpipe",
  "Fiddle",
  "Shanai",
  "Tinkle Bell",
  "Agogo",
  "Steel Drums",
  "Woodblock",
  "Taiko Drum",
  "Melodic Tom",
  "Synth Drum",
  "Reverse Cymbal",
  "Guitar Fret Noise",
  "Breath Noise",
  "Seashore",
  "Bird Tweet",
  "Telephone Ring",
  "Attack Helicopter",
  "Applause",
  "Gunshot"
];

// Function to get instrument name (like the professional player)
export const getMidiInstrumentName = (program: number, channel?: number): string => {
  // Special handling for Channel 10 (drums)
  if (channel === 9) { // Channel 10 (0-indexed)
    // Channel 10 is always drums, regardless of program number
    if (program === 0) return "Standard Kit";
    if (program === 8) return "Room Kit";
    if (program === 16) return "Power Kit";
    if (program === 24) return "Electronic Kit";
    if (program === 25) return "TR-808 Kit";
    if (program === 32) return "Jazz Kit";
    if (program === 40) return "Brush Kit";
    if (program === 48) return "Orchestra Kit";
    if (program === 56) return "Sound Effects";
    return `Drum Kit ${program}`;
  }
  
  // Use General MIDI names for other channels
  return midiPatchNames[program] || `Unknown Instrument (${program})`;
};

export interface NoteEvent {
  time: number;
  duration: number;
  pitch: number;
  velocity: number;
}

export interface InstrumentInfo {
  channel: number;
  instrument: number;
  name: string;
  trackName?: string;
  noteCount: number;
  timeRange?: { start: number; end: number };
  notes: NoteEvent[];
  muted?: boolean;
}

// Helper function to process note off events
const processNoteOff = (
  channel: number,
  pitch: number,
  endTicks: number,
  activeNotes: Map<number, Map<number, { startTicks: number; velocity: number }>>,
  instruments: Map<number, InstrumentInfo>,
  ticksPerQuarter: number
) => {
  const channelNotes = activeNotes.get(channel);
  if (channelNotes && channelNotes.has(pitch)) {
    const noteInfo = channelNotes.get(pitch)!;
    const startTime = noteInfo.startTicks / ticksPerQuarter * 0.5;
    const endTime = endTicks / ticksPerQuarter * 0.5;
    const duration = Math.max(0.1, endTime - startTime);
    
    const noteEvent: NoteEvent = {
      time: startTime,
      duration,
      pitch,
      velocity: noteInfo.velocity
    };
    
    instruments.get(channel)?.notes.push(noteEvent);
    channelNotes.delete(pitch);
  }
};

export const parseMidiInstruments = async (midiFile: ArrayBuffer): Promise<InstrumentInfo[]> => {
  try {
    const data = new Uint8Array(midiFile);
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
    read32(); // Skip header length
    read16(); // Skip format
    const trackCount = read16();
    const ticksPerQuarter = read16();

    const instruments = new Map<number, InstrumentInfo>();
    const activeNotes = new Map<number, Map<number, { startTicks: number; velocity: number }>>();

    // Process each track
    for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
      // Validate track header
      if (data[pos++] !== 77 || data[pos++] !== 84 || data[pos++] !== 114 || data[pos++] !== 107) {
        continue;
      }

      const trackLength = read32();
      const trackEnd = pos + trackLength;
      let trackTicks = 0;
      let runningStatus = 0;
      let trackName: string | undefined;

      // Process track events
      while (pos < trackEnd) {
        const deltaTime = readVarLength();
        trackTicks += deltaTime;
        
        let command = read8();
        if (command < 0x80) {
          pos--;
          command = runningStatus;
        } else {
          runningStatus = command;
        }

        const messageType = command & 0xF0;
        const channel = command & 0x0F;

        if (messageType === 0xC0) {
          // Program Change (instrument selection)
          const instrument = read8();
          const instrumentName = getMidiInstrumentName(instrument, channel);
          
          if (!instruments.has(channel)) {
            instruments.set(channel, {
              channel,
              instrument,
              name: instrumentName,
              trackName: trackName,
              noteCount: 0,
              notes: []
            });
          } else {
            const existing = instruments.get(channel)!;
            existing.instrument = instrument;
            existing.name = instrumentName;
            if (trackName) existing.trackName = trackName;
          }
        } else if (command === 0xFF) {
          // Meta event
          const metaType = read8();
          const metaLength = readVarLength();
          
          if (metaType === 0x03) {
            // Track Name
            const nameBytes = data.slice(pos, pos + metaLength);
            trackName = new TextDecoder().decode(nameBytes);
            pos += metaLength;
          } else {
            pos += metaLength;
          }
        } else if (messageType === 0x90) {
          // Note On
          const pitch = read8();
          const velocity = read8();
          
          if (velocity > 0) {
            // Initialize channel if needed
            if (!activeNotes.has(channel)) {
              activeNotes.set(channel, new Map());
            }
            if (!instruments.has(channel)) {
              instruments.set(channel, {
                channel,
                instrument: 0,
                name: getMidiInstrumentName(0, channel),
                trackName: trackName,
                noteCount: 0,
                notes: []
              });
            }
            
            // Track active note
            activeNotes.get(channel)!.set(pitch, { startTicks: trackTicks, velocity });
            instruments.get(channel)!.noteCount++;
          } else {
            // Velocity 0 = note off
            processNoteOff(channel, pitch, trackTicks, activeNotes, instruments, ticksPerQuarter);
          }
        } else if (messageType === 0x80) {
          // Note Off
          const pitch = read8();
          read8(); // Skip velocity
          processNoteOff(channel, pitch, trackTicks, activeNotes, instruments, ticksPerQuarter);
        } else if (messageType === 0xA0 || messageType === 0xB0 || messageType === 0xE0) {
          // Aftertouch, Control Change, Pitch Bend (2 bytes)
          read8();
          read8();
        } else if (messageType === 0xD0) {
          // Channel Pressure (1 byte)
          read8();
        } else if (command >= 0xF0) {
          // System exclusive
          const sysexLength = readVarLength();
          pos += sysexLength;
        }
      }
    }

    // Process any remaining active notes
    activeNotes.forEach((channelNotes, channel) => {
      channelNotes.forEach((noteInfo, pitch) => {
        const startTime = noteInfo.startTicks / ticksPerQuarter * 0.5;
        const noteEvent: NoteEvent = {
          time: startTime,
          duration: 0.5, // Default duration
          pitch,
          velocity: noteInfo.velocity
        };
        instruments.get(channel)?.notes.push(noteEvent);
      });
    });

    // Calculate time ranges and sort notes
    instruments.forEach((instrument) => {
      if (instrument.notes.length > 0) {
        const times = instrument.notes.map(n => n.time);
        const endTimes = instrument.notes.map(n => n.time + n.duration);
        instrument.timeRange = {
          start: Math.min(...times),
          end: Math.max(...endTimes)
        };
        // Sort notes by time
        instrument.notes.sort((a, b) => a.time - b.time);
      }
    });

    // Log summary of what we found
    console.log('=== MIDI Instrument Parsing Summary ===');
    instruments.forEach((instrument) => {
      const gmName = getMidiInstrumentName(instrument.instrument, instrument.channel);
      const isCustom = instrument.name !== gmName;
      console.log(`Channel ${instrument.channel + 1}: ${instrument.name} ${isCustom ? '(CUSTOM)' : '(GM)'} [Program ${instrument.instrument}]`);
    });
    console.log('=====================================');

    return Array.from(instruments.values()).sort((a, b) => a.channel - b.channel);
  } catch (error) {
    console.error('Error parsing MIDI instruments:', error);
    return [];
  }
}; 