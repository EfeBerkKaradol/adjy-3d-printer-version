import { z } from "zod";

// ==========================================
// AUTH VALIDATION SCHEMAS
// Register ve Login formlarında kullanılacak.
// Hem frontend (React Hook Form) hem de backend (API)
// tarafında aynı schema kullanılabilir.
// ==========================================

const baseAuthSchema = z.object({
  email: z.string().email("Geçerli bir e-posta adresi giriniz"),
  password: z
    .string()
    .min(8, "Şifre en az 8 karakter olmalı"),
});

export const registerSchema = baseAuthSchema
  .extend({
    password: baseAuthSchema.shape.password
      .regex(/[A-Z]/, "En az bir büyük harf içermeli")
      .regex(/[0-9]/, "En az bir rakam içermeli"),
    confirmPassword: z.string(),
    fullName: z.string().min(2, "İsim en az 2 karakter olmalı"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Şifreler eşleşmiyor",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = baseAuthSchema.extend({
  password: z.string().min(1, "Şifre gerekli"),
});

export type LoginInput = z.infer<typeof loginSchema>;
