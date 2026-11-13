"use client";

import { Check, Minus, Plus } from "lucide-react";
import { MALZEMELER, malzemeBul } from "@/lib/furniture/materials";
import { KULPLAR, MASA_AYAKLARI, TABANLAR, masaAyagiBul } from "@/lib/furniture/hardware";
import {
  type MobilyaModeli,
  siraSiniri,
  sutunSiniri,
} from "@/lib/furniture/catalog";
import { tabanBul } from "@/lib/furniture/hardware";
import type {
  GozAnahtari,
  GozIcerigi,
  MobilyaYapilandirma,
} from "@/lib/furniture/types";

// ==========================================
// YAPILANDIRMA KONTROLLERİ
//
// Hepsi aynı kurala uyar: dokunulan şey anında modelde ve
// fiyatta görünür. "Uygula" düğmesi yok — araştırmanın en net
// bulgusu buydu, bekleyen bir değişiklik kullanıcıyı
// yapılandırmadan koparıyor.
//
// Kaydırıcıların yanında eksi/artı var: telefonda 1 santim
// hassasiyetle kaydırmak imkânsız, ama düğmeye basmak kolay.
// ==========================================

export function OlcuKaydirici({
  etiket,
  deger,
  min,
  max,
  adim,
  ipucu,
  onChange,
}: {
  etiket: string;
  deger: number;
  min: number;
  max: number;
  adim: number;
  ipucu?: string;
  onChange: (v: number) => void;
}) {
  const yuzde = ((deger - min) / (max - min)) * 100;
  const oturt = (v: number) =>
    Math.min(max, Math.max(min, Math.round(v / adim) * adim));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium">{etiket}</label>
        <span className="text-sm tabular-nums">
          <strong className="text-base font-semibold">{deger / 10}</strong>
          <span className="ml-1 text-muted-foreground">cm</span>
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onChange(oturt(deger - adim))}
          disabled={deger <= min}
          aria-label={`${etiket} azalt`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full adjy-pixel-frame transition-colors hover:bg-muted disabled:opacity-35"
        >
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={adim}
          value={deger}
          onChange={(e) => onChange(oturt(Number(e.target.value)))}
          aria-label={`${etiket} (cm)`}
          className="adjy-mini-range w-full"
          style={{ ["--dolu" as string]: `${yuzde}%` }}
        />
        <button
          type="button"
          onClick={() => onChange(oturt(deger + adim))}
          disabled={deger >= max}
          aria-label={`${etiket} artır`}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full adjy-pixel-frame transition-colors hover:bg-muted disabled:opacity-35"
        >
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
      <div className="mt-1 flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>{min / 10}</span>
        {ipucu && <span className="px-2 text-center normal-nums">{ipucu}</span>}
        <span>{max / 10} cm</span>
      </div>
    </div>
  );
}

export function SayiSecici({
  etiket,
  deger,
  min,
  max,
  not,
  onChange,
}: {
  etiket: string;
  deger: number;
  min: number;
  max: number;
  not?: string;
  onChange: (v: number) => void;
}) {
  const secenekler = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium">{etiket}</label>
        {not && <span className="text-xs text-muted-foreground">{not}</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {secenekler.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={deger === s}
            className={`h-10 min-w-10 rounded-lg border px-3 text-sm tabular-nums transition-colors ${
              deger === s
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:bg-muted"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {min === max && (
        <p className="mt-2 text-xs text-muted-foreground">
          Bu ölçüde başka seçenek yok — göz genişliği sınırları zorluyor.
        </p>
      )}
    </div>
  );
}

export function MalzemeSecici({
  etiket,
  deger,
  onChange,
}: {
  etiket: string;
  deger: string;
  onChange: (id: string) => void;
}) {
  const secili = malzemeBul(deger);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label className="text-sm font-medium">{etiket}</label>
        <span className="text-sm text-muted-foreground">
          {secili.ad}
          {secili.premium && " · masif"}
        </span>
      </div>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {MALZEMELER.map((m) => {
          const aktif = m.id === deger;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              aria-pressed={aktif}
              aria-label={m.ad}
              title={`${m.ad} — ${m.aciklama}`}
              className={`relative flex h-11 w-11 items-center justify-center rounded-lg border transition-transform hover:scale-105 ${
                aktif ? "border-foreground ring-1 ring-foreground" : "border-border"
              }`}
            >
              <span
                className="h-9 w-9 rounded-md"
                style={{
                  background: m.damar
                    ? `repeating-linear-gradient(95deg, ${m.hex} 0 3px, ${m.damarHex} 3px 4px)`
                    : m.hex,
                }}
                aria-hidden
              />
              {aktif && (
                <Check
                  className="absolute h-4 w-4 drop-shadow"
                  style={{ color: m.id === "antrasit" || m.id === "ceviz" ? "#fff" : "#111" }}
                  aria-hidden
                />
              )}
              {m.premium && (
                <span
                  className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-background"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{secili.aciklama}</p>
    </div>
  );
}

const ICERIK_ETIKET: Record<GozIcerigi, string> = {
  bos: "Açık",
  kapak: "Kapak",
  cekmece: "Çekmece",
};

export function BolmePaneli({
  cfg,
  seciliGoz,
  onIcerikDegistir,
  onHepsi,
  onKulp,
}: {
  cfg: MobilyaYapilandirma;
  seciliGoz: GozAnahtari | null;
  onIcerikDegistir: (anahtar: GozAnahtari, icerik: GozIcerigi) => void;
  onHepsi: (icerik: GozIcerigi) => void;
  onKulp: (id: string) => void;
}) {
  const mevcut: GozIcerigi = seciliGoz
    ? (cfg.gozler[seciliGoz] ?? "bos")
    : "bos";
  const kapakVar = Object.values(cfg.gozler).some((v) => v !== "bos");

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium">
          {seciliGoz ? "Seçili göz" : "Modelde bir göze dokunun"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {seciliGoz
            ? "Bu gözün içine ne gireceğini seçin."
            : "Hangi gözün kapaklı ya da çekmeceli olacağını tek tek siz belirliyorsunuz."}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["bos", "kapak", "cekmece"] as GozIcerigi[]).map((i) => (
          <button
            key={i}
            type="button"
            disabled={!seciliGoz}
            onClick={() => seciliGoz && onIcerikDegistir(seciliGoz, i)}
            aria-pressed={mevcut === i}
            className={`h-11 rounded-lg border px-4 text-sm transition-colors disabled:opacity-40 ${
              mevcut === i && seciliGoz
                ? "border-foreground bg-foreground text-background"
                : "border-border hover:bg-muted"
            }`}
          >
            {ICERIK_ETIKET[i]}
          </button>
        ))}
      </div>

      <div className="border-t-2 border-dashed border-foreground/25 pt-4">
        <p className="text-xs text-muted-foreground">Tüm gözlere birden</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(["bos", "kapak", "cekmece"] as GozIcerigi[]).map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => onHepsi(i)}
              className="h-9 rounded-full adjy-pixel-frame px-3.5 text-xs transition-colors hover:bg-muted"
            >
              Hepsi {ICERIK_ETIKET[i].toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {kapakVar && (
        <div className="border-t-2 border-dashed border-foreground/25 pt-4">
          <label className="text-sm font-medium">Kulp</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {KULPLAR.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => onKulp(k.id)}
                aria-pressed={cfg.kulp === k.id}
                title={k.aciklama}
                className={`h-10 rounded-lg border px-3.5 text-sm transition-colors ${
                  cfg.kulp === k.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-muted"
                }`}
              >
                {k.ad}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TabanPaneli({
  cfg,
  model,
  onTaban,
  onArkaPanel,
  onAltRaf,
}: {
  cfg: MobilyaYapilandirma;
  model: MobilyaModeli;
  onTaban: (id: string) => void;
  onArkaPanel: (v: boolean) => void;
  onAltRaf: (v: boolean) => void;
}) {
  // Masanın taşıyıcısı ayak, dolabınki taban. İkisi aynı şey
  // değil: biri ürünü ayakta tutuyor, diğeri yerden kaldırıyor.
  if (model.tur === "masa") {
    const ayak = masaAyagiBul(cfg.taban);
    return (
      <div className="space-y-5">
        <div>
          <label className="text-sm font-medium">Ayak</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {MASA_AYAKLARI.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => onTaban(a.id)}
                aria-pressed={cfg.taban === a.id}
                className={`h-10 rounded-lg border px-3.5 text-sm transition-colors ${
                  cfg.taban === a.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-muted"
                }`}
              >
                {a.ad}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{ayak.aciklama}</p>
        </div>

        {model.sira.max >= 2 && (
          <div className="border-t-2 border-dashed border-foreground/25 pt-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={cfg.sira >= 2}
                onChange={(e) => onAltRaf(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-foreground"
              />
              <span>
                <span className="text-sm font-medium">Alt raf</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Tablanın altına, ayaklar arasına bir raf eklenir. Kitap ve
                  kutulara yer açar; bacak boşluğunu bir miktar daraltır.
                </span>
              </span>
            </label>
          </div>
        )}

        <p className="text-xs leading-relaxed text-muted-foreground">
          Tablanın altında ön ve arka kayıt var. Süs değil: 18 mm tabla
          kayıtsız bir masada zamanla ortadan çöker.
        </p>
      </div>
    );
  }

  const secili = tabanBul(cfg.taban);
  return (
    <div className="space-y-5">
      {model.tabanSecilebilir ? (
        <div>
          <label className="text-sm font-medium">Taban</label>
          <div className="mt-2 flex flex-wrap gap-2">
            {TABANLAR.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onTaban(t.id)}
                aria-pressed={cfg.taban === t.id}
                className={`h-10 rounded-lg border px-3.5 text-sm transition-colors ${
                  cfg.taban === t.id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:bg-muted"
                }`}
              >
                {t.ad}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {secili.aciklama}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Bu ürün duvara monte edilir; zeminle teması olmadığı için taban
          seçeneği yok. Gizli askı aparatı fiyata dâhil.
        </p>
      )}

      <div className="border-t-2 border-dashed border-foreground/25 pt-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={cfg.arkaPanel}
            onChange={(e) => onArkaPanel(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-foreground"
          />
          <span>
            <span className="text-sm font-medium">Arka panel</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Gövdeyi kapatır ve sağlamlaştırır. Kaldırılırsa arkadaki duvar
              görünür — kablo geçirmek gerekiyorsa işe yarar.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}

/** Ölçü sekmesi — sütun/sıra sınırlarını ölçüye göre yazar */
export function OlcuPaneli({
  cfg,
  model,
  onDegis,
}: {
  cfg: MobilyaYapilandirma;
  model: MobilyaModeli;
  onDegis: (yama: Partial<MobilyaYapilandirma>) => void;
}) {
  const sc = sutunSiniri(model, cfg.genislik);
  const sr = siraSiniri(model, cfg.yukseklik, tabanBul(cfg.taban).yukseklik);
  return (
    <div className="space-y-6">
      <OlcuKaydirici
        etiket="Genişlik"
        deger={cfg.genislik}
        min={model.genislik.min}
        max={model.genislik.max}
        adim={model.genislik.adim}
        ipucu={sc.min > model.sutun.min ? `en az ${sc.min} sütun` : undefined}
        onChange={(v) => onDegis({ genislik: v })}
      />
      <OlcuKaydirici
        etiket="Yükseklik"
        deger={cfg.yukseklik}
        min={model.yukseklik.min}
        max={model.yukseklik.max}
        adim={model.yukseklik.adim}
        ipucu={sr.min > model.sira.min ? `en az ${sr.min} sıra` : undefined}
        onChange={(v) => onDegis({ yukseklik: v })}
      />
      <OlcuKaydirici
        etiket="Derinlik"
        deger={cfg.derinlik}
        min={model.derinlik.min}
        max={model.derinlik.max}
        adim={model.derinlik.adim}
        onChange={(v) => onDegis({ derinlik: v })}
      />
    </div>
  );
}

export function IzgaraPaneli({
  cfg,
  model,
  onDegis,
}: {
  cfg: MobilyaYapilandirma;
  model: MobilyaModeli;
  onDegis: (yama: Partial<MobilyaYapilandirma>) => void;
}) {
  const sc = sutunSiniri(model, cfg.genislik);
  const sr = siraSiniri(model, cfg.yukseklik, tabanBul(cfg.taban).yukseklik);
  const gozG = Math.round(
    (cfg.genislik - 2 * 18 - (cfg.sutun - 1) * 18) / cfg.sutun / 10
  );
  const gozY = Math.round(
    (cfg.yukseklik -
      tabanBul(cfg.taban).yukseklik -
      2 * 18 -
      (cfg.sira - 1) * 18) /
      cfg.sira /
      10
  );
  return (
    <div className="space-y-6">
      <SayiSecici
        etiket="Sütun"
        deger={cfg.sutun}
        min={sc.min}
        max={sc.max}
        not={`göz genişliği ${gozG} cm`}
        onChange={(v) => onDegis({ sutun: v })}
      />
      <SayiSecici
        etiket="Sıra"
        deger={cfg.sira}
        min={sr.min}
        max={sr.max}
        not={`göz yüksekliği ${gozY} cm`}
        onChange={(v) => onDegis({ sira: v })}
      />
      <p className="text-xs leading-relaxed text-muted-foreground">
        Sütun sayısı rastgele sınırlanmıyor: 18 mm levha 90 santimden uzun
        açıklıkta zamanla bel verir. Genişlik büyüdükçe en az sütun sayısı
        kendiliğinden artar.
      </p>
    </div>
  );
}
