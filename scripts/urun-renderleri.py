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
    return [(f"{arac}{'' if i == 0 else '-' + str(i + 1)}.jpg", [("sec", secici, v)], bekle, (ek or [{}] * 4)[i]) for i, v in enumerate(degerler)]


def _tikla(arac, kalip, degerler, bekle=2.5, ek=None):
    return [(f"{arac}{'' if i == 0 else '-' + str(i + 1)}.jpg", [("tikla", kalip.format(v))], bekle, (ek or [{}] * 4)[i]) for i, v in enumerate(degerler)]


ESKI = {
    "saksi": _tikla("saksi", '[data-preset="{}"]', ["M", "SPIRAL", "PLEATED", "L"],
                    ek=[{}, {"boya": "#9caf88"}, {"boya": "#e8e0cf"}, {"boya": "#3a3d42"}]),
    # Sarkıt: zemine oturmuş gibi durmasın diye havada çizilir
    "avize": _hazir("avize", "#preset-selector", ["klasik_e27", "mimari_plise", "minimal_silindir", "kompakt_e14"], ek=[{"havada": 0.45}] * 4),
    "kelepce-askilik": _hazir("kelepce-askilik", "#preset-selector", ["cift_j_istasyon", "derin_canta_j", "aero_truss_agir", "standart_studyo"]),
    "pcb-kutu": _hazir("pcb-kutu", "#preset-select", ["rpi_iot", "esp32_sensor", "stm32_plc", "power_psu"]),
    "nfc-qr": _tikla("nfc-qr", '[data-preset="{}"]', ["cafe_arch", "hotel_medallion", "corner_keychain", "crest_social"]),
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
    "organizator": [
        ("organizator.jpg", [], 2.5, {}),
        ("organizator-2.jpg", [], 2.5, {"bakis": [0.02, -1, -0.05]}),
        ("organizator-3.jpg", [("tikla", '[data-sys="2"]')], 3.5, {}),
        ("organizator-4.jpg", [("js", "P.W = 336; P.D = 294; DIRTY = true;")], 3.5, {}),
    ],
}

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
  const aglar = [];
  const v = new T.Vector3(), m4 = new T.Matrix4();
  sahne.traverse((o) => {
    if (!o.isMesh || !gorunur(o) || !o.geometry || !o.geometry.attributes.position) return;
    if (/zemin|izgara|grid|ground|floor|helper|golge|shadow|gizmo|outline|kutu-cizgi/i.test(o.name || '')) return;
    const mat = Array.isArray(o.material) ? o.material[0] : o.material;
    if (!mat || mat.type === 'ShadowMaterial' || mat.visible === false) return;
    if (mat.transparent && mat.opacity < 0.08) return;
    if (mat.wireframe) return;
    const g = o.geometry, pos = g.attributes.position, idx = g.index;
    const n = idx ? idx.count : pos.count;
    if (n < 3) return;
    const ornek = o.isInstancedMesh ? o.count : 1;
    const renkOz = mat.vertexColors && g.attributes.color ? g.attributes.color : null;
    const u = new Float32Array(n * 3 * ornek);
    const kr = renkOz ? new Float32Array(n * 3 * ornek) : null;
    let k = 0;
    for (let e = 0; e < ornek; e++) {
      if (o.isInstancedMesh) { o.getMatrixAt(e, m4); m4.premultiply(o.matrixWorld); } else m4.copy(o.matrixWorld);
      for (let i = 0; i < n; i++) {
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
    });
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
            try:
                kaynak = yb_kareleri(sayfa, arac, tanim[0], tanim[1], ilk) if tur == "yb" else eski_kareleri(sayfa, arac, tanim, ilk)
                for dosya, veri in kaynak:
                    if not veri or not veri["aglar"]:
                        print("SAHNE YOK", arac, dosya)
                        continue
                    birim = 1.0
                    yol = sahne_yaz(veri, gecici / Path(dosya).stem, birim)
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
