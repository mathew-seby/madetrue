"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSellers, getCategories, addProduct, getSellers as fetchSellers, getAllProductsAdmin } from "@/lib/supabase/client";
import { Seller, Category, Product } from "@/types";
import { PlusCircle, ShoppingBag, CheckCircle, Clock, XCircle, ArrowLeft, Image as ImageIcon, Sparkles, Store } from "lucide-react";
import { useAuth } from "@/components/shared/AuthProvider";

const IMAGE_PRESETS = [
  { name: "Pickle Jar", url: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=600&auto=format&fit=crop&q=80" },
  { name: "Spices / Cardamom", url: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=600&auto=format&fit=crop&q=80" },
  { name: "Earthen Pottery", url: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=600&auto=format&fit=crop&q=80" },
  { name: "Forest Honey", url: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80" },
  { name: "Traditional Foods", url: "https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=600&auto=format&fit=crop&q=80" },
];

export default function DashboardPage() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"list" | "add">("list");
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [myProducts, setMyProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedSellerId, setSelectedSellerId] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState(IMAGE_PRESETS[0].url);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [stock, setStock] = useState("10");
  const [originDetails, setOriginDetails] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const tagOptions = ["Same Day Delivery", "Pickup Available", "Fresh Today", "Locally Made", "Eco-Friendly"];

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      const fetchedSellers = await getSellers();
      const fetchedCategories = await getCategories();
      const fetchedProducts = await getAllProductsAdmin();

      setSellers(fetchedSellers);
      setCategories(fetchedCategories);

      // Find seller matching active user session
      const matchingSeller = fetchedSellers.find(s => s.user_id === currentUser?.id);

      if (matchingSeller) {
        setSelectedSellerId(matchingSeller.id);
        setMyProducts(fetchedProducts.filter(p => p.seller_id === matchingSeller.id));
      } else if (fetchedSellers.length > 0) {
        setSelectedSellerId(fetchedSellers[0].id);
        setMyProducts(fetchedProducts.filter(p => p.seller_id === fetchedSellers[0].id));
      } else {
        setMyProducts([]);
      }
      
      if (fetchedCategories.length > 0) {
        setCategory(fetchedCategories[0].slug);
      }

      setLoading(false);
    }
    loadDashboardData();
  }, [currentUser]);

  // Update product list when active seller changes
  const handleSellerChange = (sellerId: string) => {
    setSelectedSellerId(sellerId);
    setLoading(true);
    getAllProductsAdmin().then((allProds) => {
      setMyProducts(allProds.filter((p) => p.seller_id === sellerId));
      setLoading(false);
    });
  };


  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitSuccess(false);

    if (!name.trim() || !description.trim() || !price || !category || !stock || !originDetails.trim()) {
      setSubmitError("Please fill out all required fields.");
      return;
    }

    const finalImage = customImageUrl.trim() || imageUrl;

    try {
      await addProduct({
        seller_id: selectedSellerId,
        name,
        description,
        price: parseFloat(price),
        category,
        images: [finalImage],
        tags: selectedTags as any,
        stock: parseInt(stock),
        is_available: true,
        origin_details: originDetails,
      });

      setSubmitSuccess(true);
      
      // Reset form
      setName("");
      setDescription("");
      setPrice("");
      setStock("10");
      setOriginDetails("");
      setSelectedTags([]);
      setCustomImageUrl("");

      // Refresh list
      const updatedProds = await getAllProductsAdmin();
      setMyProducts(updatedProds.filter((p) => p.seller_id === selectedSellerId));

      // Redirect back to list after delay
      setTimeout(() => {
        setActiveTab("list");
        setSubmitSuccess(false);
      }, 2000);
    } catch (err) {
      setSubmitError("Failed to submit product. Please try again.");
    }
  };

  const getStatusBadge = (status?: "pending" | "approved" | "rejected") => {
    switch (status) {
      case "approved":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-primary-green/10 text-primary-green">
            <CheckCircle className="h-3 w-3 mr-1" /> Approved
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
            <XCircle className="h-3 w-3 mr-1" /> Rejected
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
            <Clock className="h-3 w-3 mr-1 animate-pulse" /> Pending Review
          </span>
        );
    }
  };

  return (
    <div className="bg-cream-bg min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Breadcrumbs & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/" className="inline-flex items-center text-xs font-bold text-warm-brown hover:text-primary-green transition uppercase tracking-wider mb-2">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Home
            </Link>
            <h1 className="font-serif text-3xl font-bold text-text-dark">Maker Dashboard</h1>
            <p className="text-xs text-text-dark/60">Manage your traditional Kerala listings and verify approvals.</p>
          </div>

          {/* Seller Selector */}
          <div className="flex items-center space-x-2 shrink-0 bg-white/50 border border-warm-brown/10 px-3 py-1.5 rounded-xl shadow-sm">
            <Store className="h-4 w-4 text-primary-green" />
            <span className="text-xs font-bold text-warm-brown">Acting As:</span>
            {currentUser?.role === "admin" ? (
              <select
                value={selectedSellerId}
                onChange={(e) => handleSellerChange(e.target.value)}
                className="text-xs font-semibold text-text-dark bg-transparent border-none focus:ring-0 focus:outline-none cursor-pointer"
              >
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.business_name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-semibold text-text-dark">
                {sellers.find(s => s.id === selectedSellerId)?.business_name || "Active Maker"}
              </span>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-warm-brown/10">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition duration-200 ${
              activeTab === "list"
                ? "border-primary-green text-primary-green"
                : "border-transparent text-text-dark/50 hover:text-text-dark"
            }`}
          >
            My Products ({myProducts.length})
          </button>
          <button
            onClick={() => setActiveTab("add")}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition duration-200 flex items-center ${
              activeTab === "add"
                ? "border-primary-green text-primary-green"
                : "border-transparent text-text-dark/50 hover:text-text-dark"
            }`}
          >
            <PlusCircle className="h-4 w-4 mr-1.5" /> Submit New Product
          </button>
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="text-center py-12 text-sm text-warm-brown font-semibold">
            Loading dashboard data...
          </div>
        ) : activeTab === "list" ? (
          /* LIST TAB */
          myProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {myProducts.map((product) => (
                <div
                  key={product.id}
                  className="bg-[#FAF7F2] p-5 rounded-2xl border border-warm-brown/10 flex gap-4 hover:border-primary-green/20 transition shadow-sm"
                >
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="w-20 h-20 rounded-xl object-cover border border-warm-brown/5 shrink-0 bg-primary-green/5"
                  />
                  <div className="flex-grow flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-serif text-base font-bold text-text-dark line-clamp-1">{product.name}</h3>
                        <span className="font-semibold text-primary-green shrink-0">₹{product.price}</span>
                      </div>
                      <p className="text-xs text-text-dark/60 line-clamp-2 mt-0.5 leading-relaxed">{product.description}</p>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-warm-brown/5">
                      <span className="text-[10px] text-warm-brown font-bold uppercase tracking-wider">Stock: {product.stock} units</span>
                      {getStatusBadge(product.status)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-[#FAF7F2] border border-warm-brown/10 rounded-2xl space-y-4">
              <ShoppingBag className="h-10 w-10 text-warm-brown/40 mx-auto" />
              <h3 className="font-serif text-lg font-bold text-text-dark">No Products Submitted Yet</h3>
              <p className="text-xs text-text-dark/60 max-w-sm mx-auto leading-relaxed">
                You haven't listed any regional items under this maker profile yet. Click "Submit New Product" above to start selling!
              </p>
            </div>
          )
        ) : (
          /* ADD / SUBMIT PRODUCT TAB */
          <div className="bg-[#FAF7F2] p-6 sm:p-8 rounded-2xl border border-warm-brown/10 shadow-sm">
            <form onSubmit={handleProductSubmit} className="space-y-6">
              
              <h2 className="font-serif text-xl font-bold text-text-dark flex items-center">
                <Sparkles className="h-5 w-5 mr-2 text-accent-gold" />
                Product Submission Form
              </h2>
              
              <p className="text-xs text-text-dark/70 leading-relaxed">
                Provide the details of your home-grown, handmade, or organic items. All submissions will be vetted by the admin console to ensure trust and authenticity before appearing on the public store listing.
              </p>

              {submitSuccess && (
                <div className="p-4 rounded-xl bg-primary-green/10 text-primary-green font-semibold text-xs border border-primary-green/20 animate-pulse">
                  ✓ Success! Product submitted and is pending review. Redirecting to listings...
                </div>
              )}

              {submitError && (
                <div className="p-4 rounded-xl bg-red-50 text-red-700 font-semibold text-xs border border-red-200">
                  ✗ {submitError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* Product Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Traditional Spicy Mango Pickle"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:outline-none transition cursor-pointer"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Price */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Price (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition"
                  />
                </div>

                {/* Stock */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Available Stock *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Image Selection */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-warm-brown uppercase tracking-wider flex items-center">
                  <ImageIcon className="h-4 w-4 mr-1 text-primary-green" /> Product Image Preset *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {IMAGE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setImageUrl(preset.url);
                        setCustomImageUrl("");
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition ${
                        imageUrl === preset.url && !customImageUrl
                          ? "border-primary-green shadow-md scale-[1.02]"
                          : "border-transparent hover:border-warm-brown/20"
                      }`}
                    >
                      <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 py-1 text-center">
                        <span className="text-[9px] text-cream-bg font-bold">{preset.name}</span>
                      </div>
                    </button>
                  ))}
                </div>
                
                <div className="pt-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-warm-brown/80 uppercase">Or Custom Image URL</label>
                  <input
                    type="url"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Maker's Product Story & Description *</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Share details on how this item is curated, the traditional recipes used, or how it preserves natural oils and flavor."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition resize-y"
                />
              </div>

              {/* Origin Details */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Raw Origin & Sourcing Details *</label>
                <textarea
                  required
                  rows={2}
                  value={originDetails}
                  onChange={(e) => setOriginDetails(e.target.value)}
                  placeholder="e.g. Sourced from organic, shade-grown cardamoms cultivated in Idukki slopes, Kerala."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition resize-y"
                />
              </div>

              {/* Tags Multi-select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Badges / Tags</label>
                <div className="flex flex-wrap gap-2">
                  {tagOptions.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                          isSelected
                            ? "bg-primary-green text-cream-bg shadow-sm"
                            : "bg-cream-bg text-text-dark/75 border border-warm-brown/15 hover:border-warm-brown/30"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-4 flex items-center justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary-green text-cream-bg font-semibold text-sm hover:bg-[#224f3b] transition duration-200"
                >
                  Submit for Review
                </button>
              </div>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}
