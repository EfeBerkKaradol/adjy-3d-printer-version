import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Skeleton className="h-10 w-full mb-8" />
      <Skeleton className="h-9 w-32 mb-2" />
      <Skeleton className="h-5 w-64 mb-8" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}
