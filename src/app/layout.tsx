import type { Metadata, Viewport } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "@/components/providers/session-provider";
import { OfflineSyncProvider } from "@/components/providers/offline-sync-provider";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VapePOS — Vape & E-Cigarette POS System",
  description: "Enterprise-grade POS and Inventory Management for Vape Retail Stores",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "VapePOS",
  },
};

export const viewport: Viewport = {
  themeColor: "#7c3aed",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className={`${inter.className} min-h-screen bg-background antialiased`}>
        <SessionProvider>
          <OfflineSyncProvider>
            {children}
            <Toaster />
          </OfflineSyncProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
