#!/usr/bin/env python3
"""
Build the Manifest's crew card images.

Sources are the two uploads in assets/ ("Hanna MTG Card", "Sisay MTG Card").
They are gitignored — only the processed .webp files are committed, because
they are what the page serves.

Hanna's is a clean digital scan and needs almost nothing.

Sisay's is a photograph of a physical card standing on a plastic display stand
on a wooden deck, outdoors: tilted, surrounded by trees and decking, with the
stand's legs covering both bottom corners. That is what the work below is for.
It is ordinary geometry and tone — a perspective transform derived from the
card's four measured corners, a repair of the two occluded corners, and a
levels/sharpen pass. Nothing here invents detail that was not photographed;
the residual softness is the source photo's own.

    python3 tools/build-crew-cards.py

Corner coordinates are measured against the original 1080×1440 upload. If that
file is ever replaced, re-measure them (overlay a coordinate grid and read off
the four corners) rather than assuming these still hold.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import numpy as np
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(ROOT, 'assets')

# Card proportions: 63 × 88 mm. Work at 1000px wide, ship at 800px — a 332px
# tile at 2× retina needs 664px, so 800 is enough and saves a third of the bytes.
WORK = (1000, 1396)
SHIP = (800, 1117)

# Sisay's card corners in the original photo: TL, TR, BR, BL.
SISAY_CORNERS = [(212, 190), (857, 176), (851, 1107), (207, 1121)]


def perspective_coeffs(dst, src):
    """Coefficients mapping OUTPUT coords back into INPUT coords."""
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -x * u, -y * u]); B.append(u)
        A.append([0, 0, 0, x, y, 1, -x * v, -y * v]); B.append(v)
    return np.linalg.solve(np.array(A, float), np.array(B, float))


def autolevels(im, lo_pct=0.4, hi_pct=99.6):
    """Per-channel black/white point stretch. A photo of a print arrives flat."""
    a = np.asarray(im).astype(np.float32)
    for c in range(3):
        ch = a[..., c]
        lo, hi = np.percentile(ch, lo_pct), np.percentile(ch, hi_pct)
        a[..., c] = np.clip((ch - lo) * (255.0 / (hi - lo)), 0, 255)
    return Image.fromarray(a.astype(np.uint8))


def build_sisay():
    W, H = WORK
    src = Image.open(os.path.join(ASSETS, 'Sisay MTG Card')).convert('RGB')
    im = src.transform(
        (W, H), Image.PERSPECTIVE,
        perspective_coeffs([(0, 0), (W, 0), (W, H), (0, H)], SISAY_CORNERS),
        Image.BICUBIC)

    # The stand's legs intrude into both bottom corners, over what is otherwise
    # the card's black border. Fill them, then put back the two frame lines the
    # left leg was covering.
    m = Image.new('L', (W, H), 0)
    md = ImageDraw.Draw(m)
    md.polygon([(0, 1297), (84, 1297), (106, 1332), (106, H), (0, H)], fill=255)
    md.polygon([(888, 1338), (1000, 1306), (1000, H), (864, H)], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(1.5))
    im = Image.composite(Image.new('RGB', (W, H), (7, 7, 8)), im, m)

    d = ImageDraw.Draw(im)
    # Rules box: bridge its bottom-left corner back to the surviving line.
    d.rectangle([53, 1297, 92, 1308], fill=(236, 236, 230))
    # Power/toughness box: rebuild its damaged bottom-right arc by mirroring the
    # clean bottom-left one about the box centre (x≈882). Taken from below the
    # glyphs, so no text is mirrored. Feathered so the seam is not a notch.
    strip = im.crop((772, 1330, 884, 1384)).transpose(Image.FLIP_LEFT_RIGHT)
    sm = Image.new('L', strip.size, 255)
    ImageDraw.Draw(sm).rectangle([0, 0, 14, strip.size[1]], fill=0)
    im.paste(strip, (880, 1330), sm.filter(ImageFilter.GaussianBlur(6)))

    im = autolevels(im)
    im = im.filter(ImageFilter.MedianFilter(3))          # paper grain / sensor noise
    im = ImageEnhance.Color(im).enhance(1.20)
    im = ImageEnhance.Contrast(im).enhance(1.09)
    im = im.filter(ImageFilter.UnsharpMask(radius=2.2, percent=150, threshold=3))
    return im


def build_hanna():
    im = Image.open(os.path.join(ASSETS, 'Hanna MTG Card')).convert('RGB')
    im = im.resize(WORK, Image.LANCZOS)
    im = ImageEnhance.Color(im).enhance(1.06)
    return im.filter(ImageFilter.UnsharpMask(radius=1.6, percent=90, threshold=3))


if __name__ == '__main__':
    for name, build in (('hanna', build_hanna), ('sisay', build_sisay)):
        out = os.path.join(ASSETS, f'card-{name}.webp')
        build().resize(SHIP, Image.LANCZOS).save(out, 'WEBP', quality=86, method=6)
        print(f'{os.path.relpath(out, ROOT)}  {os.path.getsize(out) // 1024} KB')
