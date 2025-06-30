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
  const { soundFontState, loadSongSoundFont, playNote } = useSoundFontManager();
  
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

  // Background instruments state
  const [showBackgroundPanel, setShowBackgroundPanel] = useState(false);
  const [midiFileForBackground, setMidiFileForBackground] = useState<ArrayBuffer | null>(null);
  const [backgroundAudioReady, setBackgroundAudioReady] = useState(false);

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
    songSoundFont: (song as any).soundFont || 'None (using default)',
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

  // Initialize game with proper loading phases - ONLY RUN ONCE
  useEffect(() => {
    // Prevent multiple initializations
    if (initializationRef.current) {
      console.log('🔄 Initialization already started, skipping...');
      return;
    }

    initializationRef.current = true;
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
        if (song.format === 'midi' && (!song.notes[difficulty] || song.notes[difficulty]!.length === 0)) {
          console.log(`🎹 MIDI song detected - need to load ${difficulty} difficulty only`);
          
          // Create a modified song that only loads the selected difficulty
          const singleDifficultySong = {
            ...song,
            difficulties: [difficulty], // Only load the selected difficulty
            midiFiles: {
              [difficulty]: (song as any).midiFiles?.[difficulty]
            }
          };
          
          try {
            if (!musicPlayerRef.current) {
              musicPlayerRef.current = MusicPlayer.getInstance();
              await musicPlayerRef.current.initialize();
            }

            console.log(`🎯 Loading only ${difficulty} difficulty to avoid loading all files`);
            await musicPlayerRef.current.loadSong(singleDifficultySong as any);
            
            // Copy the loaded notes back to the original song
            if (singleDifficultySong.notes[difficulty]) {
              finalSong.notes[difficulty] = singleDifficultySong.notes[difficulty];
            }
            
            console.log(`✅ MIDI ${difficulty} difficulty loaded successfully`);

            // Load MIDI file for background instruments
            const midiUrl = (song as any).midiFiles?.[difficulty];
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
          message: (song as any).soundFont ? `Loading ${(song as any).soundFont.includes('gzdoom') ? 'GZDoom' : 'Custom'} SoundFont...` : 'Loading Piano SoundFont...',
          progress: 60
        });

        const soundFontSuccess = await loadSongSoundFont(finalSong as any, selectedInstrument);
        
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
  }, []); // Empty dependency array - only run once on mount

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
          console.log('🎮 Countdown finished - starting game and background audio!');
          setGameState('playing');
          
          // CRITICAL: Set the callback one more time right before starting
          if (gameEngineRef.current && soundFontState.isReady) {
            console.log('🎹 Final SoundFont callback setup before game start');
            gameEngineRef.current.setSoundFontCallback(playNote);
          }
          
          gameEngineRef.current?.start();
          console.log('🎮 Game started with SoundFont support!');
          console.log(`🔍 Final SoundFont check at game start:`, {
            samplerExists: !!soundFontState.sampler,
            isReady: soundFontState.isReady,
            contextState: soundFontState.sampler?.context?.state
          });
        } else {
          setCountdown(countdown - 1);
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, countdown, soundFontState, playNote]);

  // Input handling
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.code === 'Space' && gameState === 'playing') {
      event.preventDefault();
      const result = gameEngineRef.current?.handleInput(performance.now());
      if (result) {
        setScore(result.score);
        setCombo(result.combo);
        setAccuracy(result.accuracy);
      }
    } else if (event.code === 'Escape') {
      if (gameState === 'playing') {
        setGameState('paused');
        gameEngineRef.current?.pause();
      } else if (gameState === 'paused') {
        setGameState('playing');
        gameEngineRef.current?.resume();
      }
    } else if (event.code === 'F12' || (event.ctrlKey && event.shiftKey && event.code === 'KeyD')) {
      event.preventDefault();
      setShowDebug(!showDebug);
    } else if (event.code === 'KeyB' && gameState === 'playing') {
      // Toggle background instruments panel with 'B' key
      event.preventDefault();
      setShowBackgroundPanel(!showBackgroundPanel);
    }
  }, [gameState, showDebug, showBackgroundPanel]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Game loop
  useEffect(() => {
    if (gameState !== 'playing') return;

    const gameLoop = () => {
      const canvas = canvasRef.current;
      if (!canvas || !gameEngineRef.current) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Update game state
      const currentState = gameEngineRef.current.update(performance.now());
      
      // Update filtered notes from game engine state
      setFilteredNotes(currentState.notes);
      
      // Check if game is complete
      if (currentState.isComplete) {
        const finalScore: GameScore = {
          score: currentState.score,
          accuracy: currentState.accuracy,
          combo: currentState.maxCombo,
          hitStats: currentState.hitStats,
          grade: calculateGrade(currentState.accuracy)
        };
        console.log('🎉 Game complete! Final score:', finalScore);
        onGameComplete(finalScore);
        return;
      }

      // Render game
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

    // Draw staff lines
    const staffY = height * 0.3;
    const staffHeight = height * 0.4;
    const lineSpacing = staffHeight / 8;

    ctx.strokeStyle = '#ffffff40';
    ctx.lineWidth = 1;

    // Treble staff
    for (let i = 0; i < 5; i++) {
      const y = staffY + i * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Bass staff
    for (let i = 0; i < 5; i++) {
      const y = staffY + staffHeight * 0.6 + i * lineSpacing;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Hit line (red line at 25% width)
    const hitLineX = width * 0.25;
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(hitLineX, staffY);
    ctx.lineTo(hitLineX, staffY + staffHeight);
    ctx.stroke();

    // Hit window (semi-transparent area)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(hitLineX - 20, staffY, 40, staffHeight);

    // Draw notes
    filteredNotes.forEach((note: FilteredNote) => {
      const noteX = hitLineX + ((note.timeToHit || 0) * 200);
      const noteY = getNoteY(note.pitch, staffY, lineSpacing);
      
      // Note color based on state
      let color = '#4169E1';
      if (note.pitch < 60) color = '#DC143C';
      if (note.isHit) color = '#32CD32';
      if (note.isMissed) color = '#FF0000';
      if (note.isActive) color = '#FFD700';

      // Draw note
      ctx.fillStyle = color;
      ctx.fillRect(noteX - 20, noteY - 5, 40, 10);

      // Add sharp symbol if needed
      if (isSharpNote(note.pitch)) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.fillText('#', noteX - 35, noteY + 5);
      }
    });

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
      ctx.fillText(`🎼 Background Audio Playing (Press B for controls)`, 20, height - 40);
    } else if (backgroundAudioReady && gameState !== 'playing') {
      ctx.fillStyle = '#888888';
      ctx.font = '14px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`🎼 Background Audio Ready (will start with game)`, 20, height - 40);
    }
  };

  const getNoteY = (pitch: number, staffY: number, lineSpacing: number): number => {
    const middleC = 60;
    const noteOffset = pitch - middleC;
    return staffY + (4 * lineSpacing) - (noteOffset * lineSpacing * 0.5);
  };

  const isSharpNote = (pitch: number): boolean => {
    const noteInOctave = pitch % 12;
    return [1, 3, 6, 8, 10].includes(noteInOctave);
  };

  const togglePause = () => {
    if (gameState === 'playing') {
      setGameState('paused');
      gameEngineRef.current?.pause();
    } else if (gameState === 'paused') {
      setGameState('playing');
      gameEngineRef.current?.resume();
    }
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
        </div>
      </div>

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
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-6 left-6 text-white/70 text-sm">
        <p>Press SPACEBAR to hit notes • ESC to pause • F12 for debug info • B for background controls</p>
        {soundFontState.isReady && (
          <p className="text-green-400">🎵 Professional audio with {soundFontState.selectedSoundFont} SoundFont</p>
        )}
        {backgroundAudioReady && gameState === 'playing' && (
          <p className="text-orange-400">🎼 Background instruments playing automatically</p>
        )}
        {backgroundAudioReady && gameState !== 'playing' && (
          <p className="text-gray-400">🎼 Background instruments ready (will start with game)</p>
        )}
      </div>
    </div>
  );
};