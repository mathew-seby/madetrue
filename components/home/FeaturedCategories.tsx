import Link from "next/link";
import { getCategories } from "@/lib/supabase/client";
import { Category } from "@/types";
import { Leaf, UtensilsCrossed, Paintbrush, Sprout, Flower } from "lucide-react";

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  Leaf: Leaf,
  UtensilsCrossed: UtensilsCrossed,
  Brush: Paintbrush,
  Sprout: Sprout,
  Flower: Flower,
};

interface FeaturedCategoriesProps {
  categories?: Category[];
}

export default async function FeaturedCategories({
  categories: initialCategories,
}: FeaturedCategoriesProps) {
  const categories = initialCategories ?? (await getCategories());

  return (
    <section className="bg-cream-bg py-16 px-4 sm:px-6 lg:px-8 border-t border-warm-brown/5">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Title */}
        <div className="text-center md:text-left space-y-2">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-text-dark">
            Browse by Category
          </h2>
          <p className="text-sm text-text-dark/70 max-w-lg leading-relaxed">
            Find fresh harvest, homemade pickles, and traditional crafts made by the families in your region.
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {categories.map((cat) => {
            const IconComponent = iconMap[cat.icon] || Leaf;

            return (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="group flex flex-col items-center text-center p-6 bg-[#FAF7F2] rounded-2xl border border-warm-brown/10 hover:border-primary-green hover:shadow-md transition duration-300"
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-primary-green/10 text-primary-green group-hover:bg-primary-green group-hover:text-cream-bg transition duration-300">
                  <IconComponent className="h-6 w-6" />
                </div>
                <span className="font-serif text-base font-semibold text-text-dark mt-4 group-hover:text-primary-green transition">
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
