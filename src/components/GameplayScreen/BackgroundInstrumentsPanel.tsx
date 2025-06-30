import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Piano, VolumeX, ArrowLeft } from 'lucide-react';
import { BackgroundAudioManager } from './BackgroundAudioManager';

interface BackgroundInstrumentsPanelProps {
  hideSelectedChannel?: number;
  backgroundAudioManager: BackgroundAudioManager;
  onClose: () => void;
}

export const BackgroundInstrumentsPanel: React.FC<BackgroundInstrumentsPanelProps> = ({ 
  hideSelectedChannel, 
  backgroundAudioManager,
  onClose
}) => {
  const [voiceList, setVoiceList] = useState<string[]>([]);
  const [mutedChannels, setMutedChannels] = useState<Set<number>>(new Set());
  const [channelInstruments, setChannelInstruments] = useState<Map<number, number>>(new Map());
  const [showOnlyUsedChannels, setShowOnlyUsedChannels] = useState(true);

  // Update voice list and instrument data periodically
  useEffect(() => {
    const updateData = () => {
      if (backgroundAudioManager) {
        const newVoiceList = backgroundAudioManager.getVoiceList();
        setVoiceList(newVoiceList);
        
        const newMutedChannels = backgroundAudioManager.getMutedChannels();
        setMutedChannels(newMutedChannels);
        
        const newChannelInstruments = backgroundAudioManager.getChannelInstruments();
        setChannelInstruments(newChannelInstruments);
        
        console.log('🎼 Updated background instruments data:', {
          voiceListLength: newVoiceList.length,
          mutedChannelsCount: newMutedChannels.size,
          instrumentsCount: newChannelInstruments.size,
          instruments: Array.from(newChannelInstruments.entries())
        });
      }
    };

    // Update immediately
    updateData();

    // Update every 100ms for real-time voice tracking
    const interval = setInterval(updateData, 100);

    return () => clearInterval(interval);
  }, [backgroundAudioManager]);

  const toggleMuteChannel = (channelNum: number) => {
    const isMuted = mutedChannels.has(channelNum);
    backgroundAudioManager.muteChannel(channelNum, !isMuted);
    console.log(`🔇 Toggled mute for channel ${channelNum + 1}: ${!isMuted ? 'muted' : 'unmuted'}`);
  };

  // Debug: Log current state
  console.log('🎼 BackgroundInstrumentsPanel render:', {
    hideSelectedChannel,
    voiceListLength: voiceList.length,
    channelInstrumentsSize: channelInstruments.size,
    mutedChannelsSize: mutedChannels.size,
    showOnlyUsedChannels
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onClose}
          className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
          <span>Back to Game</span>
        </button>
        
        <h1 className="text-2xl font-bold text-white text-center flex-1">
          🎼 Background Instruments Control
        </h1>
        
        <div className="w-24"></div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-900/50 border border-blue-500/50 rounded-lg p-4">
        <h3 className="text-blue-300 font-bold mb-2">🎵 Background Instruments Control</h3>
        <p className="text-blue-200 text-sm mb-2">
          Background instruments are playing automatically with the game. Your selected instrument 
          <strong className="text-yellow-300"> (Channel {hideSelectedChannel ? hideSelectedChannel + 1 : 'N/A'}) </strong> 
          is hidden and muted since you're playing it manually.
        </p>
        <p className="text-blue-200 text-sm">
          • <strong>Mute/unmute</strong> individual channels to customize your backing track<br/>
          • <strong>Background audio</strong> automatically syncs with game play/pause<br/>
          • <strong>Close this panel</strong> to return to the game - background audio continues
        </p>
      </div>

      {/* Debug Information */}
      <div className="bg-gray-900/50 border border-gray-500/50 rounded-lg p-4">
        <h3 className="text-gray-300 font-bold mb-2">🔍 Debug Information</h3>
        <div className="text-gray-400 text-sm space-y-1">
          <div>Voice List Length: {voiceList.length}</div>
          <div>Channel Instruments: {channelInstruments.size}</div>
          <div>Muted Channels: {mutedChannels.size}</div>
          <div>Hidden Channel: {hideSelectedChannel !== undefined ? hideSelectedChannel + 1 : 'None'}</div>
          <div>Available Instruments: {Array.from(channelInstruments.entries()).map(([ch, prog]) => 
            `Ch${ch + 1}:${prog}`
          ).join(', ') || 'None detected'}</div>
        </div>
      </div>

      {/* Instruments List */}
      {channelInstruments.size > 0 ? (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20" style={{ maxHeight: 520, minHeight: 320, overflowY: 'auto' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Piano className="w-5 h-5 text-green-400" />
              <span>Background Instruments</span>
            </h2>
            
            <div className="flex items-center space-x-3">
              <label className="flex items-center space-x-2 text-sm text-white/70">
                <input
                  type="checkbox"
                  checked={showOnlyUsedChannels}
                  onChange={(e) => setShowOnlyUsedChannels(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-white/10 border-white/20 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span>Show only used channels</span>
              </label>
            </div>
          </div>
          
          <div className="space-y-3">
            {Array.from({ length: 16 }, (_, index) => {
              const channelNum = index;
              const instrument = channelInstruments.get(channelNum);
              const voiceText = voiceList[channelNum] || `Channel ${channelNum + 1}:\nUnknown\n`;
              
              // Hide selected channel
              if (hideSelectedChannel === channelNum) {
                return null;
              }
              
              // Parse the voice text to extract information
              const lines = voiceText.split('\n').filter(line => line.trim());
              const channelLine = lines[0] || `Channel ${channelNum + 1}`;
              const instrumentLine = lines[1] || 'Unknown';
              const noteLines = lines.slice(2).filter(line => line.startsWith('note:'));
              
              // Check if this channel is currently active (has playing notes)
              const isActive = noteLines.length > 0;
              
              // Check if this channel is used (has an instrument assigned or is currently active)
              const isUsed = instrument !== undefined || isActive || !showOnlyUsedChannels;
              
              // Skip rendering if channel is not used and we're showing only used channels
              if (!isUsed) {
                return null;
              }
              
              // Extract note numbers from note lines
              const playingNotes = noteLines.map(line => {
                const match = line.match(/note: (\d+)/);
                return match ? parseInt(match[1]) : null;
              }).filter(note => note !== null) as number[];
              
              return (
                <div key={channelNum} className={`bg-white/5 rounded-lg p-4 border transition-all duration-200 ${
                  isActive ? 'border-green-400/50 bg-green-400/10' : 'border-white/10'
                } ${mutedChannels.has(channelNum) ? 'opacity-50' : ''}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-200 ${
                        isActive 
                          ? 'bg-green-500 text-white animate-pulse' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {channelNum + 1}
                      </div>
                      <div>
                        <div className="text-white font-medium">{instrumentLine}</div>
                        <div className="text-white/60 text-sm">
                          {channelLine} • Program {instrument || 0}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => toggleMuteChannel(channelNum)}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                          mutedChannels.has(channelNum)
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-white/10 text-white/70 hover:bg-white/20'
                        }`}
                        title={mutedChannels.has(channelNum) ? 'Unmute channel' : 'Mute channel'}
                      >
                        <VolumeX className="w-4 h-4" />
                      </button>
                      <div className="text-right">
                        <div className="text-white font-mono text-sm">{playingNotes.length}</div>
                        <div className="text-white/60 text-xs">active notes</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Currently Playing Notes */}
                  <div className="mt-2 flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full transition-all duration-200 ${
                      isActive 
                        ? 'bg-green-400 animate-pulse' 
                        : 'bg-gray-400/40'
                    }`} />
                    <span className={`text-xs transition-colors duration-200 ${
                      isActive 
                        ? 'text-green-400 font-medium' 
                        : 'text-white/40'
                    }`}>
                      {isActive ? `Playing ${playingNotes.length} note${playingNotes.length !== 1 ? 's' : ''}` : 'Inactive'}
                      {mutedChannels.has(channelNum) && ' (Muted)'}
                    </span>
                  </div>
                  
                  {/* Show currently playing note details */}
                  <div className="mt-2 p-2 bg-white/5 rounded border border-white/10 min-h-[44px] flex flex-col justify-center">
                    <div className="text-xs text-white/60 mb-1">Currently playing:</div>
                    {playingNotes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {playingNotes.map((note, noteIndex) => (
                          <span 
                            key={noteIndex} 
                            className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded font-mono"
                            title={`Note ${note}`}
                          >
                            {note}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div style={{ minHeight: 20 }} />
                    )}
                  </div>
                </div>
              );
            }).filter(Boolean)}
          </div>
          
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="text-sm text-white/60">
              Used Channels: {Array.from({ length: 16 }).filter((_, index) => {
                if (hideSelectedChannel === index) return false;
                const instrument = channelInstruments.get(index);
                const voiceText = voiceList[index] || '';
                const isActive = voiceText.includes('note:');
                return instrument !== undefined || isActive;
              }).length} •
              Active Channels: {voiceList.filter(text => text.includes('note:')).length} •
              Total Active Notes: {voiceList.reduce((sum, text) => {
                const noteMatches = text.match(/note:/g);
                return sum + (noteMatches ? noteMatches.length : 0);
              }, 0)}
              {hideSelectedChannel !== undefined && (
                <> • Hidden: Channel {hideSelectedChannel + 1} (Your Instrument)</>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center">
          <Piano className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-white font-bold mb-2">No Instruments Detected</h3>
          <p className="text-white/60 text-sm">
            The MIDI file may not have loaded yet, or it may not contain instrument information.
          </p>
          <div className="mt-4 text-xs text-gray-400">
            Debug: Voice list length = {voiceList.length}, Channel instruments = {channelInstruments.size}
          </div>
        </div>
      )}
    </div>
  );
};