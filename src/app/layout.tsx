import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Campus Connect | LPU",
  description: "Your all-in-one campus companion.",
};

import { SocketProvider } from "@/components/providers/SocketProvider";
import LocationTracker from "@/components/providers/LocationTracker";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <ThemeProvider>
          <Providers>
            <SocketProvider>
              <LocationTracker />
              <Navbar />
              {children}
            </SocketProvider>
          </Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
