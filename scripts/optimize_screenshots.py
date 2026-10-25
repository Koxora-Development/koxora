#!/usr/bin/env python3
"""Reduce the size of the documentation screenshots.

The capture scripts write true-colour PNGs. For flat interface screenshots an
indexed palette stores the same picture in roughly a third of the space, which
keeps the repository usable while the images stay readable at full size.

This is an optional step after `pnpm capture:website`, not part of `pnpm check`
and not run in continuous integration. It needs Pillow, which the repository
does not otherwise depend on:

    python3 -m pip install --user Pillow
    python3 scripts/optimize_screenshots.py

A file is only replaced when the rewrite is actually smaller, so running the
script twice changes nothing.
"""

from __future__ import annotations

import sys
from pathlib import Path

DEFAULT_DIRECTORIES = ("docs/design/screenshots/website",)
MAX_COLOURS = 256

try:
    from PIL import Image
except ModuleNotFoundError:  # pragma: no cover - depends on the environment
    sys.exit(
        "Pillow is required: python3 -m pip install --user Pillow\n"
        "The screenshots stay usable without this step; they are just larger."
    )


def optimize(path: Path) -> tuple[int, int]:
    """Rewrite one PNG with an indexed palette. Returns (before, after)."""
    before = path.stat().st_size
    with Image.open(path) as image:
        # Dithering adds noise that an interface screenshot does not need and
        # that would undo most of the saving.
        indexed = image.convert("RGB").quantize(
            colors=MAX_COLOURS,
            method=Image.Quantize.MEDIANCUT,
            dither=Image.Dither.NONE,
        )
        candidate = path.with_suffix(".png.tmp")
        indexed.save(candidate, format="PNG", optimize=True)
    after = candidate.stat().st_size
    if after < before:
        candidate.replace(path)
        return before, after
    candidate.unlink()
    return before, before


def main(argv: list[str]) -> int:
    root = Path(__file__).resolve().parent.parent
    directories = [Path(value) for value in argv[1:]] or [
        root / value for value in DEFAULT_DIRECTORIES
    ]
    total_before = total_after = 0
    count = 0
    for directory in directories:
        if not directory.is_dir():
            print(f"Not a directory: {directory}", file=sys.stderr)
            return 1
        for path in sorted(directory.glob("*.png")):
            before, after = optimize(path)
            total_before += before
            total_after += after
            count += 1
            print(f"{path.name}: {before // 1024} KiB -> {after // 1024} KiB")
    if not count:
        print("No PNG files found.", file=sys.stderr)
        return 1
    print(
        f"{count} files: {total_before // 1024} KiB -> {total_after // 1024} KiB"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
