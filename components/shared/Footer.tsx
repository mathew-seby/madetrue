"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/shared/AuthProvider";
import { getCategories } from "@/lib/supabase/client";
import { Category } from "@/types";
import { COMPANY_DETAILS } from "@/lib/utils/constants";

export default function Footer() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const { currentUser } = useAuth();
  const sellerRoute = currentUser?.role === "seller" ? "/dashboard" : "/profile#become-maker";

  // The Explore column links into the live catalog: the first category
  // the admin console maintains (the homepage tiles and listing filters
  // read the same list), so CRUD can never leave a broken link behind.
  const [featuredCategory, setFeaturedCategory] = useState<Category | null>(null);

  useEffect(() => {
    let alive = true;
    getCategories()
      .then((cats) => {
        if (alive) setFeaturedCategory(cats[0] ?? null);
      })
      .catch(() => {
        /* the footer stays quietly without a category link */
      });
    return () => {
      alive = false;
    };
  }, []);

  if (isAdminRoute) return null;

  return (
    <footer className="bg-[#FAF7F2] border-t border-warm-brown/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
        {/* Brand & Story */}
        <div className="sm:col-span-2 space-y-4">
          <div className="space-y-1">
            <h3 className="font-serif text-xl font-bold text-primary-green">MADETRUE</h3>
            <span className="block text-[11px] font-medium text-text-dark/50 tracking-wider uppercase font-sans">
              {COMPANY_DETAILS.legalName}
            </span>
          </div>
          <p className="text-sm text-text-dark/80 max-w-sm leading-relaxed">
            Connecting Kerala&apos;s local spice growers, traditional home-cooks, and passionate artisans directly with nearby neighbors. Built on trust, local stories, and real taste.
          </p>
          <div className="flex items-center text-xs text-warm-brown font-semibold pt-1">
            <span>ഹൃദയപൂർവ്വം കേരളത്തിൽ നിന്നും</span>
            <Heart className="h-3 w-3 ml-1 fill-warm-brown text-warm-brown" />
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-xs font-bold uppercase text-warm-brown tracking-wider mb-4">Explore</h4>
          <ul className="space-y-2.5">
            <li>
              <Link href="/products" className="text-sm text-text-dark/80 hover:text-primary-green transition">
                Shop Local
              </Link>
            </li>
            <li>
              <Link href="/#meet-makers" className="text-sm text-text-dark/80 hover:text-primary-green transition">
                Meet the Makers
              </Link>
            </li>
            {featuredCategory && (
              <li>
                <Link href={`/products?category=${featuredCategory.slug}`} className="text-sm text-text-dark/80 hover:text-primary-green transition">
                  {featuredCategory.name}
                </Link>
              </li>
            )}
            <li>
              <Link href="/orders" className="text-sm text-text-dark/80 hover:text-primary-green transition">
                My Orders
              </Link>
            </li>
          </ul>
        </div>

        {/* Community Links */}
        <div>
          <h4 className="text-xs font-bold uppercase text-warm-brown tracking-wider mb-4">Community</h4>
          <ul className="space-y-2.5">
            <li>
              <Link href={sellerRoute} className="text-sm text-text-dark/80 hover:text-primary-green transition">
                Become a Seller
              </Link>
            </li>
            <li>
              <Link href="/#meet-makers" className="text-sm text-text-dark/80 hover:text-primary-green transition">
                Seller Stories
              </Link>
            </li>
            <li>
              <a
                href={COMPANY_DETAILS.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-dark/80 hover:text-primary-green transition inline-flex items-center gap-1"
              >
                WhatsApp Support
              </a>
            </li>
            <li>
              <Link href="/contact" className="text-sm text-text-dark/80 hover:text-primary-green transition">
                Contact & Support
              </Link>
            </li>
          </ul>
        </div>

        {/* Trust & Legal Links */}
        <div>
          <h4 className="text-xs font-bold uppercase text-warm-brown tracking-wider mb-4 flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary-green" />
            Trust & Legal
          </h4>
          <ul className="space-y-2.5">
            <li>
              <Link href="/terms" className="text-sm text-text-dark/80 hover:text-primary-green transition">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-sm text-text-dark/80 hover:text-primary-green transition">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/refund-policy" className="text-sm text-text-dark/80 hover:text-primary-green transition">
                Refund & Cancellations
              </Link>
            </li>
            <li>
              <Link href="/shipping-policy" className="text-sm text-text-dark/80 hover:text-primary-green transition">
                Shipping & Delivery
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-warm-brown/5 flex flex-col sm:flex-row items-center justify-between text-xs text-text-dark/60">
        <p>&copy; {new Date().getFullYear()} {COMPANY_DETAILS.legalName}. All rights reserved.</p>
        <p className="mt-2 sm:mt-0">
          Kochi, Kerala, India ({COMPANY_DETAILS.pinCode}) • Made with care for Kerala&apos;s traditional producers.
        </p>
      </div>
    </footer>
  );
}
