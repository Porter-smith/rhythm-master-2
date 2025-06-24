export class InputHandler {
  private keyStates: Map<string, boolean> = new Map();
  private callbacks: Map<string, Array<(timestamp: number) => void>> = new Map();
  private isListening = false;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  startListening(): void {
    if (this.isListening) return;
    
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    this.isListening = true;
  }

  stopListening(): void {
    if (!this.isListening) return;
    
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.isListening = false;
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (event.repeat) return; // Ignore key repeat
    
    const key = event.code;
    const wasPressed = this.keyStates.get(key) || false;
    
    if (!wasPressed) {
      this.keyStates.set(key, true);
      const timestamp = performance.now();
      
      const callbacks = this.callbacks.get(key);
      if (callbacks) {
        callbacks.forEach(callback => callback(timestamp));
      }
    }
    
    // Prevent default for spacebar to avoid page scrolling
    if (key === 'Space') {
      event.preventDefault();
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    const key = event.code;
    this.keyStates.set(key, false);
  }

  onKeyPress(key: string, callback: (timestamp: number) => void): void {
    if (!this.callbacks.has(key)) {
      this.callbacks.set(key, []);
    }
    this.callbacks.get(key)!.push(callback);
  }

  removeKeyPress(key: string, callback: (timestamp: number) => void): void {
    const callbacks = this.callbacks.get(key);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  isKeyPressed(key: string): boolean {
    return this.keyStates.get(key) || false;
  }

  destroy(): void {
    this.stopListening();
    this.keyStates.clear();
    this.callbacks.clear();
  }
}