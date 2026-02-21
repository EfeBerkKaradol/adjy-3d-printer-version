"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  Package,
  CreditCard,
  MapPin,
  Truck,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";

// ==========================================
// SİPARİŞ DETAY SAYFASI
// /orders/[orderId]
// ==========================================

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: string;
  shippingCost: string;
  shippingMethod: string | null;
  grandTotal: string;
  currency: string;
  notes: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    printStatus: string;
    customParams: Record<string, unknown> | null;
    product: {
      id: string;
      name: string;
      slug: string;
      thumbnailUrl: string | null;
    };
  }>;
  address: {
    shippingLine1: string;
    shippingCity: string;
    shippingState: string | null;
    shippingZip: string | null;
    shippingCountry: string;
    billingLine1: string;
    billingCity: string;
  } | null;
  payments: Array<{
    id: string;
    status: string;
    amount: string;
    currency: string;
    cardLastFour: string | null;
    cardType: string | null;
    installment: number;
    paidAt: string | null;
    createdAt: string;
  }>;
  shipment: {
    carrier: string | null;
    trackingNumber: string | null;
    shippedAt: string | null;
    deliveredAt: string | null;
    status: string;
  } | null;
  history: Array<{
    id: string;
    status: string;
    notes: string | null;
    createdAt: string;
  }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Beklemede", color: "bg-yellow-100 text-yellow-800" },
  CONFIRMED: { label: "Onaylandı", color: "bg-blue-100 text-blue-800" },
  PROCESSING: { label: "İşleniyor", color: "bg-indigo-100 text-indigo-800" },
  PRINTING: { label: "Baskıda", color: "bg-purple-100 text-purple-800" },
  QUALITY_CHECK: { label: "Kalite Kontrol", color: "bg-cyan-100 text-cyan-800" },
  PACKAGING: { label: "Paketleniyor", color: "bg-teal-100 text-teal-800" },
  SHIPPED: { label: "Kargoda", color: "bg-orange-100 text-orange-800" },
  DELIVERED: { label: "Teslim Edildi", color: "bg-green-100 text-green-800" },
  CANCELLED: { label: "İptal Edildi", color: "bg-red-100 text-red-800" },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Ödeme Bekliyor", color: "bg-yellow-100 text-yellow-800" },
  PAID: { label: "Ödendi", color: "bg-green-100 text-green-800" },
  FAILED: { label: "Başarısız", color: "bg-red-100 text-red-800" },
  REFUNDED: { label: "İade Edildi", color: "bg-gray-100 text-gray-800" },
};

const PRINT_STATUS_LABELS: Record<string, string> = {
  QUEUED: "Kuyrukta",
  PRINTING: "Baskıda",
  DONE: "Tamamlandı",
  FAILED: "Başarısız",
};

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/orders/${orderId}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Sipariş bulunamadı");
        }
        const data = await res.json();
        setOrder(data.order);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu");
      } finally {
        setLoading(false);
      }
    }
    fetchOrder();
  }, [orderId]);

  const handleCancel = useCallback(async () => {
    if (!confirm("Bu siparişi iptal etmek istediğinizden emin misiniz?")) return;

    setCancelling(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/cancel`, { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Sipariş iptal edilemedi");
        return;
      }

      // Sayfayı yenile
      setOrder((prev) =>
        prev
          ? { ...prev, status: "CANCELLED", paymentStatus: data.order.paymentStatus }
          : null
      );
    } catch {
      alert("Bir hata oluştu");
    } finally {
      setCancelling(false);
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-16 text-center">
        <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Sipariş Bulunamadı</h1>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button variant="outline" asChild>
          <Link href="/profile">Siparişlerime Dön</Link>
        </Button>
      </div>
    );
  }

  const orderStatus = STATUS_LABELS[order.status] || {
    label: order.status,
    color: "bg-gray-100 text-gray-800",
  };
  const paymentStatus = PAYMENT_STATUS_LABELS[order.paymentStatus] || {
    label: order.paymentStatus,
    color: "bg-gray-100 text-gray-800",
  };
  const canCancel = ["PENDING", "CONFIRMED"].includes(order.status);

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/profile">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Sipariş Detayı</h1>
          <p className="text-sm text-muted-foreground font-mono">
            {order.orderNumber}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge className={orderStatus.color}>{orderStatus.label}</Badge>
          <Badge className={paymentStatus.color}>{paymentStatus.label}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sol: Ürünler + Geçmiş */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ürünler */}
          <div className="border border-border/40 rounded-xl p-5 bg-card">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Ürünler ({order.items.length})
            </h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-4 p-3 bg-muted/20 rounded-lg"
                >
                  <div className="w-12 h-12 bg-muted/30 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-xs text-muted-foreground">3D</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {item.productName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Adet: {item.quantity} | Birim:{" "}
                      {Number(item.unitPrice).toFixed(2)} TL
                    </p>
                    <Badge variant="outline" className="text-[10px] mt-1">
                      {PRINT_STATUS_LABELS[item.printStatus] || item.printStatus}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {Number(item.lineTotal).toFixed(2)} TL
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Sipariş Geçmişi */}
          {order.history.length > 0 && (
            <div className="border border-border/40 rounded-xl p-5 bg-card">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Sipariş Geçmişi
              </h2>
              <div className="space-y-3">
                {order.history.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium">
                        {STATUS_LABELS[entry.status]?.label || entry.status}
                      </p>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground">
                          {entry.notes}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(entry.createdAt).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sağ: Özet + Adres + Ödeme + Kargo */}
        <div className="space-y-6">
          {/* Fiyat Özeti */}
          <div className="border border-border/40 rounded-xl p-5 bg-card">
            <h3 className="font-semibold text-sm mb-3">Fiyat Özeti</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ara Toplam</span>
                <span>{Number(order.totalAmount).toFixed(2)} TL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Kargo</span>
                <span>
                  {Number(order.shippingCost) === 0
                    ? "Ücretsiz"
                    : `${Number(order.shippingCost).toFixed(2)} TL`}
                </span>
              </div>
              <hr className="border-border/40" />
              <div className="flex justify-between font-bold">
                <span>Toplam</span>
                <span className="text-primary">
                  {Number(order.grandTotal).toFixed(2)} TL
                </span>
              </div>
            </div>
          </div>

          {/* Adres */}
          {order.address && (
            <div className="border border-border/40 rounded-xl p-5 bg-card">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Teslimat Adresi
              </h3>
              <p className="text-sm text-muted-foreground">
                {order.address.shippingLine1}
              </p>
              <p className="text-sm text-muted-foreground">
                {order.address.shippingCity}
                {order.address.shippingState
                  ? `, ${order.address.shippingState}`
                  : ""}
                {order.address.shippingZip
                  ? ` ${order.address.shippingZip}`
                  : ""}
              </p>
            </div>
          )}

          {/* Ödeme Bilgileri */}
          {order.payments.length > 0 && (
            <div className="border border-border/40 rounded-xl p-5 bg-card">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Ödeme Bilgileri
              </h3>
              {order.payments.map((p) => (
                <div key={p.id} className="text-sm text-muted-foreground space-y-1">
                  {p.cardLastFour && (
                    <p>Kart: ****{p.cardLastFour} ({p.cardType})</p>
                  )}
                  <p>
                    Tutar: {Number(p.amount).toFixed(2)} {p.currency}
                  </p>
                  {p.installment > 1 && <p>Taksit: {p.installment}</p>}
                  {p.paidAt && (
                    <p>
                      Tarih: {new Date(p.paidAt).toLocaleString("tr-TR")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Kargo */}
          {order.shipment && (
            <div className="border border-border/40 rounded-xl p-5 bg-card">
              <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Kargo Bilgileri
              </h3>
              <div className="text-sm text-muted-foreground space-y-1">
                {order.shipment.carrier && <p>Firma: {order.shipment.carrier}</p>}
                {order.shipment.trackingNumber && (
                  <p>Takip No: {order.shipment.trackingNumber}</p>
                )}
                {order.shipment.shippedAt && (
                  <p>
                    Gönderim:{" "}
                    {new Date(order.shipment.shippedAt).toLocaleString("tr-TR")}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* İptal butonu */}
          {canCancel && (
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Siparişi İptal Et
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
