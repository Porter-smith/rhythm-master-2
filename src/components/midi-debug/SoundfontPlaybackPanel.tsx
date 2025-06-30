import React, { useState, useEffect, useRef } from 'react';
import { loadSoundFont, MIDI, SpessaSynthProcessor, SpessaSynthSequencer } from 'spessasynth_core';
import { Play, Pause, Square, Music, Volume2, AlertCircle, CheckCircle, Piano, VolumeX } from 'lucide-react';
import { getMidiInstrumentName, getInstrumentName, getInstrumentGroup } from '../../utils/midiParser';

interface SoundfontPlaybackPanelProps {
  hideSelectedChannel?: number;
  autoLoadMidi?: ArrayBuffer | null;
  gameMode?: boolean;
}

export const SoundfontPlaybackPanel: React.FC<SoundfontPlaybackPanelProps> = ({ 
  hideSelectedChannel, 
  autoLoadMidi,
  gameMode = false 
}) => {
  const [voiceList, setVoiceList] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sequencerReady, setSequencerReady] = useState(false);
  const [channelInstruments, setChannelInstruments] = useState<Map<number, number>>(new Map());
  const [message, setMessage] = useState(gameMode ? 'SoundFont ready for background instruments.' : 'Please upload a soundfont to begin.');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyUsedChannels, setShowOnlyUsedChannels] = useState(true);
  const [mutedChannels, setMutedChannels] = useState<Set<number>>(new Set());
  const contextRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<SpessaSynthProcessor | null>(null);
  const seqRef = useRef<SpessaSynthSequencer | null>(null);
  const voiceTrackingIntervalRef = useRef<number | null>(null);
  const audioLoopIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const initialVoiceList: string[] = [];
    for (let i = 0; i < 16; i++) {
      initialVoiceList.push(`Channel ${i + 1}:\nUnknown\n`);
    }
    setVoiceList(initialVoiceList);
  }, []);

  // Auto-load MIDI if provided (for game mode)
  useEffect(() => {
    if (autoLoadMidi && sequencerReady) {
      console.log('🎼 Auto-loading MIDI for background instruments...');
      handleMidiFromArrayBuffer(autoLoadMidi);
    }
  }, [autoLoadMidi, sequencerReady]);

  // Update voice list when toggle changes to ensure instrument names are preserved
  useEffect(() => {
    if (channelInstruments.size > 0) {
      const newVoiceList: string[] = [];
      for (let i = 0; i < 16; i++) {
        const instrument = channelInstruments.get(i);
        if (instrument !== undefined) {
          const instrumentName = synthRef.current ? 
            getInstrumentName(synthRef.current, instrument, i) : 'Unknown';
          const instrumentGroup = getInstrumentGroup(instrument, i);
          newVoiceList[i] = `Channel ${i + 1}:\n${instrumentGroup} - ${instrumentName}\n`;
        } else {
          newVoiceList[i] = `Channel ${i + 1}:\nUnknown\n`;
        }
      }
      setVoiceList(newVoiceList);
    }
  }, [showOnlyUsedChannels, channelInstruments]);

  const handleSoundfontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target?.files;
    if (!files?.[0]) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setMessage('Loading soundfont...');

      const context = new AudioContext({
        sampleRate: 44100
      });
      contextRef.current = context;

      await context.resume();

      const fontBuffer = await files[0].arrayBuffer();

      const synth = new SpessaSynthProcessor(44100);
      synthRef.current = synth;
      synth.soundfontManager.reloadManager(loadSoundFont(fontBuffer));

      const seq = new SpessaSynthSequencer(synth);
      seqRef.current = seq;
      setSequencerReady(true);

      setMessage(`SoundFont "${files[0].name}" has been loaded!`);

      audioLoopIntervalRef.current = window.setInterval(() => {
        const synTime = synth.currentSynthTime;

        if (synTime > context.currentTime + 0.1) {
          return;
        }

        const BUFFER_SIZE = 512;
        const output = [new Float32Array(BUFFER_SIZE), new Float32Array(BUFFER_SIZE)];
        const reverb = [new Float32Array(BUFFER_SIZE), new Float32Array(BUFFER_SIZE)];
        const chorus = [new Float32Array(BUFFER_SIZE), new Float32Array(BUFFER_SIZE)];

        seq.processTick();

        synth.renderAudio(output, reverb, chorus);

        const playAudio = (arr: Float32Array[], output: AudioNode) => {
          const outBuffer = new AudioBuffer({
            numberOfChannels: 2,
            length: 512,
            sampleRate: 44100
          });

          outBuffer.copyToChannel(arr[0], 0);
          outBuffer.copyToChannel(arr[1], 1);

          const source = new AudioBufferSourceNode(context, {
            buffer: outBuffer
          });
          source.connect(output);

          source.start(synTime);
        };

        playAudio(output, context.destination);
      }, 10);

    } catch (error) {
      console.error('Error loading soundfont:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(errorMessage);
      setMessage('Error loading soundfont. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMidiFromArrayBuffer = async (arrayBuffer: ArrayBuffer) => {
    if (!seqRef.current) {
      console.warn('⚠️ Sequencer not ready for MIDI loading');
      return;
    }

    try {
      setMessage('Loading MIDI file...');
      
      const midi = new MIDI(arrayBuffer);
      seqRef.current.loadNewSongList([midi]);
      
      // Parse MIDI to get instrument information
      const data = new Uint8Array(arrayBuffer);
      let pos = 0;

      // Helper functions for reading binary data
      const read32 = (): number => (data[pos++] << 24) | (data[pos++] << 16) | (data[pos++] << 8) | data[pos++];
      const read16 = (): number => (data[pos++] << 8) | data[pos++];
      const read8 = (): number => data[pos++];
      const readVarLength = (): number => {
        let value = 0;
        let byte: number;
        do {
          byte = read8();
          value = (value << 7) | (byte & 0x7F);
        } while (byte & 0x80);
        return value;
      };

      // Validate MIDI header
      if (data[0] !== 77 || data[1] !== 84 || data[2] !== 104 || data[3] !== 100) {
        throw new Error('Invalid MIDI file header');
      }
      pos = 4;

      // Read header chunk
      read32(); // Skip header length
      read16(); // Skip format
      const trackCount = read16();
      read16(); // Skip ticks per quarter

      const instruments = new Map<number, number>();

      // Process each track
      for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
        // Validate track header
        if (data[pos++] !== 77 || data[pos++] !== 84 || data[pos++] !== 114 || data[pos++] !== 107) {
          continue;
        }

        const trackLength = read32();
        const trackEnd = pos + trackLength;
        let runningStatus = 0;

        // Process track events
        while (pos < trackEnd) {
          const deltaTime = readVarLength();
          
          let command = read8();
          if (command < 0x80) {
            pos--;
            command = runningStatus;
          } else {
            runningStatus = command;
          }

          const messageType = command & 0xF0;
          const channel = command & 0x0F;

          if (messageType === 0xC0) {
            // Program Change (instrument selection)
            const instrument = read8();
            instruments.set(channel, instrument);
          } else if (command === 0xFF) {
            // Meta event
            const metaType = read8();
            const metaLength = readVarLength();
            pos += metaLength;
          } else if (messageType === 0x90 || messageType === 0x80) {
            // Note On/Off (2 bytes)
            read8();
            read8();
          } else if (messageType === 0xA0 || messageType === 0xB0 || messageType === 0xE0) {
            // Aftertouch, Control Change, Pitch Bend (2 bytes)
            read8();
            read8();
          } else if (messageType === 0xD0) {
            // Channel Pressure (1 byte)
            read8();
          } else if (command >= 0xF0) {
            // System exclusive
            const sysexLength = readVarLength();
            pos += sysexLength;
          }
        }
      }

      setChannelInstruments(instruments);
      setMessage(gameMode ? 'Background instruments loaded and ready!' : `Now playing: MIDI file`);
      
      // Immediately populate voice list with instrument names
      const newVoiceList: string[] = [];
      for (let i = 0; i < 16; i++) {
        const instrument = instruments.get(i);
        if (instrument !== undefined) {
          const instrumentName = synthRef.current ? 
            getInstrumentName(synthRef.current, instrument, i) : 'Unknown';
          const instrumentGroup = getInstrumentGroup(instrument, i);
          newVoiceList[i] = `Channel ${i + 1}:\n${instrumentGroup} - ${instrumentName}\n`;
        } else {
          newVoiceList[i] = `Channel ${i + 1}:\nUnknown\n`;
        }
      }
      setVoiceList(newVoiceList);
      
      console.log('🎹 Parsed instruments:', Array.from(instruments.entries()).map(([ch, prog]) => 
        `Channel ${ch + 1}: ${getMidiInstrumentName(prog, ch)}`
      ));

      // Auto-start in game mode
      if (gameMode) {
        setTimeout(() => {
          togglePlayPause();
        }, 1000);
      }
    } catch (error) {
      console.error('Error parsing MIDI instruments:', error);
      setMessage('Error loading MIDI file. Please try again.');
    }

    // Song automatically plays, so we need to pause it
    if (!gameMode) {
      seqRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleMidiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target?.files?.[0] || !seqRef.current) {
      return;
    }

    const file = e.target.files[0];
    const arrayBuffer = await file.arrayBuffer();
    await handleMidiFromArrayBuffer(arrayBuffer);
  };

  const togglePlayPause = () => {
    if (!seqRef.current) return;

    if (isPlaying) {
      seqRef.current.pause();
      setIsPlaying(false);
      // Stop voice tracking interval when paused
      if (voiceTrackingIntervalRef.current) {
        clearInterval(voiceTrackingIntervalRef.current);
        voiceTrackingIntervalRef.current = null;
      }
      // Don't clear voice list when paused - preserve instrument names
      // Just remove the note information but keep instrument names
      const preservedVoiceList = voiceList.map(text => {
        const lines = text.split('\n');
        const instrumentLine = lines[1] || 'Unknown';
        return `${lines[0]}\n${instrumentLine}\n`;
      });
      setVoiceList(preservedVoiceList);
    } else {
      seqRef.current.play();
      setIsPlaying(true);
      // Restart voice tracking interval when playing
      if (synthRef.current && !voiceTrackingIntervalRef.current) {
        voiceTrackingIntervalRef.current = window.setInterval(() => {
          const newVoiceList: string[] = [];
          let hasChanges = false;

          synthRef.current!.midiAudioChannels.forEach((c, chanNum) => {
            const instrument = channelInstruments.get(chanNum);
            const instrumentName = instrument !== undefined ? 
              getInstrumentName(synthRef.current!, instrument, chanNum) : 'Unknown';
            const instrumentGroup = instrument !== undefined ? 
              getInstrumentGroup(instrument, chanNum) : 'Unknown';
            let text = `Channel ${chanNum + 1}:\n${instrumentGroup} - ${instrumentName}\n`;

            c.voices.forEach(v => {
              text += `note: ${v.midiNote}\n`;
            });

            newVoiceList[chanNum] = text;
            
            // Check if this channel's text has changed
            if (voiceList[chanNum] !== text) {
              hasChanges = true;
            }
          });

          // Only update state if there are actual changes
          if (hasChanges) {
            setVoiceList(newVoiceList);
          }
        }, 100);
      }
    }
  };

  const handleStop = () => {
    if (!seqRef.current) return;
    
    seqRef.current.stop();
    setIsPlaying(false);
    
    // Stop voice tracking interval
    if (voiceTrackingIntervalRef.current) {
      clearInterval(voiceTrackingIntervalRef.current);
      voiceTrackingIntervalRef.current = null;
    }
    
    // Don't clear voice list when stopped - preserve instrument names
    // Just remove the note information but keep instrument names
    const preservedVoiceList = voiceList.map(text => {
      const lines = text.split('\n');
      const instrumentLine = lines[1] || 'Unknown';
      return `${lines[0]}\n${instrumentLine}\n`;
    });
    setVoiceList(preservedVoiceList);
  };

  const toggleMuteChannel = (channelNum: number) => {
    const newMutedChannels = new Set(mutedChannels);
    if (newMutedChannels.has(channelNum)) {
      newMutedChannels.delete(channelNum);
    } else {
      newMutedChannels.add(channelNum);
    }
    setMutedChannels(newMutedChannels);
    
    // Apply mute to the synthesizer if available
    if (synthRef.current && synthRef.current.midiAudioChannels[channelNum]) {
      const isMuted = newMutedChannels.has(channelNum);
      try {
        // Call muteChannel on the individual MidiAudioChannel object
        synthRef.current.midiAudioChannels[channelNum].muteChannel(isMuted);
        console.log(`Channel ${channelNum + 1} ${isMuted ? 'muted' : 'unmuted'}`);
      } catch (error) {
        console.warn('Mute function error:', error);
        console.log(`Channel ${channelNum + 1} ${isMuted ? 'muted' : 'unmuted'} (visual only)`);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* SoundFont Upload - Hide in game mode */}
      {!gameMode && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <Volume2 className="w-5 h-5 text-blue-400" />
            <span>SoundFont Upload</span>
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="soundfont_input" className="block text-sm font-medium text-white/70 mb-2">
                Upload SoundFont:
              </label>
              <input 
                accept=".sf2, .sf3, .dls" 
                id="soundfont_input" 
                type="file" 
                onChange={handleSoundfontUpload}
                disabled={isLoading}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            <div className="text-sm text-white/60">
              Supported formats: .sf2, .sf3, .dls
            </div>
          </div>
        </div>
      )}

      {/* MIDI File Upload - Hide in game mode */}
      {!gameMode && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
            <Music className="w-5 h-5 text-purple-400" />
            <span>MIDI File Upload</span>
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="midi_input" className="block text-sm font-medium text-white/70 mb-2">
                Upload MIDI File:
              </label>
              <input 
                accept=".midi, .mid, .rmi, .smf" 
                id="midi_input" 
                type="file" 
                onChange={handleMidiUpload}
                disabled={!sequencerReady}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            
            <div className="text-sm text-white/60">
              Supported formats: .mid, .midi, .rmi, .smf
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
        <div className="flex items-center space-x-3 mb-4">
          {error ? (
            <AlertCircle className="w-5 h-5 text-red-400" />
          ) : isLoading ? (
            <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <CheckCircle className="w-5 h-5 text-green-400" />
          )}
          <h2 className="text-xl font-bold text-white">Status</h2>
        </div>
        
        <p className="text-white/80">
          {message}
        </p>
        
        {error && (
          <p className="text-red-400 text-sm mt-2">
            Error: {error}
          </p>
        )}

        {gameMode && hideSelectedChannel !== undefined && (
          <div className="mt-4 p-3 bg-yellow-900/50 border border-yellow-500/50 rounded-lg">
            <p className="text-yellow-200 text-sm">
              <strong>🎮 Game Mode:</strong> Your selected instrument (Channel {hideSelectedChannel + 1}) is hidden from the list below since you're playing it manually.
            </p>
          </div>
        )}
      </div>

      {/* Playback Controls */}
      {sequencerReady && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h2 className="text-xl font-bold text-white mb-4">Playback Controls</h2>
          
          <div className="flex items-center justify-center space-x-4">
            <button
              onClick={togglePlayPause}
              disabled={!sequencerReady}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-5 h-5" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Play</span>
                </>
              )}
            </button>
            
            <button
              onClick={handleStop}
              disabled={!sequencerReady}
              className="flex items-center space-x-2 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
            >
              <Square className="w-5 h-5" />
              <span>Stop</span>
            </button>
          </div>
        </div>
      )}

      {/* Voice List */}
      {channelInstruments.size > 0 && (
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20" style={{ maxHeight: 520, minHeight: 320, overflowY: 'auto' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white flex items-center space-x-2">
              <Piano className="w-5 h-5 text-green-400" />
              <span>{gameMode ? 'Background Instruments' : 'Instruments & Voices'}</span>
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
              
              // Hide selected channel in game mode
              if (gameMode && hideSelectedChannel === channelNum) {
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
              // For filtering, we consider a channel used if it has an instrument OR if we're not filtering
              const isUsed = instrument !== undefined || isActive || !showOnlyUsedChannels;
              
              // Skip rendering if channel is not used and we're showing only used channels
              if (!isUsed) {
                return null;
              }
              
              // Get note names for display
              const getNoteName = (pitch: number): string => {
                const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
                const octave = Math.floor(pitch / 12) - 1;
                const noteName = noteNames[pitch % 12];
                return `${noteName}${octave}`;
              };
              
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
                            title={`Note ${note} (${getNoteName(note)})`}
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
              {showOnlyUsedChannels ? (
                <>
                  Used Channels: {Array.from({ length: 16 }).filter((_, index) => {
                    if (gameMode && hideSelectedChannel === index) return false;
                    const instrument = channelInstruments.get(index);
                    const voiceText = voiceList[index] || '';
                    const isActive = voiceText.includes('note:');
                    return instrument !== undefined || isActive;
                  }).length} •
                </>
              ) : (
                <>
                  Total Channels: {gameMode && hideSelectedChannel !== undefined ? '15' : '16'} • 
                </>
              )}
              Active Channels: {voiceList.filter(text => text.includes('note:')).length} •
              Total Active Notes: {voiceList.reduce((sum, text) => {
                const noteMatches = text.match(/note:/g);
                return sum + (noteMatches ? noteMatches.length : 0);
              }, 0)}
              {gameMode && hideSelectedChannel !== undefined && (
                <> • Hidden: Channel {hideSelectedChannel + 1} (Your Instrument)</>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};