import { z } from "zod";

export const createCouponSchema = z.object({
  code: z
    .string()
    .min(3, "Kupon kodu en az 3 karakter olmali")
    .max(20, "Kupon kodu en fazla 20 karakter olmali")
    .regex(/^[A-Z0-9_-]+$/i, "Kupon kodu yalnizca harf, rakam, tire ve alt cizgi icermeli"),
  description: z.string().optional(),
  type: z.enum(["PERCENTAGE", "FIXED"]),
  value: z.number().positive("Deger pozitif olmali"),
  minOrderAmount: z.number().positive().optional().nullable(),
  maxUses: z.number().int().positive().optional().nullable(),
  validFrom: z.string().optional(),
  validTo: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1, "Kupon kodu gerekli"),
  orderTotal: z.number().positive("Siparis tutari gerekli"),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
