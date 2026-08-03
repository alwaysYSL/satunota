// lib/format.ts
// Fungsi format murni — tanpa akses jaringan, penyimpanan, atau Date.now().

/**
 * Format angka integer rupiah menjadi string "Rp 1.250.000".
 * Pemisah ribuan titik, tanpa desimal.
 */
export function formatRupiah(nilai: number): string {
  const negatif = nilai < 0
  const abs = Math.abs(nilai)
  const formatted = abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  return negatif ? `-Rp ${formatted}` : `Rp ${formatted}`
}

const NAMA_BULAN: readonly string[] = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

/**
 * Format tanggal string ISO (YYYY-MM-DD) menjadi format Indonesia: "3 Agustus 2026".
 * Fungsi murni — tidak memakai Date.now(), hanya parsing string.
 */
export function formatTanggal(isoDate: string): string {
  const [tahun, bulan, hari] = isoDate.split("-")
  const indexBulan = parseInt(bulan, 10) - 1
  const hariAngka = parseInt(hari, 10)
  return `${hariAngka} ${NAMA_BULAN[indexBulan]} ${tahun}`
}

// ─── Terbilang ──────────────────────────────────────────────

const SATUAN: readonly string[] = [
  "", "satu", "dua", "tiga", "empat", "lima",
  "enam", "tujuh", "delapan", "sembilan",
]

/**
 * Konversi grup tiga digit menjadi kata.
 */
function terbilangRatusan(n: number): string {
  if (n === 0) return ""

  const ratus = Math.floor(n / 100)
  const sisa = n % 100
  const puluh = Math.floor(sisa / 10)
  const akhir = sisa % 10

  const bagian: string[] = []

  if (ratus > 0) {
    bagian.push(ratus === 1 ? "seratus" : `${SATUAN[ratus]} ratus`)
  }

  if (puluh === 1) {
    // 10–19
    if (akhir === 0) {
      bagian.push("sepuluh")
    } else if (akhir === 1) {
      bagian.push("sebelas")
    } else {
      bagian.push(`${SATUAN[akhir]} belas`)
    }
  } else {
    if (puluh > 1) {
      bagian.push(`${SATUAN[puluh]} puluh`)
    }
    if (akhir > 0) {
      bagian.push(SATUAN[akhir])
    }
  }

  return bagian.join(" ")
}

const TINGKAT: readonly string[] = ["", "ribu", "juta", "miliar"]

/**
 * Konversi integer rupiah menjadi terbilang Bahasa Indonesia.
 * Mendukung sampai satuan miliar (999.999.999.999).
 * Mengembalikan string huruf kecil, misalnya: "empat puluh lima ribu rupiah".
 */
export function terbilang(nilai: number): string {
  if (nilai === 0) return "nol rupiah"

  const negatif = nilai < 0
  let abs = Math.abs(nilai)

  const grup: number[] = []
  while (abs > 0) {
    grup.push(abs % 1000)
    abs = Math.floor(abs / 1000)
  }

  const bagian: string[] = []
  for (let i = grup.length - 1; i >= 0; i--) {
    if (grup[i] === 0) continue

    // "seribu" bukan "satu ribu"
    if (i === 1 && grup[i] === 1) {
      bagian.push("seribu")
    } else {
      const kata = terbilangRatusan(grup[i])
      const tingkat = TINGKAT[i]
      bagian.push(tingkat ? `${kata} ${tingkat}` : kata)
    }
  }

  const hasil = bagian.join(" ").replace(/\s+/g, " ").trim()
  const prefix = negatif ? "minus " : ""
  return `${prefix}${hasil} rupiah`
}
