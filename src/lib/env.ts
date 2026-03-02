import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  REDIS_URL: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
});

export function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Environment validation failed:");
    result.error.issues.forEach((issue) => {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    });
    if (process.env.NODE_ENV === "production") {
      throw new Error("Missing required environment variables");
    }
  }
}
