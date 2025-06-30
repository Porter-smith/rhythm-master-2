import React from 'react';
import { Play, Settings, Music, FileMusic, X, Piano, TestTube, Headphones } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  difficulties: string[];
  bpm: number;
  soundFont?: string;
}

interface MainMenuProps {
  onPlay: (song: Song) => void;
  onSettings: () => void;
  onMusicPlayer: () => void;
  onSmplrPlayer: () => void;
  onMidiDebug: () => void;
  onMultiplayerTest: () => void;
  onSoundFontPOC: () => void;
  onGameplayPOC: () => void;
  onQuit: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ 
  onPlay, 
  onSettings, 
  onMusicPlayer, 
  onSmplrPlayer,
  onMidiDebug,
  onMultiplayerTest,
  onSoundFontPOC,
  onGameplayPOC,
  onQuit 
}) => {
  // Sample song for testing
  const sampleSong: Song = {
    id: 'sample_song',
    title: 'Sample Song',
    artist: 'Test Artist',
    duration: 180,
    difficulties: ['easy', 'medium', 'hard'],
    bpm: 120,
    soundFont: 'https://smpldsnds.github.io/soundfonts/soundfonts/yamaha-grand-lite.sf2'
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Game Title */}
      <div className="mb-16 text-center">
        <h1 
          className="text-6xl font-black mb-4 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent"
          style={{ fontFamily: 'Orbitron, monospace', fontSize: '48px' }}
        >
          RhythmMaster
        </h1>
        <div className="w-32 h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent mx-auto"></div>
        <p className="text-white/70 text-lg mt-4 font-light">Master the rhythm, feel the beat</p>
      </div>

      {/* Menu Buttons */}
      <div className="flex flex-col items-center space-y-6">
        {/* Play Button */}
        <button
          onClick={() => onPlay(sampleSong)}
          className="group relative w-80 h-20 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold text-xl rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-green-500/25 animate-pulse"
          style={{ animationDuration: '2s' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500 rounded-xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
          <div className="relative flex items-center justify-center space-x-3">
            <Play className="w-6 h-6 fill-current" />
            <span>PLAY</span>
          </div>
        </button>

        {/* SoundFont POC Button
        <button
          onClick={onSoundFontPOC}
          className="group relative w-72 h-18 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold text-lg rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-green-500/25"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500 rounded-xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
          <div className="relative flex items-center justify-center space-x-3 py-4">
            <Headphones className="w-5 h-5" />
            <span>SOUNDFONT POC</span>
          </div>
        </button> */}

        {/* Gameplay POC Button
        <button
          onClick={onGameplayPOC}
          className="group relative w-72 h-18 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-white font-bold text-lg rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-yellow-500/25"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
          <div className="relative flex items-center justify-center space-x-3 py-4">
            <TestTube className="w-5 h-5" />
            <span>GAMEPLAY POC</span>
          </div>
        </button> */}




        {/* Settings Button */}
        <button
          onClick={onSettings}
          className="group relative w-64 h-16 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold text-lg rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-blue-500/25"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 rounded-xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
          <div className="relative flex items-center justify-center space-x-3">
            <Settings className="w-5 h-5" />
            <span>SETTINGS</span>
          </div>
        </button>

        {/* Quit Button */}
        <button
          onClick={onQuit}
          className="group relative w-52 h-14 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-bold text-base rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-red-500/25 mt-8"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-red-500 rounded-xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
          <div className="relative flex items-center justify-center space-x-3">
            <X className="w-4 h-4" />
            <span>QUIT</span>
          </div>
        </button>
      </div>

      {/* Footer */}
      <div className="absolute bottom-8 text-center text-white/50 text-sm">
        <p>Use headphones for the best experience</p>
      </div>
    </div>
  );
};