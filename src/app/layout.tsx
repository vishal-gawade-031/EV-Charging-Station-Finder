import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "EV Charge India — Smart EV Charging Station Finder",
  description:
    "Find nearby EV charging stations across India, calculate straight-line distances from your location, view interactive OpenStreetMap maps, and estimate electric vehicle driving range.",
  keywords: [
    "EV charging India",
    "electric vehicle chargers",
    "charging station finder",
    "EV charging map India",
    "fast chargers India",
    "CCS2",
    "Type 2",
    "EV range calculator",
  ],
  authors: [{ name: "EV Charge India Team" }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f8fafc] text-gray-900">
        {children}
      </body>
    </html>
  );
}
