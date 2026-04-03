// Glitch - VCR / CRT corruption with tear bands, static, and vertical roll
export const id = 'glitch';
export const name = 'glitch';
export const key = 'e';
export const params = {
  label: 'severity', map: v => 0.3 + v * 0.12, default: 65,
  label2: 'freq', map2: v => 0.003 + v * 0.001, default2: 55,
};

let glitchTime = 0;
let tears = [];
let burst = 0;
let cooldown = 0;
let statics = [];
let hold = null;
let rollOffset = 0;
let rollActive = false;

export function reset() {
  glitchTime = 0; tears = []; burst = 0; cooldown = 0;
  statics = []; hold = null; rollOffset = 0; rollActive = false;
}

export function apply(ctx, dt) {
  glitchTime += dt;
  const intensity = ctx.p1;
  const freq = ctx.p2;

  if (burst > 0) {
    burst -= dt;
  } else if (cooldown > 0) {
    cooldown -= dt;
    tears = tears.filter(t => { t.ttl -= dt; return t.ttl > 0; });
    statics = statics.filter(s => { s.ttl -= dt; return s.ttl > 0; });
    if (hold) { hold.ttl -= dt; if (hold.ttl <= 0) hold = null; }
  } else {
    if (Math.random() < freq * dt * 0.5) {
      burst = 80 + Math.random() * 300 * intensity;
      cooldown = 200 + Math.random() * 800 / Math.max(0.5, intensity);
    }
  }

  let maxRow = 0;
  for (const c of ctx.chars) { if (c.row > maxRow) maxRow = c.row; }

  if (burst > 0) {
    if (Math.random() < 0.15 * intensity) {
      tears.push({
        startRow: Math.floor(Math.random() * maxRow),
        height: 1 + Math.floor(Math.random() * Math.min(8, 2 + intensity * 2)),
        shiftX: (Math.random() - 0.5) * intensity * 30,
        shiftY: Math.random() < 0.3 ? (Math.random() - 0.5) * intensity * 4 : 0,
        ttl: 30 + Math.random() * 150,
        maxTtl: 30 + Math.random() * 150,
        colorShift: Math.random() < 0.4 * Math.min(1, intensity / 4),
      });
    }
    if (Math.random() < 0.1 * intensity && ctx.chars.length > 0) {
      const count = Math.floor(1 + Math.random() * intensity * 3);
      for (let i = 0; i < count; i++) {
        const c = ctx.chars[Math.floor(Math.random() * ctx.chars.length)];
        statics.push({ row: c.row, col: c.col, ttl: 20 + Math.random() * 80 });
      }
    }
    if (!hold && Math.random() < 0.02 * intensity) {
      const sr = Math.floor(Math.random() * maxRow);
      hold = { startRow: sr, endRow: Math.min(maxRow, sr + 2 + Math.floor(Math.random() * intensity * 2)),
               frozenX: (Math.random() - 0.5) * intensity * 50, ttl: 60 + Math.random() * 200 };
    }
    if (intensity > 4 && !rollActive && Math.random() < 0.008 * (intensity - 4)) {
      rollActive = true; rollOffset = 0;
    }
  }

  if (rollActive) {
    rollOffset += intensity * 0.8;
    if (rollOffset > ctx.CHAR_H * maxRow) { rollActive = false; rollOffset = 0; }
  }

  const rowShift = {};
  for (const tear of tears) {
    const fade = Math.min(1, tear.ttl / (tear.maxTtl * 0.3));
    for (let r = tear.startRow; r < tear.startRow + tear.height; r++) {
      if (!rowShift[r]) rowShift[r] = { x: 0, y: 0, color: false };
      rowShift[r].x += tear.shiftX * fade;
      rowShift[r].y += tear.shiftY * fade;
      if (tear.colorShift) rowShift[r].color = true;
    }
  }
  if (hold) {
    for (let r = hold.startRow; r <= hold.endRow; r++) {
      if (!rowShift[r]) rowShift[r] = { x: 0, y: 0, color: false };
      rowShift[r].x = hold.frozenX;
    }
  }

  const staticSet = new Set(statics.map(s => s.row * 10000 + s.col));

  for (const c of ctx.chars) {
    const rs = rowShift[c.row];
    const isStatic = staticSet.has(c.row * 10000 + c.col);
    const rollY = rollActive ? rollOffset : 0;

    if (rs || isStatic || rollY) {
      let tx = rs ? rs.x : 0;
      let ty = (rs ? rs.y : 0) + rollY;
      if (isStatic) {
        tx += (Math.random() - 0.5) * 8;
        ty += (Math.random() - 0.5) * 4;
        c.el.style.opacity = Math.random() < 0.5 ? '0' : (0.3 + Math.random() * 0.7).toFixed(2);
      } else if (c.el.style.opacity) {
        c.el.style.opacity = '';
      }
      c.el.style.transform = `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px)`;
      if (rs && rs.color && !isStatic) {
        const hue = Math.abs(rs.x) > 10 ? Math.sign(rs.x) * 40 : 0;
        const sat = 1 + Math.abs(rs.x) * 0.02;
        c.el.style.filter = `hue-rotate(${hue}deg) saturate(${sat.toFixed(1)})`;
      } else if (c.el.style.filter) {
        c.el.style.filter = '';
      }
    } else {
      if (c.el.style.transform) c.el.style.transform = '';
      if (c.el.style.opacity) c.el.style.opacity = '';
      if (c.el.style.filter) c.el.style.filter = '';
    }
  }

  tears = tears.filter(t => { t.ttl -= dt; return t.ttl > 0; });
  statics = statics.filter(s => { s.ttl -= dt; return s.ttl > 0; });
  if (hold) { hold.ttl -= dt; if (hold.ttl <= 0) hold = null; }
}
