// lib/db/migrate-guest.ts
// Migrasi data tamu ke akun Supabase.
// Aturan keras dari SRS F-32 dan instruksi sesi ini:
// - Id baris TIDAK BOLEH diubah (UUID v7, pakai id yang sama di Postgres).
// - Draf yang sedang terbuka tetap sama id-nya setelah migrasi.
// - Kunci meta nextSeq dan lastSeqMonth TIDAK BOLEH direset.
// - Dokumen dengan deletedAt tetap diunggah apa adanya.
// - Bila unggahan gagal di tengah jalan, data lokal tetap utuh dan fungsi
//   bisa dijalankan ulang (idempoten karena memakai upsert).

import { db, type LocalDocument, type LocalDocumentItem, type LocalPayment } from "./local"
import { createClient } from "@/lib/supabase/client"

// Flag concurrency: memastikan migrasi tidak berjalan dua kali bersamaan.
let isMigrating = false

/**
 * Peta camelCase → snake_case untuk kolom businesses.
 */
function businessToRow(biz: Record<string, unknown>, userId: string) {
  return {
    id: biz.id,
    user_id: userId,
    nama: biz.nama || "Usaha Saya",
    logo_url: biz.logoUrl ?? null,
    alamat: biz.alamat ?? null,
    telepon: biz.telepon ?? null,
    email: biz.email ?? null,
    npwp: biz.npwp ?? null,
    pola_nota: biz.polaNota ?? "NT/{YY}{MM}/{0001}",
    pola_invoice: biz.polaInvoice ?? "INV/{YY}{MM}/{0001}",
    pola_kwitansi: biz.polaKwitansi ?? "KW/{YY}{MM}/{0001}",
    default_pajak: biz.defaultPajak ?? 0,
    default_catatan: biz.defaultCatatan ?? null,
    qris_url: biz.qrisUrl ?? null,
    rekening: biz.rekening ?? null,
    ttd_url: biz.ttdUrl ?? null,
    plan: "free",
  }
}

function customerToRow(c: Record<string, unknown>) {
  return {
    id: c.id,
    business_id: c.businessId,
    nama: c.nama,
    telepon: c.telepon ?? null,
    alamat: c.alamat ?? null,
    email: c.email ?? null,
    catatan: c.catatan ?? null,
    created_at: c.createdAt,
    updated_at: c.updatedAt,
    deleted_at: c.deletedAt ?? null,
  }
}

function documentToRow(d: LocalDocument) {
  // MASALAH 5a: Status 'jatuh_tempo' tidak boleh ada di penyimpanan lokal/database.
  // Status tersebut hanya dihitung saat tampil di UI. Jika ditemukan di data lokal, melempar galat.
  if ((d.status as string) === "jatuh_tempo") {
    throw new Error(
      `Status 'jatuh_tempo' tidak boleh disimpan di database (dokumen ID: ${d.id}, nomor: ${d.nomor}). Status ini hanya dihitung saat tampil.`,
    )
  }

  return {
    id: d.id,
    business_id: d.businessId,
    tipe: d.tipe,
    nomor: d.nomor,
    tanggal: d.tanggal,
    due_date: d.dueDate ?? null,
    customer_id: d.customerId ?? null,
    customer_nama: d.customerNama ?? null,
    diterima_dari: d.diterimaDari ?? null,
    status: d.status,
    diskon_tipe: d.diskonTipe,
    diskon_nilai: d.diskonNilai,
    pajak_persen: d.pajakPersen,
    pajak_inklusif: d.pajakInklusif,
    ongkir: d.ongkir,
    biaya_lain: d.biayaLain,
    pembulatan_aktif: d.pembulatanAktif,
    subtotal: d.subtotal,
    diskon_nominal: d.diskonNominal,
    pajak_nominal: d.pajakNominal,
    pembulatan_nominal: d.pembulatanNominal ?? 0,
    total: d.total,
    dibayar: d.dibayar,
    sisa: d.sisa,
    catatan: d.catatan ?? null,
    syarat: d.syarat ?? null,
    source_document_id: d.sourceDocumentId ?? null,
    created_at: d.createdAt,
    updated_at: d.updatedAt,
    deleted_at: d.deletedAt ?? null,
  }
}

function itemToRow(item: LocalDocumentItem) {
  return {
    id: item.id,
    document_id: item.documentId,
    urutan: item.urutan,
    nama: item.nama,
    qty: item.qty,
    satuan: item.satuan,
    harga_satuan: item.hargaSatuan,
    diskon_baris: item.diskonBaris,
    subtotal: item.subtotal,
  }
}

function paymentToRow(p: LocalPayment) {
  return {
    id: p.id,
    document_id: p.documentId,
    tanggal: p.tanggal,
    metode: p.metode,
    jumlah: p.jumlah,
    catatan: p.catatan ?? null,
    created_at: p.createdAt,
  }
}

/**
 * Unggah seluruh data tamu ke Supabase, lalu tandai business lokal milik userId.
 *
 * MENCEGAH DUA BARIS USAHA (MASALAH 1):
 * 1. Server tidak pernah membuat baris 'businesses' placeholder di auth/callback.
 * 2. Klien memeriksa apakah pengguna sudah memiliki bisnis di Supabase (`user_id = userId`).
 *    - Jika BELUM ada: bisnis lokal diunggah dengan ID lokal yang sama (1:1).
 *    - Jika SUDAH ada di server (misal login dari perangkat lain): bisnis lokal diselaraskan ke ID server.
 *    Indeks unik `businesses_user_unique` memastikan tidak ada dua baris bisnis untuk pengguna yang sama.
 *
 * PENGELOLAAN CONCURRENCY (MASALAH 2):
 * Menggunakan variabel module-level `isMigrating` agar tidak bisa dijalankan dua kali secara bersamaan.
 *
 * PEMBARUAN PAKET LOKAL (MASALAH 3):
 * Setelah migrasi berhasil, `db.businesses` di Dexie langsung diperbarui dengan `userId = userId`
 * dan `plan = "free"`, sehingga can() di UI mengenali pengguna sebagai akun gratis.
 */
export async function migrateGuestToAccount(userId: string): Promise<void> {
  if (isMigrating) {
    return
  }

  isMigrating = true

  try {
    const supabase = createClient()

    // 1. Periksa apakah pengguna sudah memiliki usaha di Supabase server
    const { data: existingServerBiz, error: fetchBizError } = await supabase
      .from("businesses")
      .select("id, user_id, plan")
      .eq("user_id", userId)
      .maybeSingle()

    if (fetchBizError) {
      throw new Error(`Gagal memeriksa akun usaha di server: ${fetchBizError.message}`)
    }

    // Ambil usaha lokal (tamu tanpa userId, atau milik userId ini)
    const localBusinesses = await db.businesses
      .filter((b) => !b.userId || b.userId === userId)
      .toArray()

    let targetBusinessId: string

    if (localBusinesses.length > 0) {
      const biz = localBusinesses[0]

      if (existingServerBiz && existingServerBiz.id !== biz.id) {
        // Jika server sudah punya usaha dengan ID berbeda, pakai ID server
        targetBusinessId = existingServerBiz.id
      } else {
        targetBusinessId = biz.id
      }

      // Upsert usaha ke Supabase
      const bizRow = businessToRow(
        { ...biz, id: targetBusinessId },
        userId,
      )
      const { error: bizError } = await supabase
        .from("businesses")
        .upsert(bizRow, { onConflict: "id" })

      if (bizError) {
        throw new Error(`Gagal mengunggah profil usaha: ${bizError.message}`)
      }

      // 3. Upsert customers
      const customers = await db.customers
        .where("businessId")
        .equals(biz.id)
        .toArray()

      if (customers.length > 0) {
        const customerRows = customers.map((c) =>
          customerToRow({ ...c, businessId: targetBusinessId }),
        )
        for (let i = 0; i < customerRows.length; i += 100) {
          const chunk = customerRows.slice(i, i + 100)
          const { error } = await supabase
            .from("customers")
            .upsert(chunk, { onConflict: "id" })
          if (error) {
            throw new Error(`Gagal mengunggah data pelanggan: ${error.message}`)
          }
        }
      }

      // 4. Upsert documents
      const documents = await db.documents
        .where("businessId")
        .equals(biz.id)
        .toArray()

      if (documents.length > 0) {
        // Cek duplikasi nomor lokal sebelum mengunggah (MASALAH 5b)
        const activeDocs = documents.filter((d) => !d.deletedAt)
        const docKeys = new Set<string>()
        for (const d of activeDocs) {
          const key = `${d.tipe}:${d.nomor}`
          if (docKeys.has(key)) {
            throw new Error(
              `Terjadi benturan nomor dokumen: '${d.nomor}' pada jenis '${d.tipe}'. Silakan ubah nomor dokumen sebelum migrasi.`,
            )
          }
          docKeys.add(key)
        }

        const docRows = documents.map((d) => {
          const row = documentToRow({ ...d, businessId: targetBusinessId })
          return { ...row, source_document_id: null }
        })

        for (let i = 0; i < docRows.length; i += 100) {
          const chunk = docRows.slice(i, i + 100)
          const { error } = await supabase
            .from("documents")
            .upsert(chunk, { onConflict: "id" })

          if (error) {
            // MASALAH 5b: Tangkap benturan indeks unik nomor dokumen
            if (error.code === "23505" || error.message.includes("documents_nomor_unique")) {
              throw new Error(
                `Nomor dokumen sudah digunakan di server. Silakan periksa dan ubah nomor dokumen yang bentrok.`,
              )
            }
            throw new Error(`Gagal mengunggah dokumen: ${error.message}`)
          }
        }

        // 5. Upsert document_items
        for (const doc of documents) {
          const items = await db.documentItems
            .where("documentId")
            .equals(doc.id)
            .toArray()

          if (items.length > 0) {
            const itemRows = items.map(itemToRow)
            for (let i = 0; i < itemRows.length; i += 100) {
              const chunk = itemRows.slice(i, i + 100)
              const { error } = await supabase
                .from("document_items")
                .upsert(chunk, { onConflict: "id" })
              if (error) {
                throw new Error(`Gagal mengunggah rincian barang: ${error.message}`)
              }
            }
          }
        }

        // 6. Upsert payments
        for (const doc of documents) {
          const payments = await db.payments
            .where("documentId")
            .equals(doc.id)
            .toArray()

          if (payments.length > 0) {
            const paymentRows = payments.map(paymentToRow)
            for (let i = 0; i < paymentRows.length; i += 100) {
              const chunk = paymentRows.slice(i, i + 100)
              const { error } = await supabase
                .from("payments")
                .upsert(chunk, { onConflict: "id" })
              if (error) {
                throw new Error(`Gagal mengunggah data pembayaran: ${error.message}`)
              }
            }
          }
        }

        // 7. Pass kedua: update source_document_id
        const docsWithSource = documents.filter((d) => d.sourceDocumentId)
        if (docsWithSource.length > 0) {
          for (let i = 0; i < docsWithSource.length; i += 100) {
            const chunk = docsWithSource.slice(i, i + 100)
            const sourceRows = chunk.map((d) =>
              documentToRow({ ...d, businessId: targetBusinessId }),
            )
            const { error } = await supabase
              .from("documents")
              .upsert(sourceRows, { onConflict: "id" })
            if (error) {
              throw new Error(`Gagal memperbarui tautan dokumen kwitansi: ${error.message}`)
            }
          }
        }
      }

      // MASALAH 3: Di Dexie lokal, perbarui usaha menjadi userId ini dan plan = "free"
      await db.businesses.update(biz.id, {
        userId,
        plan: "free",
      })
    } else {
      // Jika tidak ada usaha lokal sama sekali (misal login di browser baru)
      if (existingServerBiz) {
        // Tarik data usaha dari Supabase ke Dexie
        const { data: fullServerBiz } = await supabase
          .from("businesses")
          .select("*")
          .eq("id", existingServerBiz.id)
          .single()

        if (fullServerBiz) {
          await db.businesses.put({
            id: fullServerBiz.id,
            userId,
            nama: fullServerBiz.nama,
            logoUrl: fullServerBiz.logo_url,
            alamat: fullServerBiz.alamat,
            telepon: fullServerBiz.telepon,
            email: fullServerBiz.email,
            npwp: fullServerBiz.npwp,
            polaNota: fullServerBiz.pola_nota,
            polaInvoice: fullServerBiz.pola_invoice,
            polaKwitansi: fullServerBiz.pola_kwitansi,
            defaultPajak: Number(fullServerBiz.default_pajak),
            defaultCatatan: fullServerBiz.default_catatan,
            qrisUrl: fullServerBiz.qris_url,
            rekening: fullServerBiz.rekening,
            ttdUrl: fullServerBiz.ttd_url,
            plan: (fullServerBiz.plan as "free" | "pro") || "free",
            createdAt: fullServerBiz.created_at,
            updatedAt: fullServerBiz.updated_at,
          })
        }
      }
    }
  } finally {
    isMigrating = false
  }
}
