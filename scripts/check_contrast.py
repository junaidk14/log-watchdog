"""Static contrast checks for the shipped text palette; not rendered verification."""

import re
from pathlib import Path

css = (Path(__file__).resolve().parent.parent / "frontend/src/styles.css").read_text()
tokens = dict(re.findall(r"--([\w-]+):\s*(#[0-9a-fA-F]+)", css))


def luminance(color: str) -> float:
    color = color.removeprefix("#")
    if len(color) == 3:
        color = "".join(component * 2 for component in color)
    channels = [int(color[index : index + 2], 16) / 255 for index in (0, 2, 4)]
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return sum(c * weight for c, weight in zip(linear, (0.2126, 0.7152, 0.0722), strict=True))


for foreground, background in [
    ("ink", "surface"),
    ("ink", "ground"),
    ("muted", "surface"),
    ("muted", "ground"),
    ("accent", "surface"),
    ("accent", "selected"),
    ("surface", "accent"),
    ("error", "error-bg"),
    ("warning", "warning-bg"),
]:
    first, second = sorted((luminance(tokens[foreground]), luminance(tokens[background])))
    ratio = (second + 0.05) / (first + 0.05)
    print(f"{foreground} on {background}: {ratio:.2f}:1")
    assert ratio >= 4.5, f"Text contrast below 4.5:1: {foreground} on {background}"
