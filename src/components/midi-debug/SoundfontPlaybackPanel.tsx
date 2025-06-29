import React, { useState, useEffect, useRef } from 'react';
import { loadSoundFont, MIDI, SpessaSynthProcessor, SpessaSynthSequencer } from 'spessasynth_core';
import { Play, Pause } from 'lucide-react';

export const SoundfontPlaybackPanel = () => {
  const [voiceList, setVoiceList] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<SpessaSynthProcessor | null>(null);
  const seqRef = useRef<SpessaSynthSequencer | null>(null);
  const voiceTrackingIntervalRef = useRef<number | null>(null);
  const audioLoopIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const initialVoiceList: string[] = [];
    for (let i = 0; i < 16; i++) {
      initialVoiceList.push(`Channel ${i + 1}:\n`);
    }
    setVoiceList(initialVoiceList);
  }, []);

  const handleSoundfontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target?.files;
    if (!files?.[0]) {
      return;
    }

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

    voiceTrackingIntervalRef.current = window.setInterval(() => {
      synth.midiAudioChannels.forEach((c, chanNum) => {
        let text = `Channel ${chanNum + 1}:\n`;

        c.voices.forEach(v => {
          text += `note: ${v.midiNote}\n`;
        });

        setVoiceList(prev => {
          const newList = [...prev];
          newList[chanNum] = text;
          return newList;
        });
      });
    }, 100);
  };

  const handleMidiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target?.files?.[0] || !seqRef.current) {
      return;
    }

    const file = e.target.files[0];
    const midi = new MIDI(await file.arrayBuffer());
    seqRef.current.loadNewSongList([midi]);
    // Song automatically plays, so we need to pause it
    seqRef.current.pause();
    setIsPlaying(false);
  };

  const togglePlayPause = () => {
    if (!seqRef.current) return;

    if (isPlaying) {
      seqRef.current.pause();
      setIsPlaying(false);
    } else {
      seqRef.current.play();
      setIsPlaying(true);
    }
  };

  return (
    <div>
      <label htmlFor='soundfont_input'>Upload the soundfont.</label>
      <input accept='.sf2, .sf3, .dls' id='soundfont_input' type='file' onChange={handleSoundfontUpload} />
      
      <label htmlFor='midi_input'>Select the MIDI file</label>
      <input accept='.midi, .mid, .rmi, .smf' id='midi_input' type='file' onChange={handleMidiUpload} />
      
      <div style={{ marginTop: '10px' }}>
        <button 
          onClick={togglePlayPause}
          disabled={!seqRef.current}
          style={{
            padding: '8px 16px',
            backgroundColor: isPlaying ? '#ef4444' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: seqRef.current ? 'pointer' : 'not-allowed',
            opacity: seqRef.current ? 1 : 0.5
          }}
        >
          {isPlaying ? (
            <>
              <Pause size={16} style={{ marginRight: '4px' }} />
              Pause
            </>
          ) : (
            <>
              <Play size={16} style={{ marginRight: '4px' }} />
              Play
            </>
          )}
        </button>
      </div>
      
      <h2>Voice list</h2>
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-evenly' }}>
        {voiceList.map((text, index) => (
          <pre key={index}>{text}</pre>
        ))}
      </div>
    </div>
  );
};
