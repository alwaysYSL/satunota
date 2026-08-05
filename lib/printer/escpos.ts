// lib/printer/escpos.ts
// Pembuat perintah ESC/POS murni untuk printer thermal Bluetooth.
// Fungsi murni — tanpa dependensi hardware, React, atau I/O.

export const COMMANDS = {
  INIT: [0x1b, 0x40], // ESC @ (Reset/Init)
  ALIGN_LEFT: [0x1b, 0x61, 0x00], // ESC a 0
  ALIGN_CENTER: [0x1b, 0x61, 0x01], // ESC a 1
  BOLD_ON: [0x1b, 0x45, 0x01], // ESC E 1
  BOLD_OFF: [0x1b, 0x45, 0x00], // ESC E 0
  DOUBLE_SIZE_ON: [0x1d, 0x21, 0x11], // GS ! 0x11 (dobel lebar + tinggi)
  DOUBLE_SIZE_OFF: [0x1d, 0x21, 0x00], // GS ! 0x00 (reset ukuran)
  LF: [0x0a], // LF (Line feed)
  CUT_PAPER: [0x1d, 0x56, 0x00], // GS V 0 (Potong kertas)
} as const

function encodeAscii(text: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i)
    // Teks di-encode ASCII murni (0x20 - 0x7E), selain itu diganti spasi
    bytes.push(code >= 0x20 && code <= 0x7e ? code : 0x20)
  }
  return bytes
}

export type EscposBuildOptions = {
  headerLinesCount?: number
}

/**
 * Mengubah array baris teks hasil buildStrukLines menjadi payload Uint8Array berisi perintah ESC/POS.
 */
export function buildEscposPayload(
  lines: string[],
  opts?: EscposBuildOptions,
): Uint8Array {
  const buffer: number[] = []

  // 1. Inisialisasi printer: ESC @
  buffer.push(...COMMANDS.INIT)

  const headerCount = opts?.headerLinesCount ?? 1

  lines.forEach((line, index) => {
    const isHeaderLine = index < headerCount
    const isTotalLine = line.includes("TOTAL")
    const isFooterLine = line.trim() === "Terima kasih"

    if (isHeaderLine) {
      // Header (misal nama usaha): Tengah + Tebal
      buffer.push(...COMMANDS.ALIGN_CENTER)
      buffer.push(...COMMANDS.BOLD_ON)
      buffer.push(...encodeAscii(line))
      buffer.push(...COMMANDS.LF)
      buffer.push(...COMMANDS.BOLD_OFF)
      buffer.push(...COMMANDS.ALIGN_LEFT)
    } else if (isTotalLine) {
      // TOTAL: Bold + Double width & height
      buffer.push(...COMMANDS.BOLD_ON)
      buffer.push(...COMMANDS.DOUBLE_SIZE_ON)
      buffer.push(...encodeAscii(line))
      buffer.push(...COMMANDS.LF)
      buffer.push(...COMMANDS.DOUBLE_SIZE_OFF)
      buffer.push(...COMMANDS.BOLD_OFF)
    } else if (isFooterLine) {
      // Footer: Tengah
      buffer.push(...COMMANDS.ALIGN_CENTER)
      buffer.push(...encodeAscii(line))
      buffer.push(...COMMANDS.LF)
      buffer.push(...COMMANDS.ALIGN_LEFT)
    } else {
      // Baris biasa: Kiri
      buffer.push(...encodeAscii(line))
      buffer.push(...COMMANDS.LF)
    }
  })

  // Perintah potong kertas di akhir: GS V 0
  buffer.push(...COMMANDS.CUT_PAPER)

  return new Uint8Array(buffer)
}

/**
 * Memotong payload Uint8Array menjadi beberapa potongan (chunks) maksimal maksByte (default 512).
 * Pemotongan HANYA dilakukan setelah byte LF (0x0A) agar tidak memutus urutan perintah ESC/GS di tengah jalan.
 */
export function splitChunks(
  payload: Uint8Array,
  maksByte: number = 512,
): Uint8Array[] {
  if (payload.length <= maksByte) {
    return [payload]
  }

  const chunks: Uint8Array[] = []
  let start = 0

  while (start < payload.length) {
    const remaining = payload.length - start
    if (remaining <= maksByte) {
      chunks.push(payload.subarray(start))
      break
    }

    const searchLimit = start + maksByte
    let cutPoint = -1

    // Cari byte LF (0x0A) terakhir dalam rentang [start, searchLimit)
    for (let i = searchLimit - 1; i >= start; i--) {
      if (payload[i] === 0x0a) {
        cutPoint = i + 1 // potong persis setelah byte LF
        break
      }
    }

    // Jika tidak ada LF ditemukan, potong di searchLimit
    if (cutPoint <= start) {
      cutPoint = searchLimit
    }

    chunks.push(payload.subarray(start, cutPoint))
    start = cutPoint
  }

  return chunks
}
