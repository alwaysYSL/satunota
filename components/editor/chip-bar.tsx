"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { useEditorStore, useCalcResult, type ChipVisibility } from "@/lib/stores/editor-store"
import { formatRupiah } from "@/lib/format"
import { ChipDrawer } from "./chip-drawer"

type ChipConfig = {
  key: keyof ChipVisibility
  label: string
  activeLabel: (state: ReturnType<typeof useEditorStore.getState>, calcResult: ReturnType<typeof useCalcResult>) => string
  /** Hanya tampil untuk jenis tertentu */
  showFor?: ("nota" | "invoice" | "kwitansi")[]
}

const CHIPS: ChipConfig[] = [
  {
    key: "showDiskon",
    label: "Diskon",
    activeLabel: (s, cr) =>
      s.diskonTipe === "persen"
        ? `Diskon ${s.diskonNilai}%`
        : `Diskon ${formatRupiah(cr.diskonNominal)}`,
  },
  {
    key: "showPajak",
    label: "Pajak",
    activeLabel: (s, cr) =>
      `Pajak ${s.pajakPersen}%${s.pajakInklusif ? " (inkl.)" : ""} ${formatRupiah(cr.pajakNominal)}`,
  },
  {
    key: "showOngkir",
    label: "Ongkir",
    activeLabel: (s) => `Ongkir ${formatRupiah(s.ongkir)}`,
  },
  {
    key: "showBiayaLain",
    label: "Biaya lain",
    activeLabel: (s) => `Biaya lain ${formatRupiah(s.biayaLain)}`,
  },
  {
    key: "showCatatan",
    label: "Catatan",
    activeLabel: (s) => s.catatan ? "Catatan ada" : "Catatan",
  },
  {
    key: "showJatuhTempo",
    label: "Jatuh tempo",
    activeLabel: (s) => s.dueDate ? `Jatuh tempo ${s.dueDate}` : "Jatuh tempo",
    showFor: ["invoice"],
  },
]

export function ChipBar() {
  const state = useEditorStore()
  const calcResult = useCalcResult()
  const toggleChip = useEditorStore((s) => s.toggleChip)
  const tipe = useEditorStore((s) => s.tipe)

  const [activeDrawer, setActiveDrawer] = React.useState<keyof ChipVisibility | null>(null)

  const visibleChips = CHIPS.filter(
    (chip) => !chip.showFor || chip.showFor.includes(tipe),
  )

  return (
    <>
      <div className="flex flex-wrap gap-2 px-1">
        {visibleChips.map((chip) => {
          const isActive = state.chips[chip.key]

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
                "inline-flex items-center gap-1 rounded-sm px-3",
                "h-8 text-[13px]",
                "border transition-[background-color] duration-[20ms] ease-in",
                "min-h-[44px]",
                isActive
                  ? "border-transparent bg-brand-subtle text-brand"
                  : "border-line-strong bg-transparent text-fg-secondary hover:bg-bg-hover",
              )}
            >
              {!isActive && <Plus className="size-3.5" />}
              <span className="tnum">
                {isActive ? chip.activeLabel(state, calcResult) : chip.label}
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
