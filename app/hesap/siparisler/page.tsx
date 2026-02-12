"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Package,
  Search,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { mockOrders } from "@/lib/mock-data";
import { formatPrice } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Onay Bekliyor", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
  processing: { label: "Hazirlaniyor", className: "bg-blue-500/15 text-blue-500 border-blue-500/30" },
  printing: { label: "Basiliyor", className: "bg-purple-500/15 text-purple-500 border-purple-500/30" },
  shipped: { label: "Kargoda", className: "bg-cyan-500/15 text-cyan-500 border-cyan-500/30" },
  delivered: { label: "Teslim Edildi", className: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30" },
  cancelled: { label: "Iptal", className: "bg-destructive/15 text-destructive border-destructive/30" },
};

const filterOptions = [
  { value: "all", label: "Tumu" },
  { value: "processing", label: "Hazirlaniyor" },
  { value: "printing", label: "Basiliyor" },
  { value: "shipped", label: "Kargoda" },
  { value: "delivered", label: "Teslim Edildi" },
  { value: "cancelled", label: "Iptal" },
];

export default function OrdersPage() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredOrders = mockOrders.filter((order) => {
    const matchesFilter = activeFilter === "all" || order.status === activeFilter;
    const matchesSearch =
      !searchQuery ||
      order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Siparislerim
        </h1>
        <p className="text-muted-foreground mt-1">
          Tum siparislerinizi takip edin ve detaylarina goz atin
        </p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Siparis numarasi ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card border-border"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0 mr-1" />
          {filterOptions.map((option) => (
            <Button
              key={option.value}
              variant={activeFilter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(option.value)}
              className={`flex-shrink-0 text-xs ${
                activeFilter === option.value
                  ? "bg-gradient-to-r from-primary to-accent text-primary-foreground border-0"
                  : ""
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass rounded-xl p-12 text-center"
          >
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold text-foreground mb-2">
              Siparis Bulunamadi
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? "Arama kriterlerinize uygun siparis bulunamadi."
                : "Bu kategoride siparisiniz bulunmuyor."}
            </p>
          </motion.div>
        ) : (
          filteredOrders.map((order, i) => {
            const status = statusConfig[order.status];
            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={`/hesap/siparisler/${order.id}`}
                  className="glass rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-primary/30 transition-all group block"
                >
                  {/* Order info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">
                        {order.orderNumber}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(order.date).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Items summary */}
                  <div className="flex-1 hidden md:block">
                    <p className="text-sm text-muted-foreground">
                      {order.items
                        .map(
                          (item) =>
                            `${item.product.name}${
                              item.quantity > 1 ? ` x${item.quantity}` : ""
                            }`
                        )
                        .join(", ")}
                    </p>
                  </div>

                  {/* Status + Price */}
                  <div className="flex items-center gap-4 sm:gap-6">
                    <Badge
                      variant="outline"
                      className={`text-xs ${status.className}`}
                    >
                      {status.label}
                    </Badge>
                    <span className="text-base font-bold text-foreground min-w-[80px] text-right">
                      {formatPrice(order.total)}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                </Link>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
