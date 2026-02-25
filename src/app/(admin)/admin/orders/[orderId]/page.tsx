"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Package,
  CreditCard,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const statusColors: Record<string, string> = {
  PENDING: "bg-yellow-500",
  CONFIRMED: "bg-blue-500",
  PROCESSING: "bg-indigo-500",
  PRINTING: "bg-purple-500",
  QUALITY_CHECK: "bg-cyan-500",
  PACKAGING: "bg-orange-500",
  SHIPPED: "bg-teal-500",
  DELIVERED: "bg-green-500",
  CANCELLED: "bg-red-500",
};

const printStatusLabels: Record<string, string> = {
  QUEUED: "Kuyrukta",
  PRINTING: "Baskıda",
  DONE: "Tamamlandı",
  FAILED: "Başarısız",
};

const printStatusColors: Record<string, string> = {
  QUEUED: "bg-yellow-500/10 text-yellow-500",
  PRINTING: "bg-purple-500/10 text-purple-500",
  DONE: "bg-green-500/10 text-green-500",
  FAILED: "bg-red-500/10 text-red-500",
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
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [allowedNext, setAllowedNext] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
        setAllowedNext(data.allowedNextStatuses || []);
        setNewStatus("");
      }
    } catch {
      // Hata
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setUpdating(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          notes: statusNotes || undefined,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ type: "success", text: data.message });
        setStatusNotes("");
        await fetchOrder();
      } else {
        setMessage({ type: "error", text: data.error });
      }
    } catch {
      setMessage({ type: "error", text: "Bir hata oluştu" });
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
  const currentStatus = o.status as string;
  const currentIdx = statusFlow.indexOf(currentStatus);
  const isFinalState =
    currentStatus === "DELIVERED" || currentStatus === "CANCELLED";

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

      {/* Durum Akış Çubuğu (Stepper) */}
      <div className="bg-card border border-border/40 rounded-xl p-5">
        <div className="flex items-center justify-between overflow-x-auto gap-1">
          {statusFlow.map((s, i) => {
            const isPast = currentIdx >= i;
            const isCurrent = currentStatus === s;
            const isCancelled = currentStatus === "CANCELLED";

            return (
              <div key={s} className="flex items-center flex-1 min-w-0">
                <div className="flex flex-col items-center min-w-[60px]">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                      isCancelled
                        ? "bg-red-500/10 text-red-500"
                        : isCurrent
                          ? `${statusColors[s]} text-white`
                          : isPast
                            ? "bg-green-500 text-white"
                            : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isPast && !isCurrent ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-[10px] mt-1 text-center leading-tight ${
                      isCurrent
                        ? "font-bold text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {statusLabels[s]}
                  </span>
                </div>
                {i < statusFlow.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-1 rounded ${
                      currentIdx > i ? "bg-green-500" : "bg-muted"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {currentStatus === "CANCELLED" && (
          <div className="mt-3 text-center">
            <span className="text-sm font-medium text-red-500 bg-red-500/10 px-3 py-1 rounded-full">
              Bu sipariş iptal edilmiştir
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol: Sipariş Bilgileri */}
        <div className="lg:col-span-2 space-y-6">
          {/* Durum Güncelleme */}
          {!isFinalState && (
            <div className="bg-card border border-border/40 rounded-xl p-5">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Sonraki Adım
              </h3>

              {message && (
                <div
                  className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
                    message.type === "success"
                      ? "bg-green-500/10 text-green-600 border border-green-500/20"
                      : "bg-red-500/10 text-red-600 border border-red-500/20"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  {message.text}
                </div>
              )}

              {allowedNext.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">
                      Yeni Durum
                    </Label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Durum seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {allowedNext.map((s) => (
                          <SelectItem key={s} value={s}>
                            {statusLabels[s] || s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label
                      htmlFor="statusNotes"
                      className="text-xs text-muted-foreground"
                    >
                      Not (opsiyonel)
                    </Label>
                    <Input
                      id="statusNotes"
                      placeholder="Durum değişikliği ile ilgili not..."
                      value={statusNotes}
                      onChange={(e) => setStatusNotes(e.target.value)}
                    />
                  </div>

                  <Button
                    onClick={handleStatusUpdate}
                    disabled={updating || !newStatus}
                    size="sm"
                    className="gap-2"
                  >
                    {updating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    {newStatus
                      ? `"${statusLabels[newStatus]}" Olarak Güncelle`
                      : "Durum Seçin"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Bu durumdan başka bir duruma geçilemez.
                </p>
              )}
            </div>
          )}

          {/* Ürünler + Baskı Durumları */}
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Sipariş Kalemleri ({items.length})
            </h3>
            <div className="space-y-3">
              {items.map((item) => {
                const product = (item as Record<string, unknown>).product as Record<string, unknown> | null;
                const thumbUrl = product?.thumbnailUrl ? String(product.thumbnailUrl) : null;
                return (
                  <div
                    key={item.id as string}
                    className="flex items-center justify-between py-3 border-b border-border/20 last:border-0"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={item.productName as string}
                          className="w-10 h-10 rounded-lg object-cover bg-muted"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                          <Printer className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {item.productName as string}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.quantity as number} adet x{" "}
                          {formatCurrency(item.unitPrice as number)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          printStatusColors[item.printStatus as string] ||
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        {printStatusLabels[item.printStatus as string] ||
                          (item.printStatus as string)}
                      </span>
                      <p className="font-medium text-sm min-w-[80px] text-right">
                        {formatCurrency(item.lineTotal as number)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sipariş Geçmişi */}
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Sipariş Geçmişi
            </h3>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Henüz durum değişikliği yok
              </p>
            ) : (
              <div className="space-y-4">
                {history.map((h) => (
                  <div
                    key={h.id as string}
                    className="flex items-start gap-3 text-sm"
                  >
                    <div
                      className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                        statusColors[h.status as string] || "bg-muted"
                      }`}
                    />
                    <div className="flex-1">
                      <p className="font-medium">
                        {statusLabels[h.status as string] ||
                          (h.status as string)}
                      </p>
                      {h.notes ? (
                        <p className="text-xs text-muted-foreground mt-0.5 italic">
                          &quot;{String(h.notes)}&quot;
                        </p>
                      ) : null}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(h.createdAt as string)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sağ: Durum Özeti + Müşteri + Ödeme + Adres */}
        <div className="space-y-6">
          {/* Durum Özet */}
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <h3 className="font-semibold mb-3">Durum Özeti</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Sipariş</span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium text-white ${
                    statusColors[currentStatus] || "bg-muted"
                  }`}
                >
                  {statusLabels[currentStatus]}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Ödeme</span>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    o.paymentStatus === "PAID"
                      ? "bg-green-500/10 text-green-500"
                      : o.paymentStatus === "FAILED"
                        ? "bg-red-500/10 text-red-500"
                        : o.paymentStatus === "REFUNDED"
                          ? "bg-orange-500/10 text-orange-500"
                          : "bg-yellow-500/10 text-yellow-500"
                  }`}
                >
                  {o.paymentStatus === "PAID"
                    ? "Ödendi"
                    : o.paymentStatus === "FAILED"
                      ? "Başarısız"
                      : o.paymentStatus === "REFUNDED"
                        ? "İade Edildi"
                        : "Beklemede"}
                </span>
              </div>
            </div>
          </div>

          {/* Müşteri */}
          <div className="bg-card border border-border/40 rounded-xl p-5">
            <h3 className="font-semibold mb-3">Müşteri</h3>
            <p className="text-sm font-medium">
              {user.fullName || user.email}
            </p>
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
              {payments.length > 0 &&
              (payments[0] as Record<string, unknown>).paidAt ? (
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground">Ödeme Tarihi</span>
                  <span className="text-xs">
                    {formatDate(
                      String(
                        (payments[0] as Record<string, unknown>).paidAt
                      )
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
