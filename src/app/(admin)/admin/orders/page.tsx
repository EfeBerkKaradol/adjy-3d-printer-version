"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  printStatus: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  shippingMethod: string | null;
  customerName: string;
  customerEmail: string;
  itemCount: number;
  items: OrderItem[];
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const statusLabels: Record<string, string> = {
  ALL: "Tümü",
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
  PENDING: "bg-yellow-500/10 text-yellow-500",
  CONFIRMED: "bg-blue-500/10 text-blue-500",
  PROCESSING: "bg-indigo-500/10 text-indigo-500",
  PRINTING: "bg-purple-500/10 text-purple-500",
  QUALITY_CHECK: "bg-cyan-500/10 text-cyan-500",
  PACKAGING: "bg-orange-500/10 text-orange-500",
  SHIPPED: "bg-teal-500/10 text-teal-500",
  DELIVERED: "bg-green-500/10 text-green-500",
  CANCELLED: "bg-red-500/10 text-red-500",
};

const paymentLabels: Record<string, string> = {
  PENDING: "Beklemede",
  PAID: "Ödendi",
  FAILED: "Başarısız",
  REFUNDED: "İade",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status") || "ALL"
  );
  const page = parseInt(searchParams.get("page") || "1");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/orders?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders);
        setPagination(data.pagination);
      }
    } catch {
      // Hata
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateUrl = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([k, v]) => {
      if (v && v !== "ALL") {
        params.set(k, v);
      } else {
        params.delete(k);
      }
    });
    params.delete("page"); // filtre değişince sayfa 1'e dön
    router.push(`/admin/orders?${params}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateUrl({ search });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sipariş Yönetimi</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Tüm siparişleri görüntüleyin ve yönetin
        </p>
      </div>

      {/* Filtreler */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Sipariş no, müşteri adı veya email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            Ara
          </Button>
        </form>

        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val);
            updateUrl({ status: val });
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(statusLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tablo */}
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
                    Sipariş No
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Müşteri
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Durum
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                    Ödeme
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                    Ürün
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Tutar
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">
                    Tarih
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                    İşlem
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-12 text-muted-foreground"
                    >
                      Sipariş bulunamadı
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-border/20 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs">
                          {order.orderNumber}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-xs">
                            {order.customerName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.customerEmail}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded-full font-medium ${
                            statusColors[order.status] || ""
                          }`}
                        >
                          {statusLabels[order.status] || order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs">
                          {paymentLabels[order.paymentStatus] ||
                            order.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {order.itemCount}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatCurrency(order.grandTotal)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/orders/${order.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Sayfalama */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                Toplam {pagination.total} sipariş
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() =>
                    router.push(
                      `/admin/orders?page=${page - 1}${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}${search ? `&search=${search}` : ""}`
                    )
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  {page} / {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pagination.totalPages}
                  onClick={() =>
                    router.push(
                      `/admin/orders?page=${page + 1}${statusFilter !== "ALL" ? `&status=${statusFilter}` : ""}${search ? `&search=${search}` : ""}`
                    )
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
