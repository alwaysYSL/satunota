"use client"

import { useMemo } from "react"
import { create } from "zustand"
import { calc, type CalcInput, type CalcResult } from "@/lib/calc"

// ─── Types ──────────────────────────────────────────────

export type DocType = "nota" | "invoice" | "kwitansi"
export type DiscountType = "nominal" | "persen"

export type EditorItem = {
  id: string
  nama: string
  qty: number
  satuan: string
  hargaSatuan: number
  diskonBaris: number
}

export type ChipVisibility = {
  showDiskon: boolean
  showPajak: boolean
  showOngkir: boolean
  showBiayaLain: boolean
  showCatatan: boolean
  showJatuhTempo: boolean
}

export type EditorState = {
  // Identitas usaha
  businessNama: string
  businessAlamat: string
  businessTelepon: string

  // Identitas dokumen
  tipe: DocType
  nomor: string
  tanggal: string // ISO date string YYYY-MM-DD
  dueDate: string | null
  customerNama: string
  diterimaDari: string
  catatan: string
  syarat: string

  // Item
  items: EditorItem[]

  // Perhitungan
  diskonTipe: DiscountType
  diskonNilai: number
  pajakPersen: number
  pajakInklusif: boolean
  ongkir: number
  biayaLain: number
  pembulatanAktif: boolean
  dibayar: number

  // Chip visibility
  chips: ChipVisibility

  // Tampilkan preview
  showPreview: boolean
}

// ─── Actions ────────────────────────────────────────────

export type EditorActions = {
  setTipe: (tipe: DocType) => void
  setField: <K extends keyof EditorState>(key: K, value: EditorState[K]) => void
  addItem: () => void
  updateItem: (id: string, partial: Partial<EditorItem>) => void
  removeItem: (id: string) => void
  toggleChip: (chip: keyof ChipVisibility) => void
  resetDocument: () => void
  setShowPreview: (show: boolean) => void
}

// ─── Helpers ────────────────────────────────────────────

let itemCounter = 0
function newItemId(): string {
  itemCounter++
  return `item-${Date.now()}-${itemCounter}`
}

function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function createEmptyItem(): EditorItem {
  return {
    id: newItemId(),
    nama: "",
    qty: 1,
    satuan: "pcs",
    hargaSatuan: 0,
    diskonBaris: 0,
  }
}

function initialState(): EditorState {
  return {
    businessNama: "",
    businessAlamat: "",
    businessTelepon: "",
    tipe: "nota",
    nomor: "",
    tanggal: todayISO(),
    dueDate: null,
    customerNama: "",
    diterimaDari: "",
    catatan: "",
    syarat: "",
    items: [createEmptyItem()],
    diskonTipe: "nominal",
    diskonNilai: 0,
    pajakPersen: 0,
    pajakInklusif: false,
    ongkir: 0,
    biayaLain: 0,
    pembulatanAktif: false,
    dibayar: 0,
    chips: {
      showDiskon: false,
      showPajak: false,
      showOngkir: false,
      showBiayaLain: false,
      showCatatan: false,
      showJatuhTempo: false,
    },
    showPreview: false,
  }
}

// ─── Store ──────────────────────────────────────────────

export const useEditorStore = create<EditorState & EditorActions>((set) => ({
  ...initialState(),

  setTipe: (tipe) =>
    set((s) => {
      const updates: Partial<EditorState> = { tipe }

      // Reset field-field yang tidak berlaku untuk jenis baru (SRS §5.6)
      if (tipe !== "invoice") {
        updates.dueDate = null
        updates.syarat = ""
        updates.chips = { ...s.chips, showJatuhTempo: false }
      }
      if (tipe !== "kwitansi") {
        updates.diterimaDari = ""
      }
      if (tipe === "kwitansi") {
        // Kwitansi selalu lunas — dibayar akan di-set = total di komponen
        updates.chips = { ...s.chips, showJatuhTempo: false }
      }

      return updates
    }),

  setField: (key, value) => set({ [key]: value }),

  addItem: () =>
    set((s) => ({
      items: [...s.items, createEmptyItem()],
    })),

  updateItem: (id, partial) =>
    set((s) => ({
      items: s.items.map((item) =>
        item.id === id ? { ...item, ...partial } : item,
      ),
    })),

  removeItem: (id) =>
    set((s) => {
      const filtered = s.items.filter((item) => item.id !== id)
      // Selalu setidaknya satu baris kosong
      return {
        items: filtered.length === 0 ? [createEmptyItem()] : filtered,
      }
    }),

  toggleChip: (chip) =>
    set((s) => ({
      chips: { ...s.chips, [chip]: !s.chips[chip] },
    })),

  resetDocument: () => set(initialState()),

  setShowPreview: (show) => set({ showPreview: show }),
}))

// ─── Selector: calc result ──────────────────────────────
// Dioptimalkan dengan selector sempit + useMemo agar calc() hanya berjalan 1 kali
// ketika input perhitungan berubah.

export function buildCalcInput(
  items: EditorItem[],
  diskonTipe: DiscountType,
  diskonNilai: number,
  pajakPersen: number,
  pajakInklusif: boolean,
  ongkir: number,
  biayaLain: number,
  pembulatanAktif: boolean,
  dibayar: number,
  tipe: DocType,
): CalcInput {
  return {
    items: items
      .filter((it) => it.nama.trim() !== "" || it.hargaSatuan > 0)
      .map((it) => ({
        qty: it.qty,
        hargaSatuan: it.hargaSatuan,
        diskonBaris: it.diskonBaris,
      })),
    diskonTipe,
    diskonNilai,
    pajakPersen,
    pajakInklusif,
    ongkir,
    biayaLain,
    pembulatanAktif,
    dibayar: tipe === "kwitansi" ? 0 : dibayar,
  }
}

export function useCalcResult(): CalcResult {
  const items = useEditorStore((s) => s.items)
  const diskonTipe = useEditorStore((s) => s.diskonTipe)
  const diskonNilai = useEditorStore((s) => s.diskonNilai)
  const pajakPersen = useEditorStore((s) => s.pajakPersen)
  const pajakInklusif = useEditorStore((s) => s.pajakInklusif)
  const ongkir = useEditorStore((s) => s.ongkir)
  const biayaLain = useEditorStore((s) => s.biayaLain)
  const pembulatanAktif = useEditorStore((s) => s.pembulatanAktif)
  const dibayar = useEditorStore((s) => s.dibayar)
  const tipe = useEditorStore((s) => s.tipe)

  return useMemo(() => {
    const input = buildCalcInput(
      items,
      diskonTipe,
      diskonNilai,
      pajakPersen,
      pajakInklusif,
      ongkir,
      biayaLain,
      pembulatanAktif,
      dibayar,
      tipe,
    )

    const result = calc(input)
    if (tipe === "kwitansi") {
      return {
        ...result,
        sisa: 0,
      }
    }
    return result
  }, [
    items,
    diskonTipe,
    diskonNilai,
    pajakPersen,
    pajakInklusif,
    ongkir,
    biayaLain,
    pembulatanAktif,
    dibayar,
    tipe,
  ])
}
