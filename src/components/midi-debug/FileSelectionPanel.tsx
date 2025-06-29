import React from 'react';
import { FileMusic, RefreshCw } from 'lucide-react';
import { getMidiSongs } from '../../data/songs';
import { MidiSong } from '../../types/music';

interface FileSelectionPanelProps {
  selectedFile: string;
  isLoading: boolean;
  onFileSelect: (file: string, song?: MidiSong) => void;
  onReload: () => void;
}

// Get available MIDI songs and map them to their easy difficulty files
const getAvailableMidiFiles = () => {
  const midiSongs = getMidiSongs();
  return midiSongs
    .filter(song => song.difficulties.includes('easy') && song.midiFiles.easy)
    .map(song => ({
      path: song.midiFiles.easy!,
      name: song.title,
      description: `${song.artist} - ${song.duration}`,
      song: song
    }));
};

const AVAILABLE_MIDI_FILES = getAvailableMidiFiles();

export const FileSelectionPanel: React.FC<FileSelectionPanelProps> = ({ 
  selectedFile, 
  isLoading, 
  onFileSelect, 
  onReload 
}) => (
  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
    <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
      <FileMusic className="w-5 h-5 text-orange-400" />
      <span>MIDI File Selection</span>
    </h2>
    
    <div className="space-y-3">
      {AVAILABLE_MIDI_FILES.map((file) => (
        <button
          key={file.path}
          onClick={() => onFileSelect(file.path, file.song)}
          className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
            selectedFile === file.path
              ? 'bg-orange-500/30 border-2 border-orange-400'
              : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
          }`}
        >
          <div className="font-semibold text-white">{file.name}</div>
          <div className="text-sm text-white/60">{file.description}</div>
          <div className="text-xs text-white/40 font-mono">{file.path}</div>
          <div className="text-xs text-green-400 mt-1">
            SoundFont: {file.song.soundFont ? file.song.soundFont.split('/').pop() : 'Equinox Grand Pianos (default)'}
          </div>
        </button>
      ))}
    </div>

    <button
      onClick={onReload}
      disabled={isLoading}
      className="w-full mt-4 bg-orange-500 hover:bg-orange-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
    >
      <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
      <span>{isLoading ? 'Loading...' : 'Reload File'}</span>
    </button>
  </div>
); 