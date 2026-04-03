import { parseAnsi, cellFgColor, cellBgColor, stripAnsi, cp437ToUnicode, parseSauce, stripSauce } from './ansi.js';
import { initBrowser, openPanel, togglePanel, navigateFile } from './browser.js';
import { initFonts, setFont, createFontSelect, getCurrentDims } from './fonts.js';
import { EFFECTS, EFFECT_MAP } from './effects/index.js';

// --- Constants ---
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const MAX_LINES = 200;
const MAX_COLS = 250;
const ALLOWED_EXTENSIONS = ['.ans', '.txt', '.asc', '.nfo', '.diz'];

// --- State ---
let chars = [];
let currentFxId = EFFECTS[0].id; // default to first registered effect
let colorEnabled = false;
let mouseX = -9999, mouseY = -9999;
let mouseDown = false;
let running = false;
let lastTime = 0;
let currentFilename = null;
let currentSauce = null;
let rawText = '';
let hasAnsiCodes = false;
let selectMode = false;

// Font dimensions - updated when font changes
let CHAR_W = 9;
let CHAR_H = 16;

// --- DOM refs ---
const artEl      = document.getElementById('art');
const infoEl     = document.getElementById('info');
const filenameEl = document.getElementById('filename');
const toastEl    = document.getElementById('toast');
const btnSelect  = document.getElementById('btn-select');
const fontSlot   = document.getElementById('font-slot');

// Param sliders (1-4)
const sliders = [1, 2, 3, 4].map(i => ({
  label: document.getElementById(`param${i > 1 ? i : ''}-label`),
  slider: document.getElementById(`param${i > 1 ? i : ''}-slider`),
  value: document.getElementById(`param${i > 1 ? i : ''}-value`),
}));
let paramVals = [50, 50, 50, 50];

// --- Toast ---
let toastTimer = null;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3000);
}

// --- Sanitize (prevent XSS from crafted files) ---
function sanitize(text) {
  return text.replace(/</g, '\u00AB').replace(/>/g, '\u00BB');
}

// --- Physics init ---
function initPhysics() {
  for (const c of chars) { c.ox = 0; c.oy = 0; c.vx = 0; c.vy = 0; }
}

// --- Render plain ASCII ---
function renderPlain(text) {
  artEl.innerHTML = '';
  chars = [];
  const lines = text.split('\n').slice(0, MAX_LINES);
  for (let r = 0; r < lines.length; r++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'row';
    const line = lines[r].slice(0, MAX_COLS);
    let i = 0;
    while (i < line.length) {
      if (line[i] === ' ') {
        let j = i;
        while (j < line.length && line[j] === ' ') j++;
        rowDiv.appendChild(document.createTextNode(' '.repeat(j - i)));
        i = j;
      } else {
        const span = document.createElement('span');
        span.className = 'ch';
        span.textContent = line[i];
        rowDiv.appendChild(span);
        chars.push({ el: span, row: r, col: i,
          cx: i * CHAR_W + CHAR_W / 2, cy: r * CHAR_H + CHAR_H / 2,
          ox: 0, oy: 0, vx: 0, vy: 0 });
        i++;
      }
    }
    artEl.appendChild(rowDiv);
  }
  initPhysics();
  updateInfo(lines.length, Math.max(...lines.map(l => l.length)), text.split('\n').length > MAX_LINES);
}

// --- Render ANSI ---
function renderAnsi(text) {
  artEl.innerHTML = '';
  chars = [];
  const wrapCol = (currentSauce && currentSauce.tinfo1 > 0) ? currentSauce.tinfo1 : 80;
  const { lines, maxCols } = parseAnsi(text, wrapCol);
  const limitedLines = lines.slice(0, MAX_LINES);
  const colLimit = Math.min(maxCols, MAX_COLS);
  for (let r = 0; r < limitedLines.length; r++) {
    const rowDiv = document.createElement('div');
    rowDiv.className = 'row';
    const line = limitedLines[r];
    for (let c = 0; c < Math.min(line.length, colLimit); c++) {
      const cell = line[c];
      if (!cell) continue;
      if (cell.char === ' ' && cell.bg === 0 && !cell.bgTrue) {
        rowDiv.appendChild(document.createTextNode(' '));
        continue;
      }
      const span = document.createElement('span');
      span.className = 'ch';
      span.textContent = cell.char;
      const fg = cellFgColor(cell);
      const bg = cellBgColor(cell);
      let style = '';
      if (fg !== '#aaaaaa') style += `color:${fg};`;
      if (bg !== '#000000') style += `background:${bg};`;
      if (style) span.setAttribute('style', style);
      rowDiv.appendChild(span);
      chars.push({ el: span, row: r, col: c,
        cx: c * CHAR_W + CHAR_W / 2, cy: r * CHAR_H + CHAR_H / 2,
        ox: 0, oy: 0, vx: 0, vy: 0 });
    }
    artEl.appendChild(rowDiv);
  }
  initPhysics();
  updateInfo(limitedLines.length, colLimit, lines.length > MAX_LINES);
}

function loadContent(text, filename) {
  rawText = text;
  hasAnsiCodes = /\x1b\[/.test(text);
  currentFilename = filename;
  if (hasAnsiCodes && colorEnabled) renderAnsi(text);
  else renderPlain(sanitize(stripAnsi(text)));
  filenameEl.textContent = filename ? ` - ${filename}` : '';
}

function rerender() {
  if (hasAnsiCodes && colorEnabled) renderAnsi(rawText);
  else renderPlain(sanitize(stripAnsi(rawText)));
}

function updateInfo(rows, cols, truncated) {
  let msg = `${cols}×${rows}`;
  if (truncated) msg += ' (truncated)';
  if (chars.length) msg += ` · ${chars.length} chars`;
  if (currentSauce) {
    const s = currentSauce;
    const parts = [];
    if (s.author) parts.push(s.author);
    if (s.group) parts.push(s.group);
    if (s.date) parts.push(`${s.date.slice(0,4)}-${s.date.slice(4,6)}-${s.date.slice(6,8)}`);
    if (parts.length) msg += ` · ${parts.join(' / ')}`;
  }
  infoEl.textContent = msg;
}

// ============================================================================
// EFFECT SYSTEM
// ============================================================================

// Build context object passed to each effect each frame
function makeCtx() {
  const fx = EFFECT_MAP[currentFxId];
  const p = fx?.params || {};
  return {
    chars, mouseX, mouseY, mouseDown, CHAR_W, CHAR_H,
    p1: p.map  ? p.map(paramVals[0])  : paramVals[0],
    p2: p.map2 ? p.map2(paramVals[1]) : paramVals[1],
    p3: p.map3 ? p.map3(paramVals[2]) : paramVals[2],
    p4: p.map4 ? p.map4(paramVals[3]) : paramVals[3],
  };
}

function clearEffects() {
  for (const c of chars) {
    if (c.el.style.transform) c.el.style.transform = '';
    if (c.el.style.opacity)   c.el.style.opacity   = '';
    if (c.el.style.filter)    c.el.style.filter     = '';
    c.ox = 0; c.oy = 0; c.vx = 0; c.vy = 0;
  }
  // Call each effect's reset() if provided
  for (const fx of EFFECTS) {
    if (fx.reset) fx.reset();
  }
}

function setEffect(id) {
  if (!EFFECT_MAP[id]) return;
  if (id !== currentFxId) clearEffects();
  currentFxId = id;

  // Set sliders to this effect's defaults
  const p = EFFECT_MAP[id].params || {};
  const defaults = [p.default ?? 50, p.default2 ?? 50, p.default3 ?? 50, p.default4 ?? 50];
  defaults.forEach((d, i) => {
    paramVals[i] = d;
    sliders[i].slider.value = d;
    sliders[i].value.textContent = d;
  });
  updateParamUI();

  // Sync button states
  document.querySelector('#bar button[data-fx].active')?.classList.remove('active');
  document.querySelector(`#bar button[data-fx="${id}"]`)?.classList.add('active');

  if (id === 'none') { clearEffects(); running = false; }
  else {
    const ef = EFFECT_MAP[id];
    if (ef.init) ef.init(makeCtx());
    ensureRunning();
  }
}

// ============================================================================
// PARAMETER UI
// ============================================================================

function updateParamUI() {
  const p = EFFECT_MAP[currentFxId]?.params || {};
  const keys = ['label', 'label2', 'label3', 'label4'];
  sliders.forEach((s, i) => {
    const lbl = p[keys[i]];
    if (lbl) {
      s.label.textContent = lbl;
      s.label.style.display = '';
      s.slider.style.display = '';
      s.value.style.display = '';
    } else {
      s.label.style.display = 'none';
      s.slider.style.display = 'none';
      s.value.style.display = 'none';
    }
  });
}

sliders.forEach((s, i) => {
  s.slider.addEventListener('input', () => {
    paramVals[i] = parseInt(s.slider.value, 10);
    s.value.textContent = paramVals[i];
  });
});

// ============================================================================
// ANIMATION LOOP
// ============================================================================

function tick(now) {
  if (!running) return;
  const dt = lastTime ? Math.min(now - lastTime, 50) : 16;
  lastTime = now;

  const fx = EFFECT_MAP[currentFxId];
  if (!fx) { running = false; return; }

  const ctx = makeCtx();
  fx.apply(ctx, dt);

  if (currentFxId === 'none') { clearEffects(); running = false; return; }

  // Effects that only need to run when mouse is present
  if (fx.idleWithoutMouse && mouseX < -1000) { running = false; return; }

  requestAnimationFrame(tick);
}

function ensureRunning() {
  if (!running) { running = true; lastTime = 0; requestAnimationFrame(tick); }
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) { running = false; }
  else if (currentFxId !== 'none') ensureRunning();
});

// ============================================================================
// INPUT
// ============================================================================

artEl.addEventListener('mousemove', (e) => {
  if (selectMode) return;
  const rect = artEl.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
  ensureRunning();
});

artEl.addEventListener('mouseleave', () => {
  mouseX = -9999; mouseY = -9999;
  const fx = EFFECT_MAP[currentFxId];
  if (fx?.idleWithoutMouse) clearEffects();
  if (currentFxId === 'string') {
    const sfx = EFFECT_MAP['string'];
    if (sfx.onMouseUp) sfx.onMouseUp();
  }
});

artEl.addEventListener('mousedown', (e) => {
  if (selectMode) return;
  mouseDown = true;
  const rect = artEl.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const fx = EFFECT_MAP[currentFxId];
  if (fx?.onMouseDown) {
    fx.onMouseDown(makeCtx(), x, y);
    ensureRunning();
  }
});

document.addEventListener('mouseup', () => {
  mouseDown = false;
  const fx = EFFECT_MAP[currentFxId];
  if (fx?.onMouseUp) fx.onMouseUp(makeCtx());
});

// --- Effect buttons (built from EFFECTS registry) ---
document.querySelectorAll('#bar button[data-fx]').forEach(btn => {
  btn.addEventListener('click', () => setEffect(btn.dataset.fx));
});

// --- Color toggle ---
const btnColor = document.getElementById('btn-color');
btnColor.addEventListener('click', () => {
  colorEnabled = !colorEnabled;
  btnColor.classList.toggle('active', colorEnabled);
  rerender();
});

// --- Invert toggle ---
let lightMode = false;
const btnInvert = document.getElementById('btn-invert');
btnInvert.addEventListener('click', () => {
  lightMode = !lightMode;
  document.body.setAttribute('data-theme', lightMode ? 'light' : '');
  btnInvert.classList.toggle('active', lightMode);
});

// --- Reset button ---
document.getElementById('btn-reset').addEventListener('click', () => {
  clearEffects();
  running = false;
  toast('reset');
});

// --- Select mode ---
function toggleSelectMode() {
  selectMode = !selectMode;
  document.body.classList.toggle('fx-mode', !selectMode);
  btnSelect.classList.toggle('active', selectMode);
  if (selectMode) { toast('text selection ON - effects paused'); running = false; clearEffects(); }
  else { toast('effects ON'); if (currentFxId !== 'none') ensureRunning(); }
}
btnSelect.addEventListener('click', toggleSelectMode);

// --- Browse ---
document.getElementById('btn-browse').addEventListener('click', togglePanel);
document.getElementById('bottom-browse').addEventListener('click', togglePanel);

// --- Keyboard shortcuts ---
const fxKeyMap = Object.fromEntries(EFFECTS.filter(e => e.key).map(e => [e.key, e.id]));

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const key = e.key.toLowerCase();

  if (fxKeyMap[key]) {
    setEffect(fxKeyMap[key]);
    e.preventDefault();
  } else if (key === 'b') {
    togglePanel(); e.preventDefault();
  } else if (key === 'arrowleft') {
    navigateFile(-1); e.preventDefault();
  } else if (key === 'arrowright') {
    navigateFile(1); e.preventDefault();
  } else if (key === 's') {
    toggleSelectMode(); e.preventDefault();
  } else if (key === 'c') {
    colorEnabled = !colorEnabled;
    btnColor.classList.toggle('active', colorEnabled);
    rerender(); e.preventDefault();
  } else if (key === 'i') {
    btnInvert.click(); e.preventDefault();
  } else if (key === 'r') {
    clearEffects(); running = false; toast('reset'); e.preventDefault();
  } else if (key === 'f') {
    const opts = fontSelect.options;
    fontSelect.selectedIndex = (fontSelect.selectedIndex + 1) % opts.length;
    setFont(fontSelect.value, applyFont);
    toast(fontSelect.options[fontSelect.selectedIndex].text);
    e.preventDefault();
  } else if (key === 'escape') {
    currentSauce = null;
    colorEnabled = false;
    btnColor.classList.remove('active');
    loadDefault();
  }
});

// --- File loading ---
function validateFile(file) {
  if (file.size > MAX_FILE_SIZE) { toast(`File too large (${(file.size/1024/1024).toFixed(1)}MB). Max 2MB.`); return false; }
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) { toast(`Unsupported file type: ${ext}`); return false; }
  return true;
}

function handleFile(file) {
  if (!validateFile(file)) return;
  const reader = new FileReader();
  reader.onload = () => {
    const bytes = new Uint8Array(reader.result);
    let nullCount = 0;
    const checkLen = Math.min(bytes.length, 1024);
    for (let i = 0; i < checkLen; i++) { if (bytes[i] === 0) nullCount++; }
    if (nullCount > checkLen * 0.1) { toast('File appears to be binary, not text.'); return; }
    currentSauce = parseSauce(bytes);
    const text = cp437ToUnicode(stripSauce(bytes));
    const fileHasAnsi = /\x1b\[/.test(text);
    if (fileHasAnsi && !colorEnabled) {
      colorEnabled = true;
      btnColor.classList.add('active');
    }
    loadContent(text, file.name);
  };
  reader.readAsArrayBuffer(file);
}

document.getElementById('file-input').addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
  e.target.value = '';
});

let dragCounter = 0;
document.body.addEventListener('dragenter', (e) => { e.preventDefault(); dragCounter++; document.body.classList.add('drag-over'); });
document.body.addEventListener('dragleave', () => { dragCounter--; if (dragCounter <= 0) { dragCounter = 0; document.body.classList.remove('drag-over'); } });
document.body.addEventListener('dragover', (e) => e.preventDefault());
document.body.addEventListener('drop', (e) => { e.preventDefault(); dragCounter = 0; document.body.classList.remove('drag-over'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });

// ============================================================================
// FONT SYSTEM
// ============================================================================

let fontSelect;

function applyFont(w, h, css) {
  CHAR_W = w; CHAR_H = h;
  artEl.style.font = css;
  artEl.style.setProperty('--char-w', w + 'px');
  artEl.style.setProperty('--char-h', h + 'px');
  artEl.style.lineHeight = '1';
  rerender();
}

// ============================================================================
// DEFAULT ART
// ============================================================================
// Tries to load ./default.ans, then ./default.txt, then falls back to inline.
const FALLBACK_ART = `
    drop a .ans or .txt file here
    or browse packs to get started
`;

async function loadDefault() {
  for (const path of ['./default.ans', './default.txt']) {
    try {
      const resp = await fetch(path);
      if (!resp.ok) continue;
      const buf = await resp.arrayBuffer();
      const bytes = new Uint8Array(buf);
      currentSauce = parseSauce(bytes);
      const text = cp437ToUnicode(stripSauce(bytes));
      const fileHasAnsi = /\x1b\[/.test(text);
      if (fileHasAnsi && !colorEnabled) {
        colorEnabled = true;
        document.getElementById('btn-color')?.classList.add('active');
      }
      loadContent(text, null);
      return;
    } catch (_) { /* not found, try next */ }
  }
  // Fallback - no default file present
  currentSauce = null;
  loadContent(FALLBACK_ART, null);
}

// ============================================================================
// INIT
// ============================================================================

(async () => {
  // Init fonts (async - loads fonts.json)
  const fontInit = await initFonts();
  CHAR_W = fontInit.dims.w;
  CHAR_H = fontInit.dims.h;
  artEl.style.font = fontInit.css;
  artEl.style.setProperty('--char-w', CHAR_W + 'px');
  artEl.style.setProperty('--char-h', CHAR_H + 'px');
  artEl.style.lineHeight = '1';

  // Insert font picker
  fontSelect = createFontSelect();
  fontSlot.appendChild(fontSelect);
  fontSelect.addEventListener('change', () => setFont(fontSelect.value, applyFont));

  // Build effect buttons dynamically from registry
  buildEffectButtons();

  // Initial state
  updateParamUI();
  document.body.classList.add('fx-mode');
  await loadDefault();

  // Set default effect active
  setEffect(currentFxId);

  // Init pack browser
  initBrowser((text, filename, sauce) => {
    currentSauce = sauce;
    const fileHasAnsi = /\x1b\[/.test(text);
    if (fileHasAnsi && !colorEnabled) {
      colorEnabled = true;
      btnColor.classList.add('active');
    }
    loadContent(text, filename);
  });
  openPanel();
})();

// Build toolbar effect buttons from the EFFECTS registry
function buildEffectButtons() {
  const bar = document.getElementById('bar');
  const sep = bar.querySelector('.sep');   // insert after first sep

  // Remove any existing data-fx buttons (in case called multiple times)
  bar.querySelectorAll('button[data-fx]').forEach(b => b.remove());

  // Build buttons before the second separator
  const separators = bar.querySelectorAll('.sep');
  const insertBefore = separators[1] || null; // before "reset" separator

  for (const fx of EFFECTS) {
    const btn = document.createElement('button');
    btn.dataset.fx = fx.id;
    btn.textContent = fx.name;
    if (fx.key) btn.title = `[${fx.key}]`;
    btn.addEventListener('click', () => setEffect(fx.id));
    if (insertBefore) {
      bar.insertBefore(btn, insertBefore);
    } else {
      bar.appendChild(btn);
    }
  }
}
