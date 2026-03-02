"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  User,
  Package,
  MapPin,
  Heart,
  Plus,
  Trash2,
  Star,
  X,
  Phone,
  Lock,
} from "lucide-react";
import Link from "next/link";

interface Address {
  id: string;
  title: string;
  fullName: string | null;
  phone: string | null;
  addressLine: string;
  city: string;
  state: string | null;
  country: string;
  postalCode: string | null;
  isDefault: boolean;
  type: string;
}

export default function AddressesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated") {
      fetchAddresses();
    }
  }, [status, router]);

  async function fetchAddresses() {
    try {
      const res = await fetch("/api/addresses");
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses);
      }
    } catch (error) {
      console.error("Addresses fetch error:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAddress() {
    if (!title || !addressLine || !city) return;
    setSaving(true);
    try {
      const res = await fetch("/api/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          fullName: fullName || null,
          phone: phone || null,
          addressLine,
          city,
          state,
          postalCode,
          isDefault,
        }),
      });
      if (res.ok) {
        resetForm();
        fetchAddresses();
      }
    } catch (error) {
      console.error("Add address error:", error);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/addresses?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setAddresses((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (error) {
      console.error("Delete address error:", error);
    }
  }

  function resetForm() {
    setTitle("");
    setFullName("");
    setPhone("");
    setAddressLine("");
    setCity("");
    setState("");
    setPostalCode("");
    setIsDefault(false);
    setShowForm(false);
  }

  function handleShowForm() {
    setShowForm(true);
    // Kullanıcı adını otomatik doldur
    if (session?.user?.name) {
      setFullName(session.user.name);
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
      <Tabs defaultValue="addresses" className="mb-8">
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

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Adreslerim</h1>
          <p className="text-muted-foreground mt-1">
            Kayıtlı teslimat adreslerinizi yönetin
          </p>
        </div>
        {!showForm && (
          <Button onClick={handleShowForm} className="gap-2">
            <Plus className="h-4 w-4" /> Yeni Adres
          </Button>
        )}
      </div>

      {/* Yeni Adres Formu */}
      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Yeni Adres Ekle</CardTitle>
              <Button variant="ghost" size="icon" onClick={resetForm}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Adres Başlığı *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ev, İş, vb."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ad Soyad</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ad Soyad"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="05XX XXX XX XX"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Adres *</Label>
              <Input
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                placeholder="Mahalle, sokak, bina no"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Şehir *</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="İstanbul"
                />
              </div>
              <div className="space-y-2">
                <Label>İlçe</Label>
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="Kadıköy"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Posta Kodu</Label>
              <Input
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="34000"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isDefault" className="text-sm cursor-pointer">
                Varsayılan adres olarak ayarla
              </Label>
            </div>

            <Button
              onClick={handleAddAddress}
              disabled={saving}
              className="w-full gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Ekleniyor...
                </>
              ) : (
                "Adres Ekle"
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Adres Listesi */}
      {addresses.length === 0 && !showForm ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MapPin className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              Henüz kayıtlı adresiniz yok
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Ödeme sırasında kaydettiğiniz adresler burada görünür.
            </p>
            <Button
              variant="link"
              onClick={handleShowForm}
              className="mt-2"
            >
              İlk adresinizi ekleyin →
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardContent className="py-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{address.title}</h3>
                      {address.isDefault && (
                        <Badge
                          variant="outline"
                          className="text-xs gap-1"
                        >
                          <Star className="h-3 w-3" /> Varsayılan
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {address.type === "BILLING"
                          ? "Fatura"
                          : "Teslimat"}
                      </Badge>
                    </div>
                    {address.fullName && (
                      <p className="text-sm font-medium">
                        {address.fullName}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {address.addressLine}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {address.state && `${address.state}, `}
                      {address.city}
                      {address.postalCode && ` - ${address.postalCode}`}
                    </p>
                    {address.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {address.phone}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(address.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
