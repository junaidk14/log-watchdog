"""Static contrast checks for the shipped text palette; not rendered verification."""

import re
from pathlib import Path

css = (Path(__file__).resolve().parent.parent / "frontend/src/styles.css").read_text()
palettes = {
    name: dict(
        re.findall(r"--([\w-]+):\s*(#[0-9a-fA-F]+)", re.search(selector, css, re.S).group(1))
    )
    for name, selector in {
        "light": r":root \{(.*?)\}",
        "dark": r':root\[data-theme="dark"\] \{(.*?)\}',
    }.items()
}


def luminance(color: str) -> float:
    color = color.removeprefix("#")
    if len(color) == 3:
        color = "".join(component * 2 for component in color)
    channels = [int(color[index : index + 2], 16) / 255 for index in (0, 2, 4)]
    linear = [c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return sum(c * weight for c, weight in zip(linear, (0.2126, 0.7152, 0.0722), strict=True))


for theme, tokens in palettes.items():
    for foreground, background, minimum in [
        ("ink", "surface", 4.5),
        ("ink", "ground", 4.5),
        ("muted", "surface", 4.5),
        ("muted", "ground", 4.5),
        ("muted", "selected", 4.5),
        ("accent", "surface", 4.5),
        ("accent", "selected", 4.5),
        ("primary-ink", "primary-bg", 4.5),
        ("primary-ink", "accent-hover", 4.5),
        ("placeholder", "surface", 4.5),
        ("error", "error-bg", 4.5),
        ("error", "surface", 4.5),
        ("warning", "warning-bg", 4.5),
        ("warning", "surface", 4.5),
        ("severity-ink", "severity-bg", 4.5),
        ("error", "severity-error-bg", 4.5),
        ("ink", "detail-bg", 4.5),
        ("selection-ink", "selection-bg", 4.5),
        ("focus", "surface", 3),
        ("focus", "ground", 3),
        ("focus", "selected", 3),
        ("control-border", "surface", 3),
        ("control-border", "ground", 3),
    ]:
        first, second = sorted((luminance(tokens[foreground]), luminance(tokens[background])))
        ratio = (second + 0.05) / (first + 0.05)
        print(f"{theme}: {foreground} on {background}: {ratio:.2f}:1")
        assert ratio >= minimum, f"{theme}: {foreground} on {background} below {minimum}:1"
