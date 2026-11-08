import { getSellers, getProductsForSeller, getOrdersForSeller } from '@/lib/supabase/client';

(async () => {
  try {
    const sellers = await getSellers();
    if (sellers.length < 2) {
      console.error('Isolation test requires at least two sellers.');
      process.exit(1);
    }
    const [sellerA, sellerB] = sellers;
    console.log('Testing isolation between sellers', sellerA.id, 'and', sellerB.id);

    // Products
    const [productsA, productsB] = await Promise.all([
      getProductsForSeller(sellerA.id),
      getProductsForSeller(sellerB.id),
    ]);
    const invalidProductsA = productsA.filter(p => p.seller_id !== sellerA.id);
    const invalidProductsB = productsB.filter(p => p.seller_id !== sellerB.id);
    if (invalidProductsA.length || invalidProductsB.length) {
      console.error('Isolation breach: products returned for wrong seller');
      process.exit(1);
    }
    console.log('✅ Products isolation verified');

    // Orders
    const [ordersA, ordersB] = await Promise.all([
      getOrdersForSeller(sellerA.id),
      getOrdersForSeller(sellerB.id),
    ]);
    const invalidOrdersA = ordersA.filter(o => o.seller_id !== sellerA.id);
    const invalidOrdersB = ordersB.filter(o => o.seller_id !== sellerB.id);
    if (invalidOrdersA.length || invalidOrdersB.length) {
      console.error('Isolation breach: orders returned for wrong seller');
      process.exit(1);
    }
    console.log('✅ Orders isolation verified');
    console.log('Isolation test passed');
    process.exit(0);
  } catch (err) {
    console.error('Isolation test error', err);
    process.exit(1);
  }
})();
