// lib/struk/lines.ts
// Satu sumber tata letak struk thermal (fungsi murni).
// Menghasilkan susunan baris teks monosape untuk printer 58mm (32 char) dan 80mm (48 char).

import type { CalcResult } from "@/lib/calc"
import { formatRupiah, formatTanggal, terbilang } from "@/lib/format"

export type StrukDocInput = {
  tipe: "nota" | "invoice" | "kwitansi"
  nomor: string
  tanggal: string
  dueDate?: string | null
  customerNama?: string | null
  diterimaDari?: string | null
  items: {
    nama: string
    qty: number
    satuan?: string
    hargaSatuan: number
    diskonBaris?: number
    subtotal?: number
  }[]
  diskonTipe?: "nominal" | "persen"
  diskonNilai?: number
  pajakPersen?: number
  pajakInklusif?: boolean
  ongkir?: number
  biayaLain?: number
  dibayar?: number
  catatan?: string | null
}

export type StrukBusinessInput = {
  nama: string
  alamat?: string | null
  telepon?: string | null
}

/**
 * Meratakan teks ke tengah dengan padding spasi.
 * Panjang keluaran PERSIS sama dengan width.
 */
export function centerText(text: string, width: number): string {
  const trimmed = text.trim()
  if (trimmed.length >= width) {
    return trimmed.slice(0, width)
  }
  const padLeft = Math.floor((width - trimmed.length) / 2)
  const padRight = width - trimmed.length - padLeft
  return " ".repeat(padLeft) + trimmed + " ".repeat(padRight)
}

/**
 * Merakit dua kolom (kiri & kanan) dengan padding spasi.
 * Kolom kiri dipangkas dengan elipsis (...) bila melebihi batas.
 * Panjang keluaran PERSIS sama dengan width.
 */
export function formatTwoColumns(left: string, right: string, width: number): string {
  const minGap = 1
  const maxLeft = width - right.length - minGap

  let truncatedLeft = left
  if (maxLeft < 1) {
    return right.length >= width ? right.slice(0, width) : right.padStart(width, " ")
  }

  if (left.length > maxLeft) {
    if (maxLeft >= 3) {
      truncatedLeft = left.slice(0, maxLeft - 3) + "..."
    } else {
      truncatedLeft = left.slice(0, maxLeft)
    }
  }

  const gapSize = width - truncatedLeft.length - right.length
  const gap = " ".repeat(Math.max(1, gapSize))
  return truncatedLeft + gap + right
}

/**
 * Memastikan baris teks tepat berpanjang width dengan memangkas atau menambah spasi di kanan.
 */
export function padLine(str: string, width: number): string {
  if (str.length === width) return str
  if (str.length > width) return str.slice(0, width)
  return str + " ".repeat(width - str.length)
}

/**
 * Membungkus teks panjang menjadi beberapa baris yang masing-masing berpanjang width.
 */
export function wrapText(prefix: string, text: string, width: number): string[] {
  const full = `${prefix}${text}`
  if (full.length <= width) {
    return [padLine(full, width)]
  }

  const result: string[] = []
  let remaining = full
  while (remaining.length > 0) {
    if (remaining.length <= width) {
      result.push(padLine(remaining, width))
      break
    }
    let cut = remaining.lastIndexOf(" ", width)
    if (cut <= 0) cut = width
    result.push(padLine(remaining.slice(0, cut).trimEnd(), width))
    remaining = remaining.slice(cut).trimStart()
  }
  return result
}

/**
 * Menghasilkan susunan baris teks untuk cetak struk thermal.
 * Setiap baris dalam array berpanjang PERSIS sama dengan lebarKarakter.
 */
export function buildStrukLines(
  doc: StrukDocInput,
  calcResult: CalcResult,
  business: StrukBusinessInput,
  lebarKarakter: number = 32,
): string[] {
  const lines: string[] = []
  const width = lebarKarakter
  const separator = "-".repeat(width)

  // 1. Nama usaha (tengah)
  lines.push(centerText(business.nama || "Usaha Saya", width))

  // 2. Alamat & telepon (tengah)
  if (business.alamat && business.alamat.trim() !== "") {
    lines.push(centerText(business.alamat, width))
  }
  if (business.telepon && business.telepon.trim() !== "") {
    lines.push(centerText(business.telepon, width))
  }

  // 3. Pemisah putus-putus
  lines.push(separator)

  // 4. Nomor/tanggal/jenis dokumen
  const jenisDocStr = doc.tipe.toUpperCase()
  lines.push(formatTwoColumns(jenisDocStr, doc.nomor || "", width))

  const tglFormatted = doc.tanggal ? formatTanggal(doc.tanggal) : ""
  lines.push(formatTwoColumns("Tanggal", tglFormatted, width))

  if (doc.dueDate && doc.dueDate.trim() !== "") {
    lines.push(formatTwoColumns("Jatuh Tempo", formatTanggal(doc.dueDate), width))
  }

  if (doc.customerNama && doc.customerNama.trim() !== "") {
    lines.push(formatTwoColumns("Pelanggan", doc.customerNama, width))
  }

  // Kwitansi: sertakan "Telah diterima dari"
  if (doc.tipe === "kwitansi" && doc.diterimaDari && doc.diterimaDari.trim() !== "") {
    lines.push(formatTwoColumns("Diterima Dari", doc.diterimaDari, width))
  }

  // 5. Pemisah
  lines.push(separator)

  // 6. Satu baris per item (nama+qty kiri, subtotal kanan; harga satuan di baris kedua bila perlu)
  const validItems = doc.items.filter((it) => it.nama.trim() !== "" || it.hargaSatuan > 0)
  validItems.forEach((item, idx) => {
    const itemSubtotal =
      item.subtotal ??
      calcResult.itemSubtotals[idx] ??
      item.qty * item.hargaSatuan - (item.diskonBaris || 0)
    const subtotalStr = formatRupiah(itemSubtotal)

    const qtySuffix = item.qty !== 1 ? ` x${item.qty}` : ""
    const leftText = `${item.nama}${qtySuffix}`

    lines.push(formatTwoColumns(leftText, subtotalStr, width))

    // Harga satuan di baris kedua bila perlu
    if (item.qty !== 1 || (item.diskonBaris && item.diskonBaris > 0)) {
      const unitDetail = `  @ ${formatRupiah(item.hargaSatuan)}${
        item.satuan ? " / " + item.satuan : ""
      }`
      lines.push(padLine(unitDetail, width))
    }
  })

  // 7. Pemisah
  lines.push(separator)

  // 8. Subtotal/diskon/pajak/ongkir (hanya yang bukan nol), TOTAL, dibayar, sisa
  if (calcResult.subtotal > 0) {
    lines.push(formatTwoColumns("Subtotal", formatRupiah(calcResult.subtotal), width))
  }

  if (calcResult.diskonNominal > 0) {
    lines.push(formatTwoColumns("Diskon", `-` + formatRupiah(calcResult.diskonNominal), width))
  }

  if (calcResult.pajakNominal > 0) {
    const pajakLabel = doc.pajakInklusif
      ? `Pajak (${doc.pajakPersen || 0}% Inc)`
      : `Pajak (${doc.pajakPersen || 0}%)`
    lines.push(formatTwoColumns(pajakLabel, formatRupiah(calcResult.pajakNominal), width))
  }

  if (doc.ongkir && doc.ongkir > 0) {
    lines.push(formatTwoColumns("Ongkir", formatRupiah(doc.ongkir), width))
  }

  if (doc.biayaLain && doc.biayaLain > 0) {
    lines.push(formatTwoColumns("Biaya Lain", formatRupiah(doc.biayaLain), width))
  }

  if (calcResult.pembulatanNominal !== 0) {
    lines.push(formatTwoColumns("Pembulatan", formatRupiah(calcResult.pembulatanNominal), width))
  }

  // TOTAL
  lines.push(formatTwoColumns("TOTAL", formatRupiah(calcResult.total), width))

  // Dibayar & Sisa
  const dibayar = doc.dibayar ?? calcResult.total - calcResult.sisa
  lines.push(formatTwoColumns("Dibayar", formatRupiah(dibayar), width))
  lines.push(formatTwoColumns("Sisa", formatRupiah(calcResult.sisa), width))

  // Kwitansi: terbilang
  if (doc.tipe === "kwitansi") {
    const kataTerbilang = terbilang(calcResult.total)
    lines.push(...wrapText("Terbilang: ", kataTerbilang, width))
  }

  // 9. Catatan bila ada
  if (doc.catatan && doc.catatan.trim() !== "") {
    lines.push(separator)
    lines.push(...wrapText("Catatan: ", doc.catatan, width))
  }

  // 10. Pemisah & Footer
  lines.push(separator)
  lines.push(centerText("Terima kasih", width))

  return lines.map((l) => padLine(l, width))
}
