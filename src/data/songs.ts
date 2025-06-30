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
    overallDifficulty: 3, // Beginner-friendly timing windows
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
    overallDifficulty: 2, // Very beginner-friendly
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
    bpm: 120,
    format: 'custom',
    soundFont: 'https://smpldsnds.github.io/soundfonts/soundfonts/yamaha-grand-lite.sf2',
    overallDifficulty: 4,
    notes: {
      easy: [
        { time: 4, pitch: 60, duration: 4 },   // C4, measure 2
        { time: 8, pitch: 62, duration: 4 },   // D4, measure 3
        { time: 12, pitch: 64, duration: 4 },  // E4, measure 4
        { time: 16, pitch: 65, duration: 4 },  // F4, measure 5
        { time: 20, pitch: 67, duration: 4 },  // G4, measure 6
        { time: 24, pitch: 69, duration: 4 },  // A4, measure 7
        { time: 28, pitch: 71, duration: 4 },  // B4, measure 8
        { time: 32, pitch: 72, duration: 4 },  // C5, measure 9
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
    "id": "backstreet-boys-i-want-it-that-way-midi",
    "title": "I Want It That Way",
    "artist": "Backstreet Boys",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/Backstreet Boys - I Want It That Way.mid"
    },
    "audioFiles": {
      "easy": "/audio/backstreet-boys-i-want-it-that-way-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "seven-nation-army-midi",
    "title": "seven-nation-army",
    "artist": "Unknown",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/seven-nation-army.mid"
    },
    "audioFiles": {
      "easy": "/audio/seven-nation-army-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "wii-channels-mii-channel-midi",
    "title": "Mii Channel",
    "artist": "Nintendo",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/Wii Channels - Mii Channel.mid"
    },
    "audioFiles": {
      "easy": "/audio/wii-channels-mii-channel-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "super-smash-bros-brawl-main-theme-midi",
    "title": "Super Smash Bros Brawl - Main Theme",
    "artist": "Nintendo",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/Super Smash Bros Brawl - Main Theme.mid"
    },
    "audioFiles": {
      "easy": "/audio/super-smash-bros-brawl-main-theme-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "116bpm-beach-town-flute1-midi",
    "title": "Beach Town Flute",
    "artist": "Traditional",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/116BPM_Beach_Town_Flute1.mid"
    },
    "audioFiles": {
      "easy": "/audio/116bpm-beach-town-flute1-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "beethoven-moonlight-sonata-midi",
    "title": "Moonlight Sonata",
    "artist": "Beethoven",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/Beethoven-Moonlight-Sonata.mid"
    },
    "audioFiles": {
      "easy": "/audio/beethoven-moonlight-sonata-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "metallica-nothing-else-matters-midi",
    "title": "Nothing Else Matters",
    "artist": "Metallica",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/Metallica - Nothing Else Matters.mid"
    },
    "audioFiles": {
      "easy": "/audio/metallica-nothing-else-matters-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "110bpm-desertcanyon-swamvn-midi",
    "title": "Desert Canyon",
    "artist": "Traditional",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/110BPM_DesertCanyon_SwamVn.mid"
    },
    "audioFiles": {
      "easy": "/audio/110bpm-desertcanyon-swamvn-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "sonata-no-14-op-27-moonlight-sonata-midi",
    "title": "Moonlight Sonata",
    "artist": "Beethoven",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/Sonata No.14 Op 27 Moonlight Sonata.mid"
    },
    "audioFiles": {
      "easy": "/audio/sonata-no-14-op-27-moonlight-sonata-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "116bpm-beach-town-violin1-midi",
    "title": "Beach Town Violin",
    "artist": "Traditional",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/116BPM_Beach_Town_Violin1.mid"
    },
    "audioFiles": {
      "easy": "/audio/116bpm-beach-town-violin1-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "michael-jackson-billie-jean-midi",
    "title": "Billie Jean",
    "artist": "Michael Jackson",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/Michael Jackson - Billie Jean.mid"
    },
    "audioFiles": {
      "easy": "/audio/michael-jackson-billie-jean-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "metallica-master-of-puppets-midi",
    "title": "Master of Puppets",
    "artist": "Metallica",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/Metallica - Master Of Puppets.mid"
    },
    "audioFiles": {
      "easy": "/audio/metallica-master-of-puppets-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "spearsofjustice-easy-midi",
    "title": "Spear of Justice",
    "artist": "Undertale",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/spearsofjustice-easy.mid"
    },
    "audioFiles": {
      "easy": "/audio/spearsofjustice-easy-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "wii-theme-midi",
    "title": "Wii Theme",
    "artist": "Nintendo",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/wii-theme.mid"
    },
    "audioFiles": {
      "easy": "/audio/wii-theme-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "the-final-countdown-midi",
    "title": "The-Final-Countdown",
    "artist": "Unknown",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/The-Final-Countdown.mid"
    },
    "audioFiles": {
      "easy": "/audio/the-final-countdown-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "in-the-hall-of-the-mountain-king-midi",
    "title": "In the Hall of the Mountain King",
    "artist": "Grieg",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/In the hall of the Mountain King.mid"
    },
    "audioFiles": {
      "easy": "/audio/in-the-hall-of-the-mountain-king-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "test-drive-easy-midi",
    "title": "Test Drive",
    "artist": "Test",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/test-drive-easy.mid"
    },
    "audioFiles": {
      "easy": "/audio/test-drive-easy-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "my-heart-will-go-on-from-titanic-midi",
    "title": "My Heart Will Go On",
    "artist": "Celine Dion",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/My-Heart-Will-Go-On-(From-'Titanic').mid"
    },
    "audioFiles": {
      "easy": "/audio/my-heart-will-go-on-from-titanic-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "owl-city-fireflies-midi",
    "title": "Fireflies",
    "artist": "Owl City",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/Owl City - Fireflies.mid"
    },
    "audioFiles": {
      "easy": "/audio/owl-city-fireflies-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "debussy-clair-de-lune-midi",
    "title": "Clair de Lune",
    "artist": "Debussy",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/debussy-clair-de-lune.mid"
    },
    "audioFiles": {
      "easy": "/audio/debussy-clair-de-lune-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "pokemon-redblueyellow-wild-pokemon-battle-midi",
    "title": "Wild Pokemon Battle",
    "artist": "Pokemon",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/Pokemon RedBlueYellow - Wild Pokemon Battle.mid"
    },
    "audioFiles": {
      "easy": "/audio/pokemon-redblueyellow-wild-pokemon-battle-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "nirvana-smells-like-teen-spirit-midi",
    "title": "Smells Like Teen Spirit",
    "artist": "Nirvana",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/Nirvana - Smells Like Teen Spirit.mid"
    },
    "audioFiles": {
      "easy": "/audio/nirvana-smells-like-teen-spirit-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "toto-africa-midi",
    "title": "Africa",
    "artist": "Toto",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/toto-africa.mid"
    },
    "audioFiles": {
      "easy": "/audio/toto-africa-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "smash-mouth-all-star-midi",
    "title": "All Star",
    "artist": "Smash Mouth",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/SMASH MOUTH.All star.mid"
    },
    "audioFiles": {
      "easy": "/audio/smash-mouth-all-star-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "dooms-gate-easy-midi",
    "title": "Doom's Gate",
    "artist": "Doom",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/dooms-gate-easy.mid"
    },
    "audioFiles": {
      "easy": "/audio/dooms-gate-easy-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  },
  {
    "id": "twinkle-easyi-midi",
    "title": "Twinkle Twinkle Little Star",
    "artist": "Traditional",
    "duration": "0:30",
    "difficulties": [
      "easy"
    ],
    "bpm": 120,
    "format": "midi",
    "overallDifficulty": 5,
    "soundFont": "https://porter-smith.github.io/rhythm-master-files/soundfonts/gzdoom.sf2",
    "midiFiles": {
      "easy": "https://porter-smith.github.io/rhythm-master-files/midi/twinkle-easy.midi"
    },
    "audioFiles": {
      "easy": "/audio/twinkle-easyi-easy.mp3"
    },
    "notes": {
      "easy": []
    }
  }
]
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