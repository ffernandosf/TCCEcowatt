"""Isola a marca (ícone) e o lockup completo do logo Ecowatt a partir do PNG
gerado, removendo o fundo escuro (chroma-key) e recortando pelo bounding box
do conteúdo visível. Uso único, script de apoio — não faz parte do app."""

import sys

from PIL import Image

SRC = sys.argv[1]
OUT_DIR = sys.argv[2]

img = Image.open(SRC).convert("RGBA")
w, h = img.size
px = img.load()

bg = px[2, 2][:3]
print("bg sample:", bg)


def dist(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


THRESH = 40
alpha_img = Image.new("L", (w, h), 0)
apx = alpha_img.load()
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        d = dist((r, g, b), bg)
        apx[x, y] = 255 if d > THRESH else 0

img.putalpha(alpha_img)
bbox_full = img.getbbox()
print("bbox full:", bbox_full)

full = img.crop(bbox_full)
full.save(f"{OUT_DIR}/ecowatt-logo-full.png")

row_has_content = []
for y in range(bbox_full[1], bbox_full[3]):
    has = any(apx[x, y] for x in range(bbox_full[0], bbox_full[2]))
    row_has_content.append((y, has))

gap_start = None
gap_end = None
in_gap = False
first_content_seen = False
for y, has in row_has_content:
    if has:
        first_content_seen = True
        if in_gap and gap_start is not None and gap_end is None:
            gap_end = y
            break
    elif first_content_seen and not in_gap:
        in_gap = True
        gap_start = y

print("gap:", gap_start, gap_end)

icon_bottom = gap_start if gap_start else bbox_full[3]
icon_region = img.crop((bbox_full[0], bbox_full[1], bbox_full[2], icon_bottom))
icon_bbox = icon_region.getbbox()
icon = icon_region.crop(icon_bbox)
icon.save(f"{OUT_DIR}/ecowatt-logo-mark.png")
print("icon size:", icon.size, "full size:", full.size)
