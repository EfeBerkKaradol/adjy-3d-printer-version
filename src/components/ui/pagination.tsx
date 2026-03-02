"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

export function Pagination({ currentPage, totalPages }: PaginationProps) {
  const searchParams = useSearchParams();

  function buildHref(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `?${params.toString()}`;
  }

  // Generate visible page numbers
  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <nav className="flex items-center justify-center gap-1 mt-8" aria-label="Sayfalama">
      <Link
        href={buildHref(currentPage - 1)}
        className={cn(
          "inline-flex items-center justify-center h-9 w-9 rounded-md border border-border/40 text-sm transition-colors hover:bg-muted",
          currentPage <= 1 && "pointer-events-none opacity-40"
        )}
        aria-disabled={currentPage <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>

      {pages.map((page, i) =>
        page === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-muted-foreground text-sm">
            ...
          </span>
        ) : (
          <Link
            key={page}
            href={buildHref(page)}
            className={cn(
              "inline-flex items-center justify-center h-9 w-9 rounded-md text-sm font-medium transition-colors",
              page === currentPage
                ? "bg-primary text-primary-foreground"
                : "border border-border/40 hover:bg-muted"
            )}
          >
            {page}
          </Link>
        )
      )}

      <Link
        href={buildHref(currentPage + 1)}
        className={cn(
          "inline-flex items-center justify-center h-9 w-9 rounded-md border border-border/40 text-sm transition-colors hover:bg-muted",
          currentPage >= totalPages && "pointer-events-none opacity-40"
        )}
        aria-disabled={currentPage >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}
