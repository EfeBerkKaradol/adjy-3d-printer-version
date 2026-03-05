import { Skeleton } from "@/components/ui/skeleton";

export default function ShopLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl animate-pulse">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-1/4 space-y-4 hidden md:block">
          <Skeleton className="h-[40px] w-full rounded-md" />
          <Skeleton className="h-[300px] w-full rounded-md" />
        </div>
        <div className="flex-1 space-y-6">
          <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-[200px]" />
            <Skeleton className="h-10 w-[120px]" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-[250px] w-full rounded-lg" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
