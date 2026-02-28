"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.productId as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    isActive: true,
    featured: false,
  });

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/products/${productId}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]).then(([productData, catData]) => {
      if (productData.product) {
        const p = productData.product;
        setForm({
          name: p.name || "",
          slug: p.slug || "",
          description: p.description || "",
          basePrice: String(p.basePrice || ""),
          categoryId: p.categoryId || "",
          materialType: p.materialType || "",
          materialWeight: p.materialWeight ? String(p.materialWeight) : "",
          printTimeEst: p.printTimeEst ? String(p.printTimeEst) : "",
          thumbnailUrl: p.thumbnailUrl || "",
          modelFileUrl: p.modelFileUrl || "",
          isActive: p.isActive ?? true,
          featured: p.featured ?? false,
        });
      }
      setCategories(catData.categories || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
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

      setSuccess("Ürün başarıyla güncellendi");
    } catch {
      setError("Bir hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      router.push("/admin/products");
    } catch {
      setError("Silme işlemi başarısız oldu");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/products"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Ürün Düzenle</h1>
            <p className="text-sm text-muted-foreground">{form.name || "Yükleniyor..."}</p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={deleting}
          className="gap-2"
        >
          {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          Sil
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Durum */}
        <div className="border border-border/40 rounded-xl p-5 bg-card">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm font-medium">Aktif</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm((p) => ({ ...p, featured: e.target.checked }))}
                className="rounded"
              />
              <span className="text-sm font-medium">Öne Çıkan</span>
            </label>
          </div>
        </div>

        {/* Temel Bilgiler */}
        <div className="border border-border/40 rounded-xl p-5 bg-card space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">Temel Bilgiler</h3>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Ürün Adı *</label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Slug *</label>
            <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} required />
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Açıklama</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
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
              <Input value={form.materialType} onChange={(e) => setForm((p) => ({ ...p, materialType: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Ağırlık (g)</label>
              <Input type="number" step="0.01" value={form.materialWeight} onChange={(e) => setForm((p) => ({ ...p, materialWeight: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Baskı Süresi (dk)</label>
              <Input type="number" value={form.printTimeEst} onChange={(e) => setForm((p) => ({ ...p, printTimeEst: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Dosyalar */}
        <div className="border border-border/40 rounded-xl p-5 bg-card space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground">Dosyalar (URL)</h3>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Thumbnail URL</label>
            <Input value={form.thumbnailUrl} onChange={(e) => setForm((p) => ({ ...p, thumbnailUrl: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">3D Model URL (GLB/STL)</label>
            <Input value={form.modelFileUrl} onChange={(e) => setForm((p) => ({ ...p, modelFileUrl: e.target.value }))} />
          </div>
        </div>

        <Button type="submit" disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Değişiklikleri Kaydet
        </Button>
      </form>
    </div>
  );
}
