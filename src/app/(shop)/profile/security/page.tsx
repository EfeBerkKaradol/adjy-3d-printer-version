"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, type ChangePasswordInput } from "@/lib/validations/password";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Package, MapPin, Heart, Lock, Shield } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

export default function SecurityPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          setHasPassword(data.user?.hasPassword ?? false);
        })
        .catch(() => setHasPassword(false))
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  const onSubmit = async (data: ChangePasswordInput) => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        toast.success("Sifre basariyla guncellendi");
        reset();
      } else {
        toast.error(result.error || "Sifre degistirilemedi");
      }
    } catch {
      toast.error("Bir hata olustu");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <Tabs defaultValue="security" className="mb-8">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" asChild>
            <Link href="/profile" className="flex items-center gap-2">
              <User className="h-4 w-4" /> Profil
            </Link>
          </TabsTrigger>
          <TabsTrigger value="orders" asChild>
            <Link href="/profile/orders" className="flex items-center gap-2">
              <Package className="h-4 w-4" /> Siparisler
            </Link>
          </TabsTrigger>
          <TabsTrigger value="favorites" asChild>
            <Link href="/profile/favorites" className="flex items-center gap-2">
              <Heart className="h-4 w-4" /> Favoriler
            </Link>
          </TabsTrigger>
          <TabsTrigger value="addresses" asChild>
            <Link href="/profile/addresses" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Adresler
            </Link>
          </TabsTrigger>
          <TabsTrigger value="security" asChild>
            <Link href="/profile/security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" /> Guvenlik
            </Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Guvenlik</h1>
        <p className="text-muted-foreground mt-1">Sifre ve hesap guvenlik ayarlari</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5" /> Sifre Degistir
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasPassword === false ? (
            <div className="text-center py-8 text-muted-foreground">
              <Lock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Bu hesap Google ile olusturulmus.</p>
              <p className="text-sm mt-1">OAuth hesaplarinda sifre degisikligi yapilamaz.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mevcut Sifre</Label>
                <Input id="currentPassword" type="password" {...register("currentPassword")} />
                {errors.currentPassword && (
                  <p className="text-xs text-red-500">{errors.currentPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Yeni Sifre</Label>
                <Input id="newPassword" type="password" {...register("newPassword")} />
                {errors.newPassword && (
                  <p className="text-xs text-red-500">{errors.newPassword.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">Yeni Sifre (Tekrar)</Label>
                <Input id="confirmNewPassword" type="password" {...register("confirmNewPassword")} />
                {errors.confirmNewPassword && (
                  <p className="text-xs text-red-500">{errors.confirmNewPassword.message}</p>
                )}
              </div>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                Sifreyi Guncelle
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
