"""Araba yolu ürün görsellerini aracın kendi 3B sahnesinden yeniden çeker.

Dev sunucusu 5000 portunda açıkken: python scripts/araba-yolu-kareleri.py public/tasarim-araclari/_gorsel
?vitrin parametresi parça numaralarını ve seçim çizgisini gizler. Tarayıcı olarak kurulu Edge kullanılır.
"""
import base64
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

URL = "http://localhost:5000/tasarim-araclari/araba-yolu/index.html?vitrin"
BOY = 1100

# (dosya, hazırlık adımları) — adımlar: ("yol", ad) | ("hazir", ad)
KARELER = [
    ("araba-yolu.jpg", [("yol", "looping")], (2, 0.3, 0.62)),
    ("araba-yolu-2.jpg", [("yol", "oval")], (3, 0.5, 0.5)),
    ("araba-yolu-3.jpg", [("yol", "tek"), ("hazir", "egimli")], (0, 0.5, 0.5)),
    ("araba-yolu-4.jpg", [("yol", "tek"), ("hazir", "sarmal")], (0, 0.5, 0.5)),
    ("araba-yolu-5.jpg", [("yol", "tepe")], (1, 0.25, 0.6)),
    ("araba-yolu-6.jpg", [("yol", "tek"), ("hazir", "korkuluklu")], (0, 0.5, 0.5)),
]

SAHNE_CSS = f"""
.hw-sahne {{ position: fixed !important; inset: 0 !important; width: {BOY}px !important;
  height: {BOY}px !important; max-height: none !important; z-index: 2147483000 !important; margin: 0 !important; }}
.hw-sahne > :not(canvas) {{ display: none !important; }}
"""

CEK_JS = """() => {
  const t = document.getElementById('hw-tuval');
  const c = document.createElement('canvas');
  c.width = t.width; c.height = t.height;
  const x = c.getContext('2d');
  const bg = getComputedStyle(document.querySelector('.hw-sahne')).backgroundColor;
  x.fillStyle = (!bg || bg === 'rgba(0, 0, 0, 0)') ? '#EBE9E3' : bg;
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(t, 0, 0);
  return c.toDataURL('image/jpeg', 0.9);
}"""


def main() -> None:
    cikti = Path(sys.argv[1])
    cikti.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        tarayici = p.chromium.launch(channel="msedge", headless=True)
        sayfa = tarayici.new_page(viewport={"width": BOY, "height": BOY}, device_scale_factor=1)
        sayfa.goto(URL, wait_until="networkidle")
        sayfa.wait_for_function("() => window.__ADJY_HW && window.__ADJY_HW.hazir", timeout=30000)
        sayfa.add_style_tag(content=SAHNE_CSS)
        sayfa.evaluate("() => window.dispatchEvent(new Event('resize'))")
        sayfa.wait_for_timeout(800)
        for dosya, adimlar, yakin in KARELER:
            for tur, ad in adimlar:
                sec = f'[data-yol="{ad}"]' if tur == "yol" else f'[data-hazir="{ad}"]'
                sayfa.evaluate("s => document.querySelector(s).click()", sec)
                sayfa.wait_for_timeout(900)
            sayfa.evaluate("() => document.getElementById('hw-ortala').click()")
            sayfa.wait_for_timeout(1200)
            adim, mx, my = yakin
            sayfa.mouse.move(BOY * mx, BOY * my)
            for _ in range(adim):
                sayfa.mouse.wheel(0, -120)
                sayfa.wait_for_timeout(120)
            sayfa.wait_for_timeout(1200)
            veri = sayfa.evaluate(CEK_JS)
            (cikti / dosya).write_bytes(base64.b64decode(veri.split(",", 1)[1]))
            print(dosya, sayfa.evaluate("() => window.__ADJY_HW.duzen + ' | ' + window.__ADJY_HW.olcu"))
        tarayici.close()


if __name__ == "__main__":
    main()
