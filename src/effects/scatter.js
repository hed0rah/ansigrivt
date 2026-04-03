// Scatter - jittery noise with mouse boost
export const id = 'scatter';
export const name = 'scatter';
export const key = '3';
export const params = {
  label: 'intensity', map: v => 0.2 + v * 0.15, default: 60,
  label2: 'radius', map2: v => 40 + v * 5, default2: 70,
};

let phase = 0;

export function reset() { phase = 0; }

export function apply(ctx, dt) {
  phase += dt * 0.001;
  const boostRadius = ctx.p2;
  for (const c of ctx.chars) {
    const seed = c.row * 131 + c.col * 37;
    const intensity = ctx.p1;
    const jx = Math.sin(phase + seed * 0.1) * intensity;
    const jy = Math.cos(phase * 1.1 + seed * 0.07) * (intensity * 0.75);

    const dx = c.cx - ctx.mouseX;
    const dy = c.cy - ctx.mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const boost = dist < boostRadius ? (1 - dist / boostRadius) * (intensity * 0.8) : 0;
    const tx = jx + jx * boost;
    const ty = jy + jy * boost;

    if (intensity > 8) {
      const flicker = (Math.sin(phase * 5 + seed) > 0.6) ? 0.3 + Math.random() * 0.4 : 1;
      const rot = Math.sin(phase * 2 + seed * 0.05) * intensity * 3;
      c.el.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) rotate(${rot.toFixed(0)}deg)`;
      c.el.style.opacity = flicker.toFixed(2);
    } else {
      c.el.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px)`;
      if (c.el.style.opacity) c.el.style.opacity = '';
    }
  }
}
