import { User, Seller } from "@/types";
import { addSeller } from "./client";

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

// Input validation functions
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  // Matches typical 10-digit Indian mobile numbers with optional +91 or 0 prefix
  const phoneRegex = /^(?:\+91|0)?[6-9]\d{9}$/;
  return phoneRegex.test(phone);
}

export async function registerUser(
  name: string,
  identifier: string,
  password: string
): Promise<User> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const users = getStoredUsers();

  const isEmailInput = isEmail(identifier);
  
  // Validate identifier first
  if (isEmailInput) {
    if (!validateEmail(identifier)) {
      throw new Error("Please enter a valid email address.");
    }
  } else {
    if (!validatePhone(identifier)) {
      throw new Error("Please enter a valid 10-digit Indian phone number.");
    }
  }

  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters.");
  }

  // Check duplicate
  const exists = users.find(
    (u) =>
      (isEmailInput && u.email === identifier) ||
      (!isEmailInput && u.phone === identifier)
  );

  if (exists) {
    throw new Error("Account already exists with this email or phone number.");
  }

  const newUser: StoredUser = {
    id: `user-${Date.now()}`,
    name,
    email: isEmailInput ? identifier : "",
    phone: !isEmailInput ? identifier : "",
    role: "buyer",
    passwordHash: password, // plaintext mock password
  };

  users.push(newUser);
  saveStoredUsers(users);

  // Return clean User object (no passwordHash)
  const { passwordHash, ...cleanUser } = newUser;
  return cleanUser;
}

export async function loginUser(
  identifier: string,
  password: string
): Promise<User> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  const users = getStoredUsers();

  const isEmailInput = isEmail(identifier);

  // Validate format first
  if (isEmailInput) {
    if (!validateEmail(identifier)) {
      throw new Error("Please enter a valid email address.");
    }
  } else {
    if (!validatePhone(identifier)) {
      throw new Error("Please enter a valid 10-digit Indian phone number.");
    }
  }

  const user = users.find(
    (u) =>
      (isEmailInput && u.email.toLowerCase() === identifier.toLowerCase()) ||
      (!isEmailInput && u.phone === identifier)
  );

  if (!user || user.passwordHash !== password) {
    throw new Error("Invalid credentials. Please verify details and try again.");
  }

  // Save current user session
  const { passwordHash, ...cleanUser } = user;
  if (typeof window !== "undefined") {
    localStorage.setItem(SESSION_KEY, JSON.stringify(cleanUser));
  }

  return cleanUser;
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
  if (typeof window !== "undefined") {
    localStorage.removeItem(SESSION_KEY);
  }
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
  
  const isEmailInput = identifier.includes("@");
  const user = users.find(
    (u) =>
      (isEmailInput && u.email.toLowerCase() === identifier.toLowerCase()) ||
      (!isEmailInput && u.phone === identifier)
  );

  const targetEmail = isEmailInput ? identifier : (user?.email || `${identifier.replace(/\D/g, "")}@madetrue.in`);
  const resetLink = `https://madetrue.in/profile?reset-token=mock-${Date.now()}`;
  
  console.log(
    `%c[MOCK EMAIL SERVICE] To: ${targetEmail}\nSubject: Password Reset Link\n\nDear User,\n\nWe received a request to reset your password on MADETRUE.\n\nClick the link below to change your password:\n${resetLink}\n\nIf you did not request this, you can ignore this email.\n\nSincerely,\nMADETRUE Admin Team`,
    "background: #2D6A4F; color: #FAF7F2; padding: 12px; font-family: monospace; border-left: 4px solid #E9A84C; line-height: 1.5;"
  );
}

