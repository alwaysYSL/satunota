"use client"

import { X } from "lucide-react"
import { NotionInput, NotionCurrencyInput, NotionQtyInput } from "./notion-input"
import { useEditorStore, type EditorItem } from "@/lib/stores/editor-store"
import { formatRupiah } from "@/lib/format"
import { cn } from "@/lib/utils"

type ItemRowProps = {
  item: EditorItem
  subtotal: number
  isOnly: boolean
}

export function ItemRow({ item, subtotal, isOnly }: ItemRowProps) {
  const updateItem = useEditorStore((s) => s.updateItem)
  const removeItem = useEditorStore((s) => s.removeItem)
  const itemError = useEditorStore((s) => s.itemErrors[item.id])

  return (
    <div
      className={cn(
        "group relative border-b border-line py-2",
        "flex flex-col gap-1.5 px-1",
      )}
    >
      {/* Baris 1: Nama barang & Tombol Hapus */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1">
          <NotionInput
            value={item.nama}
            onChange={(v) => updateItem(item.id, { nama: v })}
            placeholder="Nasi goreng"
            className="flex-1 text-fg"
          />
          {/* Tombol hapus — muncul saat hover/focus */}
          {!isOnly && (
            <button
              type="button"
              onClick={() => removeItem(item.id)}
              className={cn(
                "flex h-[44px] w-[44px] shrink-0 items-center justify-center",
                "rounded-sm text-fg-tertiary",
                "opacity-0 transition-opacity duration-[20ms]",
                "group-hover:opacity-100 group-focus-within:opacity-100",
                "hover:text-danger",
              )}
              aria-label="Hapus baris"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        {/* Inline error message di bawah field nama */}
        {itemError && (
          <p className="text-[12px] text-danger mt-0.5 px-2 font-normal">
            {itemError}
          </p>
        )}
      </div>

      {/* Baris 2: Qty, Satuan, Harga, Subtotal */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <NotionQtyInput
            value={item.qty}
            onChange={(val) => updateItem(item.id, { qty: val })}
            placeholder="1"
            className="w-20"
          />
          <span className="text-[13px] text-fg-tertiary">×</span>
        </div>

        <NotionInput
          value={item.satuan}
          onChange={(v) => updateItem(item.id, { satuan: v })}
          placeholder="pcs"
          className="w-16 text-center text-fg"
        />

        <NotionCurrencyInput
          value={item.hargaSatuan}
          onChange={(val) => updateItem(item.id, { hargaSatuan: val })}
          placeholder="0"
          className="flex-1"
        />

        {/* Subtotal tampil */}
        <div className="w-24 shrink-0 text-right text-[13px] tnum text-fg-secondary px-2">
          {subtotal > 0 ? formatRupiah(subtotal) : ""}
        </div>
      </div>
    </div>
  )
}
