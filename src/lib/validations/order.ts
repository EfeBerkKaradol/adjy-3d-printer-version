import { z } from "zod";

// ==========================================
// ORDER VALIDATION SCHEMAS
// Sipariş oluşturma ve adres bilgileri için.
// ==========================================

export const shippingAddressSchema = z.object({
  addressLine: z.string().min(5, "Adres en az 5 karakter olmali"),
  city: z.string().min(2, "Sehir gerekli"),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("TR"),
});

export const createOrderSchema = z.object({
  shippingAddress: shippingAddressSchema,
  notes: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
