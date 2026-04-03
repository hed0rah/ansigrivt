// Vortex - chars spiral toward cursor
export const id = 'vortex';
export const name = 'vortex';
export const key = '5';
export const params = {
  label: 'pull', map: v => 1 + v * 0.6, default: 60,
  label2: 'radius', map2: v => 40 + v * 8, default2: 68,
};

let vortexTime = 0;

export function reset() { vortexTime = 0; }

export function apply(ctx, dt) {
  const pullStrength = ctx.p1;
  vortexTime += dt * 0.001 * (1 + pullStrength * 0.1);

  if (ctx.mouseX < -1000) {
    const ambientAmp = 1.5 + pullStrength * 0.1;
    for (const c of ctx.chars) {
      const phase = c.row * 0.05 + c.col * 0.03;
      const dx = Math.cos(vortexTime + phase) * ambientAmp;
      const dy = Math.sin(vortexTime + phase) * ambientAmp;
      c.el.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
    }
    return;
  }

  const maxR = ctx.p2;
  for (const c of ctx.chars) {
    const dx = c.cx - ctx.mouseX;
    const dy = c.cy - ctx.mouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < maxR) {
      const t = 1 - dist / maxR;
      const angle = Math.atan2(dy, dx);
      const spin = t * t * (pullStrength * 2.5);
      const pull = t * t * pullStrength;
      const tx = Math.cos(angle + Math.PI / 2) * spin - Math.cos(angle) * pull;
      const ty = Math.sin(angle + Math.PI / 2) * spin - Math.sin(angle) * pull;
      const scale = Math.max(0.02, 1 - t * Math.min(0.98, pullStrength * 0.016));
      const rot = pullStrength > 20 ? t * t * pullStrength * 8 : 0;
      c.el.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${scale.toFixed(2)}) rotate(${rot.toFixed(0)}deg)`;
      c.el.style.opacity = Math.max(0.05, 0.3 + 0.7 * scale).toFixed(2);
    } else if (c.el.style.transform) {
      c.el.style.transform = '';
      c.el.style.opacity = '';
    }
  }
}
