import React, { useState, useEffect, useRef } from 'react';
import { loadSoundFont, MIDI, SpessaSynthProcessor, SpessaSynthSequencer } from 'spessasynth_core';
import { Play, Pause, Loader2 } from 'lucide-react';

interface SoundfontPlaybackPanelProps {
  soundfontUrl?: string;
  midiUrl?: string;
}

export const SoundfontPlaybackPanel: React.FC<SoundfontPlaybackPanelProps> = ({ 
  soundfontUrl, 
  midiUrl 
}) => {
  const [voiceList, setVoiceList] = useState<string[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadStatus, setLoadStatus] = useState<string>('');
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

  // Auto-load soundfont and MIDI when URLs are provided
  useEffect(() => {
    if (soundfontUrl && midiUrl) {
      loadSoundfontAndMidi(soundfontUrl, midiUrl);
    }
  }, [soundfontUrl, midiUrl]);

  const loadSoundfontAndMidi = async (fontUrl: string, midiFileUrl: string) => {
    setIsLoading(true);
    setLoadStatus('Loading soundfont...');
    
    try {
      // Create a new audio context
      const context = new AudioContext({
        sampleRate: 44100
      });
      contextRef.current = context;

      // Resume the audio context so audio processing can begin
      await context.resume();

      // Fetch the soundfont file
      setLoadStatus('Fetching soundfont...');
      const fontResponse = await fetch(fontUrl);
      if (!fontResponse.ok) {
        throw new Error(`Failed to fetch soundfont: ${fontResponse.statusText}`);
      }
      const fontBuffer = await fontResponse.arrayBuffer();

      // Create an instance of the synthesizer and load it with the sound bank
      setLoadStatus('Loading soundfont into synthesizer...');
      const synth = new SpessaSynthProcessor(44100);
      synthRef.current = synth;
      synth.soundfontManager.reloadManager(loadSoundFont(fontBuffer));

      // Initialize the sequencer for MIDI playback
      const seq = new SpessaSynthSequencer(synth);
      seqRef.current = seq;

      // Fetch and load the MIDI file
      setLoadStatus('Loading MIDI file...');
      const midiResponse = await fetch(midiFileUrl);
      if (!midiResponse.ok) {
        throw new Error(`Failed to fetch MIDI file: ${midiResponse.statusText}`);
      }
      const midiBuffer = await midiResponse.arrayBuffer();
      const midi = new MIDI(midiBuffer);
      seq.loadNewSongList([midi]);
      
      // Song is automatically playing, so we need to pause it
      seq.pause();
      setIsPlaying(false);

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

      setLoadStatus('Ready to play!');
      setIsLoading(false);
      
    } catch (error) {
      console.error('Failed to load soundfont or MIDI:', error);
      setLoadStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  // Cleanup function
  useEffect(() => {
    return () => {
      if (audioLoopIntervalRef.current) {
        clearInterval(audioLoopIntervalRef.current);
      }
      if (voiceTrackingIntervalRef.current) {
        clearInterval(voiceTrackingIntervalRef.current);
      }
    };
  }, []);

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
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">Soundfont Playback</h3>
      
      {isLoading ? (
        <div className="flex items-center space-x-2 text-blue-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{loadStatus}</span>
        </div>
      ) : loadStatus.startsWith('Error:') ? (
        <div className="text-red-400 text-sm">{loadStatus}</div>
      ) : (
        <>
          {soundfontUrl && midiUrl ? (
            <div className="text-sm text-gray-300 space-y-1">
              <div>Soundfont: {soundfontUrl.split('/').pop()}</div>
              <div>MIDI: {midiUrl.split('/').pop()}</div>
            </div>
          ) : (
            <div className="text-yellow-400 text-sm">
              No soundfont or MIDI URL provided
            </div>
          )}
          
          {/* Play/Pause Button */}
          <div>
            <button 
              onClick={togglePlayPause}
              disabled={!seqRef.current}
              className={`
                px-4 py-2 rounded-md text-white font-medium transition-colors
                ${seqRef.current 
                  ? (isPlaying ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600')
                  : 'bg-gray-500 cursor-not-allowed opacity-50'
                }
              `}
            >
              {isPlaying ? (
                <>
                  <Pause size={16} className="inline mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play size={16} className="inline mr-2" />
                  Play
                </>
              )}
            </button>
          </div>
        </>
      )}
      
      <div>
        <h4 className="text-md font-medium text-white mb-2">Voice List</h4>
        <div className="grid grid-cols-4 gap-2 text-xs">
          {voiceList.map((text, index) => (
            <pre key={index} className="bg-gray-800 p-2 rounded text-green-400">{text}</pre>
          ))}
        </div>
      </div>
    </div>
  );
};
