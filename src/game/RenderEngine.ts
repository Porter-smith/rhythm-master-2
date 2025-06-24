import { GameState } from './types';
import { GAME_CONFIG } from './constants';

export class RenderEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private recentHits: Array<{ offset: number; timestamp: number }> = [];
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    
    // Get actual canvas dimensions
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;
    
    // Set up canvas resolution
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    // Update dimensions after scaling
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
  }

  render(gameState: GameState): void {
    this.clear();
    
    if (gameState.isCalibrating) {
      this.renderCalibration(gameState);
    } else if (gameState.calibrationHits.length > 0) {
      this.renderCalibrationResults(gameState);
    }
  }

  renderInstructions(): void {
    this.clear();
    
    this.ctx.fillStyle = GAME_CONFIG.colors.text;
    this.ctx.font = 'bold 32px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    let y = this.canvasHeight * 0.33;
    this.ctx.fillText('Audio Offset Calibration', this.canvasWidth / 2, y);
    
    this.ctx.font = '20px Arial';
    y += 60;
    this.ctx.fillText('Listen to the metronome and press SPACEBAR', this.canvasWidth / 2, y);
    y += 30;
    this.ctx.fillText('on each beat to calibrate your audio offset', this.canvasWidth / 2, y);
    
    y += 60;
    this.ctx.font = '16px Arial';
    this.ctx.fillStyle = '#888';
    this.ctx.fillText('This helps ensure accurate timing in rhythm games', this.canvasWidth / 2, y);
    y += 25;
    this.ctx.fillText(`You need to hit ${GAME_CONFIG.calibrationBeats} beats`, this.canvasWidth / 2, y);
  }

  addHit(offset: number): void {
    this.recentHits.push({ offset, timestamp: performance.now() });
    // Keep only recent hits (last 5 seconds)
    const cutoff = performance.now() - 5000;
    this.recentHits = this.recentHits.filter(hit => hit.timestamp > cutoff);
  }

  private renderCalibration(gameState: GameState): void {
    const { calibrationHits, gameTime } = gameState;
    
    // Title
    this.ctx.fillStyle = GAME_CONFIG.colors.text;
    this.ctx.font = 'bold 28px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'top';
    this.ctx.fillText('Calibrating Audio Offset...', this.canvasWidth / 2, 30);
    
    // Instructions
    this.ctx.font = '18px Arial';
    this.ctx.fillText('Press SPACEBAR on each metronome beat', this.canvasWidth / 2, 70);
    
    // Progress
    const progress = calibrationHits.length;
    const total = GAME_CONFIG.calibrationBeats;
    
    this.ctx.font = '20px Arial';
    this.ctx.fillText(`Progress: ${progress}/${total}`, this.canvasWidth / 2, 110);
    
    // Progress bar
    const barWidth = Math.min(300, this.canvasWidth * 0.6);
    const barHeight = 15;
    const barX = (this.canvasWidth - barWidth) / 2;
    const barY = 140;
    
    this.ctx.strokeStyle = GAME_CONFIG.colors.text;
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    this.ctx.fillStyle = GAME_CONFIG.colors.perfect;
    const fillWidth = (progress / total) * barWidth;
    this.ctx.fillRect(barX, barY, fillWidth, barHeight);
    
    // UR Bar (Unstable Rate / Timing Bar)
    this.renderURBar(calibrationHits);
    
    // Current average offset
    if (calibrationHits.length > 0) {
      this.ctx.font = '18px Arial';
      this.ctx.fillStyle = GAME_CONFIG.colors.text;
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`Average Offset: ${gameState.averageOffset.toFixed(1)}ms`, this.canvasWidth / 2, this.canvasHeight * 0.53);
    }
    
    // Recent hits list
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'left';
    let y = this.canvasHeight * 0.6;
    this.ctx.fillStyle = GAME_CONFIG.colors.text;
    this.ctx.fillText('Recent Hits:', 50, y);
    
    const recentHits = calibrationHits.slice(-6);
    recentHits.forEach((hit, index) => {
      y += 22;
      const color = Math.abs(hit.offset) <= 25 ? GAME_CONFIG.colors.perfect :
                   Math.abs(hit.offset) <= 50 ? GAME_CONFIG.colors.great :
                   GAME_CONFIG.colors.good;
      
      this.ctx.fillStyle = color;
      const offsetText = hit.offset > 0 ? `+${hit.offset.toFixed(1)}ms (Late)` : `${hit.offset.toFixed(1)}ms (Early)`;
      this.ctx.fillText(`Beat ${hit.beatNumber}: ${offsetText}`, 50, y);
    });
    
    // Beat indicator (visual metronome) - positioned in top right
    const beatDuration = 60 / GAME_CONFIG.bpm;
    const beatProgress = (gameTime % beatDuration) / beatDuration;
    const pulseSize = 25 + (1 - beatProgress) * 15;
    
    this.ctx.fillStyle = GAME_CONFIG.colors.accent;
    this.ctx.globalAlpha = 0.8;
    this.ctx.beginPath();
    this.ctx.arc(this.canvasWidth - 80, 80, pulseSize, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.globalAlpha = 1;
    
    // Metronome label
    this.ctx.fillStyle = GAME_CONFIG.colors.text;
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Metronome', this.canvasWidth - 80, 120);
  }

  private renderURBar(calibrationHits: Array<{ offset: number }>): void {
    const barWidth = Math.min(400, this.canvasWidth * 0.7);
    const barHeight = 40;
    const barX = (this.canvasWidth - barWidth) / 2;
    const barY = this.canvasHeight * 0.33;
    
    // Background
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Border
    this.ctx.strokeStyle = '#444';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Center line (perfect timing)
    const centerX = barX + barWidth / 2;
    this.ctx.strokeStyle = GAME_CONFIG.colors.text;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, barY);
    this.ctx.lineTo(centerX, barY + barHeight);
    this.ctx.stroke();
    
    // Early/Late labels
    this.ctx.fillStyle = '#888';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('EARLY', barX + 5, barY - 5);
    this.ctx.textAlign = 'right';
    this.ctx.fillText('LATE', barX + barWidth - 5, barY - 5);
    
    // Scale markers
    const maxOffset = 100; // ±100ms range
    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 1;
    
    for (let offset = -maxOffset; offset <= maxOffset; offset += 25) {
      if (offset === 0) continue; // Skip center line
      const x = centerX + (offset / maxOffset) * (barWidth / 2);
      this.ctx.beginPath();
      this.ctx.moveTo(x, barY + barHeight - 8);
      this.ctx.lineTo(x, barY + barHeight);
      this.ctx.stroke();
      
      // Label major markers
      if (offset % 50 === 0) {
        this.ctx.fillStyle = '#666';
        this.ctx.font = '10px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${offset}ms`, x, barY + barHeight + 12);
      }
    }
    
    // Plot recent hits
    const recentHits = calibrationHits.slice(-20); // Show last 20 hits
    recentHits.forEach((hit, index) => {
      const offset = Math.max(-maxOffset, Math.min(maxOffset, hit.offset));
      const x = centerX + (offset / maxOffset) * (barWidth / 2);
      const y = barY + barHeight / 2;
      
      // Color based on accuracy
      let color = GAME_CONFIG.colors.good;
      if (Math.abs(hit.offset) <= 25) color = GAME_CONFIG.colors.perfect;
      else if (Math.abs(hit.offset) <= 50) color = GAME_CONFIG.colors.great;
      
      // Fade older hits
      const alpha = Math.max(0.3, 1 - (recentHits.length - index - 1) * 0.05);
      
      this.ctx.fillStyle = color;
      this.ctx.globalAlpha = alpha;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 4, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Highlight the most recent hit
      if (index === recentHits.length - 1) {
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.globalAlpha = 1;
        this.ctx.beginPath();
        this.ctx.arc(x, y, 6, 0, Math.PI * 2);
        this.ctx.stroke();
      }
    });
    
    this.ctx.globalAlpha = 1;
    
    // UR Bar title
    this.ctx.fillStyle = GAME_CONFIG.colors.text;
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Timing Distribution (UR Bar)', this.canvasWidth / 2, barY - 15);
    
    // Show current UR (Unstable Rate) if we have enough hits
    if (calibrationHits.length >= 3) {
      const offsets = calibrationHits.map(hit => hit.offset);
      const mean = offsets.reduce((sum, val) => sum + val, 0) / offsets.length;
      const variance = offsets.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / offsets.length;
      const standardDeviation = Math.sqrt(variance);
      const ur = standardDeviation * 10; // UR is typically 10x the standard deviation
      
      this.ctx.fillStyle = '#888';
      this.ctx.font = '12px Arial';
      this.ctx.fillText(`UR: ${ur.toFixed(1)}`, this.canvasWidth / 2, barY + barHeight + 25);
    }
  }

  private renderCalibrationResults(gameState: GameState): void {
    const { calibrationHits, averageOffset } = gameState;
    
    this.ctx.fillStyle = GAME_CONFIG.colors.text;
    this.ctx.font = 'bold 32px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    
    let y = this.canvasHeight * 0.2;
    this.ctx.fillText('Calibration Complete!', this.canvasWidth / 2, y);
    
    y += 60;
    this.ctx.font = 'bold 24px Arial';
    const offsetColor = Math.abs(averageOffset) <= 10 ? GAME_CONFIG.colors.perfect :
                       Math.abs(averageOffset) <= 25 ? GAME_CONFIG.colors.great :
                       GAME_CONFIG.colors.good;
    this.ctx.fillStyle = offsetColor;
    this.ctx.fillText(`Your Audio Offset: ${averageOffset > 0 ? '+' : ''}${averageOffset.toFixed(1)}ms`, this.canvasWidth / 2, y);
    
    // Show final UR bar
    this.renderURBar(calibrationHits);
    
    y = this.canvasHeight * 0.53;
    this.ctx.font = '16px Arial';
    this.ctx.fillStyle = GAME_CONFIG.colors.text;
    
    if (Math.abs(averageOffset) <= 10) {
      this.ctx.fillText('Excellent! Your audio timing is very accurate.', this.canvasWidth / 2, y);
    } else if (Math.abs(averageOffset) <= 25) {
      this.ctx.fillText('Good timing! Small offset detected.', this.canvasWidth / 2, y);
    } else {
      this.ctx.fillText('Significant offset detected. This will be compensated.', this.canvasWidth / 2, y);
    }
    
    y += 30;
    this.ctx.font = '14px Arial';
    this.ctx.fillStyle = '#888';
    this.ctx.fillText('This offset will be applied to improve your rhythm game accuracy', this.canvasWidth / 2, y);
    
    // Statistics
    y += 50;
    this.ctx.font = '14px Arial';
    this.ctx.fillStyle = GAME_CONFIG.colors.text;
    this.ctx.fillText(`Hits recorded: ${calibrationHits.length}`, this.canvasWidth / 2, y);
    
    const offsets = calibrationHits.map(hit => hit.offset);
    const standardDeviation = this.calculateStandardDeviation(offsets);
    const ur = standardDeviation * 10;
    
    y += 20;
    this.ctx.fillText(`Consistency (UR): ${ur.toFixed(1)}`, this.canvasWidth / 2, y);
    
    y += 20;
    this.ctx.fillText(`Standard Deviation: ±${standardDeviation.toFixed(1)}ms`, this.canvasWidth / 2, y);
    
    // Interpretation
    y += 30;
    this.ctx.font = '12px Arial';
    this.ctx.fillStyle = '#888';
    let interpretation = '';
    if (ur < 50) interpretation = 'Excellent consistency!';
    else if (ur < 100) interpretation = 'Good consistency';
    else if (ur < 150) interpretation = 'Average consistency';
    else interpretation = 'Practice more for better consistency';
    
    this.ctx.fillText(interpretation, this.canvasWidth / 2, y);
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private clear(): void {
    this.ctx.fillStyle = GAME_CONFIG.colors.background;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }
}