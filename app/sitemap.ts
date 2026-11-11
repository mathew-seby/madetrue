import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/utils/constants";
import { getProducts, getSellers } from "@/lib/supabase/client";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Core static public pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/refund-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/shipping-policy`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Dynamic product routes (only public, approved, non-hidden products)
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const products = await getProducts();
    productRoutes = products
      .filter((p) => p.is_available && !p.is_hidden)
      .map((p) => ({
        url: `${SITE_URL}/products/${p.id}`,
        lastModified: p.created_at ? new Date(p.created_at) : now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
  } catch (err) {
    console.error("Failed to load products for sitemap", err);
  }

  // Dynamic seller routes (only verified sellers)
  let sellerRoutes: MetadataRoute.Sitemap = [];
  try {
    const sellers = await getSellers();
    sellerRoutes = sellers
      .filter((s) => s.is_verified)
      .map((s) => ({
        url: `${SITE_URL}/sellers/${s.id}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.8,
      }));
  } catch (err) {
    console.error("Failed to load sellers for sitemap", err);
  }

  return [...staticRoutes, ...productRoutes, ...sellerRoutes];
}

