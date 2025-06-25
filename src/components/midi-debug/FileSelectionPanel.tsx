import React from 'react';
import { FileMusic, RefreshCw } from 'lucide-react';

interface FileSelectionPanelProps {
  selectedFile: string;
  isLoading: boolean;
  onFileSelect: (file: string) => void;
  onReload: () => void;
}

const AVAILABLE_MIDI_FILES = [
  { path: '/midi/twinkle-easy.midi', name: 'Twinkle Twinkle (Easy)', description: 'Simple melody for testing basic parsing' },
  { path: '/midi/dooms-gate-easy.mid', name: 'Dooms Gate (Easy)', description: 'Dooms Gate melody' },
  { path: '/midi/spearsofjustice-easy.mid', name: 'Spear of Justice (Easy)', description: 'Spear of Justice melody' },
  { path: '/midi/test-drive-easy.mid', name: 'Test Drive (Easy)', description: 'Test Drive melody' }
];

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
          onClick={() => onFileSelect(file.path)}
          className={`w-full p-3 rounded-lg text-left transition-all duration-200 ${
            selectedFile === file.path
              ? 'bg-orange-500/30 border-2 border-orange-400'
              : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
          }`}
        >
          <div className="font-semibold text-white">{file.name}</div>
          <div className="text-sm text-white/60">{file.description}</div>
          <div className="text-xs text-white/40 font-mono">{file.path}</div>
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