"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreditCard, ArrowLeft, CheckCircle, MapPin, AlertCircle, ShoppingBag, Phone, User as UserIcon, MessageSquare } from "lucide-react";
import { useAuth } from "@/components/shared/AuthProvider";
import { isInErnakulam } from "@/lib/utils/distance";
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
  const [deliveryType, setDeliveryType] = useState<"delivery" | "pickup">("delivery");
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi">("cod");

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

    // Deliverable check: If delivery type is "delivery", it must be in Ernakulam
    if (deliveryType === "delivery" && !isInErnakulam(latitude, longitude, address.trim())) {
      setErrorMsg("MADETRUE only delivers within Ernakulam district (Lat: 9.77 to 10.30, Lng: 76.16 to 77.09). Please enter a delivery location inside Ernakulam or choose Pickup.");
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
                  <label className="text-xs font-bold text-warm-brown uppercase tracking-wider block">Fulfillment Method *</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDeliveryType("delivery")}
                      className={`px-4 py-3 rounded-xl border text-xs font-bold uppercase transition flex flex-col items-center justify-center gap-1 ${
                        deliveryType === "delivery"
                          ? "bg-primary-green text-cream-bg border-primary-green shadow-sm"
                          : "bg-white text-text-dark border-warm-brown/15 hover:border-warm-brown/30"
                      }`}
                    >
                      <span>Delivery</span>
                      <span className="text-[9px] opacity-75 lowercase font-medium">to Ernakulam address only</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeliveryType("pickup")}
                      className={`px-4 py-3 rounded-xl border text-xs font-bold uppercase transition flex flex-col items-center justify-center gap-1 ${
                        deliveryType === "pickup"
                          ? "bg-primary-green text-cream-bg border-primary-green shadow-sm"
                          : "bg-white text-text-dark border-warm-brown/15 hover:border-warm-brown/30"
                      }`}
                    >
                      <span>Self Pickup</span>
                      <span className="text-[9px] opacity-75 lowercase font-medium">from maker's center</span>
                    </button>
                  </div>
                </div>

                {/* Delivery Address Details */}
                <div className="space-y-4 pt-2 border-t border-warm-brown/10">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-warm-brown uppercase tracking-wider block">
                      {deliveryType === "delivery" ? "Delivery Destination Address *" : "Pickup Confirmation Address *"}
                    </label>
                  </div>

                  <div className="space-y-3">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-warm-brown uppercase">Latitude Coordinate *</label>
                        <input
                          type="text"
                          required
                          value={lat}
                          onChange={(e) => setLat(e.target.value)}
                          placeholder="e.g. 9.9312"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:outline-none transition font-sans"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-warm-brown uppercase">Longitude Coordinate *</label>
                        <input
                          type="text"
                          required
                          value={lng}
                          onChange={(e) => setLng(e.target.value)}
                          placeholder="e.g. 76.2673"
                          className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:outline-none transition font-sans"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={detectLocation}
                        className="px-3.5 py-1.5 rounded-xl bg-white border border-warm-brown/20 text-xs font-semibold text-warm-brown hover:bg-warm-brown/5 transition font-sans cursor-pointer"
                      >
                        Auto-Detect Coordinates
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAddress("Central Kochi, Ernakulam, Kerala");
                          setLat("9.9312");
                          setLng("76.2673");
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-white border border-warm-brown/20 text-xs font-semibold text-warm-brown hover:bg-warm-brown/5 transition font-sans cursor-pointer"
                      >
                        Default Kochi Central
                      </button>
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
                  Delivery is restricted to Ernakulam district only. Choosing Self Pickup bypasses delivery coordinate rules.
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
