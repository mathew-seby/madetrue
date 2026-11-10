import Hero from "@/components/home/Hero";
import FeaturedCategories from "@/components/home/FeaturedCategories";
import MeetMakers from "@/components/home/MeetMakers";
import NearbySellers from "@/components/home/NearbySellers";
import TrendingProducts from "@/components/home/TrendingProducts";
import CTA from "@/components/home/CTA";
import { getCategories, getSellers, getProducts } from "@/lib/supabase/client";
import { Seller } from "@/types";

export default async function Home() {
  // Parallel fetch on the server: eliminates waterfalls and client loading flicker
  const [categories, sellers, products] = await Promise.all([
    getCategories(),
    getSellers(),
    getProducts(),
  ]);

  const sellerMap = sellers.reduce((acc, curr) => {
    acc[curr.id] = curr;
    return acc;
  }, {} as { [key: string]: Seller });

  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      <FeaturedCategories categories={categories} />
      <MeetMakers makers={sellers} />
      <NearbySellers initialSellers={sellers} />
      <TrendingProducts initialProducts={products} initialSellers={sellerMap} />
      <CTA />
    </div>
  );
}
