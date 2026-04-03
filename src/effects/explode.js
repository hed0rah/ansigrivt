// Explode - click to blast chars outward, they spring back
export const id = 'explode';
export const name = 'explode';
export const key = '8';
export const params = {
  label: 'force', map: v => 2 + v * 1.0, default: 40,
  label2: 'radius', map2: v => 30 + v * 8, default2: 50,
};

export function onMouseDown(ctx, x, y) {
  const radius = ctx.p2;
  for (const c of ctx.chars) {
    const dx = (c.cx + c.ox) - x;
    const dy = (c.cy + c.oy) - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < radius && dist > 0) {
      const force = (1 - dist / radius) * ctx.p1;
      c.vx += (dx / dist) * force;
      c.vy += (dy / dist) * force;
    }
  }
}

export function apply(ctx, dt) {
  const force = ctx.p1;
  const returnForce = Math.max(0.005, 0.06 - force * 0.0005);
  const damping = 0.95;

  for (const c of ctx.chars) {
    c.vx += -c.ox * returnForce;
    c.vy += -c.oy * returnForce;
    c.vx *= damping;
    c.vy *= damping;
    c.ox += c.vx;
    c.oy += c.vy;

    const dist = Math.sqrt(c.ox * c.ox + c.oy * c.oy);
    if (dist > 0.5) {
      const speed = Math.sqrt(c.vx * c.vx + c.vy * c.vy);
      const rot = force > 50 ? speed * 8 * Math.sign(c.vx) : 0;
      const scale = Math.max(0.1, 1 - dist / 600);
      c.el.style.transform = `translate(${c.ox.toFixed(1)}px,${c.oy.toFixed(1)}px) rotate(${rot.toFixed(0)}deg)`;
      c.el.style.opacity = scale.toFixed(2);
    } else {
      c.ox = 0; c.oy = 0; c.vx = 0; c.vy = 0;
      if (c.el.style.transform) c.el.style.transform = '';
      if (c.el.style.opacity) c.el.style.opacity = '';
    }
  }
}
