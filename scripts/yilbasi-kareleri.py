"""Yılbaşı ve kum tepesi araçlarının ürün görsellerini araçların kendi 3B sahnesinden çeker.

Dev sunucusu 5000 portunda açıkken:
    python scripts/yilbasi-kareleri.py public/tasarim-araclari/_gorsel

?vitrin parametresi ızgarayı, ölçü çizgilerini ve sahne yazılarını gizler.
Tarayıcı olarak kurulu Edge kullanılır (Playwright'ın kendi tarayıcısı yok).
Her kare: bir hazır ayar (ya da None) + gerekirse birkaç alan, isteğe bağlı tıklanacak
düğmeler (ör. fenerde "Işığı yak"), sonra kamera yakınlaştırması.
Yalnız bazı araçlar: python scripts/yilbasi-kareleri.py <klasör> --yalniz arac1,arac2
"""
import base64
import json
import sys
from pathlib import Path

from playwright.sync_api import sync_playwright

KOK = "http://localhost:5000/tasarim-araclari/{arac}/index.html?vitrin"
BOY = 1100

# arac: (hazır-ayar değişkeni, [(dosya, hazır, {alan: değer}, yakınlaştırma)])
ARACLAR = {
    "isimli-yilbasi-susu": ("__ADJY_YB", [
        ("isimli-yilbasi-susu.jpg", "aile", {}, 2),
        ("isimli-yilbasi-susu-2.jpg", "bebek", {}, 2),
        ("isimli-yilbasi-susu-3.jpg", "cam", {}, 2),
        ("isimli-yilbasi-susu-4.jpg", "ask", {}, 2),
    ]),
    "kar-tanesi-susu": ("__ADJY_KT", [
        ("kar-tanesi-susu.jpg", "klasik", {}, 2),
        ("kar-tanesi-susu-2.jpg", "dantel", {"kt-renk": "gumus"}, 2),
        ("kar-tanesi-susu-3.jpg", "kristal", {"kt-renk": "altin"}, 2),
        ("kar-tanesi-susu-4.jpg", "yalin", {"kt-renk": "mavi"}, 2),
    ]),
    "burgulu-yilbasi-agaci": ("__ADJY_AG", [
        ("burgulu-yilbasi-agaci.jpg", "klasik", {}, 1),
        ("burgulu-yilbasi-agaci-2.jpg", "isikli", {}, 1),
        ("burgulu-yilbasi-agaci-3.jpg", "modern", {}, 1),
        ("burgulu-yilbasi-agaci-4.jpg", "mini", {}, 1),
    ]),
    "kum-tepesi-pano": ("__ADJY_KP", [
        ("kum-tepesi-pano.jpg", "hilal", {}, 2),
        ("kum-tepesi-pano-2.jpg", "deniz", {"kp-renk": "okra"}, 2),
        ("kum-tepesi-pano-3.jpg", "kivrik", {"kp-renk": "pas"}, 2),
        ("kum-tepesi-pano-4.jpg", "yalniz", {"kp-renk": "kemik"}, 2),
    ]),
    "col-kurdu-kalemlik": ("__ADJY_CK", [
        ("col-kurdu-kalemlik.jpg", "klasik", {}, 1),
        ("col-kurdu-kalemlik-2.jpg", "yasli", {"ck-renk": "pas"}, 1),
        ("col-kurdu-kalemlik-3.jpg", "yavru", {"ck-renk": "kum"}, 1),
        ("col-kurdu-kalemlik-4.jpg", "saksi", {"ck-renk": "antrasit"}, 1),
    ]),
    "kum-dalgasi-kase": ("__ADJY_KD", [
        ("kum-dalgasi-kase.jpg", "meyve", {}, 1),
        ("kum-dalgasi-kase-2.jpg", "anahtar", {"kd-renk": "kemik"}, 1),
        ("kum-dalgasi-kase-3.jpg", "derin", {"kd-renk": "okra"}, 1),
        ("kum-dalgasi-kase-4.jpg", "vazo", {"kd-renk": "pas"}, 1),
    ]),
    "kurabiye-kalibi": ("__ADJY_KK", [
        ("kurabiye-kalibi.jpg", None, {"kk-sekil": "yildiz", "kk-renk": "kirmizi"}, 0),
        ("kurabiye-kalibi-2.jpg", None, {"kk-sekil": "kurabiye", "kk-renk": "yesil"}, 0),
        ("kurabiye-kalibi-3.jpg", None, {"kk-sekil": "kardan", "kk-renk": "beyaz"}, 0),
        ("kurabiye-kalibi-4.jpg", None, {"kk-sekil": "kar", "kk-renk": "mavi"}, 0),
    ]),
    "isimli-sofra-karti": ("__ADJY_SK", [
        ("isimli-sofra-karti.jpg", "klasik", {}, 2),
        ("isimli-sofra-karti-2.jpg", "yildizli", {"sk-isim": "Mehmet"}, 2),
        ("isimli-sofra-karti-3.jpg", "kar", {"sk-isim": "Elif"}, 2),
        ("isimli-sofra-karti-4.jpg", "can", {"sk-isim": "Deniz"}, 2),
    ]),
    "isikli-yilbasi-feneri": ("__ADJY_YF", [
        ("isikli-yilbasi-feneri.jpg", "orman", {}, 1, ["#yf-isik"]),
        ("isikli-yilbasi-feneri-2.jpg", "kar", {}, 1, ["#yf-isik"]),
        ("isikli-yilbasi-feneri-3.jpg", "gece", {}, 1, ["#yf-isik"]),
        ("isikli-yilbasi-feneri-4.jpg", "isim", {}, 1, ["#yf-isik"]),
    ]),
    "neon-sahil-tabela": ("__ADJY_NS", [
        ("neon-sahil-tabela.jpg", "gunbatimi", {}, 2),
        ("neon-sahil-tabela-2.jpg", "gece", {"ns-isim": "Arcade", "ns-alt": "24 SAAT ACIK"}, 2),
        ("neon-sahil-tabela-3.jpg", "sahil", {"ns-isim": "Defne", "ns-alt": "YAZ 2027", "ns-durus": "delik"}, 2),
        ("neon-sahil-tabela-4.jpg", "sade", {"ns-isim": "Studio", "ns-alt": ""}, 2),
    ]),
    "col-ufku-pano": ("__ADJY_CU", [
        ("col-ufku-pano.jpg", "ikiay", {}, 2),
        ("col-ufku-pano-2.jpg", "gece", {}, 2),
        ("col-ufku-pano-3.jpg", "baharat", {}, 2),
        ("col-ufku-pano-4.jpg", "sessiz", {}, 2),
    ]),
    "kahraman-amblemi": ("__ADJY_KA", [
        ("kahraman-amblemi.jpg", "simsek", {}, 2),
        ("kahraman-amblemi-2.jpg", "harf", {"ka-harf": "D"}, 2),
        ("kahraman-amblemi-3.jpg", "kral", {}, 2),
        ("kahraman-amblemi-4.jpg", "gece", {"ka-harf": "K"}, 2),
    ]),
    "lav-catlagi-zar-tepsisi": ("__ADJY_LT", [
        ("lav-catlagi-zar-tepsisi.jpg", "cehennem", {}, 2),
        ("lav-catlagi-zar-tepsisi-2.jpg", "volkan", {}, 2),
        ("lav-catlagi-zar-tepsisi-3.jpg", "plazma", {}, 2),
        ("lav-catlagi-zar-tepsisi-4.jpg", "asit", {}, 2),
    ]),
    "isimli-yilbasi-celengi": ("__ADJY_YC", [
        ("isimli-yilbasi-celengi.jpg", "klasik", {}, 2),
        ("isimli-yilbasi-celengi-2.jpg", "altin", {"yc-isim": "Mutlu Yıllar"}, 2),
        ("isimli-yilbasi-celengi-3.jpg", "kar", {"yc-isim": "Demir Evi"}, 2),
        ("isimli-yilbasi-celengi-4.jpg", "sade", {}, 2),
    ]),
    # Fotoğraf araçları: hazır ayar biçimi kurar; örnek fotoğraf ve filamentler alanlardan
    "foto-yapboz": ("__ADJY_FY", [
        ("foto-yapboz.jpg", "aile", {}, 2),
        ("foto-yapboz-2.jpg", "yuz", {"fy-ornek": "portre", "fy-renk-1": "siyah", "fy-renk-2": "antrasit", "fy-renk-3": "gri", "fy-renk-4": "beyaz", "fy-govde": "1", "fy-renk-cerceve": "1", "fy-renk-yazi": "4", "fy-zoom": 1.5}, 2),
        ("foto-yapboz-3.jpg", "manzara", {"fy-ornek": "sehir", "fy-renk-1": "siyah", "fy-renk-2": "antrasit", "fy-renk-3": "gri", "fy-renk-4": "beyaz", "fy-govde": "1", "fy-renk-cerceve": "1", "fy-renk-yazi": "4", "fy-yazi": "İstanbul"}, 2),
        ("foto-yapboz-4.jpg", "mini", {"fy-ornek": "cicek", "fy-renk-1": "yesil", "fy-renk-2": "pembe", "fy-renk-3": "beyaz", "fy-govde": "1"}, 2),
    ]),
    "foto-duvar-panosu": ("__ADJY_FP", [
        ("foto-duvar-panosu.jpg", "tek", {"fp-ornek": "balon", "fp-renk-1": "kirmizi", "fp-renk-2": "yesil", "fp-renk-3": "acikmavi", "fp-renk-4": "beyaz", "fp-govde": "3", "fp-renk-kenarlik": "4"}, 2),
        ("foto-duvar-panosu-2.jpg", "triptik", {}, 2),
        ("foto-duvar-panosu-3.jpg", "kare", {"fp-ornek": "portre", "fp-renk-1": "siyah", "fp-renk-2": "antrasit", "fp-renk-3": "gri", "fp-renk-4": "beyaz", "fp-govde": "1", "fp-renk-kenarlik": "4", "fp-zoom": 1.5}, 2),
        ("foto-duvar-panosu-4.jpg", "masa", {"fp-ornek": "cicek", "fp-renk-1": "yesil", "fp-renk-2": "pembe", "fp-renk-3": "sari", "fp-renk-4": "beyaz", "fp-govde": "1", "fp-renk-kenarlik": "4"}, 2),
    ]),
    "foto-kutu": ("__ADJY_FK", [
        ("foto-kutu.jpg", "hatira", {}, 1),
        ("foto-kutu-2.jpg", "taki", {"fk-ornek": "balon", "fk-renk-1": "kirmizi", "fk-renk-2": "yesil", "fk-renk-3": "acikmavi", "fk-renk-4": "beyaz", "fk-renk-kapak": "1", "fk-renk-kutu": "1", "fk-acik": True}, 1),
        ("foto-kutu-3.jpg", "kalem", {"fk-ornek": "gunbatimi", "fk-renk-1": "lacivert", "fk-renk-2": "mor", "fk-renk-3": "turuncu", "fk-renk-4": "sari", "fk-renk-kapak": "1", "fk-renk-kutu": "1", "fk-acik": True}, 1),
        ("foto-kutu-4.jpg", "klasik", {"fk-ornek": "portre", "fk-renk-1": "siyah", "fk-renk-2": "antrasit", "fk-renk-3": "gri", "fk-renk-4": "beyaz", "fk-renk-kapak": "1", "fk-renk-kutu": "1", "fk-zoom": 1.4}, 1),
    ]),
    "dalgali-vazo": ("__ADJY_DV", [
        ("dalgali-vazo.jpg", "lilyum", {}, 1),
        ("dalgali-vazo-2.jpg", "burgu", {}, 1),
        ("dalgali-vazo-3.jpg", "halka", {}, 1),
        ("dalgali-vazo-4.jpg", "yalin", {}, 1),
    ]),
    "ses-dalgasi-plaketi": ("__ADJY_SD", [
        ("ses-dalgasi-plaketi.jpg", "sevgi", {}, 2),
        ("ses-dalgasi-plaketi-2.jpg", "bebek", {"sd-yazi": "Anne"}, 2, ['[data-ornek-ses="kahkaha"]']),
        ("ses-dalgasi-plaketi-3.jpg", "halka", {"sd-yazi": "17.05.2026"}, 2, ['[data-ornek-ses="kalp"]']),
        ("ses-dalgasi-plaketi-4.jpg", "sarki", {"sd-yazi": "Bizim Şarkımız"}, 2, ['[data-ornek-ses="muzik"]']),
    ]),
}

SAHNE_CSS = f"""
.yb-sahne {{ position: fixed !important; inset: 0 !important; width: {BOY}px !important;
  height: {BOY}px !important; max-height: none !important; z-index: 2147483000 !important; margin: 0 !important; }}
.yb-sahne > :not(canvas) {{ display: none !important; }}
[data-adjy-olcu], [data-adjy-olcu-dugme] {{ display: none !important; }}
"""

CEK_JS = """() => {
  const t = document.querySelector('.yb-tuval');
  const c = document.createElement('canvas');
  c.width = t.width; c.height = t.height;
  const x = c.getContext('2d');
  const bg = getComputedStyle(document.querySelector('.yb-sahne')).backgroundColor;
  x.fillStyle = (!bg || bg === 'rgba(0, 0, 0, 0)') ? '#EBE9E3' : bg;
  x.fillRect(0, 0, c.width, c.height);
  x.drawImage(t, 0, 0);
  return c.toDataURL('image/jpeg', 0.9);
}"""

ALAN_JS = """(alanlar) => {
  for (const [id, v] of Object.entries(alanlar)) {
    const e = document.getElementById(id);
    if (!e) continue;
    if (e.type === 'checkbox') e.checked = !!v; else e.value = String(v);
    e.dispatchEvent(new Event('input', { bubbles: true }));
    e.dispatchEvent(new Event('change', { bubbles: true }));
  }
}"""


def main() -> None:
    cikti = Path(sys.argv[1])
    cikti.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        tarayici = p.chromium.launch(channel="msedge", headless=True)
        yalniz = set(sys.argv[sys.argv.index("--yalniz") + 1].split(",")) if "--yalniz" in sys.argv else None
        for arac, (degisken, kareler) in ARACLAR.items():
            if yalniz and arac not in yalniz:
                continue
            sayfa = tarayici.new_page(viewport={"width": BOY, "height": BOY}, device_scale_factor=1)
            sayfa.goto(KOK.format(arac=arac), wait_until="networkidle")
            sayfa.wait_for_function(f"() => window.{degisken} && window.{degisken}.hazir", timeout=30000)
            sayfa.add_style_tag(content=SAHNE_CSS)
            sayfa.evaluate("() => window.dispatchEvent(new Event('resize'))")
            sayfa.wait_for_timeout(1500)
            for kare in kareler:
                dosya, hazir, alanlar, yakin = kare[:4]
                tikla = kare[4] if len(kare) > 4 else []
                if hazir:
                    sayfa.evaluate("s => document.querySelector(s).click()", f'[data-hazir="{hazir}"]')
                    sayfa.wait_for_timeout(600)
                if alanlar:
                    sayfa.evaluate(ALAN_JS, alanlar)
                sayfa.wait_for_timeout(900)
                for sec in tikla:
                    sayfa.evaluate("s => document.querySelector(s).click()", sec)
                    sayfa.wait_for_timeout(300)
                # Yeni kareye ortalanmış kamerayla başla
                sayfa.evaluate("() => window.dispatchEvent(new Event('resize'))")
                sayfa.wait_for_timeout(700)
                sayfa.mouse.move(BOY * 0.5, BOY * 0.5)
                for _ in range(yakin):
                    sayfa.mouse.wheel(0, -100)
                    sayfa.wait_for_timeout(120)
                sayfa.wait_for_timeout(1300)
                veri = sayfa.evaluate(CEK_JS)
                (cikti / dosya).write_bytes(base64.b64decode(veri.split(",", 1)[1]))
                print(dosya, json.dumps(sayfa.evaluate(f"() => window.{degisken}.olcu"), ensure_ascii=False))
                # Sonraki kare yakınlaştırmasız başlasın
                sayfa.reload(wait_until="networkidle")
                sayfa.wait_for_function(f"() => window.{degisken} && window.{degisken}.hazir", timeout=30000)
                sayfa.add_style_tag(content=SAHNE_CSS)
                sayfa.evaluate("() => window.dispatchEvent(new Event('resize'))")
                sayfa.wait_for_timeout(1200)
            sayfa.close()
        tarayici.close()


if __name__ == "__main__":
    main()
