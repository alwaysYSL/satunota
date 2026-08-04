// lib/entitlements.test.ts
import { describe, it, expect } from "vitest"
import { can, isProOnly, requiresAccount, type Feature, type Plan } from "./entitlements"

describe("can(feature, plan)", () => {
  // ── Fitur yang tersedia untuk semua plan ───────────────────
  const universalFeatures: Feature[] = [
    "buat_dokumen",
    "preview",
    "unduh_pdf",
    "unduh_png",
    "bagikan_whatsapp",
    "tanpa_watermark",
    "fallback_cetak_gambar",
    "riwayat_pencarian",
    "duplikat_dokumen",
    "status_pembayaran",
    "ekspor_csv_json",
    "bekerja_offline",
    "konversi_invoice_kwitansi",
    "penomoran_otomatis",
    "profil_usaha_logo",
    "terbilang",
    "line_item_diskon_pajak",
    "daftar_pelanggan",
  ]

  for (const feature of universalFeatures) {
    it(`${feature} tersedia untuk guest, free, dan pro`, () => {
      expect(can(feature, "guest")).toBe(true)
      expect(can(feature, "free")).toBe(true)
      expect(can(feature, "pro")).toBe(true)
    })
  }

  // ── Cetak thermal: tidak untuk tamu, ya untuk free & pro ──
  it("cetak_thermal ditolak untuk guest", () => {
    expect(can("cetak_thermal", "guest")).toBe(false)
  })

  it("cetak_thermal diizinkan untuk free", () => {
    expect(can("cetak_thermal", "free")).toBe(true)
  })

  it("cetak_thermal diizinkan untuk pro", () => {
    expect(can("cetak_thermal", "pro")).toBe(true)
  })

  // ── Fallback cetak gambar: boleh untuk tamu ───────────────
  it("fallback_cetak_gambar diizinkan untuk guest", () => {
    expect(can("fallback_cetak_gambar", "guest")).toBe(true)
  })

  // ── Fitur Pro saja ────────────────────────────────────────
  const proOnlyFeatures: Feature[] = [
    "katalog_produk",
    "impor_katalog_csv",
    "rekap_penjualan",
    "pengingat_jatuh_tempo",
    "tanda_tangan_stempel",
    "multi_template",
    "link_dokumen_publik",
  ]

  for (const feature of proOnlyFeatures) {
    it(`${feature} ditolak untuk guest`, () => {
      expect(can(feature, "guest")).toBe(false)
    })

    it(`${feature} ditolak untuk free`, () => {
      expect(can(feature, "free")).toBe(false)
    })

    it(`${feature} diizinkan untuk pro`, () => {
      expect(can(feature, "pro")).toBe(true)
    })
  }

  // ── Fitur yang butuh akun (free+pro, bukan guest) ─────────
  const accountFeatures: Feature[] = [
    "hapus_akun",
    "sinkron_antar_perangkat",
    "cadangan_cloud",
  ]

  for (const feature of accountFeatures) {
    it(`${feature} ditolak untuk guest`, () => {
      expect(can(feature, "guest")).toBe(false)
    })

    it(`${feature} diizinkan untuk free`, () => {
      expect(can(feature, "free")).toBe(true)
    })

    it(`${feature} diizinkan untuk pro`, () => {
      expect(can(feature, "pro")).toBe(true)
    })
  }
})

describe("isProOnly()", () => {
  it("mengembalikan true untuk katalog_produk", () => {
    expect(isProOnly("katalog_produk")).toBe(true)
  })

  it("mengembalikan false untuk cetak_thermal (free juga bisa)", () => {
    expect(isProOnly("cetak_thermal")).toBe(false)
  })

  it("mengembalikan false untuk buat_dokumen (semua bisa)", () => {
    expect(isProOnly("buat_dokumen")).toBe(false)
  })
})

describe("requiresAccount()", () => {
  it("cetak_thermal memerlukan akun", () => {
    expect(requiresAccount("cetak_thermal")).toBe(true)
  })

  it("sinkron_antar_perangkat memerlukan akun", () => {
    expect(requiresAccount("sinkron_antar_perangkat")).toBe(true)
  })

  it("buat_dokumen tidak memerlukan akun", () => {
    expect(requiresAccount("buat_dokumen")).toBe(false)
  })

  it("katalog_produk memerlukan akun (Pro)", () => {
    expect(requiresAccount("katalog_produk")).toBe(true)
  })
})
