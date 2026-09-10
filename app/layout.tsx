import React from "react";
import "@/app/globals.css";
import Header from "./components/common/Header";
import Footer from "./components/common/Footer";
import { AuthProvider } from "./context/AuthContext";
import GlobalSuspensionGuard from "./components/common/AuthGuard";
import BootLoader from "./components/common/BootLoader";
import { getFullTitle, getSiteDescription } from "./services/siteConfig";

export const metadata = {
  title: getFullTitle("Your Daily Chess Hub"),
  description: getSiteDescription(),
  icons: {
    icon: "/logo.png",
  },
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-chess-bg text-chess-text antialiased flex flex-col selection:bg-chess-primary selection:text-chess-surface">
        <AuthProvider>
          <GlobalSuspensionGuard>
            <Header />
            <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">
              {children}
            </main>
            <Footer />
          </GlobalSuspensionGuard>
        </AuthProvider>
        <BootLoader />
      </body>
    </html>
  );
}
