"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Star, ThumbsUp, CheckCircle, MessageSquare, Loader2 } from "lucide-react";

interface Review {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  verifiedPurchase: boolean;
  helpfulCount: number;
  createdAt: string;
  user: {
    fullName: string;
    image: string | null;
  };
}

interface ReviewStats {
  averageRating: number;
  totalCount: number;
  distribution: Record<number, number>;
}

interface ProductReviewsProps {
  productId: string;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { data: session } = useSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchReviews = useCallback(async () => {
    try {
      const res = await fetch(`/api/reviews?productId=${productId}`);
      const data = await res.json();
      if (res.ok) {
        setReviews(data.reviews);
        setStats(data.stats);
      }
    } catch {
      // Hata sessizce geçilir
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) {
      setMessage({ type: "error", text: "Lütfen bir puan seçin" });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, title, comment }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error });
        return;
      }

      setMessage({ type: "success", text: "Değerlendirmeniz kaydedildi!" });
      setShowForm(false);
      setRating(0);
      setTitle("");
      setComment("");
      fetchReviews();
    } catch {
      setMessage({ type: "error", text: "Bir hata oluştu" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mt-12">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <MessageSquare className="h-6 w-6" />
        Değerlendirmeler
        {stats && stats.totalCount > 0 && (
          <span className="text-muted-foreground text-lg font-normal">({stats.totalCount})</span>
        )}
      </h2>

      {/* İstatistikler */}
      {stats && stats.totalCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 mb-8 p-6 bg-muted/30 rounded-xl">
          {/* Ortalama */}
          <div className="text-center">
            <div className="text-5xl font-bold mb-1">{stats.averageRating}</div>
            <div className="flex justify-center gap-0.5 mb-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < Math.round(stats.averageRating)
                      ? "fill-yellow-500 text-yellow-500"
                      : "text-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">{stats.totalCount} değerlendirme</p>
          </div>

          {/* Dağılım */}
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution[star] || 0;
              const percent = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="text-sm w-6 text-right">{star}</span>
                  <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                  <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-500 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-8">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Mesaj */}
      {message && (
        <div
          className={`p-3 rounded-lg mb-4 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Değerlendirme Yaz Butonu */}
      {session?.user && !showForm && (
        <Button
          onClick={() => setShowForm(true)}
          variant="outline"
          className="mb-6"
        >
          <Star className="h-4 w-4 mr-2" />
          Değerlendirme Yaz
        </Button>
      )}

      {/* Değerlendirme Formu */}
      {showForm && (
        <form onSubmit={handleSubmit} className="border border-border/40 rounded-xl p-6 mb-8 bg-card">
          <h3 className="font-semibold mb-4">Değerlendirme Yaz</h3>

          {/* Yıldız Seçimi */}
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block">Puanınız *</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-7 w-7 ${
                      star <= (hoverRating || rating)
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="text-sm text-muted-foreground self-center ml-2">
                  {["", "Çok kötü", "Kötü", "Orta", "İyi", "Çok iyi"][rating]}
                </span>
              )}
            </div>
          </div>

          {/* Başlık */}
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block">Başlık</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Değerlendirmenize bir başlık verin"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              maxLength={100}
            />
          </div>

          {/* Yorum */}
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-2 block">Yorumunuz</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Ürün hakkındaki düşüncelerinizi paylaşın..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 min-h-[100px] resize-y"
              maxLength={1000}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Star className="h-4 w-4 mr-2" />
              )}
              Gönder
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setShowForm(false);
                setRating(0);
                setTitle("");
                setComment("");
              }}
            >
              İptal
            </Button>
          </div>
        </form>
      )}

      {/* Değerlendirme Listesi */}
      {reviews.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Henüz değerlendirme yapılmamış.</p>
          {session?.user && (
            <p className="text-sm mt-1">İlk değerlendirmeyi siz yapın!</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="border border-border/40 rounded-xl p-5 bg-card"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? "fill-yellow-500 text-yellow-500"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                    {review.title && (
                      <span className="font-semibold text-sm">{review.title}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{review.user.fullName}</span>
                    {review.verifiedPurchase && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-3 w-3" /> Doğrulanmış Alıcı
                      </span>
                    )}
                    <span>
                      {new Date(review.createdAt).toLocaleDateString("tr-TR")}
                    </span>
                  </div>
                </div>
              </div>

              {review.comment && (
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                  {review.comment}
                </p>
              )}

              {review.helpfulCount > 0 && (
                <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
                  <ThumbsUp className="h-3 w-3" />
                  {review.helpfulCount} kişi faydalı buldu
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
