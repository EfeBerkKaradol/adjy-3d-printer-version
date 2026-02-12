import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Star } from "lucide-react";

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
  };
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/products/${product.slug}`}>
      <Card className="group h-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 border-border/50">
        {/* Ürün Görseli */}
        <div className="relative aspect-square bg-muted overflow-hidden">
          {product.thumbnailUrl ? (
            <img
              src={product.thumbnailUrl}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-4xl mb-2">🖨️</div>
                <span className="text-xs">3D Model</span>
              </div>
            </div>
          )}

          {/* Featured Badge */}
          {product.featured && (
            <Badge className="absolute top-3 left-3 bg-primary/90 backdrop-blur-sm">
              Öne Çıkan
            </Badge>
          )}
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
              <span>{product._count.reviews} yorum</span>
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
