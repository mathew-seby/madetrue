"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, ArrowLeft, CheckCircle, MapPin, AlertCircle, ShoppingBag, Phone, User as UserIcon, MessageSquare } from "lucide-react";
import { useAuth } from "@/components/shared/AuthProvider";
import { isInErnakulam, parseGoogleMapsUrl } from "@/lib/utils/distance";
import { Product } from "@/types";

interface CartItem {
  product: Product;
  quantity: number;
}

export default function CheckoutPage() {
  const { currentUser } = useAuth();
  const router = useRouter();

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("9.9312"); // central Kochi
  const [lng, setLng] = useState("76.2673"); // central Kochi
  const deliveryType = "delivery";
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi">("cod");
  const [gmapsInput, setGmapsInput] = useState("");
  const [checkoutLocationOption, setCheckoutLocationOption] = useState<"paste" | "select">("select");

  const handleCheckoutGmapsParse = (val: string) => {
    setGmapsInput(val);
    const coords = parseGoogleMapsUrl(val);
    if (coords) {
      setLat(coords.lat.toString());
      setLng(coords.lng.toString());
      setErrorMsg("");
    }
  };

  // Feedback states
  const [errorMsg, setErrorMsg] = useState("");
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [createdOrders, setCreatedOrders] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("madetrue_cart");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setCart(parsed);
        } catch (e) {
          console.error("Failed to parse cart", e);
        }
      }
      setLoadingCart(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setPhone(currentUser.phone || "");
    }
  }, [currentUser]);

  const detectLocation = () => {
    setErrorMsg("");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude.toFixed(6));
          setLng(position.coords.longitude.toFixed(6));
          setAddress((prev) => 
            prev.trim() === "" ? "Detected Coordinates Area" : prev
          );
        },
        () => {
          setErrorMsg("Could not access your location. Pre-filled Kochi central instead.");
          setLat("9.9312");
          setLng("76.2673");
        }
      );
    } else {
      setErrorMsg("Geolocation is not supported by your browser.");
    }
  };

  const getSubtotal = () => {
    return cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    if (!name.trim() || !phone.trim() || !address.trim() || !lat.trim() || !lng.trim()) {
      setErrorMsg("Please fill in all the delivery address details.");
      setSubmitting(false);
      return;
    }

    // Phone validation
    const cleanPhone = phone.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit phone number.");
      setSubmitting(false);
      return;
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      setErrorMsg("Please enter valid numeric coordinates.");
      setSubmitting(false);
      return;
    }

    // Deliverable check: Delivery must be in Ernakulam
    if (!isInErnakulam(latitude, longitude, address.trim())) {
      setErrorMsg("MADETRUE only delivers within Ernakulam district (Lat: 9.77 to 10.30, Lng: 76.16 to 77.09). Please enter a delivery location inside Ernakulam.");
      setSubmitting(false);
      return;
    }

    try {
      // Simulate slight delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      const newOrders = cart.map((item, idx) => ({
        id: `order-${Date.now()}-${idx}`,
        buyer_id: currentUser?.id || "guest-user",
        buyer_name: name.trim(),
        buyer_phone: phone.trim(),
        seller_id: item.product.seller_id,
        product_id: item.product.id,
        product_name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        status: "pending",
        delivery_type: deliveryType,
        address: address.trim(),
        payment_method: paymentMethod,
        whatsapp_notified: false,
        created_at: new Date().toISOString(),
        lat: latitude,
        lng: longitude
      }));

      // Retrieve existing orders
      const storedOrders = localStorage.getItem("madetrue_orders");
      let allOrders = [];
      if (storedOrders) {
        try {
          allOrders = JSON.parse(storedOrders);
        } catch (e) {
          console.error(e);
        }
      }

      // Add new orders
      allOrders = [...newOrders, ...allOrders];
      localStorage.setItem("madetrue_orders", JSON.stringify(allOrders));

      // Clear Cart
      localStorage.removeItem("madetrue_cart");
      window.dispatchEvent(new Event("cart-updated"));

      setCreatedOrders(newOrders);
      setOrderSuccess(true);
    } catch (err) {
      setErrorMsg("Failed to place your order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingCart) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center text-sm font-semibold text-warm-brown bg-cream-bg min-h-screen">
        Verifying secure checkout...
      </div>
    );
  }

  if (orderSuccess) {
    return (
      <div className="bg-cream-bg min-h-screen py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto bg-[#FAF7F2] p-8 sm:p-12 rounded-3xl border border-warm-brown/10 shadow-md text-center space-y-8">
          <div className="w-16 h-16 bg-primary-green/10 text-primary-green rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <h1 className="font-serif text-3xl font-bold text-text-dark">Order Placed Successfully!</h1>
            <p className="text-sm text-text-dark/60 leading-relaxed">
              Thank you for supporting regional producers. Your order has been registered in the database.
            </p>
          </div>

          {/* Orders summary */}
          <div className="border border-warm-brown/10 rounded-2xl p-4 bg-white text-left space-y-3">
            <h3 className="font-serif font-bold text-sm text-text-dark">Your Order details:</h3>
            <div className="divide-y divide-warm-brown/5 text-xs text-text-dark/80">
              {createdOrders.map((ord, idx) => (
                <div key={idx} className="py-2.5 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-text-dark">{ord.product_name}</span>
                    <span className="text-text-dark/60 ml-2">Qty: {ord.quantity}</span>
                  </div>
                  <span className="font-semibold text-primary-green">₹{ord.price * ord.quantity}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-warm-brown/10 pt-2 flex justify-between font-bold text-xs uppercase tracking-wider">
              <span>Total Price</span>
              <span className="text-primary-green">₹{createdOrders.reduce((sum, ord) => sum + ord.price * ord.quantity, 0)}</span>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-warm-brown leading-relaxed font-sans">
              To expedite fulfillment, you can message the maker directly on WhatsApp with your Order ID:
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/products"
                className="px-5 py-3 border border-warm-brown/20 rounded-xl text-xs font-bold text-warm-brown hover:bg-warm-brown/5 transition uppercase tracking-wider font-sans"
              >
                Back to Shop
              </Link>
              <Link
                href="/profile"
                className="px-5 py-3 rounded-xl bg-primary-green text-cream-bg text-xs font-bold hover:bg-[#224f3b] transition uppercase tracking-wider font-sans"
              >
                View My Profile
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cream-bg min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header navigation */}
        <div className="space-y-1">
          <Link href="/cart" className="inline-flex items-center text-xs font-bold text-warm-brown hover:text-primary-green transition uppercase tracking-wider mb-2">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Return to Basket
          </Link>
          <h1 className="font-serif text-3xl font-bold text-text-dark">Checkout</h1>
          <p className="text-xs text-text-dark/60">Fill in your delivery address (deliveries strictly inside Ernakulam).</p>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-16 bg-[#FAF7F2] border border-warm-brown/10 rounded-2xl space-y-4">
            <ShoppingBag className="h-10 w-10 text-warm-brown/40 mx-auto" />
            <h3 className="font-serif text-lg font-bold text-text-dark">Your Basket is Empty</h3>
            <p className="text-xs text-text-dark/60">You cannot proceed to checkout without adding products first.</p>
            <div className="pt-2">
              <Link href="/products" className="inline-flex items-center justify-center px-4 py-2 border border-primary-green rounded-xl text-xs font-bold text-primary-green hover:bg-primary-green hover:text-cream-bg transition duration-200">
                Explore Products
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Delivery address form */}
            <div className="lg:col-span-2 bg-[#FAF7F2] p-6 sm:p-8 rounded-3xl border border-warm-brown/10 shadow-sm">
              <form onSubmit={handlePlaceOrder} className="space-y-6">
                <h2 className="font-serif text-xl font-bold text-text-dark flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-primary-green animate-pulse" />
                  Delivery & Contact Information
                </h2>

                {errorMsg && (
                  <div className="p-4 rounded-xl bg-red-50 text-red-700 font-semibold text-xs border border-red-200 flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-warm-brown uppercase tracking-wider flex items-center">
                      <UserIcon className="h-3.5 w-3.5 mr-1" /> Buyer Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:outline-none transition font-sans"
                    />
                  </div>

                  {/* Phone */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-warm-brown uppercase tracking-wider flex items-center">
                      <Phone className="h-3.5 w-3.5 mr-1" /> Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. 9876543210"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:outline-none transition font-sans"
                    />
                  </div>
                </div>

                {/* Delivery Type */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-warm-brown uppercase tracking-wider block">Fulfillment Method</label>
                  <div className="p-4 bg-primary-green/10 border border-primary-green/20 rounded-xl flex flex-col gap-1">
                    <span className="text-xs font-bold text-primary-green uppercase tracking-wider">Delivery Only</span>
                    <span className="text-[10px] text-text-dark/70 font-medium">We deliver strictly within Ernakulam district (Lat: 9.77 to 10.30, Lng: 76.16 to 77.09)</span>
                  </div>
                </div>

                {/* Delivery Address Details */}
                <div className="space-y-4 pt-2 border-t border-warm-brown/10">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-warm-brown uppercase tracking-wider block">
                      Delivery Destination Address *
                    </label>
                  </div>
                  <div className="space-y-3">
                    {/* Street Address (always visible) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-warm-brown uppercase">Street Address / Landmark *</label>
                      <textarea
                        required
                        rows={2}
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. House No. 24, Pipeline Road, Kakkanad, Kochi, Ernakulam, Kerala"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:outline-none transition resize-y font-sans"
                      />
                    </div>

                    {/* 2-option toggle buttons */}
                    <div className="bg-primary-green/5 border border-primary-green/10 p-4 rounded-2xl space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setCheckoutLocationOption("paste")}
                          className={`px-3 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            checkoutLocationOption === "paste"
                              ? "bg-primary-green text-cream-bg border-primary-green shadow-sm"
                              : "bg-white text-text-dark/70 border-warm-brown/20 hover:border-warm-brown/40"
                          }`}
                        >
                          📋 Paste Link / Coords
                        </button>
                        <button
                          type="button"
                          onClick={() => setCheckoutLocationOption("select")}
                          className={`px-3 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            checkoutLocationOption === "select"
                              ? "bg-primary-green text-cream-bg border-primary-green shadow-sm"
                              : "bg-white text-text-dark/70 border-warm-brown/20 hover:border-warm-brown/40"
                          }`}
                        >
                          📍 Use Current / Maps
                        </button>
                      </div>

                      {/* Option 1: Paste Google Maps Link or Coordinates */}
                      {checkoutLocationOption === "paste" && (
                        <div className="space-y-2 animate-fadeIn">
                          <label className="text-[10px] font-bold text-warm-brown uppercase">Paste Google Maps Link or Coordinates</label>
                          <input
                            type="text"
                            value={gmapsInput}
                            onChange={(e) => handleCheckoutGmapsParse(e.target.value)}
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
                      {checkoutLocationOption === "select" && (
                        <div className="space-y-3 animate-fadeIn">
                          <button
                            type="button"
                            onClick={detectLocation}
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
                          <button
                            type="button"
                            onClick={() => {
                              setAddress("Central Kochi, Ernakulam, Kerala");
                              setLat("9.9312");
                              setLng("76.2673");
                              setGmapsInput("");
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-white border border-warm-brown/20 text-xs font-semibold text-warm-brown hover:bg-warm-brown/5 transition font-sans cursor-pointer"
                          >
                            Default Kochi Central
                          </button>
                          <div className="bg-white/80 border border-warm-brown/10 rounded-xl p-3 space-y-1.5">
                            <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider">After finding your location on Google Maps:</span>
                            <ol className="text-[9px] text-text-dark/60 leading-relaxed space-y-0.5 list-decimal list-inside font-sans">
                              <li>Right-click (or long-press) on your exact location</li>
                              <li>Click the coordinates to copy them</li>
                              <li>Switch to <button type="button" onClick={() => setCheckoutLocationOption("paste")} className="text-primary-green underline font-semibold cursor-pointer">Paste Link / Coords</button> and paste them there</li>
                            </ol>
                          </div>
                        </div>
                      )}

                      {/* Coordinates confirmation preview */}
                      {lat && lng && (
                        <div className="text-[10px] font-bold text-primary-green bg-primary-green/10 border border-primary-green/20 px-3 py-2 rounded-xl flex items-center justify-between font-sans">
                          <span>Coordinates Locked: {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}</span>
                          <span className="uppercase text-[8px] bg-primary-green text-cream-bg px-1.5 py-0.5 rounded-full font-sans">Locked</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-2 pt-2 border-t border-warm-brown/10">
                  <label className="text-xs font-bold text-warm-brown uppercase tracking-wider block">Payment Method *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("cod")}
                      className={`px-4 py-3 rounded-xl border text-xs font-bold uppercase transition ${
                        paymentMethod === "cod"
                          ? "bg-primary-green text-cream-bg border-primary-green shadow-sm"
                          : "bg-white text-text-dark border-warm-brown/15 hover:border-warm-brown/30"
                      }`}
                    >
                      Cash on Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("upi")}
                      className={`px-4 py-3 rounded-xl border text-xs font-bold uppercase transition ${
                        paymentMethod === "upi"
                          ? "bg-primary-green text-cream-bg border-primary-green shadow-sm"
                          : "bg-white text-text-dark border-warm-brown/15 hover:border-warm-brown/30"
                      }`}
                    >
                      UPI / Scan & Pay
                    </button>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-6 py-3.5 rounded-xl bg-primary-green text-cream-bg font-semibold text-sm hover:bg-[#224f3b] transition duration-200 cursor-pointer disabled:opacity-50 uppercase tracking-wider font-sans flex items-center justify-center"
                  >
                    {submitting ? "Processing Checkout..." : "Place Order & Route (COD/UPI)"}
                  </button>
                </div>
              </form>
            </div>

            {/* Cart summary preview */}
            <div className="bg-[#FAF7F2] p-6 rounded-3xl border border-warm-brown/10 shadow-sm space-y-4">
              <h2 className="font-serif text-lg font-bold text-text-dark">Order Items</h2>
              <div className="divide-y divide-warm-brown/5 max-h-[300px] overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div key={item.product.id} className="py-3 flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-text-dark block truncate">{item.product.name}</span>
                      <span className="text-[10px] text-text-dark/50 font-medium">Quantity: {item.quantity}</span>
                    </div>
                    <span className="text-xs font-semibold text-primary-green shrink-0">₹{item.product.price * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-warm-brown/10 pt-3 flex justify-between font-serif font-bold text-base text-text-dark">
                <span>Subtotal</span>
                <span className="text-primary-green">₹{getSubtotal()}</span>
              </div>
              <div className="p-3 bg-primary-green/5 border border-primary-green/10 rounded-xl flex items-start space-x-2 text-[10px] text-text-dark/70 font-sans">
                <AlertCircle className="h-4 w-4 text-primary-green shrink-0 mt-0.5" />
                <span>
                  Delivery is restricted to Ernakulam district only. Please specify coordinates/address within this region.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
