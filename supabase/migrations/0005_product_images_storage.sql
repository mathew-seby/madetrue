-- MADETRUE — 0005_product_images_storage.sql
-- Phase 4 Step 1: Storage bucket for product images and verification documents.
--
-- Run this in the Supabase SQL editor to create the public bucket and RLS policies.

-- 1. Create product-images bucket if it does not already exist
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB limit
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

-- 2. Storage RLS policies for product-images
drop policy if exists "Product images are publicly accessible" on storage.objects;
create policy "Product images are publicly accessible"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Authenticated makers can upload product images" on storage.objects;
create policy "Authenticated makers can upload product images"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'product-images');

drop policy if exists "Authenticated makers can update their product images" on storage.objects;
create policy "Authenticated makers can update their product images"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'product-images');

drop policy if exists "Authenticated makers can delete their product images" on storage.objects;
create policy "Authenticated makers can delete their product images"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'product-images');
