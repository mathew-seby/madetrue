"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { useAuth } from "@/components/shared/AuthProvider";

export default function Footer() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const { currentUser } = useAuth();
  const sellerRoute = currentUser?.role === "seller" ? "/dashboard" : "/profile#become-maker";

  if (isAdminRoute) return null;

  return (
    <footer className="bg-[#FAF7F2] border-t border-warm-brown/10 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand & Story */}
        <div className="md:col-span-2 space-y-4">
          <h3 className="font-serif text-xl font-bold text-primary-green">MADETRUE</h3>
          <p className="text-sm text-text-dark/80 max-w-sm leading-relaxed">
            Connecting Kerala's local spice growers, traditional home-cooks, and passionate artisans directly with nearby neighbors. Built on trust, local stories, and real taste.
          </p>
          <div className="flex items-center text-xs text-warm-brown font-semibold pt-2">
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
            <li>
              <Link href="/products?category=spices" className="text-sm text-text-dark/80 hover:text-primary-green transition">
                Idukki Spices
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
                href="https://wa.me/919876543210?text=Hello%20MADETRUE%20Support!"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-dark/80 hover:text-primary-green transition"
              >
                WhatsApp Support
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto mt-12 pt-6 border-t border-warm-brown/5 flex flex-col sm:flex-row items-center justify-between text-xs text-text-dark/60">
        <p>&copy; {new Date().getFullYear()} MADETRUE Kerala. All rights reserved.</p>
        <p className="mt-2 sm:mt-0">
          Made with care for Kerala's traditional producers.
        </p>
      </div>
    </footer>
  );
}
