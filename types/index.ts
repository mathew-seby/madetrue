export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'buyer' | 'seller' | 'admin';
  location_lat?: number;
  location_lng?: number;
  region?: string;
  language_pref?: string;
  profile_photo_url?: string;
}

export interface Seller {
  id: string;
  user_id: string;
  business_name: string;
  story: string;
  profile_photo_url: string;
  video_url?: string;
  address: string;
  lat: number;
  lng: number;
  whatsapp_number: string;
  is_verified: boolean;
}

// The exact badge tag strings allowed on products (AGENTS.md badge list)
export type ProductBadgeTag = 'Same Day Delivery' | 'Pickup Available' | 'Fresh Today' | 'Locally Made' | 'Eco-Friendly';

export interface Product {
  id: string;
  seller_id: string;
  name: string;
  description: string;
  price: number;
  category: string; // category slug
  images: string[];
  tags: ProductBadgeTag[];
  stock: number;
  is_available: boolean;
  origin_details: string;
  created_at: string;
  status?: 'pending' | 'approved' | 'rejected';
  documents?: { name: string; url: string }[];
  lat?: number;
  lng?: number;
  address?: string;
  base_price?: number;
  commission?: number;
}

export interface Order {
  id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  quantity: number;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  delivery_type: 'delivery' | 'pickup';
  address: string;
  payment_method: 'upi' | 'cod';
  whatsapp_notified: boolean;
  created_at: string;
  lat?: number;
  lng?: number;
  base_price?: number;
  commission?: number;
  // Denormalized display fields carried on stored order records and used
  // directly by the admin console order cards.
  buyer_name?: string;
  buyer_phone?: string;
  product_name?: string;
  price?: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string; // React component or lucide icon name
  slug: string;
}
