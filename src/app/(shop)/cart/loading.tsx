import { Skeleton } from "@/components/ui/skeleton";

export default function CartLoading() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <Skeleton className="h-9 w-32 mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border border-border/40 rounded-xl">
              <Skeleton className="h-20 w-20 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
        <div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
