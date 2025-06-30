import React, { useState } from 'react';
import { ArrowLeft, Volume2, Headphones, Piano, Keyboard } from 'lucide-react';
import { ConnectMidi } from '../hooks/useMidiController';
import { useSettingsStore } from '../stores/settingsStore';

interface SettingsMenuProps {
  onCalibrate: () => void;
  onBack: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  onCalibrate,
  onBack,
}) => {
  const [midiLog, setMidiLog] = useState<string[]>([]);
  const [lastNote, setLastNote] = useState<string>('None');
  const [lastVelocity, setLastVelocity] = useState<number>(0);

  // Get values and setters from the store
  const controlType = useSettingsStore(state => state.controlType);
  const audioOffset = useSettingsStore(state => state.audioOffset);
  const setControlType = useSettingsStore(state => state.setControlType);
  const setAudioOffset = useSettingsStore(state => state.setAudioOffset);
  const setSelectedMidiDevice = useSettingsStore(state => state.setSelectedMidiDevice);

  // Helper function to convert MIDI note number to note name
  const getNoteString = (note: number) => {
    const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(note / 12) - 1;
    const noteName = noteNames[note % 12];
    return `${noteName}${octave}`;
  };

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAudioOffset(Number(event.target.value));
  };

  const testOffset = () => {
    // Play a 4-beat test sequence
    const audioContext = new AudioContext();
    const beepFreq = 800;
    const beatInterval = 500; // 120 BPM

    for (let i = 0; i < 4; i++) {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(beepFreq, audioContext.currentTime);
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
      }, i * beatInterval);
    }
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
          <span>Back to Menu</span>
        </button>
        
        <h1 className="text-4xl font-bold text-white text-center flex-1">
          Settings
        </h1>
        
        <div className="w-24"></div>
      </div>

      {/* Settings Content */}
      <div className="max-w-4xl mx-auto space-y-12">
        {/* MIDI Controls Section - Add this before Audio Offset section */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <div className="flex items-center space-x-3 mb-6">
            <Piano className="w-8 h-8 text-purple-400" />
            <h2 className="text-3xl font-bold text-white">Game Controls</h2>
          </div>
          
          <p className="text-white/70 text-lg mb-8">
            Choose how you want to play the game - with your computer keyboard or a MIDI controller.
          </p>

          {/* Control Type Selection */}
          <div className="flex space-x-4 mb-8">
            <button
              onClick={() => setControlType('keyboard')}
              className={`flex-1 flex items-center justify-center space-x-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                controlType === 'keyboard'
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-white/20 bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <Keyboard className="w-6 h-6" />
              <span className="font-semibold">Computer Keyboard</span>
            </button>
            
            <button
              onClick={() => setControlType('midi')}
              className={`flex-1 flex items-center justify-center space-x-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                controlType === 'midi'
                  ? 'border-purple-500 bg-purple-500/20 text-white'
                  : 'border-white/20 bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <Piano className="w-6 h-6" />
              <span className="font-semibold">MIDI Controller</span>
            </button>
          </div>

          {/* MIDI Device Selection */}
          {controlType === 'midi' && (
            <div className="bg-black/30 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">MIDI Device Setup</h3>
              <div className="space-y-4">
                <ConnectMidi
                  instrument={{
                    start: (note) => {
                      console.log('MIDI Note On:', note);
                      const noteStr = getNoteString(note.note);
                      setLastNote(noteStr);
                      setLastVelocity(note.velocity);
                      setMidiLog(prev => [`Note On: ${noteStr} (velocity: ${note.velocity})`, ...prev.slice(0, 9)]);
                    },
                    stop: (note) => {
                      console.log('MIDI Note Off:', note);
                      const noteStr = getNoteString(note.stopId);
                      setMidiLog(prev => [`Note Off: ${noteStr}`, ...prev.slice(0, 9)]);
                    }
                  }}
                  onDeviceSelect={(deviceName) => setSelectedMidiDevice(deviceName)}
                />

                {/* MIDI Input Display */}
                <div className="mt-6 bg-black/40 rounded-lg p-4">
                  <div className="text-white mb-3">
                    <span className="text-white/60">Last Note: </span>
                    <span className="font-mono">{lastNote}</span>
                    <span className="text-white/60 ml-4">Velocity: </span>
                    <span className="font-mono">{lastVelocity}</span>
                  </div>
                  <div className="font-mono text-sm text-green-400 bg-black/60 p-3 rounded h-32 overflow-y-auto">
                    {midiLog.map((log, index) => (
                      <div key={index} className="mb-1">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-white/60 text-sm mt-4">
                  <p>• Make sure your MIDI device is connected before selecting it</p>
                  <p>• The game will automatically map MIDI notes to the correct pitches</p>
                  <p>• You can still use your keyboard even with MIDI enabled</p>
                </div>
              </div>
            </div>
          )}

          {/* Keyboard Controls Reference */}
          {controlType === 'keyboard' && (
            <div className="bg-black/30 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Keyboard Controls</h3>
              <div className="grid grid-cols-2 gap-4 text-white/70">
                <div>
                  <p className="font-semibold text-white mb-2">White Keys</p>
                  <p>Z, X, C, V, B, N, M</p>
                </div>
                <div>
                  <p className="font-semibold text-white mb-2">Black Keys</p>
                  <p>S, D, F, G, H</p>
                </div>
                <div>
                  <p className="font-semibold text-white mb-2">Upper Octave</p>
                  <p>Q, W, E, R, T, Y, U</p>
                </div>
                <div>
                  <p className="font-semibold text-white mb-2">Game Controls</p>
                  <p>Space - Start/Pause, Esc - Menu</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audio Offset Calibration */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <div className="flex items-center space-x-3 mb-6">
            <Headphones className="w-8 h-8 text-blue-400" />
            <h2 className="text-3xl font-bold text-white">Audio Offset Calibration</h2>
          </div>
          
          <p className="text-white/70 text-lg mb-8">
            Adjust your audio offset to compensate for system latency and ensure perfect timing.
          </p>

          {/* Current Offset Display */}
          <div className="text-center mb-8">
            <div className="text-6xl font-mono font-bold text-white mb-2">
              {audioOffset > 0 ? '+' : ''}{audioOffset}ms
            </div>
            <div className="text-white/60">Current Audio Offset</div>
          </div>

          {/* Offset Slider */}
          <div className="mb-8">
            <div className="flex justify-between text-white/60 text-sm mb-2">
              <span>-500ms (Earlier)</span>
              <span>+500ms (Later)</span>
            </div>
            <div className="relative">
              <input
                type="range"
                min="-500"
                max="500"
                step="1"
                value={audioOffset}
                onChange={handleSliderChange}
                className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-center mt-4">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center space-x-4 text-white/80">
                    <div className="text-center">
                      <div className="w-3 h-3 bg-blue-400 rounded-full mx-auto mb-1"></div>
                      <div className="text-xs">Perfect</div>
                    </div>
                    <div className="w-px h-8 bg-white/20"></div>
                    <div className="text-center">
                      <div className="w-3 h-3 bg-green-400 rounded-full mx-auto mb-1"></div>
                      <div className="text-xs">Good</div>
                    </div>
                    <div className="w-px h-8 bg-white/20"></div>
                    <div className="text-center">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full mx-auto mb-1"></div>
                      <div className="text-xs">OK</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={onCalibrate}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
            >
              Auto Calibrate
            </button>
            <button
              onClick={testOffset}
              className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 hover:scale-105 shadow-lg"
            >
              Test Offset
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 p-4 bg-black/20 rounded-lg">
            <h3 className="text-white font-semibold mb-2">How to calibrate:</h3>
            <ul className="text-white/70 text-sm space-y-1">
              <li>• Use the Auto Calibrate feature for best results</li>
              <li>• If notes appear late, increase the offset (positive values)</li>
              <li>• If notes appear early, decrease the offset (negative values)</li>
              <li>• Test your settings with the Test Offset button</li>
            </ul>
          </div>
        </div>

        {/* Audio Settings */}
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <div className="flex items-center space-x-3 mb-6">
            <Volume2 className="w-8 h-8 text-green-400" />
            <h2 className="text-3xl font-bold text-white">Audio Settings</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-white font-semibold mb-2">Master Volume</label>
              <input
                type="range"
                min="0"
                max="100"
                defaultValue="70"
                className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            
            <div>
              <label className="block text-white font-semibold mb-2">Music Volume</label>
              <input
                type="range"
                min="0"
                max="100"
                defaultValue="80"
                className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            
            <div>
              <label className="block text-white font-semibold mb-2">Sound Effects Volume</label>
              <input
                type="range"
                min="0"
                max="100"
                defaultValue="90"
                className="w-full h-3 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(45deg, #4CAF50, #45a049);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        
        .slider::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(45deg, #4CAF50, #45a049);
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      `}</style>
    </div>
  );
};