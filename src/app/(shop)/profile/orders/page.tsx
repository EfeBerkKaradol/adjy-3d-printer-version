"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Loader2, User, Package, MapPin, Heart, Lock } from "lucide-react";
import Link from "next/link";

interface OrderItem {
    id?: string;
    productName: string;
    quantity: number;
    unitPrice: string;
    lineTotal: string;
    printStatus: string;
}

interface Order {
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    grandTotal: string;
    createdAt: string;
    items: OrderItem[];
}

const statusLabels: Record<string, string> = {
    PENDING: "Beklemede",
    CONFIRMED: "Onaylandı",
    PROCESSING: "İşleniyor",
    PRINTING: "Yazdırılıyor",
    QUALITY_CHECK: "Kalite Kontrol",
    PACKAGING: "Paketleniyor",
    SHIPPED: "Kargoya Verildi",
    DELIVERED: "Teslim Edildi",
    CANCELLED: "İptal Edildi",
};

const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    CONFIRMED: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    PROCESSING: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    PRINTING: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    SHIPPED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    DELIVERED: "bg-green-500/10 text-green-500 border-green-500/20",
    CANCELLED: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function OrdersPage() {
    const { status } = useSession();
    const router = useRouter();
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (status === "unauthenticated") {
            router.push("/login");
            return;
        }
        if (status === "authenticated") {
            fetchOrders();
        }
    }, [status, router]);

    async function fetchOrders() {
        try {
            const res = await fetch("/api/orders");
            if (res.ok) {
                const data = await res.json();
                setOrders(data.orders);
            }
        } catch (error) {
            console.error("Orders fetch error:", error);
        } finally {
            setLoading(false);
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
            <Tabs defaultValue="orders" className="mb-8">
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
                <h1 className="text-3xl font-bold tracking-tight">Siparişlerim</h1>
                <p className="text-muted-foreground mt-1">Satın alım geçmişinizi görüntüleyin</p>
            </div>

            {orders.length === 0 ? (
                <Card>
                    <CardContent className="py-16 text-center">
                        <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                        <p className="text-muted-foreground">Henüz siparişiniz bulunmuyor</p>
                        <Link href="/products" className="text-primary text-sm hover:underline mt-2 inline-block">
                            Ürünleri keşfet →
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {orders.map((order) => (
                        <Card key={order.id}>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div>
                                        <CardTitle className="text-base font-mono">#{order.orderNumber}</CardTitle>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {new Date(order.createdAt).toLocaleDateString("tr-TR", {
                                                year: "numeric",
                                                month: "long",
                                                day: "numeric",
                                            })}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className={statusColors[order.status] || ""}>
                                            {statusLabels[order.status] || order.status}
                                        </Badge>
                                        <span className="font-semibold text-sm">
                                            ₺{Number(order.grandTotal).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between text-sm py-1.5 border-t border-border/40 first:border-0">
                                            <span className="text-muted-foreground">
                                                {item.productName} <span className="text-xs">×{item.quantity}</span>
                                            </span>
                                            <span>₺{Number(item.lineTotal).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
