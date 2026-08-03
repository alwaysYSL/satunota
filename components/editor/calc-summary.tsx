"use client"

import { useEditorStore, useCalcResult } from "@/lib/stores/editor-store"
import { formatRupiah } from "@/lib/format"

export function CalcSummary() {
  const chips = useEditorStore((s) => s.chips)
  const diskonTipe = useEditorStore((s) => s.diskonTipe)
  const diskonNilai = useEditorStore((s) => s.diskonNilai)
  const pajakPersen = useEditorStore((s) => s.pajakPersen)
  const pajakInklusif = useEditorStore((s) => s.pajakInklusif)
  const ongkir = useEditorStore((s) => s.ongkir)
  const biayaLain = useEditorStore((s) => s.biayaLain)
  const pembulatanAktif = useEditorStore((s) => s.pembulatanAktif)
  const tipe = useEditorStore((s) => s.tipe)
  const dibayar = useEditorStore((s) => s.dibayar)
  const cr = useCalcResult()

  const showDiskon = chips.showDiskon && cr.diskonNominal > 0
  const showPajak = chips.showPajak && cr.pajakNominal > 0
  const showOngkir = chips.showOngkir && ongkir > 0
  const showBiayaLain = chips.showBiayaLain && biayaLain > 0
  const showPembulatan = pembulatanAktif && cr.pembulatanNominal !== 0
  const showSisa = tipe !== "kwitansi" && cr.sisa !== cr.total

  // Jangan tampilkan rincian kalau subtotal nol
  if (cr.subtotal === 0) return null

  return (
    <div className="flex flex-col gap-1 px-3 py-2">
      {/* Subtotal */}
      <SummaryRow label="Subtotal" value={cr.subtotal} />

      {/* Diskon */}
      {showDiskon && (
        <SummaryRow
          label={
            diskonTipe === "persen"
              ? `Diskon (${diskonNilai}%)`
              : "Diskon"
          }
          value={-cr.diskonNominal}
        />
      )}

      {/* Pajak */}
      {showPajak && (
        <SummaryRow
          label={`Pajak ${pajakPersen}%${pajakInklusif ? " (termasuk)" : ""}`}
          value={pajakInklusif ? 0 : cr.pajakNominal}
          displayValue={formatRupiah(cr.pajakNominal)}
          note={pajakInklusif ? "sudah termasuk" : undefined}
        />
      )}

      {/* Ongkir */}
      {showOngkir && <SummaryRow label="Ongkir" value={ongkir} />}

      {/* Biaya lain */}
      {showBiayaLain && <SummaryRow label="Biaya lain" value={biayaLain} />}

      {/* Pembulatan */}
      {showPembulatan && (
        <SummaryRow label="Pembulatan" value={cr.pembulatanNominal} />
      )}

      {/* Garis pemisah */}
      <div className="border-t border-line my-1" />

      {/* Total */}
      <div className="flex items-center justify-between">
        <span className="text-[16px] font-semibold text-fg">Total</span>
        <span className="text-[16px] font-semibold text-fg tnum">
          {formatRupiah(cr.total)}
        </span>
      </div>

      {/* Sisa (jika ada pembayaran sebagian) */}
      {showSisa && (
        <>
          <SummaryRow label="Dibayar" value={-dibayar} />
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-fg-secondary">
              Sisa
            </span>
            <span className="text-[13px] font-medium text-fg tnum">
              {formatRupiah(cr.sisa)}
            </span>
          </div>
        </>
      )}
    </div>
  )
}

function SummaryRow({
  label,
  value,
  displayValue,
  note,
}: {
  label: string
  value: number
  displayValue?: string
  note?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-fg-secondary">{label}</span>
      <span className="text-[13px] text-fg-secondary tnum">
        {note ? (
          <span className="text-fg-tertiary italic">{note}</span>
        ) : (
          displayValue ?? formatRupiah(value)
        )}
      </span>
    </div>
  )
}
