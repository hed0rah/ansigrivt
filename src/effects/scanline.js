// Scanline - horizontal scan beam with phosphor glow
export const id = 'scanline';
export const name = 'scanline';
export const key = 'g';
export const params = {
  label: 'speed', map: v => 0.0005 + v * 0.0003, default: 35,
  label2: 'gap', map2: v => 2 + v * 0.1, default2: 40,
  label3: 'glow', map3: v => v * 0.02, default3: 50,
};

let scanlineTime = 0;

export function reset() { scanlineTime = 0; }

export function apply(ctx, dt) {
  scanlineTime += dt * ctx.p1;
  const gap = ctx.p2;
  const glow = ctx.p3;

  let maxRow = 0;
  for (const c of ctx.chars) { if (c.row > maxRow) maxRow = c.row; }

  const scanPos = (scanlineTime * maxRow * 0.1) % (maxRow + 4);

  for (const c of ctx.chars) {
    const rowDist = c.row - scanPos;
    const absRowDist = Math.abs(rowDist);

    if (absRowDist < 1.5) {
      const beamT = 1 - absRowDist / 1.5;
      c.el.style.filter = `brightness(${(1 + beamT * glow * 30).toFixed(1)})`;
      c.el.style.opacity = '';
    } else if (rowDist < 0 && rowDist > -8) {
      const trail = 1 - (-rowDist) / 8;
      c.el.style.filter = `brightness(${(1 + trail * trail * glow * 10).toFixed(1)})`;
      c.el.style.opacity = '';
    } else if (Math.floor(c.row / gap) % 2 === 0) {
      c.el.style.opacity = (0.5 + glow * 5).toFixed(2);
      if (c.el.style.filter) c.el.style.filter = '';
    } else {
      if (c.el.style.opacity) c.el.style.opacity = '';
      if (c.el.style.filter) c.el.style.filter = '';
    }
    if (c.el.style.transform) c.el.style.transform = '';
  }
}
