import { z } from "zod";

// ==========================================
// ORDER VALIDATION SCHEMAS
// Sipariş oluşturma, adres ve checkout için.
// ==========================================

export const shippingAddressSchema = z.object({
  fullName: z.string().min(2, "Ad soyad en az 2 karakter olmalı"),
  addressLine: z.string().min(5, "Adres en az 5 karakter olmalı"),
  city: z.string().min(2, "Şehir gerekli"),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("TR"),
  phone: z.string().min(10, "Telefon numarası gerekli"),
});

export const billingAddressSchema = z.object({
  fullName: z.string().min(2, "Ad soyad en az 2 karakter olmalı"),
  addressLine: z.string().min(5, "Adres en az 5 karakter olmalı"),
  city: z.string().min(2, "Şehir gerekli"),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().default("TR"),
  identityNumber: z.string().min(11, "TC Kimlik No 11 haneli olmalı").max(11).optional(),
});

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string().min(1),
  quantity: z.number().int().min(1),
  calculatedPrice: z.number().min(0),
  customizationId: z.string().optional().nullable(),
  customParams: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const createOrderSchema = z.object({
  shippingAddress: shippingAddressSchema,
  billingAddress: billingAddressSchema.optional(),
  useSameAddress: z.boolean().default(true),
  shippingMethod: z.string().min(1, "Kargo yöntemi seçiniz"),
  notes: z.string().optional(),
  items: z.array(cartItemSchema).min(1, "Sepetiniz boş"),
});

export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;
export type BillingAddressInput = z.infer<typeof billingAddressSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
