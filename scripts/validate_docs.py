#!/usr/bin/env python3
"""Validate Phase 0 documentation; optionally compare the authoritative archive."""

import argparse
import collections
import csv
import hashlib
import io
import json
import os
import re
import sys
import zipfile
from pathlib import Path
from urllib.parse import unquote, urlsplit

COUNTS = {
    "CORE": 20, "EDIT": 16, "DIAG": 27, "DATA": 16, "IO": 18,
    "AI": 11, "COLLAB": 14, "PLAT": 22, "SITE": 22, "OPS": 12,
}
FIELDS = ["id", "category", "title", "priority", "phase", "acceptance"]
ARCHIVE_SHA256 = "e08ead7c063a825690f2fec7e28df7e9ba6b3a727b538457c04c25814d8c26f2"
EXPECTED_IDS = [f"{category}-{n:03}" for category, count in COUNTS.items()
                for n in range(1, count + 1)]
DECISION_IDS = {f"{prefix}-{n:03}" for prefix, count in
                [("K", 13), ("T", 11), ("O", 14)] for n in range(1, count + 1)}
ENGINEERING_IDS = {
    "ARCH-001", "ARCH-002", "ARCH-003", "ARCH-004", "ARCH-005", "ARCH-006",
    "UX-001", "I18N-001", "DIAG-001", "DIAG-002", "DATA-001", "DATA-002",
    "EXPORT-001", "EXPORT-002", "EXPORT-003", "AI-001", "AI-002", "SYNC-001",
    "SYNC-002", "SYNC-003", "MARKET-001", "PLUGIN-001", "WEB-001", "WEB-002",
    "OPS-001", "OPS-002", "ENT-001",
}
LEGACY_IDS = {f"{prefix}-{n:02}" for prefix, count in
              [("R", 7), ("M", 5), ("D", 9)] for n in range(1, count + 1)}
MILESTONES = {f"M{n}" for n in range(9)}
ERRORS = []


def check(condition, message):
    if not condition:
        ERRORS.append(message)


def table_rows(text):
    """Return pipe-table cells, excluding headers/separators where appropriate."""
    return [[cell.strip() for cell in line.strip().strip("|").split("|")]
            for line in text.splitlines() if line.startswith("|")]


def catalog_rows(text):
    return [row for row in table_rows(text) if re.fullmatch(
        r"(?:CORE|EDIT|DIAG|DATA|IO|AI|COLLAB|PLAT|SITE|OPS)-\d{3}", row[0])]


def headings(text):
    """Build GitHub-style anchors for the plain-text headings used here."""
    result, seen = set(), collections.Counter()
    for line in text.splitlines():
        match = re.match(r"^#{1,6} +(.+?)\s*#*\s*$", line)
        if match:
            slug = re.sub(r"[^\w\- ]", "", match[1].lower()).replace(" ", "-")
            index = seen[slug]
            seen[slug] += 1
            result.add(f"{slug}-{index}" if index else slug)
    return result


def without_fences(text):
    return re.sub(r"^```[^\n]*\n.*?^```\s*$", "", text, flags=re.M | re.S)


def validate(root, archive):
    manifest = json.loads((root / "docs/planning/source-manifest.json").read_text(encoding="utf-8"))
    records = manifest["source_files"]
    paths = [record["path"] for record in records]
    check(manifest["archive_sha256"] == ARCHIVE_SHA256, "Archive identity drift")
    check(manifest["source_file_count"] == len(records) == 45, "Expected 45 source files")
    check(len(set(paths)) == len(paths), "Duplicate source paths")
    for record in records:
        path = Path(record["path"])
        check(not path.is_absolute() and ".." not in path.parts, f"Unsafe source path: {path}")
        check((root / path).is_file(), f"Missing integrated source path: {path}")
        check(bool(re.fullmatch(r"[0-9a-f]{64}", record["sha256"])), f"Invalid hash: {path}")
    original_gitignore = next(record["sha256"] for record in records if record["path"] == ".gitignore")
    check(hashlib.sha256((root / ".gitignore").read_bytes()).hexdigest() == original_gitignore,
          "Original .gitignore was changed")

    catalog_path = root / "docs/product/feature-catalog.csv"
    with catalog_path.open(newline="", encoding="utf-8") as stream:
        reader = csv.DictReader(stream)
        check(reader.fieldnames == FIELDS, "CSV schema differs from source")
        rows = list(reader)
    check([row["id"] for row in rows] == EXPECTED_IDS,
          "Catalog must contain all 178 original IDs exactly once, in original order")
    for row in rows:
        key, category = row["id"], row["category"]
        check(all(row.get(field) for field in FIELDS) and None not in row,
              f"Incomplete CSV record: {key}")
        check(key.startswith(category + "-"), f"Category mismatch: {key}")
        check(row["priority"] == "MUST", f"Priority drift: {key}")
        phase = "P0" if category in {"CORE", "OPS"} else (
            "P1" if category in {"EDIT", "DIAG", "SITE"} else (
                "P2" if category in {"DATA", "IO", "AI"} else "P3"))
        check(row["phase"] == phase, f"Historical wave drift: {key}")
    md_rows = catalog_rows((root / "docs/product/feature-catalog.md").read_text(encoding="utf-8"))
    check(md_rows == [[r["id"], r["title"], r["phase"], r["acceptance"]] for r in rows],
          "Markdown and CSV catalog entries differ")

    backlog = (root / "docs/planning/roadmap-backlog.md").read_text(encoding="utf-8")
    engineering = [r for r in table_rows(backlog) if r[0] in ENGINEERING_IDS]
    milestones = [r for r in table_rows(backlog) if r[0] in MILESTONES]
    check(len(engineering) == 27 and {r[0] for r in engineering} == ENGINEERING_IDS,
          "Expected all 27 unique original engineering IDs")
    check(len(milestones) == 9 and {r[0] for r in milestones} == MILESTONES,
          "Expected all M0–M8 milestones")
    for row in engineering:
        check(len(row) == 4 and row[2] in MILESTONES and row[3] in EXPECTED_IDS,
              f"Invalid engineering reference: {row}")
    decisions = table_rows((root / "docs/decisions.md").read_text(encoding="utf-8"))
    actual_decisions = [row[0] for row in decisions if re.fullmatch(r"[KTO]-\d{3}", row[0])]
    check(len(actual_decisions) == len(DECISION_IDS) and set(actual_decisions) == DECISION_IDS,
          "Decision register must preserve all K/T/O IDs exactly once")
    legacy = [r[0] for r in table_rows((root / "docs/traceability.md").read_text(encoding="utf-8"))
              if re.fullmatch(r"[RMD]-\d{2}", r[0])]
    check(len(legacy) == len(LEGACY_IDS) and set(legacy) == LEGACY_IDS,
          "Legacy R/M/D mappings are incomplete or duplicated")

    known_ids = set(EXPECTED_IDS) | ENGINEERING_IDS | DECISION_IDS | LEGACY_IDS
    known_ids |= {"SHA-256"}
    known_ids |= {f"ADR-{n:03}" for n in range(1, 11)} | {"I18N-001"}
    # Installed dependencies and generated build/test outputs are not project
    # docs. "vendor" is Composer's installed tree, whose packages ship their own
    # README files with JSON examples and tables of their own.
    markdown = []
    excluded = {".git", "node_modules", "dist", "target", "playwright-report",
                "test-results", ".cache", "vendor"}
    for directory, names, files in os.walk(root):
        names[:] = [name for name in names if name not in excluded]
        markdown.extend(Path(directory) / name for name in files if name.endswith(".md"))
    markdown.sort()
    link_count = json_count = 0
    for path in markdown:
        text = path.read_text(encoding="utf-8")
        rel = path.relative_to(root)
        check(bool(re.search(r"^# \S", text, re.M)), f"Missing document title: {rel}")
        check(sum(line.startswith("```") for line in text.splitlines()) % 2 == 0,
              f"Unclosed code fence: {rel}")
        check("\ufffd" not in text, f"Invalid decoded text: {rel}")
        for block in re.findall(r"^```json\s*\n(.*?)^```", text, flags=re.M | re.S):
            json.loads(block)
            json_count += 1
        plain = without_fences(text)
        for key in re.findall(r"\b[A-Z][A-Z0-9]*-\d{2,3}\b", plain):
            check(key in known_ids, f"Unknown ID {key} in {rel}")
        table_width = None
        for line in plain.splitlines():
            if line.startswith("|"):
                width = len(line.split("|"))
                check(table_width is None or table_width == width, f"Ragged table: {rel}: {line}")
                table_width = width
            else:
                table_width = None
        for target in re.findall(r"!?\[[^\]]*\]\(([^)]+)\)", plain):
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc:
                continue
            check(not parsed.path.startswith("/"), f"Nonportable absolute link: {rel}: {target}")
            dest = (path.parent / unquote(parsed.path)).resolve() if parsed.path else path.resolve()
            check(dest.is_relative_to(root), f"Link escapes repository: {rel}: {target}")
            check(dest.is_file(), f"Broken local link: {rel}: {target}")
            if parsed.fragment and dest.is_file():
                check(unquote(parsed.fragment) in headings(dest.read_text(encoding="utf-8")),
                      f"Broken heading anchor: {rel}: {target}")
            link_count += 1

    for name in ("bug_report", "decision", "feature_request"):
        text = (root / f".github/ISSUE_TEMPLATE/{name}.md").read_text(encoding="utf-8")
        check(text.startswith("---\n") and len(text.split("---", 2)) == 3,
              f"Missing template front matter: {name}")
        header = text.split("---", 2)[1]
        check(all(re.search(rf"^{field}:\s*\S", header, re.M)
                  for field in ("name", "about", "title")), f"Incomplete issue template: {name}")
    check("## Validation" in (root / ".github/pull_request_template.md").read_text(encoding="utf-8"),
          "PR template lacks validation section")

    if archive:
        check(hashlib.sha256(archive.read_bytes()).hexdigest() == ARCHIVE_SHA256,
              "Supplied archive does not match the authoritative source hash")
        with zipfile.ZipFile(archive) as source:
            source_paths = [entry.filename for entry in source.infolist() if not entry.is_dir()]
            check(source_paths == paths, "Original archive inventory differs from manifest")
            for record in records:
                check(hashlib.sha256(source.read(record["path"])).hexdigest() == record["sha256"],
                      f"Original content hash differs: {record['path']}")
            original = list(csv.DictReader(io.StringIO(
                source.read("docs/product/feature-catalog.csv").decode())))
            metadata = ("id", "category", "priority", "phase")
            check([[r[k] for k in metadata] for r in original] ==
                  [[r[k] for k in metadata] for r in rows], "Original requirement metadata changed")
            original_md = catalog_rows(source.read("docs/product/feature-catalog.md").decode())
            check(original_md == [[r["id"], r["title"], r["phase"], r["acceptance"]]
                                  for r in original], "Source Markdown/CSV are inconsistent")
            original_backlog = table_rows(source.read("docs/planning/roadmap-backlog.md").decode())
            original_items = [r for r in original_backlog if r[0] in ENGINEERING_IDS]
            check([[r[0], r[2], r[3]] for r in original_items] ==
                  [[r[0], r[2], r[3]] for r in engineering], "Original engineering references changed")
            check([r[0] for r in original_backlog if r[0] in MILESTONES] ==
                  [r[0] for r in milestones], "Original milestone identity/order changed")

    if ERRORS:
        for error in ERRORS:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    print(f"PASS: 178 requirements; {len(DECISION_IDS)} decisions; 27 engineering items; "
          f"9 milestones; {len(LEGACY_IDS)} legacy mappings")
    print(f"PASS: {len(markdown)} Markdown documents; {link_count} local links/anchors; "
          f"{json_count} JSON example; 45 integrated source paths; templates and structure")
    if archive:
        print("PASS: authoritative archive identity, 45 content hashes, catalog metadata, and backlog references")
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-archive", type=Path, help="Original planning ZIP for source comparison")
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1],
                        help=argparse.SUPPRESS)
    args = parser.parse_args()
    try:
        return validate(args.root.resolve(), args.source_archive)
    except (OSError, ValueError, KeyError, StopIteration, zipfile.BadZipFile) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
