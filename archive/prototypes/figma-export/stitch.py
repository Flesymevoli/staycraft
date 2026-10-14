import json
import os
import re

from PIL import Image

BASE = r"C:\个人\学习\ENT207\Homestay AI assistant\figma-export"
WIDTH = 390

manifest = json.load(open(os.path.join(BASE, "manifest.json"), encoding="utf-8"))

groups = {}
for name in os.listdir(BASE):
    match = re.match(r"(\d+)-(home|work|analysis|explore|profile)-tile-(\d+)\.png", name)
    if match:
        groups.setdefault((match.group(1), match.group(2)), {})[int(match.group(3))] = name

for (prefix, route), by_index in sorted(groups.items()):
    entry = manifest[route]
    height = entry["height"]
    offsets = entry["offsets"]
    canvas = Image.new("RGB", (WIDTH, height), (255, 255, 255))
    for index in sorted(by_index):
        tile = Image.open(os.path.join(BASE, by_index[index])).convert("RGB")
        canvas.paste(tile, (0, offsets[index]))
    out_name = f"{prefix}-{route}-full.png"
    canvas.save(os.path.join(BASE, out_name))
    colors = len(canvas.getcolors(maxcolors=200000) or [])
    print(f"{route}: {height}px stitched, distinct colors={colors} -> {out_name}")
