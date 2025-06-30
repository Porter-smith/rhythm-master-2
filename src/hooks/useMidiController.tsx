import React, { useEffect, useState } from 'react';
import { WebMidi, Input } from 'webmidi';
import { useSettingsStore } from '../stores/settingsStore';

export interface MidiNote {
  note: number;
  velocity: number;
  channel: number;
}

export interface MidiStop {
  stopId: number;
  channel: number;
}

export interface MidiInstrument {
  start: (note: MidiNote) => void;
  stop: (note: MidiStop) => void;
}

interface ConnectMidiProps {
  instrument: MidiInstrument;
}

export const ConnectMidi: React.FC<ConnectMidiProps> = ({ instrument }) => {
  const [midiEnabled, setMidiEnabled] = useState(false);
  const [midiInputs, setMidiInputs] = useState<Input[]>([]);
  const [error, setError] = useState<string>('');

  // Get the stored device ID and setter from the settings store
  const selectedMidiDevice = useSettingsStore(state => state.selectedMidiDevice);
  const setSelectedMidiDevice = useSettingsStore(state => state.setSelectedMidiDevice);

  // Initialize WebMidi
  useEffect(() => {
    let isSubscribed = true; // For cleanup handling

    const initializeMidi = async () => {
      try {
        if (!WebMidi.enabled) {
          await WebMidi.enable();
        }
        
        if (isSubscribed) {
          setMidiEnabled(true);
          setMidiInputs(WebMidi.inputs);
          
          // If we have a stored device, try to reconnect to it
          if (selectedMidiDevice) {
            const storedDevice = WebMidi.inputs.find(input => input.name === selectedMidiDevice);
            if (storedDevice) {
              console.log(`🎹 Reconnecting to stored device: ${selectedMidiDevice}`);
            } else {
              console.log(`🎹 Stored device ${selectedMidiDevice} not found`);
              setSelectedMidiDevice(null); // Clear the stored device if not found
            }
          }
        }
      } catch (err) {
        if (isSubscribed) {
          setError('WebMidi could not be enabled.');
          console.error(err);
        }
      }
    };

    initializeMidi();

    // Cleanup function
    return () => {
      isSubscribed = false;
      // Only disable if we enabled it
      if (midiEnabled) {
        // Remove all listeners first
        WebMidi.removeListener();
        try {
          WebMidi.disable();
        } catch (err) {
          console.log('WebMidi cleanup:', err);
        }
      }
    };
  }, []); // Remove selectedMidiDevice from dependencies

  // Handle device connections/disconnections
  useEffect(() => {
    if (!midiEnabled) return;

    const handleDeviceConnection = () => {
      setMidiInputs(WebMidi.inputs);
    };

    WebMidi.addListener('connected', handleDeviceConnection);
    WebMidi.addListener('disconnected', handleDeviceConnection);

    return () => {
      if (WebMidi.enabled) {
        WebMidi.removeListener('connected', handleDeviceConnection);
        WebMidi.removeListener('disconnected', handleDeviceConnection);
      }
    };
  }, [midiEnabled]);

  // Handle MIDI input events
  useEffect(() => {
    if (!midiEnabled || !selectedMidiDevice) return;

    const input = WebMidi.inputs.find(input => input.name === selectedMidiDevice);
    if (!input) return;

    const handleNoteOn = (e: any) => {
      instrument.start({
        note: e.note.number,
        velocity: e.velocity,
        channel: e.channel
      });
    };

    const handleNoteOff = (e: any) => {
      instrument.stop({
        stopId: e.note.number,
        channel: e.channel
      });
    };

    input.addListener('noteon', handleNoteOn);
    input.addListener('noteoff', handleNoteOff);

    return () => {
      if (input.hasListener('noteon', handleNoteOn)) {
        input.removeListener('noteon', handleNoteOn);
      }
      if (input.hasListener('noteoff', handleNoteOff)) {
        input.removeListener('noteoff', handleNoteOff);
      }
    };
  }, [midiEnabled, selectedMidiDevice, instrument]);

  const handleInputChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const deviceName = event.target.value;
    setSelectedMidiDevice(deviceName || null);
  };

  if (error) {
    return (
      <div className="text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${midiEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-white/70">
          {midiEnabled ? 'MIDI Enabled' : 'MIDI Disabled'}
        </span>
      </div>

      <select
        value={selectedMidiDevice || ''}
        onChange={handleInputChange}
        className="w-full bg-black/30 text-white border border-white/20 rounded-lg p-2"
      >
        <option value="">Select MIDI Input</option>
        {midiInputs.map(input => (
          <option key={input.id} value={input.name}>
            {input.name}
          </option>
        ))}
      </select>

      {selectedMidiDevice && (
        <div className="text-green-400">
          ✓ Connected to {selectedMidiDevice}
        </div>
      )}
    </div>
  );
}; 