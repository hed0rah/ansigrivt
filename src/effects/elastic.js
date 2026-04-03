// Elastic - click-anchor, drag to stretch, release to BOING
export const id = 'elastic';
export const name = 'elastic';
export const key = '9';
export const params = {
  label: 'stiffness', map: v => 0.003 + v * 0.007, default: 40,
  label2: 'loose', map2: v => 0.8 + v * 0.0019, default2: 35,
  label3: 'width', map3: v => 60 + v * 4, default3: 30,
};

let anchor = null;
let stretching = false;

export function reset() { anchor = null; stretching = false; }

export function onMouseDown(ctx, x, y) {
  anchor = { x, y };
  stretching = true;
}

export function onMouseUp() { stretching = false; }

export function apply(ctx, dt) {
  const stiffness = ctx.p1;
  const looseness = ctx.p2;
  const springK = stiffness;
  const damp = 1 - looseness;
  const maxPerp = ctx.p3;

  if (stretching && anchor) {
    const ax = anchor.x, ay = anchor.y;
    const stretchDx = ctx.mouseX - ax;
    const stretchDy = ctx.mouseY - ay;
    const stretchDist = Math.sqrt(stretchDx * stretchDx + stretchDy * stretchDy);

    for (const c of ctx.chars) {
      const toCx = c.cx - ax, toCy = c.cy - ay;
      const dot = stretchDist > 0 ? (toCx * stretchDx + toCy * stretchDy) / (stretchDist * stretchDist) : 0;
      const t = Math.max(0, Math.min(1, dot));
      const projX = ax + stretchDx * t;
      const projY = ay + stretchDy * t;
      const perpDist = Math.sqrt((c.cx - projX) ** 2 + (c.cy - projY) ** 2);
      if (perpDist < maxPerp) {
        const influence = (1 - perpDist / maxPerp) * t;
        const stretchMult = 0.3 + stiffness * 3;
        c.ox = stretchDx * influence * Math.min(stretchMult, 1.5);
        c.oy = stretchDy * influence * Math.min(stretchMult, 1.5);
        c.vx = 0; c.vy = 0;
      }
    }
  } else {
    for (const c of ctx.chars) {
      c.vx += -c.ox * springK;
      c.vy += -c.oy * springK;
      c.vx *= damp;
      c.vy *= damp;
      c.ox += c.vx;
      c.oy += c.vy;
      if (Math.abs(c.ox) < 0.05 && Math.abs(c.oy) < 0.05 &&
          Math.abs(c.vx) < 0.02 && Math.abs(c.vy) < 0.02) {
        c.ox = 0; c.oy = 0; c.vx = 0; c.vy = 0;
      }
    }
  }

  for (const c of ctx.chars) {
    if (c.ox !== 0 || c.oy !== 0) {
      const speed = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
      const sa = Math.min(speed * 0.15, 0.6);
      const scaleX = 1 + (Math.abs(c.vx) > Math.abs(c.vy) ? sa : -sa * 0.3);
      const scaleY = 1 + (Math.abs(c.vy) > Math.abs(c.vx) ? sa : -sa * 0.3);
      c.el.style.transform = `translate(${c.ox.toFixed(1)}px,${c.oy.toFixed(1)}px) scale(${scaleX.toFixed(3)},${scaleY.toFixed(3)})`;
    } else if (c.el.style.transform) {
      c.el.style.transform = '';
    }
    if (c.el.style.opacity) c.el.style.opacity = '';
  }
}
