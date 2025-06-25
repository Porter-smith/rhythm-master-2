import React from 'react'
import { MidiTestUI } from './MidiTestUI'
import { MidiParserDebug } from './MidiParserDebug'
import { Song } from '../types/music'

interface SmplrMusicPlayerProps {
  song?: Song;
  onBack?: () => void;
}

export const SmplrMusicPlayer: React.FC<SmplrMusicPlayerProps> = ({ song, onBack }) => {
  // If we have a song with soundFont, use MidiParserDebug
  if (song?.soundFont) {
    return (
      <MidiParserDebug 
        onBack={onBack || (() => {})} 
        song={song}
      />
    );
  }
  
  // Otherwise use the general MidiTestUI
  return <MidiTestUI />
}
