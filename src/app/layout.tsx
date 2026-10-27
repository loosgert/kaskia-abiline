import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/site-footer";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kaskia abiline",
  description: "Kaskia AI-abiline vastab küsimustele purgijahuti kohta.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: "#f6f2ed",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="et" className="h-full antialiased">
      <body className="flex h-dvh flex-col">
        {children}
        <SiteFooter />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
