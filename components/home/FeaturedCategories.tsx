"use client";

import { useEffect, useState } from "react";
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

export default function FeaturedCategories() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function load() {
      const data = await getCategories();
      setCategories(data);
    }
    load();
  }, []);

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
                {/* Icon Circle */}
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-primary-green/5 text-primary-green group-hover:bg-primary-green group-hover:text-cream-bg transition duration-300">
                  <IconComponent className="h-6 w-6" />
                </div>
                {/* Category Name */}
                <span className="mt-4 text-sm font-semibold text-text-dark group-hover:text-primary-green transition duration-300">
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
