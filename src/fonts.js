// Font management - DOS BIOS bitmap fonts
//
// Fonts live in the fonts/ directory as Web437_*.woff files.
// The available font list is defined in fonts/fonts.json.
// To add fonts: drop .woff files in fonts/ and add entries to fonts/fonts.json.
// To remove fonts: remove entries from fonts/fonts.json (or delete files).
//
// fonts/fonts.json format:
// [
//   { "id": "IBM_VGA_9x16", "name": "IBM VGA 9×16", "w": 9, "h": 16 },
//   ...
// ]

const FONTS_PATH = './fonts';
const FONTS_JSON = `${FONTS_PATH}/fonts.json`;
const DEFAULT_FONT_ID = 'IBM_VGA_9x16';

let catalog = [];       // loaded from fonts.json
let currentFont = null;
let loadedFonts = new Set();

function fontFamily(id) { return `dos-${id}`; }

function ensureFontFace(entry) {
  if (entry.id === '__courier__' || loadedFonts.has(entry.id)) return;
  const family = fontFamily(entry.id);
  const url = `${FONTS_PATH}/Web437_${entry.id}.woff`;
  const style = document.createElement('style');
  style.textContent = `@font-face { font-family: "${family}"; src: url("${url}") format("woff"); font-weight: normal; font-style: normal; font-display: block; }`;
  document.head.appendChild(style);
  loadedFonts.add(entry.id);
}

function getFontCSS(entry) {
  if (entry.id === '__courier__') return '12px "Courier New", monospace';
  return `${entry.h}px "${fontFamily(entry.id)}", monospace`;
}

function getCellDims(entry) {
  if (entry.id === '__courier__') return { w: 7.2, h: 14.4 };
  return { w: entry.w, h: entry.h };
}

export function setFont(id, callback) {
  const entry = catalog.find(f => f.id === id);
  if (!entry) return;
  currentFont = entry;
  ensureFontFace(entry);
  const dims = getCellDims(entry);
  if (callback) callback(dims.w, dims.h, getFontCSS(entry));
}

export function getCurrentDims() {
  if (!currentFont) return { w: 9, h: 16 };
  return getCellDims(currentFont);
}

export function createFontSelect() {
  const select = document.createElement('select');
  select.id = 'font-select';
  select.title = 'DOS font [f]';
  for (const entry of catalog) {
    const opt = document.createElement('option');
    opt.value = entry.id;
    opt.textContent = entry.name;
    if (entry.id === DEFAULT_FONT_ID) opt.selected = true;
    select.appendChild(opt);
  }
  return select;
}

// Load fonts.json and initialize the default font.
// Returns { dims, css } for the default font.
export async function initFonts() {
  try {
    const resp = await fetch(FONTS_JSON);
    if (resp.ok) {
      catalog = await resp.json();
    } else {
      throw new Error(resp.status);
    }
  } catch (e) {
    console.warn('Could not load fonts/fonts.json, falling back to Courier New:', e);
    catalog = [{ id: '__courier__', name: 'Courier New (web)', w: 0, h: 0 }];
  }

  // Ensure Courier fallback is always present
  if (!catalog.find(f => f.id === '__courier__')) {
    catalog.push({ id: '__courier__', name: 'Courier New (web)', w: 0, h: 0 });
  }

  const entry = catalog.find(f => f.id === DEFAULT_FONT_ID) || catalog[0];
  currentFont = entry;
  ensureFontFace(entry);
  return { dims: getCellDims(entry), css: getFontCSS(entry) };
}

export { catalog as FONT_CATALOG, DEFAULT_FONT_ID as DEFAULT_FONT };
