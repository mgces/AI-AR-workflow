#!/usr/bin/env python3
"""Run scan -> process/index docs -> functional docs -> verification."""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


def run(command: list[str]) -> None:
    print("+", " ".join(command), flush=True)
    subprocess.run(command, check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--workspace-root", required=True)
    parser.add_argument("--source-path", required=True)
    parser.add_argument("--domain-name", required=True)
    parser.add_argument("--knowledge-base", default="specs/knowledge-base")
    parser.add_argument("--product-parts")
    parser.add_argument("--exclude", action="append", default=[])
    parser.add_argument("--skip-docs", action="store_true")
    args = parser.parse_args()

    script_dir = Path(__file__).resolve().parent
    workspace = Path(args.workspace_root).resolve()
    kb = Path(args.knowledge_base)
    if not kb.is_absolute():
        kb = workspace / kb
    index_dir = kb / "generated" / args.domain_name

    scan = [
        sys.executable, str(script_dir / "scan_source.py"),
        "--workspace-root", str(workspace), "--source-path", args.source_path,
        "--domain-name", args.domain_name, "--output-dir", str(index_dir),
    ]
    if args.product_parts:
        scan += ["--product-parts", args.product_parts]
    for item in args.exclude:
        scan += ["--exclude", item]
    run(scan)

    if not args.skip_docs:
        run([
            sys.executable, str(script_dir / "generate_docs.py"),
            "--workspace-root", str(workspace), "--source-path", args.source_path,
            "--domain-name", args.domain_name, "--index-dir", str(index_dir),
            "--knowledge-base", str(kb),
        ])
        run([
            sys.executable, str(script_dir / "verify_knowledge_base.py"),
            "--workspace-root", str(workspace), "--domain-name", args.domain_name,
            "--index-dir", str(index_dir), "--knowledge-base", str(kb),
        ])

    print(f"knowledge base ready: {kb / 'source-domains' / args.domain_name / 'README.md'}")


if __name__ == "__main__":
    main()
