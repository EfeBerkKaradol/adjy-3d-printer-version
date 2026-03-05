"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Analytics veya log servisine hatayı gönder
        console.error("Uygulama Hatası:", error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mb-6" />
            <h1 className="text-4xl font-bold font-[var(--font-orbitron)] tracking-wider mb-2">
                Bir Hata Oluştu
            </h1>
            <p className="text-muted-foreground mb-8 max-w-md">
                Üzgünüz, beklenmeyen bir sunucu hatasıyla karşılaştık. Lütfen sayfayı yenilemeyi veya daha sonra tekrar denemeyi unutmayın.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => reset()} variant="default">
                    Tekrar Dene
                </Button>
                <Button asChild variant="outline">
                    <Link href="/">Ana Sayfaya Dön</Link>
                </Button>
            </div>
        </div>
    );
}
