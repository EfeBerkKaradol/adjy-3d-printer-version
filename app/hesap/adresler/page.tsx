"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Home,
  Building2,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

interface Address {
  id: string;
  title: string;
  type: "home" | "work";
  fullName: string;
  phone: string;
  address: string;
  city: string;
  district: string;
  postalCode: string;
  isDefault: boolean;
}

const initialAddresses: Address[] = [
  {
    id: "1",
    title: "Ev Adresim",
    type: "home",
    fullName: "Efe Berk Karadol",
    phone: "+90 532 *** ** 45",
    address: "Caferaga Mah. Moda Cad. No:42 D:5",
    city: "Istanbul",
    district: "Kadikoy",
    postalCode: "34710",
    isDefault: true,
  },
  {
    id: "2",
    title: "Is Yerim",
    type: "work",
    fullName: "Efe Berk Karadol",
    phone: "+90 532 *** ** 45",
    address: "Maslak Mah. Buyukdere Cad. No:123 Kat:8",
    city: "Istanbul",
    district: "Sariyer",
    postalCode: "34398",
    isDefault: false,
  },
];

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setAddresses(addresses.filter((a) => a.id !== id));
  };

  const handleSetDefault = (id: string) => {
    setAddresses(
      addresses.map((a) => ({
        ...a,
        isDefault: a.id === id,
      }))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Adreslerim
          </h1>
          <p className="text-muted-foreground mt-1">
            Teslimat adreslerinizi yonetin
          </p>
        </div>
        <Button
          variant="gradient"
          onClick={() => setShowForm(!showForm)}
          className="gap-2"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? "Vazgec" : "Yeni Adres"}
        </Button>
      </div>

      {/* Add Address Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass rounded-xl p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Yeni Adres Ekle
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Adres Basligi
                  </label>
                  <Input placeholder="Orn: Ev Adresim" className="bg-card" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Ad Soyad
                  </label>
                  <Input placeholder="Teslim alacak kisi" className="bg-card" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Telefon
                  </label>
                  <Input placeholder="+90 5XX XXX XX XX" className="bg-card" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Posta Kodu
                  </label>
                  <Input placeholder="34XXX" className="bg-card" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Il
                  </label>
                  <Input placeholder="Istanbul" className="bg-card" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Ilce
                  </label>
                  <Input placeholder="Kadikoy" className="bg-card" />
                </div>
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Acik Adres
                  </label>
                  <Input
                    placeholder="Mahalle, sokak, bina no, daire no..."
                    className="bg-card"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
                <Button variant="gradient">Adresi Kaydet</Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Iptal
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Address Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((addr, i) => (
          <motion.div
            key={addr.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`glass rounded-xl p-5 relative transition-all ${
              addr.isDefault ? "border-primary/40" : ""
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    addr.type === "home"
                      ? "bg-primary/10 text-primary"
                      : "bg-accent/10 text-accent"
                  }`}
                >
                  {addr.type === "home" ? (
                    <Home className="h-4.5 w-4.5" />
                  ) : (
                    <Building2 className="h-4.5 w-4.5" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{addr.title}</p>
                  {addr.isDefault && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-primary/10 text-primary border-primary/30 mt-0.5"
                    >
                      Varsayilan
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                  aria-label="Adresi duzenle"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(addr.id)}
                  className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  aria-label="Adresi sil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-1.5 text-sm">
              <p className="text-foreground">{addr.fullName}</p>
              <p className="text-muted-foreground">{addr.phone}</p>
              <p className="text-muted-foreground leading-relaxed">
                {addr.address}
                <br />
                {addr.district}, {addr.city} {addr.postalCode}
              </p>
            </div>

            {/* Actions */}
            {!addr.isDefault && (
              <button
                onClick={() => handleSetDefault(addr.id)}
                className="mt-4 flex items-center gap-1.5 text-xs text-primary hover:text-accent transition-colors font-medium"
              >
                <Check className="h-3 w-3" />
                Varsayilan Yap
              </button>
            )}
          </motion.div>
        ))}

        {/* Add Address Card */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => setShowForm(true)}
          className="glass rounded-xl p-8 flex flex-col items-center justify-center gap-3 border-dashed border-2 border-border hover:border-primary/40 transition-colors min-h-[200px] cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            Yeni Adres Ekle
          </p>
        </motion.button>
      </div>
    </div>
  );
}
