"use client"

import { Plus } from "lucide-react"
import { ItemRow } from "./item-row"
import { useEditorStore, useCalcResult } from "@/lib/stores/editor-store"

export function ItemList() {
  const items = useEditorStore((s) => s.items)
  const addItem = useEditorStore((s) => s.addItem)
  const calcResult = useCalcResult()

  return (
    <div>
      {/* Header baris */}
      <div className="flex items-center border-b border-line px-3 py-1.5">
        <span className="flex-1 text-[13px] font-medium text-fg-secondary">
          Barang / Jasa
        </span>
        <span className="w-24 text-right text-[13px] font-medium text-fg-secondary">
          Subtotal
        </span>
      </div>

      {/* Daftar item */}
      {items.map((item, idx) => (
        <ItemRow
          key={item.id}
          item={item}
          subtotal={calcResult.itemSubtotals[idx] ?? 0}
          isOnly={items.length === 1}
        />
      ))}

      {/* Tombol tambah baris */}
      <button
        type="button"
        onClick={addItem}
        className="flex w-full items-center gap-2 px-3 py-2.5 min-h-[44px] text-fg-secondary hover:bg-bg-hover transition-[background-color] duration-[20ms] ease-in rounded-sm"
      >
        <Plus className="size-4" />
        <span className="text-[13px]">Tambah baris</span>
      </button>
    </div>
  )
}
