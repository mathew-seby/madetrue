import { Order } from '@/types';
import { getOrdersForSeller } from '@/lib/supabase/client';

export interface DashboardStats {
  todayOrders: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
}

export async function getDashboardStats(sellerId: string): Promise<DashboardStats> {
  const orders: Order[] = await getOrdersForSeller(sellerId);
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  let todayOrders = 0;
  let totalOrders = 0;
  let totalRevenue = 0;
  let pendingOrders = 0;

  for (const o of orders) {
    totalOrders++;
    totalRevenue += Number(o.price);
    if (o.status === 'pending') pendingOrders++;
    if (o.created_at?.startsWith(today)) todayOrders++;
  }

  return { todayOrders, totalOrders, totalRevenue, pendingOrders };
}
