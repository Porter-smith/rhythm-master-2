import React, { useState, useEffect } from 'react';
import { MainMenu } from './MainMenu';
import { SongSelection } from './SongSelection';
import { GameplayScreen } from './GameplayScreen';
import { SettingsMenu } from './SettingsMenu';
import { ScoreScreen } from './ScoreScreen';
import { AudioOffsetCalibration } from './AudioOffsetCalibration';
import { MusicPlayerDemo } from './MusicPlayerDemo';
import { SmplrMusicPlayer } from './SmplrMusicPlayer';
import { MidiParserDebug } from './MidiParserDebug';
import { MultiplayerTest } from './MultiplayerTest';
import { SoundFontPOC } from './SoundFontPOC';
import { GameplayPOC } from './GameplayPOC';
import { ReplayViewer } from './ReplayViewer';
import { GameState, Song, GameScore, GameReplay } from '../types/game';
import { AudioEngine } from '../game/AudioEngine';

export const RhythmGameApp: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('menu');
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [selectedInstrument, setSelectedInstrument] = useState<{ channel: number; instrument: number; name: string } | undefined>(undefined);
  const [gameScore, setGameScore] = useState<GameScore | null>(null);
  const [audioOffset, setAudioOffset] = useState<number>(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [audioEngine] = useState(() => new AudioEngine());
  const [controlType, setControlType] = useState<'keyboard' | 'midi'>('keyboard');
  
  // Replay viewing state
  const [currentReplay, setCurrentReplay] = useState<GameReplay | null>(null);

  useEffect(() => {
    audioEngine.initialize();
    return () => audioEngine.destroy();
  }, [audioEngine]);

  const transitionTo = (newState: GameState) => {
    setIsTransitioning(true);
    setTimeout(() => {
      setGameState(newState);
      setIsTransitioning(false);
    }, 250);
  };

  const handlePlayGame = () => {
    transitionTo('songSelection');
  };

  const handleSettings = () => {
    transitionTo('settings');
  };

  const handleMusicPlayer = () => {
    transitionTo('musicPlayer');
  };

  const handleSmplrPlayer = () => {
    transitionTo('smplrPlayer' as GameState);
  };

  const handleMidiDebug = () => {
    transitionTo('midiDebug');
  };

  const handleMultiplayerTest = () => {
    transitionTo('multiplayerTest' as GameState);
  };

  const handleSoundFontPOC = () => {
    transitionTo('soundFontPOC' as GameState);
  };

  const handleGameplayPOC = () => {
    transitionTo('gameplayPOC' as GameState);
  };

  const handleSongSelect = (song: Song, difficulty: 'easy' | 'medium' | 'hard', instrument?: { channel: number; instrument: number; name: string }) => {
    setSelectedSong(song);
    setSelectedDifficulty(difficulty);
    setSelectedInstrument(instrument);
    transitionTo('gameplay');
  };

  const handleGameComplete = (score: GameScore) => {
    setGameScore(score);
    transitionTo('score');
  };

  const handleReturnToMenu = () => {
    setSelectedSong(null);
    setSelectedInstrument(undefined);
    setGameScore(null);
    transitionTo('menu');
  };

  const handleCalibration = () => {
    transitionTo('calibration');
  };

  const handleCalibrationComplete = (offset: number) => {
    setAudioOffset(offset);
    transitionTo('settings');
  };

  const handleViewReplay = (replay: GameReplay) => {
    setCurrentReplay(replay);
    transitionTo('replay');
  };

  const handleReplayBack = () => {
    setCurrentReplay(null);
    transitionTo('songSelection');
  };

  const renderCurrentScreen = () => {
    switch (gameState) {
      case 'menu':
        return (
          <MainMenu
            onPlay={handlePlayGame}
            onSettings={handleSettings}
            onMusicPlayer={handleMusicPlayer}
            onSmplrPlayer={handleSmplrPlayer}
            onMidiDebug={handleMidiDebug}
            onMultiplayerTest={handleMultiplayerTest}
            onSoundFontPOC={handleSoundFontPOC}
            onGameplayPOC={handleGameplayPOC}
            onQuit={() => window.close()}
          />
        );
      case 'songSelection':
        return (
          <SongSelection
            onSongSelect={handleSongSelect}
            onBack={() => transitionTo('menu')}
            onViewReplay={handleViewReplay}
          />
        );
      case 'gameplay':
        return selectedSong ? (
          <GameplayScreen
            song={selectedSong}
            difficulty={selectedDifficulty}
            audioOffset={audioOffset}
            onGameComplete={handleGameComplete}
            onBack={() => transitionTo('songSelection')}
            audioEngine={audioEngine}
            selectedInstrument={selectedInstrument}
          />
        ) : null;
      case 'settings':
        return (
          <SettingsMenu
            audioOffset={audioOffset}
            onAudioOffsetChange={setAudioOffset}
            onCalibrate={handleCalibration}
            onBack={() => transitionTo('menu')}
            controlType={controlType}
            onControlTypeChange={setControlType}
          />
        );
      case 'score':
        return gameScore ? (
          <ScoreScreen
            score={gameScore}
            song={selectedSong!}
            difficulty={selectedDifficulty}
            onReturnToMenu={handleReturnToMenu}
            onPlayAgain={() => transitionTo('gameplay')}
          />
        ) : null;
      case 'calibration':
        return (
          <AudioOffsetCalibration
            onComplete={handleCalibrationComplete}
            onBack={() => transitionTo('settings')}
            audioEngine={audioEngine}
          />
        );
      case 'musicPlayer':
        return (
          <MusicPlayerDemo
            onBack={() => transitionTo('menu')}
          />
        );
      case 'smplrPlayer' as GameState:
        return (
          <SmplrMusicPlayer
            onBack={() => transitionTo('menu')}
          />
        );
      case 'midiDebug':
        return (
          <MidiParserDebug
            onBack={() => transitionTo('menu')}
          />
        );
      case 'multiplayerTest' as GameState:
        return (
          <MultiplayerTest
            onBack={() => transitionTo('menu')}
          />
        );
      case 'soundFontPOC' as GameState:
        return (
          <SoundFontPOC
            onBack={() => transitionTo('menu')}
          />
        );
      case 'gameplayPOC' as GameState:
        return (
          <GameplayPOC
            onBack={() => transitionTo('menu')}
          />
        );
      case 'replay':
        return currentReplay ? (
          <ReplayViewer
            replay={currentReplay}
            onBack={handleReplayBack}
          />
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden">
      {/* Bolt.new Badge */}
      <a 
        href="https://bolt.new"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed top-4 right-4 z-50 transition-transform hover:scale-105"
      >
        <img 
          src="/assets/badges/bolt.png" 
          alt="Powered by Bolt.new" 
          className="w-16 h-16"
        />
      </a>

      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white to-transparent transform -skew-x-12 animate-pulse"></div>
      </div>
      
      {/* Main content */}
      <div className={`relative z-10 transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
        {renderCurrentScreen()}
      </div>
      
      {/* Particle effects overlay */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-30 animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};