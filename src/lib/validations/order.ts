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

/**
 * Fatura bilgileri.
 *
 * Bireysel faturada TC Kimlik No, kurumsalda ticaret unvanı +
 * vergi dairesi + VKN gerekiyor. Hangi alanın zorunlu olduğu
 * türe göre değiştiği için doğrulama superRefine ile yapılır;
 * aksi hâlde kurumsal bir siparişte eksik vergi numarası
 * sunucuya kadar geliyordu.
 */
export const invoiceSchema = z
  .object({
    type: z.enum(["BIREYSEL", "KURUMSAL"]).default("BIREYSEL"),
    identityNumber: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    taxOffice: z.string().optional().nullable(),
    taxNumber: z.string().optional().nullable(),
  })
  .superRefine((v, ctx) => {
    if (v.type === "KURUMSAL") {
      if (!v.title || v.title.trim().length < 2) {
        ctx.addIssue({ code: "custom", path: ["title"], message: "Ticaret unvanı gerekli" });
      }
      if (!v.taxOffice || v.taxOffice.trim().length < 2) {
        ctx.addIssue({ code: "custom", path: ["taxOffice"], message: "Vergi dairesi gerekli" });
      }
      if (!v.taxNumber || !/^\d{10}$/.test(v.taxNumber.trim())) {
        ctx.addIssue({ code: "custom", path: ["taxNumber"], message: "Vergi numarası 10 haneli olmalı" });
      }
    } else if (v.identityNumber && !/^\d{11}$/.test(v.identityNumber.trim())) {
      ctx.addIssue({ code: "custom", path: ["identityNumber"], message: "TC Kimlik No 11 haneli olmalı" });
    }
  });

/**
 * Hesap açmadan sipariş veren müşteri.
 * Siparişin ulaşabilmesi için e-posta ve telefon şart.
 */
export const guestSchema = z.object({
  fullName: z.string().min(2, "Ad soyad gerekli"),
  email: z.email("Geçerli bir e-posta girin"),
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
  /** Oturum yoksa zorunlu — sunucu tarafında kontrol edilir */
  guest: guestSchema.optional(),
  invoice: invoiceSchema.optional(),
  shippingAddress: shippingAddressSchema,
  billingAddress: billingAddressSchema.optional(),
  useSameAddress: z.boolean().default(true),
  shippingMethod: z.string().min(1, "Kargo yöntemi seçiniz"),
  notes: z.string().optional(),
  items: z.array(cartItemSchema).min(1, "Sepetiniz boş"),
  couponCode: z.string().optional(),
});

export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type GuestInput = z.infer<typeof guestSchema>;
export type ShippingAddressInput = z.infer<typeof shippingAddressSchema>;
export type BillingAddressInput = z.infer<typeof billingAddressSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
