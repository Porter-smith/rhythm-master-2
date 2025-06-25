import React, { useEffect, useState } from 'react';
import { Piano } from 'lucide-react';

// MIDI instrument names
const getMidiInstrumentName = (programNumber: number): string => {
  const instruments = [
    'Acoustic Grand Piano', 'Bright Acoustic Piano', 'Electric Grand Piano', 'Honky-tonk Piano',
    'Electric Piano 1', 'Electric Piano 2', 'Harpsichord', 'Clavi',
    'Celesta', 'Glockenspiel', 'Music Box', 'Vibraphone', 'Marimba', 'Xylophone', 'Tubular Bells', 'Dulcimer',
    'Drawbar Organ', 'Percussive Organ', 'Rock Organ', 'Church Organ', 'Reed Organ', 'Accordion', 'Harmonica', 'Tango Accordion',
    'Acoustic Guitar (nylon)', 'Acoustic Guitar (steel)', 'Electric Guitar (jazz)', 'Electric Guitar (clean)',
    'Electric Guitar (muted)', 'Overdriven Guitar', 'Distortion Guitar', 'Guitar harmonics',
    'Acoustic Bass', 'Electric Bass (finger)', 'Electric Bass (pick)', 'Fretless Bass',
    'Slap Bass 1', 'Slap Bass 2', 'Synth Bass 1', 'Synth Bass 2',
    'Violin', 'Viola', 'Cello', 'Contrabass', 'Tremolo Strings', 'Pizzicato Strings',
    'Orchestral Harp', 'Timpani',
    'String Ensemble 1', 'String Ensemble 2', 'Synth Strings 1', 'Synth Strings 2',
    'Choir Aahs', 'Voice Oohs', 'Synth Voice', 'Orchestra Hit',
    'Trumpet', 'Trombone', 'Tuba', 'Muted Trumpet', 'French Horn', 'Brass Section', 'Synth Brass 1', 'Synth Brass 2',
    'Soprano Sax', 'Alto Sax', 'Tenor Sax', 'Baritone Sax', 'Oboe', 'English Horn', 'Bassoon', 'Clarinet',
    'Piccolo', 'Flute', 'Recorder', 'Pan Flute', 'Blown Bottle', 'Shakuhachi', 'Whistle', 'Ocarina',
    'Lead 1 (square)', 'Lead 2 (sawtooth)', 'Lead 3 (calliope)', 'Lead 4 (chiff)',
    'Lead 5 (charang)', 'Lead 6 (voice)', 'Lead 7 (fifths)', 'Lead 8 (bass + lead)',
    'Pad 1 (new age)', 'Pad 2 (warm)', 'Pad 3 (polysynth)', 'Pad 4 (choir)',
    'Pad 5 (bowed)', 'Pad 6 (metallic)', 'Pad 7 (halo)', 'Pad 8 (sweep)',
    'FX 1 (rain)', 'FX 2 (soundtrack)', 'FX 3 (crystal)', 'FX 4 (atmosphere)',
    'FX 5 (brightness)', 'FX 6 (goblins)', 'FX 7 (echoes)', 'FX 8 (sci-fi)',
    'Sitar', 'Banjo', 'Shamisen', 'Koto', 'Kalimba', 'Bag pipe', 'Fiddle', 'Shanai',
    'Tinkle Bell', 'Agogo', 'Steel Drums', 'Woodblock', 'Taiko Drum', 'Melodic Tom', 'Synth Drum', 'Reverse Cymbal',
    'Guitar Fret Noise', 'Breath Noise', 'Seashore', 'Bird Tweet', 'Telephone Ring', 'Helicopter', 'Applause', 'Gunshot'
  ];
  return instruments[programNumber] || `Unknown Instrument (${programNumber})`;
};

interface InstrumentInfo {
  channel: number;
  instrument: number;
  name: string;
  trackName?: string;
  noteCount: number;
}

interface InstrumentSelectorPanelProps {
  midiFile: ArrayBuffer | null;
  onSelectInstrument: (channel: number, instrument: number) => void;
  selectedChannel: number | null;
}

export const InstrumentSelectorPanel: React.FC<InstrumentSelectorPanelProps> = ({ midiFile, onSelectInstrument, selectedChannel }) => {
  const [instruments, setInstruments] = useState<InstrumentInfo[]>([]);

  useEffect(() => {
    if (!midiFile) {
      setInstruments([]);
      return;
    }
    // Parse MIDI file for instruments
    const parseMidiInstruments = (midiFile: ArrayBuffer): InstrumentInfo[] => {
      try {
        const data = new Uint8Array(midiFile);
        let pos = 0;
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
        if (data[0] !== 77 || data[1] !== 84 || data[2] !== 104 || data[3] !== 100) return [];
        pos = 4;
        read32(); // header length
        read16(); // format
        const trackCount = read16();
        read16(); // ticks per quarter
        const instruments = new Map<number, InstrumentInfo>();
        // Parse tracks
        for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
          if (data[pos++] !== 77 || data[pos++] !== 84 || data[pos++] !== 114 || data[pos++] !== 107) continue;
          const trackLength = read32();
          const trackEnd = pos + trackLength;
          let runningStatus = 0;
          let trackName: string | undefined;
          while (pos < trackEnd) {
            readVarLength();
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
              const instrument = read8();
              const instrumentName = getMidiInstrumentName(instrument);
              if (!instruments.has(channel)) {
                instruments.set(channel, {
                  channel,
                  instrument,
                  name: instrumentName,
                  trackName,
                  noteCount: 0
                });
              } else {
                const existing = instruments.get(channel)!;
                existing.instrument = instrument;
                existing.name = instrumentName;
                if (trackName) existing.trackName = trackName;
              }
            } else if (command === 0xFF) {
              const metaType = read8();
              const metaLength = readVarLength();
              if (metaType === 0x03) {
                const nameBytes = data.slice(pos, pos + metaLength);
                trackName = new TextDecoder().decode(nameBytes);
                pos += metaLength;
              } else {
                pos += metaLength;
              }
            } else if (messageType === 0x90) {
              read8(); // note
              const velocity = read8();
              if (velocity > 0) {
                if (!instruments.has(channel)) {
                  instruments.set(channel, {
                    channel,
                    instrument: 0,
                    name: getMidiInstrumentName(0),
                    trackName,
                    noteCount: 1
                  });
                } else {
                  instruments.get(channel)!.noteCount++;
                }
              }
            } else if (messageType === 0x80 || messageType === 0xA0 || messageType === 0xB0 || messageType === 0xE0) {
              read8(); read8();
            } else if (messageType === 0xD0) {
              read8();
            } else if (command >= 0xF0) {
              const sysexLength = readVarLength();
              pos += sysexLength;
            }
          }
        }
        return Array.from(instruments.values()).sort((a, b) => a.channel - b.channel);
      } catch {
        return [];
      }
    };
    setInstruments(parseMidiInstruments(midiFile));
  }, [midiFile]);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20" style={{ maxHeight: 520, minHeight: 320, overflowY: 'auto' }}>
      <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
        <Piano className="w-5 h-5 text-green-400" />
        <span>Choose Your Instrument</span>
      </h2>
      <div className="space-y-3">
        {instruments.length === 0 && (
          <div className="text-white/60 text-sm">No instruments found in this MIDI file.</div>
        )}
        {instruments.map((instrument) => (
          <button
            key={instrument.channel}
            onClick={() => onSelectInstrument(instrument.channel, instrument.instrument)}
            className={`w-full text-left bg-white/5 rounded-lg p-4 border transition-all duration-200 flex items-center justify-between space-x-4 ${
              selectedChannel === instrument.channel ? 'border-green-400/70 bg-green-400/10 ring-2 ring-green-400' : 'border-white/10 hover:border-blue-400'
            }`}
          >
            <div>
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${selectedChannel === instrument.channel ? 'bg-green-500 text-white' : 'bg-blue-500/20 text-blue-400'}`}>{instrument.channel + 1}</div>
                <div>
                  <div className="text-white font-medium">{instrument.name}</div>
                  <div className="text-white/60 text-sm">Channel {instrument.channel + 1} • Program {instrument.instrument}</div>
                </div>
              </div>
              {instrument.trackName && (
                <div className="text-white/70 text-xs italic mt-1">Track: "{instrument.trackName}"</div>
              )}
            </div>
            <div className="text-right">
              <div className="text-white font-mono text-sm">{instrument.noteCount}</div>
              <div className="text-white/60 text-xs">notes</div>
              {selectedChannel === instrument.channel && (
                <div className="text-green-400 text-xs mt-1 font-bold">Selected</div>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}; 