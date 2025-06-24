# Dual-Format Music Player

A React-based music player that supports both custom notation and MIDI file formats with automatic fallback mechanisms.

## Features

### Dual Format Support
- **Custom Notation**: Simple JSON-based note format for easy song creation
- **MIDI Files**: Full MIDI file parsing and playback support
- **Automatic Fallback**: Gracefully falls back to custom notation if MIDI fails

### Music Player Capabilities
- Real-time audio synthesis using Tone.js
- Multiple difficulty levels per song
- Configurable audio latency compensation
- Progress tracking and playback controls
- Error handling with user-friendly messages

### Technical Implementation
- **MIDI Parser**: Custom MIDI file parser with support for:
  - Note on/off events
  - Tempo changes
  - Time signatures
  - Multiple tracks
- **Audio Engine**: Web Audio API integration via Tone.js
- **Fallback System**: Automatic generation of custom notation when MIDI fails

## Usage

### Basic Playback
```typescript
import { MusicPlayer } from './music/MusicPlayer';

const player = MusicPlayer.getInstance();
await player.initialize();

// Load a song (supports both formats)
await player.loadSong(song);

// Play with specific difficulty
await player.play('easy');
```

### Configuration
```typescript
const config = {
  preferredFormat: 'auto', // 'custom' | 'midi' | 'auto'
  enableMidiFallback: true,
  audioLatencyCompensation: 0,
  midiSynthEnabled: true
};

player.updateConfig(config);
```

## Song Formats

### Custom Notation
```typescript
{
  id: 'song-id',
  title: 'Song Title',
  format: 'custom',
  notes: {
    easy: [
      { time: 0.5, pitch: 60, duration: 0.5 }, // C4 at 0.5s for 0.5s
      { time: 1.0, pitch: 67, duration: 0.5 }  // G4 at 1.0s for 0.5s
    ]
  }
}
```

### MIDI Format
```typescript
{
  id: 'song-id',
  title: 'Song Title',
  format: 'midi',
  midiFile: '/path/to/file.mid',
  audioFile: '/path/to/audio.mp3', // Optional
  notes: {
    // Populated automatically from MIDI file
  }
}
```

## Error Handling

The system includes comprehensive error handling:

- **MIDI Parse Errors**: Falls back to custom notation
- **File Not Found**: Provides clear error messages
- **Audio Context Issues**: Graceful degradation
- **Sync Problems**: Automatic compensation

## Implementation Details

### MIDI File Processing
1. **Parse**: Convert binary MIDI to structured data
2. **Filter**: Extract relevant notes for each difficulty
3. **Normalize**: Adjust pitch ranges for gameplay
4. **Schedule**: Queue notes for real-time playback

### Fallback Mechanism
When MIDI loading fails:
1. Generate equivalent custom notation
2. Maintain same song structure
3. Preserve difficulty levels
4. Show user-friendly warning

### Audio Synchronization
- Configurable latency compensation
- Real-time progress tracking
- Precise note scheduling
- Cross-browser compatibility

## Browser Compatibility

- Chrome 66+
- Firefox 60+
- Safari 11.1+
- Edge 79+

Requires Web Audio API support for full functionality.

## Development

### Adding New Songs

#### Custom Format
Add to `src/data/songs.ts`:
```typescript
{
  id: 'new-song',
  title: 'New Song',
  format: 'custom',
  notes: { /* note data */ }
}
```

#### MIDI Format
1. Place MIDI file in `public/midi/`
2. Add song definition:
```typescript
{
  id: 'new-song-midi',
  title: 'New Song (MIDI)',
  format: 'midi',
  midiFile: '/midi/newsong.mid'
}
```

### Testing Fallback
To test the fallback mechanism:
1. Create a MIDI song with invalid file path
2. Enable `enableMidiFallback` in config
3. Observe automatic fallback to custom notation

## Architecture

```
src/
├── music/
│   ├── MusicPlayer.ts      # Main player class
│   └── MidiParser.ts       # MIDI file parser
├── types/
│   └── music.ts           # Type definitions
├── data/
│   └── songs.ts           # Song database
└── components/
    └── MusicPlayerDemo.tsx # Demo interface
```

## Future Enhancements

- [ ] Audio file synchronization with MIDI
- [ ] Advanced MIDI event handling
- [ ] Custom MIDI mapping
- [ ] Real-time MIDI input
- [ ] Song editor interface
- [ ] Export/import functionality