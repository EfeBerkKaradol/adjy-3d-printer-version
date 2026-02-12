import { z } from "zod";

// ==========================================
// PRODUCT VALIDATION SCHEMAS
// Bu dosya API route'larında gelen verileri
// doğrulamak (validate) için kullanılır.
// Zod ile schema tanımlarsın, gelen datayı parse edersin.
// ==========================================

/**
 * Ürün listeleme sayfası için query parametreleri.
 * Örnek: /api/products?category=ev-dekorasyon&featured=true&page=1
 */
export const productQuerySchema = z.object({
  category: z.string().optional(),
  featured: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().positive().optional(),
  maxPrice: z.coerce.number().positive().optional(),
  sort: z.enum(["price_asc", "price_desc", "newest", "popular"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(12),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;

/**
 * Yeni ürün oluşturma için schema.
 * Admin panelinde kullanılacak.
 */
export const createProductSchema = z.object({
  name: z.string().min(3, "Urun adi en az 3 karakter olmali"),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Gecersiz slug formati"),
  description: z.string().optional(),
  basePrice: z.number().positive("Fiyat pozitif olmali"),
  categoryId: z.string().cuid("Gecersiz kategori ID"),
  materialType: z.string().optional(),
  printTimeEst: z.number().int().positive().optional(),
});

export type CreateProduct = z.infer<typeof createProductSchema>;
