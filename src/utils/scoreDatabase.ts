import { GameScore, GameReplay, StoredScore, ReplayInputEvent } from '../types/game';

class ScoreDatabase {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'RhythmMasterDB';
  private readonly DB_VERSION = 1;

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('❌ Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create scores store
        if (!db.objectStoreNames.contains('scores')) {
          const scoresStore = db.createObjectStore('scores', { keyPath: 'id' });
          scoresStore.createIndex('songId', 'songId', { unique: false });
          scoresStore.createIndex('timestamp', 'timestamp', { unique: false });
          scoresStore.createIndex('difficulty', 'difficulty', { unique: false });
          console.log('📊 Created scores store');
        }

        // Create replays store
        if (!db.objectStoreNames.contains('replays')) {
          const replaysStore = db.createObjectStore('replays', { keyPath: 'id' });
          replaysStore.createIndex('songId', 'songId', { unique: false });
          replaysStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('🎬 Created replays store');
        }
      };
    });
  }

  async saveScore(score: GameScore, songId: string, songTitle: string, songArtist: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<string> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const scoreId = `score_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const storedScore: StoredScore = {
      id: scoreId,
      songId,
      songTitle,
      songArtist,
      difficulty,
      timestamp: Date.now(),
      score,
      isReplayAvailable: false // Will be set to true when replay is saved
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['scores'], 'readwrite');
      const store = transaction.objectStore('scores');
      const request = store.add(storedScore);

      request.onsuccess = () => {
        console.log('💾 Score saved:', scoreId);
        resolve(scoreId);
      };

      request.onerror = () => {
        console.error('❌ Failed to save score:', request.error);
        reject(request.error);
      };
    });
  }

  async saveReplay(
    scoreId: string,
    songId: string,
    songTitle: string,
    songArtist: string,
    difficulty: 'easy' | 'medium' | 'hard',
    score: GameScore,
    inputEvents: ReplayInputEvent[],
    gameSettings: {
      audioOffset: number;
      selectedInstrument?: {
        channel: number;
        instrument: number;
        name: string;
      };
    }
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    const replay: GameReplay = {
      id: scoreId, // Use same ID as score
      songId,
      songTitle,
      songArtist,
      difficulty,
      timestamp: Date.now(),
      score,
      inputEvents,
      gameSettings
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['replays', 'scores'], 'readwrite');
      
      // Save replay
      const replayStore = transaction.objectStore('replays');
      replayStore.add(replay);

      // Update score to mark replay as available
      const scoreStore = transaction.objectStore('scores');
      const scoreRequest = scoreStore.get(scoreId);

      scoreRequest.onsuccess = () => {
        const storedScore = scoreRequest.result as StoredScore;
        storedScore.isReplayAvailable = true;
        scoreStore.put(storedScore);
      };

      transaction.oncomplete = () => {
        console.log('🎬 Replay saved:', scoreId);
        resolve();
      };

      transaction.onerror = () => {
        console.error('❌ Failed to save replay:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  async getScores(songId?: string, limit: number = 50): Promise<StoredScore[]> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['scores'], 'readonly');
      const store = transaction.objectStore('scores');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'prev'); // Get most recent first

      const scores: StoredScore[] = [];
      const seenSongs = new Set<string>(); // Track unique song-difficulty combinations
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor && count < limit) {
          const score = cursor.value as StoredScore;
          if (!songId || score.songId === songId) {
            // Create unique key for song-difficulty combination
            const uniqueKey = `${score.songId}-${score.difficulty}`;
            
            // Only add if we haven't seen this song-difficulty combination yet
            if (!seenSongs.has(uniqueKey)) {
              seenSongs.add(uniqueKey);
              scores.push(score);
              count++;
            }
          }
          cursor.continue();
        } else {
          resolve(scores);
        }
      };

      request.onerror = () => {
        console.error('❌ Failed to get scores:', request.error);
        reject(request.error);
      };
    });
  }

  async getReplay(scoreId: string): Promise<GameReplay | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['replays'], 'readonly');
      const store = transaction.objectStore('replays');
      const request = store.get(scoreId);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('❌ Failed to get replay:', request.error);
        reject(request.error);
      };
    });
  }

  async deleteScore(scoreId: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['scores', 'replays'], 'readwrite');
      
      // Delete score
      const scoreStore = transaction.objectStore('scores');
      scoreStore.delete(scoreId);

      // Delete replay if it exists
      const replayStore = transaction.objectStore('replays');
      replayStore.delete(scoreId);

      transaction.oncomplete = () => {
        console.log('🗑️ Score and replay deleted:', scoreId);
        resolve();
      };

      transaction.onerror = () => {
        console.error('❌ Failed to delete score:', transaction.error);
        reject(transaction.error);
      };
    });
  }

  async getBestScore(songId: string, difficulty: 'easy' | 'medium' | 'hard'): Promise<StoredScore | null> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['scores'], 'readonly');
      const store = transaction.objectStore('scores');
      const songIndex = store.index('songId');
      const request = songIndex.getAll(songId);

      request.onsuccess = () => {
        const scores = request.result as StoredScore[];
        const filteredScores = scores.filter(s => s.difficulty === difficulty);
        
        if (filteredScores.length === 0) {
          resolve(null);
          return;
        }

        // Find best score (highest score, then highest accuracy)
        const bestScore = filteredScores.reduce((best, current) => {
          if (current.score.score > best.score.score) return current;
          if (current.score.score < best.score.score) return best;
          return current.score.accuracy > best.score.accuracy ? current : best;
        });

        resolve(bestScore);
      };

      request.onerror = () => {
        console.error('❌ Failed to get best score:', request.error);
        reject(request.error);
      };
    });
  }

  async getStats(): Promise<{
    totalScores: number;
    totalReplays: number;
    averageAccuracy: number;
    bestScore: number;
  }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['scores'], 'readonly');
      const store = transaction.objectStore('scores');
      const request = store.getAll();

      request.onsuccess = () => {
        const scores = request.result as StoredScore[];
        const replays = scores.filter(s => s.isReplayAvailable);

        const totalScores = scores.length;
        const totalReplays = replays.length;
        const averageAccuracy = scores.length > 0 
          ? scores.reduce((sum, s) => sum + s.score.accuracy, 0) / scores.length 
          : 0;
        const bestScore = scores.length > 0 
          ? Math.max(...scores.map(s => s.score.score))
          : 0;

        resolve({
          totalScores,
          totalReplays,
          averageAccuracy,
          bestScore
        });
      };

      request.onerror = () => {
        console.error('❌ Failed to get stats:', request.error);
        reject(request.error);
      };
    });
  }
}

// Export singleton instance
export const scoreDatabase = new ScoreDatabase(); 