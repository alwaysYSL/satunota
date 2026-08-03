"use client"

import { useEditorStore, useCalcResult } from "@/lib/stores/editor-store"
import { formatRupiah } from "@/lib/format"

export function CalcSummary() {
  const state = useEditorStore()
  const cr = useCalcResult()

  const showDiskon = state.chips.showDiskon && cr.diskonNominal > 0
  const showPajak = state.chips.showPajak && cr.pajakNominal > 0
  const showOngkir = state.chips.showOngkir && state.ongkir > 0
  const showBiayaLain = state.chips.showBiayaLain && state.biayaLain > 0
  const showPembulatan = state.pembulatanAktif && cr.pembulatanNominal !== 0
  const showSisa = state.tipe !== "kwitansi" && cr.sisa !== cr.total

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
            state.diskonTipe === "persen"
              ? `Diskon (${state.diskonNilai}%)`
              : "Diskon"
          }
          value={-cr.diskonNominal}
        />
      )}

      {/* Pajak */}
      {showPajak && (
        <SummaryRow
          label={`Pajak ${state.pajakPersen}%${state.pajakInklusif ? " (termasuk)" : ""}`}
          value={state.pajakInklusif ? 0 : cr.pajakNominal}
          displayValue={formatRupiah(cr.pajakNominal)}
          note={state.pajakInklusif ? "sudah termasuk" : undefined}
        />
      )}

      {/* Ongkir */}
      {showOngkir && <SummaryRow label="Ongkir" value={state.ongkir} />}

      {/* Biaya lain */}
      {showBiayaLain && <SummaryRow label="Biaya lain" value={state.biayaLain} />}

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
          <SummaryRow label="Dibayar" value={-state.dibayar} />
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
