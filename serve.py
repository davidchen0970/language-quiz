#!/usr/bin/env python3
import json
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent
CHAPTER_DIR = ROOT / 'src' / 'data' / 'chapters'

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?', 1)[0] == '/api/chapters':
            files = sorted(p.name for p in CHAPTER_DIR.glob('*.js') if p.is_file())
            body = json.dumps(files, ensure_ascii=False).encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()

if __name__ == '__main__':
    os.chdir(ROOT)
    print('Korean Learning Quiz: http://localhost:8000')
    print('All .js files in src/data/chapters are loaded automatically.')
    ThreadingHTTPServer(('localhost', 8000), Handler).serve_forever()
