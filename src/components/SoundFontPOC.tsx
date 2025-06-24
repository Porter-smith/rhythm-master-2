import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Play, Volume2, Loader, Music } from 'lucide-react';
import { Soundfont2Sampler, Reverb } from 'smplr';
import { SoundFont2 } from 'soundfont2';
import { getAudioContext } from '../utils/audioContext';

interface SoundFontPOCProps {
  onBack: () => void;
}

// Available soundfonts from the working example
const SOUNDFONTS = {
  'Piano': 'https://smpldsnds.github.io/soundfonts/soundfonts/yamaha-grand-lite.sf2',
  'Electric Piano': 'https://smpldsnds.github.io/soundfonts/soundfonts/galaxy-electric-pianos.sf2',
  'Organ': 'https://smpldsnds.github.io/soundfonts/soundfonts/giga-hq-fm-gm.sf2',
  'Supersaw': 'https://smpldsnds.github.io/soundfonts/soundfonts/supersaw-collection.sf2',
};

type LoadingStatus = 'idle' | 'loading' | 'ready' | 'error';

// Global reverb instance to prevent recreation (exactly like the working example)
let reverb: Reverb | undefined;

export const SoundFontPOC: React.FC<SoundFontPOCProps> = ({ onBack }) => {
  const [sampler, setSampler] = useState<Soundfont2Sampler | undefined>(undefined);
  const [selectedSoundFont, setSelectedSoundFont] = useState<string>('Piano');
  const [selectedInstrument, setSelectedInstrument] = useState<string>('');
  const [availableInstruments, setAvailableInstruments] = useState<string[]>([]);
  const [status, setStatus] = useState<LoadingStatus>('idle');
  const [volume, setVolume] = useState(100);
  const [reverbMix, setReverbMix] = useState(0.2);
  const [error, setError] = useState<string | null>(null);
  const [playingNotes, setPlayingNotes] = useState<Set<number>>(new Set());

  // Load soundfont function (exactly like the working example)
  const loadSoundFont = useCallback((nameOrUrl: string) => {
    // Disconnect previous sampler
    if (sampler) sampler.disconnect();
    
    setStatus('loading');
    setError(null);
    setSelectedSoundFont(nameOrUrl);
    setAvailableInstruments([]);
    setSelectedInstrument('');

    try {
      // Get singleton audio context
      const context = getAudioContext();
      
      // Create global reverb if it doesn't exist (exactly like working example)
      reverb ??= new Reverb(context);
      
      const url = SOUNDFONTS[nameOrUrl as keyof typeof SOUNDFONTS];
      if (!url) {
        throw new Error(`SoundFont URL not found for: ${nameOrUrl}`);
      }

      console.log(`🎹 Loading soundfont: ${nameOrUrl}`);
      console.log(`📂 URL: ${url}`);

      // Create sampler (exactly like working example)
      const newSampler = new Soundfont2Sampler(context, {
        url,
        createSoundfont: (data) => new SoundFont2(data),
      });

      console.log('🎼 Sampler created, waiting for load...');

      // Add effects immediately (exactly like working example)
      newSampler.output.addEffect('reverb', reverb, reverbMix);
      newSampler.output.setVolume(volume);

      // Set sampler immediately
      setSampler(newSampler);

      // Wait for load and then setup instruments (exactly like working example)
      newSampler.load.then((loadedSampler) => {
        console.log('✅ SoundFont loaded successfully');
        
        const instruments = loadedSampler.instrumentNames || [];
        console.log(`🎵 Available instruments:`, instruments);
        setAvailableInstruments(instruments);

        if (instruments.length > 0) {
          const firstInstrument = instruments[0];
          setSelectedInstrument(firstInstrument);
          loadedSampler.loadInstrument(firstInstrument);
          console.log(`✅ Instrument loaded: ${firstInstrument}`);
        }
        
        setStatus('ready');
      }).catch((err) => {
        console.error('❌ Failed to load soundfont:', err);
        setError(`Failed to load ${nameOrUrl}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setStatus('error');
      });

    } catch (err) {
      console.error('❌ Failed to create sampler:', err);
      setError(`Failed to create sampler: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setStatus('error');
    }
  }, [sampler, volume, reverbMix]);

  // Load instrument (exactly like working example)
  const loadInstrument = useCallback((instrumentName: string) => {
    if (!sampler || status !== 'ready') return;

    try {
      console.log(`🎹 Loading instrument: ${instrumentName}`);
      setSelectedInstrument(instrumentName);
      sampler.loadInstrument(instrumentName);
      console.log(`✅ Instrument loaded: ${instrumentName}`);
    } catch (err) {
      console.error('❌ Failed to load instrument:', err);
      setError(`Failed to load instrument: ${instrumentName}`);
    }
  }, [sampler, status]);

  // Play test note (exactly like working example)
  const playTestNote = useCallback((pitch: number) => {
    if (!sampler || status !== 'ready') {
      console.warn('Cannot play note: sampler not ready');
      return;
    }

    try {
      setPlayingNotes(prev => new Set(prev).add(pitch));
      
      // Play note exactly like working example
      const note = {
        note: pitch,
        velocity: 80,
        time: sampler.context.currentTime,
        duration: 1.0
      };
      
      sampler.start(note);
      console.log(`🎵 Playing test note: ${pitch}`);

      // Remove from playing notes after duration
      setTimeout(() => {
        setPlayingNotes(prev => {
          const newSet = new Set(prev);
          newSet.delete(pitch);
          return newSet;
        });
      }, 1000);
      
    } catch (err) {
      console.error('❌ Failed to play note:', err);
      setError(`Failed to play note: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [sampler, status]);

  // Play test scale
  const playTestScale = useCallback(() => {
    if (!sampler || status !== 'ready') {
      console.warn('Cannot play scale: sampler not ready');
      return;
    }

    try {
      const scale = [60, 62, 64, 65, 67, 69, 71, 72]; // C major scale
      const startTime = sampler.context.currentTime;

      scale.forEach((pitch, index) => {
        const noteTime = startTime + (index * 0.25);
        
        sampler.start({
          note: pitch,
          velocity: 80,
          time: noteTime,
          duration: 0.2
        });

        // Visual feedback
        setTimeout(() => {
          setPlayingNotes(prev => new Set(prev).add(pitch));
          setTimeout(() => {
            setPlayingNotes(prev => {
              const newSet = new Set(prev);
              newSet.delete(pitch);
              return newSet;
            });
          }, 200);
        }, index * 250);
      });

      console.log('🎵 Playing test scale');
      
    } catch (err) {
      console.error('❌ Failed to play scale:', err);
      setError(`Failed to play scale: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [sampler, status]);

  // Stop all notes (exactly like working example)
  const stopAll = useCallback(() => {
    if (sampler) {
      try {
        sampler.stop();
        setPlayingNotes(new Set());
        console.log('🛑 All notes stopped');
      } catch (err) {
        console.error('❌ Failed to stop notes:', err);
      }
    }
  }, [sampler]);

  // Update volume (exactly like working example)
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    if (sampler) {
      try {
        sampler.output.setVolume(newVolume);
      } catch (err) {
        console.warn('Warning: Could not set volume:', err);
      }
    }
  }, [sampler]);

  // Update reverb (exactly like working example)
  const handleReverbChange = useCallback((newReverb: number) => {
    setReverbMix(newReverb);
    if (sampler && reverb) {
      try {
        sampler.output.sendEffect('reverb', newReverb);
      } catch (err) {
        console.warn('Warning: Could not set reverb:', err);
      }
    }
  }, [sampler]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
    setStatus('idle');
  }, []);

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
          <Music className="w-10 h-10 text-green-400" />
          <span>SoundFont POC</span>
        </h1>
        
        <div className="w-24"></div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 mb-6">
          <p className="text-red-400 font-semibold">Error</p>
          <p className="text-red-300 text-sm">{error}</p>
          <button
            onClick={clearError}
            className="mt-2 bg-red-500 hover:bg-red-400 text-white px-3 py-1 rounded text-sm"
          >
            Clear Error
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-8">
        {/* SoundFont Selection */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center space-x-2">
            <Music className="w-6 h-6" />
            <span>SoundFont Selection</span>
            {status === 'loading' && <Loader className="animate-spin w-5 h-5" />}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Object.keys(SOUNDFONTS).map((name) => (
              <button
                key={name}
                onClick={() => loadSoundFont(name)}
                disabled={status === 'loading'}
                className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedSoundFont === name && status === 'ready'
                    ? 'border-green-400 bg-green-500/20'
                    : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="text-white font-semibold">{name}</div>
                <div className="text-white/60 text-sm">
                  {status === 'loading' && selectedSoundFont === name ? 'Loading...' : 
                   status === 'ready' && selectedSoundFont === name ? 'Ready' : 
                   'Click to load'}
                </div>
              </button>
            ))}
          </div>

          {/* Load Default Button */}
          <div className="text-center">
            <button
              onClick={() => loadSoundFont('Piano')}
              disabled={status === 'loading'}
              className="bg-green-500 hover:bg-green-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center space-x-2 mx-auto"
            >
              {status === 'loading' && <Loader className="animate-spin w-4 h-4" />}
              <span>Load Piano (Default)</span>
            </button>
          </div>

          {/* Status */}
          <div className="text-center mt-4">
            <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg ${
              status === 'ready' ? 'bg-green-500/20 text-green-300' :
              status === 'loading' ? 'bg-yellow-500/20 text-yellow-300' :
              status === 'error' ? 'bg-red-500/20 text-red-300' :
              'bg-gray-500/20 text-gray-300'
            }`}>
              {status === 'loading' && <Loader className="animate-spin w-4 h-4" />}
              <span className="capitalize font-semibold">{status}</span>
            </div>
          </div>
        </div>

        {/* Instrument Selection */}
        {availableInstruments.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-4">Instruments</h3>
            <select
              value={selectedInstrument}
              onChange={(e) => loadInstrument(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              disabled={status !== 'ready'}
            >
              {availableInstruments.map((instrument) => (
                <option key={instrument} value={instrument} className="bg-gray-800">
                  {instrument}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Controls */}
        <div className={`bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 ${status !== 'ready' ? 'opacity-50' : ''}`}>
          <h3 className="text-xl font-bold text-white mb-4">Controls</h3>
          
          {/* Volume and Reverb */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="flex items-center space-x-4">
              <Volume2 className="w-5 h-5 text-white" />
              <span className="text-white font-semibold">Volume:</span>
              <input
                type="range"
                min={0}
                max={127}
                value={volume}
                onChange={(e) => handleVolumeChange(e.target.valueAsNumber)}
                className="flex-1 accent-green-500"
                disabled={status !== 'ready'}
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
                className="flex-1 accent-green-500"
                disabled={status !== 'ready'}
              />
              <span className="text-white/70 font-mono w-12">{(reverbMix * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Test Notes */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Test Notes:</h4>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {[60, 62, 64, 65, 67, 69, 71, 72].map((pitch) => {
                const noteName = ['C', 'D', 'E', 'F', 'G', 'A', 'B', 'C'][pitch - 60];
                const isPlaying = playingNotes.has(pitch);
                return (
                  <button
                    key={pitch}
                    onClick={() => playTestNote(pitch)}
                    disabled={status !== 'ready'}
                    className={`p-3 rounded-lg font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isPlaying 
                        ? 'bg-green-500 text-white scale-95' 
                        : 'bg-white/20 text-white hover:bg-white/30 hover:scale-105'
                    }`}
                  >
                    {noteName}
                    <div className="text-xs opacity-70">{pitch}</div>
                  </button>
                );
              })}
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={playTestScale}
                disabled={status !== 'ready'}
                className="bg-blue-500 hover:bg-blue-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>Play Scale</span>
              </button>
              
              <button
                onClick={stopAll}
                disabled={status !== 'ready'}
                className="bg-red-500 hover:bg-red-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                Stop All
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
          <h3 className="text-lg font-bold text-white mb-4">🎹 SoundFont POC Instructions</h3>
          <div className="text-white/70 space-y-2">
            <p>1. <strong>Click "Load Piano (Default)"</strong> or select any SoundFont above</p>
            <p>2. <strong>Wait for "Ready" status</strong> (should be much faster now!)</p>
            <p>3. <strong>Choose an instrument</strong> from the dropdown if available</p>
            <p>4. <strong>Test individual notes</strong> by clicking the note buttons</p>
            <p>5. <strong>Play a scale</strong> using the "Play Scale" button</p>
            <p>6. <strong>Adjust volume and reverb</strong> to your liking</p>
          </div>
          
          <div className="mt-4 p-4 bg-green-500/10 rounded-lg border border-green-500/30">
            <p className="text-green-300 font-semibold">✅ Fixed Issues:</p>
            <ul className="text-green-200 text-sm mt-2 space-y-1">
              <li>• Using singleton AudioContext pattern (no more "closed" errors)</li>
              <li>• Global reverb instance prevents recreation issues</li>
              <li>• Simplified loading flow matches working example</li>
              <li>• Immediate sampler setup with proper effect chaining</li>
              <li>• No manual audio context resume needed</li>
              <li>• Proper error handling and status reporting</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};