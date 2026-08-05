import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

const inter = {
  variable: "--font-sans",
  className: "font-sans",
  style: { fontFamily: '"Inter Variable", sans-serif' },
}

export const metadata: Metadata = {
  title: "SATUNOTA — Buat Nota, Invoice, Kwitansi",
  description:
    "Aplikasi web pembuat nota, invoice, dan kwitansi. Tanpa daftar, tanpa iklan, tanpa watermark. Langsung buat, unduh PDF, atau cetak.",
};

import { SwRegister } from "@/components/sw-register";
import { AuthMigrator } from "@/components/shared/auth-migrator";
import { RetentionBanner } from "@/components/shared/retention-banner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} font-sans`}>
      <body className="min-h-dvh flex flex-col">
        <SwRegister />
        <AuthMigrator />
        <RetentionBanner />
        {children}
      </body>
    </html>
  );
}
