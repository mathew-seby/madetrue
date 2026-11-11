"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MapPin, ShoppingCart, Menu, X, Globe, LogOut, ShieldCheck, Package } from "lucide-react";
import { useAuth } from "@/components/shared/AuthProvider";
import { useCart } from "@/components/shared/CartProvider";

export default function Navbar() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<"EN" | "ML">("EN");
  const { currentUser, logout } = useAuth();
  const { count: cartCount } = useCart();
  // The admin-console badge follows the REAL session role — no separate
  // console flag exists anymore (Phase 5 Step 1).
  const isAdminAuthenticated = currentUser?.role === "admin";

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === "EN" ? "ML" : "EN"));
  };

  return (
    <nav className="sticky top-0 z-50 bg-cream-bg border-b border-warm-brown/10 backdrop-blur-md bg-opacity-95">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href={isAdminRoute ? "/admin" : "/"} className="font-serif text-2xl font-bold text-primary-green tracking-wide">
              MADETRUE
            </Link>
            {isAdminRoute ? (
              <div className="hidden sm:flex items-center ml-4 pl-4 border-l border-warm-brown/20 text-xs text-amber-800 font-bold uppercase tracking-wider">
                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                <span>Admin Console</span>
              </div>
            ) : (
              <div className="hidden sm:flex items-center ml-4 pl-4 border-l border-warm-brown/20 text-xs text-warm-brown font-medium">
                <MapPin className="h-3.5 w-3.5 mr-1 text-primary-green animate-pulse" />
                <span>Ernakulam, Kerala (Delivery District)</span>
              </div>
            )}
          </div>

          {/* Desktop Nav Links */}
          {!isAdminRoute && (
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
          )}

          {/* Right Action Icons */}
          <div className="hidden md:flex items-center space-x-6">
            {isAdminRoute ? (
              isAdminAuthenticated && (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-sm font-semibold text-text-dark">
                    <div className="w-7 h-7 rounded-full bg-amber-800/10 text-amber-800 flex items-center justify-center font-bold text-xs">
                      {(currentUser?.name ?? "A").charAt(0).toUpperCase()}
                    </div>
                    <span>Admin</span>
                  </div>
                  <button
                    onClick={async () => {
                      await logout();
                      window.location.href = "/admin/login";
                    }}
                    className="p-1.5 text-text-dark/60 hover:text-red-600 transition border-l border-warm-brown/20 pl-3.5 cursor-pointer"
                    title="Sign Out"
                    aria-label="Sign out of admin console"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                  </button>
                </div>
              )
            ) : (
              <>
                {/* Language Toggle */}
                <button
                  onClick={toggleLanguage}
                  className="flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border border-warm-brown/20 text-warm-brown hover:bg-primary-green hover:text-cream-bg transition duration-200 cursor-pointer"
                  title="Switch Language / ഭാഷ മാറ്റുക"
                  aria-label="Switch Language / ഭാഷ മാറ്റുക"
                >
                  <Globe className="h-3.5 w-3.5 mr-1.5" />
                  <span>{language === "EN" ? "മലയാളം" : "English"}</span>
                </button>

                {/* My Orders — the buyer's live order history (Phase 7 Step 2) */}
                {currentUser && (
                  <Link
                    href="/orders"
                    className="p-2 text-text-dark hover:text-primary-green transition"
                    title="My Orders"
                    aria-label="My Orders"
                  >
                    <Package className="h-5 w-5" />
                  </Link>
                )}

                {/* Cart Icon */}
                <Link
                  href="/cart"
                  className="relative p-2 text-text-dark hover:text-primary-green transition"
                  aria-label={cartCount > 0 ? `Shopping basket with ${cartCount} items` : "Shopping basket (empty)"}
                  title="Shopping Basket"
                >
                  <ShoppingCart className="h-6 w-6" />
                  {cartCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none text-cream-bg bg-primary-green">
                      {cartCount}
                    </span>
                  )}
                </Link>

                {/* User Profile Info or Sign In */}
                {currentUser ? (
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
                      className="p-1.5 text-text-dark/60 hover:text-red-600 transition cursor-pointer"
                      title="Sign Out"
                      aria-label="Sign out"
                    >
                      <LogOut className="h-4.5 w-4.5" />
                    </button>
                  </div>
                ) : (
                  <div className="border-l border-warm-brown/20 pl-4">
                    <Link
                      href="/login"
                      className="text-xs font-semibold px-3 py-1.5 rounded-full border border-warm-brown/20 text-warm-brown hover:bg-primary-green hover:text-cream-bg transition duration-200"
                    >
                      Sign In
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Mobile menu button / admin info */}
          <div className="flex items-center space-x-4 md:hidden">
            {isAdminRoute ? (
              isAdminAuthenticated && (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5 text-xs font-semibold text-text-dark">
                    <div className="w-6.5 h-6.5 rounded-full bg-amber-800/10 text-amber-800 flex items-center justify-center font-bold text-[10px]">
                      {(currentUser?.name ?? "A").charAt(0).toUpperCase()}
                    </div>
                    <span>Admin</span>
                  </div>
                  <button
                    onClick={async () => {
                      await logout();
                      window.location.href = "/admin/login";
                    }}
                    className="p-1 text-text-dark/60 hover:text-red-600 transition border-l border-warm-brown/20 pl-2.5 cursor-pointer"
                    title="Sign Out"
                    aria-label="Sign out of admin console"
                  >
                    <LogOut className="h-4.5 w-4.5" />
                  </button>
                </div>
              )
            ) : (
              <>
                {/* Language Toggle for Mobile */}
                <button
                  onClick={toggleLanguage}
                  className="flex items-center text-xs font-semibold px-2 py-0.5 rounded-full border border-warm-brown/20 text-warm-brown hover:bg-primary-green hover:text-cream-bg transition cursor-pointer"
                  title="Switch Language / ഭാഷ മാറ്റുക"
                  aria-label="Switch Language / ഭാഷ മാറ്റുക"
                >
                  <Globe className="h-3.5 w-3.5 mr-1" />
                  <span>{language === "EN" ? "ML" : "EN"}</span>
                </button>

                <Link
                  href="/cart"
                  className="relative p-1.5 text-text-dark hover:text-primary-green transition"
                  aria-label={cartCount > 0 ? `Shopping basket with ${cartCount} items` : "Shopping basket (empty)"}
                  title="Shopping Basket"
                >
                  <ShoppingCart className="h-5.5 w-5.5" />
                  {cartCount > 0 && (
                    <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none text-cream-bg bg-primary-green">
                      {cartCount}
                    </span>
                  )}
                </Link>

                <button
                  type="button"
                  onClick={() => setIsOpen(!isOpen)}
                  className="p-1.5 rounded-md text-text-dark hover:text-primary-green focus:outline-hidden cursor-pointer"
                  aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
                  aria-expanded={isOpen}
                  aria-controls="mobile-nav-panel"
                >
                  {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Location Sub-bar */}
      {!isAdminRoute && (
        <div className="flex items-center justify-center py-2 px-4 bg-primary-green/5 border-t border-warm-brown/5 text-xs text-warm-brown font-medium md:hidden">
          <MapPin className="h-3 w-3 mr-1 text-primary-green" />
          <span>Deliver to: <b>Ernakulam, Kerala</b> (Only)</span>
        </div>
      )}

      {/* Mobile Menu Panel */}
      {!isAdminRoute && isOpen && (
        <div
          id="mobile-nav-panel"
          role="region"
          aria-label="Mobile Navigation Menu"
          className="md:hidden border-b border-warm-brown/10 bg-cream-bg px-4 pt-2 pb-4 space-y-1"
        >
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

          {currentUser ? (
            <div className="border-t border-warm-brown/10 pt-2 mt-2 space-y-1">
              <Link
                href="/orders"
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-text-dark hover:bg-primary-green/5 hover:text-primary-green transition"
              >
                My Orders
              </Link>
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-medium text-text-dark hover:bg-primary-green/5 hover:text-primary-green transition"
              >
                My Profile ({currentUser.name})
              </Link>
              <button
                type="button"
                aria-label="Sign out"
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full text-left block px-3 py-2 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 transition cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="border-t border-warm-brown/10 pt-2 mt-2 space-y-1">
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="block px-3 py-2 rounded-lg text-base font-semibold text-primary-green hover:bg-primary-green/5 transition"
              >
                Sign In / Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

