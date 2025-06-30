import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Play, Plus, Trash2, Volume2 } from 'lucide-react';
import { useSoundFontManager } from './GameplayScreen/SoundFontManager';

interface TestNote {
  id: string;
  pitch: number;
  time: number;
  duration: number;
  isHit: boolean;
  color: string;
}

interface GameplayPOCProps {
  onBack: () => void;
}

export const GameplayPOC: React.FC<GameplayPOCProps> = ({ onBack }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameTime, setGameTime] = useState(0);
  const [testNotes, setTestNotes] = useState<TestNote[]>([]);
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  const [score, setScore] = useState(0);
  const [hitCount, setHitCount] = useState(0);

  // SoundFont management
  const { soundFontState, loadSongSoundFont, playNote } = useSoundFontManager();

  // Initialize SoundFont
  useEffect(() => {
    const initSoundFont = async () => {
      console.log('🎹 Initializing SoundFont for POC...');
      // Use default piano SoundFont
      const dummySong = {
        soundFont: '/soundfonts/Equinox_Grand_Pianos.sf2'
      };
      await loadSongSoundFont(dummySong as any);
    };
    initSoundFont();
  }, [loadSongSoundFont]);

  // FL Studio style keyboard mapping
  const keyToPitch: { [key: string]: number } = {
    // Lower octave (Z-M row)
    'KeyZ': 60,  // C4
    'KeyX': 62,  // D4
    'KeyC': 64,  // E4
    'KeyV': 65,  // F4
    'KeyB': 67,  // G4
    'KeyN': 69,  // A4
    'KeyM': 71,  // B4
    'Comma': 72, // C5 (,)
    'Period': 74, // D5 (.)
    'Slash': 76,  // E5 (/)
    // Black keys (S-L row)
    'KeyS': 61,  // C#4
    'KeyD': 63,  // D#4
    'KeyF': 66,  // F#4
    'KeyG': 68,  // G#4
    'KeyH': 70,  // A#4
    'KeyJ': 73,  // C#5
    'KeyK': 75,  // D#5
    'KeyL': 77,  // F5 (black key)
    'Semicolon': 78, // F#5 (;)
    'Quote': 80,     // G#5 (')
    // Upper octave (Q-P row)
    'KeyQ': 72,  // C5
    'KeyW': 74,  // D5
    'KeyE': 76,  // E5
    'KeyR': 77,  // F5
    'KeyT': 79,  // G5
    'KeyY': 81,  // A5
    'KeyU': 83,  // B5
    'KeyI': 84,  // C6
    'KeyO': 86,  // D6
    'KeyP': 88,  // E6
    'BracketLeft': 89,  // F6 ([)
    'BracketRight': 91, // G6 (])
    'Backslash': 93,    // A6 (\)
    // Upper black keys (2-0 row)
    'Digit2': 73,  // C#5
    'Digit3': 75,  // D#5
    'Digit5': 78,  // F#5
    'Digit6': 80,  // G#5
    'Digit7': 82,  // A#5
    'Digit9': 85,  // C#6
    'Digit0': 87,  // D#6
    'Minus': 90,   // F#6 (-)
    'Equal': 92,   // G#6 (=)
  };

  // Helper functions
  const getNoteNameFromPitch = (pitch: number): string => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(pitch / 12) - 1;
    const noteIndex = pitch % 12;
    return `${noteNames[noteIndex]}${octave}`;
  };

  const generateId = (): string => {
    return Math.random().toString(36).substr(2, 9);
  };

  // Test note creation functions
  const addSingleNote = (pitch: number, delaySeconds: number = 2) => {
    const newNote: TestNote = {
      id: generateId(),
      pitch,
      time: gameTime + delaySeconds,
      duration: 0.5,
      isHit: false,
      color: '#4169E1'
    };
    setTestNotes(prev => [...prev, newNote]);
    console.log(`➕ Added ${getNoteNameFromPitch(pitch)} note at time ${newNote.time.toFixed(1)}s`);
  };

  const addCScale = () => {
    const cScale = [60, 62, 64, 65, 67, 69, 71, 72]; // C4 to C5
    const startTime = gameTime + 2;
    const newNotes: TestNote[] = cScale.map((pitch, index) => ({
      id: generateId(),
      pitch,
      time: startTime + (index * 0.5), // 500ms apart
      duration: 0.4,
      isHit: false,
      color: '#32CD32'
    }));
    setTestNotes(prev => [...prev, ...newNotes]);
    console.log(`🎵 Added C scale (8 notes) starting at ${startTime.toFixed(1)}s`);
  };

  const addChord = (rootPitch: number) => {
    const chord = [rootPitch, rootPitch + 4, rootPitch + 7]; // Major triad
    const startTime = gameTime + 2;
    const newNotes: TestNote[] = chord.map((pitch, index) => ({
      id: generateId(),
      pitch,
      time: startTime + (index * 0.1), // Very close together
      duration: 1.0,
      isHit: false,
      color: '#FFD700'
    }));
    setTestNotes(prev => [...prev, ...newNotes]);
    const chordName = getNoteNameFromPitch(rootPitch);
    console.log(`🎶 Added ${chordName} major chord at ${startTime.toFixed(1)}s`);
  };

  const clearAllNotes = () => {
    setTestNotes([]);
    setScore(0);
    setHitCount(0);
    console.log('🧹 Cleared all test notes');
  };

  // Input handling
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (keyToPitch[event.code] !== undefined) {
      event.preventDefault();
      const targetPitch = keyToPitch[event.code];
      
      // Add key to pressed keys (visual feedback)
      setPressedKeys(prev => new Set([...prev, targetPitch]));
      
      // Always play the sound when key is pressed
      if (soundFontState.isReady && playNote) {
        const velocity = 80;
        const duration = 0.5;
        console.log(`🎹 Playing sound for key press: pitch=${targetPitch}`);
        playNote(targetPitch, velocity, duration);
      }
      
      // Check for note hits if playing
      if (isPlaying) {
        checkNoteHit(targetPitch);
      }
    }
    
    // Other controls
    if (event.code === 'Space') {
      event.preventDefault();
      toggleGame();
    }
  }, [gameTime, isPlaying, soundFontState.isReady, playNote, testNotes]);

  const handleKeyRelease = useCallback((event: KeyboardEvent) => {
    if (keyToPitch[event.code] !== undefined) {
      const targetPitch = keyToPitch[event.code];
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(targetPitch);
        return next;
      });
    }
  }, []);

  const checkNoteHit = (pitch: number) => {
    const hitWindow = 0.2; // 200ms window
    let closestNote: TestNote | null = null;
    let closestDistance = Infinity;

    // Find closest note with exact pitch match
    testNotes.forEach(note => {
      if (note.isHit || note.pitch !== pitch) return;
      
      const distance = Math.abs(gameTime - note.time);
      if (distance < closestDistance && distance <= hitWindow) {
        closestDistance = distance;
        closestNote = note;
      }
    });

    if (closestNote) {
      // Mark note as hit
      setTestNotes(prev => prev.map(note => 
        note.id === closestNote!.id ? { ...note, isHit: true } : note
      ));
      
      // Update score
      const points = closestDistance < 0.05 ? 100 : closestDistance < 0.1 ? 80 : 50;
      setScore(prev => prev + points);
      setHitCount(prev => prev + 1);
      
      console.log(`✅ Hit ${getNoteNameFromPitch(pitch)}! Distance: ${(closestDistance * 1000).toFixed(1)}ms, Points: ${points}`);
    }
  };

  const toggleGame = () => {
    if (isPlaying) {
      setIsPlaying(false);
      console.log('⏸️ Game paused');
    } else {
      setIsPlaying(true);
      startTimeRef.current = performance.now();
      console.log('▶️ Game started');
    }
  };

  // Game loop
  useEffect(() => {
    if (!isPlaying) return;

    const gameLoop = () => {
      const currentTime = performance.now();
      const newGameTime = (currentTime - startTimeRef.current) / 1000;
      setGameTime(newGameTime);

      // Render
      const canvas = canvasRef.current;
      if (canvas) {
        renderGame(canvas, newGameTime);
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, testNotes, pressedKeys]);

  // Add event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keyup', handleKeyRelease);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('keyup', handleKeyRelease);
    };
  }, [handleKeyPress, handleKeyRelease]);

  const renderGame = (canvas: HTMLCanvasElement, currentGameTime: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Draw hit line
    const hitLineX = width * 0.2;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hitLineX, 0);
    ctx.lineTo(hitLineX, height);
    ctx.stroke();

    // Draw notes
    testNotes.forEach(note => {
      const timeToHit = note.time - currentGameTime;
      const noteX = hitLineX + (timeToHit * 150); // 150px per second
      const noteY = getNoteY(note.pitch, height);
      
      // Note color
      let color = note.color;
      if (note.isHit) color = '#32CD32';
      if (timeToHit < -0.3) color = '#FF4444'; // Missed

      // Draw note
      ctx.fillStyle = color;
      ctx.fillRect(noteX - 25, noteY - 10, 50, 20);
      
      // Note label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(getNoteNameFromPitch(note.pitch), noteX, noteY + 4);
    });

    // Draw pressed keys indicator
    pressedKeys.forEach(pitch => {
      const noteY = getNoteY(pitch, height);
      ctx.fillStyle = 'rgba(255, 255, 0, 0.7)';
      ctx.fillRect(hitLineX - 30, noteY - 15, 60, 30);
      
      ctx.fillStyle = '#000000';
      ctx.font = '14px Arial bold';
      ctx.textAlign = 'center';
      ctx.fillText(getNoteNameFromPitch(pitch), hitLineX, noteY + 4);
    });

    // Draw time indicator
    ctx.fillStyle = '#ffffff';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Time: ${currentGameTime.toFixed(1)}s`, 20, 30);
  };

  const getNoteY = (pitch: number, canvasHeight: number): number => {
    const middleC = 60;
    const noteRange = 24; // 2 octaves
    const normalizedPitch = (pitch - middleC + noteRange/2) / noteRange;
    return canvasHeight - (normalizedPitch * canvasHeight * 0.8) - 50;
  };

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
          <h2 className="text-2xl font-bold text-white">Gameplay POC</h2>
          <p className="text-white/70">Test and experiment with notes</p>
          {soundFontState.isReady && (
            <p className="text-green-400 text-sm">🎹 {soundFontState.selectedSoundFont} Ready</p>
          )}
        </div>

        <button
          onClick={toggleGame}
          className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
        >
          <Play className="w-5 h-5" />
          <span>{isPlaying ? 'Pause' : 'Start'}</span>
        </button>
      </div>

      {/* Test Controls */}
      <div className="p-6 bg-black/30">
        <h3 className="text-white text-lg font-bold mb-4">🧪 Test Controls</h3>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => addSingleNote(60)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add C4 Note</span>
          </button>
          
          <button
            onClick={() => addSingleNote(64)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add E4 Note</span>
          </button>
          
          <button
            onClick={() => addSingleNote(67)}
            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add G4 Note</span>
          </button>

          <button
            onClick={addCScale}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
          >
            <Volume2 className="w-4 h-4" />
            <span>Add C Scale</span>
          </button>

          <button
            onClick={() => addChord(60)}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            <Volume2 className="w-4 h-4" />
            <span>Add C Major Chord</span>
          </button>

          <button
            onClick={clearAllNotes}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="flex-1 flex items-center justify-center p-4">
        <canvas
          ref={canvasRef}
          width={1200}
          height={600}
          className="border-2 border-white/20 rounded-lg bg-black/30 max-w-full max-h-full"
        />
      </div>

      {/* Score Display */}
      <div className="absolute top-32 right-6 bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white">
        <div className="text-right space-y-2">
          <div className="text-2xl font-mono font-bold">{score}</div>
          <div className="text-sm">Hits: {hitCount}</div>
          <div className="text-sm">Notes: {testNotes.length}</div>
          <div className="text-sm">Time: {gameTime.toFixed(1)}s</div>
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-6 left-6 text-white/70 text-sm">
        <p>🎹 Complete FL Studio Keyboard Layout:</p>
        <p>• White Keys: Z,X,C,V,B,N,M,,,.,/ | Q,W,E,R,T,Y,U,I,O,P,[,],\</p>
        <p>• Black Keys: S,D,F,G,H,J,K,L,;,' | 2,3,5,6,7,9,0,-,=</p>
        <p>• SPACE to start/pause • 3+ octave range (C4-A6)</p>
        <p className="text-yellow-300">🧪 Use test controls to add notes, then hit SPACE to start the game!</p>
      </div>
    </div>
  );
}; 