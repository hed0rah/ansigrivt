// Gravity - chars fall, bounce, pile up, shatter on impact
export const id = 'gravity';
export const name = 'gravity';
export const key = '6';
export const params = {
  label: 'gravity', map: v => 0.01 + v * 0.012, default: 35,
  label2: 'bounce', map2: v => -0.05 - v * 0.0092, default2: 60,
  label3: 'shatter', map3: v => v * 0.01, default3: 0,
};

let started = false;

export function reset() { started = false; }

export function init(ctx) {
  started = true;
  const gravity = ctx.p1;
  for (const c of ctx.chars) {
    c.vx = (Math.random() - 0.5) * (gravity * 3);
    c.vy = -Math.random() * (gravity * 8);
    c._shattered = false;
    c._shatterRot = 0;
    c._shatterScale = 1;
  }
}

export function apply(ctx, dt) {
  const gravity = ctx.p1;
  const bounce = ctx.p2;
  const shatter = ctx.p3;
  const floorY = 500;
  const returnForce = 0.002;

  if (!started) init(ctx);

  const repelR = 60 + gravity * 50;
  for (const c of ctx.chars) {
    c.vy += gravity;
    c.vx += -c.ox * returnForce;
    c.vy += -c.oy * returnForce;

    if (ctx.mouseX > -1000) {
      const dx = (c.cx + c.ox) - ctx.mouseX;
      const dy = (c.cy + c.oy) - ctx.mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < repelR && dist > 0) {
        const force = (1 - dist / repelR) * (2 + gravity * 4);
        c.vx += (dx / dist) * force;
        c.vy += (dy / dist) * force;
      }
    }

    c.vx *= 0.98; c.vy *= 0.98;
    c.ox += c.vx; c.oy += c.vy;

    if (c.oy > floorY) {
      const impactSpeed = Math.abs(c.vy);
      c.oy = floorY;
      c.vy *= bounce;
      c.vx *= 0.85;
      if (shatter > 0 && impactSpeed > 1 && !c._shattered) {
        const sf = impactSpeed * shatter;
        c.vx += (Math.random() - 0.5) * sf * 8;
        c.vy += -Math.random() * sf * 3;
        c._shatterRot = (Math.random() - 0.5) * sf * 40;
        c._shatterScale = Math.max(0.1, 1 - shatter * 0.7);
        if (shatter > 0.5 && impactSpeed > 3) c._shattered = true;
      }
    }
    if (c.oy < -floorY) { c.oy = -floorY; c.vy *= bounce; }
    if (Math.abs(c.ox) > 600) { c.ox = Math.sign(c.ox) * 600; c.vx *= bounce; }

    const rot = c._shatterRot || 0;
    const sc = c._shatterScale || 1;
    if (rot !== 0 || sc !== 1) {
      c._shatterRot *= 0.995;
      c.el.style.transform = `translate(${c.ox.toFixed(1)}px,${c.oy.toFixed(1)}px) rotate(${rot.toFixed(0)}deg) scale(${sc.toFixed(2)})`;
      if (c._shattered) {
        const fade = Math.max(0, (c._shatterScale || 1));
        c._shatterScale *= 0.998;
        c.el.style.opacity = fade.toFixed(2);
      }
    } else {
      c.el.style.transform = `translate(${c.ox.toFixed(1)}px,${c.oy.toFixed(1)}px)`;
      if (c.el.style.opacity) c.el.style.opacity = '';
    }
  }
}
