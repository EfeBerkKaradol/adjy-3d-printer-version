import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <Skeleton className="h-9 w-40 mb-2" />
      <Skeleton className="h-5 w-80 mb-8" />

      {/* Filters skeleton */}
      <div className="flex gap-3 mb-8">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-28" />
      </div>

      {/* Product grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square rounded-xl" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-6 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
