import { formatRupiah, formatTanggal, terbilang } from "@/lib/format"
import type { CalcResult } from "@/lib/calc"

// ─── Types ──────────────────────────────────────────────

export type PreviewItem = {
  nama: string
  qty: number
  satuan: string
  hargaSatuan: number
  subtotal: number
}

export type PreviewData = {
  tipe: "nota" | "invoice" | "kwitansi"
  nomor: string
  tanggal: string // ISO date YYYY-MM-DD
  dueDate: string | null
  customerNama: string
  diterimaDari: string
  catatan: string
  syarat: string

  businessNama: string
  businessAlamat: string
  businessTelepon: string
  logoUrl?: string | null

  items: PreviewItem[]
  calc: CalcResult

  diskonTipe: "nominal" | "persen"
  diskonNilai: number
  pajakPersen: number
  pajakInklusif: boolean
  ongkir: number
  biayaLain: number
}

// ─── Judul ──────────────────────────────────────────────

const JUDUL_MAP = {
  nota: "NOTA PENJUALAN",
  invoice: "INVOICE",
  kwitansi: "KWITANSI",
} as const

// ─── Komponen Preview (DESIGN §9) ────────────────────────
// Dokumen keluaran (PDF / preview) = Formal, padat, konvensional.
// - Hitam di atas putih (bg-white text-black)
// - Tepi tabel terlihat jelas (border border-black)
// - Nol radius. Semua sudut siku (rounded-none)
// - Rapat, hemat kertas

export function DocumentPreview({ data }: { data: PreviewData }) {
  const { calc: cr } = data
  const judul = JUDUL_MAP[data.tipe]
  const showTerbilang =
    data.tipe === "kwitansi" || cr.total > 0

  return (
    <div className="mx-auto max-w-[720px] bg-white text-black p-6 text-[13px] leading-tight rounded-none font-sans">
      {/* Header Dokumen */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-black mb-4 gap-4">
        {data.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.logoUrl} alt="Logo Usaha" className="max-h-14 max-w-[140px] object-contain shrink-0" />
        ) : <div className="w-10" />}

        <div className="text-center flex-1">
          <h1 className="text-[20px] font-bold tracking-wider uppercase m-0 text-black">{judul}</h1>
          {data.nomor && (
            <p className="text-[12px] text-black mt-1 font-medium">No: {data.nomor}</p>
          )}
        </div>

        <div className="w-10 shrink-0" />
      </div>

      {/* Info Identitas Usaha & Pelanggan (2 Kolom) */}
      <div className="flex justify-between text-[12px] mb-4 gap-6 text-black">
        {/* Kiri: Identitas Usaha */}
        <div className="flex-1">
          <p className="font-bold text-[13px]">{data.businessNama || "Nama Usaha"}</p>
          {data.businessAlamat && <p className="mt-0.5">{data.businessAlamat}</p>}
          {data.businessTelepon && <p className="mt-0.5">Telp: {data.businessTelepon}</p>}
        </div>

        {/* Kanan: Info Transaksi / Pelanggan */}
        <div className="w-56 text-right">
          <p><span className="font-semibold">Tanggal:</span> {formatTanggal(data.tanggal)}</p>
          {data.tipe === "invoice" && data.dueDate && (
            <p className="mt-0.5"><span className="font-semibold">Jatuh Tempo:</span> {formatTanggal(data.dueDate)}</p>
          )}
          {data.customerNama && (
            <p className="mt-0.5"><span className="font-semibold">Kepada:</span> {data.customerNama}</p>
          )}
          {data.tipe === "kwitansi" && data.diterimaDari && (
            <p className="mt-0.5"><span className="font-semibold">Diterima Dari:</span> {data.diterimaDari}</p>
          )}
        </div>
      </div>

      {/* Tabel Item (Tepi tabel jelas, sudut siku, rapat) */}
      {data.items.length > 0 && (
        <table className="w-full border-collapse border border-black mb-4 text-[12px] rounded-none">
          <thead>
            <tr className="bg-white">
              <th className="border border-black px-2 py-1.5 text-center font-bold w-10">
                No
              </th>
              <th className="border border-black px-2 py-1.5 text-left font-bold">
                Keterangan
              </th>
              <th className="border border-black px-2 py-1.5 text-right font-bold w-20">
                Qty
              </th>
              <th className="border border-black px-2 py-1.5 text-right font-bold w-28">
                Harga Satuan
              </th>
              <th className="border border-black px-2 py-1.5 text-right font-bold w-32">
                Subtotal
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => (
              <tr key={idx} className="border-b border-black">
                <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                <td className="border border-black px-2 py-1 font-medium">{item.nama}</td>
                <td className="border border-black px-2 py-1 text-right tnum">
                  {item.qty} {item.satuan}
                </td>
                <td className="border border-black px-2 py-1 text-right tnum">
                  {formatRupiah(item.hargaSatuan)}
                </td>
                <td className="border border-black px-2 py-1 text-right tnum font-medium">
                  {formatRupiah(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Rincian Perhitungan */}
      <div className="flex flex-col items-end gap-1 text-[12px] mb-4">
        <SummaryLine label="Subtotal" value={cr.subtotal} />

        {cr.diskonNominal > 0 && (
          <SummaryLine
            label={
              data.diskonTipe === "persen"
                ? `Diskon (${data.diskonNilai}%)`
                : "Diskon"
            }
            value={-cr.diskonNominal}
          />
        )}

        {cr.pajakNominal > 0 && (
          <SummaryLine
            label={`Pajak ${data.pajakPersen}%${data.pajakInklusif ? " (termasuk)" : ""}`}
            value={cr.pajakNominal}
            note={data.pajakInklusif ? "(sudah termasuk)" : undefined}
          />
        )}

        {data.ongkir > 0 && (
          <SummaryLine label="Ongkos Kirim" value={data.ongkir} />
        )}

        {data.biayaLain > 0 && (
          <SummaryLine label="Biaya Lain" value={data.biayaLain} />
        )}

        {cr.pembulatanNominal !== 0 && (
          <SummaryLine label="Pembulatan" value={cr.pembulatanNominal} />
        )}

        <div className="border-t-2 border-black w-64 my-1" />

        <div className="flex justify-between w-64 text-[13px] font-bold">
          <span>TOTAL</span>
          <span className="tnum">{formatRupiah(cr.total)}</span>
        </div>
      </div>

      {/* Terbilang Box */}
      {showTerbilang && cr.total > 0 && (
        <div className="border border-black p-2 text-[12px] italic mb-3 rounded-none bg-white">
          <span className="font-semibold not-italic">Terbilang: </span>
          {terbilang(cr.total)}
        </div>
      )}

      {/* Catatan & Syarat */}
      {(data.catatan || data.syarat) && (
        <div className="border-t border-black pt-2 flex flex-col gap-1 text-[11px] text-black">
          {data.catatan && (
            <div>
              <span className="font-bold">Catatan: </span>
              <span>{data.catatan}</span>
            </div>
          )}
          {data.syarat && (
            <div>
              <span className="font-bold">Syarat &amp; Ketentuan: </span>
              <span>{data.syarat}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SummaryLine({
  label,
  value,
  note,
}: {
  label: string
  value: number
  note?: string
}) {
  return (
    <div className="flex justify-between w-64">
      <span>{label}</span>
      <span className="tnum font-medium">
        {note ? (
          <span className="italic text-black/70">{note}</span>
        ) : (
          formatRupiah(value)
        )}
      </span>
    </div>
  )
}
