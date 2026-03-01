"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function EditCouponPage() {
  const params = useParams();
  const router = useRouter();
  const couponId = params.couponId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    code: "",
    description: "",
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED",
    value: "",
    minOrderAmount: "",
    maxUses: "",
    validTo: "",
    isActive: true,
  });

  useEffect(() => {
    async function fetchCoupon() {
      try {
        const res = await fetch(`/api/admin/coupons/${couponId}`);
        if (res.ok) {
          const data = await res.json();
          const c = data.coupon;
          setForm({
            code: c.code,
            description: c.description || "",
            type: c.type,
            value: String(c.value),
            minOrderAmount: c.minOrderAmount ? String(c.minOrderAmount) : "",
            maxUses: c.maxUses ? String(c.maxUses) : "",
            validTo: c.validTo ? c.validTo.slice(0, 16) : "",
            isActive: c.isActive,
          });
        }
      } catch (err) {
        console.error("Coupon fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCoupon();
  }, [couponId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/admin/coupons/${couponId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          description: form.description || null,
          type: form.type,
          value: parseFloat(form.value),
          minOrderAmount: form.minOrderAmount ? parseFloat(form.minOrderAmount) : null,
          maxUses: form.maxUses ? parseInt(form.maxUses) : null,
          validTo: form.validTo || null,
          isActive: form.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Kupon guncellenemedi");
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setError("Bir hata olustu");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/coupons">
          <ArrowLeft className="h-5 w-5 text-muted-foreground hover:text-foreground" />
        </Link>
        <h1 className="text-2xl font-bold">Kupon Duzenle</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kupon Bilgileri</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-lg bg-green-500/10 text-green-600 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> Kupon guncellendi
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Kupon Kodu</Label>
                <Input
                  id="code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  className="uppercase"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Indirim Tipi</Label>
                <select
                  id="type"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as "PERCENTAGE" | "FIXED" })}
                  className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="PERCENTAGE">Yuzde (%)</option>
                  <option value="FIXED">Sabit Tutar (TL)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Aciklama</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value">
                  Deger {form.type === "PERCENTAGE" ? "(%)" : "(TL)"}
                </Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minOrderAmount">Min. Siparis (TL)</Label>
                <Input
                  id="minOrderAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.minOrderAmount}
                  onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses">Maks Kullanim</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="1"
                  value={form.maxUses}
                  onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="validTo">Bitis Tarihi</Label>
              <Input
                id="validTo"
                type="datetime-local"
                value={form.validTo}
                onChange={(e) => setForm({ ...form, validTo: e.target.value })}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="isActive">Aktif</Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kaydet
              </Button>
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Iptal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
