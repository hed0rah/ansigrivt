// Repel - chars push away from cursor with smooth decay
export const id = 'repel';
export const name = 'repel';
export const key = '1';
export const params = {
  label: 'radius', map: v => 20 + v * 6, default: 65,
  label2: 'push', map2: v => 1 + v * 0.8, default2: 55,
};

export function apply(ctx, dt) {
  const radius = ctx.p1;
  const pushForce = ctx.p2;
  const r2 = radius * radius;
  for (const c of ctx.chars) {
    const dx = c.cx - ctx.mouseX;
    const dy = c.cy - ctx.mouseY;
    const d2 = dx * dx + dy * dy;
    if (d2 < r2) {
      const dist = Math.sqrt(d2);
      const t = 1 - dist / radius;
      const t2 = t * t;
      const push = t2 * pushForce;
      const scale = Math.max(0.05, 1 - t2 * 0.95);
      const angle = Math.atan2(dy, dx);
      c._repelTx = Math.cos(angle) * push;
      c._repelTy = Math.sin(angle) * push;
      c._repelScale = scale;
      c._repelActive = true;
    } else if (c._repelActive) {
      c._repelTx *= 0.85;
      c._repelTy *= 0.85;
      c._repelScale = 1 - (1 - (c._repelScale || 1)) * 0.85;
      if (Math.abs(c._repelTx) < 0.1 && Math.abs(c._repelTy) < 0.1) {
        c._repelActive = false;
        c.el.style.transform = '';
        c.el.style.opacity = '';
        continue;
      }
    } else {
      continue;
    }
    const tx = c._repelTx;
    const ty = c._repelTy;
    const scale = c._repelScale;
    const rot = pushForce > 40 ? (1 - scale) * (pushForce - 40) * 3 * Math.sign(Math.sin(c.col * 3.7)) : 0;
    c.el.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${scale.toFixed(2)}) rotate(${rot.toFixed(0)}deg)`;
    c.el.style.opacity = (0.15 + 0.85 * scale).toFixed(2);
  }
}

export const idleWithoutMouse = true;
