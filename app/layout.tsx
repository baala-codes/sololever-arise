import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "ARISE — Personal Leveling System",
  description: "A Solo-Leveling styled operating system for one hunter.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ARISE", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0A0E14",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <div className="flex min-h-dvh">
          <Suspense fallback={<div className="hidden w-40 shrink-0 border-r border-line md:block" />}>
            <Nav />
          </Suspense>
          <main className="grid-fade min-w-0 flex-1 px-4 py-5 pb-20 md:px-8 md:py-7 md:pb-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
