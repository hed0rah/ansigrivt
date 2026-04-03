// Magnet - attract chars toward cursor with smooth release
export const id = 'magnet';
export const name = 'magnet';
export const key = 'w';
export const params = {
  label: 'reach', map: v => 20 + v * 7, default: 65,
  label2: 'strength', map2: v => 2 + v * 0.8, default2: 60,
};

export const idleWithoutMouse = true;

export function apply(ctx, dt) {
  const reach = ctx.p1;
  const pullStr = ctx.p2;
  const r2 = reach * reach;

  for (const c of ctx.chars) {
    if (ctx.mouseX > -1000) {
      const dx = c.cx - ctx.mouseX;
      const dy = c.cy - ctx.mouseY;
      const d2 = dx * dx + dy * dy;
      if (d2 < r2 && d2 > 1) {
        const dist = Math.sqrt(d2);
        const t = 1 - dist / reach;
        const pull = t * t * pullStr;
        const angle = Math.atan2(dy, dx);
        c._magTx = -Math.cos(angle) * pull;
        c._magTy = -Math.sin(angle) * pull;
        c._magScale = 1 + t * (pullStr * 0.015);
        c._magT = t;
        c._magActive = true;
      } else if (c._magActive) {
        c._magTx *= 0.88; c._magTy *= 0.88;
        c._magScale = 1 + (c._magScale - 1) * 0.88;
        c._magT *= 0.88;
        if (Math.abs(c._magTx) < 0.1) c._magActive = false;
      }
    } else if (c._magActive) {
      c._magTx *= 0.88; c._magTy *= 0.88;
      c._magScale = 1 + (c._magScale - 1) * 0.88;
      c._magT *= 0.88;
      if (Math.abs(c._magTx) < 0.1) c._magActive = false;
    }

    if (c._magActive) {
      const rot = pullStr > 40 ? (c._magT || 0) ** 2 * (pullStr - 40) * 3 : 0;
      c.el.style.transform = `translate(${c._magTx.toFixed(1)}px,${c._magTy.toFixed(1)}px) scale(${(c._magScale || 1).toFixed(2)}) rotate(${rot.toFixed(0)}deg)`;
      c.el.style.opacity = (0.3 + 0.7 * (c._magT || 0)).toFixed(2);
    } else {
      if (c.el.style.transform) c.el.style.transform = '';
      if (c.el.style.opacity) c.el.style.opacity = '';
    }
  }
}
