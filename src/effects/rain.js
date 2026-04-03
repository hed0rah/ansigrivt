// Rain - chars fall like matrix rain, respawn at top
export const id = 'rain';
export const name = 'rain';
export const key = 'q';
export const params = {
  label: 'speed', map: v => 0.1 + v * 0.08, default: 50,
  label2: 'drift', map2: v => v * 0.1, default2: 30,
};

let started = false;

export function reset() { started = false; }

export function apply(ctx, dt) {
  const speed = ctx.p1;
  const drift = ctx.p2;

  if (!started) {
    started = true;
    for (const c of ctx.chars) {
      const seed = Math.sin(c.row * 91.1 + c.col * 47.3) * 43758.5453;
      c._rainDelay = (seed - Math.floor(seed)) * 2;
      c._rainSpeed = 0.5 + (seed * 3 - Math.floor(seed * 3)) * 1.5;
      c._rainPhase = 0;
      c._rainFalling = false;
    }
  }

  for (const c of ctx.chars) {
    c._rainPhase += dt * 0.001 * speed;
    if (c._rainPhase < c._rainDelay) continue;
    if (!c._rainFalling) { c._rainFalling = true; c.oy = 0; c.ox = 0; }

    c.oy += c._rainSpeed * speed * 0.3;
    const windWobble = Math.sin(c._rainPhase * 2 + c.col * 0.5) * (drift * 0.5);
    c.ox += drift * 0.15 * c._rainSpeed;
    c.ox += windWobble * 0.02;

    if (c.oy > 300 || Math.abs(c.ox) > 500) {
      c.oy = -20 - Math.random() * 40;
      c.ox = drift > 2 ? -Math.random() * drift * 30 : (drift < -2 ? Math.random() * -drift * 30 : 0);
      c._rainSpeed = 0.5 + Math.random() * 1.5;
    }

    c.el.style.transform = `translate(${c.ox.toFixed(1)}px,${c.oy.toFixed(1)}px)`;
    const glowPhase = Math.sin(c._rainPhase * 3 + c.row * 0.2);
    c.el.style.opacity = (0.3 + glowPhase * 0.35 + 0.35).toFixed(2);
  }
}
