// lib/calc.test.ts
// Sepuluh kasus uji dari SCHEMA.md bagian 8.1
import { describe, it, expect } from "vitest"
import { calc, type CalcInput } from "./calc"

/** Input default — semua nol, tanpa item */
const base: CalcInput = {
  items: [],
  diskonTipe: "nominal",
  diskonNilai: 0,
  pajakPersen: 0,
  pajakInklusif: false,
  ongkir: 0,
  biayaLain: 0,
  pembulatanAktif: false,
  dibayar: 0,
}

function input(overrides: Partial<CalcInput>): CalcInput {
  return { ...base, ...overrides }
}

describe("calc — kasus uji SCHEMA.md §8.1", () => {
  // 1. 1 item, qty 3 × Rp 15.000 → subtotal 45.000, total 45.000
  it("#1 — satu item sederhana", () => {
    const r = calc(input({
      items: [{ qty: 3, hargaSatuan: 15_000, diskonBaris: 0 }],
    }))
    expect(r.subtotal).toBe(45_000)
    expect(r.total).toBe(45_000)
  })

  // 2. Diskon persen 10% dari 45.000 → diskon 4.500, total 40.500
  it("#2 — diskon persen 10%", () => {
    const r = calc(input({
      items: [{ qty: 3, hargaSatuan: 15_000, diskonBaris: 0 }],
      diskonTipe: "persen",
      diskonNilai: 10,
    }))
    expect(r.diskonNominal).toBe(4_500)
    expect(r.total).toBe(40_500)
  })

  // 3. Diskon nominal melebihi subtotal → diskon dibatasi = subtotal, total 0
  it("#3 — diskon nominal melebihi subtotal", () => {
    const r = calc(input({
      items: [{ qty: 1, hargaSatuan: 10_000, diskonBaris: 0 }],
      diskonTipe: "nominal",
      diskonNilai: 50_000,
    }))
    expect(r.diskonNominal).toBe(10_000)
    expect(r.total).toBe(0)
  })

  // 4. Pajak 11% eksklusif dari 100.000 → pajak 11.000, total 111.000
  it("#4 — pajak 11% eksklusif", () => {
    const r = calc(input({
      items: [{ qty: 1, hargaSatuan: 100_000, diskonBaris: 0 }],
      pajakPersen: 11,
    }))
    expect(r.pajakNominal).toBe(11_000)
    expect(r.total).toBe(111_000)
  })

  // 5. Pajak 11% inklusif dari 111.000 → pajak 11.000, total tetap 111.000
  it("#5 — pajak 11% inklusif", () => {
    const r = calc(input({
      items: [{ qty: 1, hargaSatuan: 111_000, diskonBaris: 0 }],
      pajakPersen: 11,
      pajakInklusif: true,
    }))
    expect(r.pajakNominal).toBe(11_000)
    expect(r.total).toBe(111_000)
  })

  // 6. qty pecahan 0,5 × Rp 12.500 → subtotal 6.250
  it("#6 — qty pecahan", () => {
    const r = calc(input({
      items: [{ qty: 0.5, hargaSatuan: 12_500, diskonBaris: 0 }],
    }))
    expect(r.subtotal).toBe(6_250)
  })

  // 7. Pembulatan aktif, total 45.470 → total 45.500
  it("#7 — pembulatan aktif", () => {
    // Untuk mendapat total kasar 45.470, kita perlu item yang subtotalnya 45.470
    // Misal: 1 item qty 1 × 45.470 = subtotal 45.470
    const r = calc(input({
      items: [{ qty: 1, hargaSatuan: 45_470, diskonBaris: 0 }],
      pembulatanAktif: true,
    }))
    expect(r.total).toBe(45_500)
  })

  // 8. Ongkir 20.000 dengan pajak 11% → pajak hanya dari barang, bukan ongkir
  it("#8 — ongkir tidak dikenai pajak", () => {
    const r = calc(input({
      items: [{ qty: 1, hargaSatuan: 100_000, diskonBaris: 0 }],
      pajakPersen: 11,
      ongkir: 20_000,
    }))
    // pajak dari 100.000 = 11.000 (bukan dari 120.000)
    expect(r.pajakNominal).toBe(11_000)
    expect(r.total).toBe(131_000) // 100.000 + 11.000 + 20.000
  })

  // 9. Dibayar 50.000 dari total 111.000 → sisa 61.000
  it("#9 — pembayaran sebagian", () => {
    const r = calc(input({
      items: [{ qty: 1, hargaSatuan: 100_000, diskonBaris: 0 }],
      pajakPersen: 11,
      dibayar: 50_000,
    }))
    expect(r.total).toBe(111_000)
    expect(r.sisa).toBe(61_000)
  })

  // 10. Kwitansi → dibayar = total, sisa 0
  it("#10 — kwitansi dibayar penuh", () => {
    const r = calc(input({
      items: [{ qty: 1, hargaSatuan: 100_000, diskonBaris: 0 }],
      pajakPersen: 11,
      dibayar: 111_000,
    }))
    expect(r.total).toBe(111_000)
    expect(r.sisa).toBe(0)
  })
})
