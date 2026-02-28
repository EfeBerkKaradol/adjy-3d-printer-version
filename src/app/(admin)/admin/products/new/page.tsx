"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Save } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    description: "",
    basePrice: "",
    categoryId: "",
    materialType: "",
    materialWeight: "",
    printTimeEst: "",
    thumbnailUrl: "",
    modelFileUrl: "",
  });

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  // İsimden slug üret
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[çÇ]/g, "c")
      .replace(/[şŞ]/g, "s")
      .replace(/[üÜ]/g, "u")
      .replace(/[öÖ]/g, "o")
      .replace(/[ğĞ]/g, "g")
      .replace(/[ıİ]/g, "i")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: generateSlug(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          basePrice: Number(form.basePrice),
          materialWeight: form.materialWeight ? Number(form.materialWeight) : null,
          printTimeEst: form.printTimeEst ? Number(form.printTimeEst) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push("/admin/products");
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/products"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Yeni Ürün</h1>
          <p className="text-sm text-muted-foreground">Yeni bir 3D baskı ürünü ekleyin</p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Temel Bilgiler */}
        <div className="border border-border/40 rounded-xl p-5 bg-card space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">Temel Bilgiler</h3>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Ürün Adı *</label>
            <Input
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Parametrik Vazo"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Slug *</label>
            <Input
              value={form.slug}
              onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              placeholder="parametrik-vazo"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Açıklama</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Ürün açıklaması..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[80px] resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Fiyat (TL) *</label>
              <Input
                type="number"
                step="0.01"
                value={form.basePrice}
                onChange={(e) => setForm((p) => ({ ...p, basePrice: e.target.value }))}
                placeholder="199.99"
                required
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Kategori *</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm((p) => ({ ...p, categoryId: e.target.value }))}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm h-9"
                required
              >
                <option value="">Seçin...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Teknik Detaylar */}
        <div className="border border-border/40 rounded-xl p-5 bg-card space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">Teknik Detaylar</h3>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Materyal</label>
              <Input
                value={form.materialType}
                onChange={(e) => setForm((p) => ({ ...p, materialType: e.target.value }))}
                placeholder="PLA"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Ağırlık (g)</label>
              <Input
                type="number"
                step="0.01"
                value={form.materialWeight}
                onChange={(e) => setForm((p) => ({ ...p, materialWeight: e.target.value }))}
                placeholder="150"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Baskı Süresi (dk)</label>
              <Input
                type="number"
                value={form.printTimeEst}
                onChange={(e) => setForm((p) => ({ ...p, printTimeEst: e.target.value }))}
                placeholder="120"
              />
            </div>
          </div>
        </div>

        {/* Dosyalar */}
        <div className="border border-border/40 rounded-xl p-5 bg-card space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">Dosyalar (URL)</h3>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Thumbnail URL</label>
            <Input
              value={form.thumbnailUrl}
              onChange={(e) => setForm((p) => ({ ...p, thumbnailUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">3D Model URL (GLB/STL)</label>
            <Input
              value={form.modelFileUrl}
              onChange={(e) => setForm((p) => ({ ...p, modelFileUrl: e.target.value }))}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Ürünü Kaydet
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
            İptal
          </Button>
        </div>
      </form>
    </div>
  );
}
