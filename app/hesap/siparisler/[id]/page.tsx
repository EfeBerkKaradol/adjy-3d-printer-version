"use client";

import { use } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ChevronLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  Printer,
  MapPin,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mockOrders } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  pending: { label: "Onay Bekliyor", className: "bg-amber-500/15 text-amber-500 border-amber-500/30", icon: Clock },
  processing: { label: "Hazirlaniyor", className: "bg-blue-500/15 text-blue-500 border-blue-500/30", icon: Package },
  printing: { label: "Basiliyor", className: "bg-purple-500/15 text-purple-500 border-purple-500/30", icon: Printer },
  shipped: { label: "Kargoda", className: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30", icon: Truck },
  delivered: { label: "Teslim Edildi", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", icon: CheckCircle2 },
  cancelled: { label: "Iptal", className: "bg-destructive/15 text-destructive border-destructive/30", icon: Clock },
};

const timelineSteps = [
  { key: "pending", label: "Siparis Alindi", icon: Clock },
  { key: "processing", label: "Hazirlaniyor", icon: Package },
  { key: "printing", label: "3D Baski", icon: Printer },
  { key: "shipped", label: "Kargoya Verildi", icon: Truck },
  { key: "delivered", label: "Teslim Edildi", icon: CheckCircle2 },
];

const statusOrder = ["pending", "processing", "printing", "shipped", "delivered"];

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const order = mockOrders.find((o) => o.id === id);

  if (!order) {
    return (
      <div className="glass rounded-xl p-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="font-semibold text-foreground mb-2">
          Siparis Bulunamadi
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Aradiginiz siparis mevcut degil.
        </p>
        <Link href="/hesap/siparisler">
          <Button variant="outline">Siparislere Don</Button>
        </Link>
      </div>
    );
  }

  const status = statusConfig[order.status];
  const currentStepIndex = statusOrder.indexOf(order.status);
  const isCancelled = order.status === "cancelled";
  const subtotal = order.items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/hesap/siparisler"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Siparislere Don
      </Link>

      {/* Order header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold font-heading text-foreground">
                {order.orderNumber}
              </h1>
              <button
                onClick={() => navigator.clipboard.writeText(order.orderNumber)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Siparis numarasini kopyala"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {new Date(order.date).toLocaleDateString("tr-TR", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`text-sm px-4 py-1.5 ${status.className}`}
          >
            {status.label}
          </Badge>
        </div>
      </motion.div>

      {/* Timeline */}
      {!isCancelled && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-xl p-6"
        >
          <h2 className="text-lg font-semibold font-heading text-foreground mb-6">
            Siparis Durumu
          </h2>
          <div className="relative">
            {/* Progress line */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-muted hidden sm:block">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                initial={{ width: "0%" }}
                animate={{
                  width: `${(currentStepIndex / (timelineSteps.length - 1)) * 100}%`,
                }}
                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:justify-between gap-4 sm:gap-0 relative">
              {timelineSteps.map((step, i) => {
                const StepIcon = step.icon;
                const isCompleted = i <= currentStepIndex;
                const isCurrent = i === currentStepIndex;

                return (
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="flex sm:flex-col items-center gap-3 sm:gap-2"
                  >
                    <div
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        isCompleted
                          ? "bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-md shadow-primary/30"
                          : "bg-muted text-muted-foreground"
                      } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                    >
                      <StepIcon className="h-4 w-4" />
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        isCompleted ? "text-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}

      {/* Order items */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-xl p-6"
      >
        <h2 className="text-lg font-semibold font-heading text-foreground mb-4">
          Siparis Icerigi
        </h2>
        <div className="space-y-4">
          {order.items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-4 p-4 rounded-lg bg-muted/30"
            >
              <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">
                  {item.product.name}
                </p>
                {item.customization && (
                  <p className="text-xs text-accent mt-0.5">
                    {item.customization}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {item.quantity} adet x {formatPrice(item.product.price)}
                </p>
              </div>
              <p className="font-semibold text-foreground">
                {formatPrice(item.product.price * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        {/* Price summary */}
        <div className="border-t border-border mt-4 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ara Toplam</span>
            <span className="text-foreground">{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Kargo</span>
            <span className="text-foreground">
              {formatPrice(order.total - subtotal)}
            </span>
          </div>
          <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
            <span className="text-foreground">Toplam</span>
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {formatPrice(order.total)}
            </span>
          </div>
        </div>
      </motion.div>

      {/* Shipping info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-xl p-6"
      >
        <h2 className="text-lg font-semibold font-heading text-foreground mb-4">
          Teslimat Bilgileri
        </h2>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <MapPin className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{order.shippingAddress}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Standart Teslimat (3-5 is gunu)
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
