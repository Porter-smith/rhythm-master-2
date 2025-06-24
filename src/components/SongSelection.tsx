import React, { useState } from 'react';
import { ArrowLeft, Play, Star, Clock, User, Music2, FileMusic } from 'lucide-react';
import { Song } from '../types/game';
import { allSongs } from '../data/songs';
import { WaveformPreview } from './WaveformPreview';

interface SongSelectionProps {
  onSongSelect: (song: Song, difficulty: 'easy' | 'medium' | 'hard') => void;
  onBack: () => void;
}

export const SongSelection: React.FC<SongSelectionProps> = ({ onSongSelect, onBack }) => {
  const [hoveredSong, setHoveredSong] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-400';
      case 'medium': return 'text-orange-400';
      case 'hard': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getDifficultyStars = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 1;
      case 'medium': return 2;
      case 'hard': return 3;
      default: return 1;
    }
  };

  const getFormatIcon = (format: string) => {
    return format === 'midi' ? <FileMusic className="w-4 h-4" /> : <Music2 className="w-4 h-4" />;
  };

  const getFormatColor = (format: string) => {
    return format === 'midi' 
      ? 'bg-blue-500/20 text-blue-300 border-blue-500/30' 
      : 'bg-green-500/20 text-green-300 border-green-500/30';
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
          <span>Back to Menu</span>
        </button>
        
        <h1 className="text-4xl font-bold text-white text-center flex-1">
          Select Your Song
        </h1>
        
        <div className="w-24"></div>
      </div>

      {/* Format Legend */}
      <div className="flex justify-center mb-8">
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <Music2 className="w-4 h-4 text-green-300" />
              <span className="text-white/70">Custom Notation</span>
            </div>
            <div className="flex items-center space-x-2">
              <FileMusic className="w-4 h-4 text-blue-300" />
              <span className="text-white/70">MIDI Format</span>
            </div>
          </div>
        </div>
      </div>

      {/* Song Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
        {allSongs.map((song) => (
          <div
            key={song.id}
            className="group relative bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer"
            onMouseEnter={() => setHoveredSong(song.id)}
            onMouseLeave={() => setHoveredSong(null)}
            onClick={() => setSelectedSong(song)}
          >
            {/* Format Badge */}
            <div className="absolute top-4 right-4">
              <div className={`flex items-center space-x-1 px-2 py-1 rounded-lg border text-xs font-mono ${getFormatColor(song.format)}`}>
                {getFormatIcon(song.format)}
                <span>{song.format.toUpperCase()}</span>
              </div>
            </div>

            {/* Song Info */}
            <div className="mb-4 pr-16">
              <h3 className="text-2xl font-bold text-white mb-2">{song.title}</h3>
              <div className="flex items-center space-x-2 text-white/70 mb-1">
                <User className="w-4 h-4" />
                <span className="italic text-lg">{song.artist}</span>
              </div>
              <div className="flex items-center space-x-2 text-white/70">
                <Clock className="w-4 h-4" />
                <span className="font-mono">{song.duration}</span>
                <span className="text-white/50">•</span>
                <span className="font-mono">{song.bpm} BPM</span>
              </div>
            </div>

            {/* Waveform Preview */}
            {hoveredSong === song.id && (
              <div className="mb-4 h-16 bg-black/30 rounded-lg overflow-hidden">
                <WaveformPreview song={song} />
              </div>
            )}

            {/* Difficulties */}
            <div className="space-y-2">
              <h4 className="text-white/80 font-semibold">Difficulties:</h4>
              {song.difficulties.map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSongSelect(song, difficulty);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-lg bg-black/20 hover:bg-black/40 transition-colors duration-200 ${getDifficultyColor(difficulty)}`}
                >
                  <div className="flex items-center space-x-2">
                    <div className="flex">
                      {[...Array(getDifficultyStars(difficulty))].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-current" />
                      ))}
                    </div>
                    <span className="capitalize font-semibold">{difficulty}</span>
                  </div>
                  <Play className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                </button>
              ))}
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>
        ))}
      </div>

      {/* Song Preview Modal */}
      {selectedSong && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-8">
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 max-w-md w-full border border-white/20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-bold text-white">{selectedSong.title}</h2>
              <div className={`flex items-center space-x-1 px-3 py-1 rounded-lg border text-sm font-mono ${getFormatColor(selectedSong.format)}`}>
                {getFormatIcon(selectedSong.format)}
                <span>{selectedSong.format.toUpperCase()}</span>
              </div>
            </div>
            <p className="text-white/70 text-lg italic mb-6">{selectedSong.artist}</p>
            
            <div className="space-y-4 mb-8">
              {selectedSong.difficulties.map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => onSongSelect(selectedSong, difficulty)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl bg-black/20 hover:bg-black/40 transition-all duration-200 hover:scale-105 ${getDifficultyColor(difficulty)}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex">
                      {[...Array(getDifficultyStars(difficulty))].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-current" />
                      ))}
                    </div>
                    <span className="capitalize font-bold text-xl">{difficulty}</span>
                  </div>
                  <Play className="w-6 h-6" />
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setSelectedSong(null)}
              className="w-full py-3 text-white/70 hover:text-white transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};