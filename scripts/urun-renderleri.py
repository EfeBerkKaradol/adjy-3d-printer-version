# -*- coding: utf-8 -*-
"""Tasarım araçlarının ürün görsellerini gerçek ışın izlemeyle (Blender Cycles) üretir.

Her kare için araç tarayıcıda açılır, hazır ayar ve alanlar uygulanır, sahnedeki ağlar
(dünya koordinatı, renk, malzeme) alınır ve scripts/render/studyo_blender.py ile çizilir.
Görsel, müşterinin kuracağı modelin kendisidir: ayrı bir "tanıtım modeli" yoktur.

Dev sunucusu 5000 portunda açıkken:
    python scripts/urun-renderleri.py public/tasarim-araclari/_gorsel
    python scripts/urun-renderleri.py <klasör> --yalniz foto-yapboz,saksi
    python scripts/urun-renderleri.py <klasör> --yalniz foto-yapboz --ilk     (yalnız ilk kare)

Gerekenler: Playwright (kurulu Edge), Blender 4.x (BLENDER ortam değişkeni ya da varsayılan yol).
Kare tanımları: scripts/yilbasi-kareleri.py (ARACLAR) + bu dosyadaki ESKI araçlar.
"""
import base64
import importlib.util
import json
import re
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from playwright.sync_api import sync_playwright

KOK = Path(__file__).resolve().parent
BLENDER = os.environ.get("BLENDER", r"C:\Program Files\Blender Foundation\Blender 4.3\blender.exe")
# ?vitrin kullanılmaz: o kipte ölçü katmanı (sahneyi yakalayan) bağlanmıyor
ADRES = "http://localhost:5000/tasarim-araclari/{arac}/index.html"

_spec = importlib.util.spec_from_file_location("kareler", KOK / "yilbasi-kareleri.py")
_k = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_k)

# Kendi sahnesini kuran eski araçlar: (dosya, adımlar, bekleme sn[, seçenek])
# adım: ("sec", seçici, değer) | ("tikla", seçici) | ("alan", {id: değer}) | ("js", kod)
# seçenek: {"boya": "#hex"} en büyük ağın rengi · {"bakis": [x, y, z]} kamera yönü (aracın ekseninde)
def _hazir(arac, secici, degerler, bekle=2.5, ek=None):
    return [(f"{arac}{'' if i == 0 else '-' + str(i + 1)}.jpg", [("sec", secici, v)], bekle, (ek or [{}] * len(degerler))[i]) for i, v in enumerate(degerler)]


def _tikla(arac, kalip, degerler, bekle=2.5, ek=None):
    return [(f"{arac}{'' if i == 0 else '-' + str(i + 1)}.jpg", [("tikla", kalip.format(v))], bekle, (ek or [{}] * len(degerler))[i]) for i, v in enumerate(degerler)]


ESKI = {
    "saksi": _tikla("saksi", '[data-preset="{}"]', ["M", "SPIRAL", "PLEATED", "L"],
                    ek=[{}, {"boya": "#9caf88"}, {"boya": "#e8e0cf"}, {"boya": "#3a3d42"}]),
    # Sarkıt: zemine oturmuş gibi durmasın diye havada çizilir
    "avize": _hazir("avize", "#preset-selector", ["klasik_e27", "mimari_plise", "minimal_silindir", "kompakt_e14"], ek=[{"havada": 0.45}] * 4),
    "kelepce-askilik": _hazir("kelepce-askilik", "#preset-selector", ["cift_j_istasyon", "derin_canta_j", "aero_truss_agir", "standart_studyo"]),
    "pcb-kutu": _hazir("pcb-kutu", "#preset-select", ["rpi_iot", "esp32_sensor", "stm32_plc", "power_psu"]),
    # Taban ve kabartma QR iki ayrı filament, zıt renk çiftleri (aracın hazır renk çiftlerinden)
    "nfc-qr": [
        ("nfc-qr.jpg", [("tikla", '[data-preset="cafe_arch"]')], 2.5, {}),
        ("nfc-qr-2.jpg", [("tikla", '[data-preset="hotel_medallion"]')], 2.5, {}),
        ("nfc-qr-3.jpg", [("tikla", '[data-preset="corner_keychain"]')], 2.5, {}),
        ("nfc-qr-4.jpg", [("tikla", '[data-preset="crest_social"]'), ("tikla", '#color-pair-swatches [data-emboss="#E04F33"]')], 2.5, {}),
        ("nfc-qr-5.jpg", [("tikla", '[data-preset="landscape_split"]'), ("tikla", '#color-pair-swatches [data-base="#F2EFE9"]')], 2.5, {}),
        ("nfc-qr-6.jpg", [("tikla", '[data-preset="octagon_ind"]'), ("tikla", '#color-pair-swatches [data-base="#142238"]')], 2.5, {}),
    ],
    "lazer-uv-fikstur": _hazir("lazer-uv-fikstur", "#presetSelect", ["metal_card", "laser_pen", "round_token", "uv_flask"]),
    "mimari-maket": _hazir("mimari-maket", "#preset-select", ["konut_200", "kule_500", "pavyon_50", "karma_100"], bekle=4),
    "moduler-dolap": _tikla("moduler-dolap", '[data-room="{}"]', ["ODA_01_Mutfak", "ODA_02_Salon_Sehpa", "ODA_03_Yatak_Gardirop", "ODA_05_Calisma_Kitaplik"], bekle=3.5),
    "araba-yolu": [
        ("araba-yolu.jpg", [("tikla", '[data-yol="looping"]')], 3, {}),
        ("araba-yolu-2.jpg", [("tikla", '[data-yol="oval"]')], 3, {}),
        ("araba-yolu-3.jpg", [("tikla", '[data-yol="tek"]'), ("tikla", '[data-hazir="egimli"]')], 3, {}),
        ("araba-yolu-4.jpg", [("tikla", '[data-yol="tek"]'), ("tikla", '[data-hazir="sarmal"]')], 3, {}),
        ("araba-yolu-5.jpg", [("tikla", '[data-yol="tepe"]')], 3, {}),
        ("araba-yolu-6.jpg", [("tikla", '[data-yol="tek"]'), ("tikla", '[data-hazir="korkuluklu"]')], 3, {}),
    ],
    # organizator.jpg ve -2 ev ortamına ayrılmıştır (ORTAM, EK_ORTAM): stüdyo kareleri -3…-6
    "organizator": [
        ("organizator-6.jpg", [], 2.5, {}),
        ("organizator-3.jpg", [], 2.5, {"bakis": [0.02, -1, -0.05]}),
        ("organizator-4.jpg", [("tikla", '[data-sys="2"]')], 3.5, {}),
        ("organizator-5.jpg", [("js", "P.W = 336; P.D = 294; DIRTY = true;")], 3.5, {}),
    ],
}

# Organizatör ekranda kilit takozlarını (turuncu) ve dolgu şeritlerini (yeşil) ayırt
# etmek için boyar; basılan parça gövdeyle aynı filamenttir
ORG_RENK = {"#f59e0b": "#333c4a", "#ff5500": "#333c4a", "#00d48a": "#333c4a"}

# Ortam fotoğrafı: her ürünün İLK görseli (<arac>.jpg). Ürün bir ev ortamında durur
# (bkz. render/ortam.py). "kare": hangi stüdyo karesinin kurulumu kullanılacak (0 = ilk).
# Belirtilmeyen araç: ilk kare, masa üstünde.
ORTAM = {
    "foto-duvar-panosu": {"ortam": "duvar", "duvar": "acik"},
    "col-ufku-pano": {"ortam": "duvar", "duvar": "mavi"},
    "kum-tepesi-pano": {"ortam": "duvar", "duvar": "adacayi"},
    "isimli-yilbasi-celengi": {"ortam": "duvar", "duvar": "acik"},
    "kahraman-amblemi": {"ortam": "duvar", "duvar": "kum"},
    "neon-sahil-tabela": {"ortam": "duvar", "kare": 2, "duvar": "adacayi"},
    "ses-dalgasi-plaketi": {"ortam": "duvar", "kare": 2, "duvar": "acik"},
    "avize": {"havada": 1.0, "egim": 6, "doluluk": 0.8, "kaydir": -0.2},
    "dalgali-vazo": {"duvar": "adacayi"},
    "saksi": {"duvar": "acik"},
    "kum-dalgasi-kase": {"duvar": "kum"},
    "col-kurdu-kalemlik": {"duvar": "mavi"},
    "isikli-yilbasi-feneri": {"duvar": "koyu", "isik": 26},
    "burgulu-yilbasi-agaci": {"duvar": "acik"},
    "foto-kutu": {"duvar": "kum"},
    "lav-catlagi-zar-tepsisi": {"duvar": "koyu"},
    # Yapboz çerçevesi eğik yarıklı ayaklarına takılı, masada dik durur (egim: yarığın açısı)
    "foto-yapboz": {"ayakli": 15, "duvar": "acik"},
    # Çekmece organizeri: komodinin yarıya çekilmiş çekmecesinde
    "organizator": {"ortam": "cekmece", "duvar": "acik", "renkEsle": ORG_RENK},
    # Kelepçe askılık: gerçek masa kenarına sıkılmış, kancada kulaklık
    "kelepce-askilik": {"ortam": "masaKenari", "duvar": "kum", "doluluk": 0.8},
}

# Aynı ürünün ikinci ev fotoğrafı: (dosya, ayar) — "kare" hangi stüdyo karesinin kurulumu
EK_ORTAM = {
    "organizator": [("organizator-2.jpg", {"ortam": "atolye", "kare": 2, "duvar": "adacayi", "renkEsle": ORG_RENK})],
}


# Özelleştirme animasyonu (--animasyon): aracın hazır ayarları sırayla dolaşılır;
# aradaki karelerde sayısal alanlar (boy, çap, dalga sayısı…) adım adım değişir,
# seçimler (renk, biçim) geçişin ortasında döner. Her kare aynı ev ortamında,
# sabit kamerayla çizilir ve <arac>.mp4 olarak birleştirilir.
ANIM = {"gecis": 7, "bekle": 3, "kareHizi": 10, "boy": 640, "ornek": 16}
if "--anim-deneme" in sys.argv:  # hızlı deneme: az kare, küçük boy
    ANIM.update({"gecis": 2, "bekle": 1, "boy": 480, "ornek": 12})

# Sayfadaki bütün ayar alanları: { id: [tür, değer, adım] }
DURUM_JS = r"""() => {
  const o = {};
  document.querySelectorAll('input[id], select[id]').forEach((e) => {
    if (e.type === 'file' || e.type === 'button' || e.type === 'hidden') return;
    if (e.type === 'checkbox') o[e.id] = ['kutu', e.checked, 0];
    else if (e.type === 'range' || e.type === 'number') o[e.id] = ['sayi', parseFloat(e.value), parseFloat(e.step) || 1];
    else o[e.id] = ['secim', e.value, 0];
  });
  return o;
}"""


def ara_durum(a, b, t):
    """İki hazır ayar arası: sayılar adımına oturtularak, seçimler ortada."""
    t = t * t * (3 - 2 * t)
    o = {}
    for k, (tur, va, adim) in a.items():
        vb = b.get(k, (tur, va, adim))[1]
        if tur == "sayi" and va == va and vb == vb:  # NaN değilse
            v = va + (vb - va) * t
            adim = adim or 1
            o[k] = round(round(v / adim) * adim, 6)
        else:
            o[k] = va if t < 0.5 else vb
    return o


def anim_kareleri(sayfa, arac, tur, tanim):
    """Döner: her kare için sahne verisi listesi."""
    kareler = (tanim[1] if tur == "yb" else tanim)[:4]
    hazir = lambda: sayfa.wait_for_function(
        f"() => window.{tanim[0]} && window.{tanim[0]}.hazir" if tur == "yb" else "() => window.ADJY && window.ADJY.hazirMi()", timeout=60000)
    sayfa.goto(ADRES.format(arac=arac), wait_until="networkidle")
    hazir()
    sayfa.wait_for_timeout(1200)
    durumlar = []
    for kare in kareler:
        if tur == "yb":
            _dosya, onayar, alanlar, _y = kare[:4]
            tikla = kare[4] if len(kare) > 4 else []
            if onayar:
                sayfa.evaluate("s => document.querySelector(s).click()", f'[data-hazir="{onayar}"]')
                sayfa.wait_for_timeout(600)
            if alanlar:
                sayfa.evaluate(_k.ALAN_JS, alanlar)
            for sec in tikla:
                sayfa.evaluate("s => document.querySelector(s).click()", sec)
                sayfa.wait_for_timeout(300)
        else:
            for adim in kare[1]:
                if adim[0] == "sec":
                    sayfa.evaluate("""([s, v]) => { const e = document.querySelector(s); e.value = v;
                      e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }""", [adim[1], adim[2]])
                elif adim[0] == "tikla":
                    sayfa.evaluate("s => document.querySelector(s).click()", adim[1])
                elif adim[0] == "js":
                    sayfa.evaluate(adim[1])
                sayfa.wait_for_timeout(900)
        sayfa.wait_for_timeout(1500)
        durumlar.append(sayfa.evaluate(DURUM_JS))
    n = len(durumlar)
    dizi = []
    for i in range(n):
        a, b = durumlar[i], durumlar[(i + 1) % n]
        tam = {k: v[1] for k, v in a.items()}
        dizi += [tam] * ANIM["bekle"]
        dizi += [ara_durum(a, b, f / (ANIM["gecis"] + 1)) for f in range(1, ANIM["gecis"] + 1)]
    yavas = arac.startswith("foto-") or tur == "eski"
    onceki, cikti = None, []
    for no, durum in enumerate(dizi):
        degisen = {k: v for k, v in durum.items() if onceki is None or onceki.get(k) != v}
        if degisen:
            sayfa.evaluate(_k.ALAN_JS, degisen)
            ornekDegisti = any(k.endswith("-ornek") for k in degisen)
            sayfa.wait_for_timeout(2600 if ornekDegisti else 1300 if yavas else 550)
        onceki = durum
        veri = sayfa.evaluate(AL_JS)
        if veri and veri["aglar"]:
            cikti.append(veri)
    return cikti


def animasyon(sayfa, arac, tur, tanim, hedef: Path, gecici: Path):
    veriler = anim_kareleri(sayfa, arac, tur, tanim)
    if len(veriler) < 8:
        print("ANIMASYON YOK", arac, len(veriler))
        return
    ayar = dict(ORTAM.get(arac, {}))
    ayar.pop("kare", None)
    # Bütün karelerin birleşik kutusu: kamera ve eşyalar sabit kalır
    mn = [min(a["kutu"][i] for v in veriler for a in v["aglar"]) for i in range(3)]
    mx = [max(a["kutu"][i + 3] for v in veriler for a in v["aglar"]) for i in range(3)]
    klasor = gecici / f"{arac}-anim"
    isler = []
    for no, veri in enumerate(veriler):
        veri.update({"ortam": "masa", "tohum": sum(map(ord, arac)), **ayar, "boy": ANIM["boy"], "ornek": ANIM["ornek"]})
        veri["bakis"] = veriler[0]["bakis"]
        # Zemin gibi ayıklanan düzlemler kutuya girmesin diye kutu, yazımdan sonra yeniden hesaplanır
        yol = sahne_yaz(veri, klasor / f"k{no:03d}", 1.0)
        isler.append({"sahne": str(yol), "cikti": str(klasor / f"kare_{no:03d}.jpg")})
    # Duvarda ayak çizilmez: kutuya da girmesin (ürün kadrajda küçülmesin)
    sayilir = lambda a: not (ayar.get("ortam") == "duvar" and re.search(r"ayak|stand", a.get("ad", ""), re.I))
    mn = [min(a["kutu"][i] for v in veriler for a in v["aglar"] if sayilir(a)) for i in range(3)]
    mx = [max(a["kutu"][i + 3] for v in veriler for a in v["aglar"] if sayilir(a)) for i in range(3)]
    for is_ in isler:
        v = json.loads(Path(is_["sahne"]).read_text(encoding="utf-8"))
        v["kutu"] = [mn, mx]
        Path(is_["sahne"]).write_text(json.dumps(v), encoding="utf-8")
    isYolu = klasor / "isler.json"
    isYolu.write_text(json.dumps(isler), encoding="utf-8")
    r = subprocess.run([BLENDER, "-b", "-P", str(KOK / "render" / "studyo_blender.py"), "--", str(isYolu)],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    hata = [s for s in (r.stdout + r.stderr).splitlines() if s.startswith("HATA")]
    cizilen = sorted(klasor.glob("kare_*.jpg"))
    if hata or len(cizilen) != len(isler):
        print("ANIMASYON EKSİK", arac, len(cizilen), "/", len(isler), hata[:2])
        return
    mp4 = hedef / f"{arac}.mp4"
    f = subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(ANIM["kareHizi"]), "-i", str(klasor / "kare_%03d.jpg"),
                        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "25", "-preset", "slow", "-movflags", "+faststart", "-an", str(mp4)],
                       capture_output=True, text=True)
    print("ANIMASYON", arac, len(isler), "kare", mp4.stat().st_size // 1024 if mp4.exists() else 0, "KB", f.stderr[:200])


def ilk_adi(arac: str, dosya: str, n: int) -> str:
    """Stüdyo karelerinin ilki sona taşınır: <arac>.jpg ortam fotoğrafına ayrılmıştır."""
    return f"{arac}-{n + 1}.jpg" if dosya == f"{arac}.jpg" else dosya


# Sahnedeki ağlar: görünür, yardımcı olmayan Mesh'ler; dünya koordinatında üçgenler
AL_JS = r"""() => {
  const O = window.ADJY_OLCU;
  let d = O && O.durum();
  if (!d || !d.sahne || !d.kamera) d = O && O.model();
  if (!d || !d.sahne || !d.kamera) return null;
  const T = d.T, sahne = d.sahne, kamera = d.kamera;
  sahne.updateMatrixWorld(true);
  const b64 = (f32) => { const u = new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength); let s = ''; const N = 0x8000;
    for (let i = 0; i < u.length; i += N) s += String.fromCharCode.apply(null, u.subarray(i, i + N)); return btoa(s); };
  const gorunur = (o) => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  // Bağlam gövdesi (çekmece, masa önizlemesi, duvar…): ürün değil, Blender kendi ortamını kurar
  const baglamAdi = (o) => { for (let p = o; p; p = p.parent) if (/^baglam/.test(p.name || '')) return p.name; return null; };
  const aglar = [];
  const v = new T.Vector3(), m4 = new T.Matrix4();
  sahne.traverse((o) => {
    if (!o.isMesh || !gorunur(o) || !o.geometry || !o.geometry.attributes.position) return;
    if (/zemin|izgara|grid|ground|floor|helper|golge|shadow|gizmo|outline|kutu-cizgi/i.test(o.name || '')) return;
    const g = o.geometry, pos = g.attributes.position, idx = g.index;
    const N = idx ? idx.count : pos.count;
    // Çok malzemeli ağ (ör. taban + kabartma QR): her grup kendi rengiyle ayrı ağ
    const parcalar = Array.isArray(o.material) && g.groups && g.groups.length
      ? g.groups.map((gr) => [gr.start, Math.min(N, gr.start + gr.count), o.material[gr.materialIndex || 0]])
      : [[0, N, Array.isArray(o.material) ? o.material[0] : o.material]];
    for (const [i0, i1, mat] of parcalar) {
    if (!mat || mat.type === 'ShadowMaterial' || mat.visible === false) continue;
    if (mat.transparent && mat.opacity < 0.08) continue;
    if (mat.wireframe) continue;
    const n = i1 - i0;
    if (n < 3) continue;
    const ornek = o.isInstancedMesh ? o.count : 1;
    const renkOz = mat.vertexColors && g.attributes.color ? g.attributes.color : null;
    const u = new Float32Array(n * 3 * ornek);
    const kr = renkOz ? new Float32Array(n * 3 * ornek) : null;
    let k = 0;
    for (let e = 0; e < ornek; e++) {
      if (o.isInstancedMesh) { o.getMatrixAt(e, m4); m4.premultiply(o.matrixWorld); } else m4.copy(o.matrixWorld);
      for (let i = i0; i < i1; i++) {
        const j = idx ? idx.getX(i) : i;
        v.fromBufferAttribute(pos, j).applyMatrix4(m4);
        if (kr) { kr[k] = renkOz.getX(j); kr[k + 1] = renkOz.getY(j); kr[k + 2] = renkOz.getZ(j); }
        u[k++] = v.x; u[k++] = v.y; u[k++] = v.z;
      }
    }
    // Zemin gibi dev düzlemler modele dahil değil
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, z0 = 1e9, z1 = -1e9;
    for (let i = 0; i < u.length; i += 3) { if (u[i] < x0) x0 = u[i]; if (u[i] > x1) x1 = u[i]; if (u[i+1] < y0) y0 = u[i+1]; if (u[i+1] > y1) y1 = u[i+1]; if (u[i+2] < z0) z0 = u[i+2]; if (u[i+2] > z1) z1 = u[i+2]; }
    aglar.push({
      ad: o.name || mat.name || o.type, veri: b64(u), koseRenk: kr ? b64(kr) : null,
      kutu: [x0, y0, z0, x1, y1, z1], ucgen: u.length / 9,
      renk: mat.color ? '#' + mat.color.getHexString() : '#d8d5cc',
      puruz: typeof mat.roughness === 'number' ? mat.roughness : 0.5,
      metal: typeof mat.metalness === 'number' ? mat.metalness : 0,
      saydam: mat.transparent ? 1 - mat.opacity : (mat.transmission || 0),
      isik: mat.emissive && mat.emissive.getHex() !== 0 && (mat.emissiveIntensity || 0) > 0.05 ? '#' + mat.emissive.getHexString() : null,
      isikGuc: mat.emissiveIntensity || 0, tur: mat.type,
      dokulu: mat.bumpMap ? (mat.bumpScale || 1) : 0,
      baglam: baglamAdi(o),
    });
    }
  });
  const yon = new T.Vector3();
  kamera.getWorldDirection(yon);
  return { up: kamera.up.toArray(), bakis: yon.toArray(), fov: kamera.fov || 30, aglar };
}"""


def sahne_yaz(veri, klasor: Path, birim: float) -> Path:
    """Tarayıcıdan gelen ağları diske yazar; aşırı büyük düzlemleri (zemin) ayıklar."""
    klasor.mkdir(parents=True, exist_ok=True)
    aglar = veri["aglar"]
    # Model ölçeği: en büyük ağ dışındakilerin ortanca boyu; onun 12 katını aşan düzlem zemin sayılır
    boylar = sorted(max(a["kutu"][3] - a["kutu"][0], a["kutu"][4] - a["kutu"][1], a["kutu"][5] - a["kutu"][2]) for a in aglar)
    ortanca = boylar[len(boylar) // 2] if boylar else 1
    olcu = lambda a: sorted((a["kutu"][3] - a["kutu"][0], a["kutu"][4] - a["kutu"][1], a["kutu"][5] - a["kutu"][2]))
    # Kalınlığı olan en büyük ağ: modelin kendisi
    govde = max((olcu(a)[2] for a in aglar if olcu(a)[0] > 0.05), default=ortanca)
    kayit = []
    for i, a in enumerate(aglar):
        ince, _, boy = olcu(a)
        if len(aglar) > 1 and boy > 12 * ortanca and ince < 0.02 * boy and a["ucgen"] <= 4:
            continue
        # Kalınlıksız, modelden geniş düzlem: aracın kendi zemini ya da tabla ızgarası
        if len(aglar) > 1 and ince < 0.05 and boy > 1.15 * govde:
            continue
        # Yarı saydam sahne eşyası (masa kenarı): camdan değil, dolu çizilsin
        if 0.3 < a["saydam"] < 0.9 and a["tur"] != "MeshBasicMaterial" and "glass" not in a["ad"].lower() and "cam" not in a["ad"].lower():
            a["saydam"] = 0
        ham = base64.b64decode(a.pop("veri"))
        if birim != 1:
            import array
            f = array.array("f")
            f.frombytes(ham)
            ham = array.array("f", (x * birim for x in f)).tobytes()
        (klasor / f"ag{i}.bin").write_bytes(ham)
        a["dosya"] = f"ag{i}.bin"
        kr = a.pop("koseRenk", None)
        if kr:
            (klasor / f"renk{i}.bin").write_bytes(base64.b64decode(kr))
            a["koseRenk"] = f"renk{i}.bin"
        kayit.append(a)
    veri["aglar"] = kayit
    yol = klasor / "sahne.json"
    yol.write_text(json.dumps(veri), encoding="utf-8")
    return yol


def yb_kareleri(sayfa, arac, degisken, kareler, ilk):
    """yilbasi-kareleri.py ile aynı kurulum; ekran görüntüsü yerine sahne alınır."""
    for kare in kareler[: 1 if ilk else None]:
        dosya, hazir, alanlar, _yakin = kare[:4]
        tikla = kare[4] if len(kare) > 4 else []
        sayfa.goto(ADRES.format(arac=arac), wait_until="networkidle")
        sayfa.wait_for_function(f"() => window.{degisken} && window.{degisken}.hazir", timeout=40000)
        sayfa.wait_for_timeout(900)
        if hazir:
            sayfa.evaluate("s => document.querySelector(s).click()", f'[data-hazir="{hazir}"]')
            sayfa.wait_for_timeout(700)
        if alanlar:
            sayfa.evaluate(_k.ALAN_JS, alanlar)
        sayfa.wait_for_timeout(1200)
        for sec in tikla:
            sayfa.evaluate("s => document.querySelector(s).click()", sec)
            sayfa.wait_for_timeout(400)
        sayfa.wait_for_timeout(1600)
        yield dosya, sayfa.evaluate(AL_JS)


def eski_kareleri(sayfa, arac, kareler, ilk):
    for dosya, adimlar, bekle, secenek in kareler[: 1 if ilk else None]:
        sayfa.goto(ADRES.format(arac=arac), wait_until="networkidle")
        sayfa.wait_for_function("() => window.ADJY && window.ADJY.hazirMi()", timeout=60000)
        sayfa.wait_for_timeout(1500)
        for adim in adimlar:
            if adim[0] == "sec":
                sayfa.evaluate("""([s, v]) => { const e = document.querySelector(s); e.value = v;
                  e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }""", [adim[1], adim[2]])
            elif adim[0] == "tikla":
                sayfa.evaluate("s => document.querySelector(s).click()", adim[1])
            elif adim[0] == "alan":
                sayfa.evaluate(_k.ALAN_JS, adim[1])
            elif adim[0] == "js":
                sayfa.evaluate(adim[1])
            sayfa.wait_for_timeout(1200)
        sayfa.wait_for_timeout(int(bekle * 1000))
        veri = sayfa.evaluate(AL_JS)
        if veri and veri["aglar"]:
            if secenek.get("bakis"):
                veri["bakis"] = secenek["bakis"]
            if secenek.get("boya"):
                max(veri["aglar"], key=lambda a: a["ucgen"])["renk"] = secenek["boya"]
            if secenek.get("havada"):
                veri["havada"] = secenek["havada"]
        yield dosya, veri


def main() -> None:
    hedef = Path(sys.argv[1]).resolve()
    hedef.mkdir(parents=True, exist_ok=True)
    yalniz = set(sys.argv[sys.argv.index("--yalniz") + 1].split(",")) if "--yalniz" in sys.argv else None
    ilk = "--ilk" in sys.argv
    ortamKipi = "--ortam" in sys.argv  # yalnız ortam fotoğrafları (<arac>.jpg)
    # --sahneler <klasör>: alınan sahneler orada kalır (ışık ayarını yeniden denemek için)
    gecici = Path(sys.argv[sys.argv.index("--sahneler") + 1]).resolve() if "--sahneler" in sys.argv else Path(tempfile.mkdtemp(prefix="adjy-render-"))
    isler = []
    with sync_playwright() as p:
        tarayici = p.chromium.launch(channel="msedge", headless=True)
        sayfa = tarayici.new_page(viewport={"width": 1400, "height": 1000})
        hepsi = [(a, "yb", v) for a, v in _k.ARACLAR.items()] + [(a, "eski", v) for a, v in ESKI.items()]
        for arac, tur, tanim in hepsi:
            if yalniz and arac not in yalniz:
                continue
            if "--animasyon" in sys.argv:
                try:
                    animasyon(sayfa, arac, tur, tanim, hedef, gecici)
                except Exception as e:
                    print("HATA", arac, str(e)[:300], flush=True)
                continue
            try:
                kareler = tanim[1] if tur == "yb" else tanim
                kaynak = []
                if ortamKipi:
                    # (dosya, ortam ayarı, sahne) üçlüleri: ilk görsel + varsa ek ortam fotoğrafları
                    for hedefAdi, ayar in [(f"{arac}.jpg", dict(ORTAM.get(arac, {})))] + [(d, dict(e)) for d, e in EK_ORTAM.get(arac, [])]:
                        secili = [kareler[ayar.pop("kare", 0)]]
                        al = yb_kareleri(sayfa, arac, tanim[0], secili, False) if tur == "yb" else eski_kareleri(sayfa, arac, secili, False)
                        kaynak += [(hedefAdi, ayar, veri) for _d, veri in al]
                else:
                    al = yb_kareleri(sayfa, arac, tanim[0], kareler, ilk) if tur == "yb" else eski_kareleri(sayfa, arac, kareler, ilk)
                    kaynak = [(d, None, veri) for d, veri in al]
                for dosya, ayar, veri in kaynak:
                    if not veri or not veri["aglar"]:
                        print("SAHNE YOK", arac, dosya)
                        continue
                    if ortamKipi:
                        veri.update({"ortam": "masa", "tohum": sum(map(ord, arac)), **ayar})
                    else:
                        dosya = ilk_adi(arac, dosya, len(kareler))
                    birim = 1.0
                    yol = sahne_yaz(veri, gecici / (Path(dosya).stem + ("-ortam" if ortamKipi else "")), birim)
                    isler.append({"sahne": str(yol), "cikti": str(hedef / dosya)})
                    print("alındı", dosya, len(veri["aglar"]), "ağ", sum(a["ucgen"] for a in veri["aglar"]), "üçgen", flush=True)
                    if "--kuru" in sys.argv:  # yalnız sahneyi dök, çizme
                        print("   up", veri["up"], "bakış", [round(x, 2) for x in veri["bakis"]])
                        for a in sorted(veri["aglar"], key=lambda a: -a["ucgen"])[:8]:
                            k = a["kutu"]
                            print(f'   {a["ad"][:26]:26} {a["ucgen"]:7} üçgen {a["renk"]} {a["tur"]:22} saydam {a["saydam"]:.2f} boy {k[3]-k[0]:.0f}×{k[4]-k[1]:.0f}×{k[5]-k[2]:.0f}')
            except Exception as e:
                print("HATA", arac, str(e)[:200])
        tarayici.close()
    if not isler or "--kuru" in sys.argv:
        return
    isYolu = gecici / "isler.json"
    isYolu.write_text(json.dumps(isler), encoding="utf-8")
    r = subprocess.run([BLENDER, "-b", "-P", str(KOK / "render" / "studyo_blender.py"), "--", str(isYolu)],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    for satir in (r.stdout + r.stderr).splitlines():
        if satir.startswith(("CIZILDI", "SURE", "HATA", "Traceback", "  File", "Error")) or "Error" in satir:
            print(satir)


if __name__ == "__main__":
    main()
