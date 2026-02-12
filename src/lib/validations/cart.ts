import { z } from "zod";

// ==========================================
// CART VALIDATION SCHEMAS
// Sepete ekleme, güncelleme, silme işlemleri için.
// ==========================================

export const addToCartSchema = z.object({
  productId: z.string().cuid("Gecersiz urun ID"),
  customizationId: z.string().cuid().optional(),
  quantity: z.number().int().positive().default(1),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive("Miktar en az 1 olmali"),
});

export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
