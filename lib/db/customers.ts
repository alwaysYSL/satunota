// lib/db/customers.ts
// Manajemen operasi pelanggan: get, search, save, delete, dan auto-create dari dokumen.

import { v7 as uuidv7 } from "uuid"
import { db, type LocalCustomer } from "./local"
import { getActiveOwnerId } from "./owner"

export function normalizeCustomerName(nama: string): string {
  return nama.trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * Mendapatkan seluruh pelanggan aktif (tidak terhapus) milik owner aktif.
 */
export async function getCustomers(): Promise<LocalCustomer[]> {
  const ownerId = await getActiveOwnerId()
  const customers = await db.customers
    .where("ownerId")
    .equals(ownerId)
    .toArray()

  return customers
    .filter((c) => !c.deletedAt)
    .sort((a, b) => a.nama.localeCompare(b.nama, "id"))
}

/**
 * Mencari pelanggan berdasarkan query nama (case-insensitive, abaikan spasi berlebih).
 * Mengembalikan maksimal 5 hasil.
 */
export async function searchCustomers(query: string): Promise<LocalCustomer[]> {
  const q = normalizeCustomerName(query)
  if (!q) return []

  const ownerId = await getActiveOwnerId()
  const allCustomers = await db.customers
    .where("ownerId")
    .equals(ownerId)
    .toArray()

  const active = allCustomers.filter((c) => !c.deletedAt)

  const matches = active.filter((c) =>
    normalizeCustomerName(c.nama).includes(q),
  )

  return matches.slice(0, 5)
}

/**
 * Simpan atau perbarui data pelanggan.
 */
export async function saveCustomer(
  input: Omit<LocalCustomer, "id" | "ownerId" | "createdAt" | "updatedAt"> & {
    id?: string
  },
): Promise<LocalCustomer> {
  const ownerId = await getActiveOwnerId()
  const now = new Date().toISOString()
  const id = input.id || uuidv7()

  const existing = await db.customers.get(id)

  const customer: LocalCustomer = {
    id,
    ownerId,
    businessId: input.businessId,
    nama: input.nama.trim(),
    telepon: input.telepon || null,
    alamat: input.alamat || null,
    email: input.email || null,
    catatan: input.catatan || null,
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now,
    deletedAt: null,
  }

  await db.customers.put(customer)
  return customer
}

/**
 * Soft delete pelanggan dengan mengisi deletedAt.
 */
export async function deleteCustomer(id: string): Promise<void> {
  const now = new Date().toISOString()
  await db.customers.update(id, { deletedAt: now, updatedAt: now })
}

/**
 * Mencari pelanggan eksis berdasarkan nama (tanpa membuat baru).
 */
export async function findCustomerByName(
  customerNama: string | null | undefined,
): Promise<LocalCustomer | null> {
  if (!customerNama) return null
  const trimmed = customerNama.trim()
  if (!trimmed) return null

  const ownerId = await getActiveOwnerId()
  const normalized = normalizeCustomerName(trimmed)

  const allCustomers = await db.customers
    .where("ownerId")
    .equals(ownerId)
    .toArray()

  const active = allCustomers.filter((c) => !c.deletedAt)
  return active.find((c) => normalizeCustomerName(c.nama) === normalized) || null
}

/**
 * Dipanggil HANYA saat aksi eksplisit pengguna atau transisi draf -> non-draf:
 * bila customerNama terisi dan belum ada pelanggan dengan nama yang sama,
 * buat pelanggan baru otomatis dan tautkan customerId. Idempoten.
 */
export async function ensureCustomerFromDocument(
  customerNama: string | null | undefined,
  businessId: string,
): Promise<string | null> {
  if (!customerNama) return null
  const trimmed = customerNama.trim()
  if (!trimmed) return null

  const ownerId = await getActiveOwnerId()
  const normalized = normalizeCustomerName(trimmed)

  const allCustomers = await db.customers
    .where("ownerId")
    .equals(ownerId)
    .toArray()

  const active = allCustomers.filter((c) => !c.deletedAt)
  const found = active.find((c) => normalizeCustomerName(c.nama) === normalized)

  if (found) {
    return found.id
  }

  const now = new Date().toISOString()
  const newCustomer: LocalCustomer = {
    id: uuidv7(),
    ownerId,
    businessId,
    nama: trimmed,
    telepon: null,
    alamat: null,
    email: null,
    catatan: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  }

  await db.customers.put(newCustomer)
  return newCustomer.id
}
