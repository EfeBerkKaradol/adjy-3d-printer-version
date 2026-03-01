"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCard } from "@/components/product/ProductCard";
import { Loader2, User, Package, MapPin, Heart } from "lucide-react";
import Link from "next/link";

interface WishlistProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  basePrice: number;
  thumbnailUrl: string | null;
  featured: boolean;
  category: { name: string; slug: string };
  _count: { reviews: number };
  averageRating?: number;
}

interface WishlistItem {
  id: string;
  createdAt: string;
  product: WishlistProduct;
}

export default function FavoritesPage() {
  const { status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchWishlist();
    }
  }, [status, router]);

  async function fetchWishlist() {
    try {
      const res = await fetch("/api/wishlist");
      if (res.ok) {
        const data = await res.json();
        setItems(data.wishlist);
      }
    } catch (error) {
      console.error("Wishlist fetch error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <Tabs defaultValue="favorites" className="mb-8">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" asChild>
            <Link href="/profile" className="flex items-center gap-2">
              <User className="h-4 w-4" /> Profil
            </Link>
          </TabsTrigger>
          <TabsTrigger value="orders" asChild>
            <Link href="/profile/orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Siparisler
            </Link>
          </TabsTrigger>
          <TabsTrigger value="favorites" asChild>
            <Link href="/profile/favorites" className="flex items-center gap-2">
              <Heart className="h-4 w-4" /> Favoriler
            </Link>
          </TabsTrigger>
          <TabsTrigger value="addresses" asChild>
            <Link href="/profile/addresses" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Adresler
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Favorilerim</h1>
        <p className="text-muted-foreground mt-1">
          Begendginiz urunleri burada goruntuleyebilirsiniz
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16">
          <Heart className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Henuz favori urun yok</h2>
          <p className="text-muted-foreground mb-6">
            Urunleri favorilere eklemek icin kalp ikonuna tiklayabilirsiniz
          </p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Urunlere Goz At
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <ProductCard key={item.id} product={item.product} />
          ))}
        </div>
      )}
    </div>
  );
}
