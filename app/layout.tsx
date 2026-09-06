import AppChrome from "@/components/layout/AppChrome";
import { RequestProvider } from "@/context/RequestContext";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ChinaChapu — Product requests",
  description:
    "Browse ChinaChapu categories and request catalogue or custom products. No prices or customer accounts. Staff will contact you about availability.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased flex flex-col min-h-screen`}>
        <RequestProvider>
          <AppChrome>{children}</AppChrome>
        </RequestProvider>
      </body>
    </html>
  );
}
