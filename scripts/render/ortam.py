# -*- coding: utf-8 -*-
"""Ürün görselleri için ev ortamları (Blender 4.x). studyo_blender.py çağırır.

  masa  → duvara dayalı ahşap masa: ürün masanın üstünde; arkada bitki, kitap,
          kupa, duvara yaslı çerçeve; soldan pencere ışığı.
  duvar → ürün duvarda asılı (yatık basılan levha dik çevrilir); altında ahşap
          konsol, üstünde bitki ve kitaplar.

Eşyalar gerçek ölçülerindedir (metre) ve ürünün yanında / arkasında durur:
ürünü örtmez, alan derinliğiyle bulanık kalır. Hepsi kodla kurulur; dışarıdan
model ya da doku dosyası yoktur.
"""
import math
import os
import random

import bpy
from mathutils import Matrix, Vector

YUKARI = Vector((0, 0, 1))


def _lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def rgb(h):
    h = h.lstrip("#")
    return (_lin(int(h[0:2], 16) / 255), _lin(int(h[2:4], 16) / 255), _lin(int(h[4:6], 16) / 255), 1.0)


# ---------------------------------------------------------------- malzemeler
def mat_duz(ad, renk, puruz=0.5, **ek):
    m = bpy.data.materials.new(ad)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = rgb(renk) if isinstance(renk, str) else renk
    p.inputs["Roughness"].default_value = puruz
    for k, v in ek.items():
        p.inputs[k].default_value = v
    return m


def mat_ahsap(ad, koyu, acik, aci):
    """Damarlı ahşap: damar, dünya ekseninde `aci` yönünde uzar."""
    m = bpy.data.materials.new(ad)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    esle = nt.nodes.new("ShaderNodeMapping")
    esle.inputs["Rotation"].default_value = (0, 0, -aci)
    esle.inputs["Scale"].default_value = (1.6, 26, 26)  # damar boyunca seyrek, enine sık
    nt.links.new(geo.outputs["Position"], esle.inputs["Vector"])
    g = nt.nodes.new("ShaderNodeTexNoise")
    g.inputs["Scale"].default_value = 4.5
    g.inputs["Detail"].default_value = 12
    g.inputs["Roughness"].default_value = 0.7
    g.inputs["Distortion"].default_value = 0.6
    nt.links.new(esle.outputs["Vector"], g.inputs["Vector"])
    r = nt.nodes.new("ShaderNodeValToRGB")
    r.color_ramp.elements[0].position = 0.32
    r.color_ramp.elements[0].color = rgb(koyu)
    r.color_ramp.elements[1].position = 0.72
    r.color_ramp.elements[1].color = rgb(acik)
    nt.links.new(g.outputs["Fac"], r.inputs["Fac"])
    # Tahta derzleri: enine her 11 cm'de ince koyu çizgi
    ayir = nt.nodes.new("ShaderNodeSeparateXYZ")
    esle2 = nt.nodes.new("ShaderNodeMapping")
    esle2.inputs["Rotation"].default_value = (0, 0, -aci)
    nt.links.new(geo.outputs["Position"], esle2.inputs["Vector"])
    nt.links.new(esle2.outputs["Vector"], ayir.inputs["Vector"])
    mod = nt.nodes.new("ShaderNodeMath")
    mod.operation = "PINGPONG"
    mod.inputs[1].default_value = 0.055
    nt.links.new(ayir.outputs["Y"], mod.inputs[0])
    derz = nt.nodes.new("ShaderNodeMath")
    derz.operation = "LESS_THAN"
    derz.inputs[1].default_value = 0.0009
    nt.links.new(mod.outputs[0], derz.inputs[0])
    kar = nt.nodes.new("ShaderNodeMix")
    kar.data_type = "RGBA"
    kar.inputs[7].default_value = rgb("#2a1a0e")
    nt.links.new(derz.outputs[0], kar.inputs["Factor"])
    nt.links.new(r.outputs["Color"], kar.inputs[6])
    nt.links.new(kar.outputs[2], p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.42
    b = nt.nodes.new("ShaderNodeBump")
    b.inputs["Strength"].default_value = 0.12
    b.inputs["Distance"].default_value = 0.0006
    nt.links.new(g.outputs["Fac"], b.inputs["Height"])
    nt.links.new(b.outputs["Normal"], p.inputs["Normal"])
    return m


def mat_duvar(ad, renk):
    """Boyalı sıva: mat, çok hafif pürüzlü."""
    m = bpy.data.materials.new(ad)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = renk
    p.inputs["Roughness"].default_value = 0.93
    p.inputs["Specular IOR Level"].default_value = 0.2
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    g = nt.nodes.new("ShaderNodeTexNoise")
    g.inputs["Scale"].default_value = 160
    g.inputs["Detail"].default_value = 4
    nt.links.new(geo.outputs["Position"], g.inputs["Vector"])
    b = nt.nodes.new("ShaderNodeBump")
    b.inputs["Strength"].default_value = 0.08
    b.inputs["Distance"].default_value = 0.0004
    nt.links.new(g.outputs["Fac"], b.inputs["Height"])
    nt.links.new(b.outputs["Normal"], p.inputs["Normal"])
    return m


DUVAR_RENGI = {
    "acik": (0.6, 0.58, 0.54, 1), "adacayi": (0.33, 0.39, 0.32, 1), "kum": (0.55, 0.47, 0.37, 1),
    "mavi": (0.3, 0.37, 0.45, 1), "koyu": (0.16, 0.18, 0.2, 1),
}


# ---------------------------------------------------------------- yardımcılar
def _bagla(o):
    if o.name not in bpy.context.scene.collection.objects:
        bpy.context.scene.collection.objects.link(o)


def kutu(ad, boyut, merkez, donZ, mat, pah=0.0025):
    bpy.ops.mesh.primitive_cube_add(size=1, location=merkez, rotation=(0, 0, donZ))
    o = bpy.context.active_object
    o.name = ad
    o.scale = boyut
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)  # pah her yönde eşit olsun
    if pah > 0:
        mod = o.modifiers.new("pah", "BEVEL")
        mod.width = pah
        mod.segments = 3
    o.data.materials.append(mat)
    return o


def silindir(ad, r, h, taban, mat, r2=None, kose=48):
    if r2 is None:
        bpy.ops.mesh.primitive_cylinder_add(vertices=kose, radius=r, depth=h, location=(taban.x, taban.y, taban.z + h / 2))
    else:
        bpy.ops.mesh.primitive_cone_add(vertices=kose, radius1=r, radius2=r2, depth=h, location=(taban.x, taban.y, taban.z + h / 2))
    o = bpy.context.active_object
    o.name = ad
    for pg in o.data.polygons:
        pg.use_smooth = len(pg.vertices) == 4
    o.data.materials.append(mat)
    return o


def isik_alan(ad, konum, hedef, boyut, guc, renk=(1, 1, 1)):
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


def dunya_isigi(guc, donme=0.0):
    """Blender'la gelen iç mekân HDRI'si: ortam ışığı ve yansımalar (kameraya görünmez)."""
    d = bpy.data.worlds.new("dunya")
    d.use_nodes = True
    nt = d.node_tree
    arka = nt.nodes["Background"]
    arka.inputs["Strength"].default_value = guc
    yol = os.path.join(bpy.utils.resource_path("LOCAL"), "datafiles", "studiolights", "world", "interior.exr")
    if os.path.exists(yol):
        env = nt.nodes.new("ShaderNodeTexEnvironment")
        env.image = bpy.data.images.load(yol, check_existing=True)
        koor = nt.nodes.new("ShaderNodeTexCoord")
        esle = nt.nodes.new("ShaderNodeMapping")
        esle.inputs["Rotation"].default_value = (0, 0, donme)
        nt.links.new(koor.outputs["Generated"], esle.inputs["Vector"])
        nt.links.new(esle.outputs["Vector"], env.inputs["Vector"])
        nt.links.new(env.outputs["Color"], arka.inputs["Color"])
    else:
        arka.inputs["Color"].default_value = (1, 0.96, 0.9, 1)
    bpy.context.scene.world = d


# ---------------------------------------------------------------- eşyalar (taban noktası: üstüne konduğu yüzey)
def kitaplar(taban, donZ, rnd):
    renkler = ["#2f5d62", "#c98b3a", "#e8dfcf", "#7a2f2f", "#3a4a6b"]
    rnd.shuffle(renkler)
    z = taban.z
    for i, (w, d, h) in enumerate([(0.215, 0.15, 0.03), (0.195, 0.135, 0.024), (0.17, 0.118, 0.028)]):
        kutu(f"kitap{i}", (w, d, h), (taban.x, taban.y, z + h / 2), donZ + rnd.uniform(-0.16, 0.16), mat_duz(f"kapak{i}", renkler[i], 0.62), 0.002)
        z += h
    return z


def kupa(taban, donZ):
    seramik = mat_duz("seramik", "#efece4", 0.18)
    silindir("kupa", 0.041, 0.092, taban, seramik)
    silindir("kahve", 0.036, 0.003, Vector((taban.x, taban.y, taban.z + 0.086)), mat_duz("kahve", "#2a160c", 0.12))
    bpy.ops.mesh.primitive_torus_add(major_radius=0.027, minor_radius=0.0065, major_segments=32, minor_segments=12,
                                     location=(taban.x + 0.05 * math.cos(donZ), taban.y + 0.05 * math.sin(donZ), taban.z + 0.046),
                                     rotation=(math.pi / 2, 0, donZ))
    o = bpy.context.active_object
    for pg in o.data.polygons:
        pg.use_smooth = True
    o.data.materials.append(seramik)


def bitki(taban, olcek, rnd, saksi="#b5613c"):
    silindir("saksi", 0.05 * olcek, 0.105 * olcek, taban, mat_duz("saksi", saksi, 0.7), r2=0.066 * olcek)
    ust = Vector((taban.x, taban.y, taban.z + 0.1 * olcek))
    silindir("toprak", 0.06 * olcek, 0.004, ust, mat_duz("toprak", "#2b1d14", 0.95))
    yaprak = mat_duz("yaprak", "#2f6b38", 0.42, **{"Subsurface Weight": 0.12})
    yaprak2 = mat_duz("yaprak2", "#3f8446", 0.45, **{"Subsurface Weight": 0.12})
    sap = mat_duz("sap", "#3a5a2c", 0.6)
    n = 13
    for i in range(n):
        az = (i / n) * math.tau + rnd.uniform(-0.25, 0.25)
        egik = rnd.uniform(0.25, 1.05)  # düşeyden
        yon = Vector((math.sin(egik) * math.cos(az), math.sin(egik) * math.sin(az), math.cos(egik)))
        boy = rnd.uniform(0.11, 0.21) * olcek
        uc = ust + yon * boy
        # Sap
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.0022 * olcek, depth=boy, location=ust + yon * boy / 2)
        s = bpy.context.active_object
        s.rotation_euler = YUKARI.rotation_difference(yon).to_euler()
        s.data.materials.append(sap)
        # Yaprak: yassı elips, sapın ucunda, biraz aşağı eğik
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, radius=1, location=uc + yon * 0.045 * olcek)
        y = bpy.context.active_object
        y.scale = (0.024 * olcek * rnd.uniform(0.8, 1.2), 0.068 * olcek * rnd.uniform(0.85, 1.25), 0.0028)
        egim = (yon + Vector((0, 0, -0.35))).normalized()
        y.rotation_euler = (Vector((0, 1, 0)).rotation_difference(egim)).to_euler()
        for pg in y.data.polygons:
            pg.use_smooth = True
        y.data.materials.append(yaprak if i % 2 else yaprak2)


def cerceve(taban, duvarYonu, donZ, rnd):
    """Duvara yaslı küçük çerçeve. duvarYonu: duvara doğru birim vektör."""
    w, h, t = 0.2, 0.26, 0.016
    egim = 0.12
    merkez = Vector((taban.x, taban.y, taban.z + h / 2 * math.cos(egim))) - duvarYonu * (h / 2 * math.sin(egim) + t)
    eksen = Vector((duvarYonu.y, -duvarYonu.x, 0))
    d = Matrix.Rotation(-egim, 4, eksen) @ Matrix.Rotation(donZ, 4, "Z")
    for ad, boyut, one, renk, pr in [("cerceve", (w, t, h), 0, "#1d1d1f", 0.4), ("paspartu", (w - 0.03, 0.004, h - 0.03), t / 2, "#ece6d8", 0.85),
                                     ("resim", (w - 0.09, 0.004, h - 0.11), t / 2 + 0.002, rnd.choice(["#c98b3a", "#2f5d62", "#9a4a3a"]), 0.8)]:
        o = kutu(ad, boyut, merkez - duvarYonu * one, 0, mat_duz(ad, renk, pr), 0.0015 if ad == "cerceve" else 0)
        o.rotation_euler = d.to_euler()


# ---------------------------------------------------------------- kamera
def kamera(konum, hedef, fov, derinlik):
    """derinlik: net kalması istenen derinlik (m); açıklık ona göre seçilir."""
    sc = bpy.context.scene
    kam = bpy.data.cameras.new("kamera")
    kam.sensor_fit = "VERTICAL"
    kam.angle_y = fov
    ko = bpy.data.objects.new("kamera", kam)
    sc.collection.objects.link(ko)
    sc.camera = ko
    ko.location = konum
    ko.rotation_euler = (hedef - konum).to_track_quat("-Z", "Y").to_euler()
    uzak = (hedef - konum).length
    kam.clip_start = uzak * 0.02
    kam.clip_end = uzak * 300
    kam.dof.use_dof = True
    kam.dof.focus_distance = uzak
    odak = (kam.sensor_height / 2) / math.tan(fov / 2) / 1000  # m
    N = derinlik * odak * odak / (2 * 0.00003 * uzak * uzak)
    kam.dof.aperture_fstop = min(16, max(4, N * 1.25))
    return ko, uzak


def sigdir(mn, mx, hedef, yon, fov, doluluk):
    """Kutuyu kadrajın `doluluk` oranına sığdıran kamera uzaklığı (yon: kameradan hedefe)."""
    rot = (-yon).to_track_quat("Z", "Y")
    sag, yuk = rot @ Vector((1, 0, 0)), rot @ Vector((0, 1, 0))
    tanY = math.tan(fov / 2) * doluluk
    uzak = 0.0
    for x in (mn.x, mx.x):
        for y in (mn.y, mx.y):
            for z in (mn.z, mx.z):
                q = Vector((x, y, z)) - hedef
                derin = q.dot(yon)
                uzak = max(uzak, abs(q.dot(sag)) / tanY - derin, abs(q.dot(yuk)) / tanY - derin)
    return uzak


# ---------------------------------------------------------------- MASA
def masa(S, mn, mx, bakis):
    """Ürün masanın üstünde. Döner: (kamera uzaklığı, fov)."""
    rnd = random.Random(int(S.get("tohum", 7)))
    c = (mn + mx) / 2
    hz = mx.z - mn.z
    z0 = mn.z - float(S.get("havada", 0)) * hz
    fh = Vector((bakis.x, bakis.y, 0))
    fh = fh.normalized() if fh.length > 1e-4 else Vector((0, 1, 0))
    yaw = math.radians(float(S.get("duvarAcisi", 20)))
    w = Matrix.Rotation(yaw, 3, "Z") @ fh  # duvara doğru
    u = Vector((w.y, -w.x, 0))  # duvar boyunca (sağ)
    koseler = [Vector((x, y, 0)) - Vector((c.x, c.y, 0)) for x in (mn.x, mx.x) for y in (mn.y, mx.y)]
    extW = max(q.dot(w) for q in koseler)
    extU = max(abs(q.dot(u)) for q in koseler)
    dw = extW + 0.2  # ürün merkezinden duvara
    aciU = math.atan2(u.y, u.x)

    ahsap = mat_ahsap("masa", S.get("ahsapKoyu", "#6b4526"), S.get("ahsapAcik", "#b9864f"), aciU)
    derin = max(0.9, dw + extW + 0.3)
    kutu("masa", (2.6, derin, 0.04), Vector((c.x, c.y, z0 - 0.02)) + w * (dw - derin / 2), aciU, ahsap, 0.004)
    kutu("zemin", (8, 8, 0.02), Vector((c.x, c.y, z0 - 0.76)), aciU, mat_duz("zemin", "#3b3530", 0.6), 0)
    kutu("duvar", (8, 0.04, 3.2), Vector((c.x, c.y, z0 - 0.76 + 1.6)) + w * (dw + 0.02), aciU, mat_duvar("duvar", DUVAR_RENGI.get(S.get("duvar", "acik"), DUVAR_RENGI["acik"])), 0)

    yuzey = Vector((c.x, c.y, z0))
    bitki(yuzey + w * (dw - 0.13) - u * (extU + 0.19), 1.15, rnd)
    kt = yuzey + w * (dw - 0.15) + u * (extU + 0.21)
    kitapUst = kitaplar(kt, aciU + 0.2, rnd)
    kupa(yuzey + w * (min(dw - 0.3, extW * 0.3)) + u * (extU + 0.14), aciU + 2.3)
    cerceve(yuzey + w * dw + u * (extU + 0.5), w, aciU, rnd)

    # Kamera: yatık ürüne yukarıdan, dik ürüne karşıdan
    yassilik = hz / max(1e-6, max(mx.x - mn.x, mx.y - mn.y))
    egim = math.radians(float(S.get("egim", 44 if yassilik < 0.15 else 30 if yassilik < 0.6 else 15)))
    yon = (fh * math.cos(egim) + Vector((0, 0, -math.sin(egim)))).normalized()
    hedef = Vector((c.x, c.y, mn.z + hz * 0.5))
    fov = math.radians(28)
    uzak = sigdir(mn, mx, hedef, yon, fov, float(S.get("doluluk", 0.74 if yassilik < 0.15 else 0.62)))
    # "kaydir": hedefi yüksekliğin bu oranı kadar kaydırır (sarkıtta askı teli kadrajın üstünden çıksın)
    hedef = hedef + Vector((0, 0, float(S.get("kaydir", 0)) * hz))
    kamera(hedef - yon * uzak, hedef, fov, (mx - mn).length * 0.8)

    G = float(S.get("isik", 42))
    isik_alan("pencere", hedef - u * 1.25 - w * 0.55 + Vector((0, 0, 0.95)), hedef, 1.15, G, (1.0, 0.94, 0.86))
    isik_alan("dolgu", hedef + u * 1.3 - w * 1.1 + Vector((0, 0, 0.5)), hedef, 1.4, G * 0.16, (0.9, 0.95, 1.0))
    dunya_isigi(0.32, aciU)
    return uzak, fov


# ---------------------------------------------------------------- DUVAR
def duvar_cevir(veriler, np):
    """Yatık basılan levhayı dik çevirir: ön yüz (+Z) kameraya (−Y), levhanın üstü (+Y) yukarı."""
    tum = np.concatenate([v for _, v, _ in veriler])
    c = (tum.min(axis=0) + tum.max(axis=0)) / 2
    Rm = np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], dtype=np.float32)
    for i, (a, v, kr) in enumerate(veriler):
        veriler[i] = (a, ((v - c) @ Rm.T).astype(np.float32), kr)
    tum = np.concatenate([v for _, v, _ in veriler])
    # Arka yüz duvara 1,5 mm kala; merkez göz hizasında
    kay = np.array([0, -tum[:, 1].max() - 0.0015, 1.42 - (tum[:, 2].min() + tum[:, 2].max()) / 2], dtype=np.float32)
    for i, (a, v, kr) in enumerate(veriler):
        veriler[i] = (a, v + kay, kr)


def duvar(S, mn, mx):
    """Ürün duvarda asılı (duvar y = 0 düzlemi, kamera −Y'de)."""
    rnd = random.Random(int(S.get("tohum", 11)))
    c = (mn + mx) / 2
    gen, yuk = mx.x - mn.x, mx.z - mn.z
    kutu("duvar", (8, 0.04, 3.4), Vector((c.x, 0.021, 1.5)), 0, mat_duvar("duvar", DUVAR_RENGI.get(S.get("duvar", "adacayi"), DUVAR_RENGI["acik"])), 0)
    ustZ = mn.z - max(0.11, 0.55 * yuk)  # konsolun üstü
    ahsap = mat_ahsap("konsol", S.get("ahsapKoyu", "#5c3a20"), S.get("ahsapAcik", "#a9743f"), 0)
    kutu("konsol", (2.2, 0.42, 0.04), Vector((c.x + 0.15, -0.21, ustZ - 0.02)), 0, ahsap, 0.004)
    kutu("konsolOn", (2.2, 0.03, 0.5), Vector((c.x + 0.15, -0.4, ustZ - 0.29)), 0, ahsap, 0.003)
    yuzey = Vector((c.x, 0, ustZ))
    # Eşyalar duvar dibinde ve ürünün iki yanında: kamerayla ürün arasına girmez
    # Bitki ürünün solunda ve yeterince uzakta: yaprakları ürünün önüne düşmez
    bitki(yuzey + Vector((-gen / 2 - 0.3, -0.1, 0)), 0.95, rnd, "#d9d3c7")
    kitaplar(yuzey + Vector((gen / 2 + 0.2, -0.11, 0)), 0.25, rnd)

    fov = math.radians(28)
    yaw = math.radians(float(S.get("duvarAcisi", 17)))
    yon = Vector((-math.sin(yaw), math.cos(yaw), 0.04)).normalized()
    hedef = Vector((c.x, c.y, c.z - 0.1 * yuk))
    uzak = sigdir(mn, mx, hedef, yon, fov, float(S.get("doluluk", 0.52)))
    kamera(hedef - yon * uzak, hedef, fov, max(gen, yuk) * 0.5)
    G = float(S.get("isik", 42))
    isik_alan("pencere", hedef + Vector((-1.5, -1.0, 0.55)), hedef, 1.2, G, (1.0, 0.94, 0.86))
    isik_alan("dolgu", hedef + Vector((1.4, -1.5, 0.2)), hedef, 1.5, G * 0.18, (0.9, 0.95, 1.0))
    dunya_isigi(0.32, 0.6)
    return uzak, fov
