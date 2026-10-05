import type { Metadata, Viewport } from "next";
import { Bebas_Neue } from "next/font/google";
import { preload } from "react-dom";
import type { ReactNode } from "react";
import AuthProvider from "@/components/providers/AuthProvider";
import AppShell from "@/components/layout/AppShell";
import { getGoogleCredentials } from "@/lib/oauth/google";
import { getTwitterCredentials } from "@/lib/oauth/twitter";
import "./globals.css";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas-neue",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ejuicr",
  description:
    "ejuicr is a convenient and easy-to-use e-juice calculator for creating and managing recipes.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#21222c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // Start the session lookup while the HTML is still parsing so it runs in
  // parallel with the JS download; the AuthProvider fetch reuses it after
  // hydration instead of starting a second request.
  preload("/api/user/me", { as: "fetch", crossOrigin: "anonymous" });

  const providers = {
    google: Boolean(getGoogleCredentials()),
    twitter: Boolean(getTwitterCredentials()),
  };

  return (
    <html lang="en">
      <body className={bebasNeue.variable}>
        <AuthProvider providers={providers}>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
