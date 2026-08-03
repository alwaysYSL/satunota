import path from "node:path"
import fs from "node:fs"
import { describe, it, expect } from "vitest"
import { renderToBuffer, Font, type DocumentProps } from "@react-pdf/renderer"
import { createElement, type ReactElement } from "react"
import { PdfDocument } from "./pdf-document"
import type { PreviewData } from "@/components/shared/document-preview"

const regular = path.join(process.cwd(), "public/fonts/Inter-Regular.ttf")
const bold = path.join(process.cwd(), "public/fonts/Inter-Bold.ttf")

if (fs.existsSync(regular) && fs.existsSync(bold)) {
  Font.register({
    family: "Inter",
    fonts: [
      { src: regular, fontWeight: 400 },
      { src: bold, fontWeight: 700 },
    ],
  })
}

describe("PdfDocument rendering", () => {
  it("renders PDF buffer without throwing font resolution errors", async () => {
    const mockData: PreviewData = {
      tipe: "nota",
      nomor: "NT/2608/0001",
      tanggal: "2026-08-03",
      dueDate: null,
      customerNama: "Budi",
      diterimaDari: "",
      catatan: "Terima kasih",
      syarat: "",
      businessNama: "Toko Berkah",
      businessAlamat: "Jl. Merdeka No. 1",
      businessTelepon: "08123456789",
      items: [
        {
          nama: "Barang A",
          qty: 2,
          satuan: "pcs",
          hargaSatuan: 15000,
          subtotal: 30000,
        },
      ],
      calc: {
        subtotal: 30000,
        diskonNominal: 0,
        dasarPajak: 30000,
        pajakNominal: 0,
        pembulatanNominal: 0,
        total: 30000,
        sisa: 0,
        itemSubtotals: [30000],
      },
      diskonTipe: "nominal",
      diskonNilai: 0,
      pajakPersen: 0,
      pajakInklusif: false,
      ongkir: 0,
      biayaLain: 0,
    }

    const element = createElement(PdfDocument, {
      data: mockData,
      size: "A4",
    }) as unknown as ReactElement<DocumentProps>

    const buffer = await renderToBuffer(element)
    expect(buffer).toBeDefined()
    expect(buffer.length).toBeGreaterThan(0)
  })
})
