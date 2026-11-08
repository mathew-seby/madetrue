import type { NextRequest } from 'next/server';
import { getSellers, getProductsForSeller, getOrdersForSeller } from '@/lib/supabase/client';

export async function GET(request: NextRequest) {
  try {
    const sellers = await getSellers();
    if (sellers.length < 2) {
      return new Response(JSON.stringify({ error: 'Need at least two sellers' }), { status: 400 });
    }
    const [sellerA, sellerB] = sellers;
    const [productsA, productsB] = await Promise.all([
      getProductsForSeller(sellerA.id),
      getProductsForSeller(sellerB.id),
    ]);
    const prodIssueA = productsA.some(p => p.seller_id !== sellerA.id);
    const prodIssueB = productsB.some(p => p.seller_id !== sellerB.id);
    if (prodIssueA || prodIssueB) {
      return new Response(JSON.stringify({ error: 'Products isolation breach' }), { status: 500 });
    }
    const [ordersA, ordersB] = await Promise.all([
      getOrdersForSeller(sellerA.id),
      getOrdersForSeller(sellerB.id),
    ]);
    const orderIssueA = ordersA.some(o => o.seller_id !== sellerA.id);
    const orderIssueB = ordersB.some(o => o.seller_id !== sellerB.id);
    if (orderIssueA || orderIssueB) {
      return new Response(JSON.stringify({ error: 'Orders isolation breach' }), { status: 500 });
    }
    return new Response(JSON.stringify({ success: true, message: 'Isolation test passed' }));
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}
