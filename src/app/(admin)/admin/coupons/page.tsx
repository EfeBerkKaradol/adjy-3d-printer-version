"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Search, Pencil } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  validFrom: string;
  validTo: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCoupons();
  }, []);

  async function fetchCoupons() {
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/coupons?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCoupons(data.coupons);
      }
    } catch (error) {
      console.error("Coupons fetch error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isActive: !c.isActive } : c))
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Kupon Yonetimi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {coupons.length} kupon
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/coupons/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" /> Yeni Kupon
          </Link>
        </Button>
      </div>

      {/* Arama */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Kupon kodu ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchCoupons()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={fetchCoupons}>Ara</Button>
      </div>

      {/* Tablo */}
      <div className="border border-border/40 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="text-left px-4 py-3 font-medium">Kod</th>
              <th className="text-left px-4 py-3 font-medium">Tip</th>
              <th className="text-left px-4 py-3 font-medium">Deger</th>
              <th className="text-left px-4 py-3 font-medium">Min. Tutar</th>
              <th className="text-left px-4 py-3 font-medium">Kullanim</th>
              <th className="text-left px-4 py-3 font-medium">Bitis</th>
              <th className="text-left px-4 py-3 font-medium">Durum</th>
              <th className="text-left px-4 py-3 font-medium">Islemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {coupons.map((coupon) => (
              <tr key={coupon.id} className="hover:bg-muted/20">
                <td className="px-4 py-3">
                  <span className="font-mono font-semibold">{coupon.code}</span>
                  {coupon.description && (
                    <p className="text-xs text-muted-foreground">{coupon.description}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">
                    {coupon.type === "PERCENTAGE" ? "Yuzde" : "Sabit"}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-medium">
                  {coupon.type === "PERCENTAGE"
                    ? `%${coupon.value}`
                    : `${coupon.value.toFixed(2)} TL`}
                </td>
                <td className="px-4 py-3">
                  {coupon.minOrderAmount
                    ? `${coupon.minOrderAmount.toFixed(2)} TL`
                    : "-"}
                </td>
                <td className="px-4 py-3">
                  {coupon.usedCount}
                  {coupon.maxUses ? ` / ${coupon.maxUses}` : ""}
                </td>
                <td className="px-4 py-3 text-xs">
                  {coupon.validTo
                    ? new Date(coupon.validTo).toLocaleDateString("tr-TR")
                    : "Suresiz"}
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={coupon.isActive
                      ? "bg-green-500/10 text-green-600 border-green-500/20"
                      : "bg-red-500/10 text-red-500 border-red-500/20"
                    }
                  >
                    {coupon.isActive ? "Aktif" : "Pasif"}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/coupons/${coupon.id}`}>
                      <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(coupon.id, coupon.isActive)}
                      className="text-xs h-7"
                    >
                      {coupon.isActive ? "Devre Disi" : "Aktif Et"}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {coupons.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  Henuz kupon yok
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
