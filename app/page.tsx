import Hero from "@/components/home/Hero";
import FeaturedCategories from "@/components/home/FeaturedCategories";
import MeetMakers from "@/components/home/MeetMakers";
import NearbySellers from "@/components/home/NearbySellers";
import TrendingProducts from "@/components/home/TrendingProducts";
import CTA from "@/components/home/CTA";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      <FeaturedCategories />
      <MeetMakers />
      <NearbySellers />
      <TrendingProducts />
      <CTA />
    </div>
  );
}
