// Breathe - slow rhythmic expansion from center
export const id = 'breathe';
export const name = 'breathe';
export const key = 'j';
export const params = {
  label: 'speed', map: v => 0.0003 + v * 0.00008, default: 30,
  label2: 'depth', map2: v => 0.5 + v * 0.06, default2: 40,
};

let breatheTime = 0;

export function reset() { breatheTime = 0; }

export function apply(ctx, dt) {
  breatheTime += dt * ctx.p1;
  const depth = ctx.p2;

  let maxRow = 0, maxCol = 0;
  for (const c of ctx.chars) {
    if (c.row > maxRow) maxRow = c.row;
    if (c.col > maxCol) maxCol = c.col;
  }
  const centerX = maxCol * ctx.CHAR_W / 2;
  const centerY = maxRow * ctx.CHAR_H / 2;
  const breath = Math.sin(breatheTime) * 0.5 + 0.5;
  const expand = breath * depth;

  for (const c of ctx.chars) {
    const dx = c.cx - centerX;
    const dy = c.cy - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const pushX = dist > 0 ? (dx / dist) * expand * (dist * 0.008) : 0;
    const pushY = dist > 0 ? (dy / dist) * expand * (dist * 0.008) : 0;
    const normDist = dist / Math.max(centerX, centerY);
    const opacity = 0.7 + breath * 0.3 * (1 - normDist * 0.5);

    if (Math.abs(pushX) > 0.05 || Math.abs(pushY) > 0.05) {
      c.el.style.transform = `translate(${pushX.toFixed(1)}px,${pushY.toFixed(1)}px)`;
    } else if (c.el.style.transform) {
      c.el.style.transform = '';
    }
    c.el.style.opacity = opacity.toFixed(2);
    if (c.el.style.filter) c.el.style.filter = '';
  }
}
