"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/contexts/cart-context";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export function CartDrawer() {
  const { items, isCartOpen, setIsCartOpen, removeItem, updateQuantity, totalPrice, totalItems } =
    useCart();

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsCartOpen(false)}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-semibold font-heading">
                  Sepetim ({totalItems})
                </h2>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-secondary"
                aria-label="Sepeti kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <ShoppingBag className="mb-4 h-16 w-16 text-muted-foreground/30" />
                  <p className="mb-2 text-lg font-medium text-muted-foreground">
                    Sepetiniz bos
                  </p>
                  <p className="mb-6 text-sm text-muted-foreground/70">
                    Harika urunlerimizi kesfetmeye baslayin!
                  </p>
                  <Button
                    variant="gradient"
                    onClick={() => setIsCartOpen(false)}
                    asChild
                  >
                    <Link href="/urunler">Alisverise Basla</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <AnimatePresence mode="popLayout">
                    {items.map((item) => (
                      <motion.div
                        key={item.product.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        className="flex gap-4 rounded-xl border border-border bg-secondary/30 p-3"
                      >
                        {/* Product image placeholder */}
                        <div className="h-20 w-20 shrink-0 rounded-lg bg-gradient-to-br from-gradient-start/20 to-gradient-end/20 flex items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-accent/40" />
                        </div>

                        <div className="flex flex-1 flex-col justify-between">
                          <div>
                            <h3 className="text-sm font-medium leading-tight line-clamp-2">
                              {item.product.name}
                            </h3>
                            {item.customization && (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {item.customization}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.product.id,
                                    item.quantity - 1
                                  )
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-secondary"
                                aria-label="Azalt"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-8 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(
                                    item.product.id,
                                    item.quantity + 1
                                  )
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-md border border-border transition-colors hover:bg-secondary"
                                aria-label="Artir"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-accent">
                                {formatPrice(item.product.price * item.quantity)}
                              </span>
                              <button
                                onClick={() => removeItem(item.product.id)}
                                className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                aria-label="Kaldir"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="border-t border-border px-6 py-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Toplam</span>
                  <span className="text-xl font-bold text-foreground">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <Button variant="gradient" size="lg" className="w-full" asChild>
                    <Link href="/odeme" onClick={() => setIsCartOpen(false)}>
                      Odemeye Gec
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full"
                    asChild
                  >
                    <Link href="/sepet" onClick={() => setIsCartOpen(false)}>
                      Sepeti Goruntule
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
