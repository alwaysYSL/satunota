// components/pdf/pdf-document.tsx
// Komponen PDF dokumen — DESIGN §9: formal, hitam putih, sudut siku, rapat.
// Tata letak mengikuti persis components/shared/document-preview.tsx.
// Hanya dipakai di server (API route).

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
} from "@react-pdf/renderer"
import { formatRupiah, formatTanggal, terbilang } from "@/lib/format"
import type { PreviewData } from "@/components/shared/document-preview"

// ─── Judul per jenis dokumen (SRS §5.6) ─────────────────

const JUDUL_MAP = {
  nota: "NOTA PENJUALAN",
  invoice: "INVOICE",
  kwitansi: "KWITANSI",
} as const

// ─── Tipe ───────────────────────────────────────────────

export type PdfSize = "A4" | "A5"

// ─── Styles ─────────────────────────────────────────────
// DESIGN §9: Inter 10pt, hitam putih, sudut siku, garis tabel jelas,
// rapat hemat kertas, nol radius.

const COL_WIDTHS = {
  no: "8%",
  keterangan: "34%",
  qty: "14%",
  harga: "22%",
  subtotal: "22%",
}

const s = StyleSheet.create({
  page: {
    fontFamily: "Inter",
    fontSize: 10,
    color: "#000000",
    backgroundColor: "#FFFFFF",
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  pageA5: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 28,
    fontSize: 9,
  },

  // ── Header dokumen ──
  header: {
    textAlign: "center",
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#000000",
    marginBottom: 12,
  },
  headerTitle: {
    fontFamily: "Inter",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  headerNomor: {
    fontFamily: "Inter",
    fontSize: 9,
    marginTop: 2,
    fontWeight: 400,
  },

  // ── Info 2 kolom ──
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    marginBottom: 12,
    gap: 16,
  },
  infoLeft: {
    flex: 1,
  },
  infoRight: {
    width: 180,
    textAlign: "right",
  },
  infoLabel: {
    fontFamily: "Inter",
    fontWeight: 700,
  },
  infoText: {
    fontFamily: "Inter",
    marginTop: 2,
  },
  infoBusiness: {
    fontFamily: "Inter",
    fontSize: 10,
    fontWeight: 700,
  },

  // ── Tabel item ──
  table: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#000000",
    backgroundColor: "#F5F5F5",
  },
  tableHeaderCell: {
    fontFamily: "Inter",
    paddingVertical: 4,
    paddingHorizontal: 6,
    fontSize: 9,
    fontWeight: 700,
  },
  tableRow: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#000000",
  },
  tableCell: {
    fontFamily: "Inter",
    paddingVertical: 3,
    paddingHorizontal: 6,
    fontSize: 9,
    fontWeight: 400,
  },

  // ── Rincian perhitungan ──
  summaryContainer: {
    alignItems: "flex-end",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
    marginBottom: 2,
  },
  summaryLabel: {
    fontFamily: "Inter",
    fontSize: 9,
  },
  summaryValue: {
    fontFamily: "Inter",
    fontSize: 9,
    textAlign: "right",
  },
  summaryDivider: {
    width: 200,
    borderTopWidth: 2,
    borderTopColor: "#000000",
    marginVertical: 4,
  },
  summaryTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: 200,
  },
  summaryTotalLabel: {
    fontFamily: "Inter",
    fontSize: 11,
    fontWeight: 700,
  },
  summaryTotalValue: {
    fontFamily: "Inter",
    fontSize: 11,
    fontWeight: 700,
    textAlign: "right",
  },

  // ── Terbilang ──
  terbilangBox: {
    fontFamily: "Inter",
    borderWidth: 1,
    borderColor: "#000000",
    padding: 6,
    fontSize: 9,
    marginBottom: 8,
  },
  terbilangLabel: {
    fontFamily: "Inter",
    fontWeight: 700,
  },

  // ── Catatan & syarat ──
  footer: {
    fontFamily: "Inter",
    borderTopWidth: 1,
    borderTopColor: "#000000",
    paddingTop: 6,
    fontSize: 8,
  },
  footerBlock: {
    marginBottom: 3,
  },
  footerLabel: {
    fontFamily: "Inter",
    fontWeight: 700,
  },
})

// ─── Komponen PDF ───────────────────────────────────────

export function PdfDocument({
  data,
  size = "A4",
}: {
  data: PreviewData
  size?: PdfSize
}) {
  const { calc: cr } = data
  const judul = JUDUL_MAP[data.tipe]
  const showTerbilang = data.tipe === "kwitansi" || cr.total > 0

  const pageStyle = size === "A5" ? [s.page, s.pageA5] : s.page

  return (
    <Document>
      <Page size={size} style={pageStyle}>
        {/* ── Header Dokumen ── */}
        <View style={s.header}>
          <Text style={s.headerTitle}>{judul}</Text>
          {data.nomor ? (
            <Text style={s.headerNomor}>No: {data.nomor}</Text>
          ) : null}
        </View>

        {/* ── Info 2 Kolom: Usaha (kiri) & Transaksi (kanan) ── */}
        <View style={s.infoRow}>
          <View style={s.infoLeft}>
            <Text style={s.infoBusiness}>
              {data.businessNama || "Nama Usaha"}
            </Text>
            {data.businessAlamat ? (
              <Text style={s.infoText}>{data.businessAlamat}</Text>
            ) : null}
            {data.businessTelepon ? (
              <Text style={s.infoText}>Telp: {data.businessTelepon}</Text>
            ) : null}
          </View>

          <View style={s.infoRight}>
            <Text>
              <Text style={s.infoLabel}>Tanggal: </Text>
              {formatTanggal(data.tanggal)}
            </Text>
            {data.tipe === "invoice" && data.dueDate ? (
              <Text style={s.infoText}>
                <Text style={s.infoLabel}>Jatuh Tempo: </Text>
                {formatTanggal(data.dueDate)}
              </Text>
            ) : null}
            {data.customerNama ? (
              <Text style={s.infoText}>
                <Text style={s.infoLabel}>Kepada: </Text>
                {data.customerNama}
              </Text>
            ) : null}
            {data.tipe === "kwitansi" && data.diterimaDari ? (
              <Text style={s.infoText}>
                <Text style={s.infoLabel}>Diterima Dari: </Text>
                {data.diterimaDari}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ── Tabel Item ── */}
        {data.items.length > 0 ? (
          <View style={s.table}>
            {/* Header tabel — fixed agar berulang di tiap halaman */}
            <View style={s.tableHeader} fixed>
              <Text
                style={[
                  s.tableHeaderCell,
                  { width: COL_WIDTHS.no, textAlign: "center" },
                ]}
              >
                No
              </Text>
              <Text
                style={[
                  s.tableHeaderCell,
                  { width: COL_WIDTHS.keterangan, textAlign: "left" },
                ]}
              >
                Keterangan
              </Text>
              <Text
                style={[
                  s.tableHeaderCell,
                  { width: COL_WIDTHS.qty, textAlign: "right" },
                ]}
              >
                Qty
              </Text>
              <Text
                style={[
                  s.tableHeaderCell,
                  { width: COL_WIDTHS.harga, textAlign: "right" },
                ]}
              >
                Harga Satuan
              </Text>
              <Text
                style={[
                  s.tableHeaderCell,
                  { width: COL_WIDTHS.subtotal, textAlign: "right" },
                ]}
              >
                Subtotal
              </Text>
            </View>

            {/* Baris item — wrap={false} agar tidak terpotong antar halaman */}
            {data.items.map((item, idx) => (
              <View key={idx} style={s.tableRow} wrap={false}>
                <Text
                  style={[
                    s.tableCell,
                    { width: COL_WIDTHS.no, textAlign: "center" },
                  ]}
                >
                  {idx + 1}
                </Text>
                <Text
                  style={[
                    s.tableCell,
                    { width: COL_WIDTHS.keterangan, fontWeight: 700 },
                  ]}
                >
                  {item.nama}
                </Text>
                <Text
                  style={[
                    s.tableCell,
                    { width: COL_WIDTHS.qty, textAlign: "right" },
                  ]}
                >
                  {item.qty} {item.satuan}
                </Text>
                <Text
                  style={[
                    s.tableCell,
                    { width: COL_WIDTHS.harga, textAlign: "right" },
                  ]}
                >
                  {formatRupiah(item.hargaSatuan)}
                </Text>
                <Text
                  style={[
                    s.tableCell,
                    {
                      width: COL_WIDTHS.subtotal,
                      textAlign: "right",
                      fontWeight: 700,
                    },
                  ]}
                >
                  {formatRupiah(item.subtotal)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* ── Rincian Perhitungan ── */}
        <View style={s.summaryContainer} wrap={false}>
          <PdfSummaryLine label="Subtotal" value={cr.subtotal} />

          {cr.diskonNominal > 0 ? (
            <PdfSummaryLine
              label={
                data.diskonTipe === "persen"
                  ? `Diskon (${data.diskonNilai}%)`
                  : "Diskon"
              }
              value={-cr.diskonNominal}
            />
          ) : null}

          {cr.pajakNominal > 0 ? (
            <PdfSummaryLine
              label={`Pajak ${data.pajakPersen}%${data.pajakInklusif ? " (termasuk)" : ""}`}
              value={cr.pajakNominal}
              note={data.pajakInklusif ? "(sudah termasuk)" : undefined}
            />
          ) : null}

          {data.ongkir > 0 ? (
            <PdfSummaryLine label="Ongkos Kirim" value={data.ongkir} />
          ) : null}

          {data.biayaLain > 0 ? (
            <PdfSummaryLine label="Biaya Lain" value={data.biayaLain} />
          ) : null}

          {cr.pembulatanNominal !== 0 ? (
            <PdfSummaryLine
              label="Pembulatan"
              value={cr.pembulatanNominal}
            />
          ) : null}

          <View style={s.summaryDivider} />

          <View style={s.summaryTotal}>
            <Text style={s.summaryTotalLabel}>TOTAL</Text>
            <Text style={s.summaryTotalValue}>
              {formatRupiah(cr.total)}
            </Text>
          </View>
        </View>

        {/* ── Terbilang ── */}
        {showTerbilang && cr.total > 0 ? (
          <View style={s.terbilangBox} wrap={false}>
            <Text>
              <Text style={s.terbilangLabel}>Terbilang: </Text>
              {terbilang(cr.total)}
            </Text>
          </View>
        ) : null}

        {/* ── Catatan & Syarat ── */}
        {data.catatan || data.syarat ? (
          <View style={s.footer} wrap={false}>
            {data.catatan ? (
              <View style={s.footerBlock}>
                <Text>
                  <Text style={s.footerLabel}>Catatan: </Text>
                  {data.catatan}
                </Text>
              </View>
            ) : null}
            {data.syarat ? (
              <View style={s.footerBlock}>
                <Text>
                  <Text style={s.footerLabel}>
                    Syarat &amp; Ketentuan:{" "}
                  </Text>
                  {data.syarat}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </Page>
    </Document>
  )
}

// ─── Baris ringkasan ────────────────────────────────────

function PdfSummaryLine({
  label,
  value,
  note,
}: {
  label: string
  value: number
  note?: string
}) {
  return (
    <View style={s.summaryRow}>
      <Text style={s.summaryLabel}>{label}</Text>
      <Text style={s.summaryValue}>
        {note ? note : formatRupiah(value)}
      </Text>
    </View>
  )
}
