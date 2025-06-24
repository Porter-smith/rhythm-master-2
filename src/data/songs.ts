/**
 * Song database with both custom and MIDI format examples
 */

import { Song, CustomSong, MidiSong } from '../types/music';

// Custom format songs (existing)
export const customSongs: CustomSong[] = [
  {
    id: 'twinkle-custom',
    title: 'Twinkle Twinkle (Custom)',
    artist: 'Traditional',
    duration: '0:30',
    difficulties: ['easy', 'medium', 'hard'],
    bpm: 120,
    format: 'custom',
    notes: {
      easy: [
        { time: 0.5, pitch: 60, duration: 0.5 },  // C
        { time: 1.0, pitch: 60, duration: 0.5 },  // C
        { time: 1.5, pitch: 67, duration: 0.5 },  // G
        { time: 2.0, pitch: 67, duration: 0.5 },  // G
      ],
      medium: [
        { time: 0.5, pitch: 60, duration: 0.5 },  // C
        { time: 1.0, pitch: 60, duration: 0.5 },  // C
        { time: 1.5, pitch: 67, duration: 0.5 },  // G
        { time: 2.0, pitch: 67, duration: 0.5 },  // G
        { time: 2.5, pitch: 69, duration: 0.5 },  // A
        { time: 3.0, pitch: 69, duration: 0.5 },  // A
        { time: 3.5, pitch: 67, duration: 1.0 },  // G
      ],
      hard: [
        { time: 0.5, pitch: 60, duration: 0.5 },  // C
        { time: 1.0, pitch: 60, duration: 0.5 },  // C
        { time: 1.5, pitch: 67, duration: 0.5 },  // G
        { time: 2.0, pitch: 67, duration: 0.5 },  // G
        { time: 2.5, pitch: 69, duration: 0.5 },  // A
        { time: 3.0, pitch: 69, duration: 0.5 },  // A
        { time: 3.5, pitch: 67, duration: 1.0 },  // G
        { time: 4.5, pitch: 65, duration: 0.5 },  // F
        { time: 5.0, pitch: 65, duration: 0.5 },  // F
        { time: 5.5, pitch: 64, duration: 0.5 },  // E
        { time: 6.0, pitch: 64, duration: 0.5 },  // E
        { time: 6.5, pitch: 62, duration: 0.5 },  // D
        { time: 7.0, pitch: 62, duration: 0.5 },  // D
        { time: 7.5, pitch: 60, duration: 1.0 },  // C
      ]
    }
  },
  {
    id: 'mary-custom',
    title: 'Mary Had A Little Lamb',
    artist: 'Traditional',
    duration: '0:25',
    difficulties: ['easy'],
    bpm: 100,
    format: 'custom',
    notes: {
      easy: [
        { time: 0.5, pitch: 64, duration: 0.5 },  // E
        { time: 1.0, pitch: 62, duration: 0.5 },  // D
        { time: 1.5, pitch: 60, duration: 0.5 },  // C
        { time: 2.0, pitch: 62, duration: 0.5 },  // D
      ]
    }
  },
  {
    id: 'scale-custom',
    title: 'Scale Practice',
    artist: 'Exercise',
    duration: '0:40',
    difficulties: ['easy', 'medium', 'hard'],
    bpm: 140,
    format: 'custom',
    notes: {
      easy: [
        { time: 0.5, pitch: 60, duration: 0.5 },  // C
        { time: 1.0, pitch: 62, duration: 0.5 },  // D
        { time: 1.5, pitch: 64, duration: 0.5 },  // E
        { time: 2.0, pitch: 65, duration: 0.5 },  // F
      ],
      medium: [
        { time: 0.25, pitch: 60, duration: 0.25 }, // C
        { time: 0.5, pitch: 62, duration: 0.25 },  // D
        { time: 0.75, pitch: 64, duration: 0.25 }, // E
        { time: 1.0, pitch: 65, duration: 0.25 },  // F
        { time: 1.25, pitch: 67, duration: 0.25 }, // G
        { time: 1.5, pitch: 69, duration: 0.25 },  // A
        { time: 1.75, pitch: 71, duration: 0.25 }, // B
        { time: 2.0, pitch: 72, duration: 0.25 },  // C
      ],
      hard: [
        { time: 0.125, pitch: 60, duration: 0.125 }, // C
        { time: 0.25, pitch: 62, duration: 0.125 },  // D
        { time: 0.375, pitch: 64, duration: 0.125 }, // E
        { time: 0.5, pitch: 65, duration: 0.125 },   // F
        { time: 0.625, pitch: 67, duration: 0.125 }, // G
        { time: 0.75, pitch: 69, duration: 0.125 },  // A
        { time: 0.875, pitch: 71, duration: 0.125 }, // B
        { time: 1.0, pitch: 72, duration: 0.125 },   // C
      ]
    }
  }
];

// MIDI format songs with separate files per difficulty
export const midiSongs: MidiSong[] = [
  {
    id: 'twinkle-midi',
    title: 'Twinkle Twinkle (MIDI)',
    artist: 'Traditional',
    duration: '0:30',
    difficulties: ['easy', 'medium', 'hard'],
    bpm: 120,
    format: 'midi',
    midiFiles: {
      easy: '/midi/twinkle-easy.midi',
      medium: '/midi/twinkle-medium.mid',
      hard: '/midi/twinkle-hard.mid'
    },
    audioFiles: {
      easy: '/audio/twinkle-easy.mp3',
      medium: '/audio/twinkle-medium.mp3',
      hard: '/audio/twinkle-hard.mp3'
    },
    notes: {
      // These will be populated when the MIDI files are loaded
      easy: [],
      medium: [],
      hard: []
    }
  },
  {
    id: 'canon-midi',
    title: 'Canon in D (MIDI)',
    artist: 'Pachelbel',
    duration: '1:45',
    difficulties: ['medium', 'hard'],
    bpm: 90,
    format: 'midi',
    midiFiles: {
      medium: '/midi/canon-medium.mid',
      hard: '/midi/canon-hard.mid'
    },
    audioFiles: {
      medium: '/audio/canon-medium.mp3',
      hard: '/audio/canon-hard.mp3'
    },
    notes: {
      medium: [],
      hard: []
    }
  },
  {
    id: 'fur-elise-midi',
    title: 'Für Elise (MIDI)',
    artist: 'Beethoven',
    duration: '2:30',
    difficulties: ['easy', 'medium', 'hard'],
    bpm: 120,
    format: 'midi',
    midiFiles: {
      easy: '/midi/fur-elise-easy.mid',
      medium: '/midi/fur-elise-medium.mid',
      hard: '/midi/fur-elise-hard.mid'
    },
    notes: {
      easy: [],
      medium: [],
      hard: []
    }
  },
  {
    id: 'dooms-gate-midi',
    title: 'Doom\'s Gate (MIDI)',
    artist: 'Traditional',
    duration: '1:15',
    difficulties: ['easy'],
    bpm: 140,
    format: 'midi',
    midiFiles: {
      easy: '/midi/dooms-gate-easy.mid'
    },
    audioFiles: {
      easy: '/audio/dooms-gate-easy.mp3'
    },
    notes: {
      easy: []
    }
  }
];

// Combined song list
export const allSongs: Song[] = [...customSongs, ...midiSongs];

// Helper functions
export function getSongById(id: string): Song | undefined {
  return allSongs.find(song => song.id === id);
}

export function getSongsByFormat(format: 'custom' | 'midi'): Song[] {
  return allSongs.filter(song => song.format === format);
}

export function getCustomSongs(): CustomSong[] {
  return customSongs;
}

export function getMidiSongs(): MidiSong[] {
  return midiSongs;
}