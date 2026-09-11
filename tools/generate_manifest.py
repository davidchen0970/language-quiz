#!/usr/bin/env python3
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
chapter_dir = root / 'src' / 'data' / 'chapters'
files = sorted(p.name for p in chapter_dir.glob('*.js') if p.is_file())
manifest = chapter_dir / 'manifest.json'
manifest.write_text(json.dumps(files, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Generated {manifest.relative_to(root)} with {len(files)} chapter file(s).')
