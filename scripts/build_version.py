"""Writes version.json and the VERSION line of sw.js: the list of the site's files, each with its fingerprint.

The offline copy (sw.js) downloads a version whole and checks every file against this list, so a phone never
mixes files from two pushes. Run it before every commit that changes a file of the site;
tests/site.test.js fails when it was forgotten.

Run from the project folder:
    .venv\\Scripts\\python.exe scripts\\build_version.py
"""

import hashlib
import json
import re
import subprocess
from pathlib import Path

PROJECT_DIR = Path(__file__).resolve().parent.parent
VERSION_FILE = PROJECT_DIR / "version.json"
WORKER = PROJECT_DIR / "sw.js"
GAME = "games/guess-the-footballer"

# What the site serves to a player. images/share.jpg is left out: only link previews ask for it.
PATTERNS = [
    "*.html", "*.css", "pwa.js", "manifest.webmanifest",
    "fonts/*.css", "fonts/*.woff2",
    "images/logo.svg", "images/Header/*.svg", "images/icons/*",
    "vendor/*.js",
    "data/manifest.json", "data/badges.json", "data/album/**/*.json", "data/seasons/**/*.json",
    f"{GAME}/*.html", f"{GAME}/*.css", f"{GAME}/*.js", f"{GAME}/album/*.css", f"{GAME}/album/*.js",
]


def site_files() -> list[str]:
    found = {path for pattern in PATTERNS for path in PROJECT_DIR.glob(pattern) if path.is_file()}
    return sorted(path.relative_to(PROJECT_DIR).as_posix() for path in found)


def fingerprints(files: list[str]) -> dict[str, str]:
    # Git's own fingerprint of each file as it will be committed (line endings as in the repo), which is exactly
    # what GitHub Pages serves; the browser computes the same one from what it downloads.
    result = subprocess.run(
        ["git", "hash-object", "--stdin-paths"], cwd=PROJECT_DIR, input="\n".join(files),
        capture_output=True, text=True, check=True,
    )
    return dict(zip(files, result.stdout.split(), strict=True))


VERSION_LINE = re.compile(r"const VERSION = '[^']*';")


def build() -> dict:
    files = fingerprints(site_files())
    # sw.js counts too, without its own VERSION line: a change to the worker alone is a new version as well.
    worker = VERSION_LINE.sub("", WORKER.read_text(encoding="utf-8").replace("\r\n", "\n"))
    version = hashlib.sha1((json.dumps(files, sort_keys=True) + worker).encode()).hexdigest()[:12]
    return {"version": version, "files": files}


def main() -> None:
    data = build()
    VERSION_FILE.write_text(json.dumps(data, indent=1) + "\n", encoding="utf-8", newline="\n")
    worker = WORKER.read_text(encoding="utf-8")
    worker = VERSION_LINE.sub(f"const VERSION = '{data['version']}';", worker, count=1)
    WORKER.write_bytes(worker.encode("utf-8"))
    print(f"version {data['version']}: {len(data['files'])} files")


if __name__ == "__main__":
    main()
