import { z } from "zod";

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Mevcut sifre gerekli"),
    newPassword: z
      .string()
      .min(8, "Sifre en az 8 karakter olmali")
      .regex(/[A-Z]/, "En az bir buyuk harf icermeli")
      .regex(/[0-9]/, "En az bir rakam icermeli"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Sifreler eslemiyor",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
