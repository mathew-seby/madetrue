import { User, Seller } from "@/types";
import { addSeller } from "./client";
import { isSupabaseEnabled } from "./dataSource";
import { persistProfileSupabase } from "./writeSupabase";
import { createSupabaseBrowserClient } from "./supabase-browser";

const USERS_KEY = "madetrue_users";
const SESSION_KEY = "madetrue_current_user";

// Seed default users if empty
const DEFAULT_USERS = [
  {
    id: "user-seller-1",
    name: "Sreedevi Amma",
    email: "sreedevi@madetrue.local",
    phone: "9876543210",
    role: "seller" as const,
  },
  {
    id: "user-seller-2",
    name: "Kannan",
    email: "kannan@madetrue.local",
    phone: "9876543211",
    role: "seller" as const,
  },
  {
    id: "user-seller-3",
    name: "Devaki",
    email: "devaki@madetrue.local",
    phone: "9876543212",
    role: "seller" as const,
  },
  {
    id: "user-seller-4",
    name: "George",
    email: "george@madetrue.local",
    phone: "9876543213",
    role: "seller" as const,
  },
];

export interface StoredUser extends User {
  passwordHash: string;
}

export function getStoredUsers(): StoredUser[] {
  if (typeof window === "undefined") return [];
  const usersStr = localStorage.getItem(USERS_KEY);
  if (!usersStr) {
    const seeded: StoredUser[] = DEFAULT_USERS.map((u) => ({
      ...u,
      passwordHash: "password123", // default password for testing seeded users
    }));
    localStorage.setItem(USERS_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return JSON.parse(usersStr);
  } catch (e) {
    return [];
  }
}

export function saveStoredUsers(users: StoredUser[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }
}

// Check if identifier is email or phone
export function isEmail(identifier: string): boolean {
  return identifier.includes("@");
}

// Convert identifier to email for Supabase Auth (phone uses synthetic email per Locked Decision #3)
export function toAuthEmail(identifier: string): string {
  const trimmed = identifier.trim();
  if (isEmail(trimmed)) {
    return trimmed.toLowerCase();
  }
  const phone = normalizePhone(trimmed);
  return `${phone}@phone.madetrue.in`;
}

// Normalize phone numbers (strips spaces, hyphens, parentheses, and leading +91 / 91 / 0)
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+91") && cleaned.length === 13) {
    return cleaned.slice(3);
  }
  if (cleaned.startsWith("91") && cleaned.length === 12) {
    return cleaned.slice(2);
  }
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return cleaned.slice(1);
  }
  return cleaned;
}

// Input validation functions
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function validatePhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  // Matches 10-digit Indian mobile numbers starting with 6, 7, 8, or 9
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(normalized);
}

// ---------------------------------------------------------------------------
// Supabase Auth implementations (Phase 3 Step 2)
// ---------------------------------------------------------------------------

export async function registerUserSupabase(
  name: string,
  identifier: string,
  password: string
): Promise<User> {
  const trimmedName = name.trim();
  if (!trimmedName || trimmedName.length < 2) {
    throw new Error("Please tell us your name (at least 2 letters).");
  }

  const trimmedId = identifier.trim();
  const isEmailInput = isEmail(trimmedId);
  const normalizedPhone = isEmailInput ? "" : normalizePhone(trimmedId);
  const authEmail = toAuthEmail(trimmedId);

  if (isEmailInput) {
    if (!validateEmail(trimmedId)) {
      throw new Error("Please enter a valid email address (e.g. user@example.com).");
    }
  } else {
    if (!validatePhone(trimmedId)) {
      throw new Error("Please enter a valid 10-digit Indian phone number (starting with 6, 7, 8, or 9).");
    }
  }

  if (password.length < 6) {
    throw new Error("Please choose a password with at least 6 characters.");
  }

  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.auth.signUp({
    email: authEmail,
    password,
    options: {
      data: {
        name: trimmedName,
        phone: normalizedPhone,
      },
    },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already registered") || msg.includes("already exists")) {
      throw new Error(
        `An account with this ${isEmailInput ? "email" : "phone number"} already exists. Please sign in instead.`
      );
    }
    if (msg.includes("password")) {
      throw new Error("Please choose a password with at least 6 characters.");
    }
    throw new Error(`[madetrue] ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Unable to create account. Please try again.");
  }

  // Persist profile row into public.users
  await persistProfileSupabase({
    id: data.user.id,
    name: trimmedName,
    email: isEmailInput ? trimmedId.toLowerCase() : "",
    phone: normalizedPhone,
    role: "buyer",
  });

  return {
    id: data.user.id,
    name: trimmedName,
    email: isEmailInput ? trimmedId.toLowerCase() : "",
    phone: normalizedPhone,
    role: "buyer",
  };
}

export async function loginUserSupabase(
  identifier: string,
  password: string
): Promise<User> {
  const trimmedId = identifier.trim();
  if (!trimmedId) {
    throw new Error("Please enter your email or phone number.");
  }
  if (!password) {
    throw new Error("Please enter your password.");
  }

  const isEmailInput = isEmail(trimmedId);
  const authEmail = toAuthEmail(trimmedId);

  if (isEmailInput) {
    if (!validateEmail(trimmedId)) {
      throw new Error("Please enter a valid email address (e.g. user@example.com).");
    }
  } else {
    if (!validatePhone(trimmedId)) {
      throw new Error("Please enter a valid 10-digit Indian phone number (starting with 6, 7, 8, or 9).");
    }
  }

  const supabase = createSupabaseBrowserClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: authEmail,
    password,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("invalid login credentials") || msg.includes("invalid grant")) {
      throw new Error(
        "Invalid credentials. Please verify your email or phone and password, and try again."
      );
    }
    throw new Error(`[madetrue] ${error.message}`);
  }

  if (!data.user) {
    throw new Error("Sign in failed. Please try again.");
  }

  // Fetch full user record from public.users
  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, phone, role, location_lat, location_lng, region, language_pref, profile_photo_url")
    .eq("id", data.user.id)
    .maybeSingle();

  const meta = data.user.user_metadata || {};
  if (profile) {
    const profRecord = profile as Record<string, unknown>;
    const userAddress = (profRecord.address as string) || (profile.region as string) || (meta.address as string) || undefined;
    return {
      ...(profile as User),
      address: userAddress,
    };
  }

  return {
    id: data.user.id,
    name: (meta.name as string) || "User",
    email: isEmailInput ? trimmedId.toLowerCase() : "",
    phone: !isEmailInput ? normalizePhone(trimmedId) : ((meta.phone as string) || ""),
    role: (meta.role as User["role"]) || "buyer",
    address: (meta.address as string) || undefined,
  };
}

export async function logoutUserSupabase(): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signOut();
}

// ---------------------------------------------------------------------------
// Mock implementations (preserved as zero-keys fallback)
// ---------------------------------------------------------------------------

export async function registerUserMock(
  name: string,
  identifier: string,
  password: string
): Promise<User> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const users = getStoredUsers();

  const trimmedName = name.trim();
  if (!trimmedName || trimmedName.length < 2) {
    throw new Error("Please tell us your name (at least 2 letters).");
  }

  const trimmedId = identifier.trim();
  const isEmailInput = isEmail(trimmedId);
  const normalizedId = isEmailInput ? trimmedId.toLowerCase() : normalizePhone(trimmedId);
  
  // Validate identifier first
  if (isEmailInput) {
    if (!validateEmail(trimmedId)) {
      throw new Error("Please enter a valid email address (e.g. user@example.com).");
    }
  } else {
    if (!validatePhone(trimmedId)) {
      throw new Error("Please enter a valid 10-digit Indian phone number (starting with 6, 7, 8, or 9).");
    }
  }

  if (password.length < 6) {
    throw new Error("Please choose a password with at least 6 characters.");
  }

  // Check duplicate
  const exists = users.find(
    (u) =>
      (isEmailInput && u.email.toLowerCase() === normalizedId) ||
      (!isEmailInput && normalizePhone(u.phone) === normalizedId)
  );

  if (exists) {
    throw new Error(
      `An account with this ${isEmailInput ? "email" : "phone number"} already exists. Please sign in instead.`
    );
  }

  const newUser: StoredUser = {
    id: `user-${Date.now()}`,
    name: trimmedName,
    email: isEmailInput ? normalizedId : "",
    phone: !isEmailInput ? normalizedId : "",
    role: "buyer",
    passwordHash: password, // plaintext mock password
  };

  users.push(newUser);
  saveStoredUsers(users);

  // Return clean User object (no passwordHash)
  const { passwordHash, ...cleanUser } = newUser;
  return cleanUser;
}

export async function loginUserMock(
  identifier: string,
  password: string
): Promise<User> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const users = getStoredUsers();

  const trimmedId = identifier.trim();
  if (!trimmedId) {
    throw new Error("Please enter your email or phone number.");
  }
  if (!password) {
    throw new Error("Please enter your password.");
  }

  const isEmailInput = isEmail(trimmedId);
  const normalizedId = isEmailInput ? trimmedId.toLowerCase() : normalizePhone(trimmedId);

  // Validate format first
  if (isEmailInput) {
    if (!validateEmail(trimmedId)) {
      throw new Error("Please enter a valid email address (e.g. user@example.com).");
    }
  } else {
    if (!validatePhone(trimmedId)) {
      throw new Error("Please enter a valid 10-digit Indian phone number (starting with 6, 7, 8, or 9).");
    }
  }

  const user = users.find(
    (u) =>
      (isEmailInput && u.email.toLowerCase() === normalizedId) ||
      (!isEmailInput && normalizePhone(u.phone) === normalizedId)
  );

  if (!user) {
    throw new Error(
      `We couldn't find an account matching that ${isEmailInput ? "email" : "phone number"}. Please check for typos or sign up first.`
    );
  }

  if (user.passwordHash !== password) {
    throw new Error("The password you entered doesn't match our records. Please try again.");
  }

  // Save current user session
  const { passwordHash, ...cleanUser } = user;
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(cleanUser));
  }

  return cleanUser;
}

export function logoutUserMock(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
}

// ---------------------------------------------------------------------------
// Public dispatchers: routes to Supabase when enabled, falls back to mock
// ---------------------------------------------------------------------------

export async function registerUser(
  name: string,
  identifier: string,
  password: string
): Promise<User> {
  if (isSupabaseEnabled()) {
    return registerUserSupabase(name, identifier, password);
  }
  return registerUserMock(name, identifier, password);
}

export async function loginUser(
  identifier: string,
  password: string
): Promise<User> {
  if (isSupabaseEnabled()) {
    return loginUserSupabase(identifier, password);
  }
  return loginUserMock(identifier, password);
}

export function getCurrentUser(): User | null {
  if (typeof window === "undefined") return null;
  const currentStr = localStorage.getItem(SESSION_KEY);
  if (!currentStr) return null;
  try {
    return JSON.parse(currentStr);
  } catch (e) {
    return null;
  }
}

export function logoutUser(): void {
  if (isSupabaseEnabled()) {
    try {
      void logoutUserSupabase();
    } catch {
      // ignore
    }
  }
  logoutUserMock();
}

export interface SellerKycPayload {
  pan?: string;
  bank_account_number?: string;
  bank_ifsc?: string;
  bank_account_holder?: string;
}

export async function upgradeToSeller(
  userId: string,
  businessName: string,
  story: string,
  whatsappNumber: string,
  address: string,
  lat?: number,
  lng?: number,
  kycData?: SellerKycPayload
): Promise<{ user: User; seller: Seller }> {
  if (isSupabaseEnabled()) {
    const supabase = createSupabaseBrowserClient();

    // 1. Create seller profile via API route (which also updates public.users.role to 'seller')
    const newSeller = await addSeller({
      user_id: userId,
      business_name: businessName,
      story,
      profile_photo_url:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80",
      address,
      lat: lat ?? 9.9312,
      lng: lng ?? 76.2673,
      whatsapp_number: whatsappNumber,
      is_verified: false,
      kyc_status: "pending",
      pan: kycData?.pan,
      bank_account_number: kycData?.bank_account_number,
      bank_ifsc: kycData?.bank_ifsc,
      bank_account_holder: kycData?.bank_account_holder,
    });

    // 2. Update auth session metadata role to 'seller'
    const { data: authData, error: authErr } = await supabase.auth.updateUser({
      data: { role: "seller" },
    });
    if (authErr) {
      console.warn("[madetrue] Failed to update auth metadata role:", authErr.message);
    }

    const currentAuthUser = authData?.user;
    const updatedUser: User = {
      id: userId,
      name: (currentAuthUser?.user_metadata?.name as string) || businessName,
      email: currentAuthUser?.email && !currentAuthUser.email.endsWith("@phone.madetrue.in") ? currentAuthUser.email : "",
      phone: whatsappNumber,
      role: "seller",
      address,
    };

    return { user: updatedUser, seller: newSeller };
  }

  // Mock mode
  await new Promise((resolve) => setTimeout(resolve, 400));
  const users = getStoredUsers();
  let userIdx = users.findIndex((u) => u.id === userId);

  if (userIdx === -1) {
    const freshUser: StoredUser = {
      id: userId,
      name: businessName,
      email: "",
      phone: whatsappNumber,
      role: "seller",
      passwordHash: "password123",
      address,
    };
    users.push(freshUser);
    userIdx = users.length - 1;
  } else {
    users[userIdx].role = "seller";
  }

  saveStoredUsers(users);

  const { passwordHash, ...updatedUser } = users[userIdx];

  const newSeller = await addSeller({
    user_id: userId,
    business_name: businessName,
    story,
    profile_photo_url:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80",
    address,
    lat: lat ?? 9.9312,
    lng: lng ?? 76.2673,
    whatsapp_number: whatsappNumber,
    is_verified: false,
    kyc_status: "pending",
    pan: kycData?.pan,
    bank_account_number: kycData?.bank_account_number,
    bank_ifsc: kycData?.bank_ifsc,
    bank_account_holder: kycData?.bank_account_holder,
  });

  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));
  }

  return { user: updatedUser, seller: newSeller };
}

export async function updateUserProfile(
  userId: string,
  name: string,
  password?: string,
  oldPassword?: string,
  languagePref?: string,
  profilePhotoUrl?: string,
  phone?: string,
  address?: string
): Promise<User> {
  const trimmedName = name.trim();
  if (!trimmedName || trimmedName.length < 2) {
    throw new Error("Please enter a valid display name (at least 2 letters).");
  }

  const normalizedPhone = phone !== undefined && phone.trim() ? normalizePhone(phone) : undefined;
  if (normalizedPhone !== undefined && !validatePhone(normalizedPhone)) {
    throw new Error("Please enter a valid 10-digit Indian phone number.");
  }

  if (isSupabaseEnabled()) {
    const supabase = createSupabaseBrowserClient();

    // 1. If password change requested in Supabase mode
    if (password && password.trim()) {
      if (password.length < 6) {
        throw new Error("New password must be at least 6 characters long.");
      }
      const { error: pwdErr } = await supabase.auth.updateUser({ password });
      if (pwdErr) {
        throw new Error(`[madetrue] ${pwdErr.message}`);
      }
    }

    // 2. Update user metadata in Supabase Auth session
    const metaUpdates: Record<string, unknown> = {
      name: trimmedName,
      ...(languagePref ? { language_pref: languagePref } : {}),
      ...(profilePhotoUrl !== undefined ? { profile_photo_url: profilePhotoUrl } : {}),
      ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
      ...(address !== undefined ? { address: address.trim() } : {}),
    };

    const { data: authData, error: authErr } = await supabase.auth.updateUser({
      data: metaUpdates,
    });
    if (authErr) {
      console.warn("[madetrue] Auth metadata update warning:", authErr.message);
    }

    // 3. Persist to public.users via /api/profile
    const currentAuthUser = authData?.user;
    const currentEmail =
      currentAuthUser?.email && !currentAuthUser.email.endsWith("@phone.madetrue.in")
        ? currentAuthUser.email
        : "";

    await persistProfileSupabase({
      id: userId,
      name: trimmedName,
      email: currentEmail,
      phone: normalizedPhone ?? (currentAuthUser?.user_metadata?.phone as string) ?? "",
      role: (currentAuthUser?.user_metadata?.role as User["role"]) ?? "buyer",
      language_pref: languagePref,
      profile_photo_url: profilePhotoUrl,
      address: address?.trim(),
    });

    const updatedUser: User = {
      id: userId,
      name: trimmedName,
      email: currentEmail,
      phone: normalizedPhone ?? (currentAuthUser?.user_metadata?.phone as string) ?? "",
      role: (currentAuthUser?.user_metadata?.role as User["role"]) ?? "buyer",
      language_pref: languagePref,
      profile_photo_url: profilePhotoUrl,
      address: address?.trim(),
    };

    return updatedUser;
  }

  // Mock mode
  await new Promise((resolve) => setTimeout(resolve, 300));
  const users = getStoredUsers();
  let userIdx = users.findIndex((u) => u.id === userId);

  if (userIdx === -1) {
    const newUser: StoredUser = {
      id: userId,
      name: trimmedName,
      email: "",
      phone: normalizedPhone || "",
      role: "buyer",
      passwordHash: "password123",
      address: address?.trim(),
      language_pref: languagePref,
      profile_photo_url: profilePhotoUrl,
    };
    users.push(newUser);
    userIdx = users.length - 1;
  } else {
    users[userIdx].name = trimmedName;
    if (languagePref) users[userIdx].language_pref = languagePref;
    if (profilePhotoUrl !== undefined) users[userIdx].profile_photo_url = profilePhotoUrl;
    if (normalizedPhone !== undefined) users[userIdx].phone = normalizedPhone;
    if (address !== undefined) users[userIdx].address = address.trim();

    if (password && password.trim()) {
      if (!oldPassword) {
        throw new Error("Old password is required to change passcode.");
      }
      if (users[userIdx].passwordHash !== oldPassword) {
        throw new Error("Incorrect old password. Please try again.");
      }
      if (password.length < 6) {
        throw new Error("New password must be at least 6 characters long.");
      }
      users[userIdx].passwordHash = password;
    }
  }

  saveStoredUsers(users);

  // Update current session
  const { passwordHash, ...cleanUser } = users[userIdx];
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(cleanUser));
  }

  return cleanUser;
}

export interface PasswordResetResult {
  success: boolean;
  message: string;
  devResetLink?: string;
}

export async function forgotPassword(identifier: string): Promise<PasswordResetResult> {
  const trimmedId = identifier.trim();
  if (!trimmedId) {
    throw new Error("Please enter your email or phone number.");
  }

  const isEmailInput = isEmail(trimmedId);
  const normalizedId = isEmailInput ? trimmedId.toLowerCase() : normalizePhone(trimmedId);

  if (isEmailInput && !validateEmail(trimmedId)) {
    throw new Error("Please enter a valid email address (e.g. user@example.com).");
  }
  if (!isEmailInput && !validatePhone(trimmedId)) {
    throw new Error("Please enter a valid 10-digit Indian phone number.");
  }

  if (isSupabaseEnabled()) {
    const authEmail = toAuthEmail(trimmedId);
    const supabase = createSupabaseBrowserClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
      redirectTo: `${origin}/reset-password`,
    });

    if (error) {
      throw new Error(`[madetrue] ${error.message}`);
    }

    return {
      success: true,
      message: "A password reset link has been sent to your email. Please check your inbox.",
    };
  }

  // Mock dev mode
  await new Promise((resolve) => setTimeout(resolve, 200));
  const users = getStoredUsers();

  const user = users.find(
    (u) =>
      (isEmailInput && u.email.toLowerCase() === normalizedId) ||
      (!isEmailInput && normalizePhone(u.phone) === normalizedId)
  );

  if (!user) {
    throw new Error(
      `We couldn't find an account matching that ${isEmailInput ? "email" : "phone number"}. Please check for typos.`
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const devResetLink = `${origin}/reset-password?id=${encodeURIComponent(normalizedId)}&token=mock-${Date.now()}`;

  console.log(
    `%c[MADETRUE DEV EMAIL] Password Reset Link for ${user.email || user.phone}:\n${devResetLink}`,
    "background: #2D6A4F; color: #FAF7F2; padding: 12px; font-weight: bold; font-family: monospace; border-left: 4px solid #E9A84C; line-height: 1.5;"
  );

  return {
    success: true,
    message: "A password reset link has been prepared! Check your inbox or click the link below in dev mode.",
    devResetLink,
  };
}

export async function resetPassword(newPassword: string, identifier?: string): Promise<void> {
  if (newPassword.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  if (isSupabaseEnabled()) {
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      throw new Error(`[madetrue] ${error.message}`);
    }
    return;
  }

  // Mock dev mode
  await new Promise((resolve) => setTimeout(resolve, 200));
  const users = getStoredUsers();
  let userIdx = -1;

  if (identifier) {
    const isEmailInput = isEmail(identifier);
    const normalizedId = isEmailInput ? identifier.toLowerCase() : normalizePhone(identifier);
    userIdx = users.findIndex(
      (u) =>
        (isEmailInput && u.email.toLowerCase() === normalizedId) ||
        (!isEmailInput && normalizePhone(u.phone) === normalizedId)
    );
  }

  if (userIdx === -1 && typeof window !== "undefined") {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (sessionStr) {
      try {
        const cur = JSON.parse(sessionStr);
        userIdx = users.findIndex((u) => u.id === cur.id);
      } catch {
        // ignore
      }
    }
  }

  if (userIdx !== -1) {
    users[userIdx].passwordHash = newPassword;
    saveStoredUsers(users);
  }
}

