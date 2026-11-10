import type { Metadata } from "next";
import { Lora, Inter } from "next/font/google";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import { AuthProvider } from "@/components/shared/AuthProvider";
import { CartProvider } from "@/components/shared/CartProvider";
import { SITE_URL, COMPANY_DETAILS } from "@/lib/utils/constants";
import "./globals.css";

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-lora",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MADETRUE — Hyperlocal Kerala Produce & Artisanal Marketplace",
    template: "%s | MADETRUE",
  },
  description:
    "Directly connect and shop from local Kerala spice farmers, organic producers, and passionate artisans. Story-first, community-owned, trust-first, and delivered to your doorstep.",
  keywords: [
    "Kerala local produce",
    "Kerala spices",
    "hyperlocal marketplace Kerala",
    "artisanal goods Kochi",
    "Ernakulam local delivery",
    "buy local Kerala",
    "farm to table Kerala",
    "traditional Kerala food",
    "MADETRUE",
  ],
  authors: [{ name: COMPANY_DETAILS.legalName, url: SITE_URL }],
  creator: COMPANY_DETAILS.brandName,
  publisher: COMPANY_DETAILS.legalName,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "MADETRUE — Hyperlocal Kerala Produce & Artisanal Marketplace",
    description:
      "Directly connect and shop from local Kerala spice farmers, organic producers, and passionate artisans. Built on trust, local stories, and real taste.",
    url: SITE_URL,
    siteName: "MADETRUE",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MADETRUE — Hyperlocal Kerala Marketplace",
    description:
      "Connecting Kerala's spice growers, traditional home-cooks, and passionate artisans directly with nearby neighbors.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${lora.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-cream-bg text-text-dark">
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="flex-grow">{children}</main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

