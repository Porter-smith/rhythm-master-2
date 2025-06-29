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

// Function to get GM instrument group/category name (no synth needed)
export const getInstrumentGroup = (program: number, channel?: number): string => {
  // Special handling for Channel 10 (drums)
  if (channel === 9) { // Channel 10 (0-indexed)
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
  
  return midiPatchNames[program] || `Unknown Instrument (${program})`;
};

// Function to get actual SoundFont preset name from synth
export const getInstrumentName = (synth: any, program: number, channel?: number): string => {
  try {
    console.log('🔍 getInstrumentName called:', { program, channel, hasSynth: !!synth, hasManager: !!synth?.soundfontManager });
    
    if (!synth?.soundfontManager) {
      console.log('❌ No soundfontManager available');
      return 'Unknown';
    }

    const bank = 0; // Default bank
    const isXG = false; // Default to GM
    
    console.log('🔍 Getting preset for:', { bank, program, isXG, channel });
    
    // Special handling for Channel 10 (drums)
    if (channel === 9) {
      const drumBank = 128; // GM2/XG drum bank
      console.log('🥁 Getting drum preset for bank:', drumBank, 'program:', program);
      const p = synth.soundfontManager.getPreset(drumBank, program, isXG);
      console.log('🥁 Drum preset result:', p);
      if (p?.preset?.presetName) {
        console.log('✅ Found drum preset name:', p.preset.presetName);
        return p.preset.presetName;
      }
      return 'Unknown Drum Kit';
    }

    // Get preset for regular instruments
    const p = synth.soundfontManager.getPreset(bank, program, isXG);
    console.log('🎹 Preset result:', p);
    
    if (p?.preset?.presetName) {
      console.log('✅ Found preset name:', p.preset.presetName);
      return p.preset.presetName;
    }

    // Check if we can get preset list
    if (synth.soundfontManager.getPresetList) {
      const presetList = synth.soundfontManager.getPresetList();
      console.log('📋 Available presets:', presetList);
      
      // Try to find matching preset
      const matchingPreset = presetList.find((preset: any) => 
        preset.program === program && preset.bank === bank
      );
      
      if (matchingPreset) {
        console.log('✅ Found matching preset from list:', matchingPreset.presetName);
        return matchingPreset.presetName;
      }
    }

    console.log('❌ No preset found');
    return 'Unknown';
  } catch (error) {
    console.warn('Error getting SoundFont preset name:', error);
    return 'Unknown';
  }
};

// Function to get instrument name (like the professional player)
export const getMidiInstrumentName = (program: number, channel?: number): string => {
  // Special handling for Channel 10 (drums)
  if (channel === 9) { // Channel 10 (0-indexed)
    // TODO: This should be dynamically loaded from SoundFont files instead of hardcoded
    // Following SpessaSynth's approach: SoundFont files contain drum kit names in their preset definitions
    // The parser should extract presetName from the SoundFont's preset header chunk (PHDR)
    // For now, using hardcoded General MIDI drum kit names as fallback
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
  
  // TODO: This should also support grouping multiple SoundFont presets under GM categories
  // Example: Multiple "Steinway D" variations (000 000, 001 000) should be grouped under "Acoustic Grand Piano"
  // The UI should show:
  //   Acoustic Grand Piano
  //    000 000 Steinway D
  //    001 000 Steinway D L/R
  // Instead of just showing individual preset names
  // 
  // How SpessaSynth does it:
  // 1. Group presets by program number (GM instrument type)
  // 2. Show GM category name as header (e.g., "Acoustic Grand Piano" for program 0)
  // 3. List all presets with same program number from different banks underneath
  // 4. Multiple banks can have same program number, creating variations of same instrument type
  // 
  // Example: Both "000 000 Steinway D" and "001 000 Steinway D L/R" have program=0,
  // so they're grouped under "Acoustic Grand Piano" (GM program 0)
  //
  // EXACT GROUPING LOGIC (from synthui_selector.js):
  // Input: Array of {name: string, bank: number, program: number} presets
  // 1. Sort presets by program number first, then by bank number
  // 2. For each unique program number, create a group:
  //    - Header: GM instrument name (e.g., "Acoustic Grand Piano" for program 0)
  //    - Sub-items: All presets with that program number, showing "bank program presetName"
  // 3. Display structure:
  //    Acoustic Grand Piano          // GM category header
  //      000 000 Steinway D         // Bank 0, Program 0, Preset name
  //      001 000 Steinway D L/R     // Bank 1, Program 0, Preset name
  //    Bright Acoustic Piano        // GM category header (program 1)
  //      000 001 Bright Piano       // Bank 0, Program 1, Preset name
  //      001 001 Rhodes Piano       // Bank 1, Program 1, Preset name
  //
  // DRUMS ARE HANDLED DIFFERENTLY:
  // - Drums are always on Channel 10 (index 9) regardless of program number
  // - Drum presets are identified by bank=128 (GM2/XG convention)
  // - Each program number represents a different drum kit (Standard, Room, Power, etc.)
  // - Drum presets are shown in a separate "percussionList" in SpessaSynth
  // - No grouping under GM categories - each drum kit is its own preset
  //
  // Reference SpessaSynth files:
  // https://github.com/spessasus/SpessaSynth/blob/master/src/website/js/synthesizer_ui/methods/synthui_selector.js#L1
  // - https://github.com/spessasus/spessasynth_core/blob/5e9d4d46de2c9165134dbbc741c9db6b3fac7d1f/src/synthetizer/audio_engine/engine_components/soundfont_manager.js (preset list generation)
  // - https://github.com/spessasus/spessasynth_core/blob/5e9d4d46de2c9165134dbbc741c9db6b3fac7d1f/src/synthetizer/audio_engine/engine_methods/soundfont_management/update_preset_list.js (preset list events)
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