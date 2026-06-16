"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSellers } from "@/lib/supabase/client";
import { Seller } from "@/types";
import { MapPin, CheckCircle2, ArrowRight } from "lucide-react";

export default function MeetMakers() {
  const [makers, setMakers] = useState<Seller[]>([]);

  useEffect(() => {
    async function load() {
      const data = await getSellers();
      // Show first 3 makers on the homepage
      setMakers(data.slice(0, 3));
    }
    load();
  }, []);

  return (
    <section id="meet-makers" className="bg-[#FAF7F2] py-16 px-4 sm:px-6 lg:px-8 border-t border-warm-brown/5">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs uppercase font-bold text-warm-brown tracking-widest">
              People Behind the Goods
            </span>
            <h2 className="font-serif text-3xl font-bold tracking-tight text-text-dark">
              Meet the Makers
            </h2>
            <p className="text-sm text-text-dark/70 max-w-lg leading-relaxed">
              Every product has a human behind it. Trace their roots and read their honest family stories.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center text-sm font-semibold text-primary-green hover:text-[#224f3b] transition group"
          >
            <span>Explore all makers</span>
            <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition duration-200" />
          </Link>
        </div>

        {/* Makers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {makers.map((maker) => (
            <div
              key={maker.id}
              className="bg-cream-bg rounded-2xl border border-warm-brown/10 p-6 flex flex-col justify-between hover:shadow-lg transition duration-300"
            >
              <div className="space-y-4">
                {/* Photo & Header */}
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary-green/20">
                    <img
                      src={maker.profile_photo_url}
                      alt={maker.business_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <h3 className="font-serif text-lg font-bold text-text-dark">
                        {maker.business_name}
                      </h3>
                      {maker.is_verified && (
                        <span title="Verified Producer">
                          <CheckCircle2 className="h-4.5 w-4.5 text-primary-green fill-primary-green/10" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-warm-brown font-medium mt-0.5">
                      <MapPin className="h-3 w-3 mr-1 text-primary-green" />
                      <span>{maker.address.split(",")[maker.address.split(",").length - 3] || "Kerala"}</span>
                    </div>
                  </div>
                </div>

                {/* Story */}
                <p className="text-sm text-text-dark/85 italic leading-relaxed pl-2 border-l-2 border-accent-gold/40">
                  "{maker.story.substring(0, 180)}..."
                </p>
              </div>

              {/* Support CTA */}
              <div className="mt-6 pt-4 border-t border-warm-brown/5">
                <Link
                  href={`/sellers/${maker.id}`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 border border-warm-brown/20 rounded-xl text-xs font-bold text-warm-brown hover:bg-warm-brown/5 hover:border-warm-brown/60 transition"
                >
                  Meet the Maker
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
