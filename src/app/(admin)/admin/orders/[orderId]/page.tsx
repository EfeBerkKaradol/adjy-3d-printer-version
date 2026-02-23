"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Package,
  CreditCard,
  MapPin,
  Clock,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusLabels: Record<string, string> = {
  PENDING: "Beklemede",
  CONFIRMED: "Onaylandı",
  PROCESSING: "İşleniyor",
  PRINTING: "Baskıda",
  QUALITY_CHECK: "Kalite Kontrol",
  PACKAGING: "Paketleniyor",
  SHIPPED: "Kargoda",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal",
};

const statusFlow = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "PRINTING",
  "QUALITY_CHECK",
  "PACKAGING",
  "SHIPPED",
  "DELIVERED",
];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setOrder(data.order);
          setNewStatus(data.order.status);
        }
      } catch {
        // Hata
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  const handleStatusUpdate = async () => {
    if (!newStatus || newStatus === (order as Record<string, unknown>)?.status) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        // Sayfayı yenile
        const data = await fetch(`/api/admin/orders/${orderId}`);
        if (data.ok) {
          const refreshed = await data.json();
          setOrder(refreshed.order);
        }
      }
    } catch {
      // Hata
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Sipariş bulunamadı</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/admin/orders">Siparişlere Dön</Link>
        </Button>
      </div>
    );
  }

  const o = order as Record<string, unknown>;
  const user = o.user as Record<string, string>;
  const items = o.items as Record<string, unknown>[];
  const address = o.address as Record<string, string> | null;
  const payments = o.payments as Record<string, unknown>[];
  const history = o.history as Record<string, unknown>[];

  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Geri
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            Sipariş #{o.orderNumber as string}
          </h1>
          <p className="text-muted-foreground text-sm">
            {formatDate(o.createdAt as string)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol: Sipariş Bilgileri */}
        <div className="lg:col-span-2 space-y-6">
          {/* Durum Güncelleme */}
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Sipariş Durumu
            </h3>
            <div className="flex items-center gap-3">
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusFlow.map((s) => (
                    <SelectItem key={s} value={s}>
                      {statusLabels[s]}
                    </SelectItem>
                  ))}
                  <SelectItem value="CANCELLED">İptal</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleStatusUpdate}
                disabled={updating || newStatus === o.status}
                size="sm"
              >
                {updating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Güncelle"
                )}
              </Button>
            </div>
          </div>

          {/* Ürünler */}
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Sipariş Kalemleri ({items.length})
            </h3>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id as string}
                  className="flex items-center justify-between py-2 border-b border-border/20 last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {item.productName as string}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity as number} adet x{" "}
                      {formatCurrency(item.unitPrice as number)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">
                      {formatCurrency(item.lineTotal as number)}
                    </p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {item.printStatus as string}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sipariş Geçmişi */}
          {history.length > 0 && (
            <div className="bg-card border border-border/40 rounded-xl p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Sipariş Geçmişi
              </h3>
              <div className="space-y-3">
                {history.map((h) => (
                  <div
                    key={h.id as string}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div>
                      <p className="font-medium">
                        {statusLabels[h.status as string] || (h.status as string)}
                      </p>
                      {h.notes ? (
                        <p className="text-xs text-muted-foreground">
                          {String(h.notes)}
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground">
                        {formatDate(h.createdAt as string)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sağ: Müşteri + Ödeme + Adres */}
        <div className="space-y-6">
          {/* Müşteri */}
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <h3 className="font-semibold mb-3">Müşteri</h3>
            <p className="text-sm font-medium">{user.fullName || user.email}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
            {user.phone && (
              <p className="text-xs text-muted-foreground">{user.phone}</p>
            )}
          </div>

          {/* Ödeme */}
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Ödeme
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ara Toplam</span>
                <span>{formatCurrency(o.totalAmount as number)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kargo</span>
                <span>{formatCurrency(o.shippingCost as number)}</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-2 font-bold">
                <span>Genel Toplam</span>
                <span>{formatCurrency(o.grandTotal as number)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-muted-foreground">Durum</span>
                <span className="font-medium">{o.paymentStatus as string}</span>
              </div>
              {payments.length > 0 && (payments[0] as Record<string, unknown>).paidAt ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ödeme Tarihi</span>
                  <span className="text-xs">
                    {formatDate(
                      String((payments[0] as Record<string, unknown>).paidAt)
                    )}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          {/* Adres */}
          {address && (
            <div className="bg-card border border-border/40 rounded-xl p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Teslimat Adresi
              </h3>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p>{address.shippingLine1}</p>
                {address.shippingLine2 && <p>{address.shippingLine2}</p>}
                <p>
                  {address.shippingCity}
                  {address.shippingZip && ` - ${address.shippingZip}`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
