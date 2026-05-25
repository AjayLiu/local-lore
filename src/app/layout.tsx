import type { Metadata } from "next";
import { Sriracha, Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { GA_MEASUREMENT_ID } from "@/lib/analytics/gtag";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const loreDisplay = Sriracha({
  variable: "--font-lore-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "LocalLore",
  description:
    "AI-powered local history explorer.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${loreDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {GA_MEASUREMENT_ID ? (
          <GoogleAnalytics measurementId={GA_MEASUREMENT_ID} />
        ) : null}
        {children}
      </body>
    </html>
  );
}
