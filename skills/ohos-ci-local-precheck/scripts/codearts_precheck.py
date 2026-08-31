#!/usr/bin/env python3
"""Fail-closed wrapper for an explicitly supplied CodeArts IDE engine."""
import argparse
import hashlib
import json
import shutil
import subprocess
import sys
from pathlib import Path


EXTS = {".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx"}


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_defects(path, allowed):
    payload = json.loads(path.read_text(encoding="utf-8"))
    defects = payload if isinstance(payload, list) else payload.get("defects", payload.get("Defects", []))
    if not isinstance(defects, list):
        raise ValueError("defects.json has no defect list")
    normalized = []
    for defect in defects:
        file_name = defect.get("buggyFilePath", defect.get("filePath", ""))
        try:
            resolved = str(Path(file_name).resolve())
        except OSError:
            resolved = file_name
        if resolved not in allowed:
            continue
        normalized.append({
            "file": resolved,
            "line": defect.get("startRowNumber", defect.get("buggyLine", defect.get("line", 1))),
            "rule_id": defect.get("defectType", defect.get("checkerName", "unknown")),
            "message": defect.get("description", defect.get("message", "")),
            "criterion": defect.get("criterionName", ""),
        })
    return normalized


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--engine-jar", required=True)
    parser.add_argument("--engine-sha256", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--project-root", required=True)
    parser.add_argument("--compile-db")
    parser.add_argument("--java-bin")
    parser.add_argument("files", nargs="+")
    args = parser.parse_args()

    engine = Path(args.engine_jar).resolve()
    root = Path(args.project_root).resolve()
    output = Path(args.output_dir).resolve()
    files = [Path(name).resolve() for name in args.files if Path(name).suffix.lower() in EXTS]
    result_file = output / "result.json"
    output.mkdir(parents=True, exist_ok=True)

    def finish(status, message, defects=None, rc=2):
        result_file.write_text(json.dumps({
            "status": status, "message": message, "defects": defects or [],
            "finding_count": len(defects or []), "findings": defects or [],
            "engine_sha256": sha256(engine) if engine.is_file() else None,
        }, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("codearts_precheck %s: %s" % (status.upper(), message),
              file=sys.stderr if rc else sys.stdout)
        return rc

    if not files:
        return finish("clean", "no changed C/C++ files", rc=0)
    if not engine.is_file():
        return finish("unavailable", "engine JAR not found: %s" % engine)
    actual_hash = sha256(engine)
    if actual_hash.lower() != args.engine_sha256.lower():
        return finish("unavailable", "engine SHA-256 mismatch")
    java = args.java_bin or shutil.which("java")
    if not java:
        return finish("unavailable", "java executable not found")
    for path in files:
        try:
            path.relative_to(root)
        except ValueError:
            return finish("unavailable", "file is outside project root: %s" % path)

    config_dir = output / "checkPath"
    config_dir.mkdir(exist_ok=True)
    source_file = config_dir / "source.json"
    source_file.write_text(json.dumps({
        "projectRoot": str(root), "sourceFiles": [str(path) for path in files],
        "sourceDirs": [], "exclude": "",
    }, ensure_ascii=False), encoding="utf-8")
    if args.compile_db:
        compile_db = Path(args.compile_db).resolve()
        if not compile_db.is_file():
            return finish("unavailable", "compile_commands.json not found: %s" % compile_db)
        (config_dir / "extraParam.json").write_text(json.dumps({
            "compileCommandsJsonDir": str(compile_db.parent)
        }), encoding="utf-8")

    command = [java, "-jar", str(engine), "--report-output-dir", str(output),
               "--check-config-file", str(source_file), "--lang", "zh-cn", "--mode", "local"]
    completed = subprocess.run(command, cwd=root, capture_output=True, text=True)
    (output / "engine.log").write_text(
        completed.stdout + "\n--- stderr ---\n" + completed.stderr, encoding="utf-8")
    if completed.returncode != 0:
        return finish("error", "engine exited with rc=%d" % completed.returncode)
    defects_file = output / "defects.json"
    if not defects_file.is_file():
        return finish("error", "engine completed without defects.json")
    try:
        defects = load_defects(defects_file, {str(path) for path in files})
    except (OSError, ValueError, TypeError) as exc:
        return finish("error", "cannot parse defects.json: %s" % exc)
    if defects:
        return finish("defects", "%d defect(s)" % len(defects), defects, rc=1)
    return finish("clean", "0 defects over %d file(s)" % len(files), rc=0)


if __name__ == "__main__":
    raise SystemExit(main())
