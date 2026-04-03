// Pack browser - loads packs.json, builds the sidebar, handles navigation
import { cp437ToUnicode, parseSauce, stripSauce } from './ansi.js';

const PACKS_JSON = './packs/packs.json';
const PACKS_BASE = './packs/extracted';

// --- State ---
let manifest = null;         // full packs.json
let flatFiles = [];          // [{year, pack, file, idx}] for arrow-key nav
let currentIdx = -1;         // position in flatFiles
let onFileLoad = null;       // callback: (text, filename, sauce) => void

// --- DOM refs ---
const panel     = document.getElementById('panel');
const panelList = document.getElementById('panel-list');
const search    = document.getElementById('panel-search');
const navPrev   = document.getElementById('nav-prev');
const navNext   = document.getElementById('nav-next');
const navPos    = document.getElementById('nav-pos');

// --- Public: init browser, provide callback for when a file is loaded ---
export async function initBrowser(onLoad) {
  onFileLoad = onLoad;

  try {
    const resp = await fetch(PACKS_JSON);
    if (!resp.ok) throw new Error(`${resp.status}`);
    manifest = await resp.json();
  } catch (e) {
    console.warn('Could not load packs.json:', e);
    return;
  }

  buildFlatIndex();
  renderPanel();
  setupNav();
  handleHash();

  // Listen for hash changes (back/forward)
  window.addEventListener('hashchange', handleHash);
}

// --- Build flat file list for sequential nav ---
function buildFlatIndex() {
  flatFiles = [];
  if (!manifest) return;
  for (const pack of manifest.packs) {
    for (const file of pack.files) {
      flatFiles.push({
        year: pack.year,
        pack: pack.name,
        file: file,
      });
    }
  }
}

// --- Render the panel tree ---
function renderPanel(filter = '') {
  panelList.innerHTML = '';
  if (!manifest) return;

  const lowerFilter = filter.toLowerCase();

  // Group by year (descending)
  const years = [...manifest.years].reverse();
  for (const year of years) {
    const packs = manifest.packs.filter(p => p.year === year);
    let yearHasMatch = false;

    // Build pack entries first to check if anything matches
    const packEls = [];
    for (const pack of packs) {
      const matchingFiles = lowerFilter
        ? pack.files.filter(f =>
            f.name.toLowerCase().includes(lowerFilter) ||
            (f.artist || '').toLowerCase().includes(lowerFilter) ||
            (f.group || '').toLowerCase().includes(lowerFilter) ||
            pack.name.toLowerCase().includes(lowerFilter))
        : pack.files;

      if (matchingFiles.length === 0) continue;
      yearHasMatch = true;

      const packDiv = document.createElement('div');

      const nameDiv = document.createElement('div');
      nameDiv.className = 'pack-name';
      nameDiv.innerHTML = `<span>${pack.name}</span><span class="count">${matchingFiles.length}</span>`;

      const filesDiv = document.createElement('div');
      filesDiv.className = 'pack-files';

      for (const file of matchingFiles) {
        const fileDiv = document.createElement('div');
        fileDiv.className = 'pack-file';
        fileDiv.dataset.year = year;
        fileDiv.dataset.pack = pack.name;
        fileDiv.dataset.file = file.name;

        let label = file.name;
        if (file.artist) label += ` · ${file.artist}`;
        fileDiv.textContent = label;
        fileDiv.title = [
          file.title || file.name,
          file.artist ? `by ${file.artist}` : '',
          file.group || '',
          file.cols ? `${file.cols}x${file.rows || '?'}` : '',
        ].filter(Boolean).join(' - ');

        fileDiv.addEventListener('click', () => {
          loadPackFile(year, pack.name, file.name);
        });

        filesDiv.appendChild(fileDiv);
      }

      nameDiv.addEventListener('click', () => {
        filesDiv.classList.toggle('open');
      });

      packDiv.appendChild(nameDiv);
      packDiv.appendChild(filesDiv);
      packEls.push({ el: packDiv, filesDiv });
    }

    if (!yearHasMatch) continue;

    const yearDiv = document.createElement('div');
    yearDiv.className = 'pack-year';
    const yearPacks = packs.reduce((n, p) => n + p.fileCount, 0);
    yearDiv.innerHTML = `<span>${year}</span><span class="count">${yearPacks}</span>`;

    const groupDiv = document.createElement('div');
    groupDiv.className = 'pack-group';

    // Auto-open if filtering or only 1-2 years
    if (lowerFilter || years.length <= 2) {
      groupDiv.classList.add('open');
      if (lowerFilter) {
        packEls.forEach(pe => pe.filesDiv.classList.add('open'));
      }
    }

    yearDiv.addEventListener('click', () => {
      groupDiv.classList.toggle('open');
    });

    for (const pe of packEls) {
      groupDiv.appendChild(pe.el);
    }

    panelList.appendChild(yearDiv);
    panelList.appendChild(groupDiv);
  }
}

// --- Search ---
search.addEventListener('input', () => {
  renderPanel(search.value.trim());
});

// --- Load a file from the extracted packs ---
export async function loadPackFile(year, packName, fileName) {
  const url = `${PACKS_BASE}/${year}/${packName}/${encodeURIComponent(fileName)}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`${resp.status} ${resp.statusText}`);
    const buf = await resp.arrayBuffer();
    const bytes = new Uint8Array(buf);

    const sauce = parseSauce(bytes);
    const artBytes = stripSauce(bytes);
    const text = cp437ToUnicode(artBytes);

    // Update hash without triggering hashchange handler
    const hash = `#${year}/${packName}/${fileName}`;
    if (window.location.hash !== hash) {
      history.pushState(null, '', hash);
    }

    // Update flat index position
    currentIdx = flatFiles.findIndex(f =>
      f.year === year && f.pack === packName && f.file.name === fileName
    );
    updateNavPos();
    highlightActive(year, packName, fileName);

    if (onFileLoad) {
      onFileLoad(text, fileName, sauce);
    }
  } catch (e) {
    console.error('Failed to load pack file:', e);
  }
}

// --- Navigation ---
function setupNav() {
  navPrev.addEventListener('click', () => navigateFile(-1));
  navNext.addEventListener('click', () => navigateFile(1));
}

export function navigateFile(dir) {
  if (flatFiles.length === 0) return;
  if (currentIdx < 0) {
    currentIdx = dir > 0 ? 0 : flatFiles.length - 1;
  } else {
    currentIdx = (currentIdx + dir + flatFiles.length) % flatFiles.length;
  }
  const f = flatFiles[currentIdx];
  loadPackFile(f.year, f.pack, f.file.name);
}

function updateNavPos() {
  if (currentIdx >= 0 && flatFiles.length > 0) {
    navPos.textContent = `${currentIdx + 1} / ${flatFiles.length}`;
  } else {
    navPos.textContent = '';
  }
}

// --- Highlight active file in panel ---
function highlightActive(year, packName, fileName) {
  // Remove old active
  panel.querySelectorAll('.pack-file.active').forEach(el => el.classList.remove('active'));

  // Find and highlight new
  const el = panel.querySelector(
    `.pack-file[data-year="${year}"][data-pack="${packName}"][data-file="${fileName}"]`
  );
  if (el) {
    el.classList.add('active');
    // Make sure parent containers are open
    const filesDiv = el.parentElement;
    const groupDiv = filesDiv?.parentElement?.parentElement;
    if (filesDiv) filesDiv.classList.add('open');
    if (groupDiv) groupDiv.classList.add('open');
    // Scroll into view
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

// --- Hash routing ---
function handleHash() {
  const hash = window.location.hash.slice(1); // remove #
  if (!hash) return;

  const parts = hash.split('/');
  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10);
    const packName = parts[1];
    const fileName = decodeURIComponent(parts.slice(2).join('/'));
    loadPackFile(year, packName, fileName);
    // Auto-open panel
    openPanel();
  }
}

// --- Panel toggle ---
export function openPanel() {
  panel.classList.add('open');
  document.body.classList.add('panel-open');
}

export function closePanel() {
  panel.classList.remove('open');
  document.body.classList.remove('panel-open');
}

export function togglePanel() {
  if (panel.classList.contains('open')) {
    closePanel();
  } else {
    openPanel();
  }
}

document.getElementById('panel-close').addEventListener('click', closePanel);
