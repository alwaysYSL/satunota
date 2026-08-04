"use client"

import { useMemo } from "react"
import { create } from "zustand"
import { v7 as uuidv7 } from "uuid"
import { calc, type CalcInput, type CalcResult } from "@/lib/calc"
import { documentSchema, documentItemSchema } from "@/lib/schema/document"
import type { LocalDocument, LocalDocumentItem } from "@/lib/db/local"

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

export type ItemErrors = Record<string, string>

export type EditorState = {
  // Identitas usaha
  businessNama: string
  businessAlamat: string
  businessTelepon: string

  // Identitas dokumen
  documentId: string | null
  tipe: DocType
  nomor: string
  nomorManual: boolean
  allocatedNomor: Partial<Record<DocType, string>>
  tanggal: string // ISO date string YYYY-MM-DD
  dueDate: string | null
  customerNama: string
  diterimaDari: string
  catatan: string
  syarat: string

  // Item
  items: EditorItem[]

  // Validasi error per item ID
  itemErrors: ItemErrors

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

  // Flag status hidrasi dari Dexie
  hydrated: boolean
}

// ─── Actions ────────────────────────────────────────────

export type EditorActions = {
  setTipe: (tipe: DocType) => void
  setField: <K extends keyof EditorState>(key: K, value: EditorState[K]) => void
  setNomor: (nomor: string, manual: boolean) => void
  setAllocatedNomor: (tipe: DocType, nomor: string) => void
  setDocumentId: (id: string) => void
  addItem: () => void
  updateItem: (id: string, partial: Partial<EditorItem>) => void
  removeItem: (id: string) => void
  toggleChip: (chip: keyof ChipVisibility) => void
  resetDocument: () => void
  setShowPreview: (show: boolean) => void
  setHydrated: (hydrated: boolean) => void
  loadDocument: (doc: LocalDocument, items: LocalDocumentItem[]) => void
  validateDocument: () => boolean
}

// ─── Helpers ────────────────────────────────────────────

// Item ID generator — UUID v7 sesuai SCHEMA.md §3

function todayISO(): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function createEmptyItem(): EditorItem {
  return {
    id: uuidv7(),
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
    documentId: null,
    tipe: "nota",
    nomor: "",
    nomorManual: false,
    allocatedNomor: {},
    tanggal: todayISO(),
    dueDate: null,
    customerNama: "",
    diterimaDari: "",
    catatan: "",
    syarat: "",
    items: [createEmptyItem()],
    itemErrors: {},
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
    hydrated: false,
  }
}

// ─── Store ──────────────────────────────────────────────

export const useEditorStore = create<EditorState & EditorActions>((set, get) => ({
  ...initialState(),

  setTipe: (tipe) =>
    set((s) => {
      const updates: Partial<EditorState> = { tipe }

      // Reuse previously allocated number for this doc type on active draft if available
      if (s.allocatedNomor[tipe]) {
        updates.nomor = s.allocatedNomor[tipe]
        updates.nomorManual = false
      } else {
        updates.nomor = ""
        updates.nomorManual = false
      }

      // Reset field-field yang tidak berlaku untuk jenis baru (SRS §5.6)
      if (tipe === "invoice") {
        if (!s.dueDate) {
          updates.dueDate = s.tanggal || todayISO()
        }
      } else {
        updates.dueDate = null
        updates.syarat = ""
        updates.chips = { ...s.chips, showJatuhTempo: false }
      }

      if (tipe === "kwitansi") {
        if (!s.diterimaDari) {
          updates.diterimaDari = s.customerNama || "Pelanggan"
        }
      } else {
        updates.diterimaDari = ""
      }

      return updates
    }),

  setField: (key, value) =>
    set((s) => {
      const updates: Partial<EditorState> = { [key]: value }
      if (key === "customerNama" && s.tipe === "kwitansi" && (!s.diterimaDari || s.diterimaDari === "Pelanggan")) {
        updates.diterimaDari = typeof value === "string" ? value : ""
      }
      return updates
    }),

  setNomor: (nomor, manual) => set({ nomor, nomorManual: manual }),

  setAllocatedNomor: (tipe, nomor) =>
    set((s) => ({
      allocatedNomor: { ...s.allocatedNomor, [tipe]: nomor },
    })),

  setDocumentId: (id) => set({ documentId: id }),

  addItem: () =>
    set((s) => ({
      items: [...s.items, createEmptyItem()],
    })),

  updateItem: (id, partial) =>
    set((s) => {
      const updatedErrors = { ...s.itemErrors }
      if (updatedErrors[id] && partial.nama && partial.nama.trim() !== "") {
        delete updatedErrors[id]
      }
      return {
        items: s.items.map((item) =>
          item.id === id ? { ...item, ...partial } : item,
        ),
        itemErrors: updatedErrors,
      }
    }),

  removeItem: (id) =>
    set((s) => {
      const updatedErrors = { ...s.itemErrors }
      delete updatedErrors[id]
      const filtered = s.items.filter((item) => item.id !== id)
      return {
        items: filtered.length === 0 ? [createEmptyItem()] : filtered,
        itemErrors: updatedErrors,
      }
    }),

  toggleChip: (chip) =>
    set((s) => ({
      chips: { ...s.chips, [chip]: !s.chips[chip] },
    })),

  resetDocument: () => set({ ...initialState(), hydrated: true }),

  setShowPreview: (show) => set({ showPreview: show }),

  setHydrated: (hydrated) => set({ hydrated }),

  loadDocument: (doc, items) =>
    set((s) => ({
      documentId: doc.id,
      tipe: doc.tipe,
      nomor: doc.nomor,
      nomorManual: false,
      allocatedNomor: {
        ...s.allocatedNomor,
        [doc.tipe]: doc.nomor,
      },
      tanggal: doc.tanggal,
      dueDate: doc.dueDate,
      customerNama: doc.customerNama ?? "",
      diterimaDari: doc.diterimaDari ?? "",
      catatan: doc.catatan ?? "",
      syarat: doc.syarat ?? "",
      items:
        items.length > 0
          ? items.map((it) => ({
              id: it.id,
              nama: it.nama,
              qty: it.qty,
              satuan: it.satuan,
              hargaSatuan: it.hargaSatuan,
              diskonBaris: it.diskonBaris,
            }))
          : [createEmptyItem()],
      diskonTipe: doc.diskonTipe,
      diskonNilai: doc.diskonNilai,
      pajakPersen: doc.pajakPersen,
      pajakInklusif: doc.pajakInklusif,
      ongkir: doc.ongkir,
      biayaLain: doc.biayaLain,
      pembulatanAktif: doc.pembulatanAktif,
      dibayar: doc.dibayar,
      chips: {
        showDiskon: doc.diskonNilai > 0,
        showPajak: doc.pajakPersen > 0,
        showOngkir: doc.ongkir > 0,
        showBiayaLain: doc.biayaLain > 0,
        showCatatan: Boolean(doc.catatan),
        showJatuhTempo: Boolean(doc.dueDate),
      },
      hydrated: true,
    })),

  validateDocument: () => {
    const s = get()
    const itemErrors: ItemErrors = {}

    // 1. Identifikasi item yang aktif (yang punya nama atau punya harga > 0)
    const activeItems = s.items.filter(
      (it) => it.nama.trim() !== "" || it.hargaSatuan > 0,
    )

    // Validasi setiap item aktif memakai documentItemSchema
    for (const item of s.items) {
      // Jika item punya harga > 0 tetapi namanya kosong, atau nama diisi tetapi invalid
      if (item.hargaSatuan > 0 || item.nama.trim() !== "") {
        const itemParse = documentItemSchema.safeParse({
          id: item.id,
          urutan: 0,
          nama: item.nama.trim(),
          qty: item.qty > 0 ? item.qty : 1,
          satuan: item.satuan || "pcs",
          hargaSatuan: item.hargaSatuan,
          diskonBaris: item.diskonBaris,
          subtotal: Math.max(
            0,
            Math.round(item.qty * item.hargaSatuan) - item.diskonBaris,
          ),
        })

        if (!itemParse.success) {
          const issue = itemParse.error.issues.find((i) =>
            i.path.includes("nama"),
          )
          if (issue) {
            itemErrors[item.id] = "Nama barang perlu diisi"
          }
        }
      }
    }

    // 2. Validasi dokumen lengkap dengan documentSchema
    const placeholderUuid = "00000000-0000-0000-0000-000000000000"

    const effectiveDueDate =
      s.tipe === "invoice" ? s.dueDate || s.tanggal || todayISO() : null
    const effectiveDiterimaDari =
      s.tipe === "kwitansi"
        ? s.diterimaDari && s.diterimaDari.trim() !== ""
          ? s.diterimaDari.trim()
          : s.customerNama.trim() || "Pelanggan"
        : null

    if (s.tipe === "invoice" && !s.dueDate) {
      set({ dueDate: effectiveDueDate })
    }
    if (s.tipe === "kwitansi" && !s.diterimaDari) {
      set({ diterimaDari: effectiveDiterimaDari ?? "Pelanggan" })
    }

    const docPayload = {
      id: s.documentId ?? placeholderUuid,
      businessId: placeholderUuid,
      tipe: s.tipe,
      nomor:
        s.nomor ||
        (s.tipe === "invoice"
          ? "INV/0001"
          : s.tipe === "kwitansi"
            ? "KW/0001"
            : "NT/0001"),
      tanggal: s.tanggal,
      dueDate: effectiveDueDate,
      customerId: null,
      customerNama: s.customerNama || null,
      diterimaDari: effectiveDiterimaDari,
      status: s.tipe === "kwitansi" ? ("lunas" as const) : ("draf" as const),
      diskonTipe: s.diskonTipe,
      diskonNilai: s.diskonNilai,
      pajakPersen: s.pajakPersen,
      pajakInklusif: s.pajakInklusif,
      ongkir: s.ongkir,
      biayaLain: s.biayaLain,
      pembulatanAktif: s.pembulatanAktif,
      catatan: s.catatan || null,
      syarat: s.syarat || null,
      sourceDocumentId: null,
      items: activeItems.map((item, idx) => ({
        id: item.id,
        urutan: idx,
        nama: item.nama.trim(),
        qty: item.qty > 0 ? item.qty : 1,
        satuan: item.satuan || "pcs",
        hargaSatuan: item.hargaSatuan,
        diskonBaris: item.diskonBaris,
        subtotal: Math.max(
          0,
          Math.round(item.qty * item.hargaSatuan) - item.diskonBaris,
        ),
      })),
    }

    const docParse = documentSchema.safeParse(docPayload)
    const isValid = docParse.success && Object.keys(itemErrors).length === 0

    set({ itemErrors })
    return isValid
  },
}))

// ─── Selector: calc result ──────────────────────────────

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
