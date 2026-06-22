"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSellers, getAllProductsAdmin, updateProductStatus } from "@/lib/supabase/client";
import { Product, Seller } from "@/types";
import { ShieldCheck, LogOut, Check, X, Clock, Eye, Store, HelpCircle, Tag, MapPin, Inbox, CheckCircle, AlertTriangle } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<{ [key: string]: Seller }>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");

  // Notification State
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Authentication check on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isLoggedIn = sessionStorage.getItem("admin_logged_in") === "true";
      if (!isLoggedIn) {
        router.push("/admin/login");
      } else {
        setAuthorized(true);
        setCheckingAuth(false);
        loadModerationData();
      }
    }
  }, [router]);

  async function loadModerationData() {
    setLoading(true);
    try {
      const allProducts = await getAllProductsAdmin();
      const allSellers = await getSellers();

      const sellerMap = allSellers.reduce((acc, curr) => {
        acc[curr.id] = curr;
        return acc;
      }, {} as { [key: string]: Seller });

      setProducts(allProducts);
      setSellers(sellerMap);
    } catch (error) {
      showToast("Failed to fetch product listings", "error");
    } finally {
      setLoading(false);
    }
  }

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("admin_logged_in");
    }
    router.push("/admin/login");
  };

  const handleApproval = async (productId: string, status: "approved" | "rejected" | "pending") => {
    let reason = "";
    if (status === "rejected") {
      const inputReason = window.prompt("Please enter a reason for rejecting this product listing (this will be sent to the seller):");
      if (inputReason === null) {
        // User cancelled the prompt, abort the rejection action
        return;
      }
      reason = inputReason.trim() || "No specific reason provided.";
    }

    try {
      const updated = await updateProductStatus(productId, status, reason);
      if (updated) {
        let msg = "";
        if (status === "approved") {
          msg = `Product "${updated.name}" has been approved for listing.`;
        } else if (status === "rejected") {
          msg = `Product "${updated.name}" has been rejected. Reason: ${reason}`;
        } else {
          msg = `Product "${updated.name}" has been sent back for re-review.`;
        }
        showToast(msg, "success");
        // Refresh products list
        const allProducts = await getAllProductsAdmin();
        setProducts(allProducts);
      }
    } catch (err) {
      showToast("Operation failed. Try again.", "error");
    }
  };

  // Group products by status
  const pendingProducts = products.filter((p) => p.status === "pending");
  const approvedProducts = products.filter((p) => !p.status || p.status === "approved");
  const rejectedProducts = products.filter((p) => p.status === "rejected");

  if (checkingAuth) {
    return (
      <div className="max-w-md mx-auto py-32 text-center space-y-4">
        <div className="w-10 h-10 border-4 border-primary-green border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-sm font-semibold text-warm-brown">Verifying admin session credentials...</p>
      </div>
    );
  }

  if (!authorized) {
    return null; // Prevent flicker while redirecting
  }

  // Count helper
  const getTabCount = (tab: "pending" | "approved" | "rejected") => {
    if (tab === "pending") return pendingProducts.length;
    if (tab === "approved") return approvedProducts.length;
    if (tab === "rejected") return rejectedProducts.length;
    return 0;
  };

  const currentList =
    activeTab === "pending"
      ? pendingProducts
      : activeTab === "approved"
        ? approvedProducts
        : rejectedProducts;

  return (
    <div className="bg-cream-bg min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Toast Notification Banner */}
        {toast && (
          <div
            className={`fixed bottom-5 right-5 z-50 p-4 rounded-xl shadow-lg border text-sm font-semibold flex items-center space-x-2 transition duration-300 animate-slide-up ${toast.type === "success"
                ? "bg-primary-green/95 text-cream-bg border-primary-green"
                : "bg-red-800/95 text-cream-bg border-red-900"
              }`}
          >
            {toast.type === "success" ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <span>{toast.message}</span>
          </div>
        )}

        {/* Dashboard Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#FAF7F2] p-6 rounded-3xl border border-warm-brown/10 shadow-sm gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-primary-green/10 text-primary-green rounded-full flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-serif text-2xl font-bold text-text-dark">Admin Moderation Console</h1>
              <p className="text-xs text-text-dark/60">Manage traditional Kerala submissions, review farmer authenticity, and approve goods.</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center px-4 py-2 border border-red-200 hover:bg-red-50 text-xs font-bold text-red-600 rounded-xl transition cursor-pointer self-start sm:self-center"
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" /> Log Out
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/10 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-warm-brown uppercase tracking-wider">Pending Review</span>
              <p className="text-3xl font-serif font-bold text-amber-600">{pendingProducts.length}</p>
            </div>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Clock className="h-5 w-5 animate-pulse" />
            </div>
          </div>

          <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/10 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-warm-brown uppercase tracking-wider">Approved / Active</span>
              <p className="text-3xl font-serif font-bold text-primary-green">{approvedProducts.length}</p>
            </div>
            <div className="w-10 h-10 bg-primary-green/10 text-primary-green rounded-xl flex items-center justify-center">
              <CheckCircle className="h-5 w-5" />
            </div>
          </div>

          <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/10 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-warm-brown uppercase tracking-wider">Rejected Listings</span>
              <p className="text-3xl font-serif font-bold text-red-600">{rejectedProducts.length}</p>
            </div>
            <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
              <X className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-warm-brown/10">
          {(["pending", "approved", "rejected"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-bold border-b-2 transition duration-200 capitalize ${activeTab === tab
                  ? "border-primary-green text-primary-green"
                  : "border-transparent text-text-dark/50 hover:text-text-dark"
                }`}
            >
              {tab === "pending" ? "Pending Approval" : tab === "approved" ? "Approved Catalog" : "Rejected Goods"} ({getTabCount(tab)})
            </button>
          ))}
        </div>

        {/* Product List Content */}
        {loading ? (
          <div className="text-center py-16 text-sm text-warm-brown font-semibold">
            Loading products for review...
          </div>
        ) : currentList.length > 0 ? (
          <div className="space-y-6">
            {currentList.map((product) => {
              const seller = sellers[product.seller_id];
              return (
                <div
                  key={product.id}
                  className="bg-[#FAF7F2] rounded-3xl border border-warm-brown/10 overflow-hidden flex flex-col md:flex-row hover:border-primary-green/20 transition shadow-sm"
                >
                  {/* Image Block */}
                  <div className="relative w-full md:w-64 aspect-video md:aspect-square bg-primary-green/5 shrink-0 border-b md:border-b-0 md:border-r border-warm-brown/10">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-cream-bg/95 border border-warm-brown/10 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-warm-brown shadow-sm">
                      ₹{product.price}
                    </div>
                  </div>

                  {/* Info Block */}
                  <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      {/* Category & Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center text-[10px] font-bold text-warm-brown bg-warm-brown/5 border border-warm-brown/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                          {product.category}
                        </span>
                        {product.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center text-[9px] font-bold text-primary-green bg-primary-green/5 px-2 py-0.5 rounded-md uppercase tracking-wide"
                          >
                            <Tag className="h-2 w-2 mr-1" /> {tag}
                          </span>
                        ))}
                      </div>

                      {/* Title & Maker */}
                      <div className="space-y-1">
                        <h3 className="font-serif text-xl font-bold text-text-dark">{product.name}</h3>
                        {seller ? (
                          <div className="flex flex-wrap items-center text-xs font-semibold text-warm-brown gap-y-1">
                            <span className="flex items-center hover:text-primary-green transition">
                              <Store className="h-3.5 w-3.5 mr-1 text-primary-green" /> {seller.business_name}
                            </span>
                            <span className="mx-2 text-warm-brown/30 hidden sm:inline">|</span>
                            <span className="flex items-center text-text-dark/50">
                              <MapPin className="h-3 w-3 mr-1 text-primary-green" /> {seller.address.split(",")[0]}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-red-500 font-semibold flex items-center">
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Unknown Seller (ID: {product.seller_id})
                          </span>
                        )}
                      </div>

                      {/* Product Story / Description */}
                      <div className="space-y-1 text-xs">
                        <span className="font-bold text-warm-brown uppercase tracking-wider block">Maker's Story</span>
                        <p className="text-text-dark/80 leading-relaxed bg-cream-bg/50 p-3 rounded-xl border border-warm-brown/5 italic">
                          "{product.description}"
                        </p>
                      </div>

                      {/* Sourcing details */}
                      <div className="space-y-0.5 text-xs">
                        <span className="font-bold text-warm-brown uppercase tracking-wider block">Sourcing details</span>
                        <p className="text-text-dark/70 leading-relaxed">
                          {product.origin_details}
                        </p>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 border-t border-warm-brown/5 flex flex-wrap items-center justify-between gap-4">
                      <span className="text-[10px] text-text-dark/40 font-bold uppercase">
                        Submitted: {new Date(product.created_at).toLocaleDateString()}
                      </span>

                      <div className="flex items-center space-x-2">
                        {activeTab !== "approved" && (
                          <button
                            onClick={() => handleApproval(product.id, "approved")}
                            className="inline-flex items-center justify-center px-4 py-2 bg-primary-green hover:bg-[#224f3b] text-cream-bg text-xs font-bold rounded-xl shadow-sm transition duration-200 cursor-pointer"
                          >
                            <Check className="h-4 w-4 mr-1" /> Approve Listing
                          </button>
                        )}
                        {activeTab !== "rejected" && (
                          <button
                            onClick={() => handleApproval(product.id, "rejected")}
                            className="inline-flex items-center justify-center px-4 py-2 border border-red-200 hover:bg-red-50 text-xs font-bold text-red-600 rounded-xl transition duration-200 cursor-pointer"
                          >
                            <X className="h-4 w-4 mr-1" /> Reject Listing
                          </button>
                        )}
                        {activeTab === "rejected" && (
                          <button
                            onClick={() => handleApproval(product.id, "pending")}
                            className="inline-flex items-center justify-center px-4 py-2 border border-warm-brown/30 hover:bg-warm-brown/5 text-xs font-bold text-warm-brown rounded-xl transition duration-200 cursor-pointer"
                          >
                            <Clock className="h-4 w-4 mr-1" /> Re-review
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* EMPTY STATE */
          <div className="text-center py-20 bg-[#FAF7F2] border border-warm-brown/10 rounded-3xl space-y-4">
            <Inbox className="h-12 w-12 text-warm-brown/40 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-text-dark">No Products in this Queue</h3>
            <p className="text-xs text-text-dark/60 max-w-xs mx-auto leading-relaxed">
              {activeTab === "pending"
                ? "Excellent! The approval queue is fully caught up. All local products have been moderated."
                : activeTab === "approved"
                  ? "No approved catalog items found. Once approved, items will display here."
                  : "No rejected goods found in historical files."}
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
