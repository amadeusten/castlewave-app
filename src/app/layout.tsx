import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tenekedes | August 15, 2026",
  description: "An unforgettable event in Miami.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
