import React, { useState, useEffect, useRef } from 'react';
import { loadSoundFont, MIDI, SpessaSynthProcessor, SpessaSynthSequencer } from 'spessasynth_core';

export const SoundfontPlaybackPanel = () => {
  const [voiceList, setVoiceList] = useState<string[]>([]);
  const contextRef = useRef<AudioContext | null>(null);
  const synthRef = useRef<SpessaSynthProcessor | null>(null);
  const seqRef = useRef<SpessaSynthSequencer | null>(null);
  const voiceTrackingIntervalRef = useRef<number | null>(null);
  const audioLoopIntervalRef = useRef<number | null>(null);

  // Initialize voice list
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

    // Create a new audio context
    const context = new AudioContext({
      sampleRate: 44100
    });
    contextRef.current = context;

    // Resume the audio context so audio processing can begin
    await context.resume();

    // Read the uploaded file into an ArrayBuffer
    const fontBuffer = await files[0].arrayBuffer();

    // Create an instance of the synthesizer and load it with the sound bank
    const synth = new SpessaSynthProcessor(44100);
    synthRef.current = synth;
    synth.soundfontManager.reloadManager(loadSoundFont(fontBuffer));

    // Initialize the sequencer for MIDI playback
    const seq = new SpessaSynthSequencer(synth);
    seqRef.current = seq;

    // THE MAIN AUDIO RENDERING LOOP IS HERE
    audioLoopIntervalRef.current = window.setInterval(() => {
      // Get the synthesizer's internal current time
      const synTime = synth.currentSynthTime;

      // If the synth time is significantly ahead of the context time, skip rendering
      // (wait for the context to catch up)
      if (synTime > context.currentTime + 0.1) {
        return;
      }

      // Create empty stereo buffers for dry signal, reverb, and chorus outputs
      const BUFFER_SIZE = 512;
      const output = [new Float32Array(BUFFER_SIZE), new Float32Array(BUFFER_SIZE)];
      const reverb = [new Float32Array(BUFFER_SIZE), new Float32Array(BUFFER_SIZE)];
      const chorus = [new Float32Array(BUFFER_SIZE), new Float32Array(BUFFER_SIZE)];

      // Play back the MIDI file
      seq.processTick();

      // Render the next chunk of audio into the provided buffers
      synth.renderAudio(output, reverb, chorus);

      // Function to play a given stereo buffer to a specified output node
      const playAudio = (arr: Float32Array[], output: AudioNode) => {
        // Create an AudioBuffer to hold the sample data
        const outBuffer = new AudioBuffer({
          numberOfChannels: 2,
          length: 512,
          sampleRate: 44100
        });

        // Copy the left and right channel data into the audio buffer
        outBuffer.copyToChannel(arr[0], 0);
        outBuffer.copyToChannel(arr[1], 1);

        // Create a source node from the buffer and connect it to the desired output
        const source = new AudioBufferSourceNode(context, {
          buffer: outBuffer
        });
        source.connect(output);

        // Schedule the buffer to play at the synth's current time
        source.start(synTime);
      };

      // Play the dry audio to the main output
      playAudio(output, context.destination);
    }, 10);

    // Set up an interval to regularly update the voice display for each channel
    voiceTrackingIntervalRef.current = window.setInterval(() => {
      // Loop through each MIDI channel in the synth
      synth.midiAudioChannels.forEach((c, chanNum) => {
        // Start building the display string with the channel number
        let text = `Channel ${chanNum + 1}:\n`;

        // Append a line for each currently active voice with its MIDI note
        c.voices.forEach(v => {
          text += `note: ${v.midiNote}\n`;
        });

        // Update the voice list
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

    // Parse and play the file
    const file = e.target.files[0];
    const midi = new MIDI(await file.arrayBuffer());
    seqRef.current.loadNewSongList([midi]);
    seqRef.current.play();
  };

  return (
    <div>
      <label htmlFor='soundfont_input'>Upload the soundfont.</label>
      <input accept='.sf2, .sf3, .dls' id='soundfont_input' type='file' onChange={handleSoundfontUpload} />
      
      <label htmlFor='midi_input'>Select the MIDI file</label>
      <input accept='.midi, .mid, .rmi, .smf' id='midi_input' type='file' onChange={handleMidiUpload} />
      
      <h2>Voice list</h2>
      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-evenly' }}>
        {voiceList.map((text, index) => (
          <pre key={index}>{text}</pre>
        ))}
      </div>
    </div>
  );
};
