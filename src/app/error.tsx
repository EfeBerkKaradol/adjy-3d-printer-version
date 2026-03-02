"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <AlertTriangle className="h-20 w-20 text-destructive mb-6" />
      <h1 className="text-3xl font-bold mb-2">Bir hata oluştu</h1>
      <p className="text-muted-foreground mb-6 max-w-md">
        Beklenmeyen bir hata meydana geldi. Lütfen tekrar deneyin.
      </p>
      <Button onClick={reset}>Tekrar Dene</Button>
    </div>
  );
}
