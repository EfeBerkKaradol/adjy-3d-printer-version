"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  Minus,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Tag,
  Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/contexts/cart-context";
import { formatPrice } from "@/lib/utils";
import { ScrollReveal } from "@/components/common/motion";

export default function CartPage() {
  const { items, removeItem, updateQuantity, totalPrice, clearCart } = useCart();

  const shippingCost = totalPrice >= 500 ? 0 : 49;
  const grandTotal = totalPrice + shippingCost;

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-20 lg:pt-24">
        <div className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <ShoppingBag className="mb-6 h-24 w-24 text-muted-foreground/20" />
            </motion.div>
            <h1 className="mb-3 text-2xl font-bold font-heading md:text-3xl">
              Sepetiniz Bos
            </h1>
            <p className="mb-8 max-w-md text-muted-foreground">
              Henuz sepetinize urun eklemediniz. Genis urun yelpazemizi kesfetmeye baslayin!
            </p>
            <Button variant="gradient" size="lg" asChild>
              <Link href="/urunler">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Alisverise Basla
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 lg:pt-24">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <ScrollReveal>
          <h1 className="mb-8 text-3xl font-bold tracking-tight font-heading md:text-4xl">
            Alisveris Sepeti
          </h1>
        </ScrollReveal>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <span className="text-sm font-medium text-muted-foreground">
                  {items.length} urun
                </span>
                <button
                  onClick={clearCart}
                  className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                >
                  Sepeti Temizle
                </button>
              </div>

              {/* Items */}
              <div className="divide-y divide-border">
                <AnimatePresence mode="popLayout">
                  {items.map((item) => (
                    <motion.div
                      key={item.product.id}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex gap-4 px-6 py-5"
                    >
                      {/* Image placeholder */}
                      <div className="h-24 w-24 shrink-0 rounded-lg bg-gradient-to-br from-gradient-start/10 to-gradient-end/10 flex items-center justify-center">
                        <Box className="h-10 w-10 text-accent/30" />
                      </div>

                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <Link
                              href={`/urunler/${item.product.slug}`}
                              className="text-sm font-semibold hover:text-accent transition-colors line-clamp-1"
                            >
                              {item.product.name}
                            </Link>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {item.product.material} | {item.product.category.replace("-", " ")}
                            </p>
                            {item.customization && (
                              <p className="mt-0.5 text-xs text-accent">
                                {item.customization}
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeItem(item.product.id)}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            aria-label="Urunu kaldir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() =>
                                updateQuantity(item.product.id, item.quantity - 1)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-md border border-border transition-colors hover:bg-secondary"
                              aria-label="Azalt"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-10 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.product.id, item.quantity + 1)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-md border border-border transition-colors hover:bg-secondary"
                              aria-label="Artir"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-base font-bold">
                            {formatPrice(item.product.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>

            {/* Continue shopping */}
            <div className="mt-4">
              <Button variant="ghost" asChild>
                <Link href="/urunler">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Alisverise Devam Et
                </Link>
              </Button>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl border border-border bg-card p-6">
              <h2 className="mb-4 text-lg font-semibold font-heading">
                Siparis Ozeti
              </h2>

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ara Toplam</span>
                  <span className="font-medium">{formatPrice(totalPrice)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Kargo</span>
                  <span className="font-medium">
                    {shippingCost === 0 ? (
                      <span className="text-green-500">Ucretsiz</span>
                    ) : (
                      formatPrice(shippingCost)
                    )}
                  </span>
                </div>
                {shippingCost > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {formatPrice(500 - totalPrice)} daha ekleyin, ucretsiz kargo kazanin!
                  </p>
                )}

                <div className="my-2 border-t border-border" />

                {/* Coupon */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Kupon kodu" className="h-9 pl-9" />
                  </div>
                  <Button variant="outline" size="sm" className="h-9">
                    Uygula
                  </Button>
                </div>

                <div className="my-2 border-t border-border" />

                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold">Toplam</span>
                  <span className="text-2xl font-bold text-foreground">
                    {formatPrice(grandTotal)}
                  </span>
                </div>
              </div>

              <Button
                variant="gradient"
                size="lg"
                className="mt-6 w-full gap-2"
                asChild
              >
                <Link href="/odeme">
                  Odemeye Gec
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
