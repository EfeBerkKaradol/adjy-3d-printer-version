"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, Eye, EyeOff } from "lucide-react";

// ==========================================
// GİRİŞ SAYFASI
//
// NextAuth.js signIn fonksiyonu ile giriş yapar.
// signIn("credentials", { ... }) çağrısı NextAuth'un
// authorize fonksiyonunu tetikler.
//
// Java karşılığı:
//   Spring Security'de:
//   http.formLogin()
//       .loginPage("/login")
//       .defaultSuccessUrl("/")
//
// React'te:
//   signIn("credentials", { email, password, redirect: false })
//   → sonuç { ok: true/false, error: "..." }
// ==========================================

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  // ==========================================
  // [GÖREV 27]: onSubmit fonksiyonunu tamamla
  //
  // NextAuth signIn fonksiyonu ile giriş yapar.
  //
  // İpucu:
  //   1. setServerError(null) ile önceki hatayı temizle
  //   2. try-catch bloğu içinde:
  //
  //      a. Önce next-auth/react'ten signIn'i import et:
  //         Dosyanın en üstüne şunu ekle:
  //         import { signIn } from "next-auth/react";
  //
  //      b. signIn çağır:
  //         const result = await signIn("credentials", {
  //           email: data.email,
  //           password: data.password,
  //           redirect: false,   // ← sayfa yenilemeden sonuç al
  //         });
  //
  //      c. result.error varsa setServerError ile hatayı göster:
  //         if (result?.error) {
  //           setServerError("Email veya sifre hatali");
  //           return;
  //         }
  //
  //      d. Başarılıysa ana sayfaya yönlendir:
  //         router.push("/");
  //         router.refresh();  // ← session'ı yenile (navbar güncellenir)
  //
  //   3. catch bloğunda genel hata mesajı göster
  //
  // Java karşılığı:
  //   Authentication auth = authManager.authenticate(
  //     new UsernamePasswordAuthenticationToken(email, password)
  //   );
  //   SecurityContextHolder.getContext().setAuthentication(auth);
  //   return "redirect:/";
  // ==========================================
  async function onSubmit(data: LoginInput) {
    setServerError(null);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setServerError("E-posta veya şifre hatalı");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setServerError("Giriş sırasında bir hata oluştu");
    }
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-24">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Giriş Yap</CardTitle>
          <p className="text-sm text-muted-foreground">
            Hesabınıza giriş yaparak devam edin
          </p>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {/* Sunucu Hatası */}
            {serverError && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {serverError}
              </div>
            )}

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Şifre */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Şifre</Label>
                <Link
                  href="#"
                  className="text-xs text-muted-foreground hover:text-primary"
                >
                  Şifremi Unuttum
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Şifrenizi girin"
                  {...register("password")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-6">
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                "Giriş Yap"
              )}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Hesabınız yok mu?{" "}
              <Link
                href="/register"
                className="text-primary font-medium hover:underline"
              >
                Kayıt Ol
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
