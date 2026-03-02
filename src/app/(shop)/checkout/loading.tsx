import { Skeleton } from "@/components/ui/skeleton";

export default function CheckoutLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <Skeleton className="h-9 w-28 mb-6" />
      <Skeleton className="h-12 w-full max-w-lg mb-8" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Skeleton className="h-80 rounded-xl" />
        </div>
        <div>
          <Skeleton className="h-60 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
