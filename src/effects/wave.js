// Wave - sine wave animation with speed and wavelength control
export const id = 'wave';
export const name = 'wave';
export const key = '2';
export const params = {
  label: 'speed', map: v => 0.0003 + v * 0.00015, default: 35,
  label2: 'wavelength', map2: v => 0.3 + v * 0.12, default2: 40,
};

let waveTime = 0;

export function reset() { waveTime = 0; }

export function apply(ctx, dt) {
  waveTime += dt * ctx.p1;
  const wlen = ctx.p2;
  const colPhase = 0.4 / Math.max(0.1, wlen);
  const rowPhase = 0.2 / Math.max(0.1, wlen);
  const amp = 1.5 + wlen * 0.6;

  for (const c of ctx.chars) {
    const phase = c.col * colPhase + c.row * rowPhase;
    const dy = Math.sin(waveTime + phase) * amp;
    const dx = Math.cos(waveTime * 0.7 + phase * 1.3) * (amp * 0.5);

    if (wlen > 5) {
      const breathe = 1 + Math.sin(waveTime * 0.8 + phase) * 0.04 * (wlen - 5);
      c.el.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${breathe.toFixed(3)})`;
    } else if (wlen < 1.5) {
      const rot = Math.sin(waveTime * 2 + phase * 3) * (1.5 - wlen) * 8;
      c.el.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${rot.toFixed(0)}deg)`;
    } else {
      c.el.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
    }
    if (c.el.style.opacity) c.el.style.opacity = '';
  }
}
