"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, ShoppingCart, Box, Star, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/contexts/cart-context";
import type { Product } from "@/lib/mock-data";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-xl hover:shadow-accent/5"
    >
      {/* Image area */}
      <Link
        href={`/urunler/${product.slug}`}
        className="relative aspect-square overflow-hidden bg-gradient-to-br from-gradient-start/10 to-gradient-end/10"
      >
        <div className="flex h-full w-full items-center justify-center">
          <Box className="h-16 w-16 text-accent/20 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12" />
        </div>

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {product.has3DModel && (
            <Badge variant="gradient" className="text-[10px]">
              <Sparkles className="mr-1 h-3 w-3" />
              3D
            </Badge>
          )}
          {product.originalPrice && (
            <Badge className="bg-destructive/90 text-destructive-foreground text-[10px]">
              %{Math.round((1 - product.price / product.originalPrice) * 100)} Indirim
            </Badge>
          )}
          {!product.inStock && (
            <Badge variant="secondary" className="text-[10px]">
              Stokta Yok
            </Badge>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-background/60 opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100">
          <Button size="sm" variant="secondary" className="h-9 gap-1.5">
            <Eye className="h-4 w-4" />
            Incele
          </Button>
        </div>
      </Link>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <div className="mb-1 flex items-center gap-1">
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          <span className="text-xs font-medium">{product.rating}</span>
          <span className="text-xs text-muted-foreground">
            ({product.reviewCount})
          </span>
        </div>

        <Link
          href={`/urunler/${product.slug}`}
          className="mb-1 text-sm font-semibold leading-tight line-clamp-2 hover:text-accent transition-colors"
        >
          {product.name}
        </Link>

        <p className="mb-3 text-xs text-muted-foreground line-clamp-1">
          {product.shortDescription}
        </p>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-foreground">
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="gradient"
            onClick={() => addItem(product)}
            disabled={!product.inStock}
            className="h-9 gap-1.5"
          >
            <ShoppingCart className="h-3.5 w-3.5" />
            <span className="sr-only lg:not-sr-only">Ekle</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
