import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { AudioEngine } from '../game/AudioEngine';

interface AudioOffsetCalibrationProps {
  onComplete: (offset: number) => void;
  onBack: () => void;
  audioEngine: AudioEngine;
}

interface CalibrationHit {
  beatNumber: number;
  expectedTime: number;
  actualTime: number;
  offset: number;
}

export const AudioOffsetCalibration: React.FC<AudioOffsetCalibrationProps> = ({
  onComplete,
  onBack,
  audioEngine
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationHits, setCalibrationHits] = useState<CalibrationHit[]>([]);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [averageOffset, setAverageOffset] = useState(0);
  const [lastHitInfo, setLastHitInfo] = useState<string>('');
  const [gameTime, setGameTime] = useState(0);
  
  const startTimeRef = useRef<number>(0);
  const metronomeIntervalRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const BPM = 120;
  const CALIBRATION_BEATS = 16;
  const HIT_WINDOW = 200;

  const startCalibration = useCallback(() => {
    setIsCalibrating(true);
    setCalibrationHits([]);
    setCurrentBeat(0);
    setAverageOffset(0);
    setLastHitInfo('');
    startTimeRef.current = performance.now();
    
    // Start metronome for calibration
    const beatDuration = (60 / BPM) * 1000;
    audioEngine.playMetronomeClick(true);
    
    metronomeIntervalRef.current = window.setInterval(() => {
      setCurrentBeat(prev => prev + 1);
      const isAccent = (currentBeat + 1) % 4 === 1;
      audioEngine.playMetronomeClick(isAccent);
    }, beatDuration);

    // Start game loop
    const gameLoop = () => {
      const currentTime = performance.now();
      setGameTime((currentTime - startTimeRef.current) / 1000);
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };
    gameLoop();
  }, [audioEngine, currentBeat]);

  const stopCalibration = useCallback(() => {
    setIsCalibrating(false);
    if (metronomeIntervalRef.current) {
      clearInterval(metronomeIntervalRef.current);
      metronomeIntervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const handleSpacePress = useCallback((event: KeyboardEvent) => {
    if (event.code !== 'Space' || !isCalibrating) return;
    event.preventDefault();

    const inputTime = performance.now();
    const gameTime = (inputTime - startTimeRef.current) / 1000;
    const beatDuration = 60 / BPM;
    
    const currentBeatFloat = gameTime / beatDuration;
    const closestBeat = Math.round(currentBeatFloat);
    const expectedBeatTime = closestBeat * beatDuration;
    const offset = (gameTime - expectedBeatTime) * 1000;
    
    if (Math.abs(offset) <= HIT_WINDOW && closestBeat > 0) {
      const hit: CalibrationHit = {
        beatNumber: closestBeat,
        expectedTime: expectedBeatTime,
        actualTime: gameTime,
        offset: offset
      };
      
      const existingHit = calibrationHits.find(h => h.beatNumber === closestBeat);
      if (!existingHit) {
        const newHits = [...calibrationHits, hit];
        setCalibrationHits(newHits);
        
        const totalOffset = newHits.reduce((sum, h) => sum + h.offset, 0);
        const avgOffset = totalOffset / newHits.length;
        setAverageOffset(avgOffset);
        
        const timing = offset > 0 ? 'LATE' : 'EARLY';
        const offsetText = `${offset > 0 ? '+' : ''}${offset.toFixed(1)}ms`;
        setLastHitInfo(`${timing} ${offsetText}`);
        setTimeout(() => setLastHitInfo(''), 1000);
        
        if (newHits.length >= CALIBRATION_BEATS) {
          stopCalibration();
          setTimeout(() => onComplete(avgOffset), 1000);
        }
      }
    }
  }, [isCalibrating, calibrationHits, onComplete, stopCalibration]);

  useEffect(() => {
    document.addEventListener('keydown', handleSpacePress);
    return () => document.removeEventListener('keydown', handleSpacePress);
  }, [handleSpacePress]);

  useEffect(() => {
    return () => {
      stopCalibration();
    };
  }, [stopCalibration]);

  // Render calibration visualization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    if (!isCalibrating && calibrationHits.length === 0) {
      // Instructions
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Audio Offset Calibration', width / 2, height * 0.3);
      
      ctx.font = '20px Arial';
      ctx.fillText('Listen to the metronome and press SPACEBAR', width / 2, height * 0.45);
      ctx.fillText('on each beat to calibrate your audio offset', width / 2, height * 0.5);
      
      ctx.font = '16px Arial';
      ctx.fillStyle = '#888';
      ctx.fillText('This helps ensure accurate timing in rhythm games', width / 2, height * 0.6);
      return;
    }

    if (isCalibrating) {
      // Title
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Calibrating Audio Offset...', width / 2, 50);
      
      // Progress
      const progress = calibrationHits.length;
      ctx.font = '20px Arial';
      ctx.fillText(`Progress: ${progress}/${CALIBRATION_BEATS}`, width / 2, 90);
      
      // Progress bar
      const barWidth = 300;
      const barHeight = 15;
      const barX = (width - barWidth) / 2;
      const barY = 110;
      
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(barX, barY, barWidth, barHeight);
      
      ctx.fillStyle = '#00ff88';
      const fillWidth = (progress / CALIBRATION_BEATS) * barWidth;
      ctx.fillRect(barX, barY, fillWidth, barHeight);

      // UR Bar
      renderURBar(ctx, width, height, calibrationHits);
      
      // Beat indicator with metronome visualization
      const beatDuration = 60 / BPM;
      const beatProgress = (gameTime % beatDuration) / beatDuration;
      const pulseSize = 25 + (1 - beatProgress) * 15;
      
      ctx.fillStyle = '#ff00ff';
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(width - 80, 80, pulseSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      
      // Metronome label
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Metronome', width - 80, 120);
    } else if (calibrationHits.length > 0) {
      // Results
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 32px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Calibration Complete!', width / 2, height * 0.2);
      
      ctx.font = 'bold 24px Arial';
      const offsetColor = Math.abs(averageOffset) <= 10 ? '#00ff88' :
                         Math.abs(averageOffset) <= 25 ? '#ffaa00' : '#ff6600';
      ctx.fillStyle = offsetColor;
      ctx.fillText(`Your Audio Offset: ${averageOffset > 0 ? '+' : ''}${averageOffset.toFixed(1)}ms`, width / 2, height * 0.3);
      
      renderURBar(ctx, width, height, calibrationHits);
    }
  }, [isCalibrating, calibrationHits, gameTime, averageOffset]);

  const renderURBar = (ctx: CanvasRenderingContext2D, width: number, height: number, hits: CalibrationHit[]) => {
    const barWidth = 400;
    const barHeight = 40;
    const barX = (width - barWidth) / 2;
    const barY = height * 0.4;
    
    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Border
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Center line
    const centerX = barX + barWidth / 2;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(centerX, barY);
    ctx.lineTo(centerX, barY + barHeight);
    ctx.stroke();
    
    // Plot hits
    const maxOffset = 100;
    hits.forEach((hit, index) => {
      const offset = Math.max(-maxOffset, Math.min(maxOffset, hit.offset));
      const x = centerX + (offset / maxOffset) * (barWidth / 2);
      const y = barY + barHeight / 2;
      
      let color = '#ff6600';
      if (Math.abs(hit.offset) <= 25) color = '#00ff88';
      else if (Math.abs(hit.offset) <= 50) color = '#ffaa00';
      
      const alpha = Math.max(0.3, 1 - (hits.length - index - 1) * 0.05);
      
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
      
      if (index === hits.length - 1) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
    
    ctx.globalAlpha = 1;
    
    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Timing Distribution (UR Bar)', width / 2, barY - 15);
  };

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-white/70 hover:text-white transition-colors duration-200 group"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform duration-200" />
          <span>Back to Settings</span>
        </button>
        
        <h1 className="text-4xl font-bold text-white text-center flex-1">
          Audio Calibration
        </h1>
        
        <div className="w-24"></div>
      </div>

      {/* Canvas */}
      <div className="flex justify-center mb-8">
        <div className="relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="border-2 border-white/20 rounded-lg bg-black"
          />
          
          {lastHitInfo && (
            <div className={`absolute top-4 right-4 px-4 py-2 rounded-lg font-mono text-lg font-bold ${
              lastHitInfo.includes('EARLY') 
                ? 'bg-blue-600 bg-opacity-90 text-white' 
                : 'bg-red-600 bg-opacity-90 text-white'
            }`}>
              {lastHitInfo}
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="text-center">
        {!isCalibrating && calibrationHits.length === 0 && (
          <button
            onClick={startCalibration}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 hover:scale-105 shadow-lg"
          >
            Start Calibration
          </button>
        )}
        
        {isCalibrating && (
          <div className="text-white/70 space-y-2">
            <p>Listen to the metronome and press SPACEBAR on each beat</p>
            <p className="text-sm">ESC to cancel</p>
          </div>
        )}
        
        {!isCalibrating && calibrationHits.length > 0 && (
          <div className="space-y-4">
            <p className="text-white/70">Calibration complete! Your offset has been calculated.</p>
            <button
              onClick={() => onComplete(averageOffset)}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white font-bold py-4 px-8 rounded-xl text-xl transition-all duration-300 hover:scale-105 shadow-lg"
            >
              Apply Offset
            </button>
          </div>
        )}
      </div>
    </div>
  );
};