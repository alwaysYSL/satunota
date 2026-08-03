// lib/schema/document.ts
import { z } from "zod/v4"

export const rupiah = z.number().int().min(0)

export const documentItemSchema = z.object({
  id: z.string().uuid(),
  urutan: z.number().int().min(0),
  nama: z.string().min(1, "Nama barang wajib diisi").max(200),
  qty: z.number().positive().max(999999),
  satuan: z.string().max(20).default("pcs"),
  hargaSatuan: rupiah,
  diskonBaris: rupiah.default(0),
  subtotal: rupiah,
})

export const documentBaseSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  tipe: z.enum(["nota", "invoice", "kwitansi"]),
  nomor: z.string().min(1).max(50),
  tanggal: z.iso.date(),
  dueDate: z.iso.date().nullable().default(null),
  customerId: z.string().uuid().nullable().default(null),
  customerNama: z.string().max(200).nullable().default(null),
  diterimaDari: z.string().max(200).nullable().default(null),
  status: z.enum(["draf", "terkirim", "sebagian", "lunas", "jatuh_tempo"]),
  diskonTipe: z.enum(["nominal", "persen"]).default("nominal"),
  diskonNilai: rupiah.default(0),
  pajakPersen: z.number().min(0).max(100).default(0),
  pajakInklusif: z.boolean().default(false),
  ongkir: rupiah.default(0),
  biayaLain: rupiah.default(0),
  pembulatanAktif: z.boolean().default(false),
  catatan: z.string().max(2000).nullable().default(null),
  syarat: z.string().max(2000).nullable().default(null),
  sourceDocumentId: z.string().uuid().nullable().default(null),
  items: z.array(documentItemSchema),
})

export const documentSchema = documentBaseSchema.superRefine((d, ctx) => {
  const err = (path: string, message: string) =>
    ctx.addIssue({ code: "custom", path: [path], message })

  if (d.tipe === "invoice" && !d.dueDate)
    err("dueDate", "Invoice wajib punya tanggal jatuh tempo")

  if (d.tipe !== "invoice" && d.dueDate)
    err("dueDate", "Jatuh tempo hanya berlaku untuk invoice")

  if (d.tipe === "kwitansi" && !d.diterimaDari)
    err("diterimaDari", "Kwitansi wajib mencantumkan penerima pembayaran")

  if (d.tipe !== "kwitansi" && d.items.length === 0)
    err("items", "Minimal satu baris barang atau jasa")

  if (d.tipe === "kwitansi" && d.status !== "lunas")
    err("status", "Kwitansi selalu berstatus lunas")
})

export type DocumentItem = z.infer<typeof documentItemSchema>
export type Document = z.infer<typeof documentSchema>
