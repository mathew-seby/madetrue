import type { Metadata } from "next";
import { getProductById } from "@/lib/supabase/client";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  try {
    const product = await getProductById(id);

    if (!product) {
      return {
        title: "Product Not Found",
        description: "The requested local Kerala product could not be found on MADETRUE.",
      };
    }

    const title = `${product.name} — ₹${product.price}`;
    const description = product.description
      ? product.description.slice(0, 160)
      : `Buy ${product.name} directly from local Kerala makers on MADETRUE.`;

    return {
      title,
      description,
      openGraph: {
        title: `${product.name} | MADETRUE Kerala`,
        description,
        images: product.images && product.images.length > 0 ? [{ url: product.images[0] }] : undefined,
      },
    };
  } catch (err) {
    console.error("Error generating product metadata", err);
    return {
      title: "Local Product",
      description: "Directly connect and shop from local Kerala producers on MADETRUE.",
    };
  }
}

export default function ProductDetailLayout({ children }: Props) {
  return <>{children}</>;
}

