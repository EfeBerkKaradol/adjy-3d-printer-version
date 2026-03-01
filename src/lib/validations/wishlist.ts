import { z } from "zod";

export const toggleWishlistSchema = z.object({
  productId: z.string().min(1, "Ürün ID gerekli"),
});

export type ToggleWishlistInput = z.infer<typeof toggleWishlistSchema>;
