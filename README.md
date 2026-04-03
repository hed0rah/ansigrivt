# ansigrivt

Browser-based ANSI/ASCII art viewer with interactive physics effects. Drop any `.ans` or `.txt` file on the page, or browse a pack collection from the built-in sidebar.

**Live demo: [grivtdynamics.com](https://grivtdynamics.com)**

## How it works

The ANSI file is parsed in JavaScript: CP437 bytes are decoded to Unicode, ANSI escape sequences are interpreted for color and cursor position, and SAUCE metadata is stripped. Each character is rendered as an individual `<span>` element with inline color classes, laid out in fixed-size rows using `display: inline-block` and CSS custom properties for character dimensions.

Physics effects work by reading and writing `element.style.transform` on each character span every animation frame. Because every character is its own DOM node, effects can apply arbitrary per-character translation, rotation, and scale without canvas or WebGL. Mouse position is tracked relative to the art container and passed to each effect as normalized coordinates.

The font system loads a JSON manifest at startup and injects `@font-face` rules dynamically. Character cell dimensions come from the font metadata (width x height in pixels), which drives the CSS grid alignment. Switching fonts reflows the entire art element.

Vite is used only as a dev server and bundler. The built output is a single JS file plus static assets - no framework, no runtime dependencies.

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Ships with IBM VGA 9x16 and works immediately.

---

## Startup art

Place a `default.ans` or `default.txt` in the project root. It loads on startup and when you press `Esc`. If neither file exists, a built-in placeholder is shown.

Any CP437 ANSI or plain ASCII file works. Color is auto-enabled if the file contains escape codes.

To update the startup art, swap the file and run `npm run build`.

---

## Pack browser

The pack browser reads from `packs/packs.json`. Put your zip archives in `packs/zips/<year>/` and run the indexer:

```bash
python3 scripts/index_packs.py          # index all years
python3 scripts/index_packs.py 2024     # one year only
python3 scripts/index_packs.py /path/to/zips  # custom path
```

This extracts art files into `packs/extracted/` and writes `packs/packs.json`.

[16colo.rs](https://16colo.rs) is a great source for ANSI/ASCII art packs going back to 1990.

### Manual setup (no zips)

1. Create `packs/extracted/<year>/<packname>/` and put art files in it
2. Write `packs/packs.json` manually or adapt the indexer script

### packs.json format

```json
{
  "years": [2024],
  "totalPacks": 1,
  "totalFiles": 3,
  "packs": [
    {
      "name": "mypack",
      "year": 2024,
      "fileCount": 3,
      "files": [
        { "name": "art1.ans", "size": 4096, "artist": "someone", "group": "mygroup" }
      ]
    }
  ]
}
```

Files are served from `packs/extracted/<year>/<packname>/<filename>`.

### Serving packs in production

`packs/` is too large to serve from the Vite build output. Serve it from outside `dist/` via a web server alias. For nginx:

```nginx
location /packs/ {
    alias /path/to/ansigrivt/packs/;
}
```

Do not use `gzip_static` here unless you have pre-compressed `.gz` files alongside each file.

---

## Effects

Effects are self-contained modules in `src/effects/`. Each file exports a standard interface. The toolbar buttons are generated automatically from the registry.

### To add an effect

1. Create `src/effects/myeffect.js`:

```js
export const id = 'myeffect';    // unique id, used internally
export const name = 'myeffect';  // label on the toolbar button
export const key = 'z';          // keyboard shortcut (optional)

// Up to 4 parameter sliders
export const params = {
  label: 'speed',   map: v => 0.01 + v * 0.05,  default: 40,
  label2: 'radius', map2: v => 20 + v * 3,       default2: 50,
};

// Called once when the effect is first activated (optional)
export function init(ctx) { }

// Called every animation frame
// ctx = { chars, mouseX, mouseY, mouseDown, CHAR_W, CHAR_H, p1, p2, p3, p4 }
// p1-p4 are already mapped through params.map()
export function apply(ctx, dt) {
  for (const c of ctx.chars) {
    c.el.style.transform = `translate(0px, ${Math.sin(Date.now() * ctx.p1) * ctx.p2}px)`;
  }
}

// Called when switching away - reset module-level state (optional)
export function reset() { }

// Mouse events (optional)
export function onMouseDown(ctx, x, y) { }
export function onMouseUp(ctx) { }

// If true, animation pauses when mouse leaves the art area
export const idleWithoutMouse = false;
```

2. Register it in `src/effects/index.js`:

```js
import * as myeffect from './myeffect.js';

export const EFFECTS = [
  // ... existing effects ...
  myeffect,
];
```

### To remove an effect

Delete its `import` line from `src/effects/index.js`.

---

## Fonts

The viewer ships with **IBM VGA 9x16**, the standard DOS font. For a full collection of DOS-era bitmap fonts in WOFF format, see the [Oldschool PC Font Resource](https://int10h.org/oldschool-pc-fonts/) by VileR (CC BY 4.0). Download the "Web" zip, drop the `.woff` files into `fonts/`, then run:

```bash
python3 scripts/index_fonts.py   # regenerates fonts/fonts.json from fonts/*.woff
```

Reload the viewer and the new fonts appear in the dropdown.

### fonts.json format

```json
[
  { "id": "IBM_VGA_9x16", "name": "IBM VGA 9x16", "w": 9, "h": 16 },
  { "id": "__courier__",  "name": "Courier New (web)", "w": 0, "h": 0 }
]
```

`id` must match the filename suffix of `Web437_<id>.woff`.
`__courier__` is a special fallback that uses the browser's built-in Courier New.

---

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `1`-`9`, `q`, `w`, `e`, `a`, `d`, `g`, `h`, `j`, `k`, `l`, `t`, `x`, `z`, `0` | Switch effect |
| `b` | Toggle pack browser |
| `←` `→` | Navigate files |
| `c` | Toggle ANSI color |
| `i` | Invert (light/dark theme) |
| `r` | Reset positions |
| `s` | Toggle text selection mode |
| `f` | Cycle font |
| `Esc` | Return to startup art |

---

## File structure

```
ansigrivt/
├── index.html              # single-page app shell + all CSS
├── package.json
├── vite.config.js
├── default.ans             # startup art (optional, not committed)
├── fonts/
│   ├── fonts.json          # font manifest
│   ├── Web437_IBM_VGA_9x16.woff  # default font (included)
│   └── Web437_*.woff       # additional fonts (not committed)
├── packs/
│   ├── packs.json          # generated by index_packs.py
│   └── extracted/          # extracted art files
├── scripts/
│   ├── index_packs.py      # build packs.json from zip archives
│   └── index_fonts.py      # build fonts.json from woff files
└── src/
    ├── main.js             # app entry, orchestrates everything
    ├── ansi.js             # ANSI escape parser + CP437 decoder
    ├── browser.js          # pack browser panel and file navigation
    ├── fonts.js            # font loading and management
    └── effects/
        ├── index.js        # effect registry - add/remove effects here
        ├── repel.js
        ├── wave.js
        └── ...             # 23 effects total
```

---

## License

MIT.

`Web437_IBM_VGA_9x16.woff` is CC BY 4.0 by VileR / [int10h.org](https://int10h.org/oldschool-pc-fonts/).
Art files you serve are property of their original authors.
