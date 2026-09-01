import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Greenscape Pro — Reactivation Agent",
  description: "Re-engage closed-lost leads with human approval on every send.",
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
