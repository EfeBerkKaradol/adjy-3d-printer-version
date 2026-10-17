import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CustomerNotes } from "@/components/admin/CustomerNotes";
import { CustomerTasks } from "@/components/admin/CustomerTasks";
import { CustomerTimeline, type Olay } from "@/components/admin/CustomerTimeline";
import { segmentBelirle, uykuGunu, uykudaMi } from "@/lib/crm";
import { formatTRY } from "@/lib/slicer";
import { ArrowLeft, Mail, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

// ==========================================
// MÜŞTERİ KARTI
//
// Bir kişiyle ilgili ne varsa tek sayfada: ne aldı, ne kadar
// bıraktı, sitede neye baktı, ne yazdı, ne konuşuldu.
//
// Telefon açıldığında aranacak yer burası — sipariş listesinden
// müşteriye, müşteriden konuşmaya gitmek gerekmesin.
// ==========================================

export default async function MusteriPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;

  const musteri = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      phone: true,
      createdAt: true,
      isActive: true,
      crmTags: true,
      crmNotes: { orderBy: { createdAt: "desc" }, select: { id: true, body: true, authorEmail: true, createdAt: true } },
      crmTasks: {
        orderBy: [{ doneAt: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
        select: { id: true, title: true, dueAt: true, doneAt: true, createdBy: true },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          grandTotal: true,
          createdAt: true,
          isGuest: true,
          items: { select: { id: true, productName: true, quantity: true } },
        },
      },
      addresses: { select: { id: true, title: true, addressLine: true, city: true, state: true } },
    },
  });

  if (!musteri) notFound();

  const sayilanlar = musteri.orders.filter((o) => o.status !== "CANCELLED");
  const toplamHarcama = sayilanlar.reduce((t, o) => t + Number(o.grandTotal), 0);
  const sonSiparis = sayilanlar[0]?.createdAt ?? null;
  const segment = segmentBelirle({
    siparisSayisi: sayilanlar.length,
    toplamHarcama,
    sonSiparis,
  });
  const uyku = uykuGunu(sonSiparis);

  // Sitede neye baktığı. Ziyaret ölçümü çerezsiz olduğu için
  // yalnızca oturum açıkken gezdiği sayfalar bu kişiye bağlanır.
  const [ziyaretler, mesajlar] = await Promise.all([
    prisma.pageView.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, path: true, createdAt: true, device: true },
    }),
    prisma.contactMessage.findMany({
      where: { email: musteri.email },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, subject: true, message: true, createdAt: true },
    }).catch(() => []),
  ]);

  // ==========================================
  // Tek akış: sipariş, ziyaret, mesaj ve not tarihe göre.
  // Ziyaretler aynı güne toplanır; on sayfa gezen biri akışı
  // doldurmasın.
  // ==========================================
  const gunlukZiyaret = new Map<string, { tarih: Date; adet: number; ornek: string[] }>();
  for (const z of ziyaretler) {
    const anahtar = z.createdAt.toISOString().slice(0, 10);
    const mevcut = gunlukZiyaret.get(anahtar);
    if (mevcut) {
      mevcut.adet += 1;
      if (mevcut.ornek.length < 4 && !mevcut.ornek.includes(z.path)) mevcut.ornek.push(z.path);
    } else {
      gunlukZiyaret.set(anahtar, { tarih: z.createdAt, adet: 1, ornek: [z.path] });
    }
  }

  const olaylar: Olay[] = [
    ...musteri.orders.map((o) => ({
      id: o.id,
      tur: "order" as const,
      tarih: o.createdAt,
      baslik: `Sipariş ${o.orderNumber}`,
      ayrinti:
        o.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ") || null,
      href: `/admin/orders/${o.id}`,
      tutar: Number(o.grandTotal),
    })),
    ...[...gunlukZiyaret.values()].map((g) => ({
      id: g.tarih.toISOString(),
      tur: "visit" as const,
      tarih: g.tarih,
      baslik: `${g.adet} sayfa gezdi`,
      ayrinti: g.ornek.join(" · "),
    })),
    ...mesajlar.map((m) => ({
      id: m.id,
      tur: "message" as const,
      tarih: m.createdAt,
      baslik: m.subject,
      ayrinti: m.message,
    })),
    ...musteri.crmNotes.map((n) => ({
      id: n.id,
      tur: "note" as const,
      tarih: n.createdAt,
      baslik: n.authorEmail ? `Not — ${n.authorEmail}` : "Not",
      ayrinti: n.body,
    })),
  ].sort((a, b) => b.tarih.getTime() - a.tarih.getTime());

  const kartlar = [
    { label: "Toplam harcama", deger: toplamHarcama > 0 ? formatTRY(toplamHarcama) : "—" },
    { label: "Sipariş", deger: String(sayilanlar.length) },
    {
      label: "Ortalama sepet",
      deger: sayilanlar.length > 0 ? formatTRY(toplamHarcama / sayilanlar.length) : "—",
    },
    {
      label: "Son sipariş",
      deger:
        uyku === null ? "—" : uyku === 0 ? "bugün" : `${uyku} gün önce`,
    },
  ];

  return (
    <div className="space-y-8">
      <Link
        href="/admin/musteriler"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Müşteriler
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{musteri.fullName || musteri.email}</h1>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${segment.className}`}
            >
              {segment.label}
            </span>
            {uykudaMi(sonSiparis) && (
              <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                uykuda
              </span>
            )}
            {!musteri.isActive && (
              <span className="inline-flex rounded-full bg-destructive/15 px-2.5 py-0.5 text-xs text-destructive">
                pasif
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <a
              href={`mailto:${musteri.email}`}
              className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
            >
              <Mail className="h-3.5 w-3.5" aria-hidden />
              {musteri.email}
            </a>
            {musteri.phone && (
              <a
                href={`tel:${musteri.phone.replace(/[^+\d]/g, "")}`}
                className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {musteri.phone}
              </a>
            )}
            <span>
              Kayıt:{" "}
              {musteri.createdAt.toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kartlar.map((k) => (
          <div key={k.label} className="rounded-xl border border-border/40 bg-card p-5">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{k.deger}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="space-y-8">
          <section>
            <h2 className="text-sm font-medium">Siparişler</h2>
            {musteri.orders.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Henüz sipariş yok.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border/40 overflow-hidden rounded-xl border border-border/40 bg-card">
                {musteri.orders.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-sm">{o.orderNumber}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {o.items.map((i) => `${i.quantity}× ${i.productName}`).join(", ") ||
                            "—"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm tabular-nums">
                          {formatTRY(Number(o.grandTotal))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {o.createdAt.toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}{" "}
                          · {o.status}
                          {o.isGuest && " · misafir"}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-sm font-medium">Zaman çizelgesi</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Sipariş, ziyaret, mesaj ve not tek akışta. Ziyaretler yalnızca
              oturum açıkken kaydedilir — ölçüm çerezsiz olduğu için çıkış
              yapmışken gezdikleri kimseye bağlanmaz.
            </p>
            <CustomerTimeline olaylar={olaylar.slice(0, 40)} />
          </section>

          {musteri.addresses.length > 0 && (
            <section>
              <h2 className="text-sm font-medium">Kayıtlı adresler</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {musteri.addresses.map((a) => (
                  <li key={a.id}>
                    <span className="text-foreground">{a.title}</span> — {a.addressLine},{" "}
                    {a.state ? `${a.state}/` : ""}
                    {a.city}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-10">
          <CustomerTasks
            userId={musteri.id}
            tasks={musteri.crmTasks.map((t) => ({
              ...t,
              dueAt: t.dueAt?.toISOString() ?? null,
              doneAt: t.doneAt?.toISOString() ?? null,
            }))}
          />
          <CustomerNotes
            userId={musteri.id}
            tags={musteri.crmTags}
            notes={musteri.crmNotes.map((n) => ({
              ...n,
              createdAt: n.createdAt.toISOString(),
            }))}
          />
        </aside>
      </div>
    </div>
  );
}
