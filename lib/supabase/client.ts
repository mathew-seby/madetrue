import { mockCategories, mockSellers, mockProducts } from "./mockData";
import { Category, Seller, Product } from "../../types";

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
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 100));
  return mockCategories;
}

export async function getSellers(): Promise<Seller[]> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return getStoredSellers();
}

export async function getSellerById(id: string): Promise<Seller | null> {
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
  await new Promise((resolve) => setTimeout(resolve, 50));
  const products = getStoredProducts();
  const product = products.find((p) => p.id === id);
  return product || null;
}

export async function getProductsBySellerId(sellerId: string): Promise<Product[]> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  const products = getStoredProducts();
  // Filter by seller id and ensure they are approved for public listing
  return products.filter((p) => p.seller_id === sellerId && (!p.status || p.status === "approved"));
}

/* ADMIN & SELLER ACTIONS (MOCKED) */

// Get all products (including pending and rejected) for admin
export async function getAllProductsAdmin(): Promise<Product[]> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  return getStoredProducts();
}

// Submit a new product (defaults to 'pending' review)
export async function addProduct(productData: Omit<Product, "id" | "created_at">): Promise<Product> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  const products = getStoredProducts();
  
  const newProduct: Product = {
    ...productData,
    id: `prod-${Date.now()}`,
    created_at: new Date().toISOString(),
    status: "pending", // Always pending review when submitted by consumer/seller
  };

  products.push(newProduct);
  saveStoredProducts(products);
  return newProduct;
}

// Update the review status of a product (approve/reject)
export async function updateProductStatus(
  id: string,
  status: "approved" | "rejected" | "pending"
): Promise<Product | null> {
  await new Promise((resolve) => setTimeout(resolve, 100));
  const products = getStoredProducts();
  const index = products.findIndex((p) => p.id === id);
  
  if (index !== -1) {
    products[index] = { ...products[index], status };
    saveStoredProducts(products);
    return products[index];
  }
  
  return null;
}

// Add a new seller (mock signup)
export async function addSeller(sellerData: Omit<Seller, "id">): Promise<Seller> {
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
