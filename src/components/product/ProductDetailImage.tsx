"use client";

import { useState } from "react";
import { Box } from "lucide-react";

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

function getProductIcon(slug: string): React.ReactNode {
  const cls = "w-28 h-28 text-white/90";
  if (slug.includes("vazo")) {
    return (
      <svg viewBox="0 0 64 64" className={cls} fill="currentColor">
        <path d="M24 8h16v4c0 2-1 4-2 6l-2 8c0 4 2 8 2 12v14c0 2-2 4-4 4h-8c-2 0-4-2-4-4V38c0-4 2-8 2-12l-2-8c-1-2-2-4-2-6V8z" />
      </svg>
    );
  }
  if (slug.includes("stand") || slug.includes("telefon")) {
    return (
      <svg viewBox="0 0 64 64" className={cls} fill="currentColor">
        <rect x="12" y="44" width="40" height="4" rx="1" />
        <rect x="14" y="12" width="24" height="32" rx="2" transform="rotate(-15 26 28)" />
        <rect x="26" y="46" width="12" height="2" rx="1" />
      </svg>
    );
  }
  if (slug.includes("anahtarlik")) {
    return (
      <svg viewBox="0 0 64 64" className={cls} fill="currentColor">
        <circle cx="32" cy="30" r="14" />
        <circle cx="32" cy="30" r="8" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.3" />
        <circle cx="32" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="3" />
      </svg>
    );
  }
  if (slug.includes("lamba")) {
    return (
      <svg viewBox="0 0 64 64" className={cls} fill="currentColor">
        <rect x="30" y="32" width="4" height="20" rx="1" />
        <rect x="22" y="50" width="20" height="4" rx="2" />
        <polygon points="32,8 44,32 20,32" opacity="0.9" />
      </svg>
    );
  }
  if (slug.includes("kalem")) {
    return (
      <svg viewBox="0 0 64 64" className={cls} fill="currentColor">
        <rect x="10" y="44" width="44" height="4" rx="2" />
        <rect x="14" y="18" width="10" height="26" rx="5" />
        <rect x="27" y="22" width="10" height="22" rx="5" />
        <rect x="40" y="20" width="10" height="24" rx="5" />
      </svg>
    );
  }
  if (slug.includes("bileklik")) {
    return (
      <svg viewBox="0 0 64 64" className={cls} fill="none" stroke="currentColor" strokeWidth="5">
        <circle cx="32" cy="32" r="18" />
      </svg>
    );
  }
  if (slug.includes("disli")) {
    return (
      <svg viewBox="0 0 64 64" className={cls} fill="currentColor">
        <path d="M28 4h8v6l4 2 4-4 6 6-4 4 2 4h6v8h-6l-2 4 4 4-6 6-4-4-4 2v6h-8v-6l-4-2-4 4-6-6 4-4-2-4H4v-8h6l2-4-4-4 6-6 4 4 4-2V4z" />
        <circle cx="32" cy="32" r="8" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.3" />
      </svg>
    );
  }
  return <Box className="w-24 h-24 text-white/90" />;
}

interface ProductDetailImageProps {
  slug: string;
  name: string;
  thumbnailUrl: string | null;
}

export function ProductDetailImage({ slug, name, thumbnailUrl }: ProductDetailImageProps) {
  const [imgError, setImgError] = useState(false);
  const gradient = getProductGradient(slug);
  const showPlaceholder = !thumbnailUrl || imgError;

  return (
    <div className="aspect-square rounded-2xl overflow-hidden">
      {showPlaceholder ? (
        <div
          className={`w-full h-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-4`}
        >
          {getProductIcon(slug)}
          <span className="text-white/60 text-sm font-medium tracking-wider uppercase">
            {name}
          </span>
        </div>
      ) : (
        <img
          src={thumbnailUrl!}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}
