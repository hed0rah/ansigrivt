// Effect registry - import effects here to make them available in the viewer.
// To add a new effect: create src/effects/myeffect.js, then add it to this list.
// To remove an effect: delete its import line (and optionally its file).

import * as repel    from './repel.js';
import * as wave     from './wave.js';
import * as scatter  from './scatter.js';
import * as string   from './string.js';
import * as vortex   from './vortex.js';
import * as gravity  from './gravity.js';
import * as melt     from './melt.js';
import * as explode  from './explode.js';
import * as elastic  from './elastic.js';
import * as rain     from './rain.js';
import * as magnet   from './magnet.js';
import * as glitch   from './glitch.js';
import * as smudge   from './smudge.js';
import * as liquify  from './liquify.js';
import * as scanline from './scanline.js';
import * as crt      from './crt.js';
import * as breathe  from './breathe.js';
import * as parallax from './parallax.js';
import * as reveal   from './reveal.js';
import * as tornado  from './tornado.js';
import * as gravwell from './gravwell.js';
import * as tear     from './tear.js';
import * as none     from './none.js';

// Ordered list - determines toolbar button order
export const EFFECTS = [
  repel, wave, scatter, string, vortex, gravity, melt, explode,
  elastic, rain, magnet, glitch, smudge, liquify, scanline, crt,
  breathe, parallax, reveal, tornado, gravwell, tear, none,
];

// Map from effect id → effect module
export const EFFECT_MAP = Object.fromEntries(EFFECTS.map(e => [e.id, e]));
