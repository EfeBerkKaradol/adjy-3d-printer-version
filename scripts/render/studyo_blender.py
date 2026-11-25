# -*- coding: utf-8 -*-
"""Ürün görseli stüdyosu (Blender 4.x, Cycles).

Tasarım araçlarının sahnesinden alınan ağları (bkz. ../urun-renderleri.py) gerçek
ışın izlemeyle çizer: sonsuz fon, üç yumuşak ışık, baskı malzemesi (PLA: yarı mat,
katman çizgili), hafif alan derinliği.

    blender -b -P scripts/render/studyo_blender.py -- <isler.json>

isler.json: [{ "sahne": "<klasör>/sahne.json", "cikti": "<dosya>.jpg" }, …]
sahne.json: { up, bakis, fov, aglar: [{ ad, dosya, renk, puruz, metal, saydam, isik, isikGuc, koseRenk }] }
Ağ dosyaları: float32, üçgen başına 9 sayı, dünya koordinatı (mm).
"""
import json, math, os, re, sys, time

import bpy
import bmesh
import numpy as np
from mathutils import Matrix, Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ortam  # ev ortamları: masa, duvar

BOY = 1100
ORNEK = int(os.environ.get("ADJY_ORNEK", 48))
SSS = os.environ.get("ADJY_SSS", "1") == "1"
OLCEK = 0.001  # mm → m
FON = (0.6, 0.59, 0.565)  # sıcak açık gri kâğıt fon


def srgb(h):
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    h = h.lstrip("#")
    return (lin(int(h[0:2], 16)), lin(int(h[2:4], 16)), lin(int(h[4:6], 16)), 1.0)


_ilk = True


def temizle():
    """İlk karede boş sahne; sonrakilerde yalnız veri silinir (çizim çekirdeği bellekte kalır)."""
    global _ilk
    if _ilk:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        _ilk = False
        return
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for kume in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras, bpy.data.worlds):
        for x in list(kume):
            kume.remove(x)


def cevir(up):
    """three dünya ekseni → Blender (Z yukarı)."""
    if abs(up[1]) > 0.5:  # Y yukarı: (x, y, z) → (x, −z, y)
        return Matrix(((1, 0, 0), (0, 0, -1), (0, 1, 0)))
    return Matrix.Identity(3)


def ag_kur(ad, v, renk_koseleri=None):
    n = len(v)
    m = bpy.data.meshes.new(ad)
    m.vertices.add(n)
    m.vertices.foreach_set("co", v.ravel())
    m.loops.add(n)
    m.loops.foreach_set("vertex_index", np.arange(n, dtype=np.int32))
    m.polygons.add(n // 3)
    m.polygons.foreach_set("loop_start", np.arange(0, n, 3, dtype=np.int32))
    m.polygons.foreach_set("loop_total", np.full(n // 3, 3, dtype=np.int32))
    if renk_koseleri is not None:
        ka = m.color_attributes.new(name="Renk", type="FLOAT_COLOR", domain="CORNER")
        rgba = np.ones((n, 4), dtype=np.float32)
        rgba[:, :3] = renk_koseleri
        ka.data.foreach_set("color", rgba.ravel())
    m.update()
    m.validate()
    # Köşeleri kaynakla: yumuşak gölgeleme ve keskin kenar ayrımı için
    bm = bmesh.new()
    bm.from_mesh(m)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=2e-6)
    bm.to_mesh(m)
    bm.free()
    m.polygons.foreach_set("use_smooth", np.ones(len(m.polygons), dtype=bool))
    m.set_sharp_from_angle(angle=math.radians(38))
    o = bpy.data.objects.new(ad, m)
    bpy.context.scene.collection.objects.link(o)
    return o


def pla(ad, a, pikselMm):
    """Baskı malzemesi: yarı mat plastik; yan yüzde katman, üst yüzde tarama çizgileri."""
    mat = bpy.data.materials.new(ad)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    cik = nt.nodes.new("ShaderNodeOutputMaterial")
    p = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(p.outputs["BSDF"], cik.inputs["Surface"])
    renk = srgb(a.get("renk", "#d8d5cc"))
    if a.get("koseRenk"):
        at = nt.nodes.new("ShaderNodeAttribute")
        at.attribute_name = "Renk"
        nt.links.new(at.outputs["Color"], p.inputs["Base Color"])
    else:
        p.inputs["Base Color"].default_value = renk
    metal = float(a.get("metal", 0))
    p.inputs["Metallic"].default_value = min(1.0, metal)
    p.inputs["Roughness"].default_value = min(0.62, max(0.3, float(a.get("puruz", 0.5)) * 0.82))
    p.inputs["IOR"].default_value = 1.46
    acik = 0.2126 * renk[0] + 0.7152 * renk[1] + 0.0722 * renk[2]
    # Açık renk PLA ışığı biraz içine alır
    p.inputs["Subsurface Weight"].default_value = 0.0 if metal > 0.3 or not SSS else 0.03 + 0.08 * acik
    p.inputs["Subsurface Radius"].default_value = (0.0012, 0.001, 0.0008)
    p.inputs["Subsurface Scale"].default_value = 1.0
    saydam = float(a.get("saydam", 0))
    if saydam > 0.05:
        p.inputs["Transmission Weight"].default_value = min(0.95, saydam)
        p.inputs["Roughness"].default_value = 0.18
    if a.get("isik"):
        p.inputs["Emission Color"].default_value = srgb(a["isik"])
        p.inputs["Emission Strength"].default_value = 3.0 * float(a.get("isikGuc", 1))

    # --- baskı dokusu: kabartma (bump)
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    ayir = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], ayir.inputs["Vector"])
    nay = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["True Normal"], nay.inputs["Vector"])

    def dalga(giris, periyotM):
        c = nt.nodes.new("ShaderNodeMath")
        c.operation = "MULTIPLY"
        c.inputs[1].default_value = 2 * math.pi / periyotM
        nt.links.new(giris, c.inputs[0])
        s = nt.nodes.new("ShaderNodeMath")
        s.operation = "SINE"
        nt.links.new(c.outputs[0], s.inputs[0])
        return s.outputs[0]

    # Katman: Z boyunca 0,2 mm · Tarama: üst yüzde 45°, 0,42 mm
    kose = nt.nodes.new("ShaderNodeMath")
    kose.operation = "ADD"
    nt.links.new(ayir.outputs["X"], kose.inputs[0])
    nt.links.new(ayir.outputs["Y"], kose.inputs[1])
    katman = dalga(ayir.outputs["Z"], 0.0002)
    tarama = dalga(kose.outputs[0], 0.00042 * math.sqrt(2))
    ustMu = nt.nodes.new("ShaderNodeMath")
    ustMu.operation = "ABSOLUTE"
    nt.links.new(nay.outputs["Z"], ustMu.inputs[0])
    esik = nt.nodes.new("ShaderNodeMath")
    esik.operation = "GREATER_THAN"
    esik.inputs[1].default_value = 0.85
    nt.links.new(ustMu.outputs[0], esik.inputs[0])
    kar = nt.nodes.new("ShaderNodeMix")
    kar.data_type = "FLOAT"
    nt.links.new(esik.outputs[0], kar.inputs["Factor"])
    nt.links.new(katman, kar.inputs[2])
    nt.links.new(tarama, kar.inputs[3])
    bump = nt.nodes.new("ShaderNodeBump")
    # Çizgi pikselden inceyse harelenme olmasın diye söner
    guc = max(0.0, min(1.0, (0.16 - pikselMm) / 0.1))
    bump.inputs["Strength"].default_value = 0.42 * guc
    bump.inputs["Distance"].default_value = 0.00004
    nt.links.new(kar.outputs[0], bump.inputs["Height"])
    if guc > 0.02 and saydam <= 0.05:
        nt.links.new(bump.outputs["Normal"], p.inputs["Normal"])
    # Pürüzlü yüzey (dilimleyicide titretilmiş dış duvar): ince taneli kabartma
    dokulu = float(a.get("dokulu", 0) or 0)
    if dokulu > 0:
        gurultu = nt.nodes.new("ShaderNodeTexNoise")
        gurultu.inputs["Scale"].default_value = 1500
        gurultu.inputs["Detail"].default_value = 3
        nt.links.new(geo.outputs["Position"], gurultu.inputs["Vector"])
        tane = nt.nodes.new("ShaderNodeBump")
        tane.inputs["Strength"].default_value = min(1.0, 0.45 * dokulu)
        tane.inputs["Distance"].default_value = 0.00025
        nt.links.new(gurultu.outputs["Fac"], tane.inputs["Height"])
        nt.links.new(tane.outputs["Normal"], p.inputs["Normal"])
        p.inputs["Roughness"].default_value = 0.62
    return mat


def isik(ad, konum, hedef, boyut, guc, renk=(1, 1, 1)):
    l = bpy.data.lights.new(ad, "AREA")
    l.shape = "DISK"
    l.size = boyut
    l.energy = guc
    l.color = renk
    o = bpy.data.objects.new(ad, l)
    o.location = konum
    o.rotation_euler = (hedef - konum).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.collection.objects.link(o)
    return o


def fon_kur(c, R, z0, fh, rh):
    """Sonsuz fon: zemin, arkada yay ile duvara döner."""
    dW = 3.4 * R
    rc = 2.2 * R
    prof = [(-60 * R, 0.0)]
    prof.append((dW - rc, 0.0))
    for i in range(1, 17):
        a = (i / 16) * math.pi / 2
        prof.append((dW - rc + rc * math.sin(a), rc - rc * math.cos(a)))
    prof.append((dW, 60 * R))
    gen = 80 * R
    v, f = [], []
    for d, h in prof:
        for s in (-1, 1):
            q = Vector((c.x, c.y, z0)) + fh * d + rh * (s * gen) + Vector((0, 0, h))
            v.append(q)
    for i in range(len(prof) - 1):
        f.append((2 * i, 2 * i + 1, 2 * i + 3, 2 * i + 2))
    m = bpy.data.meshes.new("fon")
    m.from_pydata(v, [], f)
    m.update()
    for p in m.polygons:
        p.use_smooth = True
    o = bpy.data.objects.new("fon", m)
    bpy.context.scene.collection.objects.link(o)
    mat = bpy.data.materials.new("fon")
    mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*FON, 1)
    b.inputs["Roughness"].default_value = 0.92
    b.inputs["Specular IOR Level"].default_value = 0.15
    m.materials.append(mat)
    # Normaller kameraya (yukarı / öne) baksın
    bm = bmesh.new()
    bm.from_mesh(m)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bm.faces[0].normal.z < 0:
        bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bm.to_mesh(m)
    bm.free()
    return o


def studyo(S, sc, mn, mx, c, R, z0, bakis):
    """Boş stüdyo: sonsuz fon, üç ışık. Döner: (kamera uzaklığı, fov)."""
    # --- kamera: aracın bakış yönü korunur, uzaklık kadraja göre yeniden kurulur
    if bakis.z > -0.12:  # yatay bakış: ürün fotoğrafı gibi hafif yukarıdan
        bakis = Vector((bakis.x, bakis.y, -0.22)).normalized()
    fov = math.radians(30)
    kam = bpy.data.cameras.new("kamera")
    kam.sensor_fit = "VERTICAL"
    kam.angle_y = fov
    ko = bpy.data.objects.new("kamera", kam)
    sc.collection.objects.link(ko)
    sc.camera = ko
    rot = (-bakis).to_track_quat("Z", "Y")  # kamera −Z'ye bakar
    ko.rotation_euler = rot.to_euler()
    # Kutu köşelerini kadraja sığdıran en yakın uzaklık
    sag, yuk = rot @ Vector((1, 0, 0)), rot @ Vector((0, 1, 0))
    tanY = math.tan(fov / 2) * 0.8  # kenarda %10 pay
    uzak = 0.0
    for x in (mn.x, mx.x):
        for y in (mn.y, mx.y):
            for z in (mn.z, mx.z):
                q = Vector((x, y, z)) - c
                derin = q.dot(bakis)
                uzak = max(uzak, abs(q.dot(sag)) / tanY - derin, abs(q.dot(yuk)) / tanY - derin)
    ko.location = c - bakis * uzak
    kam.clip_start = uzak * 0.02
    kam.clip_end = uzak * 200
    kam.dof.use_dof = True
    kam.dof.focus_distance = uzak
    kam.dof.aperture_fstop = 20

    # --- fon ve ışıklar (kameranın yatay yönüne göre)
    fh = Vector((bakis.x, bakis.y, 0))
    fh = fh.normalized() if fh.length > 1e-4 else Vector((0, 1, 0))
    rh = Vector((fh.y, -fh.x, 0))
    fon_kur(c, R, z0, fh, rh)
    hedef = Vector((c.x, c.y, z0 + (mx.z - mn.z) * 0.4))
    G = float(S.get("isikGucu", float(os.environ.get("ADJY_ISIK", 165)))) * R * R
    isik("ana", hedef - fh * 1.5 * R - rh * 2.3 * R + Vector((0, 0, 3.3 * R)), hedef, 2.6 * R, G, (1.0, 0.97, 0.93))
    isik("dolgu", hedef - fh * 2.4 * R + rh * 2.6 * R + Vector((0, 0, 1.5 * R)), hedef, 3.4 * R, G * 0.3, (0.93, 0.96, 1.0))
    isik("arka", hedef + fh * 2.6 * R + rh * 0.9 * R + Vector((0, 0, 3.0 * R)), hedef, 2.2 * R, G * 0.55)
    dunya = bpy.data.worlds.new("dunya")
    dunya.use_nodes = True
    dunya.node_tree.nodes["Background"].inputs["Color"].default_value = (1, 1, 1, 1)
    dunya.node_tree.nodes["Background"].inputs["Strength"].default_value = float(os.environ.get("ADJY_DUNYA", 0.1))
    sc.world = dunya
    return uzak, fov


def ciz(sahneYolu, cikti):
    t0 = time.time()
    temizle()
    S = json.load(open(sahneYolu, encoding="utf-8"))
    klasor = os.path.dirname(sahneYolu)
    sc = bpy.context.scene
    C = cevir(S["up"])
    Cn = np.array(C, dtype=np.float32)

    # --- ağlar
    hepsi = []
    veriler = []
    for a in S["aglar"]:
        v = np.fromfile(os.path.join(klasor, a["dosya"]), dtype=np.float32).reshape(-1, 3)
        if len(v) < 3:
            continue
        v = (v @ Cn.T) * OLCEK
        kr = None
        if a.get("koseRenk"):
            kr = np.fromfile(os.path.join(klasor, a["koseRenk"]), dtype=np.float32).reshape(-1, 3)
        veriler.append((a, v, kr))
    ortamAdi = S.get("ortam", "studyo")
    if ortamAdi == "duvar":
        # Ayak gibi ayrı parçalar duvarda yok; levha dik çevrilir
        veriler = [x for x in veriler if not re.search(r"ayak|stand", x[0].get("ad", ""), re.I)]
        ortam.duvar_cevir(veriler, np)
    tum = np.concatenate([v for _, v, _ in veriler])
    mn, mx = Vector(tum.min(axis=0).tolist()), Vector(tum.max(axis=0).tolist())
    c = (mn + mx) / 2
    R = max(0.02, (mx - mn).length / 2)
    # "havada": sarkıt gibi asılı ürünlerde zemin, model yüksekliğinin bu oranı kadar aşağıda
    z0 = mn.z - float(S.get("havada", 0)) * (mx.z - mn.z)

    bakis = (C @ Vector(S["bakis"])).normalized()  # kameradan modele
    if ortamAdi == "masa":
        uzak, fov = ortam.masa(S, mn, mx, bakis)
    elif ortamAdi == "duvar":
        uzak, fov = ortam.duvar(S, mn, mx)
    else:
        uzak, fov = studyo(S, sc, mn, mx, c, R, z0, bakis)
    pikselMm = (2 * uzak * math.tan(fov / 2) / BOY) / OLCEK

    # --- malzeme ve nesneler
    matlar = {}
    for a, v, kr in veriler:
        anahtar = json.dumps([a.get(k) for k in ("renk", "puruz", "metal", "saydam", "isik", "isikGuc", "dokulu")]) + ("k" if kr is not None else "")
        if anahtar not in matlar:
            matlar[anahtar] = pla(a.get("ad", "pla"), a, pikselMm)
        o = ag_kur(a.get("ad") or "ag", v, kr)
        o.data.materials.append(matlar[anahtar])

    # --- çizim
    sc.render.engine = "CYCLES"
    cy = sc.cycles
    tercih = bpy.context.preferences.addons["cycles"].preferences
    for tur in os.environ.get("ADJY_AYGIT", "OPTIX,CUDA").split(","):
        if tur == "CPU":
            cy.device = "CPU"
            break
        try:
            tercih.compute_device_type = tur
            tercih.get_devices()
            for d in tercih.devices:
                d.use = d.type == tur
            if any(d.use for d in tercih.devices):
                cy.device = "GPU"
                break
        except Exception:
            pass
    cy.samples = ORNEK
    cy.use_adaptive_sampling = True
    cy.adaptive_threshold = 0.02
    cy.use_denoising = True
    cy.max_bounces = 8
    cy.transparent_max_bounces = 12
    cy.filter_width = 1.3
    sc.render.resolution_x = sc.render.resolution_y = BOY
    sc.render.resolution_percentage = 100
    sc.render.image_settings.file_format = "JPEG"
    sc.render.image_settings.quality = 92
    sc.view_settings.view_transform = os.environ.get("ADJY_GORUNUM", "Standard")
    try:
        sc.view_settings.look = os.environ.get("ADJY_BAKIS", "Medium High Contrast")
    except Exception:
        pass
    sc.view_settings.exposure = float(S.get("pozlama", 0.0))
    sc.render.filepath = cikti
    t1 = time.time()
    bpy.ops.render.render(write_still=True)
    print("SURE kurulum %.1f sn, cizim %.1f sn, aygit %s %s" % (t1 - t0, time.time() - t1, cy.device, tercih.compute_device_type), flush=True)
    print("CIZILDI %s %.1f sn · R=%.0f mm · piksel %.3f mm · %d ag" % (os.path.basename(cikti), time.time() - t0, R / OLCEK, pikselMm, len(veriler)), flush=True)


if __name__ == "__main__":
    isler = json.load(open(sys.argv[sys.argv.index("--") + 1], encoding="utf-8"))
    for i in isler:
        try:
            ciz(i["sahne"], i["cikti"])
        except Exception as e:  # bir kare düşerse diğerleri sürsün
            import traceback
            traceback.print_exc()
            print("HATA", i["cikti"], e, flush=True)
