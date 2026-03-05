import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 bg-background text-center">
      <h1 className="text-9xl font-bold font-[var(--font-orbitron)] text-primary mb-4 tracking-widest">
        404
      </h1>
      <h2 className="text-3xl font-semibold mb-4">Sayfa Bulunamadı</h2>
      <p className="text-muted-foreground max-w-lg mb-8">
        Aradığınız sayfa silinmiş, adı değiştirilmiş veya geçici olarak kullanılamıyor olabilir.
        Lütfen bağlantıyı kontrol edin.
      </p>
      <Button asChild size="lg" className="rounded-full px-8">
        <Link href="/">Mağazaya Dön</Link>
      </Button>
    </div>
  );
}
