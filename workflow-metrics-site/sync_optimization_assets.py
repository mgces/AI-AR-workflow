#!/usr/bin/env python3
"""Copy the optimization page with a public metrics export; never copy raw runs."""
import argparse
import re
import shutil
from pathlib import Path

ASSETS = (
    "optimization.html", "optimization.css", "optimization.mjs",
    "optimization-plan.mjs", "optimization-nav.mjs",
)
NAV_TAG = '<script type="module" src="./optimization-nav.mjs"></script>'


def sync_assets(public_dir, source_dir=None):
    source = Path(source_dir) if source_dir is not None else Path(__file__).parent / "dist"
    target = Path(public_dir)
    missing = [name for name in ASSETS if not (source / name).is_file()]
    if missing:
        raise ValueError("optimization assets missing: " + ", ".join(missing))
    index_path = target / "index.html"
    html = index_path.read_text(encoding="utf-8")
    if "optimization-nav.mjs" not in html:
        if not re.search(r"</body\s*>", html, flags=re.IGNORECASE):
            raise ValueError("public index.html has no closing body")
        html = re.sub(r"</body\s*>", NAV_TAG + "\n</body>", html, count=1,
                      flags=re.IGNORECASE)
    if source.resolve() != target.resolve():
        for name in ASSETS:
            shutil.copy2(source / name, target / name)
    index_path.write_text(html, encoding="utf-8")


def sync_requested_public_assets(argv=None):
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument("--public-dir")
    args, _ = parser.parse_known_args(argv)
    if args.public_dir:
        sync_assets(args.public_dir)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--public-dir", required=True)
    args = parser.parse_args()
    sync_assets(args.public_dir)


if __name__ == "__main__":
    main()
