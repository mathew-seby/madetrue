"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/shared/AuthProvider";
import { useRouter } from "next/navigation";
import { User as UserIcon, ShieldCheck, Mail, Phone, LogOut, Store, ArrowLeft, ArrowRight, Heart, Sparkles, Settings, Globe, ChevronDown, ChevronUp, Lock } from "lucide-react";
import Link from "next/link";
import { getSellers } from "@/lib/supabase/client";
import { Seller } from "@/types";
import { isInErnakulam, parseGoogleMapsUrl } from "@/lib/utils/distance";

export default function ProfilePage() {
  const { currentUser, logout, upgradeCurrentUserToSeller, updateUser, requestPasswordReset } = useAuth();
  const router = useRouter();

  // Onboarding Form State
  const [businessName, setBusinessName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [story, setStory] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("9.9312"); // default Kochi
  const [lng, setLng] = useState("76.2673"); // default Kochi
  const [gmapsInput, setGmapsInput] = useState("");
  const [locationOption, setLocationOption] = useState<"paste" | "select">("select");

  // Feedback
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Active Seller Profile info
  const [sellerProfile, setSellerProfile] = useState<Seller | null>(null);

  const detectOnboardingLocation = () => {
    setErrorMsg("");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude.toFixed(6));
          setLng(position.coords.longitude.toFixed(6));
          setErrorMsg("");
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

  const handleGmapsParse = (val: string) => {
    setGmapsInput(val);
    const coords = parseGoogleMapsUrl(val);
    if (coords) {
      setLat(coords.lat.toString());
      setLng(coords.lng.toString());
      setErrorMsg("");
    }
  };

  useEffect(() => {
    async function loadSellerInfo() {
      if (currentUser && currentUser.role === "seller") {
        try {
          const list = await getSellers();
          const found = list.find((s) => s.user_id === currentUser.id);
          if (found) {
            setSellerProfile(found);
          }
        } catch (e) {
          console.error("Failed to load seller info", e);
        }
      }
    }
    loadSellerInfo();
  }, [currentUser]);

  useEffect(() => {
    const handleScrollToSection = () => {
      if (window.location.hash === "#become-maker") {
        setTimeout(() => {
          const element = document.getElementById("become-maker");
          if (element) {
            const yOffset = -80; // 80px offset (64px navbar height + 16px padding)
            const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
            window.scrollTo({ top: y, behavior: "smooth" });
          }
        }, 150);
      }
    };

    handleScrollToSection();

    window.addEventListener("hashchange", handleScrollToSection);
    return () => {
      window.removeEventListener("hashchange", handleScrollToSection);
    };
  }, []);

  if (!currentUser) return null;

  const handleRegisterSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    if (!businessName.trim() || !story.trim() || !whatsappNumber.trim() || !address.trim()) {
      setErrorMsg("Please fill in all the required details to register.");
      setLoading(false);
      return;
    }

    // Simple phone check
    const cleanPhone = whatsappNumber.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit WhatsApp contact number.");
      setLoading(false);
      return;
    }

    const latitude = parseFloat(lat) || 9.9312;
    const longitude = parseFloat(lng) || 76.2673;

    if (!isInErnakulam(latitude, longitude, address.trim())) {
      setErrorMsg("MADETRUE currently only operates in Ernakulam district. Your business location must be within Ernakulam.");
      setLoading(false);
      return;
    }

    try {
      await upgradeCurrentUserToSeller(
        businessName.trim(),
        story.trim(),
        whatsappNumber.trim(),
        address.trim(),
        latitude,
        longitude
      );
      setSuccess(true);
      setTimeout(() => {
        // Redirect to seller dashboard on success
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to register maker profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-cream-bg min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-xs font-bold text-warm-brown hover:text-primary-green transition uppercase tracking-wider">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Return to Marketplace
          </Link>
          <button
            onClick={logout}
            className="inline-flex items-center text-xs font-bold text-red-600 hover:text-red-800 transition uppercase tracking-wider cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 mr-1" /> Sign Out
          </button>
        </div>

        {/* Profile Card Header */}
        <div className="bg-[#FAF7F2] p-6 sm:p-8 rounded-3xl border border-warm-brown/10 shadow-sm flex flex-col sm:flex-row items-center gap-6">
          {currentUser.profile_photo_url ? (
            <img
              src={currentUser.profile_photo_url}
              alt={currentUser.name}
              className="w-16 h-16 rounded-full object-cover border border-warm-brown/10 shrink-0 bg-primary-green/5"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary-green/10 text-primary-green flex items-center justify-center font-serif text-2xl font-bold shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-center sm:text-left flex-grow space-y-1">
            <h1 className="font-serif text-2xl font-bold text-text-dark">{currentUser.name}</h1>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-text-dark/60 font-medium">
              {currentUser.email && (
                <span className="flex items-center">
                  <Mail className="h-3.5 w-3.5 mr-1 text-primary-green" /> {currentUser.email}
                </span>
              )}
              {currentUser.phone && (
                <span className="flex items-center">
                  <Phone className="h-3.5 w-3.5 mr-1 text-primary-green" /> {currentUser.phone}
                </span>
              )}
            </div>
          </div>
          <div className="shrink-0">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              currentUser.role === "seller" 
                ? "bg-primary-green/10 text-primary-green border border-primary-green/20"
                : currentUser.role === "admin"
                ? "bg-amber-100 text-amber-800 border border-amber-200"
                : "bg-warm-brown/10 text-warm-brown border border-warm-brown/20"
            }`}>
              {currentUser.role === "seller" ? "Verified Maker" : currentUser.role}
            </span>
          </div>
        </div>

        {/* Section 1: Manage Account Settings Button Link */}
        <div className="bg-[#FAF7F2] p-6 sm:p-8 rounded-3xl border border-warm-brown/10 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-serif text-xl font-bold text-text-dark flex items-center">
              <Settings className="h-5.5 w-5.5 mr-2 text-primary-green" />
              Account Settings & Preferences
            </h2>
            <p className="text-xs text-text-dark/60">
              Configure your display name, language preferences, password verification, and profile avatar.
            </p>
          </div>
          <Link
            href="/profile/settings"
            className="w-full sm:w-auto px-5 py-3 rounded-xl bg-primary-green text-cream-bg font-semibold text-xs hover:bg-[#224f3b] transition duration-200 text-center uppercase tracking-wider font-sans shadow-sm hover:shadow"
          >
            Configure Settings
          </Link>
        </div>

        {/* Section 2: Become a Maker / Seller Profile Details */}
        {currentUser.role !== "seller" && currentUser.role !== "admin" ? (
          
          /* BUYER REGISTER AS MAKER ONBOARDING */
          <div id="become-maker" className="bg-[#FAF7F2] p-6 sm:p-8 rounded-3xl border border-warm-brown/10 shadow-sm space-y-6">
            
            <div className="space-y-2">
              <h2 className="font-serif text-xl font-bold text-text-dark flex items-center">
                <Store className="h-5.5 w-5.5 mr-2 text-primary-green" />
                Become a MADETRUE Maker
              </h2>
              <p className="text-xs text-text-dark/70 leading-relaxed max-w-xl">
                Ready to directly connect with Kerala families? Share your homegrown cardamom, traditional mango pickles, raw Wayanad honey, or river-clay pottery. Fill out your details below to establish your profile.
              </p>
            </div>

            {success && (
              <div className="p-4 rounded-xl bg-primary-green/10 text-primary-green font-semibold text-xs border border-primary-green/20 flex items-center space-x-2 animate-pulse">
                <Heart className="h-5 w-5 text-primary-green shrink-0 animate-bounce" />
                <span>Congratulations! Your producer profile is now activated. Navigating to Dashboard...</span>
              </div>
            )}

            {errorMsg && (
              <div className="p-4 rounded-xl bg-red-50 text-red-700 font-semibold text-xs border border-red-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRegisterSeller} className="space-y-4 pt-2">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Business name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Business Name *</label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Devaki's Traditional Earthen Pots"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:outline-none transition"
                  />
                </div>

                {/* Whatsapp contact number */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">WhatsApp Contact Number *</label>
                  <input
                    type="tel"
                    required
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="e.g. 9876543212"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:outline-none transition"
                  />
                  <span className="text-[10px] text-warm-brown/60 block leading-tight">
                    For order coordination and updates.
                  </span>
                </div>
              </div>

              {/* Story / Heritage */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Your Maker Story *</label>
                <textarea
                  required
                  rows={4}
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                  placeholder="Tell your story. How did you start? What makes your produce raw, pure, and traditional? Do you use ancestral recipes or wild forest sourcing?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:outline-none transition resize-y"
                />
              </div>

              {/* Address */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Physical/Farm Address *</label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter full physical address. e.g., Kumbham Pottery Village, Nilambur, Malappuram, Kerala"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:outline-none transition resize-y"
                />
              </div>

              {/* Location Lat/Lng coordinates for searches */}
              <div className="bg-primary-green/5 border border-primary-green/10 p-5 rounded-2xl space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-primary-green uppercase tracking-wider flex items-center">
                    <Sparkles className="h-4 w-4 mr-1 text-accent-gold" /> Proximity Coordinates (Leaflet Map Integration)
                  </span>
                  <p className="text-[11px] text-text-dark/75 leading-relaxed">
                    Choose how you'd like to set your location coordinates for nearby buyer discovery.
                  </p>
                </div>

                {/* 2-option toggle buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocationOption("paste")}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      locationOption === "paste"
                        ? "bg-primary-green text-cream-bg border-primary-green shadow-sm"
                        : "bg-white text-text-dark/70 border-warm-brown/20 hover:border-warm-brown/40"
                    }`}
                  >
                    📋 Paste Link / Coords
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationOption("select")}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      locationOption === "select"
                        ? "bg-primary-green text-cream-bg border-primary-green shadow-sm"
                        : "bg-white text-text-dark/70 border-warm-brown/20 hover:border-warm-brown/40"
                    }`}
                  >
                    📍 Use Current / Maps
                  </button>
                </div>

                {/* Option 1: Paste Google Maps Link or Coordinates */}
                {locationOption === "paste" && (
                  <div className="space-y-2 animate-fadeIn">
                    <label className="text-[10px] font-bold text-warm-brown uppercase">Paste Google Maps Link or Coordinates</label>
                    <input
                      type="text"
                      value={gmapsInput}
                      onChange={(e) => handleGmapsParse(e.target.value)}
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
                {locationOption === "select" && (
                  <div className="space-y-3 animate-fadeIn">
                    <button
                      type="button"
                      onClick={detectOnboardingLocation}
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
                    <div className="bg-white/80 border border-warm-brown/10 rounded-xl p-3 space-y-1.5">
                      <span className="text-[9px] font-bold text-warm-brown uppercase tracking-wider">After finding your location on Google Maps:</span>
                      <ol className="text-[9px] text-text-dark/60 leading-relaxed space-y-0.5 list-decimal list-inside font-sans">
                        <li>Right-click (or long-press) on your exact location</li>
                        <li>Click the coordinates to copy them</li>
                        <li>Switch to <button type="button" onClick={() => setLocationOption("paste")} className="text-primary-green underline font-semibold cursor-pointer">Paste Link / Coords</button> and paste them there</li>
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

              {/* Submit Action */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary-green text-cream-bg font-semibold text-sm hover:bg-[#224f3b] transition duration-200 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                >
                  <span>{loading ? "Activating Shop..." : "Activate Maker Profile"}</span>
                  {!loading && <ArrowRight className="h-4 w-4" />}
                </button>
              </div>

            </form>

          </div>

        ) : (
          
          /* SELLER ACTIVE PROFILE VIEW */
          <div className="bg-[#FAF7F2] p-6 sm:p-8 rounded-3xl border border-warm-brown/10 shadow-sm space-y-6">
            
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-warm-brown/10 pb-5">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-primary-green uppercase tracking-wider">Business profile status</span>
                <h2 className="font-serif text-xl font-bold text-text-dark flex items-center">
                  <Store className="h-5.5 w-5.5 mr-2 text-primary-green animate-pulse" />
                  Your Maker Business Profile
                </h2>
              </div>
              
              <Link
                href="/dashboard"
                className="inline-flex items-center text-xs font-bold px-4 py-2 bg-primary-green text-cream-bg rounded-xl hover:bg-[#224f3b] transition tracking-wider"
              >
                Go to Maker Dashboard <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              {/* Business Name */}
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-warm-brown uppercase tracking-wider">Business/Farm Name</span>
                <p className="text-sm font-semibold text-text-dark">{sellerProfile ? sellerProfile.business_name : "Loading..."}</p>
              </div>

              {/* Whatsapp */}
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-warm-brown uppercase tracking-wider">WhatsApp Number</span>
                <p className="text-sm font-semibold text-text-dark">{sellerProfile ? sellerProfile.whatsapp_number : currentUser.phone || "Linked"}</p>
              </div>

              {/* Verification status */}
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-warm-brown uppercase tracking-wider">Moderation Status</span>
                <p className="text-sm font-bold text-primary-green flex items-center">
                  <ShieldCheck className="h-4 w-4 mr-1 text-primary-green" /> 
                  {sellerProfile?.is_verified ? "Verified Maker" : "Pending Vetting"}
                </p>
              </div>

            </div>

            {/* Story */}
            <div className="space-y-1 bg-cream-bg p-4 rounded-2xl border border-warm-brown/5">
              <span className="text-[10px] font-bold text-warm-brown uppercase tracking-wider">Your Story</span>
              <p className="text-xs text-text-dark/80 leading-relaxed italic">
                "{sellerProfile ? sellerProfile.story : "Loading story..."}"
              </p>
            </div>

          </div>

        )}

      </div>
    </div>
  );
}
