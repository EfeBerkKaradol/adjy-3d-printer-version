"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Package, MapPin, Heart, Save, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [fullName, setFullName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
            return;
        }
        if (status === "authenticated") {
            fetchProfile();
        }
    }, [status, router]);

    async function fetchProfile() {
        try {
            const res = await fetch("/api/profile");
            if (res.ok) {
                const data = await res.json();
                setFullName(data.user.fullName || "");
                setPhone(data.user.phone || "");
                setEmail(data.user.email || "");
            }
        } catch (error) {
            console.error("Profile fetch error:", error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        setSaved(false);
        try {
            const res = await fetch("/api/profile", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fullName, phone }),
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (error) {
            console.error("Profile save error:", error);
        } finally {
            setSaving(false);
        }
    }

    if (status === "loading" || loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="container mx-auto max-w-3xl px-4 py-12">
            {/* Navigation Tabs */}
            <Tabs defaultValue="profile" className="mb-8">
                <TabsList className="grid w-full grid-cols-4">
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
                </TabsList>
            </Tabs>

            {/* Profile Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Profilim</h1>
                <p className="text-muted-foreground mt-1">Kişisel bilgilerinizi görüntüleyin ve güncelleyin</p>
            </div>

            {/* Profile Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5" /> Kişisel Bilgiler
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Full Name */}
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Ad Soyad</Label>
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Adınız Soyadınız"
                        />
                    </div>

                    {/* Email (read-only) */}
                    <div className="space-y-2">
                        <Label htmlFor="email">E-posta</Label>
                        <Input
                            id="email"
                            value={email}
                            disabled
                            className="opacity-60"
                        />
                        <p className="text-xs text-muted-foreground">E-posta adresi değiştirilemez</p>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <Label htmlFor="phone">Telefon</Label>
                        <Input
                            id="phone"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+90 555 123 4567"
                        />
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-3 pt-4">
                        <Button onClick={handleSave} disabled={saving} className="gap-2">
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Kaydediliyor...
                                </>
                            ) : saved ? (
                                <>
                                    <CheckCircle className="h-4 w-4" /> Kaydedildi
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" /> Kaydet
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
