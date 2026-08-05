// lib/printer/escpos.test.ts
// Tes unit untuk pembuat perintah ESC/POS murni dan fungsi splitChunks.

import { describe, it, expect } from "vitest"
import { buildEscposPayload, splitChunks, COMMANDS } from "./escpos"
import { buildStrukLines, type StrukDocInput, type StrukBusinessInput } from "@/lib/struk/lines"
import { calc } from "@/lib/calc"

const sampleDoc: StrukDocInput = {
  tipe: "nota",
  nomor: "NT/2608/0001",
  tanggal: "2026-08-05",
  items: [
    { nama: "Kopi Susu", qty: 2, hargaSatuan: 15000, subtotal: 30000 },
    { nama: "Roti Bakar", qty: 1, hargaSatuan: 12000, subtotal: 12000 },
  ],
  dibayar: 50000,
}

const sampleCalc = calc({
  items: [{ qty: 2, hargaSatuan: 15000, diskonBaris: 0 }, { qty: 1, hargaSatuan: 12000, diskonBaris: 0 }],
  diskonTipe: "nominal",
  diskonNilai: 0,
  pajakPersen: 0,
  pajakInklusif: false,
  ongkir: 0,
  biayaLain: 0,
  pembulatanAktif: false,
  dibayar: 50000,
})

const sampleBiz: StrukBusinessInput = {
  nama: "Warung Kopi",
  alamat: "Jl. Sudirman 12",
}

describe("buildEscposPayload", () => {
  it("payload diawali ESC @ dan diakhiri perintah potong GS V 0", () => {
    const lines = buildStrukLines(sampleDoc, sampleCalc, sampleBiz, 32)
    const payload = buildEscposPayload(lines)

    // Awalan ESC @ (0x1B, 0x40)
    expect(payload[0]).toBe(COMMANDS.INIT[0])
    expect(payload[1]).toBe(COMMANDS.INIT[1])

    // Akhiran GS V 0 (0x1D, 0x56, 0x00)
    const len = payload.length
    expect(payload[len - 3]).toBe(COMMANDS.CUT_PAPER[0])
    expect(payload[len - 2]).toBe(COMMANDS.CUT_PAPER[1])
    expect(payload[len - 1]).toBe(COMMANDS.CUT_PAPER[2])
  })

  it("baris TOTAL dibungkus urutan dobel lebar GS ! 0x11 dan reset GS ! 0x00", () => {
    const lines = buildStrukLines(sampleDoc, sampleCalc, sampleBiz, 32)
    const payload = buildEscposPayload(lines)

    // Cari urutan GS ! 0x11 ([0x1d, 0x21, 0x11])
    let foundDoubleOn = false
    let foundDoubleOff = false

    for (let i = 0; i < payload.length - 2; i++) {
      if (
        payload[i] === COMMANDS.DOUBLE_SIZE_ON[0] &&
        payload[i + 1] === COMMANDS.DOUBLE_SIZE_ON[1] &&
        payload[i + 2] === COMMANDS.DOUBLE_SIZE_ON[2]
      ) {
        foundDoubleOn = true
      }
      if (
        payload[i] === COMMANDS.DOUBLE_SIZE_OFF[0] &&
        payload[i + 1] === COMMANDS.DOUBLE_SIZE_OFF[1] &&
        payload[i + 2] === COMMANDS.DOUBLE_SIZE_OFF[2]
      ) {
        foundDoubleOff = true
      }
    }

    expect(foundDoubleOn).toBe(true)
    expect(foundDoubleOff).toBe(true)
  })

  it("hasil build untuk 32 dan 48 karakter berbeda panjang barisnya", () => {
    const lines32 = buildStrukLines(sampleDoc, sampleCalc, sampleBiz, 32)
    const lines48 = buildStrukLines(sampleDoc, sampleCalc, sampleBiz, 48)

    const payload32 = buildEscposPayload(lines32)
    const payload48 = buildEscposPayload(lines48)

    expect(payload32.length).not.toEqual(payload48.length)
    expect(payload48.length).toBeGreaterThan(payload32.length)
  })
})

describe("splitChunks", () => {
  it("splitChunks pada payload 2.000 byte menghasilkan potongan yang masing-masing ≤ 512 byte dan tidak ada potongan yang berakhir di tengah urutan ESC/GS", () => {
    // Buat payload dummy 2.000 byte berulang dengan garis-garis berakhiran LF (0x0A)
    const lineStr = "Baris data struk thermal panjang berulang kali\n"
    const lineBytes = new TextEncoder().encode(lineStr) // ~47 bytes per line

    const buffer: number[] = [...COMMANDS.INIT]
    while (buffer.length < 2000) {
      // Sisipkan urutan perintah ESC/GS di antara beberapa baris
      if (buffer.length % 200 === 0) {
        buffer.push(...COMMANDS.BOLD_ON)
      }
      for (const b of lineBytes) {
        buffer.push(b)
      }
    }
    buffer.push(...COMMANDS.CUT_PAPER)

    const payload = new Uint8Array(buffer)
    expect(payload.length).toBeGreaterThan(2000)

    const chunks = splitChunks(payload, 512)
    expect(chunks.length).toBeGreaterThan(1)

    let totalLength = 0
    chunks.forEach((chunk, idx) => {
      totalLength += chunk.length
      // Masing-masing chunk ≤ 512 byte
      expect(chunk.length).toBeLessThanOrEqual(512)

      // Kecuali chunk terakhir, setiap chunk harus berakhir setelah LF (0x0A)
      if (idx < chunks.length - 1) {
        const lastByte = chunk[chunk.length - 1]
        expect(lastByte).toBe(0x0a)
      }
    })

    // Total byte gabungan potongan harus sama persis dengan payload awal
    expect(totalLength).toBe(payload.length)
  })
})
