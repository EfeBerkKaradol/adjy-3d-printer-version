import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { CustomerNotes } from "@/components/admin/CustomerNotes";
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
      take: 20,
      select: { id: true, path: true, createdAt: true, device: true },
    }),
    prisma.contactMessage.findMany({
      where: { email: musteri.email },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, subject: true, message: true, createdAt: true },
    }).catch(() => []),
  ]);

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
            <h2 className="text-sm font-medium">Sitede gezdikleri</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Yalnızca oturum açıkken gezdiği sayfalar — ölçüm çerezsiz olduğu
              için çıkış yapmışken gezdikleri kimseye bağlanmaz.
            </p>
            {ziyaretler.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Kayıt yok.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border/40 overflow-hidden rounded-xl border border-border/40 bg-card">
                {ziyaretler.map((z) => (
                  <li
                    key={z.id}
                    className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm"
                  >
                    <span className="truncate">{z.path}</span>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {z.createdAt.toLocaleString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {mesajlar.length > 0 && (
            <section>
              <h2 className="text-sm font-medium">İletişim formundan yazdıkları</h2>
              <ul className="mt-3 space-y-3">
                {mesajlar.map((m) => (
                  <li key={m.id} className="rounded-xl border border-border/40 bg-card p-4">
                    <p className="text-sm font-medium">{m.subject}</p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {m.message}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {m.createdAt.toLocaleString("tr-TR")}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

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

        <aside>
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
