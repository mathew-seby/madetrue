"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, ShoppingCart, Menu, X, Globe } from "lucide-react";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<"EN" | "ML">("EN");

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "EN" ? "ML" : "EN"));
  };

  return (
    <nav className="sticky top-0 z-50 bg-cream-bg border-b border-warm-brown/10 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="font-serif text-2xl font-bold text-primary-green tracking-wide">
              MADETRUE
            </Link>
            <div className="hidden sm:flex items-center ml-4 pl-4 border-l border-warm-brown/20 text-xs text-warm-brown font-medium">
              <MapPin className="h-3.5 w-3.5 mr-1 text-primary-green animate-pulse" />
              <span>Kochi, Kerala (within 15 km)</span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/products" className="text-sm font-medium text-text-dark hover:text-primary-green transition">
              Explore Local
            </Link>
            <Link href="#meet-makers" className="text-sm font-medium text-text-dark hover:text-primary-green transition">
              Meet the Makers
            </Link>
            <Link href="/dashboard" className="text-sm font-semibold text-warm-brown hover:text-primary-green transition">
              Become a Seller
            </Link>
          </div>

          {/* Right Action Icons */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border border-warm-brown/20 text-warm-brown hover:bg-primary-green hover:text-cream-bg transition duration-200"
              title="Switch Language / ഭാഷ മാറ്റുക"
            >
              <Globe className="h-3.5 w-3.5 mr-1.5" />
              <span>{language === "EN" ? "മലയാളം" : "English"}</span>
            </button>

            {/* Cart Icon */}
            <Link href="/cart" className="relative p-2 text-text-dark hover:text-primary-green transition">
              <ShoppingCart className="h-6 w-6" />
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none text-cream-bg bg-primary-green">
                2
              </span>
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center space-x-4 md:hidden">
            {/* Language Toggle for Mobile */}
            <button
              onClick={toggleLanguage}
              className="flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border border-warm-brown/20 text-warm-brown hover:bg-primary-green hover:text-cream-bg transition"
            >
              <Globe className="h-3.5 w-3.5 mr-1" />
              <span>{language === "EN" ? "ML" : "EN"}</span>
            </button>

            <Link href="/cart" className="relative p-1.5 text-text-dark hover:text-primary-green transition">
              <ShoppingCart className="h-5.5 w-5.5" />
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none text-cream-bg bg-primary-green">
                2
              </span>
            </Link>

            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-1.5 rounded-md text-text-dark hover:text-primary-green focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Location Sub-bar */}
      <div className="flex items-center justify-center py-2 px-4 bg-primary-green/5 border-t border-warm-brown/5 text-xs text-warm-brown font-medium md:hidden">
        <MapPin className="h-3 w-3 mr-1 text-primary-green" />
        <span>Deliver to: <b>Kochi, Kerala</b> (within 15 km)</span>
      </div>

      {/* Mobile Menu Panel */}
      {isOpen && (
        <div className="md:hidden border-b border-warm-brown/10 bg-cream-bg px-4 pt-2 pb-4 space-y-1">
          <Link
            href="/products"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-text-dark hover:bg-primary-green/5 hover:text-primary-green transition"
          >
            Explore Local
          </Link>
          <Link
            href="#meet-makers"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-text-dark hover:bg-primary-green/5 hover:text-primary-green transition"
          >
            Meet the Makers
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-semibold text-warm-brown hover:bg-primary-green/5 hover:text-primary-green transition"
          >
            Become a Seller
          </Link>
        </div>
      )}
    </nav>
  );
}
