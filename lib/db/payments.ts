// lib/db/payments.ts
// Manajemen operasi pembayaran dan pembaruan status otomatis sesuai SRS 5.6.

import { v7 as uuidv7 } from "uuid"
import { db, type LocalPayment, type LocalDocument } from "./local"
import { getActiveOwnerId } from "./owner"
import { useEditorStore } from "@/lib/stores/editor-store"

export type PaymentMethod = "tunai" | "transfer" | "qris" | "ewallet" | "lainnya"

export type AddPaymentInput = {
  tanggal: string
  metode: PaymentMethod
  jumlah: number
  catatan?: string | null
}

/**
 * Turunan status otomatis dokumen berdasarkan total & dibayar sesuai SRS §5.6.
 */
export function deriveDocumentStatus(
  tipe: LocalDocument["tipe"],
  currentStatus: LocalDocument["status"],
  total: number,
  dibayar: number,
): LocalDocument["status"] {
  if (tipe === "kwitansi") {
    return "lunas"
  }

  if (tipe === "invoice") {
    if (dibayar >= total && total > 0) {
      return "lunas"
    } else if (dibayar > 0 && dibayar < total) {
      return "sebagian"
    } else {
      // dibayar === 0 -> tetap (draf / terkirim)
      return currentStatus === "sebagian" || currentStatus === "lunas"
        ? "terkirim"
        : currentStatus
    }
  }

  if (tipe === "nota") {
    if (dibayar >= total && total > 0) {
      return "lunas"
    } else {
      // Nota tidak mengenal 'sebagian'
      return currentStatus === "lunas" ? "terkirim" : currentStatus
    }
  }

  return currentStatus
}

/**
 * Mendapatkan daftar pembayaran milik dokumen tertentu.
 */
export async function getPayments(documentId: string): Promise<LocalPayment[]> {
  const ownerId = await getActiveOwnerId()
  const payments = await db.payments
    .where("documentId")
    .equals(documentId)
    .toArray()

  return payments
    .filter((p) => p.ownerId === ownerId)
    .sort((a, b) => b.tanggal.localeCompare(a.tanggal) || b.createdAt.localeCompare(a.createdAt))
}

/**
 * Menambahkan pembayaran baru untuk dokumen dan memperbarui dibayar, sisa, serta status.
 */
export async function addPayment(
  documentId: string,
  input: AddPaymentInput,
): Promise<LocalPayment> {
  if (!input.jumlah || input.jumlah <= 0) {
    throw new Error("Jumlah pembayaran harus lebih besar dari 0")
  }

  const ownerId = await getActiveOwnerId()
  const now = new Date().toISOString()
  const paymentId = uuidv7()

  const newPayment: LocalPayment = {
    id: paymentId,
    ownerId,
    documentId,
    tanggal: input.tanggal,
    metode: input.metode,
    jumlah: Math.round(input.jumlah),
    catatan: input.catatan ? input.catatan.trim() : null,
    createdAt: now,
  }

  let updatedDibayar = 0

  await db.transaction("rw", [db.documents, db.payments], async () => {
    const doc = await db.documents.get(documentId)
    if (!doc || doc.deletedAt !== null) {
      throw new Error("Dokumen tidak ditemukan")
    }

    await db.payments.put(newPayment)

    const allPayments = await db.payments
      .where("documentId")
      .equals(documentId)
      .toArray()

    const totalDibayar = allPayments.reduce((sum, p) => sum + p.jumlah, 0)
    const sisa = Math.max(0, doc.total - totalDibayar)
    const nextStatus = deriveDocumentStatus(
      doc.tipe,
      doc.status,
      doc.total,
      totalDibayar,
    )

    await db.documents.update(documentId, {
      dibayar: totalDibayar,
      sisa,
      status: nextStatus,
      updatedAt: now,
    })

    updatedDibayar = totalDibayar
  })

  // Perbarui Zustand store jika dokumen sedang aktif di editor
  const store = useEditorStore.getState()
  if (store.documentId === documentId) {
    useEditorStore.setState({ dibayar: updatedDibayar })
  }

  return newPayment
}

/**
 * Menghapus pembayaran dan menghitung ulang dibayar, sisa, serta status dokumen.
 */
export async function deletePayment(paymentId: string): Promise<void> {
  const payment = await db.payments.get(paymentId)
  if (!payment) return

  const documentId = payment.documentId
  const now = new Date().toISOString()
  let updatedDibayar = 0

  await db.transaction("rw", [db.documents, db.payments], async () => {
    await db.payments.delete(paymentId)

    const doc = await db.documents.get(documentId)
    if (!doc || doc.deletedAt !== null) return

    const remainingPayments = await db.payments
      .where("documentId")
      .equals(documentId)
      .toArray()

    const totalDibayar = remainingPayments.reduce((sum, p) => sum + p.jumlah, 0)
    const sisa = Math.max(0, doc.total - totalDibayar)
    const nextStatus = deriveDocumentStatus(
      doc.tipe,
      doc.status,
      doc.total,
      totalDibayar,
    )

    await db.documents.update(documentId, {
      dibayar: totalDibayar,
      sisa,
      status: nextStatus,
      updatedAt: now,
    })

    updatedDibayar = totalDibayar
  })

  const store = useEditorStore.getState()
  if (store.documentId === documentId) {
    useEditorStore.setState({ dibayar: updatedDibayar })
  }
}
