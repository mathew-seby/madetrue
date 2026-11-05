import type { Metadata } from "next";
import { Lora, Inter } from "next/font/google";
import Navbar from "@/components/shared/Navbar";
import Footer from "@/components/shared/Footer";
import { AuthProvider } from "@/components/shared/AuthProvider";
import { CartProvider } from "@/components/shared/CartProvider";
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
  title: "MADETRUE - Hyperlocal Kerala Produce & Artisanal Goods",
  description: "Directly connect and shop from local Kerala spice farmers, organic producers, and handcrafters. Story-first, community-owned, and transparent.",
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

