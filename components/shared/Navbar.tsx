"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, ShoppingCart, Menu, X, Globe, User as UserIcon, LogOut } from "lucide-react";
import { useAuth } from "@/components/shared/AuthProvider";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<"EN" | "ML">("EN");
  const { currentUser, logout } = useAuth();

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
            <Link href="/#meet-makers" className="text-sm font-medium text-text-dark hover:text-primary-green transition">
              Meet the Makers
            </Link>
            {currentUser?.role === "seller" ? (
              <Link href="/dashboard" className="text-sm font-bold text-primary-green hover:text-[#224f3b] transition">
                Maker Dashboard
              </Link>
            ) : currentUser?.role === "admin" ? (
              <Link href="/admin" className="text-sm font-bold text-amber-800 hover:text-amber-950 transition">
                Admin Panel
              </Link>
            ) : (
              <Link href="/profile" className="text-sm font-semibold text-warm-brown hover:text-primary-green transition">
                Become a Maker
              </Link>
            )}
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

            {/* User Profile Info */}
            {currentUser && (
              <div className="flex items-center space-x-3 border-l border-warm-brown/20 pl-4">
                <Link
                  href="/profile"
                  className="flex items-center space-x-2 text-sm font-semibold text-text-dark hover:text-primary-green transition"
                  title="View Profile"
                >
                  <div className="w-7 h-7 rounded-full bg-primary-green/10 text-primary-green flex items-center justify-center font-bold text-xs">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[100px] truncate">{currentUser.name.split(" ")[0]}</span>
                </Link>
                <button
                  onClick={logout}
                  className="p-1.5 text-text-dark/60 hover:text-red-600 transition"
                  title="Sign Out"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            )}
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
            href="/#meet-makers"
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-text-dark hover:bg-primary-green/5 hover:text-primary-green transition"
          >
            Meet the Makers
          </Link>
          
          {currentUser?.role === "seller" ? (
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-bold text-primary-green hover:bg-primary-green/5 transition"
            >
              Maker Dashboard
            </Link>
          ) : currentUser?.role === "admin" ? (
            <Link
              href="/admin"
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-bold text-amber-800 hover:bg-primary-green/5 transition"
            >
              Admin Panel
            </Link>
          ) : (
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-semibold text-warm-brown hover:bg-primary-green/5 hover:text-primary-green transition"
            >
              Become a Maker
            </Link>
          )}

          {currentUser && (
            <div className="border-t border-warm-brown/10 pt-2 mt-2 space-y-1">
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-text-dark hover:bg-primary-green/5 hover:text-primary-green transition"
              >
                My Profile ({currentUser.name})
              </Link>
              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full text-left block px-3 py-2 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 transition"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

