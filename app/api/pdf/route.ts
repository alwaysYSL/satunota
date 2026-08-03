// app/api/pdf/route.ts
// Route handler untuk render PDF dokumen.
// POST body: PreviewData, query: ?size=A4|A5

import path from "node:path"
import fs from "node:fs"
import { NextRequest, NextResponse } from "next/server"
import { renderToBuffer, Font, type DocumentProps } from "@react-pdf/renderer"
import { createElement, type ReactElement } from "react"
import { PdfDocument } from "@/components/pdf/pdf-document"
import type { PdfSize } from "@/components/pdf/pdf-document"
import type { PreviewData } from "@/components/shared/document-preview"

export const runtime = "nodejs"

const regular = path.join(process.cwd(), "public/fonts/Inter-Regular.ttf")
const bold = path.join(process.cwd(), "public/fonts/Inter-Bold.ttf")

if (!fs.existsSync(regular) || !fs.existsSync(bold)) {
  throw new Error("Berkas font PDF tidak ditemukan: " + regular)
}

Font.register({
  family: "Inter",
  fonts: [
    { src: regular, fontWeight: 400 },
    { src: bold, fontWeight: 700 },
  ],
})

// Matikan hyphenation agar kata Indonesia tidak terpotong aneh
Font.registerHyphenationCallback((word) => [word])

const FILENAME_PREFIX = {
  nota: "Nota",
  invoice: "Invoice",
  kwitansi: "Kwitansi",
} as const

export async function POST(req: NextRequest) {
  try {
    const data: PreviewData = await req.json()

    // Ukuran kertas dari query parameter, default A4
    const { searchParams } = new URL(req.url)
    const sizeParam = searchParams.get("size")
    const size: PdfSize = sizeParam === "A5" ? "A5" : "A4"

    // Render PDF ke buffer
    const element = createElement(PdfDocument, {
      data,
      size,
    }) as unknown as ReactElement<DocumentProps>
    const buffer = await renderToBuffer(element)

    // Nama file: Nota-NT2608001.pdf atau Invoice.pdf jika tanpa nomor
    const prefix = FILENAME_PREFIX[data.tipe]
    const nomorSafe = data.nomor
      ? `-${data.nomor.replace(/[/\\]/g, "-")}`
      : ""
    const filename = `${prefix}${nomorSafe}.pdf`

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    console.error("PDF render error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Gagal membuat PDF" },
      { status: 500 },
    )
  }
}
