"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEditorStore, useCalcResult, type ChipVisibility } from "@/lib/stores/editor-store"
import { formatRupiah, formatTanggal } from "@/lib/format"
import { ChipDrawer } from "./chip-drawer"

type ChipConfig = {
  key: keyof ChipVisibility
  label: string
  activeLabel: (
    values: {
      diskonTipe: "nominal" | "persen"
      diskonNilai: number
      pajakPersen: number
      pajakInklusif: boolean
      ongkir: number
      biayaLain: number
      catatan: string
      dueDate: string | null
    },
    calcResult: ReturnType<typeof useCalcResult>,
  ) => string
  /** Hanya tampil untuk jenis tertentu */
  showFor?: ("nota" | "invoice" | "kwitansi")[]
}

const CHIPS: ChipConfig[] = [
  {
    key: "showDiskon",
    label: "Diskon",
    activeLabel: (v, cr) =>
      v.diskonTipe === "persen"
        ? `Diskon ${v.diskonNilai}%`
        : `Diskon ${formatRupiah(cr.diskonNominal)}`,
  },
  {
    key: "showPajak",
    label: "Pajak",
    activeLabel: (v, cr) =>
      `Pajak ${v.pajakPersen}%${v.pajakInklusif ? " (inkl.)" : ""} ${formatRupiah(cr.pajakNominal)}`,
  },
  {
    key: "showOngkir",
    label: "Ongkir",
    activeLabel: (v) => `Ongkir ${formatRupiah(v.ongkir)}`,
  },
  {
    key: "showBiayaLain",
    label: "Biaya lain",
    activeLabel: (v) => `Biaya lain ${formatRupiah(v.biayaLain)}`,
  },
  {
    key: "showCatatan",
    label: "Catatan",
    activeLabel: (v) => v.catatan ? "Catatan ada" : "Catatan",
  },
  {
    key: "showJatuhTempo",
    label: "Jatuh tempo",
    activeLabel: (v) =>
      v.dueDate ? `Jatuh tempo ${formatTanggal(v.dueDate)}` : "Jatuh tempo",
    showFor: ["invoice"],
  },
]

export function ChipBar() {
  const chips = useEditorStore((s) => s.chips)
  const toggleChip = useEditorStore((s) => s.toggleChip)
  const tipe = useEditorStore((s) => s.tipe)
  const diskonTipe = useEditorStore((s) => s.diskonTipe)
  const diskonNilai = useEditorStore((s) => s.diskonNilai)
  const pajakPersen = useEditorStore((s) => s.pajakPersen)
  const pajakInklusif = useEditorStore((s) => s.pajakInklusif)
  const ongkir = useEditorStore((s) => s.ongkir)
  const biayaLain = useEditorStore((s) => s.biayaLain)
  const catatan = useEditorStore((s) => s.catatan)
  const dueDate = useEditorStore((s) => s.dueDate)

  const calcResult = useCalcResult()

  const [activeDrawer, setActiveDrawer] = React.useState<keyof ChipVisibility | null>(null)

  const visibleChips = CHIPS.filter(
    (chip) => !chip.showFor || chip.showFor.includes(tipe),
  )

  const chipValues = React.useMemo(
    () => ({
      diskonTipe,
      diskonNilai,
      pajakPersen,
      pajakInklusif,
      ongkir,
      biayaLain,
      catatan,
      dueDate,
    }),
    [diskonTipe, diskonNilai, pajakPersen, pajakInklusif, ongkir, biayaLain, catatan, dueDate],
  )

  return (
    <>
      <div className="flex flex-wrap gap-2 px-1">
        {visibleChips.map((chip) => {
          const isActive = chips[chip.key]

          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => {
                if (isActive) {
                  // Buka drawer untuk edit
                  setActiveDrawer(chip.key)
                } else {
                  // Aktifkan chip dan buka drawer
                  toggleChip(chip.key)
                  setActiveDrawer(chip.key)
                }
              }}
              className={cn(
                "relative inline-flex items-center gap-1 rounded-sm px-3",
                "h-8 text-[13px] leading-none font-medium max-w-full",
                "border transition-[background-color] duration-[20ms] ease-in",
                "after:absolute after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2 after:min-w-[44px] after:min-h-[44px] after:w-full after:h-full after:content-['']",
                isActive
                  ? "border-transparent bg-brand-subtle text-brand"
                  : "border-line-strong bg-transparent text-fg-secondary hover:bg-bg-hover",
              )}
            >
              {!isActive && <Plus className="size-3.5 shrink-0" />}
              <span className="tnum whitespace-normal break-words">
                {isActive ? chip.activeLabel(chipValues, calcResult) : chip.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Drawer untuk edit chip */}
      <ChipDrawer
        activeChip={activeDrawer}
        onClose={() => setActiveDrawer(null)}
      />
    </>
  )
}
