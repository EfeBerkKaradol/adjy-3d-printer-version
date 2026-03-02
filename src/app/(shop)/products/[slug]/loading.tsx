import { Skeleton } from "@/components/ui/skeleton";

export default function ProductDetailLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="flex gap-2 mb-6">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Image */}
        <Skeleton className="aspect-square rounded-xl" />

        {/* Details */}
        <div className="space-y-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-2 mt-4">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-10 w-40 mt-6" />
          <Skeleton className="h-12 w-full mt-4" />
        </div>
      </div>
    </div>
  );
}
