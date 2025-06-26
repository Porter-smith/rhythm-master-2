import React from 'react';

interface Note {
  time: number;
  pitch: number;
  duration: number;
  channel?: number;
}

interface SongNotePreviewProps {
  notes: Note[];
  highlightChannel?: number | null;
  width?: number;
  height?: number;
}

export const SongNotePreview: React.FC<SongNotePreviewProps> = ({
  notes,
  highlightChannel = null,
  width = 320,
  height = 64,
}) => {
  if (!notes || notes.length === 0) {
    return <div className="text-white/50 text-xs">No notes</div>;
  }

  // Find min/max for scaling
  const minTime = Math.min(...notes.map(n => n.time));
  const maxTime = Math.max(...notes.map(n => n.time + n.duration));
  const minPitch = Math.min(...notes.map(n => n.pitch));
  const maxPitch = Math.max(...notes.map(n => n.pitch));

  // Pad pitch range for better visuals
  const pitchPad = 2;
  const pitchRange = [minPitch - pitchPad, maxPitch + pitchPad];

  // Scale functions
  const x = (t: number) => ((t - minTime) / (maxTime - minTime || 1)) * width;
  const y = (p: number) => height - ((p - pitchRange[0]) / (pitchRange[1] - pitchRange[0] || 1)) * height;

  return (
    <svg width={width} height={height} className="bg-black/30 rounded" style={{ display: 'block' }}>
      {/* Draw notes */}
      {notes.map((note, i) => {
        const isHighlight = highlightChannel === null || note.channel === highlightChannel;
        return (
          <rect
            key={i}
            x={x(note.time)}
            y={y(note.pitch)}
            width={Math.max(2, x(note.time + note.duration) - x(note.time))}
            height={Math.max(2, height / (pitchRange[1] - pitchRange[0] + 1))}
            fill={isHighlight ? '#4ade80' : '#64748b'}
            opacity={isHighlight ? 0.9 : 0.3}
            rx={2}
          />
        );
      })}
    </svg>
  );
};