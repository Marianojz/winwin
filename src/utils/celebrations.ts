export function launchConfettiFromTop(durationMs: number = 3000) {
  const w = window as unknown as { confetti?: (opts: any) => void };
  if (!w.confetti) return;

  const duration = Math.max(1000, durationMs);
  const endTime = Date.now() + duration;
  const defaults = { startVelocity: 35, spread: 70, ticks: 200, zIndex: 9999, gravity: 1.0 };

  const interval = setInterval(() => {
    // Lanzar pequeñas ráfagas desde posiciones aleatorias en la parte superior
    w.confetti!({
      ...defaults,
      particleCount: 12,
      origin: { x: Math.random(), y: -0.05 }, // ligeramente por encima del viewport
      angle: 90, // vertical hacia abajo
    });

    if (Date.now() > endTime) {
      clearInterval(interval);
    }
  }, 150);
}




