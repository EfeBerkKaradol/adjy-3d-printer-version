import { z } from "zod";

export const contactSchema = z.object({
  name: z.string().min(2, "Ad en az 2 karakter olmali"),
  email: z.string().email("Gecerli bir e-posta girin"),
  subject: z.string().min(3, "Konu en az 3 karakter olmali"),
  message: z.string().min(10, "Mesaj en az 10 karakter olmali").max(2000, "Mesaj en fazla 2000 karakter olabilir"),
});

export type ContactInput = z.infer<typeof contactSchema>;
