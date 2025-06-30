import React, { useState } from 'react';
import { Volume2, VolumeX, Eye, EyeOff, Settings } from 'lucide-react';
import { BackgroundInstrument } from '../../game/BackgroundInstrumentManager';

interface BackgroundInstrumentPanelProps {
  instruments: BackgroundInstrument[];
  onToggleMute: (channel: number) => void;
  onVolumeChange: (channel: number, volume: number) => void;
  onToggleEnabled: (channel: number, enabled: boolean) => void;
  isVisible: boolean;
  onToggleVisibility: () => void;
}

export const BackgroundInstrumentPanel: React.FC<BackgroundInstrumentPanelProps> = ({
  instruments,
  onToggleMute,
  onVolumeChange,
  onToggleEnabled,
  isVisible,
  onToggleVisibility
}) => {
  const [expandedChannels, setExpandedChannels] = useState<Set<number>>(new Set());

  const toggleChannelExpanded = (channel: number) => {
    const newExpanded = new Set(expandedChannels);
    if (newExpanded.has(channel)) {
      newExpanded.delete(channel);
    } else {
      newExpanded.add(channel);
    }
    setExpandedChannels(newExpanded);
  };

  if (!isVisible) {
    return (
      <button
        onClick={onToggleVisibility}
        className="fixed top-32 right-6 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-white/70 hover:text-white transition-colors duration-200 z-40"
        title="Show Background Instruments"
      >
        <Settings className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed top-32 right-6 bg-black/80 backdrop-blur-sm rounded-lg border border-white/20 text-white max-w-sm z-40 max-h-96 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20">
        <div className="flex items-center space-x-2">
          <Volume2 className="w-5 h-5 text-blue-400" />
          <h3 className="font-semibold">Background Instruments</h3>
        </div>
        <button
          onClick={onToggleVisibility}
          className="text-white/70 hover:text-white transition-colors duration-200"
          title="Hide Panel"
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>

      {/* Instruments List */}
      <div className="p-2 space-y-2">
        {instruments.length === 0 ? (
          <div className="text-white/60 text-sm p-4 text-center">
            No background instruments available
          </div>
        ) : (
          instruments.map((instrument) => (
            <div
              key={instrument.channel}
              className={`bg-white/5 rounded-lg border transition-all duration-200 ${
                instrument.isEnabled ? 'border-white/10' : 'border-red-500/30'
              }`}
            >
              {/* Instrument Header */}
              <div className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      instrument.isEnabled ? 'bg-blue-500 text-white' : 'bg-gray-500 text-gray-300'
                    }`}>
                      {instrument.channel + 1}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{instrument.name}</div>
                      <div className="text-xs text-white/60">{instrument.notes.length} notes</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {/* Enable/Disable Toggle */}
                    <button
                      onClick={() => onToggleEnabled(instrument.channel, !instrument.isEnabled)}
                      className={`p-1 rounded transition-colors duration-200 ${
                        instrument.isEnabled 
                          ? 'text-green-400 hover:text-green-300' 
                          : 'text-red-400 hover:text-red-300'
                      }`}
                      title={instrument.isEnabled ? 'Disable instrument' : 'Enable instrument'}
                    >
                      {instrument.isEnabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>

                    {/* Mute Toggle */}
                    <button
                      onClick={() => onToggleMute(instrument.channel)}
                      disabled={!instrument.isEnabled}
                      className={`p-1 rounded transition-colors duration-200 disabled:opacity-50 ${
                        instrument.isMuted 
                          ? 'text-red-400 hover:text-red-300' 
                          : 'text-white/70 hover:text-white'
                      }`}
                      title={instrument.isMuted ? 'Unmute' : 'Mute'}
                    >
                      {instrument.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>

                    {/* Expand/Collapse */}
                    <button
                      onClick={() => toggleChannelExpanded(instrument.channel)}
                      className="text-white/70 hover:text-white transition-colors duration-200 text-xs"
                    >
                      {expandedChannels.has(instrument.channel) ? '▼' : '▶'}
                    </button>
                  </div>
                </div>

                {/* Volume Control (always visible) */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-white/60 w-12">Vol:</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={instrument.volume}
                    onChange={(e) => onVolumeChange(instrument.channel, parseFloat(e.target.value))}
                    disabled={!instrument.isEnabled || instrument.isMuted}
                    className="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                  />
                  <span className="text-xs text-white/60 w-8">{Math.round(instrument.volume * 100)}%</span>
                </div>
              </div>

              {/* Expanded Details */}
              {expandedChannels.has(instrument.channel) && (
                <div className="px-3 pb-3 border-t border-white/10">
                  <div className="mt-2 space-y-1 text-xs text-white/60">
                    <div>Program: {instrument.instrument}</div>
                    <div>Notes: {instrument.notes.length}</div>
                    {instrument.notes.length > 0 && (
                      <>
                        <div>Time Range: {instrument.notes[0].time.toFixed(1)}s - {instrument.notes[instrument.notes.length - 1].time.toFixed(1)}s</div>
                        <div>Pitch Range: {Math.min(...instrument.notes.map(n => n.pitch))} - {Math.max(...instrument.notes.map(n => n.pitch))}</div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {instruments.length > 0 && (
        <div className="p-3 border-t border-white/20 text-xs text-white/60">
          <div className="flex justify-between">
            <span>Total: {instruments.length} instruments</span>
            <span>Active: {instruments.filter(i => i.isEnabled && !i.isMuted).length}</span>
          </div>
        </div>
      )}
    </div>
  );
};