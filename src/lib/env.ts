import { z } from "zod";

// Temel (her ortamda gerekli)
const baseSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  REDIS_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
});

// Production'da gerekli
const productionSchema = baseSchema.extend({
  REDIS_URL: z.string().min(1, "REDIS_URL is required in production"),
  NEXT_PUBLIC_APP_URL: z.string().min(1, "NEXT_PUBLIC_APP_URL is required in production"),
  // Ödeme entegrasyonu opsiyonel (test ortamında olmayabilir)
  IYZICO_API_KEY: z.string().optional(),
  IYZICO_SECRET_KEY: z.string().optional(),
  IYZICO_BASE_URL: z.string().optional(),
});

export function validateEnv() {
  const isProduction = process.env.NODE_ENV === "production";
  const schema = isProduction ? productionSchema : baseSchema;

  const result = schema.safeParse(process.env);
  if (!result.success) {
    console.error("Environment validation failed:");
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
    if (isProduction) {
      throw new Error("Missing required environment variables");
    }
  }

  // SMTP çift kontrol (uyarı seviyesinde)
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if ((smtpUser && !smtpPass) || (!smtpUser && smtpPass)) {
    console.warn("SMTP configuration warning: SMTP_USER ve SMTP_PASS birlikte ayarlanmalidir");
  }
}
