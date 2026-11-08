import { mockCategories, mockSellers, mockProducts } from "./mockData";
import { Category, Seller, Product, Order } from "../../types";
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
  submitProductSupabase,
  editProductSupabase,
  fetchAllProductsSupabase,
  fetchProductsForSellerSupabase,
  deleteProductSupabase,
  uploadProductImageSupabase,
  submitSellerSupabase,
  updateSellerVerificationSupabase,
} from "./writeSupabase";

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

export async function getCategories(): Promise<Category[]> {
  if (isSupabaseEnabled()) return fetchCategoriesSupabase();
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  return mockCategories;
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

  // Public listing should only return approved products or initial mock products (no status)
  let products = allProducts.filter((p) => !p.status || p.status === "approved");

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
  return product || null;
}

export async function getProductsBySellerId(sellerId: string): Promise<Product[]> {
  if (isSupabaseEnabled()) return fetchProductsBySellerIdSupabase(sellerId);
  await new Promise((resolve) => setTimeout(resolve, 100));
  const products = getStoredProducts();
  // Filter by seller id and ensure they are approved for public listing
  return products.filter((p) => p.seller_id === sellerId && (!p.status || p.status === "approved"));
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

// Delete a product listing (used by seller dashboard and admin console)
export async function deleteProduct(id: string, sellerId?: string): Promise<boolean> {
  if (isSupabaseEnabled()) return deleteProductSupabase(id, sellerId);
  await new Promise((resolve) => setTimeout(resolve, 50));
  const products = getStoredProducts();
  const index = products.findIndex((p) => p.id === id);
  if (index === -1) return false;
  if (sellerId && products[index].seller_id !== sellerId) {
    throw new Error("[madetrue] You can only delete your own products.");
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

// Update the review status of a product (approve/reject)
export async function updateProductStatus(
  id: string,
  status: "approved" | "rejected" | "pending",
  reason?: string,
  commission?: number
): Promise<Product | null> {
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
      price: finalPrice
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

// Helper to get orders list
function getStoredOrders(): Order[] {
  if (typeof window !== "undefined") {
    const stored = localStorage.getItem("madetrue_orders");
    if (stored) {
      try {
        return JSON.parse(stored) as Order[];
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

// Get all orders for admin panel
export async function getOrdersAdmin(): Promise<Order[]> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return getStoredOrders();
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

// Update the status of an order
export async function updateOrderStatus(
  id: string,
  status: 'pending' | 'accepted' | 'completed' | 'cancelled'
): Promise<Order | null> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  const orders = getStoredOrders();
  const index = orders.findIndex((o) => o.id === id);

  if (index !== -1) {
    orders[index] = { ...orders[index], status };
    saveStoredOrders(orders);
    return orders[index];
  }
  return null;
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

  // Decrement stock for purchased products
  for (const item of newOrders) {
    await decrementProductStock(item.product_id, item.quantity);
  }

  return newOrders;
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
