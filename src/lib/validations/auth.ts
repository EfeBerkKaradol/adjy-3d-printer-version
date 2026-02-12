import { z } from "zod";

// ==========================================
// AUTH VALIDATION SCHEMAS
// Register ve Login formlarında kullanılacak.
// Hem frontend (React Hook Form) hem de backend (API)
// tarafında aynı schema kullanılabilir.
// ==========================================

export const registerSchema = z
  .object({
    email: z.string().email("Gecerli bir email adresi giriniz"),
    password: z
      .string()
      .min(8, "Sifre en az 8 karakter olmali")
      .regex(/[A-Z]/, "En az bir buyuk harf icermeli")
      .regex(/[0-9]/, "En az bir rakam icermeli"),
    confirmPassword: z.string(),
    fullName: z.string().min(2, "Isim en az 2 karakter olmali"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Sifreler eslesmiyor",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Gecerli bir email adresi giriniz"),
  password: z.string().min(1, "Sifre gerekli"),
});

export type LoginInput = z.infer<typeof loginSchema>;
