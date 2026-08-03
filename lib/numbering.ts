// lib/numbering.ts
// Parsing dan penomoran dokumen.
// Fungsi murni — tanpa akses jaringan, penyimpanan, atau Date.now().

/**
 * Token yang dikenali dalam pola penomoran:
 * {YYYY} {YY} {MM} {DD} {0001} {001} {01}
 *
 * Pola default:
 * - NT/{YY}{MM}/{0001}
 * - INV/{YY}{MM}/{0001}
 * - KW/{YY}{MM}/{0001}
 */

export type NumberingContext = {
  /** Pola penomoran, mis. "NT/{YY}{MM}/{0001}" */
  pola: string
  /** Nomor urut berikutnya */
  nextSeq: number
  /** Tahun (4 digit) */
  tahun: number
  /** Bulan (1-12) */
  bulan: number
  /** Hari (1-31) */
  hari: number
}

/**
 * Buat nomor dokumen berdasarkan pola dan konteks.
 */
export function generateNomor(ctx: NumberingContext): string {
  const yy = String(ctx.tahun).slice(-2)
  const yyyy = String(ctx.tahun)
  const mm = String(ctx.bulan).padStart(2, "0")
  const dd = String(ctx.hari).padStart(2, "0")

  let result = ctx.pola
  result = result.replace("{YYYY}", yyyy)
  result = result.replace("{YY}", yy)
  result = result.replace("{MM}", mm)
  result = result.replace("{DD}", dd)

  // Ganti token urutan dengan format yang sesuai
  result = result.replace(/\{(0+1)\}/g, (_match, ones: string) => {
    const panjang = ones.length
    return String(ctx.nextSeq).padStart(panjang, "0")
  })

  return result
}

/**
 * Hasil parsing nomor dokumen.
 */
export type ParsedNomor = {
  /** Apakah parsing berhasil */
  valid: boolean
  /** Tahun yang diekstrak (2 digit → 2000+) */
  tahun: number | null
  /** Bulan yang diekstrak (1-12) */
  bulan: number | null
  /** Nomor urut yang diekstrak */
  seq: number | null
}

/**
 * Parse nomor dokumen berdasarkan pola, untuk mengekstrak
 * tahun, bulan, dan nomor urut. Dipakai untuk menentukan nextSeq.
 */
export function parseNomor(pola: string, nomor: string): ParsedNomor {
  const gagal: ParsedNomor = { valid: false, tahun: null, bulan: null, seq: null }

  // Ubah pola menjadi regex — escape karakter khusus dulu
  let regexStr = pola.replace(/[.*+?^${}()|[\]\\]/g, (c) => {
    // Jangan escape kurung kurawal yang merupakan bagian dari token
    if (c === "{" || c === "}") return c
    return `\\${c}`
  })

  let hasTahun = false
  let hasBulan = false
  let hasSeq = false

  // Ganti token dengan capturing group
  if (regexStr.includes("{YYYY}")) {
    regexStr = regexStr.replace("{YYYY}", "(\\d{4})")
    hasTahun = true
  } else if (regexStr.includes("{YY}")) {
    regexStr = regexStr.replace("{YY}", "(\\d{2})")
    hasTahun = true
  }

  if (regexStr.includes("{MM}")) {
    regexStr = regexStr.replace("{MM}", "(\\d{2})")
    hasBulan = true
  }

  if (regexStr.includes("{DD}")) {
    regexStr = regexStr.replace("{DD}", "(\\d{2})")
  }

  // Ganti token urutan
  regexStr = regexStr.replace(/\{(0+1)\}/g, (_match, ones: string) => {
    hasSeq = true
    return `(\\d{${ones.length},})`
  })

  const regex = new RegExp(`^${regexStr}$`)
  const match = nomor.match(regex)

  if (!match) return gagal

  let groupIdx = 1
  let tahun: number | null = null
  let bulan: number | null = null
  let seq: number | null = null

  if (hasTahun) {
    const raw = parseInt(match[groupIdx]!, 10)
    tahun = raw < 100 ? 2000 + raw : raw
    groupIdx++
  }

  if (hasBulan) {
    bulan = parseInt(match[groupIdx]!, 10)
    groupIdx++
  }

  // DD group (skip)
  if (pola.includes("{DD}")) {
    groupIdx++
  }

  if (hasSeq) {
    seq = parseInt(match[groupIdx]!, 10)
  }

  return { valid: true, tahun, bulan, seq }
}

/**
 * Tentukan nomor urut berikutnya berdasarkan nomor terakhir yang ada.
 * Reset ke 1 jika bulan berganti (hanya jika pola mengandung {MM}).
 */
export function nextSequence(
  pola: string,
  nomorTerakhir: string | null,
  bulanSekarang: number,
  tahunSekarang: number,
): number {
  if (!nomorTerakhir) return 1

  const parsed = parseNomor(pola, nomorTerakhir)

  if (!parsed.valid || parsed.seq === null) return 1

  // Reset jika bulan atau tahun berganti dan pola mengandung {MM}
  const polaPakaiMM = pola.includes("{MM}")
  if (polaPakaiMM) {
    if (parsed.bulan !== bulanSekarang || parsed.tahun !== tahunSekarang) {
      return 1
    }
  }

  return parsed.seq + 1
}
