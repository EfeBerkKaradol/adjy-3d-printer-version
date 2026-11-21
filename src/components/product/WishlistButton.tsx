"use client";

import { Heart } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useWishlistStore } from "@/store/wishlistStore";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: string;
  className?: string;
  /** "gorsel": görselin üstünde (koyu yarı saydam); "duz": sayfa zemininde */
  variant?: "gorsel" | "duz";
}

export function WishlistButton({ productId, className, variant = "gorsel" }: WishlistButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const isWishlisted = useWishlistStore((s) => s.isWishlisted(productId));
  const toggleWishlist = useWishlistStore((s) => s.toggleWishlist);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      router.push("/login?callbackUrl=" + encodeURIComponent(window.location.pathname));
      return;
    }

    await toggleWishlist(productId);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "p-2 rounded-full transition-all duration-200",
        variant === "duz"
          ? "flex items-center justify-center active:scale-95"
          : "hover:scale-110 active:scale-95",
        variant === "duz"
          ? isWishlisted
            ? "text-red-500"
            : "text-foreground/70 hover:text-foreground"
          : isWishlisted
            ? "bg-red-500/20 text-red-500 hover:bg-red-500/30"
            : "bg-black/30 text-white/70 hover:bg-black/50 hover:text-white",
        className
      )}
      title={isWishlisted ? "Favorilerden kald\u0131r" : "Favorilere ekle"}
    >
      <Heart
        className={cn(variant === "duz" ? "h-5 w-5" : "h-4 w-4", isWishlisted && "fill-current")}
      />
    </button>
  );
}
