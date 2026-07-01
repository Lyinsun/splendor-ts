#!/usr/bin/env python3
from __future__ import annotations

import json
import re
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PDF_PATH = ROOT / "docs/璀璨宝石宝可梦_A4DIY_有皮卡丘_ver1201.pdf"
CONTENT_PATH = ROOT / "src/game/domain/content.ts"
OUTPUT_DIR = ROOT / "assets/splendor-monsters/themes/pokemon-splendor/cards"
MANIFEST_PATH = ROOT / "assets/splendor-monsters/image-generation/pokemon-splendor/card-face-extraction-manifest.json"

PAGE_CONFIG = [
    (2, 10),
    (4, 10),
    (6, 10),
    (8, 5),
    (10, 10),
    (12, 10),
    (14, 10),
    (16, 10),
    (18, 5),
    (20, 10),
]

RENDER_DPI = 120
CROP_X = [40, 304, 569, 833, 1098]
CROP_Y = [90, 497]
CROP_WIDTH = 264
CROP_HEIGHT = 407
OUTPUT_WIDTH = 420


def read_card_ids() -> list[str]:
    content = CONTENT_PATH.read_text(encoding="utf-8")
    ids = re.findall(r"pokemonCard\('([^']+)'", content)
    if len(ids) != 90:
        raise RuntimeError(f"Expected 90 Pokemon card ids, found {len(ids)} in {CONTENT_PATH}")
    return ids


def render_pages(render_dir: Path) -> None:
    pdftoppm = shutil.which("pdftoppm")
    if pdftoppm is None:
        raise RuntimeError("pdftoppm is required to render the Pokemon card PDF.")

    subprocess.run(
        [
            pdftoppm,
            "-png",
            "-r",
            str(RENDER_DPI),
            "-f",
            "2",
            "-l",
            "20",
            str(PDF_PATH),
            str(render_dir / "a4diy"),
        ],
        check=True,
    )


def page_png(render_dir: Path, page: int) -> Path:
    path = render_dir / f"a4diy-{page:02d}.png"
    if not path.exists():
        raise RuntimeError(f"Rendered page missing: {path}")
    return path


def crop_positions(card_count: int) -> list[tuple[int, int]]:
    rows = CROP_Y[:1] if card_count == 5 else CROP_Y
    return [(x, y) for y in rows for x in CROP_X][:card_count]


def main() -> None:
    card_ids = read_card_ids()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)

    cards: list[dict[str, object]] = []
    card_index = 0
    output_height = round(OUTPUT_WIDTH * CROP_HEIGHT / CROP_WIDTH)

    with tempfile.TemporaryDirectory(prefix="pokemon-card-render-") as tmp:
        render_dir = Path(tmp)
        render_pages(render_dir)

        for page, card_count in PAGE_CONFIG:
            page_image = Image.open(page_png(render_dir, page)).convert("RGB")
            for slot_index, (x, y) in enumerate(crop_positions(card_count), start=1):
                card_id = card_ids[card_index]
                crop = page_image.crop((x, y, x + CROP_WIDTH, y + CROP_HEIGHT))
                resized = crop.resize((OUTPUT_WIDTH, output_height), Image.Resampling.LANCZOS)
                output_path = OUTPUT_DIR / f"{card_id}.png"
                resized.save(output_path, optimize=True)
                cards.append(
                    {
                        "cardId": card_id,
                        "sourcePage": page,
                        "sourceSlot": slot_index,
                        "path": str(output_path.relative_to(ROOT)),
                    }
                )
                card_index += 1

    manifest = {
        "source": str(PDF_PATH.relative_to(ROOT)),
        "cardIdSource": str(CONTENT_PATH.relative_to(ROOT)),
        "renderDpi": RENDER_DPI,
        "crop": {
            "x": CROP_X,
            "y": CROP_Y,
            "width": CROP_WIDTH,
            "height": CROP_HEIGHT,
        },
        "output": {
            "width": OUTPUT_WIDTH,
            "height": output_height,
            "directory": str(OUTPUT_DIR.relative_to(ROOT)),
        },
        "pages": [{"page": page, "cards": card_count} for page, card_count in PAGE_CONFIG],
        "cards": cards,
    }
    MANIFEST_PATH.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Extracted {len(cards)} Pokemon card faces to {OUTPUT_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
