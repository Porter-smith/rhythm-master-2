import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, Pause, Square, Music, Settings, Volume2, Loader } from 'lucide-react';
import { Soundfont2Sampler, Reverb } from 'smplr';
import { SoundFont2 } from 'soundfont2';
import { PianoKeyboard } from './PianoKeyboard';
import { MusicPlayer } from '../music/MusicPlayer';
import { allSongs, getSongById } from '../data/songs';
import { Song, PlaybackState, MusicPlayerConfig } from '../types/music';
import { getAudioContext } from '../utils/audioContext';

interface SmplrMusicPlayerProps {
  onBack: () => void;
}

// Available soundfonts - using the working URLs from the POC
const SOUNDFONTS = {
  'Piano': 'https://smpldsnds.github.io/soundfonts/soundfonts/yamaha-grand-lite.sf2',
  'Electric Piano': 'https://smpldsnds.github.io/soundfonts/soundfonts/galaxy-electric-pianos.sf2',
  'Organ': 'https://smpldsnds.github.io/soundfonts/soundfonts/giga-hq-fm-gm.sf2',
  'Supersaw': 'https://smpldsnds.github.io/soundfonts/soundfonts/supersaw-collection.sf2',
};

type LoadingStatus = 'idle' | 'loading' | 'ready' | 'error';

// Global reverb instance to prevent recreation (exactly like the working POC)
let reverb: Reverb | undefined;

export const SmplrMusicPlayer: React.FC<SmplrMusicPlayerProps> = ({ onBack }) => {
  // Smplr state
  const [sampler, setSampler] = useState<Soundfont2Sampler | undefined>(undefined);
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>('idle');
  const [selectedSoundfont, setSelectedSoundfont] = useState<string>('Piano');
  const [selectedInstrument, setSelectedInstrument] = useState<string>('');
  const [availableInstruments, setAvailableInstruments] = useState<string[]>([]);
  const [volume, setVolume] = useState(100);
  const [reverbMix, setReverbMix] = useState(0.2);
  const [playingNotes, setPlayingNotes] = useState<Set<number>>(new Set());

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
      if (reverb) {
        reverb.disconnect();
      }
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
      musicPlayer.destroy();
    };
  }, [musicPlayer]);

  // Load soundfont using the exact working pattern from POC
  const loadSoundfont = async (soundfontName: string) => {
    setLoadingStatus('loading');
    setError(null);

    try {
      console.log(`🎹 Loading soundfont: ${soundfontName}`);
      
      // Disconnect existing sampler
      if (sampler) {
        sampler.disconnect();
        setSampler(undefined);
      }

      // Get singleton audio context
      const context = getAudioContext();

      // Create global reverb if not exists (exactly like POC)
      reverb ??= new Reverb(context);

      // Get soundfont URL
      const url = SOUNDFONTS[soundfontName as keyof typeof SOUNDFONTS];
      console.log(`📂 Soundfont URL: ${url}`);

      // Create new sampler with the exact configuration from POC
      const newSampler = new Soundfont2Sampler(context, {
        url: url,
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
      
      setAvailableInstruments(instruments);

      // Load the first instrument
      if (instruments.length > 0) {
        const firstInstrument = instruments[0];
        console.log(`🎹 Loading instrument: ${firstInstrument}`);
        await loadedSampler.loadInstrument(firstInstrument);
        setSelectedInstrument(firstInstrument);
        console.log(`✅ Instrument loaded: ${firstInstrument}`);
      }

      setSelectedSoundfont(soundfontName);
      setLoadingStatus('ready');
      
      console.log(`🎉 Successfully loaded soundfont: ${soundfontName}`);
    } catch (err) {
      console.error('❌ Failed to load soundfont:', err);
      setError(`Failed to load ${soundfontName} soundfont: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setLoadingStatus('error');
    }
  };

  // Load different instrument from current soundfont
  const loadInstrument = async (instrumentName: string) => {
    if (!sampler) return;

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
    } catch (err: any) {
      setError(`Failed to load song: ${err.message || err}`);
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

      console.log(`🎮 Playing ${notes.length} notes for ${selectedDifficulty} difficulty`);

      // Schedule all notes with smplr
      const startTime = sampler.context.currentTime;
      notes.forEach((note, index) => {
        const noteStartTime = startTime + note.time;
        
        try {
          sampler.start({
            note: note.pitch,
            velocity: ('velocity' in note ? note.velocity : 80) || 80,
            detune: 0,
            time: noteStartTime,
            duration: note.duration
          });

          // Visual feedback for playing notes
          setTimeout(() => {
            setPlayingNotes(prev => new Set(prev).add(note.pitch));
            setTimeout(() => {
              setPlayingNotes(prev => {
                const newSet = new Set(prev);
                newSet.delete(note.pitch);
                return newSet;
              });
            }, note.duration * 1000);
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

    } catch (err: any) {
      setError(`Playback failed: ${err.message || err}`);
    }
  };

  // Handle stop
  const handleStop = () => {
    stopAllNotes();
    
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }

    setPlaybackState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentTime: 0
    }));

    setPlayingNotes(new Set());
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Object.keys(SOUNDFONTS).map((name) => (
              <button
                key={name}
                onClick={() => loadSoundfont(name)}
                disabled={loadingStatus === 'loading'}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedSoundfont === name && loadingStatus === 'ready'
                    ? 'border-purple-400 bg-purple-500/20'
                    : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="text-white font-semibold">{name}</div>
                <div className="text-white/60 text-sm">
                  {loadingStatus === 'loading' && selectedSoundfont === name ? 'Loading...' : 
                   loadingStatus === 'ready' && selectedSoundfont === name ? 'Ready' : 
                   'Click to load'}
                </div>
              </button>
            ))}
          </div>

          {/* Instrument Selection */}
          {availableInstruments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-white font-semibold mb-2">Available Instruments:</h3>
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
              {loadingStatus === 'ready' && selectedInstrument && (
                <span className="text-sm">• {selectedInstrument}</span>
              )}
            </div>
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