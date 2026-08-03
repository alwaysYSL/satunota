import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SATUNOTA — Buat Nota, Invoice, Kwitansi",
  description:
    "Aplikasi web pembuat nota, invoice, dan kwitansi. Tanpa daftar, tanpa iklan, tanpa watermark. Langsung buat, unduh PDF, atau cetak.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} font-sans`}>
      <body className="min-h-dvh flex flex-col">{children}</body>
    </html>
  );
}
