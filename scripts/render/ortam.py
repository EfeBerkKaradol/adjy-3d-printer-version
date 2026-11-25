# -*- coding: utf-8 -*-
"""Ürün görselleri için ev ortamları (Blender 4.x). studyo_blender.py çağırır.

  masa        → duvara dayalı ahşap masa: ürün masanın üstünde; arkada bitki,
                kitap, kupa, duvara yaslı çerçeve; yanda defter.
  duvar       → ürün duvarda asılı (yatık basılan levha dik çevrilir); altında
                ahşap konsol, üstünde bitki ve kitaplar.
  cekmece     → komodin: üst çekmece çekilmiş, organizer içinde; alt çekmeceler
                kapalı, üstte bitki, kitap, çerçeve.
  atolye      → duvar ızgarası duvarda, altında kasap tahtası tezgâh.
  masaKenari  → kelepçe gerçek masanın kenarına sıkılı, kancada kulaklık.

Işık bütün ortamlarda aynı kurgudadır: kameranın solunda, biraz önünde bir
pencere; güneş pencereden süzülür (kasa ve kayıt gölgeleri masaya, duvara
düşer), açıklıktan serin gökyüzü ışığı girer; sağda zayıf dolgu, iç mekân
HDRI'si. Pencere duvarı kadrajın dışında kalacak açıda kurulur.

Eşyalar gerçek ölçülerindedir (metre) ve ürünün yanında / arkasında durur:
ürünü örtmez, alan derinliğiyle bulanık kalır. Hepsi kodla kurulur; dışarıdan
model ya da doku dosyası yoktur.
"""
import math
import os
import random
import re

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


def mat_metal(ad, renk="#c9ccd1", puruz=0.3):
    return mat_duz(ad, renk, puruz, Metallic=1.0)


def mat_ahsap(ad, koyu, acik, aci, derz=0.16, cila=0.3):
    """Damarlı ahşap: damar, dünya ekseninde `aci` yönünde uzar. derz: tahta
    genişliği (m, 0 = tek parça), cila: vernik katmanı (yansıma)."""
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
    renk = r.outputs["Color"]
    if derz > 0:
        # Tahta derzleri: enine her `derz` metrede ince koyu çizgi
        ayir = nt.nodes.new("ShaderNodeSeparateXYZ")
        esle2 = nt.nodes.new("ShaderNodeMapping")
        esle2.inputs["Rotation"].default_value = (0, 0, -aci)
        nt.links.new(geo.outputs["Position"], esle2.inputs["Vector"])
        nt.links.new(esle2.outputs["Vector"], ayir.inputs["Vector"])
        mod = nt.nodes.new("ShaderNodeMath")
        mod.operation = "PINGPONG"
        mod.inputs[1].default_value = derz / 2
        nt.links.new(ayir.outputs["Y"], mod.inputs[0])
        cizgi = nt.nodes.new("ShaderNodeMath")
        cizgi.operation = "LESS_THAN"
        cizgi.inputs[1].default_value = 0.0007
        nt.links.new(mod.outputs[0], cizgi.inputs[0])
        kar = nt.nodes.new("ShaderNodeMix")
        kar.data_type = "RGBA"
        kar.inputs[7].default_value = rgb("#3a2614")
        nt.links.new(cizgi.outputs[0], kar.inputs["Factor"])
        nt.links.new(renk, kar.inputs[6])
        renk = kar.outputs[2]
    nt.links.new(renk, p.inputs["Base Color"])
    p.inputs["Roughness"].default_value = 0.5
    if cila > 0:
        p.inputs["Coat Weight"].default_value = cila
        p.inputs["Coat Roughness"].default_value = 0.16
    b = nt.nodes.new("ShaderNodeBump")
    b.inputs["Strength"].default_value = 0.1
    b.inputs["Distance"].default_value = 0.0005
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


def duvar_rengi(S, varsayilan="acik"):
    return DUVAR_RENGI.get(S.get("duvar", varsayilan), DUVAR_RENGI["acik"])


def baglam_malzemesi(ad):
    """Aracın bağlam gövdeleri (baskı değil): çekmece kontrplağı, meşe ön, alüminyum kulp…"""
    if "alu" in ad:
        return mat_metal(ad, "#c9ccd1", 0.28)
    if "plaster" in ad:
        return mat_duvar(ad, DUVAR_RENGI["acik"])
    if "ply" in ad:
        return mat_ahsap(ad, "#b8946a", "#e2cba6", 0, derz=0, cila=0.12)
    if "oak" in ad:
        return mat_ahsap(ad, "#5e3f24", "#9c6c40", 0, derz=0, cila=0.35)
    return mat_ahsap(ad, "#6b4526", "#b9864f", 0, derz=0, cila=0.3)  # tezgâh, masa önizlemesi


# ---------------------------------------------------------------- yardımcılar
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


def cubuk(ad, a, b, r, mat, kose=24):
    """a'dan b'ye silindir."""
    yon = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=kose, radius=r, depth=yon.length, location=(a + b) / 2)
    o = bpy.context.active_object
    o.name = ad
    o.rotation_euler = YUKARI.rotation_difference(yon.normalized()).to_euler()
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


# ---------------------------------------------------------------- ışık: pencere ve güneş
def pencere(hedef, d, yukDer, guc, G, uzak=1.7):
    """Hedeften `d` yönünde (yatay) pencere; güneş açıklıktan hedefe vurur.
    Açıklığın ortası hedef–güneş ışını üstündedir: ürün aydınlıkta kalır,
    kayıtların gölgesi yanına düşer."""
    e = math.radians(yukDer)
    t = Vector((-d.y, d.x, 0))
    aci = math.atan2(t.y, t.x)
    merkez = hedef + d * uzak + Vector((0, 0, uzak * math.tan(e)))
    Wp, Hp, kal = 1.1, 1.5, 0.14
    sva = mat_duvar("pencereDuvari", DUVAR_RENGI["acik"])
    beyaz = mat_duz("kasa", "#ecebe6", 0.35)
    dis = d * (kal / 2)
    for ou, oz, su, sz in ((-(Wp / 2 + 2), 0, 4, 7), (Wp / 2 + 2, 0, 4, 7), (0, Hp / 2 + 2, Wp, 4), (0, -(Hp / 2 + 2), Wp, 4)):
        kutu("pencereDuvari", (su, kal, sz), merkez + t * ou + Vector((0, 0, oz)) + dis, aci, sva, 0)
    for ou, oz, su, sz in ((-0.3, 0, 0.045, Hp), (0.3, 0, 0.045, Hp), (0, 0.36, Wp, 0.045)):
        kutu("kayit", (su, 0.05, sz), merkez + t * ou + Vector((0, 0, oz)) + dis, aci, beyaz, 0)
    l = bpy.data.lights.new("gunes", "SUN")
    l.energy = guc
    l.angle = math.radians(1.4)
    l.color = (1.0, 0.92, 0.8)
    o = bpy.data.objects.new("gunes", l)
    isin = (d * math.cos(e) + Vector((0, 0, math.sin(e)))).normalized()  # hedeften güneşe
    o.rotation_euler = (-isin).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.collection.objects.link(o)
    # Gökyüzü: açıklıktan giren yumuşak, serin ışık
    l2 = bpy.data.lights.new("gok", "AREA")
    l2.shape = "RECTANGLE"
    l2.size, l2.size_y = Wp, Hp
    l2.energy = G * 1.8
    l2.color = (0.86, 0.91, 1.0)
    o2 = bpy.data.objects.new("gok", l2)
    o2.location = merkez - d * 0.3
    o2.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler()
    bpy.context.scene.collection.objects.link(o2)


def isiklandir(hedef, f, S):
    """f: kameranın yatay bakış yönü. Pencere kameranın solunda ve 28° önünde:
    pencere duvarı hiçbir kamera ışınına girmez (açı > görüş yarı açısı)."""
    f = Vector((f.x, f.y, 0)).normalized()
    u = Vector((f.y, -f.x, 0))  # kameranın sağı
    G = float(S.get("isik", 42))
    gunes = float(S.get("gunes", 2.3))
    if gunes > 0:
        a = math.radians(float(S.get("gunesAci", 28)))
        pencere(hedef, (-u * math.cos(a) - f * math.sin(a)).normalized(), float(S.get("gunesYuk", 32)), gunes, G)
    else:
        isik_alan("pencere", hedef - u * 1.25 - f * 0.55 + Vector((0, 0, 0.95)), hedef, 1.15, G, (1.0, 0.94, 0.86))
    isik_alan("dolgu", hedef + u * 1.3 - f * 1.1 + Vector((0, 0, 0.5)), hedef, 1.4, G * float(S.get("dolgu", 0.22)), (0.9, 0.95, 1.0))
    dunya_isigi(float(S.get("dunya", 0.3)), math.atan2(f.y, f.x))


# ---------------------------------------------------------------- eşyalar (taban noktası: üstüne konduğu yüzey)
def kitaplar(taban, donZ, rnd):
    renkler = ["#2f5d62", "#c98b3a", "#e8dfcf", "#7a2f2f", "#3a4a6b"]
    rnd.shuffle(renkler)
    z = taban.z
    sayfa = mat_duz("sayfa", "#efe8d8", 0.85)
    t = 0.0025  # kapak kalınlığı
    for i, (w, d, h) in enumerate([(0.215, 0.15, 0.03), (0.195, 0.135, 0.024), (0.17, 0.118, 0.028)]):
        don = donZ + rnd.uniform(-0.16, 0.16)
        ca, sa = math.cos(don), math.sin(don)
        yer = lambda lx, lz: Vector((taban.x + lx * ca, taban.y + lx * sa, z + lz))
        kapak = mat_duz(f"kapak{i}", renkler[i], 0.62)
        # Ciltli kitap: iki kapak ve sırt; sayfa bloğu üç kenarda kapaktan içeride görünür
        kutu(f"kitapAlt{i}", (w, d, t), yer(0, t / 2), don, kapak, 0.0008)
        kutu(f"kitapUst{i}", (w, d, t), yer(0, h - t / 2), don, kapak, 0.0008)
        kutu(f"sirt{i}", (t, d, h), yer(-w / 2 + t / 2, h / 2), don, kapak, 0.0008)
        kutu(f"sayfa{i}", (w - 0.005, d - 0.006, h - 2 * t), yer(0, h / 2), don, sayfa, 0.0003)
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


def defter(taban, donZ, rnd):
    """Kapalı defter ve üstünde kurşun kalem."""
    kapak = mat_duz("defterKapak", rnd.choice(["#2b3a4a", "#8a3b2e", "#3d5a40"]), 0.7)
    kutu("defter", (0.21, 0.148, 0.011), Vector((taban.x, taban.y, taban.z + 0.0055)), donZ, kapak, 0.0015)
    kutu("defterSayfa", (0.206, 0.143, 0.009), Vector((taban.x + 0.002 * math.cos(donZ), taban.y + 0.002 * math.sin(donZ), taban.z + 0.0055)), donZ,
         mat_duz("sayfa", "#f2ece0", 0.85), 0.0005)
    ust = taban.z + 0.011 + 0.0037
    yon = Vector((math.cos(donZ + 0.5), math.sin(donZ + 0.5), 0))
    m = Vector((taban.x, taban.y, ust))
    cubuk("kalem", m - yon * 0.08, m + yon * 0.07, 0.0037, mat_duz("kalem", "#e0b23a", 0.45), kose=6)
    cubuk("kalemUc", m + yon * 0.07, m + yon * 0.088, 0.0016, mat_duz("ahsapUc", "#d8b48a", 0.6), kose=12)


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
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=0.0022 * olcek, depth=boy, location=ust + yon * boy / 2)
        s = bpy.context.active_object
        s.rotation_euler = YUKARI.rotation_difference(yon).to_euler()
        s.data.materials.append(sap)
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


def kulp(merkez, boy, mat):
    """Çubuk kulp (x boyunca) ve iki ayağı; merkez: çubuğun ekseni, ön yüzün 17 mm önünde."""
    cubuk("kulp", merkez - Vector((boy / 2, 0, 0)), merkez + Vector((boy / 2, 0, 0)), 0.005, mat, 32)
    for s in (-1, 1):
        a = merkez + Vector((s * (boy / 2 - 0.012), 0, 0))
        cubuk("kulpAyak", a, a + Vector((0, 0.018, 0)), 0.0036, mat, 20)


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


def bakis_yonu(f, egimDer):
    f = Vector((f.x, f.y, 0)).normalized()
    e = math.radians(egimDer)
    return (f * math.cos(e) + Vector((0, 0, -math.sin(e)))).normalized()


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
    kutu("duvar", (8, 0.04, 3.2), Vector((c.x, c.y, z0 - 0.76 + 1.6)) + w * (dw + 0.02), aciU, mat_duvar("duvar", duvar_rengi(S)), 0)

    yuzey = Vector((c.x, c.y, z0))
    bitki(yuzey + w * (dw - 0.13) - u * (extU + 0.27), 1.15, rnd)
    kt = yuzey + w * (dw - 0.15) + u * (extU + 0.21)
    kitaplar(kt, aciU + 0.2, rnd)
    kupa(yuzey + w * (min(dw - 0.3, extW * 0.3)) + u * (extU + 0.14), aciU + 2.3)
    cerceve(yuzey + w * dw + u * (extU + 0.5), w, aciU, rnd)
    if S.get("defter", True):
        defter(yuzey - w * min(0.12, extW * 0.6) - u * (extU + 0.2), aciU - 0.3, rnd)

    # Kamera: yatık ürüne yukarıdan, dik ürüne karşıdan
    yassilik = hz / max(1e-6, max(mx.x - mn.x, mx.y - mn.y))
    egim = float(S.get("egim", 44 if yassilik < 0.15 else 30 if yassilik < 0.6 else 15))
    yon = bakis_yonu(fh, egim)
    hedef = Vector((c.x, c.y, mn.z + hz * 0.5))
    fov = math.radians(28)
    uzak = sigdir(mn, mx, hedef, yon, fov, float(S.get("doluluk", 0.74 if yassilik < 0.15 else 0.62)))
    # "kaydir": hedefi yüksekliğin bu oranı kadar kaydırır (sarkıtta askı teli kadrajın üstünden çıksın)
    hedef = hedef + Vector((0, 0, float(S.get("kaydir", 0)) * hz))
    kamera(hedef - yon * uzak, hedef, fov, (mx - mn).length * 0.8)
    isiklandir(hedef, fh, S)
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
    kutu("duvar", (8, 0.04, 3.4), Vector((c.x, 0.021, 1.5)), 0, mat_duvar("duvar", duvar_rengi(S, "adacayi")), 0)
    ustZ = mn.z - max(0.11, 0.55 * yuk)  # konsolun üstü
    ahsap = mat_ahsap("konsol", S.get("ahsapKoyu", "#5c3a20"), S.get("ahsapAcik", "#a9743f"), 0, derz=0)
    kutu("konsol", (2.2, 0.42, 0.04), Vector((c.x + 0.15, -0.21, ustZ - 0.02)), 0, ahsap, 0.004)
    kutu("konsolOn", (2.2, 0.03, 0.5), Vector((c.x + 0.15, -0.4, ustZ - 0.29)), 0, ahsap, 0.003)
    yuzey = Vector((c.x, 0, ustZ))
    # Eşyalar duvar dibinde ve ürünün iki yanında: kamerayla ürün arasına girmez
    bitki(yuzey + Vector((-gen / 2 - 0.3, -0.1, 0)), 0.95, rnd, "#d9d3c7")
    kitaplar(yuzey + Vector((gen / 2 + 0.2, -0.11, 0)), 0.25, rnd)

    fov = math.radians(28)
    yaw = math.radians(float(S.get("duvarAcisi", 17)))
    yon = Vector((-math.sin(yaw), math.cos(yaw), 0.04)).normalized()
    hedef = Vector((c.x, c.y, c.z - 0.1 * yuk))
    uzak = sigdir(mn, mx, hedef, yon, fov, float(S.get("doluluk", 0.52)))
    kamera(hedef - yon * uzak, hedef, fov, max(gen, yuk) * 0.5)
    # Güneş duvara dik vurur: açık duvar patlamasın diye masadakinden zayıf
    isiklandir(hedef, yon, {"gunes": 1.3, "isik": 34, **S})
    return uzak, fov


# ---------------------------------------------------------------- AYAKLI LEVHA (yapboz çerçevesi)
def ayaga_kaldir(veriler, np, egim):
    """Yatık çizilen levhayı eğik yarıklı ayaklarına takar (bkz. _adjy/foto-ortak.js egikAyak):
    yarık ayağın önünden 9 mm içeride, tabanı 3 mm yüksekte, `egim` derece arkaya yatık;
    levhanın arka yüzü yarığın arka duvarına dayanır, resim yüzü öne (−Y) bakar."""
    ayakMi = lambda a: re.search(r"ayak|stand", a.get("ad", ""), re.I)
    ayak = [v for a, v, _ in veriler if ayakMi(a)]
    if not ayak:
        return
    A = np.concatenate(ayak)
    pan = [i for i, (a, v, kr) in enumerate(veriler) if not ayakMi(a)]
    P = np.concatenate([veriler[i][1] for i in pan])
    cer = [v for a, v, _ in veriler if a.get("ad") == "cerceve"]
    kalin = float(np.ptp(cer[0][:, 2])) if cer else float(np.ptp(P[:, 2]))
    yarik = kalin + 0.00035
    e = math.radians(egim)
    s, c = math.sin(e), math.cos(e)
    # Yerel x → x, levhanın yukarısı (+y) → (0, s, c), yüzü (+z) → (0, −c, s)
    R = np.array([[1, 0, 0], [0, s, -c], [0, c, s]], dtype=np.float32)
    pivot = np.array([0, P[:, 1].min(), P[:, 2].min()], dtype=np.float32)
    hedef = np.array([0, A[:, 1].min() + 0.009 + yarik, A[:, 2].min() + 0.003], dtype=np.float32)
    for i in pan:
        a, v, kr = veriler[i]
        veriler[i] = (a, ((v - pivot) @ R.T + hedef).astype(np.float32), kr)


# ---------------------------------------------------------------- ÇEKMECE (komodin)
def cekmece(S, mn, mx, bk):
    """Aracın çekmecesi (kontrplak gövde, meşe ön, alüminyum kulp) bir komodinin
    üst gözünden çekilmiş; organizer içinde. Ön −Y'de."""
    if "baglam-oak" not in bk:
        return masa(S, mn, mx, Vector((0, 1, -0.5)))
    rnd = random.Random(int(S.get("tohum", 5)))
    fmn, fmx = bk["baglam-oak"]
    cx = (fmn.x + fmx.x) / 2
    fw = fmx.x - fmn.x
    Dd = mx.y - fmx.y  # çekmece kutusunun derinliği
    Yf = fmx.y + float(S.get("cekme", 0.8)) * Dd  # gövdenin ön düzlemi (kapalıyken ön kapağın arkası)
    Dc = Dd + 0.035
    Zt = fmx.z + 0.034  # tezgâh üstü
    Zf = Zt - float(S.get("komodinBoy", 0.8))
    agac = baglam_malzemesi("baglam-oak")
    metal = baglam_malzemesi("baglam-alu")
    # Gövde: yanlar çekmece kutusundan 6 mm açıkta (ray boşluğu)
    ic0, ic1 = fmn.x + 0.014 - 0.006, fmx.x - 0.014 + 0.006
    yH = Zt - 0.03 - Zf
    for sx in (ic0 - 0.009, ic1 + 0.009):
        kutu("yan", (0.018, Dc, yH), Vector((sx, Yf + Dc / 2, Zf + yH / 2)), 0, agac, 0.0012)
    dis = ic1 - ic0 + 0.036
    kutu("arka", (dis, 0.008, yH), Vector((cx, Yf + Dc - 0.004, Zf + yH / 2)), 0, agac, 0)
    kutu("ust", (dis + 0.024, Dc + 0.022, 0.03), Vector((cx, Yf + Dc / 2 - 0.011, Zt - 0.015)), 0, agac, 0.003)
    kutu("ic", (ic1 - ic0, Dc - 0.01, 0.006), Vector((cx, Yf + Dc / 2, fmn.z - 0.02)), 0, agac, 0)  # çekmece rafı
    # Alt kapaklar (kapalı), baza
    baza = 0.08
    alt = fmn.z - 0.004
    H = alt - (Zf + baza)
    n = 2 if H > 0.3 else 1
    h = (H - 0.004 * (n - 1)) / n
    al = bk.get("baglam-alu")
    kulpBoy = min(0.32, (al[1].x - al[0].x)) if al else 0.25
    for i in range(n):
        z1 = alt - i * (h + 0.004)
        kutu("kapak", (fw, 0.019, h), Vector((cx, Yf - 0.0095, z1 - h / 2)), 0, agac, 0.0015)
        kulp(Vector((cx, Yf - 0.019 - 0.017 - 0.001, z1 - h * 0.3)), kulpBoy, metal)
    kutu("baza", (dis - 0.04, 0.018, baza), Vector((cx, Yf + 0.04, Zf + baza / 2)), 0, mat_duz("baza", "#2b2622", 0.6), 0)
    # Oda
    kutu("duvar", (8, 0.04, 3.2), Vector((cx, Yf + Dc + 0.03, Zf + 1.6)), 0, mat_duvar("duvar", duvar_rengi(S)), 0)
    kutu("parke", (8, 8, 0.02), Vector((cx, Yf, Zf - 0.01)), 0, mat_ahsap("parke", "#5a3d26", "#8f6542", math.pi / 2, derz=0.19, cila=0.4), 0)
    # Komodinin üstü
    bitki(Vector((ic0 + 0.12, Yf + Dc - 0.15, Zt)), 1.05, rnd)
    kitaplar(Vector((ic1 - 0.16, Yf + Dc - 0.16, Zt)), 0.2, rnd)
    cerceve(Vector((cx + 0.04, Yf + Dc + 0.01, Zt)), Vector((0, 1, 0)), 0, rnd)

    # Kamera: önden, yukarıdan; çekmecenin içi ve komodinin ön yüzü kadrajda
    f = Vector((math.sin(math.radians(float(S.get("yaw", 14)))), math.cos(math.radians(float(S.get("yaw", 14)))), 0))
    yon = bakis_yonu(f, float(S.get("egim", 48)))
    kmn = Vector((ic0 - 0.02, mn.y, fmn.z - 0.05))
    kmx = Vector((ic1 + 0.02, Yf + 0.02, Zt))
    hedef = Vector((cx, (mn.y + Yf) / 2, (fmn.z + fmx.z) / 2))
    fov = math.radians(30)
    uzak = sigdir(kmn, kmx, hedef, yon, fov, float(S.get("doluluk", 0.86)))
    kamera(hedef - yon * uzak, hedef, fov, (mx - mn).length * 0.9)
    isiklandir(hedef, f, S)
    return uzak, fov


# ---------------------------------------------------------------- ATÖLYE (duvar ızgarası)
def atolye(S, mn, mx, bk):
    """Duvar ızgarası ve askılı kutular duvarda (arka yüz y = mx.y), altında tezgâh."""
    rnd = random.Random(int(S.get("tohum", 9)))
    c = (mn + mx) / 2
    gen = mx.x - mn.x
    yW = mx.y + 0.0008
    b = bk.get("baglam-bench")
    Zb = b[1].z if b else mn.z - 0.25
    derin = 0.6
    Zf = Zb - 0.9
    kutu("duvar", (8, 0.04, 3.4), Vector((c.x, yW + 0.02, Zf + 1.7)), 0, mat_duvar("duvar", duvar_rengi(S)), 0)
    tgen = gen + 0.9
    kutu("tezgah", (tgen, derin, 0.04), Vector((c.x, yW - derin / 2, Zb - 0.02)), 0,
         mat_ahsap("tezgah", "#7a4f2b", "#c08e58", 0, derz=0.045, cila=0.25), 0.003)
    siyah = mat_duz("ayakMetal", "#1f2023", 0.4, Metallic=0.6)
    for sx in (-1, 1):
        for sy in (0.06, derin - 0.06):
            kutu("tezgahAyak", (0.04, 0.04, Zb - 0.04 - Zf), Vector((c.x + sx * (tgen / 2 - 0.06), yW - sy, (Zb - 0.04 + Zf) / 2)), 0, siyah, 0.002)
        kutu("alt", (0.04, derin - 0.12, 0.04), Vector((c.x + sx * (tgen / 2 - 0.06), yW - derin / 2, Zf + 0.18)), 0, siyah, 0.002)
    kutu("zemin", (8, 8, 0.02), Vector((c.x, yW - 2, Zf - 0.01)), 0, mat_duz("zemin", "#4a4642", 0.7), 0)
    yuzey = Vector((c.x, yW, Zb))
    bitki(yuzey + Vector((-gen / 2 - 0.15, -0.16, 0)), 1.0, rnd)
    kitaplar(yuzey + Vector((gen / 2 + 0.1, -0.15, 0)), 0.15, rnd)
    kupa(yuzey + Vector((gen / 2 - 0.05, -0.38, 0)), 2.4)
    defter(yuzey + Vector((-0.05, -0.33, 0)), -0.15, rnd)

    f = Vector((math.sin(math.radians(float(S.get("yaw", -14)))), math.cos(math.radians(float(S.get("yaw", -14)))), 0))
    yon = bakis_yonu(f, float(S.get("egim", 10)))
    kmn = Vector((mn.x, yW - derin, Zb))
    kmx = mx.copy()
    hedef = (kmn + kmx) / 2
    fov = math.radians(30)
    uzak = sigdir(kmn, kmx, hedef, yon, fov, float(S.get("doluluk", 0.86)))
    kamera(hedef - yon * uzak, hedef, fov, (kmx - kmn).length * 0.8)
    isiklandir(hedef, f, S)
    return uzak, fov


# ---------------------------------------------------------------- MASA KENARI (kelepçe)
def kulaklik(veriler, np):
    """Alttaki J kancaya asılı kulaklık. Kanca: x boyu en büyük ağın (kelepçe gövdesi)
    en alt noktası; kancanın profili x–z düzleminde, genişliği y boyunca: kafa bandı
    y–z düzleminde kancanın oluğundan geçer. Döner: kulaklığın kutusu."""
    govde = max((v for a, v, _ in veriler if not a.get("baglam")), key=lambda v: float(np.ptp(v[:, 0])))
    zmin = float(govde[:, 2].min())
    dip = govde[govde[:, 2] < zmin + 0.003]
    hx, hy = float(dip[:, 0].mean()), float(dip[:, 1].mean())
    tr = 0.0065  # bant kalınlığı (yarıçap)
    ustZ = zmin + 0.009 + tr
    a_, b_ = 0.084, 0.1
    zc = ustZ - b_
    plastik = mat_duz("kulaklik", "#e6dfd2", 0.42)
    yastik = mat_duz("yastik", "#6e5038", 0.72)
    metal = mat_metal("kulaklikMetal", "#b9bcc2", 0.25)
    cu = bpy.data.curves.new("bant", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = tr
    cu.bevel_resolution = 4
    cu.use_fill_caps = True
    sp = cu.splines.new("POLY")
    N = 48
    sp.points.add(N - 1)
    th0, th1 = math.radians(-16), math.radians(196)
    for k in range(N):
        th = th0 + (th1 - th0) * k / (N - 1)
        sp.points[k].co = (hx, hy + a_ * math.cos(th), zc + b_ * math.sin(th), 1)
    ob = bpy.data.objects.new("bant", cu)
    bpy.context.scene.collection.objects.link(ob)
    cu.materials.append(plastik)
    for th, s in ((th0, 1), (th1, -1)):
        uc = Vector((hx, hy + a_ * math.cos(th), zc + b_ * math.sin(th)))
        kupZ = uc.z - 0.05
        cubuk("catal", uc, Vector((hx, uc.y, kupZ)), 0.0035, metal, 16)
        ky = uc.y + s * 0.004
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.046, depth=0.03, location=(hx, ky, kupZ), rotation=(math.pi / 2, 0, 0))
        o = bpy.context.active_object
        mod = o.modifiers.new("pah", "BEVEL")
        mod.width = 0.006
        mod.segments = 4
        for pg in o.data.polygons:
            pg.use_smooth = True
        o.data.materials.append(plastik)
        bpy.ops.mesh.primitive_torus_add(major_radius=0.033, minor_radius=0.012, major_segments=40, minor_segments=14,
                                         location=(hx, ky - s * 0.019, kupZ), rotation=(math.pi / 2, 0, 0))
        o = bpy.context.active_object
        for pg in o.data.polygons:
            pg.use_smooth = True
        o.data.materials.append(yastik)
    return Vector((hx - 0.05, hy - a_ - 0.03, zc - b_ * 0.3 - 0.1)), Vector((hx + 0.05, hy + a_ + 0.03, ustZ + 0.005))


def masa_kenari(S, mn, mx, bk, veriler, np):
    """Kelepçe, aracın masa önizlemesinin yerinde duran gerçek bir çalışma masasına
    sıkılı (masa −X'e uzanır, kenar x = önizlemenin +x yüzü). Kancada kulaklık."""
    g = bk.get("baglam-masa")
    if not g:
        return masa(S, mn, mx, Vector((-0.5, 0.8, -0.3)))
    rnd = random.Random(int(S.get("tohum", 3)))
    gmn, gmx = g
    kenar, ust = gmx.x, gmx.z
    kal = gmx.z - gmn.z
    cy = (mn.y + mx.y) / 2
    derin = 0.72
    y0, y1 = cy - 1.05, cy + 1.25  # ön ayak kadrajın dışında kalsın
    kutu("masa", (derin, y1 - y0, kal), Vector((kenar - derin / 2, (y0 + y1) / 2, ust - kal / 2)), 0,
         mat_ahsap("masa", "#5c3a20", "#a9743f", math.pi / 2, derz=0, cila=0.35), 0.0015)
    Zf = ust - 0.75
    siyah = mat_duz("ayakMetal", "#1f2023", 0.38, Metallic=0.7)
    for yy in (y0 + 0.05, y1 - 0.05):
        for xx in (kenar - 0.08, kenar - derin + 0.06):
            kutu("masaAyak", (0.035, 0.035, ust - kal - Zf), Vector((xx, yy, (ust - kal + Zf) / 2)), 0, siyah, 0.002)
        kutu("kusak", (derin - 0.14, 0.035, 0.05), Vector((kenar - derin / 2 - 0.01, yy, ust - kal - 0.025)), 0, siyah, 0.002)
    kutu("duvar", (0.04, 8, 3.2), Vector((kenar - derin - 0.04, cy, Zf + 1.6)), 0, mat_duvar("duvar", duvar_rengi(S, "kum")), 0)
    kutu("parke", (8, 8, 0.02), Vector((kenar, cy, Zf - 0.01)), 0, mat_ahsap("parke", "#4e3522", "#7f5a3a", 0, derz=0.19, cila=0.4), 0)
    yuzey = Vector((kenar, cy, ust))
    bitki(yuzey + Vector((-derin + 0.14, 0.38, 0)), 1.1, rnd)
    kitaplar(yuzey + Vector((-derin + 0.17, -0.42, 0)), 1.4, rnd)
    kupa(yuzey + Vector((-0.2, -0.24, 0)), 0.6)
    defter(yuzey + Vector((-0.3, 0.12, 0)), 1.9, rnd)
    hmn, hmx = kulaklik(veriler, np)

    kmn = Vector((min(mn.x, hmn.x), min(mn.y, hmn.y), min(mn.z, hmn.z)))
    kmx = Vector((max(mx.x, hmx.x), max(mx.y, hmx.y), max(mx.z, hmx.z, ust)))
    aci = math.radians(float(S.get("yaw", 38)))
    f = Vector((-math.sin(aci), math.cos(aci), 0))
    yon = bakis_yonu(f, float(S.get("egim", 9)))
    hedef = (kmn + kmx) / 2
    fov = math.radians(28)
    uzak = sigdir(kmn, kmx, hedef, yon, fov, float(S.get("doluluk", 0.62)))
    kamera(hedef - yon * uzak, hedef, fov, (kmx - kmn).length * 0.7)
    isiklandir(hedef, f, S)
    return uzak, fov
