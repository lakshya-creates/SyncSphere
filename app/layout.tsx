import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SyncSphere Dashboard Prototype",
  description: "Enterprise AI productivity dashboard spanning Microsoft and GitHub ecosystems.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
