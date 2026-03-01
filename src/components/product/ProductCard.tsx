"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Star, Box } from "lucide-react";
import { WishlistButton } from "./WishlistButton";

// ==========================================
// ÜRÜN KARTI KOMPONENTİ
// Ürünler sayfasındaki grid'de her ürün bu
// kart ile gösterilir.
// ==========================================

interface ProductCardProps {
  product: {
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
  };
}

// Slug'a göre gradient renkleri
function getProductGradient(slug: string): string {
  if (slug.includes("vazo")) return "from-violet-500 to-purple-600";
  if (slug.includes("stand") || slug.includes("telefon")) return "from-blue-500 to-indigo-600";
  if (slug.includes("anahtarlik")) return "from-red-500 to-orange-500";
  if (slug.includes("lamba")) return "from-amber-400 to-yellow-500";
  if (slug.includes("kalem")) return "from-blue-600 to-blue-400";
  if (slug.includes("bileklik")) return "from-gray-800 to-gray-600";
  if (slug.includes("disli")) return "from-gray-500 to-slate-400";
  return "from-primary/80 to-primary";
}

// Slug'a göre basit SVG ikon path
function getProductIcon(slug: string): React.ReactNode {
  if (slug.includes("vazo")) {
    return (
      <svg viewBox="0 0 64 64" className="w-20 h-20 text-white/90" fill="currentColor">
        <path d="M24 8h16v4c0 2-1 4-2 6l-2 8c0 4 2 8 2 12v14c0 2-2 4-4 4h-8c-2 0-4-2-4-4V38c0-4 2-8 2-12l-2-8c-1-2-2-4-2-6V8z" />
      </svg>
    );
  }
  if (slug.includes("stand") || slug.includes("telefon")) {
    return (
      <svg viewBox="0 0 64 64" className="w-20 h-20 text-white/90" fill="currentColor">
        <rect x="12" y="44" width="40" height="4" rx="1" />
        <rect x="14" y="12" width="24" height="32" rx="2" transform="rotate(-15 26 28)" />
        <rect x="26" y="46" width="12" height="2" rx="1" />
      </svg>
    );
  }
  if (slug.includes("anahtarlik")) {
    return (
      <svg viewBox="0 0 64 64" className="w-20 h-20 text-white/90" fill="currentColor">
        <circle cx="32" cy="30" r="14" />
        <circle cx="32" cy="30" r="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
        <circle cx="32" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="3" />
      </svg>
    );
  }
  if (slug.includes("lamba")) {
    return (
      <svg viewBox="0 0 64 64" className="w-20 h-20 text-white/90" fill="currentColor">
        <rect x="30" y="32" width="4" height="20" rx="1" />
        <rect x="22" y="50" width="20" height="4" rx="2" />
        <polygon points="32,8 44,32 20,32" opacity="0.9" />
      </svg>
    );
  }
  if (slug.includes("kalem")) {
    return (
      <svg viewBox="0 0 64 64" className="w-20 h-20 text-white/90" fill="currentColor">
        <rect x="10" y="44" width="44" height="4" rx="2" />
        <rect x="14" y="18" width="10" height="26" rx="5" />
        <rect x="27" y="22" width="10" height="22" rx="5" />
        <rect x="40" y="20" width="10" height="24" rx="5" />
      </svg>
    );
  }
  if (slug.includes("bileklik")) {
    return (
      <svg viewBox="0 0 64 64" className="w-20 h-20 text-white/90" fill="none" stroke="currentColor" strokeWidth="5">
        <circle cx="32" cy="32" r="18" />
      </svg>
    );
  }
  if (slug.includes("disli")) {
    return (
      <svg viewBox="0 0 64 64" className="w-20 h-20 text-white/90" fill="currentColor">
        <path d="M28 4h8v6l4 2 4-4 6 6-4 4 2 4h6v8h-6l-2 4 4 4-6 6-4-4-4 2v6h-8v-6l-4-2-4 4-6-6 4-4-2-4H4v-8h6l2-4-4-4 6-6 4 4 4-2V4z" />
        <circle cx="32" cy="32" r="8" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.3" />
      </svg>
    );
  }
  return <Box className="w-16 h-16 text-white/90" />;
}

export function ProductCard({ product }: ProductCardProps) {
  const [imgError, setImgError] = useState(false);
  const gradient = getProductGradient(product.slug);

  const showPlaceholder = !product.thumbnailUrl || imgError;

  return (
    <Link href={`/products/${product.slug}`}>
      <Card className="group h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 border-border/50">
        {/* Ürün Görseli */}
        <div className="relative aspect-square bg-muted overflow-hidden">
          {showPlaceholder ? (
            <div
              className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-3`}
            >
              {getProductIcon(product.slug)}
              <span className="text-white/70 text-xs font-medium tracking-wider uppercase">
                3D Model
              </span>
            </div>
          ) : (
            <img
              src={product.thumbnailUrl!}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          )}

          {/* Featured Badge */}
          {product.featured && (
            <Badge className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm">
              One Cikan
            </Badge>
          )}

          {/* Wishlist Button */}
          <div className="absolute top-3 right-3 z-10">
            <WishlistButton productId={product.id} />
          </div>
        </div>

        {/* Kart İçeriği */}
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-1">
            {product.category.name}
          </p>
          <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          {product.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {product.description}
            </p>
          )}
        </CardContent>

        {/* Fiyat + Yorum Sayısı */}
        <CardFooter className="p-4 pt-0 flex items-center justify-between">
          <span className="text-lg font-bold text-primary">
            {Number(product.basePrice).toFixed(2)} TL
          </span>
          {product._count.reviews > 0 && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
              <span>
                {product.averageRating ? `${product.averageRating}` : ""}
                {" "}({product._count.reviews})
              </span>
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
