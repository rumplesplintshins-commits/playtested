
import type { Metadata } from "next";
import { Rajdhani, Inter } from "next/font/google";
import "./globals.css";
import SiteFooter from "./components/SiteFooter";
import ToastDemo from "./components/ToastDemo";
import {publicMetadata,SITE_ORIGIN,SITE_TITLE,SITE_DESCRIPTION} from "../lib/seo";

const displayFont = Rajdhani({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const bodyFont = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  ...publicMetadata(SITE_TITLE,SITE_DESCRIPTION,"/"),
  metadataBase:new URL(SITE_ORIGIN),
  alternates:undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>
        {children}
        <SiteFooter />
        <ToastDemo />
      </body>
    </html>
  );
}
