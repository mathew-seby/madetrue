// Server-side image uploads for Supabase Storage (product-images bucket).
// Used by the seller dashboard when MADETRUE_DATA_SOURCE=supabase.
// Step 7: only makers (and admins) may upload — storage belongs to stores.

import { NextResponse } from "next/server";
import { isSupabaseEnabled } from "@/lib/supabase/dataSource";
import { createSupabaseServerClient } from "@/lib/supabase/supabase-server";
import { getServerUser } from "@/lib/supabase/server-auth";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

export async function POST(request: Request) {
  if (!isSupabaseEnabled()) {
    return NextResponse.json(
      { error: "MADETRUE_DATA_SOURCE is 'mock' — cloud storage is off." },
      { status: 400 }
    );
  }

  const user = await getServerUser();
  if (!user) {
    return NextResponse.json(
      { error: "Sign in before uploading product images." },
      { status: 401 }
    );
  }
  if (user.role !== "seller" && user.role !== "admin") {
    return NextResponse.json(
      { error: "Product photos are uploaded from maker accounts." },
      { status: 403 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not parse image upload form data." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || typeof file === "string" || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "Please select a valid image file to upload." },
      { status: 400 }
    );
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Image file exceeds the 5MB limit. Please upload a smaller photo." },
      { status: 400 }
    );
  }

  const mimeType = file.type || "image/jpeg";
  if (!ALLOWED_MIME_TYPES.includes(mimeType) && !mimeType.startsWith("image/")) {
    return NextResponse.json(
      { error: "Please upload a valid image file (JPG, PNG, WebP, AVIF, GIF)." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseServerClient();

  // Ensure the product-images bucket is present
  try {
    const { data: buckets } = await supabase.storage.listBuckets();
    const hasBucket = buckets?.some((b) => b.name === "product-images");
    if (!hasBucket) {
      await supabase.storage.createBucket("product-images", {
        public: true,
        fileSizeLimit: MAX_IMAGE_BYTES,
        allowedMimeTypes: ALLOWED_MIME_TYPES,
      });
    }
  } catch {
    // If list/create is restricted, proceed directly to upload attempt
  }

  const fileNameOriginal = "name" in file && typeof file.name === "string" ? file.name : "upload.jpg";
  const rawExt = fileNameOriginal.split(".").pop()?.toLowerCase() || "jpg";
  const ext = ["jpg", "jpeg", "png", "webp", "avif", "gif"].includes(rawExt) ? rawExt : "jpg";
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const filePath = `products/${Date.now()}-${randomSuffix}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(filePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json(
      { error: `Image upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: urlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(filePath);

  return NextResponse.json({ url: urlData.publicUrl });
}
