/** @returns `true` if the user asked the OS for less motion */
export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

const CONFETTI_PIECES = 140;
const CONFETTI_DURATION_MS = 2200;
const CONFETTI_FADE_MS = 600;
const GRAVITY = 900; // px / s²

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  spin: number;
  width: number;
  height: number;
  color: string;
}

let running: number | null = null;

/**
 * Fires a short confetti burst from the top-centre of the screen on a full-page canvas.
 * Skipped entirely when the user prefers reduced motion.
 *
 * @param canvas the fixed, full-screen canvas to draw on
 * @param colors colours to use for the pieces
 */
export function confetti(canvas: HTMLCanvasElement, colors: readonly string[]): void {
  if (prefersReducedMotion()) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  if (running !== null) cancelAnimationFrame(running);

  const ratio = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const pieces: Piece[] = Array.from({ length: CONFETTI_PIECES }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
    const speed = 450 + Math.random() * 500;
    return {
      x: width / 2 + (Math.random() - 0.5) * 80,
      y: height * 0.32,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      angle: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 14,
      width: 6 + Math.random() * 5,
      height: 9 + Math.random() * 7,
      color: colors[Math.floor(Math.random() * colors.length)],
    };
  });

  const start = performance.now();
  let last = start;
  const frame = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const age = now - start;
    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = age < CONFETTI_DURATION_MS - CONFETTI_FADE_MS
      ? 1
      : Math.max(0, (CONFETTI_DURATION_MS - age) / CONFETTI_FADE_MS);
    for (const p of pieces) {
      p.vy += GRAVITY * dt;
      p.vx *= 0.99;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.angle += p.spin * dt;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height * Math.abs(Math.cos(p.angle * 1.7)));
      ctx.restore();
    }
    if (age < CONFETTI_DURATION_MS) {
      running = requestAnimationFrame(frame);
    } else {
      ctx.clearRect(0, 0, width, height);
      running = null;
    }
  };
  running = requestAnimationFrame(frame);
}
