// String - click-drag chars like a rope with spring physics
export const id = 'string';
export const name = 'string';
export const key = '4';
export const params = {
  label: 'stiffness', map: v => 0.01 + v * 0.006, default: 30,
  label2: 'length', map2: v => 5 + v * 3, default2: 50,
};

let chain = [];
let dragging = false;

export function reset() { chain = []; dragging = false; }

function findNearestChar(chars, x, y) {
  let best = -1, bestDist = Infinity;
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const dx = (c.cx + c.ox) - x;
    const dy = (c.cy + c.oy) - y;
    const d = dx * dx + dy * dy;
    if (d < bestDist) { bestDist = d; best = i; }
  }
  return bestDist < 400 ? best : -1;
}

function buildChain(chars, startIdx, maxLen, CHAR_W) {
  const visited = new Set([startIdx]);
  const result = [startIdx];
  let current = startIdx;
  while (result.length < maxLen) {
    let bestIdx = -1, bestDist = Infinity;
    for (let i = 0; i < chars.length; i++) {
      if (visited.has(i)) continue;
      const c = chars[i];
      const cur = chars[current];
      const dx = c.cx - cur.cx;
      const dy = c.cy - cur.cy;
      const d = dx * dx + dy * dy;
      if (d < (CHAR_W * 4) * (CHAR_W * 4) && d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    visited.add(bestIdx);
    result.push(bestIdx);
    current = bestIdx;
  }
  chain = result;
}

export function onMouseDown(ctx, x, y) {
  const idx = findNearestChar(ctx.chars, x, y);
  if (idx >= 0) {
    buildChain(ctx.chars, idx, Math.round(ctx.p2), ctx.CHAR_W);
    dragging = true;
  }
}

export function onMouseUp() { dragging = false; }

export function apply(ctx, dt) {
  const springK = ctx.p1;
  const restLen = ctx.CHAR_W * 1.2;
  const damping = 0.7 + springK * 0.4;

  if (dragging && chain.length > 0) {
    const head = ctx.chars[chain[0]];
    head.ox = ctx.mouseX - head.cx;
    head.oy = ctx.mouseY - head.cy;
    head.vx = 0; head.vy = 0;

    for (let i = 1; i < chain.length; i++) {
      const curr = ctx.chars[chain[i]];
      const prev = ctx.chars[chain[i - 1]];
      const tx = (prev.cx + prev.ox) - (curr.cx + curr.ox);
      const ty = (prev.cy + prev.oy) - (curr.cy + curr.oy);
      const dist = Math.sqrt(tx * tx + ty * ty);
      if (dist > restLen) {
        const force = (dist - restLen) * springK;
        curr.vx += (tx / dist) * force;
        curr.vy += (ty / dist) * force;
      }
      if (springK < 0.15) curr.vy += 0.15 * (1 - springK / 0.15);
      curr.vx *= damping;
      curr.vy *= damping;
      curr.ox += curr.vx;
      curr.oy += curr.vy;
    }
  } else {
    const returnK = 0.02 + springK * 0.15;
    const returnDamp = 0.7 + springK * 0.2;
    for (const c of ctx.chars) {
      c.vx += -c.ox * returnK;
      c.vy += -c.oy * returnK;
      c.vx *= returnDamp;
      c.vy *= returnDamp;
      c.ox += c.vx;
      c.oy += c.vy;
      if (Math.abs(c.ox) < 0.1 && Math.abs(c.oy) < 0.1 &&
          Math.abs(c.vx) < 0.05 && Math.abs(c.vy) < 0.05) {
        c.ox = 0; c.oy = 0; c.vx = 0; c.vy = 0;
      }
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
