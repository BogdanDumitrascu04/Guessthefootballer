"""Serves the site at http://localhost:8765 for local testing.

Unlike `python -m http.server`, it tells the browser to check every file for changes, so a test
never shows an old copy from the browser's cache.

Run from the project folder:
    .venv\\Scripts\\python.exe scripts\\serve.py
"""

import functools
import http.server
import io
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
PORT = 8765
TEXT = {".html", ".css", ".js", ".json", ".svg", ".webmanifest", ".txt", ".md"}


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = http.server.SimpleHTTPRequestHandler.extensions_map | {".webmanifest": "application/manifest+json"}

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_head(self):
        # Line endings as git commits them and GitHub Pages serves them: sw.js checks every file against
        # version.json, and a Windows editor may have saved a file with CRLF.
        path = Path(self.translate_path(self.path))
        if not path.is_file() or path.suffix not in TEXT:
            return super().send_head()
        body = path.read_bytes().replace(b"\r\n", b"\n")
        self.send_response(200)
        self.send_header("Content-Type", self.guess_type(str(path)))
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        return io.BytesIO(body)


def main() -> None:
    handler = functools.partial(NoCacheHandler, directory=PROJECT_DIR)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as server:
        print(f"Serving {PROJECT_DIR} at http://localhost:{PORT}  (Ctrl+C to stop)")
        server.serve_forever()


if __name__ == "__main__":
    main()
