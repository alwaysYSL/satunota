// lib/entitlements.ts
// Sumber kebenaran: docs/PRICING.md bagian 2 (matriks fitur lengkap).
// Semua pengecekan fitur melewati fungsi can().
// Tidak boleh ada pengecekan paket langsung di komponen UI.

export type Plan = "guest" | "free" | "pro"

export type Feature =
  | "buat_dokumen"
  | "preview"
  | "unduh_pdf"
  | "unduh_png"
  | "bagikan_whatsapp"
  | "tanpa_watermark"
  | "fallback_cetak_gambar"
  | "cetak_thermal"
  | "riwayat_pencarian"
  | "duplikat_dokumen"
  | "status_pembayaran"
  | "ekspor_csv_json"
  | "bekerja_offline"
  | "hapus_akun"
  | "sinkron_antar_perangkat"
  | "daftar_pelanggan"
  | "katalog_produk"
  | "impor_katalog_csv"
  | "rekap_penjualan"
  | "pengingat_jatuh_tempo"
  | "cadangan_cloud"
  | "tanda_tangan_stempel"
  | "multi_template"
  | "link_dokumen_publik"
  | "konversi_invoice_kwitansi"
  | "penomoran_otomatis"
  | "profil_usaha_logo"
  | "terbilang"
  | "line_item_diskon_pajak"

// Pemetaan fitur ke paket. true = boleh dipakai.
const ENTITLEMENTS: Record<Feature, Record<Plan, boolean>> = {
  // 2.1 Membuat dokumen
  buat_dokumen:              { guest: true,  free: true,  pro: true },
  line_item_diskon_pajak:    { guest: true,  free: true,  pro: true },
  terbilang:                 { guest: true,  free: true,  pro: true },
  preview:                   { guest: true,  free: true,  pro: true },
  profil_usaha_logo:         { guest: true,  free: true,  pro: true },
  penomoran_otomatis:        { guest: true,  free: true,  pro: true },
  konversi_invoice_kwitansi: { guest: true,  free: true,  pro: true },
  tanda_tangan_stempel:      { guest: false, free: false, pro: true },

  // 2.2 Mengeluarkan & mengirim dokumen
  unduh_pdf:                 { guest: true,  free: true,  pro: true },
  unduh_png:                 { guest: true,  free: true,  pro: true },
  bagikan_whatsapp:          { guest: true,  free: true,  pro: true },
  tanpa_watermark:           { guest: true,  free: true,  pro: true },
  fallback_cetak_gambar:     { guest: true,  free: true,  pro: true },
  cetak_thermal:             { guest: false, free: true,  pro: true },
  multi_template:            { guest: false, free: false, pro: true },
  link_dokumen_publik:       { guest: false, free: false, pro: true },

  // 2.3 Data & pengelolaan
  riwayat_pencarian:         { guest: true,  free: true,  pro: true },
  duplikat_dokumen:          { guest: true,  free: true,  pro: true },
  status_pembayaran:         { guest: true,  free: true,  pro: true },
  ekspor_csv_json:           { guest: true,  free: true,  pro: true },
  bekerja_offline:           { guest: true,  free: true,  pro: true },
  hapus_akun:                { guest: false, free: true,  pro: true },
  sinkron_antar_perangkat:   { guest: false, free: true,  pro: true },
  daftar_pelanggan:          { guest: true,  free: true,  pro: true },
  katalog_produk:            { guest: false, free: false, pro: true },
  impor_katalog_csv:         { guest: false, free: false, pro: true },
  rekap_penjualan:           { guest: false, free: false, pro: true },
  pengingat_jatuh_tempo:     { guest: false, free: false, pro: true },
  cadangan_cloud:            { guest: false, free: true,  pro: true },
}

/**
 * Cek apakah plan tertentu boleh memakai fitur tertentu.
 */
export function can(feature: Feature, plan: Plan): boolean {
  const entry = ENTITLEMENTS[feature]
  if (!entry) return false
  return entry[plan] ?? false
}

/**
 * Apakah fitur ini hanya untuk Pro?
 * Berguna untuk menampilkan label "Pro" di UI.
 */
export function isProOnly(feature: Feature): boolean {
  const entry = ENTITLEMENTS[feature]
  if (!entry) return false
  return !entry.guest && !entry.free && entry.pro
}

/**
 * Apakah fitur ini memerlukan registrasi (minimal akun gratis)?
 * Berguna untuk menampilkan ajakan daftar.
 */
export function requiresAccount(feature: Feature): boolean {
  const entry = ENTITLEMENTS[feature]
  if (!entry) return false
  return !entry.guest && (entry.free || entry.pro)
}
