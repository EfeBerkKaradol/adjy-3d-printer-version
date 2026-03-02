import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <FileQuestion className="h-20 w-20 text-muted-foreground mb-6" />
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-lg text-muted-foreground mb-6">
        Aradığınız sayfa bulunamadı
      </p>
      <Button asChild>
        <Link href="/">Ana Sayfaya Dön</Link>
      </Button>
    </div>
  );
}
