# SATUNOTA — Skema Data (v1.1)

<aside>
🧩

Dokumen turunan dari SRS v1.1. Berisi skema Postgres, skema lokal IndexedDB, skema validasi Zod, aturan RLS, dan aturan sinkronisasi. Semua nama tabel dan kolom di sini bersifat mengikat — kode dan prompt AI harus mengikuti persis.

</aside>

## 1. Prinsip skema

1. **Uang selalu integer rupiah.** Tipe `bigint` di Postgres, `number` di TypeScript. Tidak ada `numeric`, tidak ada float, tidak ada sen.
2. **Satu tabel untuk tiga jenis dokumen.** Nota, invoice, dan kwitansi disimpan di tabel `documents` dengan kolom `tipe`. Perbedaannya hanya di field yang diisi dan cara ditampilkan.
3. **ID adalah UUID v7 yang dibuat di klien.** Ini syarat agar mode offline bisa membuat data tanpa menunggu server.
4. **Total disimpan, bukan hanya dihitung.** Snapshot `subtotal`, `pajak`, `total` disimpan agar dokumen lama tidak berubah angkanya saat aturan pajak berganti.
5. **Skema lokal dan skema server punya bentuk yang sama** supaya sinkronisasi cukup memetakan camelCase ke snake_case.
6. **`business_id` selalu ada** walau multi-usaha ditunda, agar penambahannya nanti tidak butuh migrasi besar.

---

## 2. Diagram relasi

```
auth.users (Supabase)
   │ 1
   ▼ 1
businesses ──┬─< customers ──┐
            ├─< products       │
            └─< documents >────┘
                  │ 1
                  ├─< document_items
                  └─< payments

documents.source_document_id ──► documents.id   (Invoice → Kwitansi)
```

---

## 3. Enum

| Enum | Nilai | Catatan |
| --- | --- | --- |
| `doc_type` | `nota`, `invoice`, `kwitansi` | Tidak boleh ditambah tanpa revisi SRS |
| `doc_status` | `draf`, `terkirim`, `sebagian`, `lunas`, `jatuh_tempo` | Nota hanya memakai `lunas` dan `terkirim`; kwitansi selalu `lunas` |
| `discount_type` | `nominal`, `persen` | Berlaku untuk diskon tingkat dokumen |
| `payment_method` | `tunai`, `transfer`, `qris`, `ewallet`, `lainnya` |  |

<aside>
⚠️

`jatuh_tempo` bukan status yang disimpan oleh pengguna. Status ini dihitung saat tampil: `status = 'terkirim' AND due_date < hari ini`. Yang disimpan di kolom tetap `terkirim`. Ini mencegah data basi ketika aplikasi lama tidak dibuka.

</aside>

---

## 4. Skema Postgres

### 4.1 businesses

```sql
create table businesses (
  id              uuid primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  nama            text not null,
  logo_url        text,
  alamat          text,
  telepon         text,
  email           text,
  npwp            text,
  -- pola penomoran per jenis dokumen
  pola_nota       text not null default 'NT/{YY}{MM}/{0001}',
  pola_invoice    text not null default 'INV/{YY}{MM}/{0001}',
  pola_kwitansi   text not null default 'KW/{YY}{MM}/{0001}',
  default_pajak   numeric(5,2) not null default 0,
  default_catatan text,
  qris_url        text,
  rekening        text,
  ttd_url         text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- v1: satu usaha per pengguna. Batasan ini dilepas saat multi-usaha dibuka.
create unique index businesses_user_unique on businesses(user_id);
```

### 4.2 customers

```sql
create table customers (
  id          uuid primary key,
  business_id uuid not null references businesses(id) on delete cascade,
  nama        text not null,
  telepon     text,
  alamat      text,
  email       text,
  catatan     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index customers_business_idx on customers(business_id) where deleted_at is null;
create index customers_nama_idx on customers(business_id, lower(nama));
```

### 4.3 products

```sql
create table products (
  id          uuid primary key,
  business_id uuid not null references businesses(id) on delete cascade,
  nama        text not null,
  satuan      text not null default 'pcs',
  harga       bigint not null default 0 check (harga >= 0),
  kategori    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index products_business_idx on products(business_id) where deleted_at is null;
```

### 4.4 documents

```sql
create table documents (
  id                  uuid primary key,
  business_id         uuid not null references businesses(id) on delete cascade,
  tipe                doc_type not null default 'nota',
  nomor               text not null,
  tanggal             date not null,
  due_date            date,                 -- hanya untuk invoice
  customer_id         uuid references customers(id) on delete set null,
  customer_nama       text,                 -- snapshot nama saat dokumen dibuat
  diterima_dari       text,                 -- hanya untuk kwitansi
  status              doc_status not null default 'draf',

  diskon_tipe         discount_type not null default 'nominal',
  diskon_nilai        bigint not null default 0 check (diskon_nilai >= 0),
  pajak_persen        numeric(5,2) not null default 0 check (pajak_persen >= 0 and pajak_persen <= 100),
  pajak_inklusif      boolean not null default false,
  ongkir              bigint not null default 0 check (ongkir >= 0),
  biaya_lain          bigint not null default 0 check (biaya_lain >= 0),
  pembulatan_aktif    boolean not null default false,

  subtotal            bigint not null default 0,
  diskon_nominal      bigint not null default 0,  -- hasil hitung diskon persen
  pajak_nominal       bigint not null default 0,
  pembulatan_nominal  bigint not null default 0,
  total               bigint not null default 0,
  dibayar             bigint not null default 0,
  sisa                bigint not null default 0,

  catatan             text,
  syarat              text,
  source_document_id  uuid references documents(id) on delete set null,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create unique index documents_nomor_unique
  on documents(business_id, tipe, nomor) where deleted_at is null;

create index documents_list_idx
  on documents(business_id, tanggal desc) where deleted_at is null;

create index documents_status_idx
  on documents(business_id, status) where deleted_at is null;

create index documents_sync_idx on documents(business_id, updated_at);
```

**Aturan validasi per jenis dokumen (dijalankan di Zod, bukan di database):**

| Aturan | Nota | Invoice | Kwitansi |
| --- | --- | --- | --- |
| `due_date` wajib | — | Ya | — |
| `due_date` harus kosong | Ya | — | Ya |
| `diterima_dari` wajib | — | — | Ya |
| Minimal 1 item | Ya | Ya | — |
| `dibayar` = `total` | — | — | Ya |
| Status yang diizinkan | `draf`, `terkirim`, `lunas` | semua | `lunas` |

<aside>
💡

Aturan bersyarat ini sengaja tidak dibuat sebagai `CHECK` constraint. Alasannya, data dibuat dulu secara offline dan baru divalidasi saat disimpan; constraint database yang terlalu galak akan membuat sinkronisasi gagal diam-diam. Validasi tetap ketat, hanya tempatnya dipindah ke Zod yang dipakai bersama klien dan server.

</aside>

### 4.5 document_items

```sql
create table document_items (
  id            uuid primary key,
  document_id   uuid not null references documents(id) on delete cascade,
  urutan        int not null default 0,
  nama          text not null,
  qty           numeric(12,3) not null default 1 check (qty > 0),
  satuan        text not null default 'pcs',
  harga_satuan  bigint not null default 0 check (harga_satuan >= 0),
  diskon_baris  bigint not null default 0 check (diskon_baris >= 0),
  subtotal      bigint not null default 0
);

create index document_items_doc_idx on document_items(document_id, urutan);
```

<aside>
🔢

`qty` adalah satu-satunya angka non-integer di skema, karena penjualan sering memakai satuan pecahan seperti 0,5 kg atau 1,25 meter. Hasil `qty × harga_satuan` tetap dibulatkan ke integer rupiah sebelum disimpan ke `subtotal`.

</aside>

### 4.6 payments

```sql
create table payments (
  id          uuid primary key,
  document_id uuid not null references documents(id) on delete cascade,
  tanggal     date not null,
  metode      payment_method not null default 'tunai',
  jumlah      bigint not null check (jumlah > 0),
  catatan     text,
  created_at  timestamptz not null default now()
);

create index payments_doc_idx on payments(document_id);
```

`documents.dibayar` selalu sama dengan jumlah seluruh baris `payments` milik dokumen tersebut. Nilainya diperbarui oleh trigger agar tidak pernah melenceng.

### 4.7 Trigger pemeliharaan

```sql
-- updated_at otomatis
create or replace function touch_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end $$ language plpgsql;

create trigger businesses_touch before update on businesses
  for each row execute function touch_updated_at();
create trigger customers_touch before update on customers
  for each row execute function touch_updated_at();
create trigger products_touch before update on products
  for each row execute function touch_updated_at();
create trigger documents_touch before update on documents
  for each row execute function touch_updated_at();

-- sinkronkan dibayar & sisa setiap kali payments berubah
create or replace function sync_document_paid() returns trigger as $$
declare
  doc uuid := coalesce(new.document_id, old.document_id);
begin
  update documents d
     set dibayar = coalesce((select sum(jumlah) from payments where document_id = doc), 0),
         sisa    = d.total - coalesce((select sum(jumlah) from payments where document_id = doc), 0)
   where d.id = doc;
  return null;
end $$ language plpgsql;

create trigger payments_sync after insert or update or delete on payments
  for each row execute function sync_document_paid();
```

---

## 5. Row Level Security

```sql
alter table businesses     enable row level security;
alter table customers      enable row level security;
alter table products       enable row level security;
alter table documents      enable row level security;
alter table document_items enable row level security;
alter table payments       enable row level security;

-- helper: apakah business ini milik pengguna yang login
create or replace function owns_business(bid uuid) returns boolean as $$
  select exists (
    select 1 from businesses b
     where b.id = bid and b.user_id = auth.uid()
  );
$$ language sql security definer stable;

create policy businesses_own on businesses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy customers_own on customers
  for all using (owns_business(business_id)) with check (owns_business(business_id));

create policy products_own on products
  for all using (owns_business(business_id)) with check (owns_business(business_id));

create policy documents_own on documents
  for all using (owns_business(business_id)) with check (owns_business(business_id));

create policy items_own on document_items
  for all using (exists (
    select 1 from documents d
     where d.id = document_id and owns_business(d.business_id)
  ));

create policy payments_own on payments
  for all using (exists (
    select 1 from documents d
     where d.id = document_id and owns_business(d.business_id)
  ));
```

<aside>
🔒

RLS wajib menyala sejak commit pertama, bukan ditambahkan belakangan. Menambahkan RLS setelah aplikasi jalan hampir selalu berujung pada kueri yang tiba-tiba mengembalikan nol baris dan sulit dilacak.

</aside>

### 5.1 Link dokumen publik

Link publik tidak boleh melewati RLS. Polanya: tabel terpisah berisi token acak, dan pembacaannya lewat fungsi `security definer` yang hanya mengembalikan dokumen bersangkutan.

```sql
create table document_shares (
  token       text primary key,
  document_id uuid not null references documents(id) on delete cascade,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);
```

---

## 6. Skema lokal (IndexedDB via Dexie)

```tsx
// lib/db/local.ts
import Dexie, { type Table } from "dexie"

export const db = new Dexie("satunota") as Dexie & {
  businesses: Table<LocalBusiness, string>
  customers: Table<LocalCustomer, string>
  products: Table<LocalProduct, string>
  documents: Table<LocalDocument, string>
  documentItems: Table<LocalDocumentItem, string>
  payments: Table<LocalPayment, string>
  outbox: Table<OutboxEntry, string>
  meta: Table<MetaEntry, string>
}

db.version(1).stores({
  businesses:    "id, userId, updatedAt",
  customers:     "id, businessId, nama, updatedAt, deletedAt",
  products:      "id, businessId, nama, updatedAt, deletedAt",
  documents:     "id, businessId, tipe, nomor, tanggal, status, updatedAt, deletedAt, [businessId+tipe]",
  documentItems: "id, documentId, urutan",
  payments:      "id, documentId, tanggal",
  outbox:        "id, entity, entityId, createdAt, attempts",
  meta:          "key",
})
```

### 6.1 Isi tabel `meta`

| Key | Isi | Dipakai untuk |
| --- | --- | --- |
| `guestId` | UUID sesi tamu | Menandai data milik tamu |
| `guestStartedAt` | ISO timestamp | Menghitung ambang pengingat 7 / 30 / 90 hari |
| `docCount` | angka | Ambang pengingat berbasis jumlah dokumen |
| `lastBackupAt` | ISO timestamp | Jadwal cadangan otomatis mingguan |
| `lastOpenedAt` | ISO timestamp | Deteksi tidak dibuka 90 hari |
| `lastSyncAt` | ISO timestamp | Titik awal sinkronisasi berikutnya |
| `nextSeq:<tipe>` | angka | Nomor urut berikutnya per jenis dokumen |

### 6.2 Tabel `outbox`

```tsx
type OutboxEntry = {
  id: string                 // uuid entri antrean
  entity: "business" | "customer" | "product" | "document" | "payment"
  entityId: string
  op: "upsert" | "delete"
  payload: unknown           // snapshot penuh entitas, bukan diff
  updatedAt: string          // ISO, dipakai untuk last-write-wins
  createdAt: string
  attempts: number
  lastError?: string
}
```

<aside>
📦

Payload berisi **snapshot penuh**, bukan perubahan sebagian. Ini membuat antrean idempoten: kalau entri yang sama terkirim dua kali karena jaringan putus di tengah, hasil akhirnya tetap sama.

</aside>

---

## 7. Skema validasi Zod

```tsx
// lib/schema/document.ts
import { z } from "zod"

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
  tanggal: z.string().date(),
  dueDate: z.string().date().nullable().default(null),
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
```

---

## 8. Mesin perhitungan

Satu-satunya sumber kebenaran angka. Fungsi murni, tanpa akses jaringan atau penyimpanan, sehingga bisa dipakai identik di klien, server, PDF, dan struk thermal.

```tsx
// lib/calc.ts
export type CalcInput = {
  items: { qty: number; hargaSatuan: number; diskonBaris: number }[]
  diskonTipe: "nominal" | "persen"
  diskonNilai: number
  pajakPersen: number
  pajakInklusif: boolean
  ongkir: number
  biayaLain: number
  pembulatanAktif: boolean
  dibayar: number
}

export type CalcResult = {
  subtotal: number
  diskonNominal: number
  dasarPajak: number
  pajakNominal: number
  pembulatanNominal: number
  total: number
  sisa: number
  itemSubtotals: number[]
}

const r = (n: number) => Math.round(n)

export function calc(i: CalcInput): CalcResult {
  const itemSubtotals = i.items.map((it) =>
    Math.max(0, r(it.qty * it.hargaSatuan) - it.diskonBaris),
  )
  const subtotal = itemSubtotals.reduce((a, b) => a + b, 0)

  const diskonNominal =
    i.diskonTipe === "persen"
      ? r((subtotal * i.diskonNilai) / 100)
      : Math.min(i.diskonNilai, subtotal)

  const dasarPajak = Math.max(0, subtotal - diskonNominal)
  const p = i.pajakPersen / 100

  const pajakNominal = i.pajakInklusif
    ? r((dasarPajak * p) / (1 + p))
    : r(dasarPajak * p)

  const totalKasar = i.pajakInklusif
    ? dasarPajak + i.ongkir + i.biayaLain
    : dasarPajak + pajakNominal + i.ongkir + i.biayaLain

  const total = i.pembulatanAktif
    ? Math.round(totalKasar / 100) * 100
    : totalKasar

  return {
    subtotal,
    diskonNominal,
    dasarPajak,
    pajakNominal,
    pembulatanNominal: total - totalKasar,
    total,
    sisa: total - i.dibayar,
    itemSubtotals,
  }
}
```

<aside>
⚡

**Perhatikan kasus pajak inklusif.** Saat harga sudah termasuk pajak, `pajakNominal` bersifat informatif dan **tidak ditambahkan lagi** ke total. Kesalahan paling umum pada aplikasi invoice adalah menambahkan pajak dua kali di kasus ini, dan itu langsung terlihat oleh pengguna sebagai total yang kemahalan.

</aside>

### 8.1 Kasus uji wajib

| # | Skenario | Harapan |
| --- | --- | --- |
| 1 | 1 item, qty 3 × Rp 15.000 | subtotal 45.000, total 45.000 |
| 2 | Diskon persen 10% dari 45.000 | diskon 4.500, total 40.500 |
| 3 | Diskon nominal melebihi subtotal | diskon dibatasi = subtotal, total 0 |
| 4 | Pajak 11% eksklusif dari 100.000 | pajak 11.000, total 111.000 |
| 5 | Pajak 11% inklusif dari 111.000 | pajak 11.000, total tetap 111.000 |
| 6 | qty pecahan 0,5 × Rp 12.500 | subtotal 6.250 |
| 7 | Pembulatan aktif, total 45.470 | total 45.500 |
| 8 | Ongkir 20.000 dengan pajak 11% | pajak hanya dari barang, bukan ongkir |
| 9 | Dibayar 50.000 dari total 111.000 | sisa 61.000, status `sebagian` |
| 10 | Kwitansi | dibayar = total, sisa 0 |

---

## 9. Penomoran dokumen

```tsx
// Pola: NT/{YY}{MM}/{0001}
// Token: {YYYY} {YY} {MM} {DD} {0001} {001} {01}
```

| Aturan | Ketentuan |
| --- | --- |
| Sumber urutan | `meta.nextSeq:<tipe>` di perangkat, bukan hitungan baris database |
| Reset | Otomatis kembali ke 1 saat bulan berganti, bila pola mengandung `{MM}` |
| Tabrakan saat sinkron | Server menolak nomor duplikat, klien menaikkan urutan dan mengirim ulang secara otomatis |
| Tamu vs akun | Urutan tamu diteruskan saat migrasi ke akun, tidak dimulai ulang |
| Ubah manual | Diizinkan; nomor manual tidak mengubah `nextSeq` |

---

## 10. Aturan sinkronisasi

| Aspek | Aturan |
| --- | --- |
| Arah | Klien mengirim `outbox`, lalu menarik perubahan sejak `lastSyncAt` |
| Granularitas | Per dokumen beserta seluruh item dan pembayarannya, sebagai satu paket |
| Konflik | Last-write-wins berdasarkan `updatedAt` |
| Versi kalah | Tidak dibuang. Disimpan sebagai dokumen baru berstatus `draf` dengan akhiran nomor `-konflik` |
| Penghapusan | Soft delete lewat `deleted_at`, agar penghapusan bisa disinkronkan |
| Percobaan ulang | Backoff eksponensial, maksimum 5 kali, lalu ditandai untuk perbaikan manual |
| Batasan | Maksimum 200 entri per permintaan sinkron |

---

## 11. Format ekspor

**`dokumen.csv`** — satu baris per dokumen:

```
nomor,tipe,tanggal,jatuh_tempo,pelanggan,status,subtotal,diskon,pajak,ongkir,biaya_lain,total,dibayar,sisa,catatan
```

**`item.csv`** — satu baris per baris barang:

```
nomor_dokumen,urutan,nama,qty,satuan,harga_satuan,diskon_baris,subtotal
```

**`satunota-backup.json`** — cadangan penuh untuk impor ulang:

```json
{
  "version": 1,
  "exportedAt": "2026-08-03T09:00:00+07:00",
  "business": {},
  "customers": [],
  "products": [],
  "documents": [{ "items": [], "payments": [] }]
}
```

CSV memakai pemisah koma, kutip ganda, dan awalan BOM UTF-8 agar Excel di Windows tidak merusak karakter dan tidak salah membaca angka.