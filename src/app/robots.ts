import { MetadataRoute } from "next";
import { getAbsoluteUrl } from "@/lib/url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/", "/checkout/", "/profile/", "/cart"],
      },
    ],
    sitemap: `${getAbsoluteUrl()}/sitemap.xml`,
  };
}
