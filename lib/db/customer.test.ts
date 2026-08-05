// lib/db/customer.test.ts
// Unit test untuk skema pelanggan, CRUD, search autofill, dan pembuatan otomatis dari dokumen.

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import "fake-indexeddb/auto"
import Dexie from "dexie"
import { db } from "./local"
import {
  getCustomers,
  searchCustomers,
  saveCustomer,
  deleteCustomer,
  ensureCustomerFromDocument,
  normalizeCustomerName,
} from "./customers"
import { updateLastUserId } from "./owner"
import { customerSchema } from "../schema/customer"
import { v7 as uuidv7 } from "uuid"

describe("Customer Operations & Schema", () => {
  const ownerId = "test-owner-customer-123"

  beforeEach(async () => {
    await db.delete()
    await db.open()
    await updateLastUserId(ownerId)
  })

  afterEach(async () => {
    await db.close()
  })

  it("1. customerSchema memvalidasi data pelanggan dengan benar", () => {
    const valid = {
      id: uuidv7(),
      ownerId,
      businessId: uuidv7(),
      nama: "Toko Sinar Jaya",
      telepon: "08123456789",
      alamat: "Jl. Merdeka No. 10",
      email: "sinar@jaya.com",
      catatan: "Pelanggan VIP",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
    }

    const parse = customerSchema.safeParse(valid)
    expect(parse.success).toBe(true)

    const invalidName = { ...valid, nama: "" }
    expect(customerSchema.safeParse(invalidName).success).toBe(false)
  })

  it("2. saveCustomer & getCustomers menyimpan dan membaca data milik owner", async () => {
    const bizId = uuidv7()

    await saveCustomer({
      businessId: bizId,
      nama: "Budi Santoso",
      telepon: "0811111111",
      alamat: null,
      email: null,
      catatan: null,
      deletedAt: null,
    })

    await saveCustomer({
      businessId: bizId,
      nama: "Andi Wijaya",
      telepon: "0822222222",
      alamat: null,
      email: null,
      catatan: null,
      deletedAt: null,
    })

    const list = await getCustomers()
    expect(list).toHaveLength(2)
    expect(list[0].nama).toBe("Andi Wijaya") // Abjad
    expect(list[1].nama).toBe("Budi Santoso")
  })

  it("3. searchCustomers mengembalikan maks 5 saran (case-insensitive & spasi berlebih)", async () => {
    const bizId = uuidv7()

    for (let i = 1; i <= 7; i++) {
      await saveCustomer({
        businessId: bizId,
        nama: `Pelanggan   Toko  0${i}`,
        telepon: null,
        alamat: null,
        email: null,
        catatan: null,
        deletedAt: null,
      })
    }

    const results = await searchCustomers("pelanggan   toko")
    expect(results.length).toBeLessThanOrEqual(5)
    expect(results).toHaveLength(5)
  })

  it("4. deleteCustomer melakukan soft delete (deletedAt diisi)", async () => {
    const bizId = uuidv7()
    const cust = await saveCustomer({
      businessId: bizId,
      nama: "Citra Mandiri",
      telepon: null,
      alamat: null,
      email: null,
      catatan: null,
      deletedAt: null,
    })

    await deleteCustomer(cust.id)

    const activeList = await getCustomers()
    expect(activeList).toHaveLength(0)

    const inDb = await db.customers.get(cust.id)
    expect(inDb).toBeDefined()
    expect(inDb!.deletedAt).not.toBeNull()
  })

  it("5. ensureCustomerFromDocument membuat pelanggan baru otomatis jika nama belum ada", async () => {
    const bizId = uuidv7()
    const newName = "  UD   Sumber   Rejeki  "

    const customerId = await ensureCustomerFromDocument(newName, bizId)
    expect(customerId).toBeDefined()
    expect(typeof customerId).toBe("string")

    const inDb = await db.customers.get(customerId!)
    expect(inDb).toBeDefined()
    expect(inDb!.nama).toBe("UD   Sumber   Rejeki")
    expect(inDb!.ownerId).toBe(ownerId)

    // Jika dipanggil ulang dengan nama sama (case-insensitive, spasi beda), mengembalikan ID yang sama
    const reCallId = await ensureCustomerFromDocument("ud sumber rejeki", bizId)
    expect(reCallId).toBe(customerId)

    const totalCount = (await db.customers.toArray()).filter((c) => !c.deletedAt)
    expect(totalCount).toHaveLength(1)
  })

  it("6. PERBAIKAN 1: auto-save TIDAK PERNAH membuat pelanggan sampah; aksi eksplisit membuat pelanggan tepat 1x (idempoten)", async () => {
    const { useEditorStore } = await import("../stores/editor-store")
    const { saveDocument } = await import("./auto-save")

    const docId = uuidv7()
    useEditorStore.setState({
      documentId: docId,
      hydrated: true,
      tipe: "nota",
      customerNama: "ab",
    })

    // 1. Auto-save draf dengan customerNama "ab" (isExplicitAction = false default)
    await saveDocument(useEditorStore.getState())

    // Verifikasi TIDAK ADA pelanggan baru yang dibuat di db.customers
    let customersList = await getCustomers()
    expect(customersList).toHaveLength(0)

    // 2. Aksi eksplisit pengguna (isExplicitAction = true)
    await saveDocument(useEditorStore.getState(), true)

    // Verifikasi pelanggan baru "ab" dibuat tepat satu kali
    customersList = await getCustomers()
    expect(customersList).toHaveLength(1)
    expect(customersList[0].nama).toBe("ab")

    // 3. Aksi eksplisit diulang -> idempoten, tetap satu pelanggan
    await saveDocument(useEditorStore.getState(), true)
    customersList = await getCustomers()
    expect(customersList).toHaveLength(1)
  })
})
