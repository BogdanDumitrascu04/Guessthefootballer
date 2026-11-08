"""Serves the site at http://localhost:8765 for local testing.

Unlike `python -m http.server`, it tells the browser to check every file for changes, so a test
never shows an old copy from the browser's cache.

Run from the project folder:
    .venv\\Scripts\\python.exe scripts\\serve.py
"""

import functools
import http.server
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
PORT = 8765


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


def main() -> None:
    handler = functools.partial(NoCacheHandler, directory=PROJECT_DIR)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as server:
        print(f"Serving {PROJECT_DIR} at http://localhost:{PORT}  (Ctrl+C to stop)")
        server.serve_forever()


if __name__ == "__main__":
    main()
