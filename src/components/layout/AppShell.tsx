"use client";

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import AuthErrorNotice from "./AuthErrorNotice";

export default function AppShell({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Scroll back to the header on navigation (replaces the old ScrollToTop).
  useEffect(() => {
    document.getElementById("page-header")?.scrollIntoView();
  }, [pathname]);

  return (
    <>
      <Suspense fallback={null}>
        <AuthErrorNotice />
      </Suspense>
      <Header toggleMenu={() => setIsSidebarOpen(true)} />
      <main>{children}</main>
      <Footer />
      <Sidebar open={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </>
  );
}
