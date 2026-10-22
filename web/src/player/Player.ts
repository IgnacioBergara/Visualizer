import type { Step } from "../engine/types";

type Listener = (position: number, total: number, playing: boolean) => void;

/** Reproductor de pasos: solo mueve un índice; quien escucha decide qué dibujar. */
export class Player {
  private steps: readonly Step[] = [];
  private position = 0;
  private timer: number | null = null;
  private delayMs = 600;

  constructor(private readonly onChange: Listener) {}

  get playing(): boolean {
    return this.timer !== null;
  }

  load(steps: readonly Step[]): void {
    this.pause();
    this.steps = steps;
    this.seek(0);
  }

  seek(position: number): void {
    this.position = Math.max(0, Math.min(position, this.steps.length));
    this.emit();
  }

  stepForward(): void {
    this.seek(this.position + 1);
  }

  stepBack(): void {
    this.seek(this.position - 1);
  }

  play(): void {
    if (this.playing) return;
    if (this.position >= this.steps.length) this.position = 0;
    this.timer = window.setInterval(() => {
      if (this.position >= this.steps.length) this.pause();
      else this.stepForward();
    }, this.delayMs);
    this.emit();
  }

  pause(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    this.emit();
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  setDelay(ms: number): void {
    this.delayMs = ms;
    if (this.playing) {
      this.pause();
      this.play();
    }
  }

  private emit(): void {
    this.onChange(this.position, this.steps.length, this.playing);
  }
}
