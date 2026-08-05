// lib/share.ts
// Utilitas untuk ekspor PNG, unduh PDF, dan berbagi via WhatsApp / Web Share API.

import { toPng } from "html-to-image"
import type { PreviewData } from "@/components/shared/document-preview"
import { describeError } from "@/lib/errors"

const JUDUL_MAP = {
  nota: "Nota Penjualan",
  invoice: "Invoice",
  kwitansi: "Kwitansi",
} as const

const FILENAME_PREFIX = {
  nota: "Nota",
  invoice: "Invoice",
  kwitansi: "Kwitansi",
} as const

/**
 * Convert data URL to Blob without fetch overhead or data URL fetch errors.
 */
function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(",")
  const mimeMatch = arr[0].match(/:(.*?);/)
  const mime = mimeMatch ? mimeMatch[1] : "image/png"
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new Blob([u8arr], { type: mime })
}

/**
 * Mengubah elemen HTML menjadi Blob gambar PNG menggunakan html-to-image.
 */
export async function exportPNG(element: HTMLElement): Promise<Blob> {
  const imgs = Array.from(element.querySelectorAll("img"))
  await Promise.all(
    imgs.map(async (img) => {
      if (img.complete && img.naturalWidth > 0) return
      try {
        await img.decode()
      } catch {
        /* ditangani imagePlaceholder */
      }
    }),
  )

  try {
    const dataUrl = await toPng(element, {
      quality: 0.95,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: false,
      skipFonts: true,
      imagePlaceholder: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    })
    return dataURLtoBlob(dataUrl)
  } catch (err) {
    console.warn("toPng percobaan gagal:", describeError(err))
    throw new Error(`Ekspor PNG gagal: ${describeError(err)}`)
  }
}

/**
 * Memicu unduhan file di peramban dari objek Blob.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Mengunduh PDF dari API Route /api/pdf.
 */
export async function downloadPDF(
  data: PreviewData,
  size: "A4" | "A5" = "A4",
): Promise<void> {
  const res = await fetch(`/api/pdf?size=${size}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    throw new Error("Gagal mengunduh PDF")
  }

  const blob = await res.blob()
  const prefix = FILENAME_PREFIX[data.tipe]
  const nomorSafe = data.nomor
    ? `-${data.nomor.replace(/[/\\]/g, "-")}`
    : ""
  const filename = `${prefix}${nomorSafe}-${size}.pdf`

  downloadBlob(blob, filename)
}

/**
 * Berbagi dokumen via WhatsApp / Web Share API.
 * Bila Web Share API didukung dan file PNG tersedia, gunakan navigator.share.
 * Jika tidak, buka wa.me dengan teks template Bahasa Indonesia.
 */
export async function shareWhatsApp(
  data: PreviewData,
  pngBlob: Blob | null,
): Promise<void> {
  const judul = JUDUL_MAP[data.tipe]
  const business = data.businessNama ? data.businessNama : "SATUNOTA"
  const nomorStr = data.nomor ? `Nomor: ${data.nomor}\n` : ""
  const tanggalStr = data.tanggal ? `Tanggal: ${data.tanggal}\n` : ""

  const totalFormatted = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(data.calc.total)

  const textMessage = `Halo, berikut ${judul} dari ${business}.\n${nomorStr}${tanggalStr}Total: ${totalFormatted}`

  const prefix = FILENAME_PREFIX[data.tipe]
  const nomorSafe = data.nomor
    ? `-${data.nomor.replace(/[/\\]/g, "-")}`
    : ""
  const filename = `${prefix}${nomorSafe}.png`

  // Coba Web Share API bila didukung & ada PNG blob
  if (pngBlob && typeof navigator !== "undefined" && navigator.share) {
    try {
      const file = new File([pngBlob], filename, { type: "image/png" })
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `${judul} - ${business}`,
          text: textMessage,
          files: [file],
        })
        return
      }
    } catch (e) {
      // Jika pengguna membatalkan (AbortError), jangan lempar error
      if (e instanceof Error && e.name === "AbortError") {
        return
      }
      console.warn("Web Share API gagal, beralih ke WhatsApp link:", e)
    }
  }

  // Fallback ke WhatsApp URL
  const waUrl = `https://wa.me/?text=${encodeURIComponent(textMessage)}`
  window.open(waUrl, "_blank", "noopener,noreferrer")
}
