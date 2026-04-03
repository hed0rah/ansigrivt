// Tear - split the art along the mouse, bleed from the wound
export const id = 'tear';
export const name = 'tear';
export const key = 'z';

export const params = {
  label:  'force',  map:  v => v * 0.4,    default:  60,
  label2: 'bleed',  map2: v => v * 0.003,  default2: 70,
};


let overlay = null;
let drops   = [];
let jag     = [];    // per-row jagged tear offset
let tinted  = [];    // char elements we've colored, so reset() can restore them

const DRIP = ['|', ':', ';', '.', ',', '`'];

export function init() {
  const art = document.getElementById('art');
  overlay = document.createElement('div');
  overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;';
  art.appendChild(overlay);
}

export function reset() {
  overlay?.remove();
  overlay = null;
  drops = [];
  jag   = [];
  for (const el of tinted) el.style.color = '';
  tinted = [];
}

export function apply(ctx, dt) {
  if (!overlay) init();
  const { chars, mouseX, CHAR_W, CHAR_H, p1: force, p2: bleedRate } = ctx;

  // Lazily grow jagged offsets as rows are discovered
  const maxRow = Math.floor((chars[chars.length - 1]?.cy ?? 0) / CHAR_H) + 1;
  while (jag.length < maxRow) jag.push(0);
  for (let i = 0; i < jag.length; i++) {
    jag[i] += (Math.random() - 0.5) * 1.4;
    jag[i] *= 0.93;
  }

  const tearWidth = CHAR_W * (4 + force * 0.3);
  const newTinted = [];

  for (const c of chars) {
    const row    = Math.floor(c.cy / CHAR_H);
    const tearX  = mouseX + (jag[row] || 0);
    const dx     = c.cx - tearX;
    const dist   = Math.abs(dx);

    // Push chars away from the tear line
    const push = dist < tearWidth
      ? Math.sign(dx || 1) * force * CHAR_W * (1 - dist / tearWidth) * 0.6
      : 0;
    c.ox += (push - c.ox) * 0.12;
    c.el.style.transform = Math.abs(c.ox) > 0.3
      ? `translateX(${c.ox.toFixed(1)}px)` : '';

    // Tint chars near the wound red
    if (dist < CHAR_W * 3) {
      const t = 1 - dist / (CHAR_W * 3);
      c.el.style.color = `rgb(${Math.round(160 + t * 95)},${Math.round(20 * (1 - t))},${Math.round(20 * (1 - t))})`;
      newTinted.push(c.el);

      // Spawn blood drips
      if (Math.random() < bleedRate * dt) spawnDrop(c.cx + c.ox, c.cy, CHAR_W, CHAR_H);
    } else if (c.el.style.color) {
      c.el.style.color = '';
    }
  }

  // Replace tinted list so reset() only touches currently-tinted chars
  for (const el of tinted) {
    if (!newTinted.includes(el)) el.style.color = '';
  }
  tinted = newTinted;

  // Update blood drops - simple gravity + fade
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.vy   = Math.min(d.vy + 0.2, 10);
    d.y   += d.vy;
    d.life -= 0.007;
    d.el.style.top     = d.y.toFixed(1) + 'px';
    d.el.style.opacity = Math.max(0, d.life).toFixed(2);
    if (d.life <= 0) { d.el.remove(); drops.splice(i, 1); }
  }
}

function spawnDrop(x, y, cw, ch) {
  if (drops.length >= 300) return;
  const el      = document.createElement('span');
  el.textContent = DRIP[Math.floor(Math.random() * DRIP.length)];
  el.style.cssText = `position:absolute;left:${x.toFixed(0)}px;top:${y.toFixed(0)}px;`
    + `color:#c00;font:inherit;line-height:1;pointer-events:none;width:${cw}px;text-align:center;`;
  overlay.appendChild(el);
  drops.push({ el, y, vy: Math.random() * 1.5 + 0.5, life: 1 });
}
