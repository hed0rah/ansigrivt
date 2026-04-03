// Smudge - click-drag to push chars, they stay displaced
export const id = 'smudge';
export const name = 'smudge';
export const key = 'a';
export const params = {
  label: 'size', map: v => 20 + v * 4, default: 40,
  label2: 'strength', map2: v => 0.3 + v * 0.02, default2: 50,
};

let prevX = -1, prevY = -1;

export function reset() { prevX = -1; prevY = -1; }

export function apply(ctx, dt) {
  const size = ctx.p1;
  const strength = ctx.p2;
  const r2 = size * size;

  if (ctx.mouseDown && ctx.mouseX > -1000) {
    const dirX = prevX > 0 ? ctx.mouseX - prevX : 0;
    const dirY = prevY > 0 ? ctx.mouseY - prevY : 0;
    const speed = Math.sqrt(dirX * dirX + dirY * dirY);

    if (speed > 0.5) {
      const nx = dirX / speed;
      const ny = dirY / speed;
      const pushAmt = Math.min(speed, 20) * strength;
      for (const c of ctx.chars) {
        const dx = (c.cx + c.ox) - ctx.mouseX;
        const dy = (c.cy + c.oy) - ctx.mouseY;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const t = 1 - Math.sqrt(d2) / size;
          c.ox += nx * pushAmt * t * t;
          c.oy += ny * pushAmt * t * t;
        }
      }
    }
    prevX = ctx.mouseX;
    prevY = ctx.mouseY;
  } else {
    prevX = -1; prevY = -1;
  }

  for (const c of ctx.chars) {
    if (c.ox !== 0 || c.oy !== 0) {
      c.el.style.transform = `translate(${c.ox.toFixed(1)}px,${c.oy.toFixed(1)}px)`;
    } else if (c.el.style.transform) {
      c.el.style.transform = '';
    }
  }
}
