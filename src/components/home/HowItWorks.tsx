// ==========================================
// BÖLÜM 06 — ADJY NASIL ÇALIŞIR
// Dört adım, dekorasyonsuz. Numaralar ve ince
// ayraçlar dışında hiçbir görsel öğe yok.
// ==========================================

const STEPS = [
  {
    title: "Seç",
    body: "Katalogdan bir ürün seç ya da kendi modelini yükle.",
  },
  {
    title: "Özelleştir",
    body: "Parametrik ürünlerde ölçüyü, malzemeyi ve rengi kendine göre ayarla.",
  },
  {
    title: "Üret",
    body: "Sipariş üretime alınır, baskı sonrası kalite kontrolünden geçer.",
  },
  {
    title: "Teslim al",
    body: "Paketlenip kargoya verilir; sürecin her adımını hesabından izlersin.",
  },
];

export function HowItWorks() {
  return (
    <ol className="grid gap-px border-t border-border sm:grid-cols-2 lg:grid-cols-4">
      {STEPS.map((step, i) => (
        <li key={step.title} className="border-b border-border pt-8 sm:pr-8">
          <span className="font-mono text-xs text-muted-foreground tabular-nums">
            {String(i + 1).padStart(2, "0")}
          </span>
          <h3 className="mt-4 text-lg font-medium tracking-tight">{step.title}</h3>
          <p className="mt-2 pb-8 text-sm leading-relaxed text-muted-foreground">
            {step.body}
          </p>
        </li>
      ))}
    </ol>
  );
}
