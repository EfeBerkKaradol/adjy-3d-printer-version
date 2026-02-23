"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PrintItem {
  id: string;
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  productName: string;
  productThumbnail: string | null;
  quantity: number;
  printStatus: string;
  customParams: Record<string, unknown> | null;
  customerName: string;
}

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

export default function AdminPrintQueuePage() {
  const [items, setItems] = useState<PrintItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  const fetchItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "ALL") params.set("status", filter);
      const res = await fetch(`/api/admin/print-queue?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch {
      // Hata
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [filter]);

  const updatePrintStatus = async (itemId: string, printStatus: string) => {
    try {
      const res = await fetch("/api/admin/print-queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, printStatus }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((i) => (i.id === itemId ? { ...i, printStatus } : i))
        );
      }
    } catch {
      // Hata
    }
  };

  // Durum sayıları
  const counts = {
    ALL: items.length,
    QUEUED: items.filter((i) => i.printStatus === "QUEUED").length,
    PRINTING: items.filter((i) => i.printStatus === "PRINTING").length,
    DONE: items.filter((i) => i.printStatus === "DONE").length,
    FAILED: items.filter((i) => i.printStatus === "FAILED").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Baskı Kuyruğu</h1>
        <p className="text-muted-foreground text-sm mt-1">
          3D baskı durumlarını takip edin ve güncelleyin
        </p>
      </div>

      {/* Durum Kartları */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["ALL", "QUEUED", "PRINTING", "DONE", "FAILED"] as const).map(
          (status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`p-3 rounded-xl border text-center transition-all ${
                filter === status
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/40 hover:border-primary/40"
              }`}
            >
              <p className="text-2xl font-bold">
                {counts[status as keyof typeof counts]}
              </p>
              <p className="text-xs text-muted-foreground">
                {status === "ALL"
                  ? "Toplam"
                  : printStatusLabels[status]}
              </p>
            </button>
          )
        )}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Ürün
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Sipariş
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Müşteri
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                    Adet
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                    Baskı Durumu
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <Printer className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      Baskı kuyruğu boş
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.productThumbnail ? (
                            <img
                              src={item.productThumbnail}
                              alt={item.productName}
                              className="w-10 h-10 rounded-lg object-cover bg-muted"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <Printer className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium text-sm">
                            {item.productName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/orders/${item.orderId}`}
                          className="font-mono text-xs text-primary hover:underline"
                        >
                          {item.orderNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {item.customerName}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Select
                          value={item.printStatus}
                          onValueChange={(val) =>
                            updatePrintStatus(item.id, val)
                          }
                        >
                          <SelectTrigger className="w-[140px] h-8 text-xs mx-auto">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="QUEUED">Kuyrukta</SelectItem>
                            <SelectItem value="PRINTING">Baskıda</SelectItem>
                            <SelectItem value="DONE">Tamamlandı</SelectItem>
                            <SelectItem value="FAILED">Başarısız</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
