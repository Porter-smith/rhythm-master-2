import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Pause, Play, Bug } from 'lucide-react';
import { Song, GameScore } from '../../types/game';
import { AudioEngine } from '../../game/AudioEngine';
import { GameEngine } from '../../game/GameEngine';
import { MusicPlayer } from '../../music/MusicPlayer';
import { LoadingScreen } from './LoadingScreen';
import { useSoundFontManager } from './SoundFontManager';
import { BackgroundInstrumentsPanel } from './BackgroundInstrumentsPanel';
import { BackgroundAudioManagerComponent, BackgroundAudioManager } from './BackgroundAudioManager';

interface GameplayScreenProps {
  song: Song;
  difficulty: 'easy' | 'medium' | 'hard';
  audioOffset: number;
  onGameComplete: (score: GameScore) => void;
  onBack: () => void;
  audioEngine: AudioEngine;
  selectedInstrument?: { channel: number; instrument: number; name: string };
}

// Loading phases
type LoadingPhase = 'initializing' | 'loading-song' | 'loading-soundfont' | 'ready' | 'error';

interface LoadingState {
  phase: LoadingPhase;
  message: string;
  progress: number;
  error?: string;
}

// Note interface for filtered notes
interface FilteredNote {
  time: number;
  pitch: number;
  duration: number;
  channel?: number;
  velocity?: number;
  timeToHit?: number;
  isHit?: boolean;
  isMissed?: boolean;
  isActive?: boolean;
}

export const GameplayScreen: React.FC<GameplayScreenProps> = ({
  song,
  difficulty,
  audioOffset,
  onGameComplete,
  onBack,
  audioEngine,
  selectedInstrument
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const animationFrameRef = useRef<number>();
  const musicPlayerRef = useRef<MusicPlayer | null>(null);
  const initializationRef = useRef<boolean>(false);
  const backgroundAudioRef = useRef<BackgroundAudioManager | null>(null);
  
  // SoundFont state using the manager
  const { soundFontState, loadSongSoundFont, playNote, stopNote, stopAllNotes } = useSoundFontManager();
  
  // Loading state
  const [loadingState, setLoadingState] = useState<LoadingState>({
    phase: 'initializing',
    message: 'Initializing game...',
    progress: 0
  });
  
  const [gameState, setGameState] = useState<'loading' | 'countdown' | 'playing' | 'paused'>('loading');
  const [countdown, setCountdown] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [showDebug, setShowDebug] = useState(false);
  const [loadedSong, setLoadedSong] = useState<Song | null>(null);
  const [filteredNotes, setFilteredNotes] = useState<FilteredNote[]>([]);
  const [hitError, setHitError] = useState<{ offset: number; accuracy: 'perfect' | 'great' | 'good' | null }>({ offset: 0, accuracy: null });
  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  const [lastHitInfo, setLastHitInfo] = useState<{ pressedPitch: number; hitPitch: number; timestamp: number } | null>(null);
  const [keysCurrentlyPressed, setKeysCurrentlyPressed] = useState<Set<string>>(new Set());

  // Background instruments state
  const [showBackgroundPanel, setShowBackgroundPanel] = useState(false);
  const [midiFileForBackground, setMidiFileForBackground] = useState<ArrayBuffer | null>(null);
  const [backgroundAudioReady, setBackgroundAudioReady] = useState(false);

  // Note information for learning/practice
  const [currentNoteInfo, setCurrentNoteInfo] = useState<{
    hittableNotes: FilteredNote[];
    upcomingNotes: FilteredNote[];
    gameTime: number;
  }>({ hittableNotes: [], upcomingNotes: [], gameTime: 0 });

  // Debug information
  const debugInfo = {
    songFormat: loadedSong?.format || song.format,
    difficulty: difficulty,
    notesAvailable: loadedSong?.notes[difficulty]?.length || 0,
    songNotes: loadedSong?.notes[difficulty] || [],
    audioOffset: audioOffset,
    gameEngine: gameEngineRef.current ? 'Initialized' : 'Not Initialized',
    songTitle: song.title,
    songArtist: song.artist,
    songBPM: song.bpm,
    songDuration: song.duration,
    songSoundFont: (song as Song & { soundFont?: string }).soundFont || 'None (using default)',
    loadingPhase: loadingState.phase,
    originalSong: song,
    loadedSong: loadedSong,
    soundFontLoaded: soundFontState.isReady,
    selectedSoundFont: soundFontState.selectedSoundFont,
    initializationStarted: initializationRef.current,
    samplerState: soundFontState.sampler ? 'Exists' : 'Null',
    samplerReady: soundFontState.isReady,
    soundFontLoading: soundFontState.isLoading,
    backgroundPanelVisible: showBackgroundPanel,
    midiFileLoaded: !!midiFileForBackground,
    backgroundAudioReady: backgroundAudioReady,
    gameState: gameState,
    isGameActuallyPlaying: gameState === 'playing'
  };

  // Initialize game with proper loading phases
  useEffect(() => {
    console.log('🎮 Starting initialization...');

    const initializeGame = async () => {
      try {
        console.log('\n🎮 ===== GAMEPLAY INITIALIZATION =====');
        console.log(`🎯 Selected difficulty: ${difficulty}`);
        console.log(`🎹 Selected instrument:`, selectedInstrument ? `Channel ${selectedInstrument.channel + 1}, Program ${selectedInstrument.instrument}` : 'None');
        
        // Phase 1: Initialize basic components
        setLoadingState({
          phase: 'initializing',
          message: 'Initializing game components...',
          progress: 10
        });

        // Phase 2: Load song data
        setLoadingState({
          phase: 'loading-song',
          message: `Loading ${song.title} (${difficulty})...`,
          progress: 20
        });

        const finalSong = song;

        // Check if we need to load MIDI data for the SELECTED difficulty only
        if (song.format === 'midi') {
          console.log(`🎹 MIDI song detected - need to load ${difficulty} difficulty only`);
          
          // Create a modified song that only loads the selected difficulty
          const singleDifficultySong = {
            ...song,
            difficulties: [difficulty], // Only load the selected difficulty
            midiFiles: {
              [difficulty]: (song as Song & { midiFiles?: Record<string, string> }).midiFiles?.[difficulty]
            }
          };
          
          try {
            if (!musicPlayerRef.current) {
              musicPlayerRef.current = MusicPlayer.getInstance();
              await musicPlayerRef.current.initialize();
            }

            console.log(`🎯 Loading only ${difficulty} difficulty to avoid loading all files`);
            await musicPlayerRef.current.loadSong(singleDifficultySong as Song & { midiFiles?: Record<string, string> });
            
            // Copy the loaded notes back to the original song
            if (singleDifficultySong.notes[difficulty]) {
              finalSong.notes[difficulty] = singleDifficultySong.notes[difficulty];
            }
            
            console.log(`✅ MIDI ${difficulty} difficulty loaded successfully`);

            // Load MIDI file for background instruments
            console.log("LOADINMG THIS THLOADING THIS TIHNGK ")
            const midiUrl = (song as Song & { midiFiles?: Record<string, string> }).midiFiles?.[difficulty];
            if (midiUrl) {
              try {
                console.log(`📂 Loading MIDI file for background audio: ${midiUrl}`);
                const response = await fetch(midiUrl);
                const arrayBuffer = await response.arrayBuffer();
                setMidiFileForBackground(arrayBuffer);
                console.log(`✅ MIDI file loaded for background audio (will start when game begins)`);
              } catch (midiError) {
                console.warn(`⚠️ Failed to load MIDI file for background audio:`, midiError);
              }
            }
            
          } catch (midiError) {
            console.warn(`⚠️ MIDI loading failed for ${difficulty}, using fallback notes:`, midiError);
            
            // Create fallback notes for MIDI songs that fail to load
            const fallbackNotes = [
              { time: 0.5, pitch: 60, duration: 0.5 },  // C
              { time: 1.0, pitch: 62, duration: 0.5 },  // D
              { time: 1.5, pitch: 64, duration: 0.5 },  // E
              { time: 2.0, pitch: 65, duration: 0.5 },  // F
            ];
            
            // Ensure the song has fallback notes
            finalSong.notes[difficulty] = fallbackNotes;
            
            console.log(`🔧 Using fallback notes: ${fallbackNotes.length} notes for ${difficulty}`);
          }
        }

        setLoadedSong(finalSong);

        setLoadingState({
          phase: 'loading-song',
          message: `Song loaded: ${finalSong.notes[difficulty]?.length || 0} notes`,
          progress: 40
        });

        // Phase 3: Load SoundFont
        setLoadingState({
          phase: 'loading-soundfont',
          message: (song as Song & { soundFont?: string }).soundFont ? `Loading ${(song as Song & { soundFont?: string }).soundFont.includes('gzdoom') ? 'GZDoom' : 'Custom'} SoundFont...` : 'Loading Piano SoundFont...',
          progress: 60
        });

        const soundFontSuccess = await loadSongSoundFont(finalSong as Song & { soundFont?: string }, selectedInstrument);
        
        if (!soundFontSuccess) {
          console.error('❌ SoundFont loading failed - cannot continue');
          setLoadingState({
            phase: 'error',
            message: 'Failed to load SoundFont',
            progress: 0,
            error: 'SoundFont loading failed'
          });
          return;
        }

        // Phase 4: Initialize GameEngine AFTER SoundFont is ready
        setLoadingState({
          phase: 'ready',
          message: 'Initializing game engine...',
          progress: 90
        });

        const gameEngine = new GameEngine(finalSong, difficulty, audioOffset, audioEngine, selectedInstrument);
        gameEngineRef.current = gameEngine;

        setLoadingState({
          phase: 'ready',
          message: 'Game ready!',
          progress: 100
        });

        console.log('✅ GameEngine initialized successfully');
        console.log('🎮 ===== INITIALIZATION COMPLETE =====\n');

        // Move to countdown phase after a brief delay
        setTimeout(() => {
          setGameState('countdown');
        }, 500);

      } catch (error) {
        console.error('❌ Failed to initialize game:', error);
        setLoadingState({
          phase: 'error',
          message: 'Failed to initialize game',
          progress: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    };

    initializeGame();

    return () => {
      console.log('🧹 Cleaning up GameplayScreen...');
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (gameEngineRef.current) {
        gameEngineRef.current.destroy();
      }
      if (soundFontState.sampler) {
        soundFontState.sampler.disconnect();
      }
    };
  }, []); // Empty dependency array to run on mount

  // Set SoundFont callback when GameEngine is ready AND SoundFont is ready
  useEffect(() => {
    if (gameEngineRef.current && soundFontState.isReady) {
      console.log('🎹 Setting SoundFont callback - both GameEngine and SoundFont are ready!');
      console.log(`🔍 SoundFont ready state:`, {
        samplerExists: !!soundFontState.sampler,
        isReady: soundFontState.isReady,
        contextState: soundFontState.sampler?.context?.state
      });
      gameEngineRef.current.setSoundFontCallback(playNote);
    }
  }, [gameEngineRef.current, soundFontState.isReady, playNote]);

  // Countdown logic
  useEffect(() => {
    if (gameState === 'countdown' && countdown > 0) {
      const timer = setTimeout(() => {
        if (countdown === 1) {
          console.log('🎮 Countdown finished - preparing to start game and audio!');
          
          // Initialize notes before setting game state to playing
          if (gameEngineRef.current) {
            const initialState = gameEngineRef.current.update(performance.now());
            setFilteredNotes(initialState.notes);
          }

          // Prepare background audio to start exactly with game
          if (backgroundAudioRef.current) {
            backgroundAudioRef.current.prepareToStart();
          }
          
          // CRITICAL: Set the callback one more time right before starting
          if (gameEngineRef.current && soundFontState.isReady) {
            console.log('🎹 Final SoundFont callback setup before game start');
            gameEngineRef.current.setSoundFontCallback(playNote);
          }
          
          // Start both game and background audio at exactly the same time
          gameEngineRef.current?.start();
          if (backgroundAudioRef.current) {
            backgroundAudioRef.current.play();
          }
          
          setGameState('playing');
          
          console.log('🎮 Game and background audio started simultaneously!');
        } else {
          setCountdown(countdown - 1);
        }
      }, 1000);
      return () => clearTimeout(timer);
          }
    }, [gameState, countdown, soundFontState, playNote]);

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
    // Black keys (S-L row)
    'KeyS': 61,  // C#4
    'KeyD': 63,  // D#4
    'KeyF': 66,  // F#4
    'KeyG': 68,  // G#4
    'KeyH': 70,  // A#4
    // Upper octave (Q-P row)
    'KeyQ': 72,  // C5
    'KeyW': 74,  // D5
    'KeyE': 76,  // E5
    'KeyR': 77,  // F5
    'KeyT': 79,  // G5
    'KeyY': 81,  // A5
    'KeyU': 83,  // B5
  };

  // Input handling
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    // Handle piano key presses - ALWAYS play sound when piano keys are pressed
    if (keyToPitch[event.code] !== undefined) {
      event.preventDefault();
      const targetPitch = keyToPitch[event.code];
      
      // Only play sound if this key wasn't already pressed (prevent repeated playing when held)
      if (!keysCurrentlyPressed.has(event.code)) {
        // Add key to currently pressed keys
        setKeysCurrentlyPressed(prev => new Set([...prev, event.code]));
        
        // Add key to pressed keys (visual feedback)
        setPressedKeys(prev => new Set([...prev, targetPitch]));
        
        // ALWAYS play the sound when key is first pressed (like a real piano)
        if (soundFontState.isReady && playNote) {
          const velocity = 80; // Standard velocity for manual key presses
          const duration = 0.5; // Standard duration for manual key presses
          console.log(`🎹 Playing sound for key press: pitch=${targetPitch}, velocity=${velocity}`);
          playNote(targetPitch, velocity, duration);
        }
      }
      
      // Only check for game note hits if actually playing the game
      if (gameState === 'playing') {
        // Debug: Show what notes are available near the hit line
        const gameTime = (performance.now() - gameEngineRef.current!.getStartTime()) / 1000;
        const nearbyNotes = filteredNotes.filter(note => {
          const adjustedTime = note.time + (audioOffset / 1000);
          const distance = Math.abs(gameTime - adjustedTime);
          return distance <= 0.5; // Within 500ms
        });
        
        console.log(`🎮 Key ${event.code} pressed (pitch ${targetPitch}). Nearby notes:`, nearbyNotes.map(n => `pitch ${n.pitch} at time ${n.time?.toFixed(2)}`));
        
        const result = gameEngineRef.current?.handleInput(performance.now(), targetPitch);
        if (result) {
          setScore(result.score);
          setCombo(result.combo);
          setAccuracy(result.accuracy);
          if (result.hitNote) {
            // Calculate hit error in milliseconds
            const gameTime = (performance.now() - gameEngineRef.current!.getStartTime()) / 1000;
            const adjustedNoteTime = result.hitNote.time + (audioOffset / 1000);
            const hitErrorMs = (gameTime - adjustedNoteTime) * 1000;
            setHitError({ offset: hitErrorMs, accuracy: result.hitAccuracy });
            
            // Show what note was actually hit vs what was pressed
            setLastHitInfo({
              pressedPitch: targetPitch,
              hitPitch: result.hitNote.pitch,
              timestamp: performance.now()
            });
            
            console.log(`✅ HIT! Pressed ${targetPitch}, hit note ${result.hitNote.pitch}, timing: ${hitErrorMs.toFixed(1)}ms`);
          }
        } else {
          console.log(`❌ No hit for pitch ${targetPitch}`);
        }
      }
      return; // Don't process other key events if this was a piano key
    }
    
    // Handle other game controls
    if (event.code === 'Escape') {
      if (gameState === 'playing') {
        setGameState('paused');
        gameEngineRef.current?.pause();
        if (backgroundAudioRef.current) {
          backgroundAudioRef.current.pause();
        }
      } else if (gameState === 'paused') {
        setGameState('playing');
        gameEngineRef.current?.resume();
        if (backgroundAudioRef.current) {
          backgroundAudioRef.current.play();
        }
      }
    } else if (event.code === 'F12' || (event.ctrlKey && event.shiftKey && event.code === 'KeyD')) {
      event.preventDefault();
      setShowDebug(!showDebug);
    } else if (event.code === 'F3' && gameState === 'playing') {
      event.preventDefault();
      setShowBackgroundPanel(!showBackgroundPanel);
    }
  }, [gameState, showDebug, showBackgroundPanel, keysCurrentlyPressed, soundFontState.isReady, playNote]);

  // Handle key release
  const handleKeyRelease = useCallback((event: KeyboardEvent) => {
    if (keyToPitch[event.code] !== undefined) {
      const targetPitch = keyToPitch[event.code];
      
      // Remove from currently pressed keys
      setKeysCurrentlyPressed(prev => {
        const next = new Set(prev);
        next.delete(event.code);
        return next;
      });
      
      // Remove from pressed keys (visual feedback)
      setPressedKeys(prev => {
        const next = new Set(prev);
        next.delete(targetPitch);
        return next;
      });
      
      // Note: We're not calling stopNote here anymore since Soundfont2Sampler
      // doesn't support individual note stopping like SplendidGrandPiano
      // Notes will stop automatically after their duration
    }
  }, [keyToPitch]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('keyup', handleKeyRelease);
    
    // Handle window blur to reset pressed keys (prevents stuck keys)
    const handleWindowBlur = () => {
      setKeysCurrentlyPressed(new Set());
      setPressedKeys(new Set());
      // Stop all notes when window loses focus
      if (soundFontState.isReady && stopAllNotes) {
        stopAllNotes();
      }
    };
    
    window.addEventListener('blur', handleWindowBlur);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('keyup', handleKeyRelease);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [handleKeyPress, handleKeyRelease]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'paused') return;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas || !gameEngineRef.current) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Only update game state when actually playing
      if (gameState === 'playing') {
        const currentState = gameEngineRef.current.update(performance.now());
        
        // Update filtered notes from game engine state
        setFilteredNotes(currentState.notes);
        
        // Update note information for learning display
        const gameTime = gameEngineRef.current.getCurrentGameTime();
        
        // Find notes that can be hit right now (within hit window)
        const hittableNotes = currentState.notes.filter(note => {
          const adjustedTime = note.time + (audioOffset / 1000);
          const distance = Math.abs(gameTime - adjustedTime);
          return distance <= 0.2 && !note.isHit && !note.isMissed; // 200ms hit window
        });
        
        // Find upcoming notes (next 2-3 seconds)
        const upcomingNotes = currentState.notes.filter(note => {
          const adjustedTime = note.time + (audioOffset / 1000);
          const timeUntilNote = adjustedTime - gameTime;
          return timeUntilNote > 0.2 && timeUntilNote <= 3.0 && !note.isHit && !note.isMissed;
        }).slice(0, 8); // Limit to next 8 notes
        
        setCurrentNoteInfo({
          hittableNotes,
          upcomingNotes,
          gameTime
        });
        
        // Check if game is complete
        if (currentState.isComplete) {
          const finalScore: GameScore = {
            score: currentState.score,
            accuracy: currentState.accuracy,
            combo: currentState.maxCombo,
            hitStats: currentState.hitStats,
            grade: calculateGrade(currentState.accuracy),
            hitTimings: gameEngineRef.current.getHitTimings(),
            overallDifficulty: song.overallDifficulty || 5,
            hitWindows: gameEngineRef.current.getTimingWindows()
          };
          console.log('🎉 Game complete! Final score:', finalScore);
          onGameComplete(finalScore);
          return;
        }
      }

      // Always render game (even when paused)
      renderGame(ctx, canvas);
      
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, onGameComplete]);

  const calculateGrade = (accuracy: number): string => {
    if (accuracy >= 95) return 'S';
    if (accuracy >= 90) return 'A';
    if (accuracy >= 80) return 'B';
    if (accuracy >= 70) return 'C';
    return 'D';
  };

  const renderGame = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas with gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Staff parameters (matching POC)
    const STAFF_HEIGHT = 200;
    const STAFF_TOP_MARGIN = 100;
    const LINE_SPACING = STAFF_HEIGHT / 6;

    // Draw staff lines
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
    const gameTime = gameEngineRef.current ? gameEngineRef.current.getCurrentGameTime() : 0;
    const scrollSpeed = (song.bpm / 60) * LINE_SPACING * 2;
    const secondsPerBeat = 60 / song.bpm;
    const pixelsPerSecond = scrollSpeed;
    
    // The time at the hit line (where time = gameTime)
    const timeAtHitLine = gameTime;
    // The time at the left edge of the canvas
    const timeAtLeftEdge = timeAtHitLine - (hitLineX / pixelsPerSecond);
    
    // For scale song, align grid with the first note at measure 2 (time 4)
    // This ensures measure lines align with note starts
    const gridOffset = 0; // Always align measure lines at 0, 4, 8, ...
    const adjustedTimeAtLeftEdge = timeAtLeftEdge;
    
    // Draw enough lines to cover the canvas
    const totalBeats = Math.ceil(width / (secondsPerBeat * pixelsPerSecond)) + 8;
    
    for (let i = 0; i < totalBeats; i++) {
      // The time for this beat line (adjusted for grid offset)
      const beatTime = Math.floor(adjustedTimeAtLeftEdge / secondsPerBeat) * secondsPerBeat + i * secondsPerBeat + gridOffset;
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

    // Draw notes as long rectangles (matching POC logic)
    filteredNotes.forEach((note: FilteredNote) => {
      const isTreble = note.pitch >= 60 && note.pitch <= 84;
      const y = noteToY(note.pitch, isTreble);
      
      // Note color based on state
      let color = '#4169E1';
      if (note.pitch < 60) color = '#DC143C';
      if (note.isHit) color = '#32CD32';
      if (note.isMissed) color = '#FF0000';
      if (note.isActive) color = '#FFD700';

      // Calculate note position and size (matching POC)
      const pixelsPerSecond = scrollSpeed;
      const secondsPerBeat = 60 / song.bpm;
      const noteStartX = hitLineX + (note.time - gameTime) * pixelsPerSecond;
      const noteWidth = note.duration * pixelsPerSecond;
      const noteHeight = LINE_SPACING; // Fill exactly between staff lines
      
      ctx.fillStyle = color;
      ctx.fillRect(noteStartX, y - noteHeight / 2, noteWidth, noteHeight);
      
      // Add sharp symbol if needed
      if (isSharpNote(note.pitch)) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '18px Arial bold';
        ctx.textAlign = 'right';
        ctx.fillText('#', noteStartX - 6, y + 8);
      }
      
      // Draw note name centered on the note
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(getNoteNameFromPitch(note.pitch), noteStartX + noteWidth / 2, y + 5);
    });

    // Show pressed keys on the hit line
    pressedKeys.forEach(pitch => {
      const isTreble = pitch >= 60 && pitch <= 84;
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

    // SoundFont indicator
    if (soundFontState.isReady) {
      ctx.fillStyle = '#00ff88';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`🎹 ${soundFontState.selectedSoundFont}`, 20, height - 60);
    }

    // Background instruments indicator
    if (backgroundAudioReady && gameState === 'playing') {
      ctx.fillStyle = '#ff8800';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`🎼 Background Audio Playing (Press M for controls)`, 20, height - 40);
    } else if (backgroundAudioReady && gameState !== 'playing') {
      ctx.fillStyle = '#888888';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`🎼 Background Audio Ready (will start with game)`, 20, height - 40);
    }
  };

  // Updated note positioning function (matching POC)
  const noteToY = (note: number, isTreble: boolean): number => {
    const TREBLE_MIN = 60;
    const TREBLE_MAX = 84;
    const BASS_MIN = 36;
    const BASS_MAX = 59;
    
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

    const STAFF_HEIGHT = 200;
    const STAFF_TOP_MARGIN = 100;
    const LINE_SPACING = STAFF_HEIGHT / 6;

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

  const isSharpNote = (pitch: number): boolean => {
    const noteInOctave = pitch % 12;
    return [1, 3, 6, 8, 10].includes(noteInOctave);
  };

  // Helper function to convert MIDI pitch to note name
  const getNoteNameFromPitch = (pitch: number): string => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(pitch / 12) - 1;
    const noteIndex = pitch % 12;
    return `${noteNames[noteIndex]}${octave}`;
  };

  // Handle back button - only allow if not in critical loading phase
  const handleBack = () => {
    if (loadingState.phase === 'loading-soundfont') {
      // Don't allow back during SoundFont loading
      return;
    }
    onBack();
  };

  // Initialize filtered notes when game starts
  useEffect(() => {
    if (gameEngineRef.current && gameState === 'playing') {
      const currentState = gameEngineRef.current.update(performance.now());
      setFilteredNotes(currentState.notes);
    }
  }, [gameState]);

  // Handle background audio manager ready
  const handleBackgroundAudioReady = (manager: BackgroundAudioManager) => {
    backgroundAudioRef.current = manager;
    setBackgroundAudioReady(true);
    console.log('🎼 Background audio manager is ready (waiting for game to start)');
  };

  // Handle pause/resume
  const togglePause = () => {
    if (gameState === 'playing') {
      setGameState('paused');
      gameEngineRef.current?.pause();
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.pause();
      }
    } else if (gameState === 'paused') {
      setGameState('playing');
      gameEngineRef.current?.resume();
      if (backgroundAudioRef.current) {
        backgroundAudioRef.current.play();
      }
    }
  };

  // Effect to clear hit error after delay
  useEffect(() => {
    if (hitError.accuracy) {
      const timer = setTimeout(() => {
        setHitError({ offset: 0, accuracy: null });
      }, 1000); // Clear after 1 second
      return () => clearTimeout(timer);
    }
  }, [hitError]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      {/* Background Audio Manager - Invisible component that handles background audio */}
      {midiFileForBackground && (
        <BackgroundAudioManagerComponent
          midiFile={midiFileForBackground}
          soundFontUrl={(song as any).soundFont || '/soundfonts/Equinox_Grand_Pianos.sf2'}
          hideSelectedChannel={selectedInstrument?.channel}
          isGamePlaying={gameState === 'playing'}
          onReady={handleBackgroundAudioReady}
        />
      )}

      {/* Selected Instrument Debug Display */}
      {selectedInstrument && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-900/80 text-green-200 px-6 py-2 rounded-xl shadow-lg z-50 font-mono text-lg flex items-center space-x-4">
          <span>🎹 Playing Instrument:</span>
          <span className="font-bold">"{selectedInstrument.name}"</span>
          <span className="text-sm">(Ch{selectedInstrument.channel + 1}, Prog{selectedInstrument.instrument})</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between p-6 bg-black/50">
        <button
          onClick={handleBack}
          disabled={loadingState.phase === 'loading-soundfont'}
          className={`flex items-center space-x-2 transition-colors duration-200 ${
            loadingState.phase === 'loading-soundfont' 
              ? 'text-white/30 cursor-not-allowed' 
              : 'text-white/70 hover:text-white'
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">{song.title}</h2>
          <p className="text-white/70 capitalize">{difficulty} • {song.artist}</p>
          <p className="text-white/50 text-sm">{song.format.toUpperCase()} Format</p>
          {soundFontState.isReady && (
            <p className="text-green-400 text-sm">🎹 {soundFontState.selectedSoundFont} Ready</p>
          )}
          {backgroundAudioReady && gameState === 'playing' && (
            <p className="text-orange-400 text-sm">🎼 Background Audio Playing</p>
          )}
          {backgroundAudioReady && gameState !== 'playing' && (
            <p className="text-gray-400 text-sm">🎼 Background Audio Ready</p>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="p-2 text-white/70 hover:text-white transition-colors duration-200"
            title="Toggle Debug Info (F12)"
          >
            <Bug className="w-5 h-5" />
          </button>
          <button
            onClick={togglePause}
            disabled={gameState === 'loading'}
            className="p-2 text-white/70 hover:text-white transition-colors duration-200 disabled:opacity-50"
          >
            {gameState === 'playing' ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Loading Screen */}
      {gameState === 'loading' && (
        <LoadingScreen loadingState={loadingState} onBack={handleBack} />
      )}

      {/* Background Instruments Panel */}
      {showBackgroundPanel && backgroundAudioRef.current && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-screen p-8">
            <BackgroundInstrumentsPanel 
              hideSelectedChannel={selectedInstrument?.channel}
              backgroundAudioManager={backgroundAudioRef.current}
              onClose={() => setShowBackgroundPanel(false)}
            />
          </div>
        </div>
      )}

      {/* Debug Panel */}
      {showDebug && (
        <div className="absolute top-20 left-6 bg-black/90 backdrop-blur-sm rounded-lg p-4 text-white text-sm font-mono max-w-md z-50 max-h-96 overflow-y-auto">
          <h3 className="text-yellow-400 font-bold mb-2">🐛 DEBUG INFO</h3>
          <div className="space-y-1">
            <div><span className="text-blue-300">Song:</span> {debugInfo.songTitle}</div>
            <div><span className="text-blue-300">Artist:</span> {debugInfo.songArtist}</div>
            <div><span className="text-blue-300">Format:</span> {debugInfo.songFormat}</div>
            <div><span className="text-blue-300">Difficulty:</span> {debugInfo.difficulty}</div>
            <div><span className="text-blue-300">Loading Phase:</span> {debugInfo.loadingPhase}</div>
            <div><span className="text-blue-300">Game State:</span> {debugInfo.gameState}</div>
            <div><span className="text-blue-300">Is Game Playing:</span> {debugInfo.isGameActuallyPlaying ? 'Yes' : 'No'}</div>
            <div><span className="text-blue-300">Init Started:</span> {debugInfo.initializationStarted ? 'Yes' : 'No'}</div>
            <div className={`${debugInfo.notesAvailable === 0 ? 'text-red-400' : 'text-green-400'}`}>
              <span className="text-blue-300">Notes Available:</span> {debugInfo.notesAvailable}
            </div>
            <div className={`${debugInfo.soundFontLoaded ? 'text-green-400' : 'text-red-400'}`}>
              <span className="text-blue-300">SoundFont:</span> {debugInfo.soundFontLoaded ? `✅ ${debugInfo.selectedSoundFont}` : '❌ Not Loaded'}
            </div>
            <div><span className="text-blue-300">Song SoundFont:</span> {debugInfo.songSoundFont}</div>
            <div><span className="text-blue-300">Sampler State:</span> {debugInfo.samplerState}</div>
            <div><span className="text-blue-300">Sampler Ready:</span> {debugInfo.samplerReady ? 'Yes' : 'No'}</div>
            <div><span className="text-blue-300">SoundFont Loading:</span> {debugInfo.soundFontLoading ? 'Yes' : 'No'}</div>
            <div className={`${debugInfo.backgroundPanelVisible ? 'text-green-400' : 'text-gray-400'}`}>
              <span className="text-blue-300">Background Panel:</span> {debugInfo.backgroundPanelVisible ? 'Visible' : 'Hidden'}
            </div>
            <div className={`${debugInfo.midiFileLoaded ? 'text-green-400' : 'text-red-400'}`}>
              <span className="text-blue-300">MIDI for Background:</span> {debugInfo.midiFileLoaded ? 'Loaded' : 'Not Loaded'}
            </div>
            <div className={`${debugInfo.backgroundAudioReady ? 'text-green-400' : 'text-red-400'}`}>
              <span className="text-blue-300">Background Audio:</span> {debugInfo.backgroundAudioReady ? 'Ready' : 'Not Ready'}
            </div>
          </div>
        </div>
      )}

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
      <div className="absolute top-20 right-6 bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white">
        <div className="text-right space-y-2">
          <div className="text-3xl font-mono font-bold">{score.toLocaleString()}</div>
          <div className="text-lg">Combo: {combo}</div>
          <div className="text-sm">Accuracy: {typeof accuracy === 'number' ? accuracy.toFixed(1) : '0.0'}%</div>
          {soundFontState.isReady && (
            <div className="text-xs text-green-400">🎹 SoundFont Active</div>
          )}
          {backgroundAudioReady && gameState === 'playing' && (
            <div className="text-xs text-orange-400">🎼 Background Playing</div>
          )}
          {backgroundAudioReady && gameState !== 'playing' && (
            <div className="text-xs text-gray-400">🎼 Background Ready</div>
          )}
          {!backgroundAudioReady && midiFileForBackground && (
            <div className="text-xs text-red-400">❌ Background Audio Error</div>
          )}
        </div>
      </div>

      {/* Note Information Panel for Learning */}
      {gameState === 'playing' && (
        <div className="absolute top-20 left-6 bg-black/70 backdrop-blur-sm rounded-lg p-4 text-white min-w-[280px]">
          <h3 className="text-lg font-bold text-yellow-400 mb-3">🎯 Note Information</h3>
          
          {/* Current Hittable Notes */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-green-400 mb-2">⚡ Hit Now! (200ms window)</h4>
            {currentNoteInfo.hittableNotes.length > 0 ? (
              <div className="space-y-1">
                {currentNoteInfo.hittableNotes.map((note, index) => {
                  const noteName = getNoteNameFromPitch(note.pitch);
                  const timeLeft = ((note.time + (audioOffset / 1000)) - currentNoteInfo.gameTime) * 1000;
                  return (
                    <div key={index} className="flex justify-between items-center bg-green-900/50 px-2 py-1 rounded text-sm">
                      <span className="font-mono font-bold">{noteName}</span>
                      <span className="text-xs text-green-300">
                        {Math.abs(timeLeft) < 50 ? 'NOW!' : `${timeLeft > 0 ? '+' : ''}${timeLeft.toFixed(0)}ms`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-400 text-sm italic">No notes to hit right now</div>
            )}
          </div>

          {/* Upcoming Notes */}
          <div>
            <h4 className="text-sm font-semibold text-blue-400 mb-2">🔮 Coming Up (next 3s)</h4>
            {currentNoteInfo.upcomingNotes.length > 0 ? (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {currentNoteInfo.upcomingNotes.map((note, index) => {
                  const noteName = getNoteNameFromPitch(note.pitch);
                  const timeUntil = ((note.time + (audioOffset / 1000)) - currentNoteInfo.gameTime);
                  return (
                    <div key={index} className="flex justify-between items-center bg-blue-900/30 px-2 py-1 rounded text-sm">
                      <span className="font-mono">{noteName}</span>
                      <span className="text-xs text-blue-300">
                        {timeUntil.toFixed(1)}s
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-gray-400 text-sm italic">No upcoming notes</div>
            )}
          </div>

          {/* Game Time Display */}
          <div className="mt-3 pt-2 border-t border-white/20">
            <div className="text-xs text-gray-400">
              Game Time: {currentNoteInfo.gameTime.toFixed(1)}s
            </div>
          </div>
        </div>
      )}

      {/* Hit Error Display */}
      {hitError.accuracy && (
        <div 
          className={`absolute bottom-20 left-1/2 -translate-x-1/2 text-2xl font-mono font-bold transition-opacity duration-500 ${
            hitError.accuracy === 'perfect' ? 'text-green-400' :
            hitError.accuracy === 'great' ? 'text-blue-400' :
            'text-yellow-400'
          }`}
          style={{ opacity: hitError.accuracy ? 1 : 0 }}
        >
          {hitError.offset > 0 ? '+' : ''}{hitError.offset.toFixed(1)}ms
          <div className="text-sm text-center mt-1">
            {hitError.offset > 0 ? 'LATE' : 'EARLY'}
          </div>
        </div>
      )}

      {/* Hit Info Display - Show what note was pressed vs hit */}
      {lastHitInfo && performance.now() - lastHitInfo.timestamp < 2000 && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg font-mono text-center">
          <div className="text-lg">
            Pressed: <span className="text-blue-300">Note {lastHitInfo.pressedPitch}</span>
          </div>
          <div className="text-lg">
            Actual Note: <span className="text-green-300">Note {lastHitInfo.hitPitch}</span>
          </div>
          {lastHitInfo.pressedPitch !== lastHitInfo.hitPitch && (
            <div className="text-sm text-yellow-300 mt-1">
              Missed Note 
            </div>
          )}
        </div>
      )}

      {/* Countdown Overlay */}
      {gameState === 'countdown' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="text-8xl font-bold animate-pulse mb-4">
              {countdown}
            </div>
            {soundFontState.isReady && (
              <p className="text-green-400 text-xl">🎹 {soundFontState.selectedSoundFont} Ready!</p>
            )}
            {backgroundAudioReady && (
              <p className="text-orange-400 text-lg">🎼 Background Audio Ready!</p>
            )}
            {!backgroundAudioReady && midiFileForBackground && (
              <p className="text-red-400 text-lg">❌ Background Audio Failed to Load</p>
            )}
          </div>
        </div>
      )}

      {/* Pause Overlay */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
          <div className="text-center text-white">
            <Pause className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-4xl font-bold mb-4">Paused</h2>
            <p className="text-xl">Press ESC to resume</p>
            {soundFontState.isReady && (
              <p className="text-green-400 mt-2">🎹 {soundFontState.selectedSoundFont} Ready</p>
            )}
            {backgroundAudioReady && (
              <p className="text-orange-400 mt-1">🎼 Background Audio Paused</p>
            )}
            {!backgroundAudioReady && midiFileForBackground && (
              <p className="text-red-400 mt-1">❌ Background Audio Error</p>
            )}
          </div>
        </div>
      )}

              {/* Instructions */}
        <div className="absolute bottom-6 left-6 text-white/70 text-sm">
          <p>Use piano keys (Z-M: white keys, S-L: black keys, Q-U: upper octave) • ESC to pause • F12 for debug info • F3 for background controls</p>
          <p className="text-yellow-300">📚 Learning Mode: Left panel shows current hittable notes and upcoming notes in real-time</p>
          <p className="text-blue-300">🎹 Keys work like a piano - press to play notes with fixed duration</p>
        {soundFontState.isReady && (
          <p className="text-green-400">🎵 Professional audio with {soundFontState.selectedSoundFont} SoundFont</p>
        )}
        {backgroundAudioReady && gameState === 'playing' && (
          <p className="text-orange-400">🎼 Background instruments playing automatically</p>
        )}
        {backgroundAudioReady && gameState !== 'playing' && (
          <p className="text-gray-400">🎼 Background instruments ready (will start with game)</p>
        )}
        {!backgroundAudioReady && midiFileForBackground && (
          <p className="text-red-400">❌ Background audio failed to initialize - some instruments may be missing</p>
        )}
      </div>
    </div>
  );
};