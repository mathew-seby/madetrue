-- MADETRUE — seed.sql
-- Phase 2 Step 4. Recreates the current mock catalog in the real database.
-- Run in the Supabase SQL editor AFTER 0001_init.sql and 0002_rls.sql.
--
-- Source of truth: lib/supabase/mockData.ts (catalog values) and
-- lib/supabase/auth.ts DEFAULT_USERS (the four maker accounts).
-- Ids are the stable ones 0001_init.sql reserves for the catalog
-- (cat-1…, seller-1…, prod-1…, user-seller-1…) so Step 5's reads and
-- the /products/prod-1-style routes keep working unchanged.
--
-- Honest divergences from the mock layer (day one):
--   * created_at is fixed to seed day minus the same relative offsets the
--     mock computes from Date.now() at runtime.
--   * status is 'approved' explicitly — client.ts treats a missing status
--     as approved; the DB column needs the real value.
--   * base_price = price and commission = 0, matching what addProduct()
--     writes in the mock layer.
--   * kyc_status stays 'not_started': mock is_verified is marketplace
--     verification, not the payment gateway's KYC (Phase 6 populates it).
--
-- Safe to re-run: catalog upserts by id; users insert-if-absent.

-- ---------------------------------------------------------------------------
-- Maker accounts (backing rows required by sellers.user_id NOT NULL).
-- Supabase Auth takes over identity from Phase 3; these are catalog stubs.
-- ---------------------------------------------------------------------------

insert into public.users (id, name, email, phone, role)
values
  ('user-seller-1', 'Sreedevi Amma', 'sreedevi@madetrue.local', '9876543210', 'seller'),
  ('user-seller-2', 'Kannan', 'kannan@madetrue.local', '9876543211', 'seller'),
  ('user-seller-3', 'Devaki', 'devaki@madetrue.local', '9876543212', 'seller'),
  ('user-seller-4', 'George', 'george@madetrue.local', '9876543213', 'seller')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Categories. products.category is the slug.
-- ---------------------------------------------------------------------------

insert into public.categories (id, name, slug, icon)
values
  ('cat-1', 'Spices & Herbs', 'spices', 'Leaf'),
  ('cat-2', 'Homemade Foods', 'homemade-foods', 'UtensilsCrossed'),
  ('cat-3', 'Handcrafted Goods', 'handicrafts', 'Brush'),
  ('cat-4', 'Fresh Produce', 'fresh-produce', 'Sprout'),
  ('cat-5', 'Honey & Organic', 'organic-honey', 'Flower')
on conflict (id) do update
  set name = excluded.name,
      slug = excluded.slug,
      icon = excluded.icon;

-- ---------------------------------------------------------------------------
-- Sellers. Orders and stories verbatim from mockData.ts.
-- ---------------------------------------------------------------------------

insert into public.sellers (
  id, user_id, business_name, story, profile_photo_url, address, lat, lng,
  whatsapp_number, is_verified
)
values
  (
    'seller-1', 'user-seller-1',
    'Sreedevi''s Traditional Kitchen',
    'Sreedevi Amma started making pickles in Vyttila over 30 years ago, using recipes passed down by her grandmother. She hand-cuts every mango and slow-cures them in local sesame oil under the Kerala sun. ''No chemicals, only patience,'' she says.',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80',
    'West Hill House, Vyttila Junction, Kochi, Ernakulam, Kerala',
    9.9634, 76.3204, '+919876543210', true
  ),
  (
    'seller-2', 'user-seller-2',
    'Kannan''s Ernakulam Hills Spices',
    'Kannan is a third-generation spice farmer from the misty valleys of Muvattupuzha. His family farm practices mixed farming, growing pepper, cardamom, and nutmeg side-by-side. Everything is hand-picked, washed in spring water, and solar-dried to preserve natural oils.',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80',
    'Cardamom Estate, Near KSRTC Stand, Muvattupuzha, Ernakulam, Kerala',
    9.9806, 76.5796, '+919876543211', true
  ),
  (
    'seller-3', 'user-seller-3',
    'Devaki''s Tripunithura Clay Works',
    'Devaki resides on the banks of the river in Tripunithura. She shapes red clay on a wooden wheel, making earthenware pots that keep curries flavorful and fresh. She has been preserving this ancestral heritage despite the shift to plastic and steel.',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80',
    'Kumbham Pottery Lane, Tripunithura, Ernakulam, Kerala',
    9.9472, 76.3275, '+919876543212', true
  ),
  (
    'seller-4', 'user-seller-4',
    'George''s Kothamangalam Forest Honey',
    'George works closely with tribal honey-gatherers in the deep forests of Kothamangalam. This honey is raw, unfiltered, and harvested from wild beehives high up in tree canopies. It changes flavor with the seasons, depending on which wild forest flowers are in bloom.',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80',
    'Forest View Estate, Kothamangalam, Ernakulam, Kerala',
    10.0634, 76.6219, '+919876543213', false
  )
on conflict (id) do update
  set business_name = excluded.business_name,
      story = excluded.story,
      profile_photo_url = excluded.profile_photo_url,
      address = excluded.address,
      lat = excluded.lat,
      lng = excluded.lng,
      whatsapp_number = excluded.whatsapp_number,
      is_verified = excluded.is_verified;

-- ---------------------------------------------------------------------------
-- Products. All approved, base_price = price, commission = 0.
-- created_at mirrors the mock's age ordering (prod-5 oldest … prod-6 newest).
-- ---------------------------------------------------------------------------

insert into public.products (
  id, seller_id, name, description, price, category, images, tags, stock,
  is_available, origin_details, created_at, status, base_price, commission,
  lat, lng, address
)
values
  (
    'prod-1', 'seller-1',
    'Sun-Dried Cut Mango Pickle',
    'Traditional Vyttila style cut mango pickle made using country mangoes, premium cold-pressed sesame oil, home-ground chili powder, and mustard. Sun-cured for 14 days to lock in the intense tang and spicy depth.',
    180, 'homemade-foods',
    array['https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=600&auto=format&fit=crop&q=80']::text[],
    array['Locally Made', 'Fresh Today']::public.product_badge_tag[],
    25, true,
    'Mangoes sourced from local backwater home gardens in Kuttanad, Alappuzha, processed in Vyttila.',
    now() - interval '3 days',
    'approved', 180, 0,
    9.9634, 76.3204,
    'West Hill House, Vyttila Junction, Kochi, Ernakulam, Kerala'
  ),
  (
    'prod-2', 'seller-1',
    'Stone-Ground Puttu Podi',
    'Roasted rice powder milled on a traditional stone grinder. Perfect for light, soft, layered puttu (steamed rice cakes). Retains the natural bran flavor and nutrition of organic red Matta rice.',
    90, 'homemade-foods',
    array['https://images.unsplash.com/photo-1626132647523-66f5bf380027?w=600&auto=format&fit=crop&q=80']::text[],
    array['Locally Made', 'Eco-Friendly']::public.product_badge_tag[],
    40, true,
    'Rice milled and processed in Vyttila, Ernakulam.',
    now() - interval '5 days',
    'approved', 90, 0,
    9.9634, 76.3204,
    'West Hill House, Vyttila Junction, Kochi, Ernakulam, Kerala'
  ),
  (
    'prod-3', 'seller-2',
    'Misty Valley Green Cardamom',
    'Bold 8mm green cardamom pods, hand-harvested from high-altitude estates in Muvattupuzha. Naturally solar-dried. Offers an intense aroma, citrus undertones, and warm sweet flavor profile.',
    350, 'spices',
    array['https://images.unsplash.com/photo-1599940824399-b87987ceb72a?w=600&auto=format&fit=crop&q=80']::text[],
    array['Locally Made', 'Eco-Friendly']::public.product_badge_tag[],
    50, true,
    'Grown at Kannan''s family estate in Muvattupuzha, Ernakulam.',
    now() - interval '10 days',
    'approved', 350, 0,
    9.9806, 76.5796,
    'Cardamom Estate, Near KSRTC Stand, Muvattupuzha, Ernakulam, Kerala'
  ),
  (
    'prod-4', 'seller-2',
    'Whole Black Pepper (Tellicherry Extra Bold)',
    'Late-harvested large black peppercorns from Muvattupuzha. Rich in piperine, providing a robust heat and deep fruity aroma. Perfect for grinding fresh over curries and stews.',
    260, 'spices',
    array['https://images.unsplash.com/photo-1596797038530-2c107229654b?w=600&auto=format&fit=crop&q=80']::text[],
    array['Locally Made']::public.product_badge_tag[],
    30, true,
    'Vine-ripened and sun-dried on organic bamboo mats in Muvattupuzha, Ernakulam.',
    now() - interval '8 days',
    'approved', 260, 0,
    9.9806, 76.5796,
    'Cardamom Estate, Near KSRTC Stand, Muvattupuzha, Ernakulam, Kerala'
  ),
  (
    'prod-5', 'seller-3',
    'Earthen Fish Curry Chatti (Clay Pot)',
    'Classic hand-thrown red clay pot, seasoned with starch water. Renowned for slow-cooking and heat retention. Imparts a unique earthy flavor to traditional Kerala fish curry and beef roasts.',
    220, 'handicrafts',
    array['https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?w=600&auto=format&fit=crop&q=80']::text[],
    array['Locally Made', 'Eco-Friendly', 'Pickup Available']::public.product_badge_tag[],
    8, true,
    'Hand-thrown by Devaki using local clay in Tripunithura, Ernakulam.',
    now() - interval '12 days',
    'approved', 220, 0,
    9.9472, 76.3275,
    'Kumbham Pottery Lane, Tripunithura, Ernakulam, Kerala'
  ),
  (
    'prod-6', 'seller-4',
    'Wild Kothamangalam Forest Honey',
    '100% pure raw honey collected from forest beehives. Unpasteurized, unfiltered, and rich in pollen. Has a complex herbal aroma and deep amber color with immune-boosting qualities.',
    480, 'organic-honey',
    array['https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=600&auto=format&fit=crop&q=80']::text[],
    array['Locally Made', 'Eco-Friendly', 'Same Day Delivery']::public.product_badge_tag[],
    15, true,
    'Ethically harvested from the forests of Kothamangalam, Ernakulam.',
    now() - interval '2 days',
    'approved', 480, 0,
    10.0634, 76.6219,
    'Forest View Estate, Kothamangalam, Ernakulam, Kerala'
  )
on conflict (id) do update
  set seller_id = excluded.seller_id,
      name = excluded.name,
      description = excluded.description,
      price = excluded.price,
      category = excluded.category,
      images = excluded.images,
      tags = excluded.tags,
      stock = excluded.stock,
      is_available = excluded.is_available,
      origin_details = excluded.origin_details,
      created_at = excluded.created_at,
      status = excluded.status,
      base_price = excluded.base_price,
      commission = excluded.commission,
      lat = excluded.lat,
      lng = excluded.lng,
      address = excluded.address;
