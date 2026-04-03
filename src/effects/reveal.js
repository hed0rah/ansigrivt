// Reveal - CRT power-on wipe with phosphor warm-up
export const id = 'reveal';
export const name = 'reveal';
export const key = 'l';
export const params = {
  label: 'speed', map: v => 0.0002 + v * 0.00015, default: 40,
  label2: 'style', map2: v => Math.floor(v / 25), default2: 25,
};

let revealTime = 0;
let started = false;

export function reset() { revealTime = 0; started = false; }

export function apply(ctx, dt) {
  revealTime += dt * ctx.p1;
  const style = Math.floor(ctx.p2);

  let maxRow = 0, maxCol = 0;
  for (const c of ctx.chars) {
    if (c.row > maxRow) maxRow = c.row;
    if (c.col > maxCol) maxCol = c.col;
  }

  if (!started) {
    started = true;
    for (const c of ctx.chars) {
      const nx = c.col / Math.max(1, maxCol);
      const ny = c.row / Math.max(1, maxRow);
      switch (style) {
        case 0: c._revealDelay = nx * 3; break;
        case 1: c._revealDelay = ny * 3; break;
        case 2: {
          const dx = nx - 0.5, dy = ny - 0.5;
          c._revealDelay = Math.sqrt(dx * dx + dy * dy) * 4;
          break;
        }
        default: c._revealDelay = Math.random() * 3; break;
      }
    }
  }

  for (const c of ctx.chars) {
    const elapsed = revealTime - c._revealDelay;
    if (elapsed < 0) {
      c.el.style.opacity = '0';
      if (c.el.style.filter) c.el.style.filter = '';
      if (c.el.style.transform) c.el.style.transform = '';
    } else if (elapsed < 0.5) {
      const t = elapsed / 0.5;
      c.el.style.opacity = t.toFixed(2);
      c.el.style.filter = `brightness(${(1 + (1 - t) * 3).toFixed(1)})`;
      c.el.style.transform = `translate(0px,${((1 - t) * 3 * (Math.random() - 0.5)).toFixed(1)}px)`;
    } else {
      if (c.el.style.opacity !== '') c.el.style.opacity = '';
      if (c.el.style.filter) c.el.style.filter = '';
      if (c.el.style.transform) c.el.style.transform = '';
    }
  }
}
