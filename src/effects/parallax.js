// Parallax - layered depth based on mouse position
export const id = 'parallax';
export const name = 'parallax';
export const key = 'k';
export const params = {
  label: 'depth', map: v => 0.5 + v * 0.15, default: 50,
  label2: 'layers', map2: v => 2 + Math.floor(v * 0.1), default2: 40,
};

export const idleWithoutMouse = true;

export function apply(ctx, dt) {
  if (ctx.mouseX < -1000) {
    for (const c of ctx.chars) {
      if (c.el.style.transform) c.el.style.transform = '';
      if (c.el.style.opacity) c.el.style.opacity = '';
    }
    return;
  }

  let maxRow = 0, maxCol = 0;
  for (const c of ctx.chars) {
    if (c.row > maxRow) maxRow = c.row;
    if (c.col > maxCol) maxCol = c.col;
  }
  const centerX = maxCol * ctx.CHAR_W / 2;
  const centerY = maxRow * ctx.CHAR_H / 2;
  const mOffX = centerX > 0 ? (ctx.mouseX - centerX) / centerX : 0;
  const mOffY = centerY > 0 ? (ctx.mouseY - centerY) / centerY : 0;
  const layerCount = ctx.p2;
  const depthMult = ctx.p1;

  for (const c of ctx.chars) {
    const layer = Math.floor(c.row / Math.max(1, Math.floor(maxRow / layerCount))) % layerCount;
    const layerDepth = (layer / layerCount) * depthMult;
    const tx = -mOffX * layerDepth * 15;
    const ty = -mOffY * layerDepth * 8;
    const scale = 1 - layerDepth * 0.03;

    if (Math.abs(tx) > 0.05 || Math.abs(ty) > 0.05) {
      c.el.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${scale.toFixed(3)})`;
    } else if (c.el.style.transform) {
      c.el.style.transform = '';
    }
    c.el.style.opacity = (1 - layerDepth * 0.08).toFixed(2);
  }
}
