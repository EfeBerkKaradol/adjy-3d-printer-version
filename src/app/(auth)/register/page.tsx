"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterInput } from "@/lib/validations/auth";
import { registerUser } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, Eye, EyeOff } from "lucide-react";

// ==========================================
// KAYIT SAYFASI
//
// React Hook Form + Zod validasyon kullanır.
// Form submit edildiğinde /api/auth/register'a POST atar.
//
// Java karşılığı:
//   @PostMapping("/auth/register")
//   public ResponseEntity<?> register(@Valid @RequestBody RegisterDTO dto)
//
// Burada fark:
//   Java'da validasyon @Valid + DTO ile backend'de yapılır.
//   React'te validasyon zodResolver ile frontend'de de yapılır.
//   Böylece kullanıcı submit etmeden hataları görür.
// ==========================================

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // ==========================================
  // React Hook Form kurulumu
  //
  // useForm hook'u:
  //   - zodResolver(registerSchema) → Zod schema'yı form'a bağlar
  //   - register → input'lara bağlanır (Java'da @ModelAttribute gibi)
  //   - handleSubmit → form submit handler
  //   - formState.errors → validasyon hataları
  //   - formState.isSubmitting → loading durumu
  //
  // Java'daki karşılığı:
  //   @ModelAttribute ile BindingResult errors gibi düşün.
  // ==========================================
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  // ==========================================
  // [GÖREV 26]: onSubmit fonksiyonunu tamamla
  //
  // Bu fonksiyon form başarıyla doğrulandıktan sonra çağrılır.
  //
  // İpucu:
  //   1. setServerError(null) ile önceki hatayı temizle
  //   2. try-catch bloğu içinde:
  //      a. await registerUser(data) çağır
  //      b. Başarılıysa router.push("/login") ile login sayfasına yönlendir
  //   3. catch bloğunda:
  //      a. error'u Error olarak yakala
  //      b. setServerError(error.message) ile hatayı göster
  //
  // Java karşılığı:
  //   try {
  //     authService.register(dto);
  //     return "redirect:/login";
  //   } catch (Exception e) {
  //     model.addAttribute("error", e.getMessage());
  //     return "register";
  //   }
  // ==========================================
  async function onSubmit(data: RegisterInput) {
    setServerError(null);
    try {
      await registerUser(data);
      router.push("/login");
    } catch (error) {
      if (error instanceof Error) {
        setServerError(error.message);
      } else {
        setServerError("Kayıt sırasında bir hata oluştu");
      }
    }
  }

  return (
    <div className="container mx-auto max-w-md px-4 py-24">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Kayıt Ol</CardTitle>
          <p className="text-sm text-muted-foreground">
            Hesap oluşturarak 3D ürünleri özelleştirmeye başlayın
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

            {/* Ad Soyad */}
            <div className="space-y-2">
              <Label htmlFor="fullName">Ad Soyad</Label>
              <Input
                id="fullName"
                placeholder="Adınız Soyadınız"
                {...register("fullName")}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>

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
              <Label htmlFor="password">Şifre</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="En az 8 karakter"
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

            {/* Şifre Tekrar */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Şifreyi tekrar girin"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-4 pt-6">
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || googleLoading}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Kayıt yapılıyor...
                </>
              ) : (
                "Kayıt Ol"
              )}
            </Button>

            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">veya</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={isSubmitting || googleLoading}
              onClick={async () => {
                setGoogleLoading(true);
                setServerError(null);
                try {
                  await signIn("google", { callbackUrl: "/" });
                } catch {
                  setServerError("Google ile kayıt sırasında bir hata oluştu");
                  setGoogleLoading(false);
                }
              }}
            >
              {googleLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Google ile Devam Et
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Zaten hesabınız var mı?{" "}
              <Link
                href="/login"
                className="text-primary font-medium hover:underline"
              >
                Giriş Yap
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
