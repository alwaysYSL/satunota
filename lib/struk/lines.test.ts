// lib/struk/lines.test.ts
// Tes unit untuk fungsi layout struk murni.

import { describe, it, expect } from "vitest"
import { buildStrukLines, type StrukDocInput, type StrukBusinessInput } from "./lines"
import { calc } from "@/lib/calc"

const sampleBusiness: StrukBusinessInput = {
  nama: "Warung Kopi Sejahtera",
  alamat: "Jl. Merdeka No. 45, Jakarta",
  telepon: "081234567890",
}

describe("buildStrukLines", () => {
  it("setiap baris berpanjang PERSIS 32 dan 48 pada dua lebar", () => {
    const doc: StrukDocInput = {
      tipe: "nota",
      nomor: "NT/2608/0001",
      tanggal: "2026-08-05",
      items: [
        { nama: "Kopi Susu", qty: 2, hargaSatuan: 15000, subtotal: 30000 },
        { nama: "Roti Bakar", qty: 1, hargaSatuan: 12000, subtotal: 12000 },
      ],
      dibayar: 50000,
    }
    const calcRes = calc({
      items: doc.items.map((i) => ({ qty: i.qty, hargaSatuan: i.hargaSatuan, diskonBaris: 0 })),
      diskonTipe: "nominal",
      diskonNilai: 0,
      pajakPersen: 0,
      pajakInklusif: false,
      ongkir: 0,
      biayaLain: 0,
      pembulatanAktif: false,
      dibayar: 50000,
    })

    const lines32 = buildStrukLines(doc, calcRes, sampleBusiness, 32)
    expect(lines32.length).toBeGreaterThan(0)
    for (const line of lines32) {
      expect(line.length).toBe(32)
    }

    const lines48 = buildStrukLines(doc, calcRes, sampleBusiness, 48)
    expect(lines48.length).toBeGreaterThan(0)
    for (const line of lines48) {
      expect(line.length).toBe(48)
    }
  })

  it("nama item 40 karakter dipangkas elipsis, total baris tetap tepat lebar", () => {
    const itemNama40 = "1234567890123456789012345678901234567890" // 40 karakter
    expect(itemNama40.length).toBe(40)

    const doc: StrukDocInput = {
      tipe: "nota",
      nomor: "NT/2608/0002",
      tanggal: "2026-08-05",
      items: [{ nama: itemNama40, qty: 1, hargaSatuan: 25000, subtotal: 25000 }],
      dibayar: 25000,
    }
    const calcRes = calc({
      items: [{ qty: 1, hargaSatuan: 25000, diskonBaris: 0 }],
      diskonTipe: "nominal",
      diskonNilai: 0,
      pajakPersen: 0,
      pajakInklusif: false,
      ongkir: 0,
      biayaLain: 0,
      pembulatanAktif: false,
      dibayar: 25000,
    })

    const lines32 = buildStrukLines(doc, calcRes, sampleBusiness, 32)
    for (const line of lines32) {
      expect(line.length).toBe(32)
    }
    // Baris item dipangkas dengan elipsis "..."
    const itemLine = lines32.find((l) => l.includes("..."))
    expect(itemLine).toBeDefined()
    expect(itemLine?.length).toBe(32)
  })

  it("angka TOTAL cocok dengan calc() untuk kasus uji nomor 5 (pajak inklusif) SCHEMA.md 8.1", () => {
    // Kasus 5: Pajak 11% inklusif dari 111.000
    const doc: StrukDocInput = {
      tipe: "nota",
      nomor: "NT/2608/0005",
      tanggal: "2026-08-05",
      pajakPersen: 11,
      pajakInklusif: true,
      items: [{ nama: "Produk Inklusif", qty: 1, hargaSatuan: 111000, subtotal: 111000 }],
      dibayar: 111000,
    }
    const calcRes = calc({
      items: [{ qty: 1, hargaSatuan: 111000, diskonBaris: 0 }],
      diskonTipe: "nominal",
      diskonNilai: 0,
      pajakPersen: 11,
      pajakInklusif: true,
      ongkir: 0,
      biayaLain: 0,
      pembulatanAktif: false,
      dibayar: 111000,
    })

    expect(calcRes.total).toBe(111000)
    expect(calcRes.pajakNominal).toBe(11000)

    const lines = buildStrukLines(doc, calcRes, sampleBusiness, 32)
    const totalLine = lines.find((l) => l.startsWith("TOTAL"))
    expect(totalLine).toBeDefined()
    expect(totalLine).toContain("Rp 111.000")
  })

  it("angka TOTAL cocok dengan calc() untuk kasus uji nomor 8 (ongkir) SCHEMA.md 8.1", () => {
    // Kasus 8: Ongkir 20.000 dengan barang 100.000 + pajak 11% eksklusif (pajak 11.000, total 131.000)
    const doc: StrukDocInput = {
      tipe: "invoice",
      nomor: "INV/2608/0008",
      tanggal: "2026-08-05",
      pajakPersen: 11,
      pajakInklusif: false,
      ongkir: 20000,
      items: [{ nama: "Produk Utama", qty: 1, hargaSatuan: 100000, subtotal: 100000 }],
      dibayar: 131000,
    }
    const calcRes = calc({
      items: [{ qty: 1, hargaSatuan: 100000, diskonBaris: 0 }],
      diskonTipe: "nominal",
      diskonNilai: 0,
      pajakPersen: 11,
      pajakInklusif: false,
      ongkir: 20000,
      biayaLain: 0,
      pembulatanAktif: false,
      dibayar: 131000,
    })

    expect(calcRes.total).toBe(131000)

    const lines = buildStrukLines(doc, calcRes, sampleBusiness, 32)
    const totalLine = lines.find((l) => l.startsWith("TOTAL"))
    const ongkirLine = lines.find((l) => l.startsWith("Ongkir"))

    expect(totalLine).toContain("Rp 131.000")
    expect(ongkirLine).toContain("Rp 20.000")
  })

  it("diskon/pajak/ongkir bernilai nol tidak menghasilkan baris", () => {
    const doc: StrukDocInput = {
      tipe: "nota",
      nomor: "NT/2608/0009",
      tanggal: "2026-08-05",
      diskonNilai: 0,
      pajakPersen: 0,
      ongkir: 0,
      items: [{ nama: "Nasi Goreng", qty: 1, hargaSatuan: 15000, subtotal: 15000 }],
      dibayar: 15000,
    }
    const calcRes = calc({
      items: [{ qty: 1, hargaSatuan: 15000, diskonBaris: 0 }],
      diskonTipe: "nominal",
      diskonNilai: 0,
      pajakPersen: 0,
      pajakInklusif: false,
      ongkir: 0,
      biayaLain: 0,
      pembulatanAktif: false,
      dibayar: 15000,
    })

    const lines = buildStrukLines(doc, calcRes, sampleBusiness, 32)
    const diskonLine = lines.find((l) => l.startsWith("Diskon"))
    const pajakLine = lines.find((l) => l.startsWith("Pajak"))
    const ongkirLine = lines.find((l) => l.startsWith("Ongkir"))

    expect(diskonLine).toBeUndefined()
    expect(pajakLine).toBeUndefined()
    expect(ongkirLine).toBeUndefined()
  })

  it("kwitansi menyertakan Diterima Dari dan Terbilang", () => {
    const doc: StrukDocInput = {
      tipe: "kwitansi",
      nomor: "KW/2608/0001",
      tanggal: "2026-08-05",
      diterimaDari: "Budi Santoso",
      items: [{ nama: "Pembayaran DP", qty: 1, hargaSatuan: 50000, subtotal: 50000 }],
      dibayar: 50000,
    }
    const calcRes = calc({
      items: [{ qty: 1, hargaSatuan: 50000, diskonBaris: 0 }],
      diskonTipe: "nominal",
      diskonNilai: 0,
      pajakPersen: 0,
      pajakInklusif: false,
      ongkir: 0,
      biayaLain: 0,
      pembulatanAktif: false,
      dibayar: 50000,
    })

    const lines = buildStrukLines(doc, calcRes, sampleBusiness, 32)
    const diterimaLine = lines.find((l) => l.includes("Diterima Dari"))
    const hasTerbilang = lines.some((l) => l.includes("Terbilang"))
    const hasRupiah = lines.some((l) => l.includes("rupiah"))

    expect(diterimaLine).toBeDefined()
    expect(diterimaLine).toContain("Budi Santoso")
    expect(hasTerbilang).toBe(true)
    expect(hasRupiah).toBe(true)
  })
})
