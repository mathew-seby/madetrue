import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/dashboard",
          "/dashboard/",
          "/api/",
          "/checkout",
          "/checkout/",
          "/cart",
          "/cart/",
          "/orders",
          "/orders/",
          "/profile",
          "/profile/",
          "/reset-password",
          "/reset-password/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

