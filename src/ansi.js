// ANSI escape code parser + CP437 character mapping + SAUCE metadata
// Supports: SGR colors (16 standard + bright), cursor positioning basics

// --- SAUCE record parsing (128 bytes at end of BBS art files) ---
// See: https://www.acid.org/info/sauce/sauce.htm
export function parseSauce(bytes) {
  if (bytes.length < 128) return null;
  const sauceOffset = bytes.length - 128;
  // Check for "SAUCE" magic at offset
  if (bytes[sauceOffset] !== 0x53 || bytes[sauceOffset+1] !== 0x41 ||
      bytes[sauceOffset+2] !== 0x55 || bytes[sauceOffset+3] !== 0x43 ||
      bytes[sauceOffset+4] !== 0x45) return null;

  const dec = new TextDecoder('ascii');
  const str = (off, len) => dec.decode(bytes.slice(off, off + len)).replace(/\0/g, '').trim();

  return {
    title:  str(sauceOffset + 7, 35),
    author: str(sauceOffset + 42, 20),
    group:  str(sauceOffset + 62, 20),
    date:   str(sauceOffset + 82, 8),   // YYYYMMDD
    tinfo1: bytes[sauceOffset + 96] | (bytes[sauceOffset + 97] << 8), // width (columns)
    tinfo2: bytes[sauceOffset + 98] | (bytes[sauceOffset + 99] << 8), // height (lines)
  };
}

// Strip SAUCE record + EOF marker from raw bytes, return art-only portion
export function stripSauce(bytes) {
  // Look for 0x1A EOF marker (standard) or SAUCE magic directly
  const sauceOffset = bytes.length - 128;
  if (sauceOffset >= 0 &&
      bytes[sauceOffset] === 0x53 && bytes[sauceOffset+1] === 0x41 &&
      bytes[sauceOffset+2] === 0x55 && bytes[sauceOffset+3] === 0x43 &&
      bytes[sauceOffset+4] === 0x45) {
    // Walk back from SAUCE to find EOF (0x1A) marker(s)
    let end = sauceOffset;
    while (end > 0 && bytes[end - 1] === 0x1A) end--;
    return bytes.slice(0, end);
  }
  // No SAUCE - check for trailing 0x1A anyway
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0x1A) end--;
  if (end < bytes.length) return bytes.slice(0, end);
  return bytes;
}

// CP437 to Unicode mapping (characters 0x00-0xFF)
// Standard ASCII (0x20-0x7E) maps 1:1, but the extended set (0x80-0xFF)
// has box-drawing, accented chars, etc.
const CP437_HIGH = [
  '\u00C7','\u00FC','\u00E9','\u00E2','\u00E4','\u00E0','\u00E5','\u00E7', // 80-87
  '\u00EA','\u00EB','\u00E8','\u00EF','\u00EE','\u00EC','\u00C4','\u00C5', // 88-8F
  '\u00C9','\u00E6','\u00C6','\u00F4','\u00F6','\u00F2','\u00FB','\u00F9', // 90-97
  '\u00FF','\u00D6','\u00DC','\u00A2','\u00A3','\u00A5','\u20A7','\u0192', // 98-9F
  '\u00E1','\u00ED','\u00F3','\u00FA','\u00F1','\u00D1','\u00AA','\u00BA', // A0-A7
  '\u00BF','\u2310','\u00AC','\u00BD','\u00BC','\u00A1','\u00AB','\u00BB', // A8-AF
  '\u2591','\u2592','\u2593','\u2502','\u2524','\u2561','\u2562','\u2556', // B0-B7
  '\u2555','\u2563','\u2551','\u2557','\u255D','\u255C','\u255B','\u2510', // B8-BF
  '\u2514','\u2534','\u252C','\u251C','\u2500','\u253C','\u255E','\u255F', // C0-C7
  '\u255A','\u2554','\u2569','\u2566','\u2560','\u2550','\u256C','\u2567', // C8-CF
  '\u2568','\u2564','\u2565','\u2559','\u2558','\u2552','\u2553','\u256B', // D0-D7
  '\u256A','\u2518','\u250C','\u2588','\u2584','\u258C','\u2590','\u2580', // D8-DF
  '\u03B1','\u00DF','\u0393','\u03C0','\u03A3','\u03C3','\u00B5','\u03C4', // E0-E7
  '\u03A6','\u0398','\u03A9','\u03B4','\u221E','\u03C6','\u03B5','\u2229', // E8-EF
  '\u2261','\u00B1','\u2265','\u2264','\u2320','\u2321','\u00F7','\u2248', // F0-F7
  '\u00B0','\u2219','\u00B7','\u221A','\u207F','\u00B2','\u25A0','\u00A0', // F8-FF
];

// Convert a CP437 byte array to Unicode string
export function cp437ToUnicode(bytes) {
  let result = '';
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b >= 0x20 && b <= 0x7E) {
      result += String.fromCharCode(b);
    } else if (b === 0x0A) {
      result += '\n';
    } else if (b === 0x0D) {
      // CR - skip if followed by LF
      if (i + 1 < bytes.length && bytes[i + 1] === 0x0A) continue;
      result += '\n';
    } else if (b === 0x09) {
      result += '\t';
    } else if (b === 0x1B) {
      result += '\x1b'; // pass through ESC for ANSI parsing
    } else if (b >= 0x80) {
      result += CP437_HIGH[b - 0x80];
    } else if (b === 0x00) {
      result += ' ';
    } else {
      // Low control chars (1-8, 11-12, 14-31) → CP437 glyphs
      // These are smiley faces, card suits, etc. in CP437
      const cp437Low = [
        ' ', '\u263A', '\u263B', '\u2665', '\u2666', '\u2663', '\u2660', '\u2022',
        '\u25D8', '\u25CB', '\u25D9', '\u2642', '\u2640', '\u266A', '\u266B', '\u263C',
        '\u25BA', '\u25C4', '\u2195', '\u203C', '\u00B6', '\u00A7', '\u25AC', '\u21A8',
        '\u2191', '\u2193', '\u2192', '\u2190', '\u221F', '\u2194', '\u25B2', '\u25BC',
      ];
      result += cp437Low[b] || ' ';
    }
  }
  return result;
}

// Standard ANSI 16-color palette (dark + bright)
const ANSI_COLORS = [
  '#000000', '#aa0000', '#00aa00', '#aa5500', '#0000aa', '#aa00aa', '#00aaaa', '#aaaaaa', // 0-7 dark
  '#555555', '#ff5555', '#55ff55', '#ffff55', '#5555ff', '#ff55ff', '#55ffff', '#ffffff', // 8-15 bright
];

// 256-color palette: 0-15 = standard, 16-231 = 6x6x6 cube, 232-255 = grayscale
function color256(n) {
  if (n < 16) return ANSI_COLORS[n];
  if (n < 232) {
    const idx = n - 16;
    const r = Math.floor(idx / 36);
    const g = Math.floor((idx % 36) / 6);
    const b = idx % 6;
    const toHex = v => (v === 0 ? 0 : 55 + v * 40).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }
  const v = (8 + (n - 232) * 10).toString(16).padStart(2, '0');
  return `#${v}${v}${v}`;
}

// Parse ANSI text into an array of {char, fg, bg, bold, blink} objects per line
// Returns { lines: [[cell, cell, ...], ...], maxCols }
// wrapCol: auto-wrap at this column (BBS standard = 80). 0 = no wrap.
export function parseAnsi(text, wrapCol = 80) {
  const lines = [[]];
  let curLine = 0;
  let curCol = 0;
  let fg = 7;       // default light gray
  let bg = 0;       // default black
  let bold = false;
  let blink = false;
  let fgTrue = null; // for 256/truecolor
  let bgTrue = null;

  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    if (ch === '\x1b' && text[i + 1] === '[') {
      // Parse CSI sequence
      i += 2;
      let params = '';
      while (i < text.length && text[i] >= '0' && text[i] <= '9' || text[i] === ';') {
        params += text[i];
        i++;
      }
      const cmd = text[i] || '';
      i++;

      const nums = params.split(';').map(s => parseInt(s, 10) || 0);

      if (cmd === 'm') {
        // SGR - Select Graphic Rendition
        if (nums.length === 0 || (nums.length === 1 && nums[0] === 0)) {
          fg = 7; bg = 0; bold = false; blink = false; fgTrue = null; bgTrue = null;
          continue;
        }
        for (let j = 0; j < nums.length; j++) {
          const n = nums[j];
          if (n === 0) { fg = 7; bg = 0; bold = false; blink = false; fgTrue = null; bgTrue = null; }
          else if (n === 1) { bold = true; fgTrue = null; }
          else if (n === 5 || n === 6) { blink = true; }
          else if (n === 22) { bold = false; }
          else if (n === 25) { blink = false; }
          else if (n >= 30 && n <= 37) { fg = n - 30; fgTrue = null; }
          else if (n === 38) {
            // Extended fg color
            if (nums[j + 1] === 5 && nums[j + 2] != null) {
              fgTrue = color256(nums[j + 2]); j += 2;
            } else if (nums[j + 1] === 2 && nums[j + 4] != null) {
              fgTrue = `rgb(${nums[j+2]},${nums[j+3]},${nums[j+4]})`; j += 4;
            }
          }
          else if (n === 39) { fg = 7; fgTrue = null; }
          else if (n >= 40 && n <= 47) { bg = n - 40; bgTrue = null; }
          else if (n === 48) {
            if (nums[j + 1] === 5 && nums[j + 2] != null) {
              bgTrue = color256(nums[j + 2]); j += 2;
            } else if (nums[j + 1] === 2 && nums[j + 4] != null) {
              bgTrue = `rgb(${nums[j+2]},${nums[j+3]},${nums[j+4]})`; j += 4;
            }
          }
          else if (n === 49) { bg = 0; bgTrue = null; }
          else if (n >= 90 && n <= 97) { fg = n - 90 + 8; fgTrue = null; }
          else if (n >= 100 && n <= 107) { bg = n - 100 + 8; bgTrue = null; }
        }
      } else if (cmd === 'A') {
        // Cursor up
        curLine = Math.max(0, curLine - (nums[0] || 1));
      } else if (cmd === 'B') {
        // Cursor down
        curLine += (nums[0] || 1);
        while (lines.length <= curLine) lines.push([]);
      } else if (cmd === 'C') {
        // Cursor forward
        curCol += (nums[0] || 1);
      } else if (cmd === 'D') {
        // Cursor back
        curCol = Math.max(0, curCol - (nums[0] || 1));
      } else if (cmd === 'H' || cmd === 'f') {
        // Cursor position
        curLine = Math.max(0, (nums[0] || 1) - 1);
        curCol = Math.max(0, (nums[1] || 1) - 1);
        while (lines.length <= curLine) lines.push([]);
      } else if (cmd === 'J') {
        // Erase display (simplified - just clear from cursor)
        if (nums[0] === 2) {
          lines.length = 0;
          lines.push([]);
          curLine = 0;
          curCol = 0;
        }
      } else if (cmd === 'K') {
        // Erase line from cursor
        if (lines[curLine]) lines[curLine].length = curCol;
      }
      // Skip other CSI commands
      continue;
    }

    if (ch === '\n') {
      curLine++;
      curCol = 0;
      while (lines.length <= curLine) lines.push([]);
      i++;
      continue;
    }

    if (ch === '\r') {
      curCol = 0;
      i++;
      continue;
    }

    if (ch === '\t') {
      const tabStop = ((curCol >> 3) + 1) << 3;
      while (curCol < tabStop) {
        ensureCell(lines, curLine, curCol, ' ', fg, bg, bold, blink, fgTrue, bgTrue);
        curCol++;
      }
      i++;
      continue;
    }

    // Regular character
    while (lines.length <= curLine) lines.push([]);
    ensureCell(lines, curLine, curCol, ch, fg, bg, bold, blink, fgTrue, bgTrue);
    curCol++;

    // Auto-wrap at terminal width (BBS standard: 80 columns)
    if (wrapCol > 0 && curCol >= wrapCol) {
      curCol = 0;
      curLine++;
      while (lines.length <= curLine) lines.push([]);
    }

    i++;
  }

  let maxCols = 0;
  for (const line of lines) {
    if (line.length > maxCols) maxCols = line.length;
  }

  return { lines, maxCols };
}

function ensureCell(lines, row, col, ch, fg, bg, bold, blink, fgTrue, bgTrue) {
  const line = lines[row];
  // Fill gaps with spaces
  while (line.length < col) {
    line.push({ char: ' ', fg: 7, bg: 0, bold: false, blink: false, fgTrue: null, bgTrue: null });
  }
  line[col] = { char: ch, fg, bg, bold, blink, fgTrue, bgTrue };
}

// Resolve a cell's foreground color to a CSS color string
export function cellFgColor(cell) {
  if (cell.fgTrue) return cell.fgTrue;
  const idx = cell.bold && cell.fg < 8 ? cell.fg + 8 : cell.fg;
  return ANSI_COLORS[idx];
}

// Resolve a cell's background color to a CSS color string
export function cellBgColor(cell) {
  if (cell.bgTrue) return cell.bgTrue;
  return ANSI_COLORS[cell.bg];
}

// Strip all ANSI escape codes from text, returning plain text
export function stripAnsi(text) {
  return text
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .replace(/\x1b[^[\x1b]*/, '');
}
