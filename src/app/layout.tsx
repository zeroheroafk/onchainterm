import type { Metadata } from "next"
import { ToastProvider } from "@/lib/toast-context"
import "./globals.css"

export const metadata: Metadata = {
  title: "OnchainTerm — Crypto Market Terminal",
  description:
    "Real-time cryptocurrency market intelligence terminal. Track prices, market caps, and trends for top crypto assets.",
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-sans antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
