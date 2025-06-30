import React from 'react';
import { Play, Settings, Music, FileMusic, X, Piano, TestTube, Headphones } from 'lucide-react';

interface MainMenuProps {
  onPlay: () => void;
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
          onClick={onPlay}
          className="group relative w-80 h-20 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold text-xl rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-green-500/25 animate-pulse"
          style={{ animationDuration: '2s' }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500 rounded-xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
          <div className="relative flex items-center justify-center space-x-3">
            <Play className="w-6 h-6 fill-current" />
            <span>PLAY</span>
          </div>
        </button>

        {/* SoundFont POC Button */}
        <button
          onClick={onSoundFontPOC}
          className="group relative w-72 h-18 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold text-lg rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-green-500/25"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-green-500 rounded-xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
          <div className="relative flex items-center justify-center space-x-3 py-4">
            <Headphones className="w-5 h-5" />
            <span>SOUNDFONT POC</span>
          </div>
        </button>

        {/* Gameplay POC Button */}
        <button
          onClick={onGameplayPOC}
          className="group relative w-72 h-18 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-white font-bold text-lg rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-yellow-500/25"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
          <div className="relative flex items-center justify-center space-x-3 py-4">
            <TestTube className="w-5 h-5" />
            <span>GAMEPLAY POC</span>
          </div>
        </button>

        {/* Professional Music Player Button */}
        <button
          onClick={onSmplrPlayer}
          className="group relative w-72 h-18 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-400 hover:to-purple-500 text-white font-bold text-lg rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-purple-500/25"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-purple-500 rounded-xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
          <div className="relative flex items-center justify-center space-x-3 py-4">
            <Piano className="w-5 h-5" />
            <span>PROFESSIONAL PLAYER</span>
          </div>
        </button>

        {/* Basic Music Player Button */}
        <button
          onClick={onMusicPlayer}
          className="group relative w-72 h-18 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold text-lg rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-indigo-500/25"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-indigo-500 rounded-xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
          <div className="relative flex items-center justify-center space-x-3 py-4">
            <Music className="w-5 h-5" />
            <span>BASIC PLAYER</span>
          </div>
        </button>

        {/* MIDI Parser Debug Button */}
        <button
          onClick={onMidiDebug}
          className="group relative w-72 h-18 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-bold text-lg rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-orange-500/25"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-orange-400 to-orange-500 rounded-xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
          <div className="relative flex items-center justify-center space-x-3 py-4">
            <FileMusic className="w-5 h-5" />
            <span>MIDI PARSER DEBUG</span>
          </div>
        </button>

        {/* Multiplayer Test Button */}
        <button
          onClick={onMultiplayerTest}
          className="group relative w-72 h-18 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-bold text-lg rounded-xl shadow-2xl transform transition-all duration-300 hover:scale-110 hover:shadow-cyan-500/25"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-cyan-500 rounded-xl blur opacity-0 group-hover:opacity-75 transition-opacity duration-300"></div>
          <div className="relative flex items-center justify-center space-x-3 py-4">
            <TestTube className="w-5 h-5" />
            <span>MULTIPLAYER TEST</span>
          </div>
        </button>

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