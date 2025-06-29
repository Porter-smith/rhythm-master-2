import React, { useEffect, useState } from 'react';
import { Piano } from 'lucide-react';
import { parseMidiInstruments, InstrumentInfo } from '../../utils/midiParser';

interface InstrumentSelectorPanelProps {
  midiFile: ArrayBuffer | null;
  onSelectInstrument: (channel: number, instrument: number, name: string) => void;
  selectedChannel: number | null;
}

export const InstrumentSelectorPanel: React.FC<InstrumentSelectorPanelProps> = ({ midiFile, onSelectInstrument, selectedChannel }) => {
  const [instruments, setInstruments] = useState<InstrumentInfo[]>([]);

  useEffect(() => {
    if (!midiFile) {
      setInstruments([]);
      return;
    }
    
    const loadInstruments = async () => {
      try {
        const instrumentData = await parseMidiInstruments(midiFile);
        setInstruments(instrumentData);
      } catch (error) {
        console.error('Error parsing MIDI instruments:', error);
        setInstruments([]);
      }
    };
    
    loadInstruments();
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
            onClick={() => onSelectInstrument(instrument.channel, instrument.instrument, instrument.name)}
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