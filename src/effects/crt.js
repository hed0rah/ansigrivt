// CRT - barrel distortion + chromatic aberration + flicker
export const id = 'crt';
export const name = 'crt';
export const key = 'h';
export const params = {
  label: 'curve', map: v => v * 0.00015, default: 50,
  label2: 'aberration', map2: v => v * 0.08, default2: 40,
  label3: 'flicker', map3: v => v * 0.005, default3: 20,
};

let crtTime = 0;

export function reset() { crtTime = 0; }

export function apply(ctx, dt) {
  crtTime += dt * 0.001;
  const curve = ctx.p1;
  const aberration = ctx.p2;
  const flicker = ctx.p3;

  let maxRow = 0, maxCol = 0;
  for (const c of ctx.chars) {
    if (c.row > maxRow) maxRow = c.row;
    if (c.col > maxCol) maxCol = c.col;
  }
  const centerX = maxCol * ctx.CHAR_W / 2;
  const centerY = maxRow * ctx.CHAR_H / 2;
  const flickerVal = 1 + Math.sin(crtTime * 60) * flicker + Math.sin(crtTime * 120.7) * flicker * 0.3;

  for (const c of ctx.chars) {
    const nx = centerX > 0 ? (c.cx - centerX) / centerX : 0;
    const ny = centerY > 0 ? (c.cy - centerY) / centerY : 0;
    const r2 = nx * nx + ny * ny;
    const distort = curve * r2;
    const tx = nx * distort * centerX;
    const ty = ny * distort * centerY;
    const edgeDist = Math.sqrt(r2);
    const hue = edgeDist * aberration * 30 * Math.sign(nx);
    const brightness = Math.max(0.3, 1 - r2 * 0.6) * flickerVal;

    if (Math.abs(tx) > 0.1 || Math.abs(ty) > 0.1) {
      c.el.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px)`;
    } else if (c.el.style.transform) {
      c.el.style.transform = '';
    }

    const filters = [];
    if (Math.abs(hue) > 1) filters.push(`hue-rotate(${hue.toFixed(0)}deg)`);
    if (Math.abs(brightness - 1) > 0.01) filters.push(`brightness(${brightness.toFixed(2)})`);
    c.el.style.filter = filters.length ? filters.join(' ') : '';
    if (c.el.style.opacity) c.el.style.opacity = '';
  }
}
