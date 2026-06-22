"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSellers, getAllProductsAdmin, updateProductStatus } from "@/lib/supabase/client";
import { Product, Seller } from "@/types";
import { ShieldCheck, LogOut, Check, X, Clock, Eye, Store, HelpCircle, Tag, MapPin, Inbox, CheckCircle, AlertTriangle, FileText, ExternalLink, ChevronDown, ChevronUp, Image as ImageIcon, Navigation } from "lucide-react";

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Data State
  const [products, setProducts] = useState<Product[]>([]);
  const [sellers, setSellers] = useState<{ [key: string]: Seller }>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected">("pending");

  // Expanded product detail
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

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

  const toggleExpand = (productId: string) => {
    setExpandedProductId((prev) => (prev === productId ? null : productId));
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
              const isExpanded = expandedProductId === product.id;
              return (
                <div
                  key={product.id}
                  className={`bg-[#FAF7F2] rounded-3xl border overflow-hidden transition shadow-sm ${
                    isExpanded ? "border-primary-green/30 shadow-md" : "border-warm-brown/10 hover:border-primary-green/20"
                  }`}
                >
                  {/* Compact Product Row (always visible) */}
                  <div
                    className="flex flex-col md:flex-row cursor-pointer"
                    onClick={() => toggleExpand(product.id)}
                  >
                    {/* Image Block */}
                    <div className="relative w-full md:w-48 aspect-video md:aspect-square bg-primary-green/5 shrink-0 border-b md:border-b-0 md:border-r border-warm-brown/10">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3 bg-cream-bg/95 border border-warm-brown/10 px-2.5 py-0.5 rounded-full text-[9px] font-bold text-warm-brown shadow-sm">
                        ₹{product.price}
                      </div>
                    </div>

                    {/* Summary Info */}
                    <div className="p-5 flex-grow flex flex-col justify-between space-y-2">
                      <div className="space-y-2">
                        {/* Category & Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center text-[10px] font-bold text-warm-brown bg-warm-brown/5 border border-warm-brown/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            {product.category}
                          </span>
                          {product.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center text-[9px] font-bold text-primary-green bg-primary-green/5 px-2 py-0.5 rounded-md uppercase tracking-wide"
                            >
                              <Tag className="h-2 w-2 mr-1" /> {tag}
                            </span>
                          ))}
                        </div>

                        {/* Title & Product Location */}
                        <div className="space-y-1">
                          <h3 className="font-serif text-lg font-bold text-text-dark">{product.name}</h3>
                          <div className="flex flex-wrap items-center text-xs font-semibold text-warm-brown gap-y-1">
                            {seller && (
                              <span className="flex items-center hover:text-primary-green transition">
                                <Store className="h-3.5 w-3.5 mr-1 text-primary-green" /> {seller.business_name}
                              </span>
                            )}
                            <span className="mx-2 text-warm-brown/30 hidden sm:inline">|</span>
                            <span className="flex items-center text-text-dark/50">
                              <MapPin className="h-3 w-3 mr-1 text-primary-green" />
                              {product.address
                                ? product.address.split(",")[0]
                                : seller
                                  ? seller.address.split(",")[0]
                                  : "Unknown Location"}
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-text-dark/60 line-clamp-2 leading-relaxed">{product.description}</p>
                      </div>

                      {/* Footer row */}
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-[10px] text-text-dark/40 font-bold uppercase">
                          Submitted: {new Date(product.created_at).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center text-xs font-semibold text-primary-green">
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-4 w-4 mr-1" /> Collapse Details
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-1" /> View Full Details
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t border-warm-brown/10 bg-white/50 p-6 space-y-6 animate-fadeIn">

                      {/* Product Images Gallery */}
                      {product.images.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-warm-brown uppercase tracking-wider flex items-center">
                            <ImageIcon className="h-3.5 w-3.5 mr-1.5 text-primary-green" /> Product Images ({product.images.length})
                          </h4>
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                            {product.images.map((img, idx) => (
                              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-warm-brown/10 bg-primary-green/5 group">
                                <img
                                  src={img}
                                  alt={`${product.name} image ${idx + 1}`}
                                  className="w-full h-full object-cover transition group-hover:scale-105"
                                />
                                <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 text-[8px] bg-black/60 text-white rounded font-bold">
                                  #{idx + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left Column: Description & Sourcing */}
                        <div className="space-y-4">
                          {/* Maker's Story / Description */}
                          <div className="space-y-1.5">
                            <span className="text-xs font-bold text-warm-brown uppercase tracking-wider block">Maker's Product Story</span>
                            <p className="text-xs text-text-dark/80 leading-relaxed bg-cream-bg p-3.5 rounded-xl border border-warm-brown/5 italic">
                              &quot;{product.description}&quot;
                            </p>
                          </div>

                          {/* Origin / Sourcing Details */}
                          <div className="space-y-1.5">
                            <span className="text-xs font-bold text-warm-brown uppercase tracking-wider block">Raw Origin & Sourcing Details</span>
                            <p className="text-xs text-text-dark/70 leading-relaxed bg-cream-bg p-3.5 rounded-xl border border-warm-brown/5">
                              {product.origin_details}
                            </p>
                          </div>

                          {/* Stock & Price Info */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-cream-bg p-3 rounded-xl border border-warm-brown/5 text-center">
                              <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider block">Price</span>
                              <span className="text-sm font-bold text-primary-green">₹{product.price}</span>
                            </div>
                            <div className="bg-cream-bg p-3 rounded-xl border border-warm-brown/5 text-center">
                              <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider block">Stock</span>
                              <span className="text-sm font-bold text-text-dark">{product.stock} units</span>
                            </div>
                            <div className="bg-cream-bg p-3 rounded-xl border border-warm-brown/5 text-center">
                              <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider block">Available</span>
                              <span className={`text-sm font-bold ${product.is_available ? "text-primary-green" : "text-red-600"}`}>
                                {product.is_available ? "Yes" : "No"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Location & Documents */}
                        <div className="space-y-4">
                          {/* Product Sourcing Location */}
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-warm-brown uppercase tracking-wider flex items-center">
                              <MapPin className="h-3.5 w-3.5 mr-1.5 text-primary-green" /> Product Sourcing Location
                            </span>
                            <div className="bg-cream-bg p-4 rounded-xl border border-warm-brown/5 space-y-3">
                              {/* Product Address */}
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-bold text-warm-brown/70 uppercase tracking-wider">Physical Address</span>
                                <p className="text-xs text-text-dark font-semibold leading-relaxed">
                                  {product.address || "No specific address submitted"}
                                </p>
                              </div>

                              {/* Product Coordinates */}
                              {product.lat && product.lng ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                      <span className="text-[9px] font-bold text-warm-brown/70 uppercase tracking-wider">Coordinates</span>
                                      <p className="text-xs text-text-dark font-mono font-semibold">
                                        {product.lat.toFixed(6)}, {product.lng.toFixed(6)}
                                      </p>
                                    </div>
                                    <a
                                      href={`https://www.google.com/maps?q=${product.lat},${product.lng}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-3 py-1.5 bg-primary-green/10 text-primary-green text-[10px] font-bold rounded-lg hover:bg-primary-green/20 transition uppercase tracking-wider"
                                    >
                                      <Navigation className="h-3 w-3 mr-1" /> View on Maps
                                    </a>
                                  </div>

                                  {/* Ernakulam district validation indicator */}
                                  {product.lat >= 9.77 && product.lat <= 10.30 && product.lng >= 76.16 && product.lng <= 77.09 ? (
                                    <div className="flex items-center text-[10px] font-bold text-primary-green bg-primary-green/10 border border-primary-green/20 px-3 py-1.5 rounded-lg">
                                      <CheckCircle className="h-3 w-3 mr-1.5" /> Within Ernakulam District
                                    </div>
                                  ) : (
                                    <div className="flex items-center text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg">
                                      <AlertTriangle className="h-3 w-3 mr-1.5" /> Outside Ernakulam District — Review Required
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                                  <AlertTriangle className="h-3 w-3 mr-1.5" /> No coordinates submitted with this product
                                </div>
                              )}

                              {/* Seller Location (for reference) */}
                              {seller && (
                                <div className="pt-2 border-t border-warm-brown/10 space-y-0.5">
                                  <span className="text-[9px] font-bold text-text-dark/40 uppercase tracking-wider">Seller Registered Address (for reference)</span>
                                  <p className="text-[11px] text-text-dark/50 leading-relaxed">
                                    {seller.address} ({seller.lat.toFixed(4)}, {seller.lng.toFixed(4)})
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Verification Documents */}
                          <div className="space-y-2">
                            <span className="text-xs font-bold text-warm-brown uppercase tracking-wider flex items-center">
                              <FileText className="h-3.5 w-3.5 mr-1.5 text-primary-green" /> Verification Documents ({product.documents?.length || 0})
                            </span>
                            {product.documents && product.documents.length > 0 ? (
                              <div className="space-y-2">
                                {product.documents.map((doc, idx) => {
                                  const isImage = doc.url.startsWith("data:image/") || /\.(png|jpg|jpeg|webp|gif)$/i.test(doc.name);
                                  const isPdf = doc.name.toLowerCase().endsWith(".pdf") || doc.url.startsWith("data:application/pdf");
                                  return (
                                    <div key={idx} className="bg-cream-bg border border-warm-brown/10 rounded-xl overflow-hidden">
                                      {/* Document header row */}
                                      <div className="flex items-center justify-between p-3">
                                        <div className="flex items-center space-x-2.5 min-w-0">
                                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                                            isImage ? "bg-blue-50 text-blue-600" : isPdf ? "bg-red-50 text-red-600" : "bg-warm-brown/5 text-warm-brown"
                                          }`}>
                                            <FileText className="h-4 w-4" />
                                          </div>
                                          <div className="min-w-0">
                                            <span className="text-xs font-semibold text-text-dark block truncate max-w-[200px] sm:max-w-sm">
                                              {doc.name}
                                            </span>
                                            <span className="text-[9px] text-text-dark/40 font-medium uppercase">
                                              {isImage ? "Image Document" : isPdf ? "PDF Document" : "Document File"}
                                            </span>
                                          </div>
                                        </div>
                                        <a
                                          href={doc.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          download={doc.name}
                                          className="inline-flex items-center px-3 py-1.5 bg-primary-green/10 text-primary-green text-[10px] font-bold rounded-lg hover:bg-primary-green/20 transition uppercase tracking-wider shrink-0"
                                        >
                                          <ExternalLink className="h-3 w-3 mr-1" /> Open
                                        </a>
                                      </div>
                                      {/* Inline image preview for image documents */}
                                      {isImage && (
                                        <div className="border-t border-warm-brown/5 p-2">
                                          <img
                                            src={doc.url}
                                            alt={doc.name}
                                            className="w-full max-h-48 object-contain rounded-lg bg-white"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="bg-cream-bg border border-amber-200 rounded-xl p-4 flex items-center space-x-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                                <span className="text-xs font-semibold text-amber-700">
                                  No verification documents were uploaded with this product. Consider requesting them before approval.
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Seller Info Card */}
                      {seller && (
                        <div className="bg-cream-bg p-4 rounded-xl border border-warm-brown/5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-primary-green/10 text-primary-green flex items-center justify-center font-serif text-lg font-bold shrink-0">
                            {seller.business_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-grow space-y-0.5">
                            <h4 className="text-sm font-bold text-text-dark">{seller.business_name}</h4>
                            <p className="text-[11px] text-text-dark/50 leading-relaxed italic line-clamp-2">&quot;{seller.story}&quot;</p>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-warm-brown shrink-0">
                            <span className={`px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              seller.is_verified
                                ? "bg-primary-green/10 text-primary-green border border-primary-green/20"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                              {seller.is_verified ? "Verified Maker" : "Pending Verification"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons Row */}
                      <div className="pt-4 border-t border-warm-brown/10 flex flex-wrap items-center justify-between gap-4">
                        <span className="text-[10px] text-text-dark/40 font-bold uppercase">
                          Product ID: {product.id.slice(0, 12)}... | Submitted: {new Date(product.created_at).toLocaleDateString()}
                        </span>

                        <div className="flex items-center space-x-2">
                          {activeTab !== "approved" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleApproval(product.id, "approved"); }}
                              className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-green hover:bg-[#224f3b] text-cream-bg text-xs font-bold rounded-xl shadow-sm transition duration-200 cursor-pointer"
                            >
                              <Check className="h-4 w-4 mr-1.5" /> Approve Listing
                            </button>
                          )}
                          {activeTab !== "rejected" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleApproval(product.id, "rejected"); }}
                              className="inline-flex items-center justify-center px-5 py-2.5 border border-red-200 hover:bg-red-50 text-xs font-bold text-red-600 rounded-xl transition duration-200 cursor-pointer"
                            >
                              <X className="h-4 w-4 mr-1.5" /> Reject Listing
                            </button>
                          )}
                          {activeTab === "rejected" && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleApproval(product.id, "pending"); }}
                              className="inline-flex items-center justify-center px-5 py-2.5 border border-warm-brown/30 hover:bg-warm-brown/5 text-xs font-bold text-warm-brown rounded-xl transition duration-200 cursor-pointer"
                            >
                              <Clock className="h-4 w-4 mr-1.5" /> Re-review
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
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
