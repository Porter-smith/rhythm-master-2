import React, { useState, useEffect, useRef } from 'react';
import { allSongs, getSongById } from '../data/songs';
import { Song } from '../types/music';
import { Soundfont2Sampler, Reverb } from 'smplr';
import { SoundFont2 } from 'soundfont2';
import { SOUNDFONTS } from '../data/soundfonts';
import { getAudioContext } from '../utils/audioContext';

// Get standard MIDI instrument name
const getMidiInstrumentName = (programNumber: number): string => {
  const instruments = [
    // Piano
    'Acoustic Grand Piano', 'Bright Acoustic Piano', 'Electric Grand Piano', 'Honky-tonk Piano',
    'Electric Piano 1', 'Electric Piano 2', 'Harpsichord', 'Clavi',
    // Chromatic Percussion
    'Celesta', 'Glockenspiel', 'Music Box', 'Vibraphone', 'Marimba', 'Xylophone', 'Tubular Bells', 'Dulcimer',
    // Organ
    'Drawbar Organ', 'Percussive Organ', 'Rock Organ', 'Church Organ', 'Reed Organ', 'Accordion', 'Harmonica', 'Tango Accordion',
    // Guitar
    'Acoustic Guitar (nylon)', 'Acoustic Guitar (steel)', 'Electric Guitar (jazz)', 'Electric Guitar (clean)',
    'Electric Guitar (muted)', 'Overdriven Guitar', 'Distortion Guitar', 'Guitar harmonics',
    // Bass
    'Acoustic Bass', 'Electric Bass (finger)', 'Electric Bass (pick)', 'Fretless Bass',
    'Slap Bass 1', 'Slap Bass 2', 'Synth Bass 1', 'Synth Bass 2',
    // Strings
    'Violin', 'Viola', 'Cello', 'Contrabass', 'Tremolo Strings', 'Pizzicato Strings',
    'Orchestral Harp', 'Timpani',
    // Ensemble
    'String Ensemble 1', 'String Ensemble 2', 'Synth Strings 1', 'Synth Strings 2',
    'Choir Aahs', 'Voice Oohs', 'Synth Voice', 'Orchestra Hit',
    // Brass
    'Trumpet', 'Trombone', 'Tuba', 'Muted Trumpet', 'French Horn', 'Brass Section', 'Synth Brass 1', 'Synth Brass 2',
    // Reed
    'Soprano Sax', 'Alto Sax', 'Tenor Sax', 'Baritone Sax', 'Oboe', 'English Horn', 'Bassoon', 'Clarinet',
    // Pipe
    'Piccolo', 'Flute', 'Recorder', 'Pan Flute', 'Blown Bottle', 'Shakuhachi', 'Whistle', 'Ocarina',
    // Synth Lead
    'Lead 1 (square)', 'Lead 2 (sawtooth)', 'Lead 3 (calliope)', 'Lead 4 (chiff)',
    'Lead 5 (charang)', 'Lead 6 (voice)', 'Lead 7 (fifths)', 'Lead 8 (bass + lead)',
    // Synth Pad
    'Pad 1 (new age)', 'Pad 2 (warm)', 'Pad 3 (polysynth)', 'Pad 4 (choir)',
    'Pad 5 (bowed)', 'Pad 6 (metallic)', 'Pad 7 (halo)', 'Pad 8 (sweep)',
    // Synth Effects
    'FX 1 (rain)', 'FX 2 (soundtrack)', 'FX 3 (crystal)', 'FX 4 (atmosphere)',
    'FX 5 (brightness)', 'FX 6 (goblins)', 'FX 7 (echoes)', 'FX 8 (sci-fi)',
    // Ethnic
    'Sitar', 'Banjo', 'Shamisen', 'Koto', 'Kalimba', 'Bag pipe', 'Fiddle', 'Shanai',
    // Percussive
    'Tinkle Bell', 'Agogo', 'Steel Drums', 'Woodblock', 'Taiko Drum', 'Melodic Tom', 'Synth Drum', 'Reverse Cymbal',
    // Sound Effects
    'Guitar Fret Noise', 'Breath Noise', 'Seashore', 'Bird Tweet', 'Telephone Ring', 'Helicopter', 'Applause', 'Gunshot'
  ];
  
  return instruments[programNumber] || `Unknown Instrument (${programNumber})`;
};

// Analyze MIDI data to show tracks, channels, and instruments
const analyzeMidiData = async (song: Song) => {
  if (song.format !== 'midi') return null;

  console.log('\n🔍 ===== MIDI DATA ANALYSIS =====');
  console.log(`🎵 Song: ${song.title}`);
  console.log(`🎨 Artist: ${song.artist}`);
  
  try {
    // Get the first available difficulty to analyze
    const difficulty = song.difficulties[0];
    const midiFile = (song as any).midiFiles?.[difficulty];
    
    if (!midiFile) {
      console.warn('⚠️ No MIDI file found for analysis');
      return null;
    }

    console.log(`📂 Analyzing MIDI file: ${midiFile}`);
    
    // Fetch and parse the MIDI file directly
    const response = await fetch(midiFile);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    
    console.log(`📦 MIDI file size: ${arrayBuffer.byteLength} bytes`);
    
    // Parse MIDI header
    let pos = 0;
    const read32 = (): number => (data[pos++] << 24) | (data[pos++] << 16) | (data[pos++] << 8) | data[pos++];
    const read16 = (): number => (data[pos++] << 8) | data[pos++];
    const read8 = (): number => data[pos++];
    const readVarLength = (): number => {
      let value = 0;
      let byte;
      do {
        byte = read8();
        value = (value << 7) | (byte & 0x7F);
      } while (byte & 0x80);
      return value;
    };

    // Check MThd header
    if (read32() !== 0x4D546864) {
      throw new Error('Not a valid MIDI file');
    }

    read32(); // Skip header length
    const format = read16();
    const trackCount = read16();
    const ticksPerQuarter = read16();

    console.log(`🎼 MIDI Header:`);
    console.log(`  📊 Format: ${format}`);
    console.log(`  🎼 Tracks: ${trackCount}`);
    console.log(`  ⏱️ Ticks per quarter: ${ticksPerQuarter}`);

    // Track analysis data
    const trackAnalysis: Array<{
      index: number;
      name?: string;
      channels: Set<number>;
      instruments: Map<number, number>;
      noteCount: number;
      pitchRange: { min: number; max: number };
      timeRange: { start: number; end: number };
    }> = [];

    // Channel to instrument mapping
    const channelInstruments = new Map<number, number>();

    // Process each track
    for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
      console.log(`\n🎼 ===== TRACK ${trackIndex + 1} =====`);
      
      // Check track header
      if (read32() !== 0x4D54726B) {
        console.warn(`⚠️ Invalid track header for track ${trackIndex + 1}`);
        continue;
      }

      const trackLength = read32();
      const trackEnd = pos + trackLength;
      let trackTicks = 0;
      let runningStatus = 0;
      
      let trackName: string | undefined;
      const trackChannels = new Set<number>();
      const trackInstruments = new Map<number, number>();
      const trackNotes: Array<{ pitch: number; time: number; duration: number; velocity: number; channel: number }> = [];
      const activeNotes = new Map<number, { startTicks: number; velocity: number; channel: number }>();

      console.log(`📏 Track length: ${trackLength} bytes`);

      // Process track events
      while (pos < trackEnd) {
        const deltaTime = readVarLength();
        trackTicks += deltaTime;
        
        let command = read8();
        if (command < 0x80) {
          // Use running status
          pos--;
          command = runningStatus;
        } else {
          runningStatus = command;
        }

        const messageType = command & 0xF0;
        const channel = command & 0x0F;

        // Track which channels this track uses
        if (messageType !== 0xFF) {
          trackChannels.add(channel);
        }

        // Process different message types
        if (messageType === 0x90) {
          // Note On
          const note = read8();
          const velocity = read8();
          
          if (velocity > 0) {
            // Actual note on
            activeNotes.set(note, { startTicks: trackTicks, velocity, channel });
          } else {
            // Velocity 0 = note off
            const noteInfo = activeNotes.get(note);
            if (noteInfo) {
              const startTime = trackTicks / ticksPerQuarter * 0.5; // Approximate time conversion
              const endTime = trackTicks / ticksPerQuarter * 0.5;
              const duration = Math.max(0.1, endTime - startTime);
              
              trackNotes.push({
                pitch: note,
                time: startTime,
                duration,
                velocity: noteInfo.velocity,
                channel: noteInfo.channel
              });
              
              activeNotes.delete(note);
            }
          }
        } else if (messageType === 0x80) {
          // Note Off
          const note = read8();
          read8(); // Skip velocity
          
          const noteInfo = activeNotes.get(note);
          if (noteInfo) {
            const startTime = noteInfo.startTicks / ticksPerQuarter * 0.5;
            const endTime = trackTicks / ticksPerQuarter * 0.5;
            const duration = Math.max(0.1, endTime - startTime);
            
            trackNotes.push({
              pitch: note,
              time: startTime,
              duration,
              velocity: noteInfo.velocity,
              channel: noteInfo.channel
            });
            
            activeNotes.delete(note);
          }
        } else if (messageType === 0xC0) {
          // Program Change (instrument selection)
          const instrument = read8();
          trackInstruments.set(channel, instrument);
          channelInstruments.set(channel, instrument);
          
          const instrumentName = getMidiInstrumentName(instrument);
          console.log(`🎹 Channel ${channel}: Program Change to instrument ${instrument} (${instrumentName})`);
        } else if (messageType === 0xB0) {
          // Control Change
          const controller = read8();
          const value = read8();
          
          if (controller === 0) {
            // Bank Select
            console.log(`🏦 Channel ${channel}: Bank Select ${value}`);
          }
        } else if (messageType === 0xA0 || messageType === 0xE0) {
          // Aftertouch, Pitch Bend (2 bytes)
          read8();
          read8();
        } else if (messageType === 0xD0) {
          // Channel Pressure (1 byte)
          read8();
        } else if (command === 0xFF) {
          // Meta event
          const metaType = read8();
          const metaLength = readVarLength();
          
          if (metaType === 0x03) {
            // Track Name
            const nameBytes = data.slice(pos, pos + metaLength);
            trackName = new TextDecoder().decode(nameBytes);
            pos += metaLength;
            console.log(`🏷️ Track name: "${trackName}"`);
          } else if (metaType === 0x51 && metaLength === 3) {
            // Set Tempo
            const newTempo = (read8() << 16) | (read8() << 8) | read8();
            const bpm = 60000000 / newTempo;
            console.log(`🎼 Tempo change: ${bpm.toFixed(1)} BPM at tick ${trackTicks}`);
          } else if (metaType === 0x58 && metaLength === 4) {
            // Time Signature
            const numerator = read8();
            const denominator = Math.pow(2, read8());
            read8(); // clocks per click
            read8(); // 32nd notes per quarter
            console.log(`🎼 Time signature: ${numerator}/${denominator} at tick ${trackTicks}`);
          } else {
            // Skip other meta events
            pos += metaLength;
          }
        } else if (command >= 0xF0) {
          // System exclusive
          const sysexLength = readVarLength();
          pos += sysexLength;
        }
      }

      // Process any remaining active notes
      activeNotes.forEach((noteInfo, pitch) => {
        const startTime = noteInfo.startTicks / ticksPerQuarter * 0.5;
        const duration = 0.5; // Default duration
        
        trackNotes.push({
          pitch,
          time: startTime,
          duration,
          velocity: noteInfo.velocity,
          channel: noteInfo.channel
        });
      });

      // Calculate track statistics
      const pitches = trackNotes.map(n => n.pitch);
      const times = trackNotes.map(n => n.time);
      
      const analysis = {
        index: trackIndex,
        name: trackName,
        channels: trackChannels,
        instruments: trackInstruments,
        noteCount: trackNotes.length,
        pitchRange: pitches.length > 0 ? { min: Math.min(...pitches), max: Math.max(...pitches) } : { min: 0, max: 0 },
        timeRange: times.length > 0 ? { start: Math.min(...times), end: Math.max(...times) } : { start: 0, end: 0 }
      };

      trackAnalysis.push(analysis);

      console.log(`📊 Track ${trackIndex + 1} Summary:`);
      console.log(`  🏷️ Name: "${trackName || 'Unnamed'}"`);
      console.log(`  🎵 Channels: ${Array.from(trackChannels).join(', ')}`);
      console.log(`  🎹 Instruments: ${Array.from(trackInstruments.entries()).map(([ch, inst]) => 
        `Ch${ch}:${inst}(${getMidiInstrumentName(inst)})`).join(', ')}`);
      console.log(`  📝 Notes: ${trackNotes.length}`);
      if (trackNotes.length > 0) {
        console.log(`  🎹 Pitch range: ${analysis.pitchRange.min} - ${analysis.pitchRange.max}`);
        console.log(`  ⏱️ Time range: ${analysis.timeRange.start.toFixed(2)}s - ${analysis.timeRange.end.toFixed(2)}s`);
      }
    }

    // Summary report
    console.log('\n📋 ===== MIDI ANALYSIS SUMMARY =====');
    console.log(`🎼 Total tracks: ${trackCount}`);
    console.log(`🎵 Total notes: ${trackAnalysis.reduce((sum, t) => sum + t.noteCount, 0)}`);
    
    // Channel summary
    console.log('\n🎵 Channel Summary:');
    const channelSummary = new Map<number, { instrument?: number; name?: string; noteCount: number; tracks: number[] }>();
    
    trackAnalysis.forEach(track => {
      track.channels.forEach(channel => {
        if (!channelSummary.has(channel)) {
          channelSummary.set(channel, { instrument: track.instruments.get(channel), name: track.name, noteCount: 0, tracks: [] });
        }
        const channelInfo = channelSummary.get(channel)!;
        channelInfo.noteCount += track.noteCount;
        channelInfo.tracks.push(track.index);
        if (track.instruments.has(channel)) channelInfo.instrument = track.instruments.get(channel);
        if (track.name) channelInfo.name = track.name;
      });
    });

    channelSummary.forEach((info, channel) => {
      if (info.instrument !== undefined) {
        const instrumentName = getMidiInstrumentName(info.instrument);
        console.log(`  Channel ${channel}: Instrument ${info.instrument} (${instrumentName}) - ${info.noteCount} notes (tracks: ${info.tracks.join(', ')})`);
      } else {
        console.log(`  Channel ${channel}: No instrument specified - ${info.noteCount} notes (tracks: ${info.tracks.join(', ')})`);
      }
      if (info.name) console.log(`    Name: "${info.name}"`);
    });

    // Instrument mapping
    console.log('\n🎹 Instrument Mapping:');
    const instrumentMapping = new Map<number, number[]>();
    channelInstruments.forEach((instrument, channel) => {
      if (!instrumentMapping.has(instrument)) {
        instrumentMapping.set(instrument, []);
      }
      instrumentMapping.get(instrument)!.push(channel);
    });

    instrumentMapping.forEach((channels, instrument) => {
      const instrumentName = getMidiInstrumentName(instrument);
      console.log(`  Instrument ${instrument} (${instrumentName}): Channels ${channels.join(', ')}`);
    });

    console.log('\n✅ MIDI analysis complete');
    console.log('🔍 ===== END MIDI ANALYSIS =====\n');

    return {
      tracks: trackAnalysis,
      channels: channelSummary,
      instruments: instrumentMapping,
      summary: { totalTracks: trackCount, totalNotes: trackAnalysis.reduce((sum, t) => sum + t.noteCount, 0) }
    };

  } catch (error) {
    console.error('❌ MIDI analysis failed:', error);
    return null;
  }
};

export const MidiTestUI: React.FC = () => {
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [sampler, setSampler] = useState<Soundfont2Sampler | undefined>(undefined);
  const [samplerLoading, setSamplerLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [currentNotes, setCurrentNotes] = useState<Set<number>>(new Set());

  // Refs
  const playbackTimerRef = useRef<number | null>(null);
  const scheduledNotesRef = useRef<Set<number>>(new Set());
  const isPlayingRef = useRef<boolean>(false);

  // Initialize sampler
  const initializeSampler = async () => {
    if (sampler) return;
    
    setSamplerLoading(true);
    try {
      const context = getAudioContext();
      const soundFont = SOUNDFONTS['piano-yamaha'];
      
      console.log('🎹 Loading soundfont for playback test...');
      
      const newSampler = new Soundfont2Sampler(context, {
        url: soundFont.url,
        createSoundfont: (data) => new SoundFont2(data),
      });

      // Add reverb
      const reverb = new Reverb(context);
      newSampler.output.addEffect('reverb', reverb, 0.2);
      newSampler.output.setVolume(80);

      const loadedSampler = await newSampler.load;
      console.log('✅ Sampler loaded for playback test');

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
      console.log('🎉 Sampler ready for MIDI playback');
    } catch (error) {
      console.error('❌ Failed to initialize sampler:', error);
    } finally {
      setSamplerLoading(false);
    }
  };

  // Play MIDI notes
  const playMidiNotes = async () => {
    if (!analysis || !sampler) return;

    try {
      setIsPlaying(true);
      isPlayingRef.current = true;
      scheduledNotesRef.current.clear();
      setCurrentNotes(new Set());
      setPlaybackProgress(0);

      console.log('🎮 Starting MIDI playback test...');

      // Get all notes from all tracks
      const allNotes: Array<{
        time: number;
        pitch: number;
        duration: number;
        velocity: number;
        channel: number;
      }> = [];

      analysis.tracks.forEach((track: any) => {
        // This is a simplified approach - in reality we'd need to parse the actual MIDI notes
        // For now, we'll create some test notes based on the analysis
        if (track.noteCount > 0) {
          const channel = Array.from(track.channels)[0];
          const instrument = track.instruments.get(channel);
          
          // Create some test notes for this track
          for (let i = 0; i < Math.min(track.noteCount, 10); i++) {
            const time = track.timeRange.start + (i * 0.5);
            const pitch = track.pitchRange.min + (i % (track.pitchRange.max - track.pitchRange.min + 1));
            
            allNotes.push({
              time,
              pitch,
              duration: 0.3,
              velocity: 80,
              channel: channel
            });
          }
        }
      });

      // Sort notes by time
      allNotes.sort((a, b) => a.time - b.time);

      console.log(`🎵 Playing ${allNotes.length} test notes`);

      // Schedule notes
      const startTime = sampler.context.currentTime;
      allNotes.forEach((note, index) => {
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
      const maxTime = Math.max(...allNotes.map(n => n.time + n.duration));
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
    console.log('🛑 Stopping MIDI playback...');
    
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

  const handleSongSelect = async (songId: string) => {
    const song = getSongById(songId);
    if (!song || song.format !== 'midi') return;

    setLoading(true);
    setSelectedSong(song);
    
    const result = await analyzeMidiData(song);
    setAnalysis(result);
    setLoading(false);

    // Initialize sampler when song is selected
    if (!sampler) {
      await initializeSampler();
    }
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

  const midiSongs = allSongs.filter(song => song.format === 'midi');

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#1a1a1a', color: '#fff', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: '20px' }}>🔍 MIDI Analysis Test</h1>
      
      {/* Song Selection */}
      <div style={{ marginBottom: '20px' }}>
        <h2>Select MIDI Song:</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {midiSongs.map(song => (
            <button
              key={song.id}
              onClick={() => handleSongSelect(song.id)}
              style={{
                padding: '8px 12px',
                backgroundColor: selectedSong?.id === song.id ? '#4a90e2' : '#333',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {song.title}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ marginBottom: '20px' }}>
          <p>Loading MIDI analysis...</p>
        </div>
      )}

      {samplerLoading && (
        <div style={{ marginBottom: '20px' }}>
          <p>Loading soundfont for playback...</p>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && selectedSong && (
        <div>
          <h2>🔍 MIDI Analysis ({selectedSong.title})</h2>
          
          {/* Playback Controls */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#333', borderRadius: '8px' }}>
            <h3 style={{ marginBottom: '10px' }}>🎵 Playback Test</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <button
                onClick={playMidiNotes}
                disabled={!sampler || isPlaying}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isPlaying ? '#666' : '#4CAF50',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isPlaying ? 'not-allowed' : 'pointer',
                  fontSize: '16px'
                }}
              >
                {isPlaying ? 'Playing...' : '▶️ Play MIDI Test'}
              </button>
              
              <button
                onClick={stopPlayback}
                disabled={!isPlaying}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isPlaying ? '#f44336' : '#666',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isPlaying ? 'pointer' : 'not-allowed',
                  fontSize: '16px'
                }}
              >
                ⏹️ Stop
              </button>
              
              {isPlaying && (
                <div style={{ flex: 1, marginLeft: '15px' }}>
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#555', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${playbackProgress * 100}%`, 
                        height: '100%', 
                        backgroundColor: '#4CAF50',
                        transition: 'width 0.1s linear'
                      }}
                    />
                  </div>
                  <div style={{ fontSize: '12px', color: '#ccc', marginTop: '5px' }}>
                    Progress: {(playbackProgress * 100).toFixed(1)}%
                  </div>
                </div>
              )}
            </div>
            
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#ccc' }}>
              {sampler ? '✅ Soundfont loaded and ready' : '⏳ Loading soundfont...'}
              {currentNotes.size > 0 && (
                <span style={{ marginLeft: '15px', color: '#4CAF50' }}>
                  🎹 Playing notes: {Array.from(currentNotes).join(', ')}
                </span>
              )}
            </div>
          </div>
          
          {/* Summary */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
            <div style={{ padding: '10px', backgroundColor: '#333', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{analysis.summary.totalTracks}</div>
              <div style={{ fontSize: '12px', color: '#ccc' }}>Total Tracks</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: '#333', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{analysis.summary.totalNotes}</div>
              <div style={{ fontSize: '12px', color: '#ccc' }}>Total Notes</div>
            </div>
            <div style={{ padding: '10px', backgroundColor: '#333', borderRadius: '4px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{analysis.instruments.size}</div>
              <div style={{ fontSize: '12px', color: '#ccc' }}>Unique Instruments</div>
            </div>
          </div>

          {/* Channel Summary */}
          <div style={{ marginBottom: '20px' }}>
            <h3>🎵 Channel Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '10px' }}>
              {Array.from(analysis.channels.entries()).map(([channel, info]: [number, any]) => (
                <div key={channel} style={{ padding: '10px', backgroundColor: '#333', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <span style={{ fontWeight: 'bold' }}>Channel {channel}</span>
                    <span style={{ color: '#ccc' }}>{info.noteCount} notes</span>
                  </div>
                  {info.instrument !== undefined ? (
                    <div style={{ color: '#4a90e2' }}>
                      {getMidiInstrumentName(info.instrument)}
                    </div>
                  ) : (
                    <div style={{ color: '#ff6b6b' }}>No instrument specified</div>
                  )}
                  {info.name && (
                    <div style={{ color: '#ccc', fontSize: '12px', marginTop: '5px' }}>"{info.name}"</div>
                  )}
                  <div style={{ color: '#999', fontSize: '10px', marginTop: '5px' }}>
                    Tracks: {info.tracks.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Track Details */}
          <div>
            <h3>🎼 Track Details</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {analysis.tracks.map((track: any) => (
                <div key={track.index} style={{ padding: '10px', backgroundColor: '#333', borderRadius: '4px', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <span style={{ fontWeight: 'bold' }}>Track {track.index + 1}</span>
                      <span style={{ color: '#ccc' }}>Channels: {Array.from(track.channels).join(', ')}</span>
                      <span style={{ color: '#ccc' }}>{track.noteCount} notes</span>
                    </div>
                  </div>
                  {track.name && (
                    <div style={{ color: '#4a90e2', marginBottom: '5px' }}>"{track.name}"</div>
                  )}
                  {Array.from(track.instruments.entries()).map(([ch, inst]: [number, number]) => (
                    <div key={ch} style={{ color: '#4a90e2', fontSize: '12px' }}>
                      Ch{ch}: {getMidiInstrumentName(inst)}
                    </div>
                  ))}
                  {track.instruments.size === 0 && (
                    <div style={{ color: '#ff6b6b', fontSize: '12px' }}>No instruments specified</div>
                  )}
                  {track.noteCount > 0 && (
                    <div style={{ color: '#999', fontSize: '10px', marginTop: '5px' }}>
                      Pitch: {track.pitchRange.min}-{track.pitchRange.max} • 
                      Time: {track.timeRange.start.toFixed(1)}s-{track.timeRange.end.toFixed(1)}s
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}; 