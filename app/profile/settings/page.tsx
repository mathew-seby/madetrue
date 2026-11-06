"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/shared/AuthProvider";
import { useRouter } from "next/navigation";
import { ArrowLeft, User as UserIcon, Settings, Globe, Lock, Upload, Link as LinkIcon, X, Sparkles } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  const { currentUser, updateUser, requestPasswordReset } = useAuth();
  const router = useRouter();

  // Form State
  const [editName, setEditName] = useState("");
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [uploadedPhoto, setUploadedPhoto] = useState("");
  const [languagePref, setLanguagePref] = useState("en");
  
  // Passwords
  const [editOldPassword, setEditOldPassword] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");

  // Feedback States
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Prefill the editable profile fields when the signed-in user loads/changes
  // ("adjusting state during render" pattern — no cascading effect needed).
  const [lastPrefilledUser, setLastPrefilledUser] = useState(currentUser);
  if (currentUser !== lastPrefilledUser) {
    setLastPrefilledUser(currentUser);
    if (currentUser) {
      setEditName(currentUser.name);
      setProfilePhotoUrl(currentUser.profile_photo_url || "");
      setLanguagePref(currentUser.language_pref || "en");
    }
  }

  // Send anyone without a session back to the profile screen. Navigation is
  // a side effect, so it stays inside an effect rather than during render.
  useEffect(() => {
    if (!currentUser) {
      router.push("/profile");
    }
  }, [currentUser, router]);

  if (!currentUser) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload an image file (PNG, JPG, etc.).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg("Display picture is too large. Max size is 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setUploadedPhoto(reader.result);
        setErrorMsg("");
      }
    };
    reader.onerror = () => {
      setErrorMsg("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleForgotPassword = async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");
      const identifier = currentUser.email || currentUser.phone;
      if (!identifier) {
        setErrorMsg("No registered email or phone contact found on your account.");
        return;
      }
      await requestPasswordReset(identifier);
      setSuccessMsg(`A password reset link has been successfully logged/sent to: ${identifier}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to trigger password reset request.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    if (!editName.trim()) {
      setErrorMsg("Display Name cannot be empty.");
      setLoading(false);
      return;
    }
    if (editName.trim().length < 2) {
      setErrorMsg("Display Name must be at least 2 characters long.");
      setLoading(false);
      return;
    }

    if (editPassword) {
      if (editPassword.length < 6) {
        setErrorMsg("New password must be at least 6 characters long.");
        setLoading(false);
        return;
      }
      if (editPassword !== editConfirmPassword) {
        setErrorMsg("New passwords do not match.");
        setLoading(false);
        return;
      }
      if (!editOldPassword) {
        setErrorMsg("Old password is required to change passcode credentials.");
        setLoading(false);
        return;
      }
    }

    const finalPhoto = uploadedPhoto || profilePhotoUrl.trim() || undefined;

    try {
      await updateUser(
        editName.trim(), 
        editPassword || undefined, 
        editOldPassword || undefined, 
        languagePref, 
        finalPhoto
      );
      setSuccessMsg("Settings updated successfully! Redirecting to profile...");
      setEditOldPassword("");
      setEditPassword("");
      setEditConfirmPassword("");
      
      setTimeout(() => {
        router.push("/profile");
      }, 1500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update profile configurations.");
    } finally {
      setLoading(false);
    }
  };

  const activePhotoSrc = uploadedPhoto || profilePhotoUrl.trim();

  return (
    <div className="bg-cream-bg min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Navigation breadcrumb */}
        <div className="flex items-center">
          <Link href="/profile" className="inline-flex items-center text-xs font-bold text-warm-brown hover:text-primary-green transition uppercase tracking-wider">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to Profile
          </Link>
        </div>

        {/* Header section */}
        <div className="space-y-1">
          <h1 className="font-serif text-3xl font-bold text-text-dark flex items-center">
            <Settings className="h-7 w-7 mr-2 text-primary-green" /> Configure Profile Settings
          </h1>
          <p className="text-xs text-text-dark/60">Configure your public information, preferences, and secure credentials.</p>
        </div>

        {/* Configurations Card */}
        <div className="bg-[#FAF7F2] p-6 sm:p-8 rounded-3xl border border-warm-brown/10 shadow-sm">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            
            {successMsg && (
              <div className="p-3.5 rounded-xl bg-primary-green/10 text-primary-green text-xs font-semibold border border-primary-green/20">
                ✓ {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
                ✗ {errorMsg}
              </div>
            )}

            {/* Profile Avatar / DP Section */}
            <div className="space-y-4 pb-6 border-b border-warm-brown/10">
              <label className="text-xs font-bold text-warm-brown uppercase tracking-wider block">Profile Display Photo</label>
              
              <div className="flex flex-col sm:flex-row items-center gap-6">
                {/* Visual Avatar frame */}
                <div className="relative w-24 h-24 rounded-full border-2 border-primary-green/30 bg-primary-green/5 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                  {activePhotoSrc ? (
                    <img src={activePhotoSrc} alt="Preview Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="h-10 w-10 text-primary-green/45" />
                  )}
                  {activePhotoSrc && (
                    <button
                      type="button"
                      onClick={() => {
                        setUploadedPhoto("");
                        setProfilePhotoUrl("");
                      }}
                      className="absolute bottom-1 right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition"
                      title="Clear photo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>

                <div className="flex-grow w-full space-y-4">
                  {/* File Upload Selector */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-warm-brown/80 uppercase flex items-center">
                      <Upload className="h-3 w-3 mr-1" /> Upload Image File
                    </span>
                    <div className="relative border border-dashed border-warm-brown/20 hover:border-primary-green bg-white hover:bg-cream-bg transition rounded-xl p-3 flex items-center justify-center text-center cursor-pointer min-h-[60px]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <span className="text-xs font-semibold text-text-dark/80 font-sans">Choose custom avatar image...</span>
                    </div>
                  </div>

                  {/* Web URL selector */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-warm-brown/80 uppercase flex items-center">
                      <LinkIcon className="h-3 w-3 mr-1" /> Or Paste Avatar Web URL
                    </span>
                    <input
                      type="url"
                      value={profilePhotoUrl}
                      onChange={(e) => {
                        setProfilePhotoUrl(e.target.value);
                        setUploadedPhoto("");
                      }}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-warm-brown/20 bg-cream-bg text-sm text-text-dark focus:border-primary-green focus:outline-none transition font-sans"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Fields Grid */}
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

            {/* Read Only Metadata Panel */}
            <div className="p-4 bg-white border border-warm-brown/10 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-sans">
              <div>
                <span className="text-[10px] text-warm-brown font-bold uppercase tracking-wider block">Account Role</span>
                <span className="font-semibold text-text-dark capitalize mt-0.5 block">{currentUser.role}</span>
              </div>
              <div>
                <span className="text-[10px] text-warm-brown font-bold uppercase tracking-wider block">Unique User ID</span>
                <span className="font-mono text-[11px] text-text-dark/80 mt-0.5 block truncate" title={currentUser.id}>
                  {currentUser.id}
                </span>
              </div>
            </div>

            {/* Password Verification Block */}
            <div className="bg-cream-bg/40 p-4 rounded-2xl border border-warm-brown/5 space-y-4">
              <span className="text-[10px] font-bold text-warm-brown uppercase tracking-wider block flex items-center">
                <Lock className="h-3.5 w-3.5 mr-1 text-primary-green" /> Change Password Credentials
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

            {/* Form actions */}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-warm-brown/60 font-semibold uppercase tracking-wider">
                <Sparkles className="h-3 w-3 mr-1 inline-block text-accent-gold" />
                Saves to Local Storage Database
              </span>
              
              <div className="flex space-x-3">
                <Link
                  href="/profile"
                  className="px-5 py-3 rounded-xl border border-warm-brown/20 text-xs font-bold text-warm-brown hover:bg-warm-brown/5 transition font-sans text-center"
                >
                  Cancel
                </Link>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-primary-green text-cream-bg font-semibold text-xs hover:bg-[#224f3b] transition duration-200 cursor-pointer disabled:opacity-50 font-sans shadow-sm"
                >
                  {loading ? "Saving Settings..." : "Save Settings"}
                </button>
              </div>
            </div>

          </form>
        </div>

      </div>
    </div>
  );
}
