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

  if (profile) {
    return profile as User;
  }

  const meta = data.user.user_metadata || {};
  return {
    id: data.user.id,
    name: (meta.name as string) || "User",
    email: isEmailInput ? trimmedId.toLowerCase() : "",
    phone: !isEmailInput ? normalizePhone(trimmedId) : "",
    role: (meta.role as User["role"]) || "buyer",
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

export async function upgradeToSeller(
  userId: string,
  businessName: string,
  story: string,
  whatsappNumber: string,
  address: string,
  lat?: number,
  lng?: number
): Promise<{ user: User; seller: Seller }> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const users = getStoredUsers();
  const userIdx = users.findIndex((u) => u.id === userId);

  if (userIdx === -1) {
    throw new Error("User session not found.");
  }

  // Upgrade user role in database list
  users[userIdx].role = "seller";
  saveStoredUsers(users);

  // Create clean user object
  const { passwordHash, ...updatedUser } = users[userIdx];

  // Create and add seller profile
  const newSeller = await addSeller({
    user_id: userId,
    business_name: businessName,
    story,
    profile_photo_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80", // placeholder matching design system
    address,
    lat: lat ?? 9.9312, // default Kochi lat
    lng: lng ?? 76.2673, // default Kochi lng
    whatsapp_number: whatsappNumber,
    is_verified: false, // starts unverified, admin will approve
  });

  // Update current session
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
  profilePhotoUrl?: string
): Promise<User> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const users = getStoredUsers();
  const userIdx = users.findIndex((u) => u.id === userId);

  if (userIdx === -1) {
    throw new Error("User session not found.");
  }

  // Update display name (username)
  if (name.trim()) {
    users[userIdx].name = name.trim();
  }

  // Update language preference
  if (languagePref) {
    users[userIdx].language_pref = languagePref;
  }

  // Update profile photo url
  if (profilePhotoUrl !== undefined) {
    users[userIdx].profile_photo_url = profilePhotoUrl;
  }

  // Update password if provided
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

  if (isSupabaseEnabled()) {
    // Persist the profile fields Supabase can own pre-auth. Throws a
    // warm error before anything is saved locally (mock-era passwords
    // stay local; Supabase Auth owns them from Phase 3).
    await persistProfileSupabase({
      id: users[userIdx].id,
      name: users[userIdx].name,
      email: users[userIdx].email,
      phone: users[userIdx].phone,
      role: users[userIdx].role,
      language_pref: users[userIdx].language_pref,
      profile_photo_url: users[userIdx].profile_photo_url,
    });
  }

  saveStoredUsers(users);

  // Update current session
  const { passwordHash, ...cleanUser } = users[userIdx];
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(cleanUser));
  }

  return cleanUser;
}

export async function forgotPassword(identifier: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  const users = getStoredUsers();
  
  const trimmedId = identifier.trim();
  const isEmailInput = isEmail(trimmedId);
  const normalizedId = isEmailInput ? trimmedId.toLowerCase() : normalizePhone(trimmedId);

  const user = users.find(
    (u) =>
      (isEmailInput && u.email.toLowerCase() === normalizedId) ||
      (!isEmailInput && normalizePhone(u.phone) === normalizedId)
  );

  const targetEmail = isEmailInput ? trimmedId : (user?.email || `${normalizedId}@madetrue.in`);
  const resetLink = `https://madetrue.in/profile?reset-token=mock-${Date.now()}`;
  
  console.log(
    `%c[MOCK EMAIL SERVICE] To: ${targetEmail}\nSubject: Password Reset Link\n\nDear User,\n\nWe received a request to reset your password on MADETRUE.\n\nClick the link below to change your password:\n${resetLink}\n\nIf you did not request this, you can ignore this email.\n\nSincerely,\nMADETRUE Admin Team`,
    "background: #2D6A4F; color: #FAF7F2; padding: 12px; font-family: monospace; border-left: 4px solid #E9A84C; line-height: 1.5;"
  );
}

