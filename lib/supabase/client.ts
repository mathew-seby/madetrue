import { mockCategories, mockSellers, mockProducts } from "./mockData";
import {
  Category,
  Seller,
  Product,
  Order,
  AuditEntry,
  AuditEntityType,
  Transaction,
  PlatformCommissionReport,
  SettlementSummary,
  MakerCommissionReportRow,
} from "../../types";
import { isSupabaseEnabled } from "./dataSource";
import {
  fetchCategoriesSupabase,
  fetchSellersSupabase,
  fetchSellerByIdSupabase,
  fetchProductsSupabase,
  fetchProductByIdSupabase,
  fetchProductsBySellerIdSupabase,
} from "./readSupabase";
import {
  saveOrdersSupabase,
  fetchOrdersForSellerSupabase,
  fetchOrdersForBuyerSupabase,
  fetchOrdersAdminSupabase,
  submitCategorySupabase,
  updateCategorySupabase,
  deleteCategorySupabase,
  appendAuditSupabase,
  fetchAuditLogSupabase,
  submitProductSupabase,
  editProductSupabase,
  fetchAllProductsSupabase,
  fetchProductsForSellerSupabase,
  deleteProductSupabase,
  uploadProductImageSupabase,
  updateProductStatusSupabase,
  setProductHiddenSupabase,
  submitSellerSupabase,
  updateSellerVerificationSupabase,
  updateSellerApplicationSupabase,
  fetchSellerPayoutSupabase,
  updateSellerProfileSupabase,
  registerSellerVendorSupabase,
  updateOrderStatusSupabase,
  refundOrderSupabase,
  fetchOrderRefundDetailsSupabase,
  fetchSettlementsSupabase,
  syncSettlementsSupabase,
  type RefundOrderResponse,
  type SettlementsResponse,
  type SellerApplicationAction,
  type SellerPayoutDetails,
} from "./writeSupabase";
import type { SellerProfileUpdates } from "./writeSupabase";
import { getPaymentAdapter } from "@/lib/payments";

// Re-exposed so the console can speak the same action/payload vocabulary
// as the transport layer (admin page imports only from client.ts).
export type {
  SellerApplicationAction,
  SellerPayoutDetails,
  RefundOrderResponse,
  SettlementsResponse,
} from "./writeSupabase";
export type { OrderRefundDetailsResponse } from "./writeSupabase";
import {
  isValidOrderTransition,
  getInvalidTransitionMessage,
  normalizeOrderStatus,
  canCancelOrder,
} from "@/lib/utils/orderStatus";
import { DEFAULT_CATEGORY_ICON } from "@/lib/utils/categories";

// This is our data layer client. It serves mock data by default
// and uses local storage to simulate write operations (approvals, product additions) on the client side.

// Helper to get products list (local storage on client, mock data on server/during pre-rendering)
function getStoredProducts(): Product[] {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("madetrue_products");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored products", e);
      }
    }
    // Initialize if not present
    localStorage.setItem("madetrue_products", JSON.stringify(mockProducts));
    return mockProducts;
  }
  return mockProducts;
}

// Helper to save products list
function saveStoredProducts(products: Product[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("madetrue_products", JSON.stringify(products));
  }
}

// Helper to get sellers list
function getStoredSellers(): Seller[] {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("madetrue_sellers");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored sellers", e);
      }
    }
    localStorage.setItem("madetrue_sellers", JSON.stringify(mockSellers));
    return mockSellers;
  }
  return mockSellers;
}

// Helper to save sellers list
function saveStoredSellers(sellers: Seller[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("madetrue_sellers", JSON.stringify(sellers));
  }
}

// Helper to get the category list (public nav + admin console read from
// this store in mock mode, so CRUD edits reflect everywhere immediately).
function getStoredCategories(): Category[] {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("madetrue_categories");
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored categories", e);
      }
    }
    // Initialize if not present
    localStorage.setItem("madetrue_categories", JSON.stringify(mockCategories));
    return mockCategories;
  }
  return mockCategories;
}

// Helper to save the category list
function saveStoredCategories(categories: Category[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("madetrue_categories", JSON.stringify(categories));
  }
}

export async function getCategories(): Promise<Category[]> {
  if (isSupabaseEnabled()) return fetchCategoriesSupabase();
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  return getStoredCategories();
}

// ---------------------------------------------------------------------------
// Categories CRUD — admin console (Phase 5 Step 5). Supabase mode goes
// through the admin-guarded /api/categories route (service role); mock
// mode persists to the madetrue_categories store so the public nav
// (FeaturedCategories, listing chips, footer link) reflects instantly.
// Slug rules live in lib/utils/categories.ts and are mirrored by the
// categories_slug_unique / categories_slug_format constraints in
// 0001_init.sql — the database has the final word in Supabase mode.
// ---------------------------------------------------------------------------

export async function addCategory(
  name: string,
  slug: string,
  icon: string = DEFAULT_CATEGORY_ICON
): Promise<Category> {
  if (isSupabaseEnabled()) {
    return submitCategorySupabase({ name, slug, icon });
  }

  await new Promise((resolve) => setTimeout(resolve, 100));
  const categories = getStoredCategories();
  if (categories.some((c) => c.slug === slug)) {
    throw new Error(`That category slug is already in use — pick another name or slug.`);
  }
  const category: Category = {
    id: `cat-${Date.now()}`,
    name: name.trim(),
    icon,
    slug,
  };
  saveStoredCategories([...categories, category]);
  return category;
}

export async function updateCategory(
  id: string,
  updates: Partial<Category>
): Promise<Category | null> {
  if (isSupabaseEnabled()) {
    return updateCategorySupabase(
      id,
      updates as Pick<Category, "name" | "slug" | "icon">
    );
  }

  await new Promise((resolve) => setTimeout(resolve, 100));
  const categories = getStoredCategories();
  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) return null;

  const clash = categories.some((c) => c.slug === updates.slug && c.id !== id);
  if (clash) {
    throw new Error(`That category slug is already in use — pick another slug.`);
  }

  const updated = { ...categories[index], ...updates } as Category;
  const next = [...categories];
  next[index] = updated;
  saveStoredCategories(next);
  return updated;
}

export async function deleteCategory(id: string): Promise<Category | null> {
  if (isSupabaseEnabled()) {
    return deleteCategorySupabase(id);
  }

  await new Promise((resolve) => setTimeout(resolve, 100));
  const categories = getStoredCategories();
  const target = categories.find((c) => c.id === id);
  if (!target) return null;

  // Same guard as the server route: a category holding products cannot
  // disappear — the FK in 0001_init.sql would refuse it.
  const inUse = getStoredProducts().filter((p) => p.category === target.slug).length;
  if (inUse > 0) {
    throw new Error(
      `"${target.name}" still holds ${inUse} product${inUse === 1 ? "" : "s"} — move or remove them first.`
    );
  }

  saveStoredCategories(categories.filter((c) => c.id !== id));
  return target;
}

export async function getSellers(): Promise<Seller[]> {
  if (isSupabaseEnabled()) return fetchSellersSupabase();
  await new Promise((resolve) => setTimeout(resolve, 100));
  return getStoredSellers();
}

export async function getSellerById(id: string): Promise<Seller | null> {
  if (isSupabaseEnabled()) return fetchSellerByIdSupabase(id);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const sellers = getStoredSellers();
  const seller = sellers.find((s) => s.id === id);
  return seller || null;
}

export interface ProductFilters {
  category?: string;
  maxDistance?: number;
  search?: string;
  sortBy?: "price-asc" | "price-desc" | "newest";
}

export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  if (isSupabaseEnabled()) return fetchProductsSupabase(filters);
  await new Promise((resolve) => setTimeout(resolve, 150));
  const allProducts = getStoredProducts();

  // Public listing should only return approved products (or initial mock
  // products with no status) that are NOT hidden by admin moderation.
  let products = allProducts.filter((p) => !p.status || (p.status === "approved" && !p.is_hidden));

  if (filters?.category) {
    products = products.filter((p) => p.category === filters.category);
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
    );
  }

  if (filters?.sortBy) {
    if (filters.sortBy === "price-asc") {
      products.sort((a, b) => a.price - b.price);
    } else if (filters.sortBy === "price-desc") {
      products.sort((a, b) => b.price - a.price);
    } else if (filters.sortBy === "newest") {
      products.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }

  return products;
}

export async function getProductById(id: string): Promise<Product | null> {
  if (isSupabaseEnabled()) return fetchProductByIdSupabase(id);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const products = getStoredProducts();
  const product = products.find((p) => p.id === id);
  // Hidden by moderation: behave exactly like the listing — the detail
  // page is not part of the public catalog anymore (Supabase mode: the
  // 0008 RLS policy makes the same call at the database).
  if (product?.is_hidden) return null;
  return product || null;
}

export async function getProductsBySellerId(sellerId: string): Promise<Product[]> {
  if (isSupabaseEnabled()) return fetchProductsBySellerIdSupabase(sellerId);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const products = getStoredProducts();
  // Filter by seller id and ensure they are approved for public listing —
  // and not hidden by admin moderation (a hidden product vanishes from
  // the maker's public store, but keeps existing in their dashboard).
  return products.filter((p) => p.seller_id === sellerId && (p.status === "approved" || !p.status) && !p.is_hidden);
}

/* ADMIN & SELLER ACTIONS (MOCKED) */

// Helper to log a mock email receipt in the developer console
export function sendMockEmail(to: string, subject: string, body: string) {
  console.log(
    `%c[MOCK EMAIL SERVICE] To: ${to}\nSubject: ${subject}\n\n${body}`,
    "background: #2D6A4F; color: #FAF7F2; padding: 12px; font-family: monospace; border-left: 4px solid #E9A84C; line-height: 1.5;"
  );
}

// Get all products (including pending and rejected) for admin
export async function getAllProductsAdmin(): Promise<Product[]> {
  if (isSupabaseEnabled()) return fetchAllProductsSupabase();
  await new Promise((resolve) => setTimeout(resolve, 100));
  return getStoredProducts();
}

// Get all products belonging to a seller (including pending and rejected) for seller dashboard
export async function getProductsForSeller(sellerId: string): Promise<Product[]> {
  if (isSupabaseEnabled()) return fetchProductsForSellerSupabase(sellerId);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const products = getStoredProducts();
  return products.filter((p) => p.seller_id === sellerId);
}

// Delete a product listing (used by seller dashboard and admin console).
// The optional audit note (admin removal) is recorded in the mock email
// stream before the row disappears; a durable cross-action audit log is
// Phase 5 Step 7. In Supabase mode the DELETE route does not carry a note
// (the row is gone — the note has nowhere to live) — flagged honestly in
// the step log.
export async function deleteProduct(
  id: string,
  sellerId?: string,
  note?: string
): Promise<boolean> {
  if (isSupabaseEnabled()) return deleteProductSupabase(id, sellerId);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const products = getStoredProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return false;
  if (sellerId && products[index].seller_id !== sellerId) {
    throw new Error("[madetrue] You can only delete your own products.");
  }

  const product = products[index];
  if (note && note.trim()) {
    // Removal always tells the maker WHAT happened and why — the audit
    // note doubles as the honest reason, since the row itself is gone.
    const sellers = getStoredSellers();
    const seller = sellers.find((s) => s.id === product.seller_id);
    if (seller) {
      const sellerEmail = `${seller.business_name.toLowerCase().replace(/[^a-z0-9]/g, "")}@madetrue.in`;
      sendMockEmail(
        sellerEmail,
        `Listing Removed by Moderation: ${product.name}`,
        `Dear ${seller.business_name},\n\nA MADETRUE moderator removed your listing "${product.name}" along with the following note for you:\n\n"${note.trim()}"\n\nApplied orders keep their history. If this looks wrong, reply or reach out on WhatsApp — we review removals the same day.\n\nSincerely,\nMADETRUE Admin Team`
      );
    }
  }

  const remaining = products.filter((p) => p.id !== id);
  saveStoredProducts(remaining);
  return true;
}

// Upload product image to Supabase Storage, with offline DataURL fallback for mock mode
export async function uploadProductImage(file: File): Promise<string> {
  if (isSupabaseEnabled()) {
    return uploadProductImageSupabase(file);
  }
  // Mock mode: encode as base64 DataURL for local persistence
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("[madetrue] Failed to read image file."));
      }
    };
    reader.onerror = () => reject(new Error("[madetrue] Error reading image file."));
    reader.readAsDataURL(file);
  });
}

// Submit a new product (defaults to 'pending' review)
export async function addProduct(productData: Omit<Product, "id" | "created_at">): Promise<Product> {
  if (isSupabaseEnabled()) return submitProductSupabase(productData);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const products = getStoredProducts();

  const newProduct: Product = {
    ...productData,
    id: `prod-${Date.now()}`,
    created_at: new Date().toISOString(),
    status: "pending", // Always pending review when submitted by consumer/seller
    base_price: productData.price,
    commission: 0,
  };

  products.push(newProduct);
  saveStoredProducts(products);

  // Send Submission Email to Seller
  const sellers = getStoredSellers();
  const seller = sellers.find(s => s.id === productData.seller_id);
  if (seller) {
    const sellerEmail = `${seller.business_name.toLowerCase().replace(/[^a-z0-9]/g, "")}@madetrue.in`;
    sendMockEmail(
      sellerEmail,
      `Submission Received: ${newProduct.name}`,
      `Dear ${seller.business_name},\n\nYour product listing for "${newProduct.name}" (₹${newProduct.price}) has been successfully submitted to the MADETRUE Admin Panel for review.\n\nOur team is validating the authenticity, sourcing details, and regional badges. You will receive an email once the product has been moderated.\n\nSincerely,\nMADETRUE Admin Team`
    );
  }

  return newProduct;
}

// Update the review status of a product (approve/reject/re-open).
// The rejection reason doubles as the product's moderation note — Phase
// 5 finally persists it on the row (previously it only went into the
// mock email stream), so the maker and the console both see WHY.
export async function updateProductStatus(
  id: string,
  status: "approved" | "rejected" | "pending",
  reason?: string,
  commission?: number
): Promise<Product | null> {
  if (isSupabaseEnabled()) return updateProductStatusSupabase(id, status, reason, commission);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const products = getStoredProducts();
  const index = products.findIndex((p) => p.id === id);

  if (index !== -1) {
    const originalProduct = products[index];
    const basePrice = originalProduct.base_price || originalProduct.price;
    const finalCommission = commission !== undefined ? commission : (originalProduct.commission || 0);
    const finalPrice = basePrice + finalCommission;

    products[index] = {
      ...originalProduct,
      status,
      base_price: basePrice,
      commission: finalCommission,
      price: finalPrice,
      // An empty decision (approve / re-review) clears a stale note; the
      // rejection prompt always supplies one.
      moderation_note: reason?.trim() || undefined,
    };
    saveStoredProducts(products);

    const product = products[index];
    const sellers = getStoredSellers();
    const seller = sellers.find(s => s.id === product.seller_id);

    if (seller) {
      const sellerEmail = `${seller.business_name.toLowerCase().replace(/[^a-z0-9]/g, "")}@madetrue.in`;
      let subject = "";
      let body = "";

      if (status === "approved") {
        subject = `Listing Approved: ${product.name}`;
        body = `Dear ${seller.business_name},\n\nGreat news! Your product listing for "${product.name}" has been approved by the MADETRUE moderation team and is now live for buyers in your region.\n\nThank you for sharing real, local, and authentic goods.\n\nSincerely,\nMADETRUE Admin Team`;
      } else if (status === "rejected") {
        subject = `Listing Rejection Notice: ${product.name}`;
        body = `Dear ${seller.business_name},\n\nThank you for submitting "${product.name}" to MADETRUE. Our moderation team has reviewed your submission.\n\nUnfortunately, we cannot list this product at this time for the following reason:\n- ${reason || "Does not match our trust-first, hyperlocal guidelines."}\n\nYou can review your listing details, make the necessary updates, and re-submit it from your Maker Dashboard.\n\nSincerely,\nMADETRUE Admin Team`;
      }

      if (subject && body) {
        sendMockEmail(sellerEmail, subject, body);
      }
    }

    return products[index];
  }

  return null;
}

// Hide/unhide a product from every public surface — the admin moderation
// overlay. The maker keeps the row in their dashboard (badge explains the
// state) and cannot undo it: PATCH /api/products refuses is_hidden from
// non-admins, and 0008's guard trigger pins the column at the database.
export async function setProductHidden(
  id: string,
  is_hidden: boolean,
  note?: string
): Promise<Product | null> {
  if (isSupabaseEnabled()) return setProductHiddenSupabase(id, is_hidden, note);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const products = getStoredProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return null;

  products[index] = {
    ...products[index],
    is_hidden,
    moderation_note: note?.trim() || undefined,
  };
  saveStoredProducts(products);

  // Concealment explains itself: the maker's dashboard shows the hidden
  // badge and the note, and the mock email records the action.
  const sellers = getStoredSellers();
  const seller = sellers.find((s) => s.id === products[index].seller_id);
  if (seller) {
    const sellerEmail = `${seller.business_name.toLowerCase().replace(/[^a-z0-9]/g, "")}@madetrue.in`;
    const subject = is_hidden
      ? `Listing Hidden by Moderation: ${products[index].name}`
      : `Listing Back On The Market: ${products[index].name}`;
    const body = is_hidden
      ? `Dear ${seller.business_name},\n\nYour listing "${products[index].name}" is temporarily hidden from buyers while the moderation team takes another look.${note?.trim() ? `\n\nModerator note:\n"${note.trim()}"\n` : ""}\nYour listing is safe in your Maker Dashboard — nothing is lost.\n\nSincerely,\nMADETRUE Admin Team`
      : `Dear ${seller.business_name},\n\nGood news — "${products[index].name}" is visible to buyers again on MADETRUE.${note?.trim() ? ` A modnote was included:\n"${note.trim()}"` : ""}\n\nThank you for your patience.\n\nSincerely,\nMADETRUE Admin Team`;
    sendMockEmail(sellerEmail, subject, body);
  }

  return products[index];
}

// Add a new seller (maker onboarding)
export async function addSeller(sellerData: Omit<Seller, "id">): Promise<Seller> {
  if (isSupabaseEnabled()) {
    return submitSellerSupabase(sellerData);
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
  const sellers = getStoredSellers();

  const newSeller: Seller = {
    ...sellerData,
    id: `seller-${Date.now()}`,
  };

  sellers.push(newSeller);
  saveStoredSellers(sellers);
  return newSeller;
}

// Update verification status of a seller
export async function updateSellerVerification(
  id: string,
  is_verified: boolean,
  kyc_status?: Seller["kyc_status"]
): Promise<Seller | null> {
  if (isSupabaseEnabled()) {
    return updateSellerVerificationSupabase(id, is_verified, kyc_status);
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
  const sellers = getStoredSellers();
  const index = sellers.findIndex((s) => s.id === id);

  if (index !== -1) {
    sellers[index] = {
      ...sellers[index],
      is_verified,
      kyc_status: kyc_status ?? (is_verified ? "verified" : "pending"),
    };
    saveStoredSellers(sellers);
    return sellers[index];
  }
  return null;
}

// Phase 5 Step 2 — admin moderation of a maker application. One action =
// one consistent state; see updateSellerApplicationSupabase for the
// field mapping it sends over /api/sellers PATCH.
export async function updateSellerApplication(
  id: string,
  action: SellerApplicationAction
): Promise<Seller | null> {
  if (isSupabaseEnabled()) return updateSellerApplicationSupabase(id, action);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const sellers = getStoredSellers();
  const index = sellers.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const application_status: NonNullable<Seller["application_status"]> =
    action === "approve"
      ? "approved"
      : action === "reject"
        ? "rejected"
        : "pending";
  sellers[index] = {
    ...sellers[index],
    is_verified: action === "approve",
    kyc_status: action === "approve" ? "verified" : "pending",
    payment_vendor_ref:
      action === "approve"
        ? sellers[index].payment_vendor_ref || `vendor_${sellers[index].id}`
        : sellers[index].payment_vendor_ref,
    application_status,
  };
  saveStoredSellers(sellers);
  return sellers[index];
}

// Phase 6 Step 2 — register an approved seller as a gateway vendor (Easy Split)
export async function registerSellerVendor(id: string): Promise<Seller | null> {
  if (isSupabaseEnabled()) return registerSellerVendorSupabase(id);
  await new Promise((resolve) => setTimeout(resolve, 150));
  const sellers = getStoredSellers();
  const index = sellers.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const seller = sellers[index];
  const vendorId = seller.payment_vendor_ref || `vendor_${seller.id}`;

  sellers[index] = {
    ...seller,
    payment_vendor_ref: vendorId,
    kyc_status: "verified",
  };
  saveStoredSellers(sellers);
  return sellers[index];
}


// Payout display fields for the console's KYC card. Mock mode keeps them
// inline on the stored seller; Supabase mode reads the private
// seller_payout_kyc table through the admin-only /api/sellers/[id]/payout
// route ({} when the maker hasn't submitted payout details yet).
export async function getPayoutDetailsForSeller(
  id: string
): Promise<SellerPayoutDetails> {
  if (isSupabaseEnabled()) return fetchSellerPayoutSupabase(id);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const seller = getStoredSellers().find((s) => s.id === id);
  if (!seller) return {};
  return {
    pan: seller.pan,
    bank_account_number: seller.bank_account_number,
    bank_ifsc: seller.bank_ifsc,
    bank_account_holder: seller.bank_account_holder,
  };
}

// The honest application status of a seller row for the console. Rows
// seeded before Phase 5 Step 2 carry no application_status; their
// marketplace-visible outcome maps to approved whenever verification was
// granted, pending otherwise.
export function getApplicationStatus(
  seller: Pick<Seller, "application_status" | "is_verified">
): NonNullable<Seller["application_status"]> {
  return seller.application_status ?? (seller.is_verified ? "approved" : "pending");
}

// Store settings: a maker updates their own store profile fields (Step 6).
// Validation mirrors the PATCH /api/sellers route so both data sources give
// the same friendly messages: name and WhatsApp are required, coordinates
// must be finite and in range, and every string is trimmed.
export async function updateSellerProfile(
  id: string,
  updates: SellerProfileUpdates
): Promise<Seller | null> {
  if (isSupabaseEnabled()) {
    return updateSellerProfileSupabase(id, updates);
  }
  await new Promise((resolve) => setTimeout(resolve, 100));

  const cleaned: SellerProfileUpdates = {};
  const businessName = updates.business_name?.trim();
  if (businessName !== undefined) {
    if (businessName === "") {
      throw new Error("Give your store a name — buyers know you by it.");
    }
    cleaned.business_name = businessName;
  }
  const whatsapp = updates.whatsapp_number?.trim();
  if (whatsapp !== undefined) {
    if (whatsapp === "") {
      throw new Error("Add a WhatsApp number so buyers can reach you.");
    }
    cleaned.whatsapp_number = whatsapp;
  }
  if (updates.story !== undefined) cleaned.story = updates.story.trim();
  if (updates.address !== undefined) cleaned.address = updates.address.trim();

  const bounds = { lat: [-90, 90] as const, lng: [-180, 180] as const };
  for (const key of ["lat", "lng"] as const) {
    const value = updates[key];
    if (value === undefined) continue;
    const [min, max] = bounds[key];
    if (
      !Number.isFinite(value) ||
      value < min ||
      value > max
    ) {
      throw new Error(
        key === "lat"
          ? "Latitude must be a number between -90 and 90."
          : "Longitude must be a number between -180 and 180."
      );
    }
    cleaned[key] = value;
  }

  const sellers = getStoredSellers();
  const index = sellers.findIndex((s) => s.id === id);
  if (index === -1) return null;
  sellers[index] = { ...sellers[index], ...cleaned };
  saveStoredSellers(sellers);
  return sellers[index];
}

// Helper to get orders list
function getStoredOrders(): Order[] {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("madetrue_orders");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Order[];
        // Legacy rows may still say "completed"; the live machine calls
        // that state "delivered" (Phase 7 Step 1).
        return parsed.map((order) => ({
          ...order,
          status: normalizeOrderStatus(order.status),
        }));
      } catch (e) {
        console.error("Failed to parse stored orders", e);
      }
    }
  }
  return [];
}

// Helper to save orders list
function saveStoredOrders(orders: Order[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem("madetrue_orders", JSON.stringify(orders));
  }
}

// Get all orders for the admin panel — the global order book. Supabase
// mode reads the DB through the admin-guarded route (the session decides
// what rows leave the server); mock mode stays the localStorage fallback,
// newest first so the console opens on today's activity.
export async function getOrdersAdmin(): Promise<Order[]> {
  if (isSupabaseEnabled()) return fetchOrdersAdminSupabase();
  await new Promise((resolve) => setTimeout(resolve, 100));
  return getStoredOrders().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// Get orders belonging to a specific maker (seller dashboard inbox)
export async function getOrdersForSeller(sellerId: string): Promise<Order[]> {
  if (isSupabaseEnabled()) return fetchOrdersForSellerSupabase(sellerId);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const orders = getStoredOrders();
  return orders
    .filter((o) => o.seller_id === sellerId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// Buyer history (Phase 7 Step 2): the signed-in user's own purchases,
// whatever their role. Mock mode filters the localStorage book by the
// buyer id checkout stamped on every row; Supabase mode asks the
// session-scoped route (`mine=1`) — the client never says who it is.
export async function getOrdersForBuyer(userId: string): Promise<Order[]> {
  if (isSupabaseEnabled()) return fetchOrdersForBuyerSupabase();
  await new Promise((resolve) => setTimeout(resolve, 50));
  return getStoredOrders()
    .filter((o) => o.buyer_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

// Update the status of an order
export async function updateOrderStatus(
  id: string,
  status: Order["status"],
  sellerId?: string
): Promise<Order | null> {
  if (isSupabaseEnabled()) {
    return updateOrderStatusSupabase(id, status, sellerId);
  }

  await new Promise((resolve) => setTimeout(resolve, 100));
  const orders = getStoredOrders();
  const index = orders.findIndex((o) => o.id === id);

  if (index === -1) {
    return null;
  }

  const existingOrder = orders[index];

  // Enforce seller isolation
  if (sellerId && existingOrder.seller_id !== sellerId) {
    throw new Error("You do not have permission to modify orders belonging to another maker.");
  }

  // Enforce valid status transition machine
  if (!isValidOrderTransition(existingOrder.status, status)) {
    throw new Error(getInvalidTransitionMessage(existingOrder.status, status));
  }

  // Restore inventory if cancelled
  if (status === "cancelled" && existingOrder.status !== "cancelled") {
    const products = getStoredProducts();
    const prodIdx = products.findIndex((p) => p.id === existingOrder.product_id);
    if (prodIdx !== -1) {
      products[prodIdx].stock += existingOrder.quantity;
      products[prodIdx].is_available = true;
      saveStoredProducts(products);
    }
  }

  orders[index] = { ...existingOrder, status };
  saveStoredOrders(orders);
  return orders[index];
}

// Update the WhatsApp notification status of an order
export async function updateOrderWhatsappStatus(
  id: string,
  whatsapp_notified: boolean
): Promise<Order | null> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  const orders = getStoredOrders();
  const index = orders.findIndex((o) => o.id === id);

  if (index !== -1) {
    orders[index] = { ...orders[index], whatsapp_notified };
    saveStoredOrders(orders);
    return orders[index];
  }
  return null;
}

// Persist a basket as orders (one row per line). Supabase writes go
// through the server routes (service role) in Step 6; the mock path is
// the localStorage flow that used to live inline in checkout/page.tsx.
export async function saveOrders(newOrders: Order[]): Promise<Order[]> {
  if (isSupabaseEnabled()) return saveOrdersSupabase(newOrders);

  // Retrieve existing orders
  const storedOrders = localStorage.getItem("madetrue_orders");
  let allOrders: Order[] = [];
  if (storedOrders) {
    try {
      allOrders = JSON.parse(storedOrders) as Order[];
    } catch (e) {
      console.error("Failed to parse stored orders", e);
    }
  }

  // Add new orders
  allOrders = [...newOrders, ...allOrders];
  localStorage.setItem("madetrue_orders", JSON.stringify(allOrders));

  // If online payment, record transactions in mock ledger
  if (newOrders[0]?.gateway) {
    const storedTx = localStorage.getItem("madetrue_transactions");
    let allTx: unknown[] = [];
    if (storedTx) {
      try {
        allTx = JSON.parse(storedTx);
      } catch {
        allTx = [];
      }
    }
    const newTx = newOrders.map((o) => ({
      id: `tx_${o.id}_${Date.now()}`,
      order_id: o.id,
      seller_id: o.seller_id,
      gateway: o.gateway,
      gateway_event_id: `evt_${o.id}_${Date.now()}`,
      type: "payment",
      amount: (o.price || 0) * o.quantity,
      currency: "INR",
      status: o.split_status === "completed" ? "completed" : "pending",
      created_at: new Date().toISOString(),
    }));
    localStorage.setItem("madetrue_transactions", JSON.stringify([...newTx, ...allTx]));
  }

  // Decrement stock for purchased products
  for (const item of newOrders) {
    await decrementProductStock(item.product_id, item.quantity);
  }

  return newOrders;
}

export interface SplitSessionResponse {
  success: boolean;
  gateway: string;
  gatewayOrderId: string;
  paymentSessionId?: string;
  paymentUrl?: string;
  splits: Array<{ vendorId: string; amount: number }>;
  breakdown: {
    subtotal: number;
    deliveryFee: number;
    totalAmount: number;
    makersShare: number;
    platformShare: number;
  };
  error?: string;
}

export async function createSplitCheckoutSession(params: {
  items: Array<{
    productId: string;
    sellerId: string;
    quantity: number;
    price: number;
    basePrice?: number;
    commission?: number;
  }>;
  deliveryFee: number;
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
}): Promise<SplitSessionResponse> {
  const res = await fetch("/api/checkout/split", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err.error as string) || `Failed to create payment session (${res.status})`);
  }
  return res.json();
}

/**
 * Processes a mock or live webhook event to update order status and split settlement status.
 */
export async function processMockWebhook(event: {
  type: string;
  order_id: string;
  payment_id?: string;
}): Promise<boolean> {
  if (isSupabaseEnabled()) {
    const res = await fetch("/api/webhooks/cashfree", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-timestamp": String(Date.now()),
        "x-webhook-signature": "mock_sig",
      },
      body: JSON.stringify({
        type: event.type,
        data: {
          order: { order_id: event.order_id },
          payment: {
            cf_payment_id: event.payment_id || `cf_${Date.now()}`,
            payment_status: event.type.includes("SUCCESS") ? "SUCCESS" : "FAILED",
          },
        },
      }),
    });
    return res.ok;
  }

  // Mock mode: update localStorage orders
  const storedOrders = localStorage.getItem("madetrue_orders");
  if (!storedOrders) return false;
  try {
    const allOrders = JSON.parse(storedOrders) as Order[];
    let changed = false;

    for (let i = 0; i < allOrders.length; i++) {
      if (allOrders[i].gateway_order_ref === event.order_id) {
        changed = true;
        if (event.type.includes("SUCCESS")) {
          allOrders[i].split_status = "completed";
          allOrders[i].gateway_payment_ref = event.payment_id || `cf_mock_${Date.now()}`;
        } else {
          allOrders[i].status = "cancelled";
          allOrders[i].split_status = "failed";
          // Restore stock in mock store
          const prods = getStoredProducts();
          const pIdx = prods.findIndex((p) => p.id === allOrders[i].product_id);
          if (pIdx !== -1) {
            prods[pIdx].stock += allOrders[i].quantity;
            prods[pIdx].is_available = true;
            saveStoredProducts(prods);
          }
        }
      }
    }

    if (changed) {
      localStorage.setItem("madetrue_orders", JSON.stringify(allOrders));
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Sweeps online payments that were abandoned by the user beyond timeout and cancels them honestly.
 */
export async function expireAbandonedOrders(timeoutMinutes = 30): Promise<number> {
  if (isSupabaseEnabled()) {
    const res = await fetch(`/api/orders/expire-abandoned?minutes=${timeoutMinutes}`, {
      method: "POST",
    });
    if (!res.ok) return 0;
    const data = await res.json().catch(() => ({}));
    return Number(data.expired_count) || 0;
  }

  // Mock mode
  const storedOrders = localStorage.getItem("madetrue_orders");
  if (!storedOrders) return 0;
  try {
    const allOrders = JSON.parse(storedOrders) as Order[];
    const threshold = Date.now() - timeoutMinutes * 60 * 1000;
    let expiredCount = 0;

    for (let i = 0; i < allOrders.length; i++) {
      const ord = allOrders[i];
      if (
        ord.gateway &&
        ord.status === "pending" &&
        ord.split_status === "pending" &&
        new Date(ord.created_at).getTime() < threshold
      ) {
        ord.status = "cancelled";
        ord.split_status = "not_applicable";
        expiredCount++;

        const prods = getStoredProducts();
        const pIdx = prods.findIndex((p) => p.id === ord.product_id);
        if (pIdx !== -1) {
          prods[pIdx].stock += ord.quantity;
          prods[pIdx].is_available = true;
          saveStoredProducts(prods);
        }
      }
    }

    if (expiredCount > 0) {
      localStorage.setItem("madetrue_orders", JSON.stringify(allOrders));
    }
    return expiredCount;
  } catch {
    return 0;
  }
}



// ---------------------------------------------------------------------------
// Admin audit trail (Phase 5 Step 7). Every console moderation action
// records one entry through recordAudit: the actor's identity rides in
// from the session-signed-in console user; Supabase mode appends via the
// admin-guarded /api/audit route (actor_id stamped server-side from the
// session), mock mode persists to a madetrue_audit store capped at the
// newest 500 entries. getAuditLog flips the same switch for reads.
// ---------------------------------------------------------------------------

const AUDIT_STORE_KEY = "madetrue_audit";
const AUDIT_STORE_CAP = 500;

export interface AuditDraft {
  actor_name: string;
  actor_email: string;
  /** Mock mode only — the /api/audit route stamps the real id from the session. */
  actor_id?: string;
  entity_type: AuditEntityType;
  entity_id: string;
  entity_label: string;
  action: string;
  summary: string;
}

function getStoredAudit(): AuditEntry[] {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem(AUDIT_STORE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored) as AuditEntry[];
      } catch (e) {
        console.error("Failed to parse the stored audit trail", e);
      }
    }
  }
  return [];
}

function saveStoredAudit(entries: AuditEntry[]) {
  if (typeof window !== "undefined") {
    localStorage.setItem(AUDIT_STORE_KEY, JSON.stringify(entries.slice(0, AUDIT_STORE_CAP)));
  }
}

export async function getAuditLog(): Promise<AuditEntry[]> {
  if (isSupabaseEnabled()) return fetchAuditLogSupabase();
  await new Promise((resolve) => setTimeout(resolve, 50));
  // The store is kept newest-first; guard against hand-edited ordering.
  return getStoredAudit().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function recordAudit(draft: AuditDraft): Promise<boolean> {
  if (isSupabaseEnabled()) {
    return appendAuditSupabase({
      actor_name: draft.actor_name,
      actor_email: draft.actor_email,
      entity_type: draft.entity_type,
      entity_id: draft.entity_id,
      entity_label: draft.entity_label,
      action: draft.action,
      summary: draft.summary,
    });
  }

  await new Promise((resolve) => setTimeout(resolve, 50));
  const entry: AuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
    actor_id: draft.actor_id ?? "local-console",
    actor_name: draft.actor_name || "Unknown moderator",
    actor_email: draft.actor_email,
    entity_type: draft.entity_type,
    entity_id: draft.entity_id,
    entity_label: draft.entity_label,
    action: draft.action,
    summary: draft.summary,
  };
  saveStoredAudit([entry, ...getStoredAudit()]);
  return true;
}

// Update a product and reset its status to pending review
export async function updateProduct(
  id: string,
  productData: Partial<Product>
): Promise<Product | null> {
  if (isSupabaseEnabled()) return editProductSupabase(id, productData);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const products = getStoredProducts();
  const index = products.findIndex((p) => p.id === id);

  if (index !== -1) {
    products[index] = { 
      ...products[index], 
      ...productData,
      status: "pending" // Always go back to admin verification when edited!
    };
    saveStoredProducts(products);
    return products[index];
  }
  return null;
}

// Decrement product stock when a buyer purchases it
export async function decrementProductStock(
  id: string,
  quantity: number
): Promise<Product | null> {
  await new Promise((resolve) => setTimeout(resolve, 50));
  const products = getStoredProducts();
  const index = products.findIndex((p) => p.id === id);

  if (index !== -1) {
    const currentStock = products[index].stock;
    const newStock = Math.max(0, currentStock - quantity);
    products[index] = {
      ...products[index],
      stock: newStock,
      is_available: newStock > 0 ? products[index].is_available : false
    };
    saveStoredProducts(products);
    return products[index];
  }
  return null;
}

// ---------------------------------------------------------------------------
// Transactions & Refunds (Phase 6 Step 5)
// ---------------------------------------------------------------------------

export async function getOrderTransactions(orderId: string): Promise<Transaction[]> {
  if (isSupabaseEnabled()) {
    try {
      const details = await fetchOrderRefundDetailsSupabase(orderId);
      return details.transactions || [];
    } catch {
      return [];
    }
  }

  if (typeof window === "undefined") return [];
  const storedTx = localStorage.getItem("madetrue_transactions");
  if (!storedTx) return [];
  try {
    const list: Transaction[] = JSON.parse(storedTx);
    return list.filter((t) => t.order_id === orderId);
  } catch {
    return [];
  }
}

export async function refundOrder(
  orderId: string,
  options?: { amount?: number; reason?: string }
): Promise<RefundOrderResponse> {
  if (isSupabaseEnabled()) {
    return refundOrderSupabase(orderId, options);
  }

  await new Promise((resolve) => setTimeout(resolve, 150));
  const orders = getStoredOrders();
  const index = orders.findIndex((o) => o.id === orderId);
  if (index === -1) {
    return { success: false, error: `Order #${orderId} not found.` };
  }

  const order = orders[index];
  const storedTx = typeof window !== "undefined" ? localStorage.getItem("madetrue_transactions") : null;
  let allTx: Transaction[] = [];
  if (storedTx) {
    try {
      allTx = JSON.parse(storedTx);
    } catch {
      allTx = [];
    }
  }

  const orderTotal =
    (order.price || 0) * order.quantity + (order.delivery_fee || 0);

  const priorRefunded = allTx
    .filter((tx) => tx.order_id === orderId && tx.type === "refund" && tx.status !== "failed")
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

  const maxRefundable = Math.max(0, orderTotal - priorRefunded);
  if (maxRefundable <= 0) {
    return { success: false, error: `Order #${orderId} is already fully refunded.` };
  }

  const refundAmount = options?.amount
    ? Number(Math.min(options.amount, maxRefundable).toFixed(2))
    : Number(maxRefundable.toFixed(2));

  if (refundAmount <= 0) {
    return { success: false, error: "Refund amount must be greater than zero." };
  }

  // Call adapter
  const adapter = getPaymentAdapter();
  const refundId = `ref_${order.id}_${Date.now()}`;
  const refundResult = await adapter.createRefund({
    orderId: order.id,
    gatewayOrderId: order.gateway_order_ref || order.id,
    refundId,
    refundAmount,
    reason: options?.reason || "Customer order refund",
  });

  if (!refundResult.success) {
    return {
      success: false,
      error: refundResult.error || "Payment gateway rejected the refund.",
    };
  }

  const newTx: Transaction = {
    id: `tx_ref_${Date.now()}`,
    order_id: order.id,
    seller_id: order.seller_id,
    gateway: order.gateway || "mock",
    gateway_event_id: refundResult.gatewayRefundId || refundId,
    type: "refund",
    amount: refundAmount,
    currency: "INR",
    status: refundResult.status === "FAILED" ? "failed" : "completed",
    created_at: new Date().toISOString(),
  };

  if (typeof window !== "undefined") {
    localStorage.setItem("madetrue_transactions", JSON.stringify([newTx, ...allTx]));
  }

  const isFullRefund = priorRefunded + refundAmount >= orderTotal;
  let updatedOrder = { ...order };

  // A delivered order stays delivered: the refund is recorded in the
  // ledger, but fulfilment already happened and the stock left the shop.
  if (isFullRefund && canCancelOrder(order.status)) {
    updatedOrder = { ...order, status: "cancelled" };
    orders[index] = updatedOrder;
    saveStoredOrders(orders);

    // Restore stock
    const products = getStoredProducts();
    const prodIdx = products.findIndex((p) => p.id === order.product_id);
    if (prodIdx !== -1) {
      products[prodIdx].stock += order.quantity;
      products[prodIdx].is_available = true;
      saveStoredProducts(products);
    }
  }

  // Append audit
  recordAudit({
    actor_name: "Console Admin / Maker",
    actor_email: "support@madetrue.local",
    entity_type: "order",
    entity_id: order.id,
    entity_label: order.product_name ?? order.id,
    action: "order_refunded",
    summary: `Refund of ₹${refundAmount} (${isFullRefund ? "full" : "partial"}) recorded. Reason: ${options?.reason || "Not specified"}`,
  });

  return {
    success: true,
    refundId: refundResult.gatewayRefundId || refundId,
    refundAmount,
    isFullRefund,
    status: refundResult.status,
    order: updatedOrder,
  };
}

// ---------------------------------------------------------------------------
// Settlements & Commission Reports (Phase 6 Step 6)
// ---------------------------------------------------------------------------

export async function getSettlementData(
  sellerId?: string
): Promise<SettlementsResponse> {
  if (isSupabaseEnabled()) {
    return fetchSettlementsSupabase(sellerId);
  }

  await new Promise((resolve) => setTimeout(resolve, 100));
  const orders = getStoredOrders().filter((o) => o.status !== "cancelled");
  const sellers = getStoredSellers();
  const targetSellers = sellerId ? sellers.filter((s) => s.id === sellerId) : sellers;

  const adapter = getPaymentAdapter();
  const primaryVendorRef = sellerId ? targetSellers[0]?.payment_vendor_ref : undefined;
  const settlementSummary = await adapter.getSettlements({ vendorId: primaryVendorRef });

  const makerRows: MakerCommissionReportRow[] = targetSellers.map((seller) => {
    const makerOrders = orders.filter((o) => o.seller_id === seller.id);
    const orderCount = makerOrders.length;

    let grossSales = 0;
    let makerShare = 0;
    let commission = 0;
    let deliveryFees = 0;

    for (const order of makerOrders) {
      const qty = Number(order.quantity ?? 1);
      const linePrice = Number(order.price ?? 0);
      const lineBase = Number(order.base_price ?? linePrice);
      const lineComm = Number(order.commission ?? Math.max(0, linePrice - lineBase));
      const lineFee = Number(order.delivery_fee ?? 0);

      grossSales += linePrice * qty;
      makerShare += lineBase * qty;
      commission += lineComm * qty;
      deliveryFees += lineFee;
    }

    const makerSettlements = settlementSummary.settlements.filter(
      (s) => !s.vendorId || s.vendorId === seller.payment_vendor_ref
    );
    const settledAmount = makerSettlements
      .filter((s) => s.status === "SETTLED")
      .reduce((sum, s) => sum + s.amount, 0);

    const pendingSettlement = Math.max(0, makerShare - settledAmount);
    const status: MakerCommissionReportRow["status"] =
      orderCount === 0
        ? "no_sales"
        : pendingSettlement > 0
        ? "pending"
        : "settled";

    return {
      sellerId: seller.id,
      businessName: seller.business_name,
      vendorRef: seller.payment_vendor_ref || undefined,
      orderCount,
      grossSales: Number(grossSales.toFixed(2)),
      makerShare: Number(makerShare.toFixed(2)),
      commission: Number(commission.toFixed(2)),
      deliveryFees: Number(deliveryFees.toFixed(2)),
      settledAmount: Number(settledAmount.toFixed(2)),
      pendingSettlement: Number(pendingSettlement.toFixed(2)),
      status,
    };
  });

  const totalGrossSales = makerRows.reduce((acc, r) => acc + r.grossSales, 0);
  const totalMakerPayouts = makerRows.reduce((acc, r) => acc + r.makerShare, 0);
  const totalCommissionEarned = makerRows.reduce((acc, r) => acc + r.commission, 0);
  const totalDeliveryFees = makerRows.reduce((acc, r) => acc + r.deliveryFees, 0);
  const totalSettledToMakers = makerRows.reduce((acc, r) => acc + r.settledAmount, 0);
  const totalPendingSettlement = makerRows.reduce((acc, r) => acc + r.pendingSettlement, 0);

  const commissionReport: PlatformCommissionReport = {
    period: "All-time (Mock Realtime Synced)",
    currency: "INR",
    totalGrossSales: Number(totalGrossSales.toFixed(2)),
    totalMakerPayouts: Number(totalMakerPayouts.toFixed(2)),
    totalCommissionEarned: Number(totalCommissionEarned.toFixed(2)),
    totalDeliveryFees: Number(totalDeliveryFees.toFixed(2)),
    totalSettledToMakers: Number(totalSettledToMakers.toFixed(2)),
    totalPendingSettlement: Number(totalPendingSettlement.toFixed(2)),
    makerBreakdown: makerRows,
  };

  return {
    gateway: adapter.name,
    summary: settlementSummary,
    commissionReport,
  };
}

export async function syncSettlements(
  sellerId?: string
): Promise<{ success: boolean; count: number; summary: SettlementSummary }> {
  if (isSupabaseEnabled()) {
    return syncSettlementsSupabase(sellerId);
  }

  await new Promise((resolve) => setTimeout(resolve, 200));
  const adapter = getPaymentAdapter();
  const summary = await adapter.getSettlements();

  recordAudit({
    actor_name: "Console Admin / Maker",
    actor_email: "support@madetrue.local",
    entity_type: "seller",
    entity_id: sellerId || "all",
    entity_label: "Settlement Reports",
    action: "settlements_synced",
    summary: `Settlement reports synced from Mock Gateway (${summary.settlements.length} settlement batches verified, ₹${summary.totalSettled} settled).`,
  });

  return {
    success: true,
    count: summary.settlements.length,
    summary,
  };
}

