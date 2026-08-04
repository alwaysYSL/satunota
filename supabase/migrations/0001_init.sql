-- ===========================================================
-- SATUNOTA — Migrasi awal (0001_init.sql)
-- Sumber kebenaran: docs/SCHEMA.md bagian 4, 5
-- ===========================================================

-- ─── Enum ───────────────────────────────────────────────────

create type doc_type as enum ('nota', 'invoice', 'kwitansi');
create type doc_status as enum ('draf', 'terkirim', 'sebagian', 'lunas');
create type discount_type as enum ('nominal', 'persen');
create type payment_method as enum ('tunai', 'transfer', 'qris', 'ewallet', 'lainnya');

-- Catatan: jatuh_tempo TIDAK ADA di enum doc_status.
-- Ia hanya dihitung saat tampil: status = 'terkirim' AND due_date < hari ini.

-- ─── 4.1 businesses ────────────────────────────────────────

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
  plan            text not null default 'free' check (plan in ('guest', 'free', 'pro')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- v1: satu usaha per pengguna. Batasan ini dilepas saat multi-usaha dibuka.
create unique index businesses_user_unique on businesses(user_id);

-- ─── 4.2 customers ─────────────────────────────────────────

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

-- ─── 4.3 products ──────────────────────────────────────────

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

-- ─── 4.4 documents ─────────────────────────────────────────

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

-- ─── 4.5 document_items ────────────────────────────────────

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

-- ─── 4.6 payments ──────────────────────────────────────────

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

-- ─── 4.7 Trigger pemeliharaan ──────────────────────────────

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

-- ─── 5. Row Level Security ─────────────────────────────────

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

-- ─── 5.1 Link dokumen publik ───────────────────────────────

create table document_shares (
  token       text primary key,
  document_id uuid not null references documents(id) on delete cascade,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);

alter table document_shares enable row level security;

-- document_shares hanya bisa dikelola oleh pemilik dokumen
create policy shares_own on document_shares
  for all using (exists (
    select 1 from documents d
     where d.id = document_id and owns_business(d.business_id)
  ));
