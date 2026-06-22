"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSellers, getCategories, addProduct, getSellers as fetchSellers, getAllProductsAdmin } from "@/lib/supabase/client";
import { Seller, Category, Product } from "@/types";
import { PlusCircle, ShoppingBag, CheckCircle, Clock, XCircle, ArrowLeft, Image as ImageIcon, Sparkles, Store, Upload, Link as LinkIcon, X, FileText } from "lucide-react";
import { useAuth } from "@/components/shared/AuthProvider";
import { isInErnakulam, parseGoogleMapsUrl } from "@/lib/utils/distance";

const FALLBACK_PRODUCT_IMAGE = "https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=600&auto=format&fit=crop&q=80"; // Traditional clay pot

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
  const [imagesList, setImagesList] = useState<string[]>([]);
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [documentsList, setDocumentsList] = useState<{ name: string; url: string }[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [stock, setStock] = useState("10");
  const [originDetails, setOriginDetails] = useState("");
  const [productAddress, setProductAddress] = useState("");
  const [productLat, setProductLat] = useState("");
  const [productLng, setProductLng] = useState("");
  const [productGmapsInput, setProductGmapsInput] = useState("");
  const [productLocationOption, setProductLocationOption] = useState<"paste" | "select">("select");

  const detectProductLocation = () => {
    setSubmitError("");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setProductLat(position.coords.latitude.toFixed(6));
          setProductLng(position.coords.longitude.toFixed(6));
          setSubmitError("");
        },
        () => {
          setSubmitError("Could not access your location. Please paste coordinates manually or try again.");
        }
      );
    } else {
      setSubmitError("Geolocation is not supported by your browser.");
    }
  };

  const handleProductGmapsParse = (val: string) => {
    setProductGmapsInput(val);
    const coords = parseGoogleMapsUrl(val);
    if (coords) {
      setProductLat(coords.lat.toString());
      setProductLng(coords.lng.toString());
      setSubmitError("");
    }
  };

  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setSubmitError(`File "${file.name}" is too large. Max size is 5MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setDocumentsList((prev) => [
            ...prev,
            { name: file.name, url: reader.result as string }
          ]);
          setSubmitError("");
        }
      };
      reader.onerror = () => {
        setSubmitError("Failed to read document file.");
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const availableSlots = 5 - imagesList.length;
    if (availableSlots <= 0) {
      setSubmitError("You can upload a maximum of 5 images.");
      return;
    }

    const filesToProcess = Array.from(files).slice(0, availableSlots);

    filesToProcess.forEach((file) => {
      if (!file.type.startsWith("image/")) {
        setSubmitError("Please upload image files only (PNG, JPG, etc.).");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setImagesList((prev) => [...prev, reader.result as string].slice(0, 5));
          setSubmitError("");
        }
      };
      reader.onerror = () => {
        setSubmitError("Failed to read the image file.");
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddCustomUrl = () => {
    if (!customImageUrl.trim()) return;

    if (imagesList.length >= 5) {
      setSubmitError("You can list a maximum of 5 images.");
      return;
    }

    setImagesList((prev) => [...prev, customImageUrl.trim()]);
    setCustomImageUrl("");
    setSubmitError("");
  };

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

    if (documentsList.length === 0) {
      setSubmitError("Please upload at least one verification document (e.g. license, quality test certificate).");
      return;
    }

    if (!productAddress.trim() || !productLat.trim() || !productLng.trim()) {
      setSubmitError("Please set the product sourcing location. Use the location selector to detect your location or paste Google Maps coordinates.");
      setLoading(false);
      return;
    }

    const latitude = parseFloat(productLat);
    const longitude = parseFloat(productLng);

    if (isNaN(latitude) || isNaN(longitude)) {
      setSubmitError("Please enter valid numeric coordinates for sourcing location.");
      return;
    }

    if (!isInErnakulam(latitude, longitude, productAddress.trim())) {
      setSubmitError("MADETRUE currently only operates in Ernakulam district. The product sourcing location must be within Ernakulam (Lat: 9.77 to 10.30, Lng: 76.16 to 77.09).");
      return;
    }

    const finalImages = imagesList.length > 0 ? imagesList : [FALLBACK_PRODUCT_IMAGE];

    try {
      await addProduct({
        seller_id: selectedSellerId,
        name,
        description,
        price: parseFloat(price),
        category,
        images: finalImages,
        tags: selectedTags as any,
        stock: parseInt(stock),
        is_available: true,
        origin_details: originDetails,
        documents: documentsList,
        lat: latitude,
        lng: longitude,
        address: productAddress.trim(),
      });

      setSubmitSuccess(true);

      // Reset form
      setName("");
      setDescription("");
      setPrice("");
      setStock("10");
      setOriginDetails("");
      setSelectedTags([]);
      setImagesList([]);
      setDocumentsList([]);
      setCustomImageUrl("");
      setProductAddress("");
      setProductLat("");
      setProductLng("");
      setProductGmapsInput("");

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
            className={`px-5 py-3 text-sm font-bold border-b-2 transition duration-200 ${activeTab === "list"
              ? "border-primary-green text-primary-green"
              : "border-transparent text-text-dark/50 hover:text-text-dark"
              }`}
          >
            My Products ({myProducts.length})
          </button>
          <button
            onClick={() => setActiveTab("add")}
            className={`px-5 py-3 text-sm font-bold border-b-2 transition duration-200 flex items-center ${activeTab === "add"
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

              {/* Image Upload or URL */}
              <div className="space-y-4">
                <label className="text-xs font-bold text-warm-brown uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center">
                    <ImageIcon className="h-4 w-4 mr-1 text-primary-green" /> Product Images ({imagesList.length}/5)
                  </span>
                  {imagesList.length === 5 && (
                    <span className="text-[10px] text-primary-green font-bold bg-primary-green/10 px-2 py-0.5 rounded-full uppercase">
                      Max Limit Reached
                    </span>
                  )}
                </label>

                <p className="text-[11px] text-text-dark/60 leading-relaxed -mt-2 font-sans">
                  Upload up to 5 images from your device or paste web links. Both are optional. If left blank, a beautiful regional placeholder will be used.
                </p>

                {/* Grid of existing images */}
                {imagesList.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 bg-white border border-warm-brown/10 rounded-xl">
                    {imagesList.map((url, idx) => (
                      <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-warm-brown/10 bg-primary-green/5 group">
                        <img src={url} alt={`Product image ${idx + 1}`} className="w-full h-full object-cover" onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                        }} />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setImagesList(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 transition"
                            title="Remove image"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 text-[8px] bg-black/60 text-white rounded font-bold">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {imagesList.length < 5 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* File Upload Area */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-warm-brown/80 uppercase flex items-center">
                        <Upload className="h-3 w-3 mr-1 text-warm-brown" /> Upload Image File
                      </label>
                      <div className="relative border-2 border-dashed border-warm-brown/20 hover:border-primary-green/50 bg-[#FAF7F2] hover:bg-cream-bg transition rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer min-h-[140px]">
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleFileChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <Upload className="h-6 w-6 text-warm-brown/60 mb-2" />
                        <span className="text-xs font-semibold text-text-dark/80 font-sans">Click or drag images here</span>
                        <span className="text-[10px] text-text-dark/50 mt-1 font-sans">Supports multiple files, up to {5 - imagesList.length} more</span>
                      </div>
                    </div>

                    {/* Web URL input */}
                    <div className="space-y-1.5 flex flex-col justify-start">
                      <label className="text-[11px] font-bold text-warm-brown/80 uppercase flex items-center">
                        <LinkIcon className="h-3 w-3 mr-1 text-warm-brown" /> Add Image Link
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          value={customImageUrl}
                          onChange={(e) => setCustomImageUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="flex-grow px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition font-sans"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomUrl}
                          className="px-4 py-2.5 rounded-xl bg-primary-green text-cream-bg font-semibold text-xs hover:bg-[#224f3b] transition shrink-0 uppercase tracking-wider font-sans"
                        >
                          Add
                        </button>
                      </div>
                      <p className="text-[10px] text-text-dark/50 mt-1 font-sans">
                        Paste any public image link and click "Add".
                      </p>
                    </div>
                  </div>
                )}
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

              {/* Product Sourcing Location (Ernakulam District Only) */}
              <div className="space-y-4 pt-2 border-t border-warm-brown/10">
                <label className="text-xs font-bold text-warm-brown uppercase tracking-wider block">
                  Product Sourcing Location * (Ernakulam District Only)
                </label>
                <p className="text-[11px] text-text-dark/60 leading-relaxed -mt-2 font-sans">
                  Choose how to provide the coordinates for this product's sourcing location.
                </p>

                <div className="space-y-3">
                  {/* Sourcing Physical Address (always visible) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-warm-brown uppercase">Sourcing Physical Address *</label>
                    <textarea
                      required
                      rows={2}
                      value={productAddress}
                      onChange={(e) => setProductAddress(e.target.value)}
                      placeholder="e.g. Organic Pepper Garden, Near InfoPark, Kakkanad, Kochi, Ernakulam, Kerala"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:ring-0 focus:outline-none transition resize-y font-sans"
                    />
                  </div>

                  {/* 2-option toggle buttons */}
                  <div className="bg-primary-green/5 border border-primary-green/10 p-4 rounded-2xl space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setProductLocationOption("paste")}
                        className={`px-3 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer ${productLocationOption === "paste"
                          ? "bg-primary-green text-cream-bg border-primary-green shadow-sm"
                          : "bg-white text-text-dark/70 border-warm-brown/20 hover:border-warm-brown/40"
                          }`}
                      >
                        📋 Paste Link / Coords
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductLocationOption("select")}
                        className={`px-3 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer ${productLocationOption === "select"
                          ? "bg-primary-green text-cream-bg border-primary-green shadow-sm"
                          : "bg-white text-text-dark/70 border-warm-brown/20 hover:border-warm-brown/40"
                          }`}
                      >
                        📍 Use Current / Maps
                      </button>
                    </div>

                    {/* Option 1: Paste Google Maps Link or Coordinates */}
                    {productLocationOption === "paste" && (
                      <div className="space-y-2 animate-fadeIn">
                        <label className="text-[10px] font-bold text-warm-brown uppercase">Paste Google Maps Link or Coordinates</label>
                        <input
                          type="text"
                          value={productGmapsInput}
                          onChange={(e) => handleProductGmapsParse(e.target.value)}
                          placeholder="Paste link e.g., https://www.google.com/maps/place/... or coords: 9.9312, 76.2673"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-white text-xs text-text-dark focus:border-primary-green focus:outline-none transition font-sans"
                        />
                        <div className="bg-white/80 border border-warm-brown/10 rounded-xl p-3 space-y-1.5">
                          <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider">How to get coordinates:</span>
                          <ol className="text-[9px] text-text-dark/60 leading-relaxed space-y-0.5 list-decimal list-inside font-sans">
                            <li>Open <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="text-primary-green underline font-semibold">Google Maps</a> in a new tab</li>
                            <li>Right-click (or long-press on mobile) any location on the map</li>
                            <li>Click the coordinates that appear at the top of the menu to copy them</li>
                            <li>Come back here and paste them in the box above</li>
                          </ol>
                        </div>
                      </div>
                    )}

                    {/* Option 2: Use Current Location / Google Maps */}
                    {productLocationOption === "select" && (
                      <div className="space-y-3 animate-fadeIn">
                        <button
                          type="button"
                          onClick={detectProductLocation}
                          className="w-full px-4 py-3 rounded-xl bg-white border border-warm-brown/20 text-xs font-semibold text-warm-brown hover:bg-warm-brown/5 transition font-sans cursor-pointer flex items-center justify-center gap-2"
                        >
                          📍 Detect My Current Location
                        </button>
                        <a
                          href="https://www.google.com/maps/@9.9312,76.2673,13z"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full px-4 py-3 rounded-xl bg-white border border-warm-brown/20 text-xs font-semibold text-warm-brown hover:bg-warm-brown/5 transition font-sans cursor-pointer flex items-center justify-center gap-2"
                        >
                          🗺️ Find Location on Google Maps
                        </a>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const currentSeller = sellers.find(s => s.id === selectedSellerId);
                              if (currentSeller) {
                                setProductAddress(currentSeller.address);
                                setProductLat(currentSeller.lat.toString());
                                setProductLng(currentSeller.lng.toString());
                              }
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-white border border-warm-brown/20 text-xs font-semibold text-warm-brown hover:bg-warm-brown/5 transition font-sans cursor-pointer"
                          >
                            Copy Seller Address & Coords
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setProductAddress("Central Kochi, Ernakulam, Kerala");
                              setProductLat("9.9312");
                              setProductLng("76.2673");
                              setProductGmapsInput("");
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-white border border-warm-brown/20 text-xs font-semibold text-warm-brown hover:bg-warm-brown/5 transition font-sans cursor-pointer"
                          >
                            Default Kochi Central
                          </button>
                        </div>
                        <div className="bg-white/80 border border-warm-brown/10 rounded-xl p-3 space-y-1.5">
                          <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider">After finding your location on Google Maps:</span>
                          <ol className="text-[9px] text-text-dark/60 leading-relaxed space-y-0.5 list-decimal list-inside font-sans">
                            <li>Right-click (or long-press) on your exact location</li>
                            <li>Click the coordinates to copy them</li>
                            <li>Switch to <button type="button" onClick={() => setProductLocationOption("paste")} className="text-primary-green underline font-semibold cursor-pointer">Paste Link / Coords</button> and paste them there</li>
                          </ol>
                        </div>
                      </div>
                    )}

                    {/* Coordinates confirmation preview */}
                    {productLat && productLng ? (
                      <div className="text-[10px] font-bold text-primary-green bg-primary-green/10 border border-primary-green/20 px-3 py-2 rounded-xl flex items-center justify-between font-sans">
                        <span>📍 Location Set: {parseFloat(productLat).toFixed(4)}, {parseFloat(productLng).toFixed(4)}</span>
                        <span className="uppercase text-[8px] bg-primary-green text-cream-bg px-1.5 py-0.5 rounded-full font-sans">Set</span>
                      </div>
                    ) : (
                      <div className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl flex items-center justify-between font-sans">
                        <span>⚠️ No location set yet — please detect or paste coordinates above</span>
                        <span className="uppercase text-[8px] bg-amber-600 text-white px-1.5 py-0.5 rounded-full font-sans">Required</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Related Verification Documents Section (Mandatory) */}
              <div className="space-y-4 pt-2 border-t border-warm-brown/10">
                <label className="text-xs font-bold text-warm-brown uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center">
                    <FileText className="h-4 w-4 mr-1 text-primary-green" /> Related Verification Documents *
                  </span>
                  {documentsList.length > 0 ? (
                    <span className="text-[10px] text-primary-green font-bold bg-primary-green/10 px-2.5 py-0.5 rounded-full uppercase">
                      {documentsList.length} Document(s) Added
                    </span>
                  ) : (
                    <span className="text-[10px] text-red-600 font-bold bg-red-50 px-2.5 py-0.5 rounded-full uppercase">
                      Required
                    </span>
                  )}
                </label>

                <p className="text-[11px] text-text-dark/60 leading-relaxed -mt-2 font-sans">
                  Please upload certifications, lab test reports, or trade licenses validating the quality and origin of your traditional product. At least one document must be uploaded.
                </p>

                <div className="space-y-3">
                  <div className="relative border-2 border-dashed border-warm-brown/20 hover:border-primary-green/50 bg-[#FAF7F2] hover:bg-cream-bg transition rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer min-h-[110px]">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
                      multiple
                      required={documentsList.length === 0}
                      onChange={handleDocumentChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <Upload className="h-5 w-5 text-warm-brown/60 mb-2" />
                    <span className="text-xs font-semibold text-text-dark/80 font-sans">Click or drag verification files here</span>
                    <span className="text-[10px] text-text-dark/50 mt-1 font-sans">Supports PDF, DOCX, PNG, JPG (Max 5MB each)</span>
                  </div>

                  {documentsList.length > 0 && (
                    <div className="space-y-2">
                      {documentsList.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border border-warm-brown/10 rounded-xl shadow-sm">
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <FileText className="h-4 w-4 text-primary-green shrink-0" />
                            <span className="text-xs font-semibold text-text-dark truncate max-w-[200px] sm:max-w-md font-sans">
                              {doc.name}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setDocumentsList(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 rounded-full text-red-600 hover:bg-red-50 transition shrink-0"
                            title="Remove document"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${isSelected
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
