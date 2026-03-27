import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OnchainTerm — Crypto Market Terminal",
  description:
    "Real-time cryptocurrency market intelligence terminal. Track prices, market caps, and trends for top crypto assets.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
