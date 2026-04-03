#!/usr/bin/env python3
"""
Generate fonts/fonts.json from Web437_*.woff files in the fonts/ directory.

The font ID and dimensions are extracted from the filename:
  Web437_IBM_VGA_9x16.woff  →  id="IBM_VGA_9x16", w=9, h=16
  Web437_IBM_BIOS.woff       →  id="IBM_BIOS", w=8, h=8 (assumed)

Usage:
  python3 scripts/index_fonts.py

Output:
  fonts/fonts.json  (overwritten in place)

To add a new font:
  1. Drop Web437_YourFont_WxH.woff into fonts/
  2. Run this script to regenerate fonts.json
  3. Reload the viewer

The font file naming convention follows the Web437 font pack from:
  https://int10h.org/oldschool-pc-fonts/fontlist/
"""

import json
import re
from pathlib import Path

FONTS_DIR = Path(__file__).resolve().parent.parent / 'fonts'
OUTPUT    = FONTS_DIR / 'fonts.json'

# Default cell sizes for fonts whose filenames don't include WxH
DEFAULTS = {
    'IBM_BIOS':    (8,  8),
    'IBM_CGA':     (8,  8),
    'IBM_CGAthin': (8,  8),
    'IBM_MDA':     (9, 14),
    'IBM_3270pc':  (9, 14),
    '__courier__': (0,  0),
}

# Friendly display names (override auto-generated names)
DISPLAY_NAMES = {
    'IBM_VGA_9x16':      'IBM VGA 9×16',
    'IBM_VGA_8x16':      'IBM VGA 8×16',
    'IBM_VGA_9x14':      'IBM VGA 9×14',
    'IBM_VGA_8x14':      'IBM VGA 8×14',
    'IBM_EGA_9x14':      'IBM EGA 9×14',
    'IBM_EGA_8x14':      'IBM EGA 8×14',
    'IBM_EGA_8x8':       'IBM EGA 8×8',
    'IBM_BIOS':          'IBM BIOS 8×8',
    'IBM_CGA':           'IBM CGA 8×8',
    'IBM_CGAthin':       'IBM CGA Thin 8×8',
    'IBM_MDA':           'IBM MDA 9×14',
    'IBM_3270pc':        'IBM 3270 PC',
    '__courier__':       'Courier New (web)',
}

def parse_font_file(path: Path):
    stem = path.stem  # e.g. Web437_IBM_VGA_9x16
    if not stem.startswith('Web437_'):
        return None
    font_id = stem[7:]  # strip "Web437_"

    # Try to extract WxH from end of ID
    m = re.search(r'_(\d+)x(\d+)$', font_id)
    if m:
        w, h = int(m.group(1)), int(m.group(2))
    elif font_id in DEFAULTS:
        w, h = DEFAULTS[font_id]
    else:
        # Unknown - assume 8x16
        w, h = 8, 16

    display = DISPLAY_NAMES.get(font_id, font_id.replace('_', ' '))
    return {'id': font_id, 'name': display, 'w': w, 'h': h}


def main():
    woff_files = sorted(FONTS_DIR.glob('Web437_*.woff'))
    if not woff_files:
        print(f'No Web437_*.woff files found in {FONTS_DIR}')
        return

    entries = []
    for f in woff_files:
        entry = parse_font_file(f)
        if entry:
            entries.append(entry)
            print(f'  {entry["id"]:30s} {entry["w"]}x{entry["h"]}')

    # Always include Courier fallback at end
    if not any(e['id'] == '__courier__' for e in entries):
        entries.append({'id': '__courier__', 'name': 'Courier New (web)', 'w': 0, 'h': 0})

    with open(OUTPUT, 'w') as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)

    print(f'\nWrote {len(entries)} fonts to {OUTPUT}')


if __name__ == '__main__':
    main()
