import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="font-bold text-lg mb-3">ADJY</h3>
            <p className="text-sm text-muted-foreground">
              3D baski urunlerini ozellestir, AR ile goruntule ve satin al.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Urunler</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/products" className="hover:text-foreground">
                  Tum Urunler
                </Link>
              </li>
              <li>
                <Link
                  href="/products?featured=true"
                  className="hover:text-foreground"
                >
                  One Cikanlar
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Hesap</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-foreground">
                  Giris Yap
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-foreground">
                  Kayit Ol
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Destek</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/contact" className="hover:text-foreground">
                  Iletisim
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-foreground">
                  SSS
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ADJY. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
}
