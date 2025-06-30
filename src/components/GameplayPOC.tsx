import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Play, Pause } from 'lucide-react';

interface Note {
  note: number;
  x: number;
  length: number;
  hit: boolean;
  missed: boolean;
  start_time: number;
  ended?: boolean;
  hit_time?: number;
}

interface Song {
  name: string;
  bpm: number;
  duration: number;
  difficulties: string[];
  selected_difficulty: number;
}

interface GameplayPOCProps {
  onBack: () => void;
}

// Staff parameters
const STAFF_HEIGHT = 200;
const STAFF_TOP_MARGIN = 100;
const LINE_SPACING = STAFF_HEIGHT / 6;
const POSITION_OFF_SCREEN = 500;

// MIDI note ranges
const TREBLE_MIN = 60;
const TREBLE_MAX = 84;
const BASS_MIN = 36;
const BASS_MAX = 59;

// MIDI note number to staff position mapping
const TREBLE_NOTES: { [key: number]: string } = {
  60: 'C4', 61: 'C#4', 62: 'D4', 63: 'D#4', 64: 'E4', 65: 'F4',
  66: 'F#4', 67: 'G4', 68: 'G#4', 69: 'A4', 70: 'A#4', 71: 'B4',
  72: 'C5', 73: 'C#5', 74: 'D5', 75: 'D#5', 76: 'E5', 77: 'F5',
  78: 'F#5', 79: 'G5', 80: 'G#5', 81: 'A5', 82: 'A#5', 83: 'B5', 84: 'C6'
};

const BASS_NOTES: { [key: number]: string } = {
  36: 'C2', 37: 'C#2', 38: 'D2', 39: 'D#2', 40: 'E2', 41: 'F2',
  42: 'F#2', 43: 'G2', 44: 'G#2', 45: 'A2', 46: 'A#2', 47: 'B2',
  48: 'C3', 49: 'C#3', 50: 'D3', 51: 'D#3', 52: 'E3', 53: 'F3',
  54: 'F#3', 55: 'G3', 56: 'G#3', 57: 'A3', 58: 'A#3', 59: 'B3'
};

// Sample song data
const SAMPLE_SONG: Song = {
  name: "Sample Song",
  bpm: 120,
  duration: 60,
  difficulties: ["easy.mid", "medium.mid", "hard.mid"],
  selected_difficulty: 0
};

// Sample MIDI events (C major scale, each note a full measure, first note starts at second measure)
const SAMPLE_MIDI_EVENTS = [
  [4, 'note_start', 60, 4],   // C4, measure 2
  [8, 'note_start', 62, 4],  // D4, measure 3
  [12, 'note_start', 64, 4], // E4, measure 4
  [16, 'note_start', 65, 4], // F4, measure 5
  [20, 'note_start', 67, 4], // G4, measure 6
  [24, 'note_start', 69, 4], // A4, measure 7
  [28, 'note_start', 71, 4], // B4, measure 8
  [32, 'note_start', 72, 4], // C5, measure 9
];

export const GameplayPOC: React.FC<GameplayPOCProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [activeNotes, setActiveNotes] = useState<Note[]>([]);
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  const [newlyPressedKeys, setNewlyPressedKeys] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [hitNotes, setHitNotes] = useState(0);
  const [totalNotes, setTotalNotes] = useState(0);
  const [currentCombo, setCurrentCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [fullCombo, setFullCombo] = useState(true);
  const [showScore, setShowScore] = useState(false);

  // Game settings
  const scrollSpeed = (SAMPLE_SONG.bpm / 60) * LINE_SPACING * 2;

  // Helper functions
  const isSharpNote = (note: number): boolean => {
    if (TREBLE_MIN <= note && note <= TREBLE_MAX) {
      return TREBLE_NOTES[note]?.includes('#') || false;
    } else if (BASS_MIN <= note && note <= BASS_MAX) {
      return BASS_NOTES[note]?.includes('#') || false;
    }
    return false;
  };

  const processMidiEvents = (midiEvents: (string | number)[][], songBpm: number): Note[] => {
    const activeNotes: Note[] = [];
    const pixelsPerSecond = scrollSpeed;
    const secondsPerBeat = 60 / songBpm;
    
    midiEvents.forEach((event) => {
      const [eventTime, eventType, note, length] = event;
      if (eventType === 'note_start') {
        const noteLength = (length as number) * secondsPerBeat;
        const noteStartTime = (eventTime as number) * secondsPerBeat;
        const xPosition = POSITION_OFF_SCREEN + (noteStartTime * pixelsPerSecond);
        
        activeNotes.push({
          note: note as number,
          x: xPosition,
          length: noteLength,
          hit: false,
          missed: false,
          start_time: noteStartTime
        });
      }
    });
    
    return activeNotes;
  };

  const updateNotes = (notes: Note[], currentTime: number): Note[] => {
    return notes.map(note => {
      const timeSinceStart = currentTime - note.start_time;
      return {
        ...note,
        x: POSITION_OFF_SCREEN - (timeSinceStart * scrollSpeed)
      };
    });
  };

  const checkHitNotes = (notes: Note[], newlyPressedKeys: Set<number>): number => {
    let hitCount = 0;
    notes.forEach(note => {
      // Only allow hit if within hit window at note start AND key was just pressed
      if (
        Math.abs(gameTime - note.start_time) <= 0.2 && // 200ms window
        newlyPressedKeys.has(note.note) &&
        !note.hit &&
        !note.missed
      ) {
        note.hit = true;
        note.hit_time = gameTime;
        hitCount++;
      }
    });
    return hitCount;
  };

  const checkMissedNotes = (notes: Note[]): number => {
    let missedCount = 0;
    notes.forEach(note => {
      if (
        !note.hit &&
        !note.missed &&
        gameTime > note.start_time + 0.2 // 200ms window after note start
      ) {
        note.missed = true;
        missedCount++;
      }
    });
    return missedCount;
  };

  // Initialize game
  useEffect(() => {
    const initialNotes = processMidiEvents(SAMPLE_MIDI_EVENTS, SAMPLE_SONG.bpm);
    setActiveNotes(initialNotes);
    setTotalNotes(initialNotes.length);
  }, []);

  // Game loop
  useEffect(() => {
    if (!isPlaying || isPaused) return;

    const gameLoop = () => {
      const currentTime = performance.now();
      const newGameTime = (currentTime - startTimeRef.current) / 1000;
      setGameTime(newGameTime);

      // Update notes positions
      const updatedNotes = updateNotes(activeNotes, newGameTime);
      setActiveNotes(updatedNotes);

      // Check for hits using newly pressed keys
      const newHits = checkHitNotes(updatedNotes, newlyPressedKeys);
      if (newHits > 0) {
        setHitNotes(prev => prev + newHits);
        setCurrentCombo(prev => prev + newHits);
        setScore(prev => prev + newHits * 100 * (1 + (currentCombo + newHits) * 0.1));
      }

      // Clear newly pressed keys after checking for hits
      setNewlyPressedKeys(new Set());

      // Check for missed notes
      const missedNotes = checkMissedNotes(updatedNotes);
      if (missedNotes > 0) {
        setCurrentCombo(0);
        setFullCombo(false);
        setScore(prev => prev - missedNotes * 50);
      }

      // Update max combo
      setMaxCombo(prev => Math.max(prev, currentCombo + newHits));

      // Check if game is over
      if (newGameTime >= SAMPLE_SONG.duration) {
        setIsPlaying(false);
        setShowScore(true);
        return;
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isPaused, activeNotes, pressedKeys, newlyPressedKeys, currentCombo]);

  // Keyboard input handling
  const keyToNote: { [key: string]: number } = {
    'KeyZ': 60, // C4
    'KeyW': 61, // C#4
    'KeyX': 62, // D4
    'KeyE': 63, // D#4
    'KeyC': 64, // E4
    'KeyV': 65, // F4
    'KeyG': 66, // F#4
    'KeyB': 67, // G4
    'KeyH': 68, // G#4
    'KeyN': 69, // A4
    'KeyJ': 70, // A#4
    'KeyM': 71, // B4
    'Comma': 72, // C5
    // ... (add more as needed)
  };

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (keyToNote[event.code] !== undefined) {
      event.preventDefault();
      const note = keyToNote[event.code];
      setPressedKeys(prev => {
        const wasAlreadyPressed = prev.has(note);
        const next = new Set([...prev, note]);
        // Only add to newly pressed if it wasn't already pressed (prevents key repeat)
        if (!wasAlreadyPressed) {
          setNewlyPressedKeys(prevNewly => new Set([...prevNewly, note]));
        }
        return next;
      });
    }
    
    if (event.code === 'Space') {
      event.preventDefault();
      if (isPlaying) {
        setIsPaused(prev => !prev);
      } else {
        setIsPlaying(true);
        startTimeRef.current = performance.now();
      }
    }
    
    if (event.code === 'Escape') {
      setIsPaused(prev => !prev);
    }
  }, [isPlaying]);

  const handleKeyRelease = useCallback((event: KeyboardEvent) => {
    if (keyToNote[event.code] !== undefined) {
      const noteNum = keyToNote[event.code];
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(noteNum);
        return next;
      });
      // If a note is currently hit and not finished, mark as missed
      setActiveNotes(prevNotes => prevNotes.map(note => {
        if (
          note.note === noteNum &&
          note.hit &&
          !note.missed &&
          gameTime < note.start_time + note.length
        ) {
          return { ...note, missed: true };
        }
        return note;
      }));
    }
  }, [gameTime]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keyup', handleKeyRelease);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('keyup', handleKeyRelease);
    };
  }, [handleKeyPress, handleKeyRelease]);

  // Render game
  const renderGame = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Clear canvas with gradient background (same as GameplayScreen)
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw staff lines (original positioning)
    ctx.strokeStyle = '#ffffff40';
    ctx.lineWidth = 1;
    
    // Treble staff
    for (let i = 0; i < 5; i++) {
      const y = STAFF_TOP_MARGIN + i * LINE_SPACING;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Bass staff
    for (let i = 0; i < 5; i++) {
      const y = STAFF_TOP_MARGIN + STAFF_HEIGHT + i * LINE_SPACING;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Hit line (red line at 25% width)
    const hitLineX = width * 0.25;

    // Draw vertical measure and beat lines, synchronized with note scroll
    const secondsPerBeat = 60 / SAMPLE_SONG.bpm;
    const pixelsPerSecond = scrollSpeed;
    // The time at the hit line (where time = gameTime)
    const timeAtHitLine = gameTime;
    // The time at the left edge of the canvas
    const timeAtLeftEdge = timeAtHitLine - (hitLineX / pixelsPerSecond);
    // Draw enough lines to cover the canvas
    const totalBeats = Math.ceil(width / (secondsPerBeat * pixelsPerSecond)) + 8;
    for (let i = 0; i < totalBeats; i++) {
      // The time for this beat line
      const beatTime = Math.floor(timeAtLeftEdge / secondsPerBeat) * secondsPerBeat + i * secondsPerBeat;
      const x = hitLineX + (beatTime - timeAtHitLine) * pixelsPerSecond;
      if (x < 0 || x > width) continue;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      if (Math.round(beatTime / secondsPerBeat) % 4 === 0) {
        // Bold measure line
        ctx.strokeStyle = '#ffffff70';
        ctx.lineWidth = 3;
      } else {
        // Lighter beat line
        ctx.strokeStyle = '#ffffff30';
        ctx.lineWidth = 1;
      }
      ctx.stroke();
    }

    // Hit line (red line at 25% width)
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hitLineX, 0);
    ctx.lineTo(hitLineX, height);
    ctx.stroke();

    // Hit window (semi-transparent area)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(hitLineX - 20, 0, 40, height);

    // Draw notes as long rectangles for testing (1 measure = 4 beats)
    activeNotes.forEach(note => {
      const isTreble = note.note >= TREBLE_MIN && note.note <= TREBLE_MAX;
      const y = noteToY(note.note, isTreble);
      let color = '#4169E1';
      if (note.note < 60) color = '#DC143C';
      if (note.hit) color = '#32CD32';
      if (note.missed) color = '#FF0000';
      // For a note at time 0, left edge at hitLineX, width = 4 beats in pixels
      const pixelsPerSecond = scrollSpeed;
      const secondsPerBeat = 60 / SAMPLE_SONG.bpm;
      const noteStartX = hitLineX + (note.start_time - gameTime) * pixelsPerSecond;
      const noteWidth = 4 * secondsPerBeat * pixelsPerSecond;
      const noteHeight = LINE_SPACING; // Fill exactly between staff lines
      ctx.fillStyle = color;
      ctx.fillRect(noteStartX, y - noteHeight / 2, noteWidth, noteHeight);
      // Add sharp symbol if needed
      if (isSharpNote(note.note)) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial bold';
        ctx.textAlign = 'right';
        ctx.fillText('#', noteStartX - 6, y + 8);
      }
      // Draw note name centered on the note
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(getNoteNameFromPitch(note.note), noteStartX + noteWidth / 2, y + 5);
    });

    // Show pressed keys on the hit line
    pressedKeys.forEach(pitch => {
      const isTreble = pitch >= TREBLE_MIN && pitch <= TREBLE_MAX;
      const y = noteToY(pitch, isTreble);
      // Draw a bright highlight box for the pressed key at the hit line
      ctx.fillStyle = 'rgba(255, 255, 0, 0.8)'; // Bright yellow highlight
      ctx.fillRect(hitLineX - 25, y - 8, 50, 16);
      // Draw border
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(hitLineX - 25, y - 8, 50, 16);
      // If sharp, show # next to the box
      if (isSharpNote(pitch)) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial bold';
        ctx.textAlign = 'right';
        ctx.fillText('#', hitLineX + 30, y + 8);
      }
    });

    // Draw labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial bold';
    ctx.textAlign = 'left';
    ctx.fillText('Treble', 20, STAFF_TOP_MARGIN + 2);
    ctx.fillText('Bass', 20, STAFF_TOP_MARGIN + STAFF_HEIGHT + 2);

    // Draw UI (same style as GameplayScreen)
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.fillText(`Score: ${Math.floor(score)}`, width - 150, 20);
    ctx.fillText(`Combo: ${currentCombo}`, width - 150, 60);
    ctx.fillText(`BPM: ${SAMPLE_SONG.bpm}`, width - 150, 100);
    ctx.fillText(`Time: ${gameTime.toFixed(1)}s`, width - 150, 140);
  }, [activeNotes, pressedKeys, score, currentCombo, gameTime]);

  const noteToY = (note: number, isTreble: boolean): number => {
    if (isTreble) {
      const noteName = TREBLE_NOTES[note] || 'E4';
      const baseNote = 'E4';
      const staffBottom = STAFF_TOP_MARGIN + 4 * LINE_SPACING;
      
      const noteLetter = noteName[0];
      const noteOctave = parseInt(noteName.slice(-1));
      const baseOctave = parseInt(baseNote.slice(-1));
      
      const noteOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      const semitones = (noteOrder.indexOf(noteLetter) - noteOrder.indexOf(baseNote[0])) + (noteOctave - baseOctave) * 7;
      
      return staffBottom - semitones * (LINE_SPACING / 2);
    } else {
      const noteName = BASS_NOTES[note] || 'G2';
      const baseNote = 'G2';
      const staffBottom = STAFF_TOP_MARGIN + STAFF_HEIGHT + 4 * LINE_SPACING;
      
      const noteLetter = noteName[0];
      const noteOctave = parseInt(noteName.slice(-1));
      const baseOctave = parseInt(baseNote.slice(-1));
      
      const noteOrder = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
      const semitones = (noteOrder.indexOf(noteLetter) - noteOrder.indexOf(baseNote[0])) + (noteOctave - baseOctave) * 7;
      
      return staffBottom - semitones * (LINE_SPACING / 2);
    }
  };

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    renderGame(ctx, canvas.width, canvas.height);
  }, [renderGame]);

  const toggleGame = () => {
    if (isPlaying) {
      setIsPaused(prev => !prev);
    } else {
      setIsPlaying(true);
      startTimeRef.current = performance.now();
    }
  };

  const resetGame = () => {
    setIsPlaying(false);
    setIsPaused(false);
    setGameTime(0);
    setScore(0);
    setHitNotes(0);
    setCurrentCombo(0);
    setMaxCombo(0);
    setFullCombo(true);
    setShowScore(false);
    setPressedKeys(new Set());
    setNewlyPressedKeys(new Set());
    
    const initialNotes = processMidiEvents(SAMPLE_MIDI_EVENTS, SAMPLE_SONG.bpm);
    setActiveNotes(initialNotes);
  };

  // Helper function to convert MIDI pitch to note name
  const getNoteNameFromPitch = (pitch: number): string => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(pitch / 12) - 1;
    const noteIndex = pitch % 12;
    return `${noteNames[noteIndex]}${octave}`;
  };

  if (showScore) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold text-center mb-6">Game Complete!</h2>
          <div className="space-y-4 text-center">
            <div className="text-3xl font-bold text-blue-600">{Math.floor(score)}</div>
            <div>Hits: {hitNotes}/{totalNotes}</div>
            <div>Max Combo: {maxCombo}</div>
            <div>Full Combo: {fullCombo ? 'Yes' : 'No'}</div>
          </div>
          <div className="flex gap-4 mt-6">
            <button
              onClick={resetGame}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
            >
              Play Again
            </button>
            <button
              onClick={onBack}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
            >
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-black/50">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">Rhythm Game</h2>
          <p className="text-white/70">{SAMPLE_SONG.name}</p>
        </div>

        <div className="flex items-center space-x-4">
        <button
          onClick={toggleGame}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
            {isPlaying && !isPaused ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            <span>{isPlaying && !isPaused ? 'Pause' : 'Start'}</span>
          </button>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="flex-1 flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          width={1000}
          height={800}
          className="max-w-full max-h-full bg-black"
        />
      </div>

      {/* Pause Overlay */}
      {isPaused && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 text-center">
            <h3 className="text-2xl font-bold mb-4">PAUSED</h3>
            <button
              onClick={() => setIsPaused(false)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded"
            >
              Resume
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-6 left-6 text-white/70 text-sm">
        <p>🎹 Keyboard Controls:</p>
        <p>• A,W,S,E,D,F,T,G,Y,H,U,J,K - Piano keys</p>
        <p>• SPACE - Start/Pause • ESC - Pause</p>
        <p>• Press keys at the right time when notes reach the red line!</p>
        <p>• Don't hold keys - you must press them at the exact moment!</p>
      </div>
    </div>
  );
}; 