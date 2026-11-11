import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop Local Kerala Produce & Crafts",
  description:
    "Explore authentic spices, homemade delicacies, and artisanal handicrafts direct from verified Kerala producers with doorstep delivery across Ernakulam.",
  openGraph: {
    title: "Shop Local Kerala Produce & Crafts | MADETRUE",
    description:
      "Explore authentic spices, homemade delicacies, and artisanal handicrafts direct from verified Kerala producers.",
  },
};

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

