// Global audio context singleton to prevent recreation and closure issues
let context: AudioContext | undefined;

export function getAudioContext(): AudioContext {
  // Use nullish coalescing to create context only if it doesn't exist
  context ??= new (window.AudioContext || (window as any).webkitAudioContext)();
  return context;
}

export function resumeAudioContext(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') {
    return ctx.resume();
  }
  return Promise.resolve();
}

export function closeAudioContext(): void {
  if (context && context.state !== 'closed') {
    context.close();
    context = undefined;
  }
}

export function getAudioContextState(): AudioContextState | undefined {
  return context?.state;
}