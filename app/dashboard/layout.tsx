import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Maker Dashboard",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

