#!/usr/bin/env python3
"""Embed the checked-in brand SVGs as PNGs for a self-contained Scriptable file.

Development-only dependency: cairosvg. Runtime needs neither Python packages nor
external icon requests. Vector artwork: Lobe Icons, MIT (assets/LICENSE-lobe-icons).
"""
import base64
import json
import re
from pathlib import Path

import cairosvg

root = Path(__file__).resolve().parents[1]
icons = {}
for name, color in (("claude", "#e78b70"), ("openai", "#f6f8ff")):
    svg = (root / f"scriptable/assets/{name}.svg").read_text()
    png = cairosvg.svg2png(bytestring=svg.replace("currentColor", color).encode(),
                          output_width=96, output_height=96)
    icons[name] = base64.b64encode(png).decode()
script = root / "scriptable/AI-Usage.js"
source = script.read_text()
license_text = (root / "scriptable/assets/LICENSE-lobe-icons").read_text().strip()
source = re.sub(r"// BEGIN EMBEDDED ICONS.*?// END EMBEDDED ICONS",
                "// BEGIN EMBEDDED ICONS\n/*\n" + license_text + "\n*/\nconst BRAND_IMAGES = " + json.dumps(icons) + ";\n// END EMBEDDED ICONS",
                source, flags=re.S)
script.write_text(source)
print("Embedded Claude and OpenAI icons")
