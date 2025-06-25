import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, CheckCircle, Music } from 'lucide-react';
import { ParsedMidiData } from '../../music/MidiParser';
import { Soundfont2Sampler, Reverb } from 'smplr';
import { SoundFont2 } from 'soundfont2';
import { SOUNDFONTS, getAllSoundFonts } from '../../data/soundfonts';
import { getAudioContext } from '../../utils/audioContext';
import { MidiNote } from './types';

interface SoundfontPlaybackPanelProps {
  midiData: ParsedMidiData | null;
  filteredNotes: MidiNote[];
  defaultSoundFontId?: string;
}

export const SoundfontPlaybackPanel: React.FC<SoundfontPlaybackPanelProps> = ({ 
  midiData, 
  filteredNotes, 
  defaultSoundFontId = 'piano-yamaha'
}) => {
  const [sampler, setSampler] = useState<Soundfont2Sampler | undefined>(undefined);
  const [samplerLoading, setSamplerLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [currentNotes, setCurrentNotes] = useState<Set<number>>(new Set());
  const [selectedSoundFontId, setSelectedSoundFontId] = useState<string>(defaultSoundFontId);

  // Refs
  const playbackTimerRef = useRef<number | null>(null);
  const scheduledNotesRef = useRef<Set<number>>(new Set());
  const isPlayingRef = useRef<boolean>(false);

  // Get all available soundfonts
  const availableSoundFonts = getAllSoundFonts();

  // Initialize sampler
  const initializeSampler = async () => {
    if (sampler) return;
    
    setSamplerLoading(true);
    try {
      const context = getAudioContext();
      const soundFont = SOUNDFONTS[selectedSoundFontId];
      
      if (!soundFont) {
        throw new Error(`SoundFont not found: ${selectedSoundFontId}`);
      }
      
      console.log(`🎹 Loading soundfont for MIDI debug playback: ${soundFont.name}`);
      
      const newSampler = new Soundfont2Sampler(context, {
        url: soundFont.url,
        createSoundfont: (data) => new SoundFont2(data),
      });

      // Add reverb
      const reverb = new Reverb(context);
      newSampler.output.addEffect('reverb', reverb, 0.2);
      newSampler.output.setVolume(80);

      const loadedSampler = await newSampler.load;
      console.log('✅ Sampler loaded for MIDI debug playback');

      // Load all instruments for MIDI playback
      const instruments = loadedSampler.instrumentNames || [];
      console.log(`🎵 Loading ${instruments.length} instruments for MIDI playback`);
      
      for (let i = 0; i < Math.min(instruments.length, 16); i++) {
        const instrument = instruments[i];
        try {
          await loadedSampler.loadInstrument(instrument);
          console.log(`✅ Instrument loaded for channel ${i}: ${instrument}`);
        } catch (err) {
          console.warn(`⚠️ Failed to load instrument ${instrument}:`, err);
        }
      }

      setSampler(loadedSampler);
      console.log('🎉 Sampler ready for MIDI debug playback');
    } catch (error) {
      console.error('❌ Failed to initialize sampler:', error);
    } finally {
      setSamplerLoading(false);
    }
  };

  // Handle soundfont change
  const handleSoundFontChange = async (soundFontId: string) => {
    setSelectedSoundFontId(soundFontId);
    
    // If sampler is already loaded, we need to reload it with the new soundfont
    if (sampler) {
      console.log('🔄 Reloading sampler with new soundfont...');
      
      // Cleanup existing sampler
      try {
        sampler.disconnect();
      } catch (err) {
        console.warn('⚠️ Error disconnecting sampler:', err);
      }
      
      setSampler(undefined);
      setCurrentNotes(new Set());
      setPlaybackProgress(0);
      
      // Reload with new soundfont
      await initializeSampler();
    }
  };

  // Play MIDI notes
  const playMidiNotes = async () => {
    if (!midiData || !sampler || filteredNotes.length === 0) return;

    try {
      setIsPlaying(true);
      isPlayingRef.current = true;
      scheduledNotesRef.current.clear();
      setCurrentNotes(new Set());
      setPlaybackProgress(0);

      console.log('🎮 Starting MIDI debug playback...');

      // Sort notes by time
      const sortedNotes = [...filteredNotes].sort((a, b) => a.time - b.time);

      console.log(`🎵 Playing ${sortedNotes.length} notes`);

      // Schedule notes
      const startTime = sampler.context.currentTime;
      sortedNotes.forEach((note, index) => {
        if (!isPlayingRef.current) return;
        
        const noteStartTime = startTime + note.time;
        const noteId = index;
        
        scheduledNotesRef.current.add(noteId);
        
        try {
          const noteParams: {
            note: number;
            velocity: number;
            detune: number;
            time: number;
            duration: number;
            channel?: number;
          } = {
            note: note.pitch,
            velocity: note.velocity,
            detune: 0,
            time: noteStartTime,
            duration: note.duration,
            channel: note.channel
          };

          sampler.start(noteParams);

          // Visual feedback
          setTimeout(() => {
            if (isPlayingRef.current) {
              setCurrentNotes(prev => new Set(prev).add(note.pitch));
              setTimeout(() => {
                setCurrentNotes(prev => {
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

      // Start progress timer
      const maxTime = Math.max(...sortedNotes.map(n => n.time + n.duration));
      const startTimestamp = Date.now();
      
      playbackTimerRef.current = window.setInterval(() => {
        if (!isPlayingRef.current) {
          if (playbackTimerRef.current) {
            clearInterval(playbackTimerRef.current);
            playbackTimerRef.current = null;
          }
          return;
        }
        
        const elapsed = (Date.now() - startTimestamp) / 1000;
        const progress = Math.min(1, elapsed / maxTime);
        setPlaybackProgress(progress);
        
        if (elapsed >= maxTime) {
          stopPlayback();
        }
      }, 100);

    } catch (error) {
      console.error('❌ Playback failed:', error);
      setIsPlaying(false);
    }
  };

  // Stop playback
  const stopPlayback = () => {
    console.log('🛑 Stopping MIDI debug playback...');
    
    isPlayingRef.current = false;
    
    if (sampler) {
      try {
        sampler.stop();
      } catch (err) {
        console.error('❌ Failed to stop sampler:', err);
      }
    }
    
    if (playbackTimerRef.current) {
      clearInterval(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }

    scheduledNotesRef.current.clear();
    setCurrentNotes(new Set());
    setPlaybackProgress(0);
    setIsPlaying(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
      }
      if (sampler) {
        sampler.disconnect();
      }
    };
  }, [sampler]);

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center space-x-2">
        <Volume2 className="w-5 h-5 text-green-400" />
        <span>Soundfont Playback</span>
      </h2>
      
      <div className="space-y-4">
        {/* Soundfont Selection */}
        <div>
          <label className="block text-white/80 text-sm mb-2">SoundFont</label>
          <select
            value={selectedSoundFontId}
            onChange={(e) => handleSoundFontChange(e.target.value)}
            className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
          >
            {availableSoundFonts.map((soundFont) => (
              <option key={soundFont.id} value={soundFont.id}>
                {soundFont.name} ({soundFont.category})
              </option>
            ))}
          </select>
          <div className="text-xs text-white/60 mt-1">
            {SOUNDFONTS[selectedSoundFontId]?.description}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={initializeSampler}
            disabled={samplerLoading || !!sampler}
            className="bg-green-500 hover:bg-green-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            {samplerLoading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Loading...</span>
              </>
            ) : sampler ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Soundfont Ready</span>
              </>
            ) : (
              <>
                <Music className="w-4 h-4" />
                <span>Load Soundfont</span>
              </>
            )}
          </button>
          
          <button
            onClick={playMidiNotes}
            disabled={!sampler || isPlaying || filteredNotes.length === 0}
            className="bg-blue-500 hover:bg-blue-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center space-x-2"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? 'Playing...' : 'Play Notes'}</span>
          </button>
          
          <button
            onClick={stopPlayback}
            disabled={!isPlaying}
            className="bg-red-500 hover:bg-red-400 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded-lg transition-colors duration-200"
          >
            ⏹️ Stop
          </button>
        </div>
        
        {isPlaying && (
          <div>
            <div className="w-full bg-white/20 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-400 h-2 rounded-full transition-all duration-100"
                style={{ width: `${playbackProgress * 100}%` }}
              />
            </div>
            <div className="text-xs text-white/60">
              Progress: {(playbackProgress * 100).toFixed(1)}%
            </div>
          </div>
        )}
        
        <div className="text-sm text-white/60">
          {sampler ? '✅ Soundfont loaded and ready' : '⏳ Click "Load Soundfont" to enable playback'}
          {currentNotes.size > 0 && (
            <span className="ml-4 text-green-400">
              🎹 Playing: {Array.from(currentNotes).join(', ')}
            </span>
          )}
          {filteredNotes.length > 0 && (
            <span className="ml-4 text-blue-400">
              📝 {filteredNotes.length} notes available
            </span>
          )}
        </div>
      </div>
    </div>
  );
}; 