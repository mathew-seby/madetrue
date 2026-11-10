import Link from "next/link";
import { getSellers } from "@/lib/supabase/client";
import { Seller } from "@/types";
import { MapPin, CheckCircle2, ArrowRight } from "lucide-react";

interface MeetMakersProps {
  makers?: Seller[];
}

export default async function MeetMakers({ makers: initialMakers }: MeetMakersProps) {
  const allMakers = initialMakers ?? (await getSellers());
  const makers = allMakers.slice(0, 3);

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
              className="bg-white rounded-3xl p-6 border border-warm-brown/10 hover:border-primary-green/30 hover:shadow-lg transition duration-300 flex flex-col justify-between space-y-6"
            >
              {/* Top part: Image and Name */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-primary-green/20">
                    <img
                      src={maker.profile_photo_url}
                      alt={maker.business_name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-text-dark flex items-center">
                      <span>{maker.business_name}</span>
                      {maker.is_verified && (
                        <CheckCircle2 className="h-4 w-4 ml-1.5 text-primary-green flex-shrink-0" />
                      )}
                    </h3>
                    <div className="flex items-center text-xs text-text-dark/60 mt-0.5">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-warm-brown" />
                      <span className="truncate max-w-[180px]">{maker.address}</span>
                    </div>
                  </div>
                </div>

                {/* Story Snippet */}
                <p className="text-sm text-text-dark/80 italic leading-relaxed line-clamp-3">
                  &ldquo;{maker.story}&rdquo;
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-warm-brown/5 flex items-center justify-between">
                <Link
                  href={`/sellers/${maker.id}`}
                  className="inline-flex items-center text-xs font-bold uppercase tracking-wider text-primary-green hover:underline"
                >
                  Meet the Maker
                  <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
