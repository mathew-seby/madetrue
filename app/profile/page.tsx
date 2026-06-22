"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/shared/AuthProvider";
import { useRouter } from "next/navigation";
import { User as UserIcon, ShieldCheck, Mail, Phone, LogOut, Store, ArrowLeft, ArrowRight, Heart, Sparkles, Settings, Globe, ChevronDown, ChevronUp, Lock } from "lucide-react";
import Link from "next/link";
import { getSellers } from "@/lib/supabase/client";
import { Seller } from "@/types";

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
  
  // Feedback
  const [errorMsg, setErrorMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Manage Account Settings State
  const [editName, setEditName] = useState("");
  const [editOldPassword, setEditOldPassword] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [languagePref, setLanguagePref] = useState(currentUser?.language_pref || "en");
  const [showSettings, setShowSettings] = useState(false);
  const [accountErrorMsg, setAccountErrorMsg] = useState("");
  const [accountSuccessMsg, setAccountSuccessMsg] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);

  // Active Seller Profile info
  const [sellerProfile, setSellerProfile] = useState<Seller | null>(null);

  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name);
      setLanguagePref(currentUser.language_pref || "en");
    }
  }, [currentUser]);

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

  if (!currentUser) return null;

  const handleForgotPassword = async () => {
    try {
      setAccountLoading(true);
      setAccountErrorMsg("");
      setAccountSuccessMsg("");
      const identifier = currentUser.email || currentUser.phone;
      if (!identifier) {
        setAccountErrorMsg("No email or phone contact found on your account.");
        return;
      }
      await requestPasswordReset(identifier);
      setAccountSuccessMsg(`A password reset link has been sent to your registered contact: ${identifier}`);
    } catch (err: any) {
      setAccountErrorMsg(err.message || "Failed to trigger password reset.");
    } finally {
      setAccountLoading(false);
    }
  };

  const handleSaveAccountChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setAccountErrorMsg("");
    setAccountSuccessMsg("");
    setAccountLoading(true);

    if (!editName.trim()) {
      setAccountErrorMsg("Name cannot be empty.");
      setAccountLoading(false);
      return;
    }
    if (editName.trim().length < 2) {
      setAccountErrorMsg("Name must be at least 2 characters long.");
      setAccountLoading(false);
      return;
    }

    if (editPassword) {
      if (editPassword.length < 6) {
        setAccountErrorMsg("New password must be at least 6 characters long.");
        setAccountLoading(false);
        return;
      }
      if (editPassword !== editConfirmPassword) {
        setAccountErrorMsg("Passwords do not match.");
        setAccountLoading(false);
        return;
      }
      if (!editOldPassword) {
        setAccountErrorMsg("Old password is required to change password.");
        setAccountLoading(false);
        return;
      }
    }

    try {
      await updateUser(editName.trim(), editPassword || undefined, editOldPassword || undefined, languagePref);
      setAccountSuccessMsg("Account settings saved successfully!");
      setEditPassword("");
      setEditConfirmPassword("");
      setEditOldPassword("");
    } catch (err: any) {
      setAccountErrorMsg(err.message || "Failed to update profile details.");
    } finally {
      setAccountLoading(false);
    }
  };

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

    try {
      await upgradeCurrentUserToSeller(
        businessName.trim(),
        story.trim(),
        whatsappNumber.trim(),
        address.trim(),
        parseFloat(lat) || 9.9312,
        parseFloat(lng) || 76.2673
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
          <div className="w-16 h-16 rounded-full bg-primary-green/10 text-primary-green flex items-center justify-center font-serif text-2xl font-bold shrink-0">
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
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

        {/* Section 1: Manage Account Settings */}
        <div className="bg-[#FAF7F2] p-6 sm:p-8 rounded-3xl border border-warm-brown/10 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="font-serif text-xl font-bold text-text-dark flex items-center">
                <Settings className="h-5.5 w-5.5 mr-2 text-primary-green" />
                Account Settings & Preferences
              </h2>
              <p className="text-xs text-text-dark/60">
                Update display name, credentials validation, and language preferences.
              </p>
            </div>
            <button
              onClick={() => {
                setShowSettings(!showSettings);
                setAccountSuccessMsg("");
                setAccountErrorMsg("");
              }}
              className="px-4 py-2 bg-cream-bg hover:bg-warm-brown/5 border border-warm-brown/15 text-xs font-bold text-warm-brown rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-sm font-sans"
            >
              <span>{showSettings ? "Hide Settings" : "Configure Settings"}</span>
              {showSettings ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {showSettings && (
            <div className="space-y-6 pt-4 border-t border-warm-brown/5">
              {/* Account Metadata / Read-only Card */}
              <div className="bg-white p-4 rounded-2xl border border-warm-brown/10 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-sans">
                <div>
                  <span className="text-[10px] text-warm-brown font-bold uppercase tracking-wider block">Account Role</span>
                  <span className="font-semibold text-text-dark capitalize mt-0.5 block">{currentUser.role}</span>
                </div>
                <div>
                  <span className="text-[10px] text-warm-brown font-bold uppercase tracking-wider block">Language Preferred</span>
                  <span className="font-semibold text-text-dark mt-0.5 block">
                    {currentUser.language_pref === "ml" ? "മലയാളം (Malayalam)" : "English"}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-warm-brown font-bold uppercase tracking-wider block">Unique User ID</span>
                  <span className="font-mono text-[11px] text-text-dark/80 mt-0.5 block truncate" title={currentUser.id}>
                    {currentUser.id}
                  </span>
                </div>
              </div>

              {accountSuccessMsg && (
                <div className="p-3.5 rounded-xl bg-primary-green/10 text-primary-green text-xs font-semibold border border-primary-green/20">
                  ✓ {accountSuccessMsg}
                </div>
              )}

              {accountErrorMsg && (
                <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                  ✗ {accountErrorMsg}
                </div>
              )}

              <form onSubmit={handleSaveAccountChanges} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Display Name *</label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Your display name"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:outline-none transition font-sans"
                    />
                  </div>

                  {/* Language Selection */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-warm-brown uppercase tracking-wider flex items-center">
                      <Globe className="h-4 w-4 mr-1 text-primary-green" /> Language Preference
                    </label>
                    <select
                      value={languagePref}
                      onChange={(e) => setLanguagePref(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:outline-none transition cursor-pointer font-sans"
                    >
                      <option value="en">English</option>
                      <option value="ml">മലയാളം (Malayalam)</option>
                    </select>
                  </div>
                </div>

                {/* Password Change Block */}
                <div className="bg-cream-bg/40 p-4 rounded-2xl border border-warm-brown/5 space-y-4">
                  <span className="text-[10px] font-bold text-warm-brown uppercase tracking-wider block flex items-center">
                    <Lock className="h-3.5 w-3.5 mr-1 text-primary-green" /> Change Password
                  </span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Old Password */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Old Password</label>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-[10px] text-primary-green hover:underline font-bold uppercase tracking-wider"
                        >
                          Forgot?
                        </button>
                      </div>
                      <input
                        type="password"
                        value={editOldPassword}
                        onChange={(e) => setEditOldPassword(e.target.value)}
                        placeholder="Current password"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-white text-sm text-text-dark focus:border-primary-green focus:outline-none transition font-sans"
                      />
                    </div>

                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">New Password</label>
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="New (min 6 chars)"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-white text-sm text-text-dark focus:border-primary-green focus:outline-none transition font-sans"
                      />
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-warm-brown uppercase tracking-wider">Confirm New Password</label>
                      <input
                        type="password"
                        value={editConfirmPassword}
                        onChange={(e) => setEditConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-white text-sm text-text-dark focus:border-primary-green focus:outline-none transition font-sans"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={accountLoading}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary-green text-cream-bg font-semibold text-sm hover:bg-[#224f3b] transition duration-200 cursor-pointer disabled:opacity-50 font-sans"
                  >
                    {accountLoading ? "Saving Changes..." : "Save Settings"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Section 2: Become a Maker / Seller Profile Details */}
        {currentUser.role !== "seller" && currentUser.role !== "admin" ? (
          
          /* BUYER REGISTER AS MAKER ONBOARDING */
          <div className="bg-[#FAF7F2] p-6 sm:p-8 rounded-3xl border border-warm-brown/10 shadow-sm space-y-6">
            
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

              {/* Location Lat/Lng coordinates for nearby searches */}
              <div className="bg-primary-green/5 border border-primary-green/10 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1">
                  <span className="text-[10px] font-bold text-primary-green uppercase tracking-wider flex items-center">
                    <Sparkles className="h-4 w-4 mr-1 text-accent-gold" /> Proximity Coordinates (Leaflet Map Integration)
                  </span>
                  <p className="text-[11px] text-text-dark/75 leading-relaxed">
                    Set your coordinates so local buyers can locate your farm on our Leaflet map. Pre-filled with Kochi central coordinates.
                  </p>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-warm-brown uppercase">Latitude</label>
                  <input
                    type="text"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="9.9312"
                    className="w-full px-3 py-1.5 rounded-lg border border-warm-brown/15 bg-white text-xs text-text-dark focus:border-primary-green focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-warm-brown uppercase">Longitude</label>
                  <input
                    type="text"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="76.2673"
                    className="w-full px-3 py-1.5 rounded-lg border border-warm-brown/15 bg-white text-xs text-text-dark focus:border-primary-green focus:outline-none"
                  />
                </div>
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
