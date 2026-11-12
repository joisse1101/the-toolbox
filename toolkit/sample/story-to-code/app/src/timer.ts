// A Pomodoro timer: a 25 minute focus countdown. It makes no sound.

export const FOCUS_SECONDS = 25 * 60;

export const format = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export class Timer {
  remaining = FOCUS_SECONDS;
  private handle: ReturnType<typeof setInterval> | undefined;

  constructor(private onTick: (remaining: number) => void) {}

  get running(): boolean {
    return this.handle !== undefined;
  }

  start(): void {
    if (this.handle) return;
    this.handle = setInterval(() => {
      this.remaining = Math.max(0, this.remaining - 1);
      if (this.remaining === 0) this.pause();
      this.onTick(this.remaining);
    }, 1000);
  }

  pause(): void {
    if (this.handle) clearInterval(this.handle);
    this.handle = undefined;
  }

  reset(): void {
    this.pause();
    this.remaining = FOCUS_SECONDS;
    this.onTick(this.remaining);
  }
}
