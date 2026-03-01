"use client";

import { useEffect, useState, useCallback } from "react";
import {
    Loader2,
    Plus,
    Pencil,
    Trash2,
    X,
    FolderTree,
    ChevronRight,
    Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Category {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    sortOrder: number;
    parentId: string | null;
    _count: { products: number };
    children?: Category[];
}

export default function AdminCategoriesPage() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [sortOrder, setSortOrder] = useState(0);
    const [parentId, setParentId] = useState("");

    const fetchCategories = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/categories");
            if (res.ok) {
                const data = await res.json();
                setCategories(data.categories);
            }
        } catch {
            setError("Kategoriler yüklenemedi");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories]);

    function generateSlug(text: string) {
        return text
            .toLowerCase()
            .replace(/ğ/g, "g")
            .replace(/ü/g, "u")
            .replace(/ş/g, "s")
            .replace(/ı/g, "i")
            .replace(/ö/g, "o")
            .replace(/ç/g, "c")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function resetForm() {
        setName("");
        setSlug("");
        setDescription("");
        setImageUrl("");
        setSortOrder(0);
        setParentId("");
        setShowForm(false);
        setEditingId(null);
        setError(null);
    }

    function handleEditClick(cat: Category) {
        setName(cat.name);
        setSlug(cat.slug);
        setDescription(cat.description || "");
        setImageUrl(cat.imageUrl || "");
        setSortOrder(cat.sortOrder);
        setParentId(cat.parentId || "");
        setEditingId(cat.id);
        setShowForm(true);
        setError(null);
    }

    async function handleSave() {
        if (!name || !slug) {
            setError("Ad ve slug zorunludur");
            return;
        }

        setSaving(true);
        setError(null);

        try {
            const payload = {
                name,
                slug,
                description: description || null,
                imageUrl: imageUrl || null,
                sortOrder,
                parentId: parentId || null,
            };

            const url = editingId
                ? `/api/admin/categories/${editingId}`
                : "/api/admin/categories";
            const method = editingId ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Bir hata oluştu");
                return;
            }

            resetForm();
            fetchCategories();
        } catch {
            setError("İstek sırasında bir hata oluştu");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Bu kategoriyi silmek istediğinize emin misiniz?")) return;

        setDeletingId(id);
        setError(null);

        try {
            const res = await fetch(`/api/admin/categories/${id}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Silme işlemi başarısız");
                return;
            }

            fetchCategories();
        } catch {
            setError("Silme işlemi sırasında hata oluştu");
        } finally {
            setDeletingId(null);
        }
    }

    // Tüm kategorileri düz liste olarak topla (parent seçimi için)
    function getAllCategories(): Category[] {
        const result: Category[] = [];
        for (const cat of categories) {
            result.push(cat);
            if (cat.children) {
                result.push(...cat.children);
            }
        }
        return result;
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Kategoriler</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Ürün kategorilerini yönetin
                    </p>
                </div>
                {!showForm && (
                    <Button
                        onClick={() => {
                            resetForm();
                            setShowForm(true);
                        }}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" /> Yeni Kategori
                    </Button>
                )}
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Form */}
            {showForm && (
                <div className="bg-card border border-border/40 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">
                            {editingId ? "Kategori Düzenle" : "Yeni Kategori Ekle"}
                        </h3>
                        <Button variant="ghost" size="icon" onClick={resetForm}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Ad *</Label>
                            <Input
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (!editingId) setSlug(generateSlug(e.target.value));
                                }}
                                placeholder="Kategori adı"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Slug *</Label>
                            <Input
                                value={slug}
                                onChange={(e) => setSlug(e.target.value)}
                                placeholder="kategori-slug"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Açıklama</Label>
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Kategori açıklaması"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Görsel URL</Label>
                            <Input
                                value={imageUrl}
                                onChange={(e) => setImageUrl(e.target.value)}
                                placeholder="/assets/categories/..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Üst Kategori</Label>
                            <select
                                value={parentId}
                                onChange={(e) => setParentId(e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                            >
                                <option value="">Yok (Ana kategori)</option>
                                {getAllCategories()
                                    .filter((c) => c.id !== editingId)
                                    .map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label>Sıralama</Label>
                            <Input
                                type="number"
                                value={sortOrder}
                                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                                min={0}
                            />
                        </div>
                    </div>

                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor...
                            </>
                        ) : editingId ? (
                            "Güncelle"
                        ) : (
                            "Kategori Ekle"
                        )}
                    </Button>
                </div>
            )}

            {/* Category List */}
            {categories.length === 0 ? (
                <div className="bg-card border border-border/40 rounded-xl p-16 text-center">
                    <FolderTree className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">Henüz kategori bulunmuyor</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {categories.map((cat) => (
                        <div key={cat.id}>
                            {/* Parent Category */}
                            <div className="bg-card border border-border/40 rounded-xl p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <FolderTree className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{cat.name}</span>
                                            <Badge variant="secondary" className="text-xs">
                                                <Package className="h-3 w-3 mr-1" />
                                                {cat._count.products} ürün
                                            </Badge>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            /{cat.slug}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleEditClick(cat)}
                                    >
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDelete(cat.id)}
                                        disabled={deletingId === cat.id}
                                    >
                                        {deletingId === cat.id ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {/* Children */}
                            {cat.children && cat.children.length > 0 && (
                                <div className="ml-8 mt-2 space-y-2">
                                    {cat.children.map((child) => (
                                        <div
                                            key={child.id}
                                            className="bg-card/50 border border-border/30 rounded-lg p-3 flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium">
                                                            {child.name}
                                                        </span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {child._count.products} ürün
                                                        </Badge>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground">
                                                        /{child.slug}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEditClick(child)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDelete(child.id)}
                                                    disabled={deletingId === child.id}
                                                >
                                                    {deletingId === child.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
