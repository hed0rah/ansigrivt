#!/usr/bin/env python3
"""
Build packs.json from a directory of art pack zips.

Expected input layout:
  packs/zips/
    2024/
      mypack.zip
      another.zip
    2023/
      oldpack.zip

Each zip is extracted flat (filenames only, no subdirs) into:
  packs/extracted/<year>/<packname>/

Usage:
  python3 scripts/index_packs.py             # index all years in packs/zips/
  python3 scripts/index_packs.py 2024        # just 2024
  python3 scripts/index_packs.py 2023 2024   # specific years
  python3 scripts/index_packs.py /path/to/zips  # custom zip directory
"""

import json
import os
import struct
import sys
import zipfile
from pathlib import Path

ROOT        = Path(__file__).resolve().parent.parent
OUTPUT_DIR  = ROOT / "packs" / "extracted"
MANIFEST    = ROOT / "packs" / "packs.json"

ART_EXTENSIONS = {'.ans', '.asc', '.nfo', '.diz', '.txt', '.ice', '.xb'}
SKIP_FILENAMES = {'file_id.diz', 'readme.txt', 'readme.nfo'}


def parse_sauce(data: bytes):
    """Parse SAUCE record from last 128 bytes of a file."""
    if len(data) < 128:
        return None
    off = len(data) - 128
    if data[off:off+5] != b'SAUCE':
        return None
    def s(a, b): return data[off+a:off+b].replace(b'\x00', b'').strip().decode('ascii', errors='replace')
    tinfo1 = struct.unpack('<H', data[off+96:off+98])[0]
    tinfo2 = struct.unpack('<H', data[off+98:off+100])[0]
    return {
        'title':  s(7, 42) or None,
        'author': s(42, 62) or None,
        'group':  s(62, 82) or None,
        'date':   s(82, 90) or None,
        'cols':   tinfo1 if tinfo1 > 0 else None,
        'rows':   tinfo2 if tinfo2 > 0 else None,
    }


def is_art_file(name: str) -> bool:
    base = os.path.basename(name).lower()
    if base in SKIP_FILENAMES:
        return False
    return os.path.splitext(base)[1] in ART_EXTENSIONS


def extract_pack(zip_path: Path, year: str):
    """Extract art files from a pack zip, return pack manifest entry."""
    pack_name = zip_path.stem
    out_dir = OUTPUT_DIR / year / pack_name
    out_dir.mkdir(parents=True, exist_ok=True)

    files = []
    try:
        with zipfile.ZipFile(zip_path, 'r') as zf:
            for info in zf.infolist():
                if info.is_dir():
                    continue
                basename = os.path.basename(info.filename)
                if not basename or not is_art_file(basename):
                    continue
                try:
                    data = zf.read(info.filename)
                except (NotImplementedError, Exception) as e:
                    print(f"    WARN: skip {info.filename}: {e}", file=sys.stderr)
                    continue

                out_path = out_dir / basename
                if out_path.exists():
                    stem, ext = os.path.splitext(basename)
                    i = 2
                    while out_path.exists():
                        out_path = out_dir / f"{stem}_{i}{ext}"
                        i += 1
                out_path.write_bytes(data)

                sauce = parse_sauce(data)
                entry = {'name': out_path.name, 'size': len(data)}
                if sauce:
                    if sauce['author']: entry['artist'] = sauce['author']
                    if sauce['group']:  entry['group']  = sauce['group']
                    if sauce['title']:  entry['title']  = sauce['title']
                    if sauce['cols']:   entry['cols']   = sauce['cols']
                    if sauce['rows']:   entry['rows']   = sauce['rows']
                    if sauce['date']:   entry['date']   = sauce['date']
                files.append(entry)

    except zipfile.BadZipFile:
        print(f"  WARN: bad zip: {zip_path.name}", file=sys.stderr)
        return None

    if not files:
        return None

    files.sort(key=lambda f: f['name'].lower())
    print(f"  {pack_name}: {len(files)} files")
    return {'name': pack_name, 'year': int(year), 'fileCount': len(files), 'files': files}


def main():
    args = sys.argv[1:]

    # If first arg looks like a path, use it as archive dir
    archive_dir = ROOT / "packs" / "zips"
    if args and not args[0].isdigit():
        archive_dir = Path(args.pop(0))

    if not archive_dir.exists():
        print(f"ERROR: archive directory not found: {archive_dir}", file=sys.stderr)
        print(f"Create it and place year-named subdirs of .zip files inside.", file=sys.stderr)
        sys.exit(1)

    years = args if args else sorted(
        d.name for d in archive_dir.iterdir() if d.is_dir() and d.name.isdigit()
    )

    # Load existing manifest for incremental updates
    existing_packs = []
    if MANIFEST.exists():
        with open(MANIFEST) as f:
            existing_packs = json.load(f).get('packs', [])

    # Drop years we're re-indexing
    reindex = {int(y) for y in years}
    existing_packs = [p for p in existing_packs if p['year'] not in reindex]

    new_packs = []
    for year in years:
        year_dir = archive_dir / year
        if not year_dir.is_dir():
            print(f"WARN: {year_dir} not found, skipping", file=sys.stderr)
            continue
        zips = sorted(year_dir.glob('*.zip'))
        if not zips:
            print(f"  {year}: no zips found")
            continue
        print(f"\n=== {year} ({len(zips)} packs) ===")
        for z in zips:
            pack = extract_pack(z, year)
            if pack:
                new_packs.append(pack)

    all_packs = sorted(existing_packs + new_packs, key=lambda p: (p['year'], p['name']))
    total_files = sum(p['fileCount'] for p in all_packs)
    total_years = sorted(set(p['year'] for p in all_packs))

    manifest = {
        'years': total_years,
        'totalPacks': len(all_packs),
        'totalFiles': total_files,
        'packs': all_packs,
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(MANIFEST, 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"\n{'='*40}")
    print(f"Indexed {len(all_packs)} packs, {total_files} files")
    print(f"Years:    {', '.join(str(y) for y in total_years)}")
    print(f"Manifest: {MANIFEST}")
    print(f"Extracted: {OUTPUT_DIR}")


if __name__ == '__main__':
    main()
