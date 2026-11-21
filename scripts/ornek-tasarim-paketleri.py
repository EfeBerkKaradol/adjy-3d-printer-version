"""Her tasarım aracından gerçek bir müşteri kaydı (ADJY.paket) alır.

Örnek siparişler bu kayıtlarla kurulur (prisma/seed-ornek-siparis.ts):
atölye siparişi açtığında araç aynı modeli yeniden kurar.

Dev sunucusu 5000 portunda açıkken:
    python scripts/ornek-tasarim-paketleri.py prisma/ornek-tasarim-paketleri.json
Tarayıcı olarak kurulu Edge kullanılır.
"""
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

KOK = "http://localhost:5000/tasarim-araclari"
ARACLAR = [
    "saksi", "avize", "kelepce-askilik", "pcb-kutu", "litofan-lamba", "nfc-qr",
    "lazer-uv-fikstur", "mimari-maket", "moduler-dolap", "organizator", "araba-yolu",
]
# Varsayılandan farklı, göze çarpan bir kurulum isteyen araçlar
HAZIRLIK = {
    "araba-yolu": ['[data-yol="oval"]'],
}


def main() -> None:
    hedef = Path(sys.argv[1])
    sonuc = {}
    with sync_playwright() as p:
        tarayici = p.chromium.launch(channel="msedge", headless=True)
        for arac in ARACLAR:
            sayfa = tarayici.new_page(viewport={"width": 1440, "height": 900})
            sayfa.goto(f"{KOK}/{arac}/index.html", wait_until="networkidle")
            sayfa.wait_for_function("() => window.ADJY && window.ADJY.hazirMi()", timeout=45000)
            sayfa.wait_for_timeout(1500)
            for sec in HAZIRLIK.get(arac, []):
                sayfa.evaluate("s => document.querySelector(s).click()", sec)
                sayfa.wait_for_timeout(2500)
            paket = sayfa.evaluate("() => window.ADJY.paket()")
            sonuc[arac] = paket
            print(arac, len(json.dumps(paket["durum"])), "bayt durum,", paket["olcum"])
            sayfa.close()
        tarayici.close()
    hedef.write_text(json.dumps(sonuc, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
