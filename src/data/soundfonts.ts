/**
 * Centralized sound font configuration
 * All available sound fonts for the rhythm game
 */

export interface SoundFont {
  id: string;
  name: string;
  url: string;
  description: string;
  category: 'piano' | 'organ' | 'synth' | 'gaming' | 'orchestral';
  tags: string[];
}

// Available soundfonts - centralized storage
export const SOUNDFONTS: Record<string, SoundFont> = {
  'piano-yamaha': {
    id: 'piano-yamaha',
    name: 'Yamaha Grand Piano',
    url: 'https://smpldsnds.github.io/soundfonts/soundfonts/yamaha-grand-lite.sf2',
    description: 'Professional Yamaha grand piano samples',
    category: 'piano',
    tags: ['piano', 'grand', 'acoustic', 'classical']
  },
  'piano-electric': {
    id: 'piano-electric',
    name: 'Galaxy Electric Piano',
    url: 'https://smpldsnds.github.io/soundfonts/soundfonts/galaxy-electric-pianos.sf2',
    description: 'Electric piano collection with Rhodes and Wurlitzer sounds',
    category: 'piano',
    tags: ['electric', 'rhodes', 'wurlitzer', 'jazz']
  },
  'organ-giga': {
    id: 'organ-giga',
    name: 'Giga HQ FM Organ',
    url: 'https://smpldsnds.github.io/soundfonts/soundfonts/giga-hq-fm-gm.sf2',
    description: 'High-quality FM organ and general MIDI sounds',
    category: 'organ',
    tags: ['organ', 'fm', 'church', 'general-midi']
  },
  'synth-supersaw': {
    id: 'synth-supersaw',
    name: 'Supersaw Collection',
    url: 'https://smpldsnds.github.io/soundfonts/soundfonts/supersaw-collection.sf2',
    description: 'Modern supersaw synthesizer sounds',
    category: 'synth',
    tags: ['synth', 'supersaw', 'electronic', 'modern']
  },
  'gaming-gzdoom': {
    id: 'gaming-gzdoom',
    name: 'GZDoom SoundFont',
    url: '/soundfonts/gzdoom.sf2',
    description: 'Classic Doom-style gaming sound font',
    category: 'gaming',
    tags: ['gaming', 'doom', 'retro', '8-bit', 'classic']
  }
};

// Legacy mapping for backward compatibility
export const LEGACY_SOUNDFONTS = {
  'Piano': SOUNDFONTS['piano-yamaha'].url,
  'Electric Piano': SOUNDFONTS['piano-electric'].url,
  'Organ': SOUNDFONTS['organ-giga'].url,
  'Supersaw': SOUNDFONTS['synth-supersaw'].url,
  'GZDoom': SOUNDFONTS['gaming-gzdoom'].url,
};

// Helper functions
export function getSoundFontById(id: string): SoundFont | undefined {
  return SOUNDFONTS[id];
}

export function getSoundFontsByCategory(category: SoundFont['category']): SoundFont[] {
  return Object.values(SOUNDFONTS).filter(sf => sf.category === category);
}

export function getSoundFontsByTag(tag: string): SoundFont[] {
  return Object.values(SOUNDFONTS).filter(sf => sf.tags.includes(tag));
}

export function getAllSoundFonts(): SoundFont[] {
  return Object.values(SOUNDFONTS);
}

export function getSoundFontUrl(id: string): string | undefined {
  return SOUNDFONTS[id]?.url;
}

// Get sound font for a song - uses song's soundFont if available, otherwise returns default
export function getSoundFontForSong(song: { soundFont?: string }): SoundFont {
  if (song.soundFont) {
    // Try to find by URL first
    const soundFontByUrl = Object.values(SOUNDFONTS).find(sf => sf.url === song.soundFont);
    if (soundFontByUrl) {
      return soundFontByUrl;
    }
    
    // If not found by URL, check if it's a GZDoom sound font
    if (song.soundFont.includes('gzdoom')) {
      return SOUNDFONTS['gaming-gzdoom'];
    }
    
    // Return a custom sound font object
    return {
      id: 'custom',
      name: 'Custom SoundFont',
      url: song.soundFont,
      description: 'Custom sound font specified by song',
      category: 'gaming',
      tags: ['custom']
    };
  }
  
  // Default to Yamaha piano
  return SOUNDFONTS['piano-yamaha'];
} 