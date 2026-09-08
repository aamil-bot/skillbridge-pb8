import type { Metadata } from "next";

import { Toaster } from "@/components/ui/Toaster";
import { AppProvider } from "@/lib/hooks";
import { SessionProvider } from "@/lib/session";

import "./globals.css";

export const metadata: Metadata = {
  title: "SkillBridge",
  description:
    "Verified student skills, transparent job matching and placement analytics for colleges, students and recruiters.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Loaded at runtime, so an offline judging laptop falls back to the
            system sans stack instead of failing the build. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans">
        <SessionProvider>
          <AppProvider>
            {children}
            <Toaster />
          </AppProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
