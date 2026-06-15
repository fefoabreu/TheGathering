#!/usr/bin/env python3
"""Generate The Gathering branded share banner (OG image) + favicon set."""
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

HERE = os.path.dirname(os.path.abspath(__file__))
def A(*p): return os.path.join(HERE, *p)

# ── Brand palette (from site tokens) ───────────────────────
OCEAN_DEEP = (13, 33, 55)
GOLD       = (212, 163, 64)
SAND       = (245, 230, 200)
WHITE      = (255, 255, 255)

# ── Fonts ──────────────────────────────────────────────────
def font(path, size, index=0):
    return ImageFont.truetype(path, size, index=index)

DIDOT   = "/System/Library/Fonts/Supplemental/Didot.ttc"
AVENIR  = "/System/Library/Fonts/Avenir Next.ttc"

f_label   = font(AVENIR, 25, index=1)   # demi/medium
f_head    = font(DIDOT, 62, index=1)    # bold
f_sub     = font(AVENIR, 27, index=0)

W, H = 1200, 630

# ── Background: backdrop scaled to cover ───────────────────
bg = Image.open(A("silveira_backdrop.jpg")).convert("RGB")
scale = max(W / bg.width, H / bg.height)
bg = bg.resize((int(bg.width*scale), int(bg.height*scale)), Image.LANCZOS)
bx = (bg.width - W) // 2
by = (bg.height - H) // 2
bg = bg.crop((bx, by, bx + W, by + H))

# ── Deep-ocean gradient overlay for premium look + legibility
overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
od = ImageDraw.Draw(overlay)
for x in range(W):
    # darker on the left (behind logo + text), lighter toward right edge
    t = x / W
    alpha = int(232 - 150 * t)          # 232 -> 82
    od.line([(x, 0), (x, H)], fill=(*OCEAN_DEEP, max(60, alpha)))
# vertical bottom vignette
for y in range(H):
    t = y / H
    a = int(90 * (t ** 2))
    od.line([(0, y), (W, y)], fill=(*OCEAN_DEEP, a))

canvas = Image.alpha_composite(bg.convert("RGBA"), overlay)
draw = ImageDraw.Draw(canvas)

# ── Logo (with soft glow) ──────────────────────────────────
logo = Image.open(A("logo-circle.png")).convert("RGBA")
LS = 372
logo = logo.resize((LS, LS), Image.LANCZOS)
lx, ly = 92, (H - LS)//2

# glow halo
glow = Image.new("RGBA", (W, H), (0,0,0,0))
gd = ImageDraw.Draw(glow)
gd.ellipse([lx-22, ly-22, lx+LS+22, ly+LS+22], fill=(*GOLD, 120))
glow = glow.filter(ImageFilter.GaussianBlur(34))
canvas = Image.alpha_composite(canvas, glow)
canvas.paste(logo, (lx, ly), logo)
draw = ImageDraw.Draw(canvas)

# ── Text block (right of logo) ─────────────────────────────
tx = lx + LS + 70
cy = 150

def tracked(d, xy, text, fnt, fill, spacing=0):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=fnt, fill=fill)
        w = d.textlength(ch, font=fnt)
        x += w + spacing
    return x

# Location label
tracked(draw, (tx, cy), "PRAIA DA SILVEIRA · GAROPABA — SC", f_label, GOLD, spacing=2)

# Headline (Didot)
hy = cy + 52
draw.text((tx, hy), "A Premium Hillside", font=f_head, fill=WHITE)
draw.text((tx, hy + 70), "Retreat by the Sea", font=f_head, fill=WHITE)

# Gold divider
dy = hy + 158
draw.line([(tx, dy), (tx + 250, dy)], fill=GOLD, width=3)

# Sub-line
tracked(draw, (tx, dy + 26), "5 Suites · Private Pool · Ocean Views", f_sub, SAND, spacing=1)

# ── Export OG banner ───────────────────────────────────────
out = canvas.convert("RGB")
out.save(A("share-banner.jpg"), quality=90, optimize=True)
out.save(A("share-banner.png"), optimize=True)
print("share-banner.jpg/png", out.size)

# ── Favicons from the circular logo ────────────────────────
src = Image.open(A("logo-circle.png")).convert("RGBA")
for size, name in [(16,"favicon-16.png"),(32,"favicon-32.png"),
                   (180,"apple-touch-icon.png"),(192,"icon-192.png"),(512,"icon-512.png")]:
    src.resize((size, size), Image.LANCZOS).save(A(name), optimize=True)
    print("wrote", name)

# Multi-res .ico
ico = Image.open(A("logo-circle.png")).convert("RGBA")
ico.save(A("favicon.ico"), sizes=[(16,16),(32,32),(48,48)])
print("wrote favicon.ico")
