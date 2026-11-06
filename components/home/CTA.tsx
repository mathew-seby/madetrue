"use client";

import Link from "next/link";
import { Store, HeartHandshake } from "lucide-react";
import { useAuth } from "@/components/shared/AuthProvider";

export default function CTA() {
  const { currentUser } = useAuth();
  const sellerRoute = currentUser?.role === "seller" ? "/dashboard" : "/profile#become-maker";

  return (
    <section className="bg-cream-bg py-16 px-4 sm:px-6 lg:px-8 border-t border-warm-brown/5">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Buyer Card */}
        <div className="relative overflow-hidden bg-primary-green/5 rounded-3xl border border-primary-green/10 p-8 sm:p-10 flex flex-col justify-between space-y-6">
          <div className="absolute top-0 right-0 -z-10 w-48 h-48 rounded-full bg-primary-green/10 blur-2xl" />
          <div className="space-y-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-primary-green/15 text-primary-green">
              <HeartHandshake className="h-6 w-6" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-text-dark">
              Support Kerala&apos;s Artisans &amp; Farmers
            </h3>
            <p className="text-sm text-text-dark/80 leading-relaxed max-w-md">
              Buy spice mixes, pure forest honey, fresh organic crops, and hand-thrown earthenware pots directly from independent neighborhood kitchens and farms.
            </p>
          </div>
          <div className="pt-4">
            <Link
              href="/products"
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-primary-green text-cream-bg font-semibold text-sm hover:bg-[#224f3b] transition duration-200"
            >
              Explore Local
            </Link>
          </div>
        </div>

        {/* Seller Card */}
        <div className="relative overflow-hidden bg-warm-brown/5 rounded-3xl border border-warm-brown/10 p-8 sm:p-10 flex flex-col justify-between space-y-6">
          <div className="absolute top-0 right-0 -z-10 w-48 h-48 rounded-full bg-warm-brown/10 blur-2xl" />
          <div className="space-y-4">
            <div className="w-12 h-12 flex items-center justify-center rounded-2xl bg-warm-brown/15 text-warm-brown">
              <Store className="h-6 w-6" />
            </div>
            <h3 className="font-serif text-2xl font-bold text-text-dark">
              Are you a local Kerala producer?
            </h3>
            <p className="text-sm text-text-dark/80 leading-relaxed max-w-md">
              Register your kitchen, home garden, workshop, or orchard. Connect directly with buyers in your area, tell your family story, and get paid directly.
            </p>
          </div>
          <div className="pt-4">
            <Link
              href={sellerRoute}
              className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-warm-brown text-cream-bg font-semibold text-sm hover:bg-[#64472f] transition duration-200"
            >
              Become a Seller
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

