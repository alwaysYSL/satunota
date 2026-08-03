# SATUNOTA — Pembagian Fitur Paket Gratis & Pro (v1.1)

<aside>
🧭

**Prinsip yang tidak boleh dilanggar.** Hak membuat, menyimpan, mencetak, dan mengirim dokumen tidak pernah dibatasi jumlahnya di paket mana pun. Yang berbayar adalah **kenyamanan dan skala**, bukan kebutuhan dasar. Aturan ini adalah jawaban langsung atas keluhan K-01 sampai K-05 di SRS bagian 2.2, dan setiap usulan fitur baru harus diuji terhadap prinsip ini sebelum ditempatkan di paket berbayar.

</aside>

Dokumen ini menjabarkan bagian 4.4 dan bagian 11 SRS menjadi pembagian fitur yang siap dipakai untuk membangun *feature flag*, menulis halaman harga, dan menyusun materi pemasaran.

---

## 1. Tiga tingkat akses

Penting dibedakan: **tingkat akses** tidak sama dengan **paket berbayar**. SATUNOTA punya tiga tingkat akses, tetapi hanya satu di antaranya yang berbayar.

| Tingkat | Biaya | Cara masuk | Untuk siapa |
| --- | --- | --- | --- |
| **Tamu** | Rp 0, tanpa akun | Langsung buka aplikasi | Pengguna baru yang ingin mencoba tanpa komitmen |
| **Akun Gratis** | Rp 0, perlu daftar | Magic link atau Google, tanpa kartu | Pengguna harian yang butuh cetak thermal dan sinkron |
| **Pro** | Berbayar | Upgrade dari Akun Gratis | Pengguna yang mengelola pelanggan, tagihan, dan laporan |

<aside>
🔑

**Satu-satunya alasan mendaftar akun gratis adalah cetak thermal dan sinkron antar perangkat.** Pendaftaran tidak pernah diminta di layar pembuka, melainkan tepat saat pengguna menekan tombol Cetak thermal. Draf yang sedang dikerjakan wajib tetap utuh selama proses pendaftaran berlangsung.

</aside>

---

## 2. Matriks fitur lengkap

Kolom mengacu ke tiga tingkat akses di atas. Kode F-xx mengacu ke kebutuhan fungsional di SRS bagian 5.

### 2.1 Membuat dokumen

| Fitur | Kode | Tamu | Gratis | Pro |
| --- | --- | --- | --- | --- |
| Jumlah dokumen per bulan | — | Tanpa batas | Tanpa batas | Tanpa batas |
| Nota, invoice, dan kwitansi | F-35 | Ya | Ya | Ya |
| Line item, diskon, pajak, ongkir, biaya lain | F-02 s/d F-06 | Ya | Ya | Ya |
| Terbilang Bahasa Indonesia | F-09 | Ya | Ya | Ya |
| Preview real-time | F-10 | Ya | Ya | Ya |
| Profil usaha + logo | F-11 | Ya | Ya | Ya |
| Penomoran otomatis per jenis dokumen | F-12, F-36 | Ya | Ya | Ya |
| Konversi invoice lunas jadi kwitansi | F-37 | Ya | Ya | Ya |
| Tanda tangan & stempel | F-14 | Tidak | Tidak | Ya |

### 2.2 Mengeluarkan & mengirim dokumen

| Fitur | Kode | Tamu | Gratis | Pro |
| --- | --- | --- | --- | --- |
| Unduh PDF (A4 & A5) | F-15 | Ya | Ya | Ya |
| Unduh PNG/JPG | F-16 | Ya | Ya | Ya |
| Bagikan ke WhatsApp | F-17 | Ya | Ya | Ya |
| Tanpa watermark & tanpa iklan | F-21 | Ya | Ya | Ya |
| Fallback cetak gambar struk | F-19 | Ya | Ya | Ya |
| **Cetak thermal Bluetooth** | F-18 | **Tidak** | **Ya** | Ya |
| Jumlah template dokumen | — | 1 | 1 | Semua template |
| Link dokumen publik | F-20 | Tidak | Tidak | Ya |

### 2.3 Data & pengelolaan

| Fitur | Kode | Tamu | Gratis | Pro |
| --- | --- | --- | --- | --- |
| Riwayat & pencarian dokumen | F-22 | Ya, di perangkat ini | Ya | Ya |
| Duplikat dokumen | F-23 | Ya | Ya | Ya |
| Status pembayaran & jatuh tempo | F-26 | Ya | Ya | Ya |
| Ekspor CSV & JSON penuh | F-28 | Ya | Ya | Ya |
| Bekerja offline (PWA) | N-04 | Ya | Ya | Ya |
| Hapus akun & seluruh data | F-34 | Tidak berlaku | Ya | Ya |
| Sinkron antar perangkat | F-33 | Tidak | Ya, 1 perangkat aktif | Ya, tanpa batas perangkat |
| Daftar pelanggan tersimpan | F-25 | Ya, maksimal 20 | Ya, maksimal 20 | Tanpa batas |
| Katalog produk/jasa | F-24 | Tidak | Tidak | Ya |
| Impor katalog dari CSV | F-29 | Tidak | Tidak | Ya |
| Rekap penjualan harian/bulanan | F-27 | Tidak | Tidak | Ya |
| Pengingat jatuh tempo | — | Tidak | Tidak | Ya |
| Cadangan otomatis ke cloud | — | Tidak, cadangan manual JSON | Ya | Ya |

<aside>
⚖️

**Catatan batas 20 pelanggan.** Ini satu-satunya batas berupa angka di paket gratis, dan sengaja dipilih longgar agar warung atau olshop kecil tidak pernah menyentuhnya dalam pemakaian normal. Batas ini menyasar pengguna yang benar-benar mengelola basis pelanggan, bukan pengguna harian. Jika data menunjukkan lebih dari 10% pengguna gratis menabraknya, angka ini harus dinaikkan, bukan dijadikan alat tekan.

</aside>

---

## 3. Yang tidak pernah dikunci, di paket mana pun

Daftar ini bersifat janji produk dan ditampilkan apa adanya di halaman harga.

- Jumlah dokumen tidak dibatasi, tidak per hari maupun per bulan.
- Tidak ada watermark dan tidak ada logo SATUNOTA di dokumen yang dihasilkan.
- Tidak ada iklan di layar mana pun, termasuk layar editor.
- Ekspor seluruh data ke CSV dan JSON selalu bisa dilakukan, bahkan setelah langganan berakhir.
- Kemampuan offline penuh untuk membuat, menyimpan, dan mencetak.
- Bahasa Indonesia, format Rupiah, dan terbilang.
- Tidak ada pelacak pihak ketiga di halaman editor.

---

## 4. Harga

| Paket | Harga | Ringkas |
| --- | --- | --- |
| Gratis | Rp 0 selamanya | Semua kebutuhan membuat dan mengirim dokumen, termasuk cetak thermal |
| Pro bulanan | Rp 25.000 – 35.000 per bulan | Untuk mencoba tanpa komitmen panjang |
| Pro tahunan | Rp 249.000 per tahun | Hemat sekitar 30% dibanding bulanan |
| Lifetime | Rp 499.000 – 699.000 sekali bayar | Semua fitur Pro, untuk pengguna yang alergi langganan |

Pembayaran memakai QRIS dan e-wallet lewat payment link (Mayar) pada tahap awal, bukan integrasi payment gateway sendiri.

<aside>
🎁

**Uji coba Pro.** Berikan 14 hari Pro otomatis saat pengguna pertama kali membuat akun gratis, tanpa perlu memasukkan kartu. Saat masa coba habis, akun turun sendiri ke Gratis tanpa memblokir apa pun yang sudah dibuat. Ini memperlihatkan nilai Pro tanpa risiko dan tanpa jebakan penagihan otomatis.

</aside>

---

## 5. Aturan saat langganan berakhir

Bagian ini mencegah SATUNOTA mengulangi keluhan K-01 dan K-12 dari SRS.

| Aspek | Aturan |
| --- | --- |
| Dokumen lama | Tetap bisa dibuka, dicari, diunduh PDF, dan dicetak. Tidak pernah dikunci |
| Membuat dokumen baru | Tetap bisa, tanpa batas jumlah |
| Ekspor data | Tetap bisa, penuh, tanpa syarat |
| Katalog produk & pelanggan berlebih | Tidak dihapus, hanya jadi baca-saja sampai jumlahnya kembali di bawah batas atau langganan diperpanjang |
| Template Pro | Dokumen lama tetap tampil memakai templatenya. Dokumen baru kembali ke template bawaan |
| Link dokumen publik | Link yang sudah dibagikan tetap hidup 30 hari sebagai masa tenggang, lalu nonaktif |
| Sinkron cloud | Berhenti, tetapi data yang sudah ada di perangkat tetap lengkap |
| Perpanjangan otomatis | Wajib bisa dimatikan dalam satu ketukan, dan pengingat dikirim 3 hari sebelum penagihan |

---

## 6. Kapan ajakan upgrade boleh muncul

| Situasi | Boleh? | Bentuk yang diizinkan |
| --- | --- | --- |
| Menekan Cetak thermal sebagai tamu | Ya | Ajakan daftar **akun gratis**, bukan ajakan bayar |
| Membuka menu Rekap penjualan | Ya | Layar pratinjau berisi contoh data + tombol coba Pro |
| Menambah pelanggan ke-21 | Ya | Pesan sekali, dengan pilihan tetap di paket gratis |
| Memilih template selain bawaan | Ya | Label Pro pada template, preview tetap boleh dilihat |
| Saat sedang mengisi editor | Tidak | Layar editor bebas dari promosi apa pun |
| Saat menekan tombol Simpan atau Bagikan | Tidak | Alur inti tidak boleh disela |
| Pop-up berulang atau hitung mundur palsu | Tidak | Dilarang sepenuhnya |

---

## 7. Penerapan teknis

- Simpan tingkat akses pada satu kolom `plan` di tabel `businesses` dengan nilai `guest`, `free`, atau `pro`, ditambah `plan_expires_at`.
- Semua pengecekan fitur melewati satu modul `lib/entitlements.ts` berisi fungsi `can(feature, plan)`. Tidak boleh ada pengecekan paket yang ditulis langsung di dalam komponen UI.
- Daftar fitur dan pemetaan paketnya ditulis sebagai satu objek konstanta, sehingga tabel di dokumen ini dan perilaku aplikasi berasal dari satu sumber.
- Penegakan batas dilakukan **dua kali**: di klien untuk pengalaman pengguna, dan di server untuk keamanan. Klien saja tidak cukup karena data lokal bisa diubah pengguna.
- Saat status langganan tidak dapat diverifikasi karena offline, sistem **memilih sisi longgar** dan menganggap pengguna masih Pro sampai koneksi kembali. Memblokir pengguna yang sudah membayar hanya karena sinyal hilang adalah kegagalan yang jauh lebih mahal.

---

## 8. Naskah siap pakai untuk halaman harga

> **Gratis, dan benar-benar gratis.**
Buat nota, invoice, dan kwitansi sebanyak yang kamu mau. Tanpa watermark. Tanpa iklan. Tanpa batas harian. Cetak ke printer thermal juga gratis, cukup daftar sekali.
> 

> **Pro, untuk yang usahanya makin ramai.**
Katalog produk, data pelanggan tanpa batas, rekap penjualan, pengingat jatuh tempo, dan dokumen kamu tersinkron di semua perangkat.
> 

> **Janji kami.**
Nota yang sudah kamu buat tetap milik kamu. Berhenti berlangganan kapan pun, semua dokumen lama tetap bisa dibuka, diunduh, dan diekspor.
>