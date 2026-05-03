import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          <div>
            <h3 className="font-[family-name:var(--font-orbitron)] font-extrabold text-lg tracking-widest mb-3">ADJY</h3>
            <p className="text-sm text-muted-foreground">
              3D baskı ürünlerini özelleştir, AR ile görüntüle ve satın al.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Ürünler</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/products" className="hover:text-foreground">
                  Tüm Ürünler
                </Link>
              </li>
              <li>
                <Link
                  href="/products?featured=true"
                  className="hover:text-foreground"
                >
                  Öne Çıkanlar
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Hesap</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-foreground">
                  Giriş Yap
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-foreground">
                  Kayıt Ol
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Destek</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/about" className="hover:text-foreground">
                  Hakkımızda
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-foreground">
                  İletişim
                </Link>
              </li>
              <li>
                <Link href="/faq" className="hover:text-foreground">
                  SSS
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-3">Politikalar</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/mesafeli-satis-sozlesmesi" className="hover:text-foreground">
                  Mesafeli Satış Sözleşmesi
                </Link>
              </li>
              <li>
                <Link href="/on-bilgilendirme" className="hover:text-foreground">
                  Ön Bilgilendirme Formu
                </Link>
              </li>
              <li>
                <Link href="/iade-politikasi" className="hover:text-foreground">
                  İade ve İptal Politikası
                </Link>
              </li>
              <li>
                <Link href="/teslimat-politikasi" className="hover:text-foreground">
                  Teslimat Politikası
                </Link>
              </li>
              <li>
                <Link href="/kvkk" className="hover:text-foreground">
                  KVKK Aydınlatma Metni
                </Link>
              </li>
              <li>
                <Link href="/cerez-politikasi" className="hover:text-foreground">
                  Çerez Politikası
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground">
                  Gizlilik Politikası
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground">
                  Kullanım Şartları
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t pt-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} <span className="font-[family-name:var(--font-orbitron)] font-bold tracking-wider">ADJY</span>. Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  );
}
