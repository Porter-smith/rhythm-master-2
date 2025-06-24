import React, { useState } from 'react';
import { Piano, KeyboardShortcuts, MidiNumbers } from 'react-piano';
import 'react-piano/dist/styles.css';

const buildOctave = (base: number) =>
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((n) => n + base);

const isBlack = (midi: number) => [1, 3, 6, 8, 10].includes(midi % 12);

type PianoKeyboardNote = {
  note: number;
  velocity: number;
  detune: number;
  time?: number;
  duration?: number;
};

interface PianoKeyboardProps {
  className?: string;
  borderColor?: string;
  onPress: (note: PianoKeyboardNote) => void;
  onRelease?: (midi: number) => void;
  playingNotes?: Set<number>;
}

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  className,
  borderColor = "border-blue-500",
  onPress,
  onRelease,
  playingNotes = new Set()
}) => {
  const [velocity, setVelocity] = useState(100);
  const [detune, setDetune] = useState(0);
  const [octave, setOctave] = useState(60); // Middle C octave
  const [sustain, setSustain] = useState(false);

  const isPlaying = (midi: number) => playingNotes.has(midi);

  function release(midi: number) {
    if (!sustain && onRelease) onRelease(midi);
  }

  const playTestScale = () => {
    // Play a simple C major scale sequentially
    const scale = [60, 62, 64, 65, 67, 69, 71, 72]; // C D E F G A B C
    
    scale.forEach((midi, index) => {
      // Schedule each note to play after the previous one
      setTimeout(() => {
        console.log(`Playing note ${index + 1}: ${midi}`);
        onPress({
          note: midi,
          velocity: Math.floor(60 + 40 * Math.random()),
          detune: 0,
          duration: 0.4, // Note duration
        });
        
        // Auto-release the note after duration (only if onRelease is provided)
        if (onRelease) {
          setTimeout(() => {
            onRelease(midi);
          }, 400);
        }
      }, index * 500); // 500ms between each note (was the issue - all notes had same base time)
    });
  };

  // Define note range for react-piano
  const noteRange = {
    first: octave,
    last: octave + 24, // 2 octaves
  };

  // Create keyboard shortcuts
  const keyboardShortcuts = KeyboardShortcuts.create({
    firstNote: noteRange.first,
    lastNote: noteRange.last,
    keyboardConfig: KeyboardShortcuts.HOME_ROW,
  });

  // Handle note play
  const playNote = (midiNumber: number) => {
    onPress({
      note: midiNumber,
      velocity,
      detune,
    });
  };

  // Handle note stop
  const stopNote = (midiNumber: number) => {
    release(midiNumber);
  };

  return (
    <div className={className}>
      {/* Piano Keys */}
      <div className={`relative bg-gray-900 rounded-lg p-4 border-4 ${borderColor}`}>
        <Piano
          noteRange={noteRange}
          width={800}
          playNote={playNote}
          stopNote={stopNote}
          activeNotes={Array.from(playingNotes)}
          keyboardShortcuts={keyboardShortcuts}
          className="react-piano"
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center mt-4 p-4 bg-white/10 backdrop-blur-sm rounded-lg border border-white/20">
        {/* Octave Controls */}
        <div className="flex items-center space-x-2">
          <span className="text-white font-semibold">Octave:</span>
          <span className="text-white/70 font-mono">{octave}-{octave + 23}</span>
          <button
            className="bg-blue-500 hover:bg-blue-400 text-white font-bold py-1 px-3 rounded transition-colors duration-200"
            onClick={() => setOctave(Math.max(12, octave - 12))}
          >
            -
          </button>
          <button
            className="bg-blue-500 hover:bg-blue-400 text-white font-bold py-1 px-3 rounded transition-colors duration-200"
            onClick={() => setOctave(Math.min(96, octave + 12))}
          >
            +
          </button>
        </div>

        {/* Velocity Control */}
        <div className="flex items-center space-x-2">
          <span className="text-white font-semibold">Velocity:</span>
          <span className="text-white/70 font-mono w-8">{velocity}</span>
          <input
            type="range"
            min={1}
            max={127}
            value={velocity}
            onChange={(e) => setVelocity(e.target.valueAsNumber)}
            className="w-24 accent-blue-500"
          />
        </div>

        {/* Detune Control */}
        <div className="flex items-center space-x-2">
          <span className="text-white font-semibold">Detune:</span>
          <span className="text-white/70 font-mono w-8">{detune}</span>
          <input
            type="range"
            min={-100}
            max={100}
            value={detune}
            onChange={(e) => setDetune(e.target.valueAsNumber)}
            className="w-24 accent-blue-500"
          />
        </div>

        {/* Sustain */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="sustain"
            checked={sustain}
            onChange={(e) => setSustain(e.target.checked)}
            className="w-4 h-4 accent-blue-500"
          />
          <label htmlFor="sustain" className="text-white font-semibold">Sustain</label>
        </div>

        {/* Test Button */}
        <button
          className="bg-green-500 hover:bg-green-400 text-white font-bold py-2 px-4 rounded transition-colors duration-200"
          onClick={playTestScale}
        >
          Test Scale
        </button>
      </div>
    </div>
  );
};