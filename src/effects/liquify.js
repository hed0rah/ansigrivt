// Liquify - Photoshop-style clay push tool with viscosity
export const id = 'liquify';
export const name = 'liquify';
export const key = 'd';
export const params = {
  label: 'size', map: v => 30 + v * 5, default: 60,
  label2: 'strength', map2: v => 0.5 + v * 0.08, default2: 60,
  label3: 'viscosity', map3: v => v * 0.01, default3: 50,
};

let prevX = -1, prevY = -1;

export function reset() { prevX = -1; prevY = -1; }

export function apply(ctx, dt) {
  const radius = ctx.p1;
  const strength = ctx.p2;
  const viscosity = ctx.p3;
  const r2 = radius * radius;

  if (ctx.mouseDown && ctx.mouseX > -1000) {
    const dirX = prevX > 0 ? ctx.mouseX - prevX : 0;
    const dirY = prevY > 0 ? ctx.mouseY - prevY : 0;
    const speed = Math.sqrt(dirX * dirX + dirY * dirY);

    if (speed > 0.3) {
      const nx = dirX / speed;
      const ny = dirY / speed;
      const pushAmt = Math.min(speed, 30) * strength * 0.5;
      for (const c of ctx.chars) {
        const dx = (c.cx + c.ox) - ctx.mouseX;
        const dy = (c.cy + c.oy) - ctx.mouseY;
        const d2 = dx * dx + dy * dy;
        if (d2 < r2) {
          const dist = Math.sqrt(d2);
          const t = Math.exp(-3 * (dist / radius) * (dist / radius));
          c.ox += nx * pushAmt * t;
          c.oy += ny * pushAmt * t;
        }
      }
    }
    prevX = ctx.mouseX;
    prevY = ctx.mouseY;
  } else {
    prevX = -1; prevY = -1;
  }

  if (viscosity > 0) {
    const grid = {};
    for (const c of ctx.chars) grid[c.row + ',' + c.col] = c;
    for (const c of ctx.chars) {
      if (c.ox === 0 && c.oy === 0) continue;
      let avgOx = 0, avgOy = 0, count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const n = grid[(c.row + dr) + ',' + (c.col + dc)];
          if (n) { avgOx += n.ox; avgOy += n.oy; count++; }
        }
      }
      if (count > 0) {
        c._lqOx = c.ox + ((avgOx / count) - c.ox) * viscosity * 0.4;
        c._lqOy = c.oy + ((avgOy / count) - c.oy) * viscosity * 0.4;
      }
    }
    for (const c of ctx.chars) {
      if (c._lqOx !== undefined) { c.ox = c._lqOx; c.oy = c._lqOy; c._lqOx = undefined; }
    }
  }

  for (const c of ctx.chars) {
    if (c.ox !== 0 || c.oy !== 0) {
      c.el.style.transform = `translate(${c.ox.toFixed(1)}px,${c.oy.toFixed(1)}px)`;
    } else if (c.el.style.transform) {
      c.el.style.transform = '';
    }
    if (c.el.style.opacity) c.el.style.opacity = '';
  }
}
