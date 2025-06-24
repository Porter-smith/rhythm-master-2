import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Square, Music, Settings, Volume2, Loader } from 'lucide-react';
import { Soundfont2Sampler, Reverb } from 'smplr';
import { SoundFont2 } from 'soundfont2';
import { PianoKeyboard } from './PianoKeyboard';
import { MusicPlayer } from '../music/MusicPlayer';
import { allSongs, getSongById } from '../data/songs';
import { SOUNDFONTS, getSoundFontForSong, SoundFont } from '../data/soundfonts';
import { Song, PlaybackState } from '../types/music';
import { getAudioContext } from '../utils/audioContext';

interface SmplrMusicPlayerProps {
  onBack: () => void;
}

type LoadingStatus = 'idle' | 'loading' | 'ready' | 'error';

// Global reverb instance to prevent recreation (exactly like the working POC)
let reverb: Reverb | undefined;

export const SmplrMusicPlayer: React.FC<SmplrMusicPlayerProps> = ({ onBack }) => {
  // Smplr state
  const [sampler, setSampler] = useState<Soundfont2Sampler | undefined>(undefined);
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>('idle');
  const [selectedSoundfont, setSelectedSoundfont] = useState<SoundFont>(SOUNDFONTS['piano-yamaha']);
  const [selectedInstrument, setSelectedInstrument] = useState<string>('');
  const [availableInstruments, setAvailableInstruments] = useState<string[]>([]);
  const [volume, setVolume] = useState(100);
  const [reverbMix, setReverbMix] = useState(0.2);
  const [playingNotes, setPlayingNotes] = useState<Set<number>>(new Set());
  const [playbackMode, setPlaybackMode] = useState<'midi' | 'instrument'>('midi'); // Default to MIDI mode

  // Music player state
  const [musicPlayer] = useState(() => MusicPlayer.getInstance());
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    format: 'custom'
  });
  const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [error, setError] = useState<string | null>(null);

  // Refs
  const playbackTimerRef = useRef<number | null>(null);
  const scheduledNotesRef = useRef<Set<number>>(new Set());
  const isPlayingRef = useRef<boolean>(false);

  // Initialize audio context and music player
  useEffect(() => {
    const initializeAudio = async () => {
      try {
        console.log('🎹 Initializing Professional Music Player...');
        
        // Initialize music player
        await musicPlayer.initialize({
          preferredFormat: 'auto',
          enableMidiFallback: true,
          audioLatencyCompensation: 0,
          midiSynthEnabled: false // We'll use smplr instead
        });
        
        setIsInitialized(true);
        console.log('✅ Professional Music Player initialized');
        
        // Load default soundfont
        await loadSoundfont('Piano');
      } catch (err) {
        console.error('Failed to initialize audio:', err);
        setError('Failed to initialize audio system');
      }
    };

    initializeAudio();

    return () => {
      if (sampler) {
        sampler.disconnect();
      }
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
      musicPlayer.destroy();
    };
  }, [musicPlayer]);

  // Load soundfont using the exact working pattern from POC
  const loadSoundfont = async (soundfontId: string) => {
    setLoadingStatus('loading');
    setError(null);

    try {
      const soundFont = SOUNDFONTS[soundfontId];
      if (!soundFont) {
        throw new Error(`Sound font not found: ${soundfontId}`);
      }

      console.log(`🎹 Loading soundfont: ${soundFont.name} (${soundFont.url})`);
      
      // Disconnect existing sampler
      if (sampler) {
        sampler.disconnect();
        setSampler(undefined);
      }

      // Get singleton audio context
      const context = getAudioContext();

      // Create global reverb if not exists (exactly like POC)
      reverb ??= new Reverb(context);

      // Create new sampler with the exact configuration from POC
      const newSampler = new Soundfont2Sampler(context, {
        url: soundFont.url,
        createSoundfont: (data) => new SoundFont2(data),
      });

      console.log('🎼 Sampler created, waiting for load...');

      // Add effects immediately (exactly like POC)
      newSampler.output.addEffect('reverb', reverb, reverbMix);
      console.log(`🎚️ Reverb added with mix: ${reverbMix}`);

      // Set volume
      newSampler.output.setVolume(volume);
      console.log(`🔊 Volume set to: ${volume}`);

      // Set the sampler immediately
      setSampler(newSampler);

      // Wait for the sampler to load (exactly like POC)
      const loadedSampler = await newSampler.load;
      console.log('✅ Sampler loaded successfully');

      // Get available instruments
      const instruments = loadedSampler.instrumentNames || [];
      console.log(`🎵 Available instruments:`, instruments);
      console.log(`🎵 Total instruments available: ${instruments.length}`);
      
      setAvailableInstruments(instruments);

      // Load instruments based on playback mode
      if (instruments.length > 0) {
        if (playbackMode === 'midi') {
          // For MIDI mode, load all instruments for full MIDI playback
          console.log(`🎹 MIDI mode: Loading all ${instruments.length} instruments`);
          
          // Set up MIDI channel assignments (General MIDI standard)
          const channelAssignments = [
            'Acoustic Grand Piano',    // Channel 0
            'Bright Acoustic Piano',   // Channel 1
            'Electric Grand Piano',    // Channel 2
            'Honky-tonk Piano',        // Channel 3
            'Electric Piano 1',        // Channel 4
            'Electric Piano 2',        // Channel 5
            'Harpsichord',             // Channel 6
            'Clavi',                   // Channel 7
            'Celesta',                 // Channel 8
            'Glockenspiel',            // Channel 9
            'Music Box',               // Channel 10
            'Vibraphone',              // Channel 11
            'Marimba',                 // Channel 12
            'Xylophone',               // Channel 13
            'Tubular Bells',           // Channel 14
            'Dulcimer'                 // Channel 15
          ];
          
          for (let i = 0; i < Math.min(instruments.length, 16); i++) {
            const instrument = instruments[i];
            try {
              await loadedSampler.loadInstrument(instrument);
              console.log(`✅ Instrument loaded for channel ${i}: ${instrument}`);
              
              // Set the instrument for this MIDI channel
              if (loadedSampler.setChannelInstrument) {
                loadedSampler.setChannelInstrument(i, instrument);
                console.log(`🎵 Channel ${i} assigned to: ${instrument}`);
              }
            } catch (err) {
              console.warn(`⚠️ Failed to load instrument ${instrument}:`, err);
            }
          }
          setSelectedInstrument('All Instruments (MIDI Mode)');
        } else {
          // For instrument mode, load only the first instrument
          const firstInstrument = instruments[0];
          console.log(`🎹 Instrument mode: Loading single instrument: ${firstInstrument}`);
          await loadedSampler.loadInstrument(firstInstrument);
          setSelectedInstrument(firstInstrument);
          console.log(`✅ Instrument loaded: ${firstInstrument}`);
        }
      } else {
        console.warn(`⚠️ No instruments found in sound font: ${soundFont.name}`);
      }

      setSelectedSoundfont(soundFont);
      setLoadingStatus('ready');
      
      console.log(`🎉 Successfully loaded soundfont: ${soundFont.name}`);
    } catch (err) {
      console.error('❌ Failed to load soundfont:', err);
      setError(`Failed to load soundfont: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setLoadingStatus('error');
    }
  };

  // Switch between MIDI and instrument modes
  const switchPlaybackMode = async (newMode: 'midi' | 'instrument') => {
    if (newMode === playbackMode) return;
    
    console.log(`🔄 Switching from ${playbackMode} mode to ${newMode} mode`);
    setPlaybackMode(newMode);
    
    // Reload the current sound font with the new mode
    if (selectedSoundfont) {
      await loadSoundfont(selectedSoundfont.id);
    }
  };

  // Load different instrument from current soundfont (only in instrument mode)
  const loadInstrument = async (instrumentName: string) => {
    if (!sampler || playbackMode !== 'instrument') return;

    try {
      console.log(`🎹 Loading instrument: ${instrumentName}`);
      await sampler.loadInstrument(instrumentName);
      setSelectedInstrument(instrumentName);
      console.log(`✅ Instrument loaded: ${instrumentName}`);
    } catch (err) {
      console.error('❌ Failed to load instrument:', err);
      setError(`Failed to load instrument: ${instrumentName}`);
    }
  };

  // Handle piano key press (exactly like POC)
  const handleKeyPress = (note: { note: number; velocity: number; detune: number; time?: number; duration?: number }) => {
    if (!sampler || loadingStatus !== 'ready') return;

    const noteId = note.note;
    setPlayingNotes(prev => new Set(prev).add(noteId));

    try {
      // Play note with smplr (exactly like POC)
      const noteToPlay = {
        ...note,
        time: (note.time ?? 0) + sampler.context.currentTime
      };
      
      sampler.start(noteToPlay);

      console.log(`🎵 Playing note: ${note.note}, velocity: ${note.velocity}`);

      // Auto-release after duration or default time
      const releaseTime = (note.duration ?? 1) * 1000;
      setTimeout(() => {
        setPlayingNotes(prev => {
          const newSet = new Set(prev);
          newSet.delete(noteId);
          return newSet;
        });
      }, releaseTime);
    } catch (err) {
      console.error('❌ Failed to play note:', err);
    }
  };

  // Handle piano key release
  const handleKeyRelease = (midi: number) => {
    if (!sampler) return;

    try {
      sampler.stop({ stopId: midi });
      setPlayingNotes(prev => {
        const newSet = new Set(prev);
        newSet.delete(midi);
        return newSet;
      });
    } catch (err) {
      console.error('❌ Failed to stop note:', err);
    }
  };

  // Stop all notes
  const stopAllNotes = () => {
    if (!sampler) return;
    
    try {
      sampler.stop();
      setPlayingNotes(new Set());
      console.log('🛑 All notes stopped');
    } catch (err) {
      console.error('❌ Failed to stop all notes:', err);
    }
  };

  // Handle song selection
  const handleSongSelect = async (songId: string) => {
    const song = getSongById(songId);
    if (!song) return;

    setError(null);

    try {
      await musicPlayer.loadSong(song);
      setCurrentSong(song);
      console.log(`🎵 Loaded song: ${song.title}`);
      
      // Auto-load the appropriate sound font for this song
      const songSoundFont = getSoundFontForSong(song);
      console.log(`🎹 Auto-loading sound font for song: ${songSoundFont.name}`);
      
      if (songSoundFont.id !== selectedSoundfont.id) {
        await loadSoundfont(songSoundFont.id);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load song: ${errorMessage}`);
    }
  };

  // Handle playback
  const handlePlay = async () => {
    if (!currentSong || !sampler || loadingStatus !== 'ready') return;

    try {
      setError(null);
      
      // Get notes for current difficulty
      const notes = currentSong.notes[selectedDifficulty];
      if (!notes || notes.length === 0) {
        throw new Error(`No notes available for ${selectedDifficulty} difficulty`);
      }

      console.log(`🎮 Playing ${notes.length} notes for ${selectedDifficulty} difficulty in ${playbackMode} mode`);

      // Debug: Show channel distribution for MIDI mode
      if (playbackMode === 'midi' && notes.length > 0) {
        const channelStats = new Map<number, number>();
        notes.forEach(note => {
          if ('channel' in note && typeof note.channel === 'number') {
            channelStats.set(note.channel, (channelStats.get(note.channel) || 0) + 1);
          }
        });
        console.log('🎵 MIDI Channel Distribution:', Object.fromEntries(channelStats));
        console.log('🎵 Channels used:', Array.from(channelStats.keys()).sort((a, b) => a - b));
      }

      // Set playing state
      isPlayingRef.current = true;
      scheduledNotesRef.current.clear();

      // Schedule all notes with smplr
      const startTime = sampler.context.currentTime;
      notes.forEach((note, index) => {
        // Check if we should stop scheduling
        if (!isPlayingRef.current) return;
        
        const noteStartTime = startTime + note.time;
        const noteId = index; // Use index as unique ID
        
        scheduledNotesRef.current.add(noteId);
        
        try {
          // Prepare note parameters
          const noteParams: any = {
            note: note.pitch,
            velocity: ('velocity' in note && typeof note.velocity === 'number') ? note.velocity : 80,
            detune: 0,
            time: noteStartTime,
            duration: note.duration
          };

          // In MIDI mode, use the note's channel if available
          if (playbackMode === 'midi' && 'channel' in note && typeof note.channel === 'number') {
            noteParams.channel = note.channel;
            console.log(`🎵 Scheduling MIDI note: pitch=${note.pitch}, channel=${note.channel}, time=${note.time}`);
          } else {
            console.log(`🎵 Scheduling note: pitch=${note.pitch}, time=${note.time}`);
          }

          sampler.start(noteParams);

          // Visual feedback for playing notes
          setTimeout(() => {
            if (isPlayingRef.current) {
              setPlayingNotes(prev => new Set(prev).add(note.pitch));
              setTimeout(() => {
                setPlayingNotes(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(note.pitch);
                  return newSet;
                });
              }, note.duration * 1000);
            }
          }, note.time * 1000);
        } catch (noteErr) {
          console.error(`❌ Failed to schedule note ${index}:`, noteErr);
        }
      });

      // Update playback state
      setPlaybackState(prev => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
        duration: Math.max(...notes.map(n => n.time + n.duration))
      }));

      // Start playback timer
      const startTimestamp = Date.now();
      playbackTimerRef.current = window.setInterval(() => {
        if (!isPlayingRef.current) {
          // Stop timer if playback was stopped
          if (playbackTimerRef.current) {
            clearInterval(playbackTimerRef.current);
            playbackTimerRef.current = null;
          }
          return;
        }
        
        const elapsed = (Date.now() - startTimestamp) / 1000;
        setPlaybackState(prev => {
          const newState = { ...prev, currentTime: elapsed };
          
          // Check if playback is complete
          if (elapsed >= prev.duration) {
            handleStop();
          }
          
          return newState;
        });
      }, 100);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Playback failed: ${errorMessage}`);
    }
  };

  // Handle stop
  const handleStop = () => {
    console.log('🛑 Stopping playback...');
    
    // Set playing state to false to stop scheduling
    isPlayingRef.current = false;
    
    // Stop all currently playing notes
    stopAllNotes();
    
    // Clear the playback timer
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
      console.log('⏱️ Playback timer cleared');
    }

    // Clear scheduled notes
    scheduledNotesRef.current.clear();
    console.log('📝 Scheduled notes cleared');

    // Reset playback state
    setPlaybackState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentTime: 0
    }));

    // Clear playing notes
    setPlayingNotes(new Set());
    
    console.log('✅ Playback stopped completely');
  };

  // Update volume (exactly like POC)
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (sampler) {
      try {
        sampler.output.setVolume(newVolume);
      } catch (err) {
        console.error('❌ Failed to set volume:', err);
      }
    }
  };

  // Update reverb (exactly like POC)
  const handleReverbChange = (newReverb: number) => {
    setReverbMix(newReverb);
    if (sampler && reverb) {
      try {
        sampler.output.sendEffect('reverb', newReverb);
      } catch (err) {
        console.error('❌ Failed to set reverb:', err);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-center">
          <Loader className="animate-spin w-8 h-8 mx-auto mb-4" />
          <p>Initializing Professional Audio System...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
          <span>Back to Menu</span>
        </button>
        
        <h1 className="text-4xl font-bold text-white text-center flex-1 flex items-center justify-center space-x-3">
          <Music className="w-10 h-10 text-purple-400" />
          <span>Professional Music Player</span>
        </h1>
        
        <div className="w-24"></div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6 flex items-center space-x-3">
          <div>
            <p className="text-red-400 font-semibold">Error</p>
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Soundfont Selection */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center space-x-2">
            <Settings className="w-6 h-6" />
            <span>Professional Sound Engine</span>
            {loadingStatus === 'loading' && <Loader className="animate-spin w-5 h-5" />}
          </h2>
          
          {/* Soundfont Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {Object.values(SOUNDFONTS).map((soundFont) => (
              <button
                key={soundFont.id}
                onClick={() => loadSoundfont(soundFont.id)}
                disabled={loadingStatus === 'loading'}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedSoundfont.id === soundFont.id && loadingStatus === 'ready'
                    ? 'border-purple-400 bg-purple-500/20'
                    : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="text-white font-semibold">{soundFont.name}</div>
                <div className="text-white/60 text-sm mb-2">{soundFont.description}</div>
                <div className="flex flex-wrap gap-1">
                  {soundFont.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-white/10 rounded text-xs text-white/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="text-white/50 text-xs mt-2">
                  {loadingStatus === 'loading' && selectedSoundfont.id === soundFont.id ? 'Loading...' : 
                   loadingStatus === 'ready' && selectedSoundfont.id === soundFont.id ? 'Ready' : 
                   'Click to load'}
                </div>
              </button>
            ))}
          </div>

          {/* Instrument Selection */}
          {availableInstruments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-2">
                {playbackMode === 'midi' ? 'MIDI Instruments Loaded:' : 'Select Instrument:'}
              </h3>
              {playbackMode === 'midi' ? (
                <div className="text-white/70 text-sm">
                  <div className="mb-2">✅ All {availableInstruments.length} instruments loaded for MIDI playback</div>
                  <div className="text-xs text-white/50">
                    MIDI files will use their original instrument assignments
                  </div>
                </div>
              ) : (
                <select
                  value={selectedInstrument}
                  onChange={(e) => loadInstrument(e.target.value)}
                  className="w-full md:w-auto bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
                  disabled={loadingStatus !== 'ready'}
                >
                  {availableInstruments.map((instrument) => (
                    <option key={instrument} value={instrument} className="bg-gray-800">
                      {instrument}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Audio Controls */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center space-x-4">
              <Volume2 className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">Volume:</span>
              <input
                type="range"
                min={0}
                max={127}
                value={volume}
                onChange={(e) => handleVolumeChange(e.target.valueAsNumber)}
                className="flex-1 accent-purple-500"
                disabled={loadingStatus !== 'ready'}
              />
              <span className="text-white/70 font-mono w-8">{volume}</span>
            </div>

            <div className="flex items-center space-x-4">
              <span className="text-white font-semibold">Reverb:</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={reverbMix}
                onChange={(e) => handleReverbChange(e.target.valueAsNumber)}
                className="flex-1 accent-purple-500"
                disabled={loadingStatus !== 'ready'}
              />
              <span className="text-white/70 font-mono w-12">{(reverbMix * 100).toFixed(0)}%</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={stopAllNotes}
                disabled={loadingStatus !== 'ready'}
                className="bg-red-500 hover:bg-red-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Stop All
              </button>
            </div>
          </div>

          {/* Playback Mode Selection */}
          <div className="mt-6">
            <h3 className="text-white font-semibold mb-3">Playback Mode:</h3>
            <div className="flex space-x-4">
              <button
                onClick={() => switchPlaybackMode('midi')}
                disabled={loadingStatus === 'loading'}
                className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                  playbackMode === 'midi'
                    ? 'border-blue-400 bg-blue-500/20 text-blue-300'
                    : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="font-semibold">🎵 MIDI Mode</div>
                <div className="text-xs">Play with all instruments</div>
              </button>
              
              <button
                onClick={() => switchPlaybackMode('instrument')}
                disabled={loadingStatus === 'loading'}
                className={`px-4 py-2 rounded-lg border-2 transition-all duration-200 ${
                  playbackMode === 'instrument'
                    ? 'border-green-400 bg-green-500/20 text-green-300'
                    : 'border-white/20 bg-white/5 text-white/70 hover:border-white/40 hover:bg-white/10'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="font-semibold">🎹 Instrument Mode</div>
                <div className="text-xs">Play with single instrument</div>
              </button>
            </div>
          </div>

          {/* Status Indicator */}
          <div className="mt-4 text-center">
            <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg ${
              loadingStatus === 'ready' ? 'bg-green-500/20 text-green-300' :
              loadingStatus === 'loading' ? 'bg-yellow-500/20 text-yellow-300' :
              loadingStatus === 'error' ? 'bg-red-500/20 text-red-300' :
              'bg-gray-500/20 text-gray-300'
            }`}>
              {loadingStatus === 'loading' && <Loader className="animate-spin w-4 h-4" />}
              <span className="capitalize font-semibold">{loadingStatus}</span>
              {loadingStatus === 'ready' && (
                <>
                  <span className="text-sm">• {selectedSoundfont.name}</span>
                  <span className={`text-sm px-2 py-1 rounded ${
                    playbackMode === 'midi' 
                      ? 'bg-blue-500/20 text-blue-300' 
                      : 'bg-green-500/20 text-green-300'
                  }`}>
                    {playbackMode === 'midi' ? '🎵 MIDI' : '🎹 Instrument'}
                  </span>
                  {playbackMode === 'instrument' && selectedInstrument && (
                    <span className="text-sm">• {selectedInstrument}</span>
                  )}
                </>
              )}
            </div>
            {currentSong && (
              <div className="mt-2 text-sm text-white/60">
                Song: {currentSong.title} • Sound Font: {selectedSoundfont.name} • Mode: {playbackMode === 'midi' ? 'MIDI' : 'Instrument'}
              </div>
            )}
          </div>
        </div>

        {/* Piano Keyboard */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4">Professional Virtual Piano</h2>
          <PianoKeyboard
            className="w-full"
            borderColor={loadingStatus === 'ready' ? "border-purple-500" : "border-gray-500"}
            onPress={handleKeyPress}
            onRelease={handleKeyRelease}
            playingNotes={playingNotes}
          />
          {loadingStatus !== 'ready' && (
            <div className="text-center text-white/60 mt-4">
              {loadingStatus === 'loading' ? 'Loading professional soundfont...' : 'Load a soundfont to play'}
            </div>
          )}
        </div>

        {/* Song Player */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Song Selection */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h2 className="text-2xl font-bold text-white mb-6">Song Library</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {allSongs.map((song) => (
                  <div
                    key={song.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      currentSong?.id === song.id
                        ? 'border-yellow-400 bg-yellow-400/10'
                        : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                    }`}
                    onClick={() => handleSongSelect(song.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-white font-semibold">{song.title}</h3>
                      <div className={`px-2 py-1 rounded text-xs font-mono ${
                        song.format === 'midi' 
                          ? 'bg-blue-500/20 text-blue-300' 
                          : 'bg-green-500/20 text-green-300'
                      }`}>
                        {song.format.toUpperCase()}
                      </div>
                    </div>
                    <p className="text-white/70 text-sm italic mb-1">{song.artist}</p>
                    <p className="text-white/50 text-xs">{song.duration} • {song.bpm} BPM</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Player Controls */}
          <div className="space-y-6">
            {/* Current Song */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <h2 className="text-xl font-bold text-white mb-4">Now Playing</h2>
              {currentSong ? (
                <div>
                  <h3 className="text-white font-semibold mb-1">{currentSong.title}</h3>
                  <p className="text-white/70 text-sm italic mb-4">{currentSong.artist}</p>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs text-white/60 mb-1">
                      <span>{formatTime(playbackState.currentTime)}</span>
                      <span>{formatTime(playbackState.duration)}</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-2">
                      <div 
                        className="bg-purple-400 h-2 rounded-full transition-all duration-100"
                        style={{ 
                          width: `${playbackState.duration > 0 ? (playbackState.currentTime / playbackState.duration) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Difficulty Selection */}
                  <div className="mb-4">
                    <h4 className="text-white/80 font-semibold mb-2">Difficulty:</h4>
                    <div className="space-y-2">
                      {currentSong.difficulties.map((diff) => (
                        <button
                          key={diff}
                          onClick={() => setSelectedDifficulty(diff)}
                          className={`w-full p-2 rounded-lg text-left transition-all duration-200 ${
                            selectedDifficulty === diff
                              ? diff === 'easy' ? 'bg-green-500/30 border-2 border-green-400' :
                                diff === 'medium' ? 'bg-orange-500/30 border-2 border-orange-400' :
                                'bg-red-500/30 border-2 border-red-400'
                              : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
                          }`}
                        >
                          <span className={`capitalize font-semibold ${
                            diff === 'easy' ? 'text-green-300' :
                            diff === 'medium' ? 'text-orange-300' :
                            'text-red-300'
                          }`}>
                            {diff}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Playback Controls */}
                  <div className="flex space-x-2">
                    <button
                      onClick={handlePlay}
                      disabled={!currentSong || playbackState.isPlaying || loadingStatus !== 'ready'}
                      className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <Play className="w-4 h-4" />
                      <span>Play</span>
                    </button>
                    
                    <button
                      onClick={handleStop}
                      disabled={!playbackState.isPlaying && !playbackState.isPaused}
                      className="bg-red-500 hover:bg-red-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200"
                    >
                      <Square className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-white/50">Select a song to begin</p>
              )}
            </div>
          </div>
        </div>

        {/* Professional Features Info */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">🎹 Professional Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white/70">
            <div>
              <h4 className="font-semibold text-white mb-2">High-Quality SoundFonts</h4>
              <ul className="space-y-1 text-sm">
                <li>• Professional Yamaha Grand Piano samples</li>
                <li>• Galaxy Electric Piano collection</li>
                <li>• High-quality organ sounds</li>
                <li>• Supersaw synthesizer collection</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-2">Advanced Audio Engine</h4>
              <ul className="space-y-1 text-sm">
                <li>• Real-time reverb processing</li>
                <li>• Professional volume control</li>
                <li>• Multiple instrument support</li>
                <li>• Low-latency audio playback</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
            <p className="text-purple-300 font-semibold">✨ Now with Professional SoundFont Integration!</p>
            <p className="text-purple-200 text-sm mt-1">
              Experience studio-quality sound with real SoundFont2 samples and professional audio processing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};