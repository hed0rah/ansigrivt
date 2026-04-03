// Gravwell - gravity well with orbital mechanics and spaghettification
export const id = 'gravwell';
export const name = 'gravwell';
export const key = 'x';
export const params = {
  label: 'reach', map: v => 40 + v * 6, default: 65,
  label2: 'pull', map2: v => 0.3 + v * 0.06, default2: 60,
};

export function apply(ctx, dt) {
  const reach = ctx.p1;
  const strength = ctx.p2;
  const r2 = reach * reach;

  if (ctx.mouseX < -1000) {
    for (const c of ctx.chars) {
      c.vx += -c.ox * 0.02; c.vy += -c.oy * 0.02;
      c.vx *= 0.9; c.vy *= 0.9;
      c.ox += c.vx; c.oy += c.vy;
      if (Math.abs(c.ox) < 0.1 && Math.abs(c.oy) < 0.1 &&
          Math.abs(c.vx) < 0.05 && Math.abs(c.vy) < 0.05) {
        c.ox = 0; c.oy = 0; c.vx = 0; c.vy = 0;
      }
      if (c.ox !== 0 || c.oy !== 0) {
        c.el.style.transform = `translate(${c.ox.toFixed(1)}px,${c.oy.toFixed(1)}px)`;
      } else if (c.el.style.transform) {
        c.el.style.transform = '';
        if (c.el.style.opacity) c.el.style.opacity = '';
      }
    }
    return;
  }

  for (const c of ctx.chars) {
    const px = c.cx + c.ox;
    const py = c.cy + c.oy;
    const dx = px - ctx.mouseX;
    const dy = py - ctx.mouseY;
    const d2 = dx * dx + dy * dy;
    const dist = Math.sqrt(d2);

    if (d2 < r2 && dist > 2) {
      const t = 1 - dist / reach;
      const angle = Math.atan2(dy, dx);
      const pullForce = strength * t * 0.5;
      const tangential = pullForce * 0.7;
      const radial = pullForce * 0.4;
      c.vx -= Math.cos(angle) * radial;
      c.vy -= Math.sin(angle) * radial;
      c.vx += Math.cos(angle + Math.PI / 2) * tangential;
      c.vy += Math.sin(angle + Math.PI / 2) * tangential;
      if (dist < reach * 0.15) {
        c.vx -= Math.cos(angle) * strength * 0.3;
        c.vy -= Math.sin(angle) * strength * 0.3;
      }
    } else if (d2 < r2 * 4) {
      const gentlePull = 0.02 * strength / Math.max(dist, 1);
      c.vx -= (dx / dist) * gentlePull;
      c.vy -= (dy / dist) * gentlePull;
    }

    c.vx *= 0.995; c.vy *= 0.995;
    c.ox += c.vx; c.oy += c.vy;

    const disp = Math.sqrt(c.ox * c.ox + c.oy * c.oy);
    if (disp > 0.3) {
      const spd = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
      const rot = spd > 0.5 ? spd * 5 * Math.sign(c.vx * c.vy) : 0;
      const distToMouse = Math.sqrt((c.cx + c.ox - ctx.mouseX) ** 2 + (c.cy + c.oy - ctx.mouseY) ** 2);
      const stretchFactor = distToMouse < reach * 0.3 ? 1 + (1 - distToMouse / (reach * 0.3)) * 0.8 : 1;
      c.el.style.transform = `translate(${c.ox.toFixed(1)}px,${c.oy.toFixed(1)}px) rotate(${rot.toFixed(0)}deg) scaleY(${stretchFactor.toFixed(2)})`;
      const fade = distToMouse < reach * 0.1 ? Math.max(0.1, distToMouse / (reach * 0.1)) : 1;
      c.el.style.opacity = fade < 1 ? fade.toFixed(2) : '';
    } else {
      c.ox = 0; c.oy = 0;
      if (c.el.style.transform) c.el.style.transform = '';
      if (c.el.style.opacity) c.el.style.opacity = '';
    }
    if (c.el.style.filter) c.el.style.filter = '';
  }
}
