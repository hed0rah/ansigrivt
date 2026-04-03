// Tornado - funnel vortex centered on mouse with controllable height
export const id = 'tornado';
export const name = 'tornado';
export const key = 't';
export const params = {
  label: 'spin', map: v => 0.5 + v * 0.08, default: 65,
  label2: 'width', map2: v => 1 + v * 0.15, default2: 50,
  label3: 'height', map3: v => 60 + v * 6, default3: 40,
};

let tornadoTime = 0;

export function reset() { tornadoTime = 0; }

export function apply(ctx, dt) {
  tornadoTime += dt * 0.003;
  const spinSpeed = ctx.p1;
  const funnelWidth = ctx.p2;
  const height = ctx.p3;

  let maxCol = 0, maxRow = 0;
  for (const c of ctx.chars) {
    if (c.col > maxCol) maxCol = c.col;
    if (c.row > maxRow) maxRow = c.row;
  }
  const centerX = ctx.mouseX > -1000 ? ctx.mouseX : (maxCol * ctx.CHAR_W / 2);
  const centerY = ctx.mouseX > -1000 ? ctx.mouseY : (maxRow * ctx.CHAR_H / 2);
  const baseY = centerY;
  const topY = centerY - height;

  for (const c of ctx.chars) {
    const dy = baseY - c.cy;
    if (dy < -20 || dy > height + 20) {
      c.ox *= 0.95; c.oy *= 0.95;
      if (Math.abs(c.ox) < 0.1 && Math.abs(c.oy) < 0.1) {
        c.ox = 0; c.oy = 0;
        if (c.el.style.transform) c.el.style.transform = '';
        if (c.el.style.opacity) c.el.style.opacity = '';
      } else {
        c.el.style.transform = `translate(${c.ox.toFixed(1)}px,${c.oy.toFixed(1)}px)`;
        if (c.el.style.opacity) c.el.style.opacity = '';
      }
      if (c.el.style.filter) c.el.style.filter = '';
      continue;
    }

    const ny = Math.max(0, Math.min(1, dy / Math.max(1, height)));
    const funnelR = 10 + ny * ny * funnelWidth * 8;
    const dx = c.cx - centerX;
    const absDx = Math.abs(dx);

    if (absDx < funnelR * 2.5) {
      const funnelT = Math.max(0, 1 - absDx / (funnelR * 2.5));
      const rotSpeed = spinSpeed * (0.3 + funnelT * 2) * (1.5 - ny * 0.8);
      const rotAngle = tornadoTime * rotSpeed + c.row * 0.3 + c.col * 0.1;
      const orbitR = funnelR * (1 - funnelT * 0.6);
      const orbX = Math.cos(rotAngle) * orbitR * funnelT;
      const orbY = Math.sin(rotAngle) * orbitR * funnelT * 0.4;
      const liftAmt = funnelT * 2 * (0.5 + ny * 0.5);
      const targetOx = orbX;
      const targetOy = -liftAmt * 3 + orbY;
      c.ox += (targetOx - c.ox) * 0.08;
      c.oy += (targetOy - c.oy) * 0.06;
      if (ny > 0.85 && funnelT > 0.3) { c.ox += Math.cos(rotAngle) * 1.5; c.oy -= 0.5; }
      const scale = 0.6 + (1 - funnelT) * 0.4;
      const rot = funnelT * rotSpeed * 15;
      c.el.style.transform = `translate(${c.ox.toFixed(1)}px,${c.oy.toFixed(1)}px) scale(${scale.toFixed(2)}) rotate(${rot.toFixed(0)}deg)`;
      c.el.style.opacity = (0.4 + (1 - funnelT) * 0.6).toFixed(2);
    } else {
      c.ox *= 0.95; c.oy *= 0.95;
      if (Math.abs(c.ox) < 0.1 && Math.abs(c.oy) < 0.1) {
        c.ox = 0; c.oy = 0;
        if (c.el.style.transform) c.el.style.transform = '';
        if (c.el.style.opacity) c.el.style.opacity = '';
      } else {
        c.el.style.transform = `translate(${c.ox.toFixed(1)}px,${c.oy.toFixed(1)}px)`;
        if (c.el.style.opacity) c.el.style.opacity = '';
      }
    }
    if (c.el.style.filter) c.el.style.filter = '';
  }
}
