# -*- coding: utf-8 -*-
"""Fotoğraf araçlarının (yapboz, duvar panosu, kutu) renkli örnek görselleri.

Çizimdir, fotoğraf değil: telif sorunu yok, 2–4 filament rengine temiz ayrılır.
Çıktı: public/tasarim-araclari/_adjy/ornek-foto/{gunbatimi,balon,cicek}.jpg

    python scripts/ornek-foto-uret.py
"""
import math, os, random
from PIL import Image, ImageDraw, ImageFilter

W, H, K = 1000, 750, 2  # K: kenar yumuşatma için büyütme
HEDEF = os.path.join(os.path.dirname(__file__), "..", "public", "tasarim-araclari", "_adjy", "ornek-foto")


def gecis(duraklar, w=W * K, h=H * K):
    """Dikey renk geçişi: [(0..1, (r, g, b)), …]"""
    im = Image.new("RGB", (w, h))
    px = im.load()
    for y in range(h):
        t = y / (h - 1)
        for (t0, c0), (t1, c1) in zip(duraklar, duraklar[1:]):
            if t0 <= t <= t1:
                u = (t - t0) / max(1e-9, t1 - t0)
                c = tuple(round(c0[i] + (c1[i] - c0[i]) * u) for i in range(3))
                break
        for x in range(w):
            px[x, y] = c
    return im


def sirt(d, rnd, y0, genlik, renk, w=W * K, h=H * K, pes=5):
    """Dağ sırtı: birkaç sinüsün toplamı"""
    f = [(rnd.uniform(0.6, 1.4) * (i + 1), rnd.uniform(0, 6.28), 1 / (i + 1)) for i in range(pes)]
    pts = [(0, h)]
    for x in range(0, w + 8, 8):
        t = x / w
        y = y0 + sum(math.sin(t * 6.28 * a + b) * g for a, b, g in f) * genlik
        pts.append((x, y))
    pts.append((w, h))
    d.polygon(pts, fill=renk)


def kaydet(im, ad):
    os.makedirs(HEDEF, exist_ok=True)
    im = im.resize((W, H), Image.LANCZOS)
    yol = os.path.join(HEDEF, ad + ".jpg")
    im.save(yol, quality=86, optimize=True)
    print(ad, os.path.getsize(yol))


def gunbatimi():
    rnd = random.Random(7)
    im = gecis([(0, (31, 47, 92)), (0.3, (106, 63, 160)), (0.52, (240, 122, 31)), (0.66, (246, 201, 39)), (1, (246, 201, 39))])
    d = ImageDraw.Draw(im)
    cx, cy, r = 620 * K, 425 * K, 92 * K
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(250, 226, 120))
    sirt(d, rnd, 430 * K, 34 * K, (106, 63, 160))
    sirt(d, rnd, 480 * K, 40 * K, (92, 56, 146))
    sirt(d, rnd, 540 * K, 30 * K, (31, 47, 92))
    # Göl: gökyüzünün yansıması, yatay çizgilerle
    d.rectangle((0, 585 * K, W * K, H * K), fill=(31, 47, 92))
    for i in range(46):
        y = (590 + i * 3.6 + rnd.uniform(-1, 1)) * K
        yari = (rnd.uniform(40, 150) * (1 - i / 60)) * K
        x = cx + rnd.uniform(-30, 30) * K
        d.rounded_rectangle((x - yari, y, x + yari, y + 2.2 * K), radius=K, fill=(246, 201, 39) if i % 3 else (240, 122, 31))
    # Kıyı ve çamlar
    sirt(d, rnd, 700 * K, 14 * K, (22, 32, 66), pes=3)
    for x in [70, 120, 160, 840, 900, 950]:
        h = rnd.uniform(90, 150)
        tb = (700 - rnd.uniform(0, 12)) * K
        for k in range(5):
            w2 = (14 + k * 9) * K
            y = tb - (h - k * h / 5.5) * K
            d.polygon([(x * K, y - 22 * K), (x * K - w2, y + 26 * K), (x * K + w2, y + 26 * K)], fill=(22, 32, 66))
        d.rectangle((x * K - 3 * K, tb - 30 * K, x * K + 3 * K, tb + 20 * K), fill=(22, 32, 66))
    kaydet(im, "gunbatimi")


def balon():
    rnd = random.Random(11)
    im = gecis([(0, (84, 146, 222)), (1, (118, 176, 232))])
    d = ImageDraw.Draw(im)
    for bx, by, s in [(170, 150, 1.0), (760, 110, 1.25), (520, 300, 0.8), (900, 330, 0.7), (80, 380, 0.65)]:
        for dx, dy, r in [(-46, 8, 30), (-14, -10, 40), (26, -2, 34), (58, 10, 24), (6, 14, 36)]:
            d.ellipse(((bx + dx * s - r * s) * K, (by + dy * s - r * s) * K, (bx + dx * s + r * s) * K, (by + dy * s + r * s) * K), fill=(243, 241, 234))
    sirt(d, rnd, 610 * K, 26 * K, (66, 160, 84), pes=3)
    sirt(d, rnd, 670 * K, 22 * K, (47, 143, 70), pes=3)

    def balon_ciz(cx, cy, r, renkler):
        n = len(renkler)
        # Zarf: üstte daire, altta sepete daralan koni; dikey dilimler
        maske = Image.new("L", im.size, 0)
        md = ImageDraw.Draw(maske)
        md.ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
        md.polygon([(cx - r * 0.92, cy + r * 0.38), (cx + r * 0.92, cy + r * 0.38), (cx + r * 0.22, cy + r * 1.42), (cx - r * 0.22, cy + r * 1.42)], fill=255)
        dilim = Image.new("RGB", im.size)
        dd = ImageDraw.Draw(dilim)
        for i in range(n * 2):
            x0 = cx - r + (2 * r) * (0.5 - 0.5 * math.cos(math.pi * i / (n * 2)))
            x1 = cx - r + (2 * r) * (0.5 - 0.5 * math.cos(math.pi * (i + 1) / (n * 2)))
            dd.rectangle((x0, cy - r * 1.1, x1 + 1, cy + r * 1.6), fill=renkler[i % n])
        im.paste(dilim, (0, 0), maske)
        d2 = ImageDraw.Draw(im)
        d2.line([(cx - r * 0.2, cy + r * 1.42), (cx - r * 0.13, cy + r * 1.72)], fill=(150, 30, 36), width=max(2, int(r * 0.03)))
        d2.line([(cx + r * 0.2, cy + r * 1.42), (cx + r * 0.13, cy + r * 1.72)], fill=(150, 30, 36), width=max(2, int(r * 0.03)))
        d2.rounded_rectangle((cx - r * 0.17, cy + r * 1.7, cx + r * 0.17, cy + r * 1.95), radius=int(r * 0.04), fill=(150, 30, 36))

    balon_ciz(330 * K, 290 * K, 150 * K, [(200, 36, 43), (243, 241, 234)])
    balon_ciz(700 * K, 400 * K, 96 * K, [(243, 241, 234), (200, 36, 43)])
    balon_ciz(880 * K, 200 * K, 54 * K, [(200, 36, 43), (243, 241, 234)])
    kaydet(im, "balon")


def cicek():
    rnd = random.Random(3)
    im = gecis([(0, (47, 143, 70)), (1, (31, 100, 52))])
    d = ImageDraw.Draw(im)

    def yaprak(cx, cy, uz, aci, renk):
        pts = []
        for i in range(41):
            t = i / 40
            x = t * uz
            y = math.sin(math.pi * t) * uz * 0.22
            pts.append((x, y))
        alt = [(x, -y) for x, y in reversed(pts)]
        ca, sa = math.cos(aci), math.sin(aci)
        d.polygon([(cx + x * ca - y * sa, cy + x * sa + y * ca) for x, y in pts + alt], fill=renk)

    for _ in range(26):
        yaprak(rnd.uniform(0, W) * K, rnd.uniform(0, H) * K, rnd.uniform(150, 330) * K, rnd.uniform(0, 6.28),
               rnd.choice([(58, 156, 78), (36, 112, 58), (50, 134, 68)]))

    def cicek_ciz(cx, cy, R, yaprakSayisi, dis, ic, goz):
        for kat, (renk, olcek, kay) in enumerate([(dis, 1.0, 0), (ic, 0.62, math.pi / yaprakSayisi)]):
            for i in range(yaprakSayisi):
                a = kay + i * 2 * math.pi / yaprakSayisi
                px_, py_ = cx + math.cos(a) * R * 0.52 * olcek, cy + math.sin(a) * R * 0.52 * olcek
                katman = Image.new("L", im.size, 0)
                kd = ImageDraw.Draw(katman)
                rw, rh = R * 0.5 * olcek, R * 0.27 * olcek
                kd.ellipse((px_ - rw, py_ - rh, px_ + rw, py_ + rh), fill=255)
                katman = katman.rotate(-math.degrees(a), center=(px_, py_))
                im.paste(Image.new("RGB", im.size, renk), (0, 0), katman)
        d2 = ImageDraw.Draw(im)
        r = R * 0.2
        d2.ellipse((cx - r, cy - r, cx + r, cy + r), fill=goz)
        for i in range(14):
            a = i * 2.399
            rr = r * 0.78 * math.sqrt((i + 0.5) / 14)
            d2.ellipse((cx + math.cos(a) * rr - r * 0.09, cy + math.sin(a) * rr - r * 0.09, cx + math.cos(a) * rr + r * 0.09, cy + math.sin(a) * rr + r * 0.09), fill=(238, 180, 40))

    cicek_ciz(430 * K, 370 * K, 300 * K, 9, (239, 111, 165), (243, 241, 234), (246, 201, 39))
    cicek_ciz(830 * K, 590 * K, 150 * K, 8, (243, 241, 234), (239, 111, 165), (246, 201, 39))
    cicek_ciz(840 * K, 150 * K, 110 * K, 7, (246, 201, 39), (243, 241, 234), (239, 111, 165))
    kaydet(im.filter(ImageFilter.GaussianBlur(0.6 * K)), "cicek")


if __name__ == "__main__":
    gunbatimi()
    balon()
    cicek()
