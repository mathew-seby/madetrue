import type { Metadata } from "next";
import { getSellerById } from "@/lib/supabase/client";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const seller = await getSellerById(id);

    if (!seller) {
      return {
        title: "Maker Not Found",
        description: "The requested local Kerala maker profile could not be found on MADETRUE.",
      };
    }

    const title = `${seller.business_name} — Kerala Maker Story`;
    const description = seller.story
      ? seller.story.slice(0, 160)
      : `Meet ${seller.business_name}, a verified local Kerala producer on MADETRUE.`;

    return {
      title,
      description,
      openGraph: {
        title: `${seller.business_name} | Verified Kerala Maker on MADETRUE`,
        description,
        images: seller.profile_photo_url ? [{ url: seller.profile_photo_url }] : undefined,
      },
    };
  } catch (err) {
    console.error("Error generating seller metadata", err);
    return {
      title: "Local Kerala Maker",
      description: "Meet independent spice farmers, artisans, and home kitchens on MADETRUE.",
    };
  }
}

export default function SellerProfileLayout({ children }: Props) {
  return <>{children}</>;
}

