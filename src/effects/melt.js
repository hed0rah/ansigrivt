// Melt - chars drip downward like hot wax / DOS virus
export const id = 'melt';
export const name = 'melt';
export const key = '7';
export const params = {
  label: 'speed', map: v => 0.0001 + v * 0.00008, default: 50,
  label2: 'spread', map2: v => v * 0.06, default2: 25,
};

let meltTime = 0;
let started = false;

export function reset() { meltTime = 0; started = false; }

export function apply(ctx, dt) {
  meltTime += dt * ctx.p1;
  const spread = ctx.p2;

  if (!started) {
    started = true;
    for (const c of ctx.chars) {
      const seed = Math.sin(c.row * 73.17 + c.col * 37.91) * 43758.5453;
      c._meltDelay = (seed - Math.floor(seed)) * 3;
      c._meltSpeed = 0.3 + (seed * 7 - Math.floor(seed * 7)) * 0.7;
      c._meltDir = (seed * 19 - Math.floor(seed * 19)) - 0.5;
    }
  }

  for (const c of ctx.chars) {
    if (meltTime < c._meltDelay) continue;
    const elapsed = meltTime - c._meltDelay;
    const drip = elapsed * elapsed * c._meltSpeed * 2;
    const drift = c._meltDir * spread * elapsed * 1.5;
    const wobble = Math.sin(elapsed * 3 + c.col * 0.8) * spread * 0.3;
    const tx = drift + wobble;

    if (spread > 1.5 || drip > 50) {
      const scaleX = 1 + Math.abs(tx) * 0.002;
      const scaleY = 1 + Math.min(drip * 0.001, 0.5);
      c.el.style.transform = `translate(${tx.toFixed(1)}px,${drip.toFixed(1)}px) scale(${scaleX.toFixed(2)},${scaleY.toFixed(2)})`;
    } else {
      c.el.style.transform = `translate(${tx.toFixed(1)}px,${drip.toFixed(1)}px)`;
    }
    c.el.style.opacity = Math.max(0, 1 - drip / 500).toFixed(2);
  }
}
