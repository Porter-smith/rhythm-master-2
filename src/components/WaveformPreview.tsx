import React, { useEffect, useRef } from 'react';
import { Song } from '../types/game';

interface WaveformPreviewProps {
  song: Song;
}

export const WaveformPreview: React.FC<WaveformPreviewProps> = ({ song }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(0, 0, width, height);

    // Generate waveform based on song notes
    const notes = song.notes.easy || [];
    const maxTime = Math.max(...notes.map(note => note.time + note.duration), 4);
    
    ctx.strokeStyle = '#4CAF50';
    ctx.lineWidth = 2;
    ctx.beginPath();

    // Create a simple waveform visualization
    for (let x = 0; x < width; x++) {
      const time = (x / width) * maxTime;
      let amplitude = 0;

      // Find notes that are playing at this time
      notes.forEach(note => {
        if (time >= note.time && time <= note.time + note.duration) {
          const noteProgress = (time - note.time) / note.duration;
          const envelope = Math.sin(noteProgress * Math.PI); // Simple envelope
          amplitude += envelope * (note.pitch / 127) * 0.8;
        }
      });

      // Add some noise for visual interest
      amplitude += (Math.random() - 0.5) * 0.1;
      
      const y = height / 2 + amplitude * height * 0.4;
      
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Add glow effect
    ctx.shadowColor = '#4CAF50';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

  }, [song]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={64}
      className="w-full h-full"
    />
  );
};