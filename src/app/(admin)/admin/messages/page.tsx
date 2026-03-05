"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Trash2, Mail, MailOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "react-hot-toast";

type ContactMessage = {
    id: string;
    name: string;
    email: string;
    subject: string;
    message: string;
    isRead: boolean;
    createdAt: string;
};

export default function AdminMessagesPage() {
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMessages = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/admin/messages");
            if (!res.ok) throw new Error("Mesajlar getirilemedi");
            const data = await res.json();
            setMessages(data.messages);
        } catch (error) {
            console.error(error);
            toast.error("Mesajlar yüklenirken bir hata oluştu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMessages();
    }, []);

    const handleMarkAsRead = async (id: string, currentStatus: boolean) => {
        try {
            const res = await fetch("/api/admin/messages", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, isRead: !currentStatus }),
            });

            if (!res.ok) throw new Error("Durum güncellenemedi");

            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === id ? { ...msg, isRead: !currentStatus } : msg
                )
            );
            toast.success("Mesaj durumu güncellendi");
        } catch (error) {
            console.error(error);
            toast.error("Mesaj güncellenirken bir hata oluştu");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Bu mesajı kalıcı olarak silmek istediğinize emin misiniz?")) return;

        try {
            const res = await fetch("/api/admin/messages", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, isDeleted: true }),
            });

            if (!res.ok) throw new Error("Mesaj silinemedi");

            setMessages((prev) => prev.filter((msg) => msg.id !== id));
            toast.success("Mesaj sistemden silindi");
        } catch (error) {
            console.error(error);
            toast.error("Mesaj silinirken bir hata oluştu");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold font-[var(--font-orbitron)] tracking-wider">
                        İletişim Mesajları
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Ziyaretçilerden gelen mesajları ve iletişim formlarını buradan yönetebilirsiniz.
                    </p>
                </div>
            </div>

            {messages.length === 0 ? (
                <Card className="flex flex-col items-center justify-center p-12 bg-card/50 border-dashed">
                    <MailOpen className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold">Henüz mesaj yok</h3>
                    <p className="text-muted-foreground mt-2 text-center max-w-sm">
                        İletişim formu üzerinden gönderilen yeni bir mesaj bulunamadı.
                    </p>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {messages.map((msg) => (
                        <Card
                            key={msg.id}
                            className={`transition-colors border-l-4 ${!msg.isRead ? 'border-l-primary bg-primary/5' : 'border-l-transparent bg-card/60'}`}
                        >
                            <CardHeader className="pb-3 flex flex-row items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        {!msg.isRead && (
                                            <span className="flex h-2 w-2 rounded-full bg-primary" />
                                        )}
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            {msg.subject}
                                        </CardTitle>
                                    </div>
                                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                                        <span className="font-medium text-foreground">{msg.name}</span>
                                        <span>&bull;</span>
                                        <a href={`mailto:${msg.email}`} className="hover:text-primary transition-colors hover:underline">
                                            {msg.email}
                                        </a>
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                    {format(new Date(msg.createdAt), "d MMM yyyy HH:mm", { locale: tr })}
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="p-4 bg-background/50 rounded-md text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                                    {msg.message}
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleMarkAsRead(msg.id, msg.isRead)}
                                    >
                                        {msg.isRead ? (
                                            <>
                                                <Mail className="h-4 w-4 mr-2" /> Okunmadı İşaretle
                                            </>
                                        ) : (
                                            <>
                                                <MailOpen className="h-4 w-4 mr-2" /> Okundu İşaretle
                                            </>
                                        )}
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDelete(msg.id)}
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
