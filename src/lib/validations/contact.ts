import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(2, "İsim en az 2 karakter olmalıdır").max(100),
  email: z.string().email("Geçerli bir e-posta adresi giriniz").max(200),
  subject: z.string().min(3, "Konu en az 3 karakter olmalıdır").max(200),
  message: z
    .string()
    .min(10, "Mesajınız en az 10 karakter olmalıdır")
    .max(5000, "Mesajınız en fazla 5000 karakter olabilir"),
  /** Bot tuzağı: gerçek ziyaretçi görmez, boş bırakır */
  website: z.string().max(200).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;
