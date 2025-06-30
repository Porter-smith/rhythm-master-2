import { useState, useRef, useCallback } from 'react';
import { ReplayInputEvent } from '../types/game';

export const useReplayRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedEvents, setRecordedEvents] = useState<ReplayInputEvent[]>([]);
  const gameStartTimeRef = useRef<number>(0);

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setRecordedEvents([]);
    gameStartTimeRef.current = performance.now();
    console.log('🎬 Started recording replay');
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    console.log('🎬 Stopped recording replay, events:', recordedEvents.length);
  }, [recordedEvents.length]);

  const recordEvent = useCallback((type: 'keydown' | 'keyup', keyCode: string, pitch: number) => {
    if (!isRecording) return;

    const event: ReplayInputEvent = {
      timestamp: performance.now(),
      type,
      keyCode,
      pitch,
      gameTime: (performance.now() - gameStartTimeRef.current) / 1000
    };

    setRecordedEvents(prev => [...prev, event]);
  }, [isRecording]);

  const clearRecording = useCallback(() => {
    setRecordedEvents([]);
    setIsRecording(false);
  }, []);

  return {
    isRecording,
    recordedEvents,
    startRecording,
    stopRecording,
    recordEvent,
    clearRecording
  };
}; 