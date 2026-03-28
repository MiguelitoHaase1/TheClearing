import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Continuous Improvements",
  description: "Experiment dashboard — review what improved and why",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex">
        <nav className="w-56 shrink-0 border-r border-border bg-surface flex flex-col p-4 gap-1">
          <Link
            href="/"
            className="text-accent font-semibold text-lg mb-4 tracking-tight"
          >
            CI Dashboard
          </Link>
          <Link
            href="/"
            className="px-3 py-2 rounded-md text-sm hover:bg-accent-muted transition-colors"
          >
            Overview
          </Link>
          <Link
            href="/experiments"
            className="px-3 py-2 rounded-md text-sm hover:bg-accent-muted transition-colors"
          >
            Experiments
          </Link>
          <div className="mt-auto pt-4 border-t border-border">
            <p className="text-xs text-muted px-3">
              Continuous Improvements
            </p>
          </div>
        </nav>
        <main className="flex-1 p-8 overflow-auto">{children}</main>
      </body>
    </html>
  );
}
