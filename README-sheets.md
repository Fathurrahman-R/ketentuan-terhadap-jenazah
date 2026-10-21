# Panduan Integrasi Google Sheets (PULL) — Kuis PAI "Ketentuan terhadap Jenazah"

Panduan ini menghubungkan data kuis di Supabase ke Google Spreadsheet milik guru secara otomatis. Arsitektur yang digunakan adalah **PULL**: Google Apps Script di Spreadsheet memanggil Edge Function `export-hasil` yang dilindungi token rahasia (`EXPORT_TOKEN`).

---

## 1. Arsitektur & Keamanan

```
[ Siswa / Browser ]
       │ POST (submit-quiz)
       ▼
[ Supabase PostgreSQL (public.hasil) ]
       ▲
       │ GET /functions/v1/export-hasil (x-export-token: EXPORT_TOKEN)
       │ (Hanya membaca data; tanpa service_role key di Spreadsheet)
       │
[ Google Apps Script (Spreadsheet Guru) ]
   ├── Menu Kustom: "Hasil Kuis"
   ├── Pemicu Otomatis (Time-driven trigger tiap 5 menit)
   ├── Tab "Hasil": Data mentah + sanitasi formula injection + deduplikasi ID
   ├── Tab "Rekap": Rumus ringkasan nilai & ketercapaian per soal
   └── Tab "Log": Riwayat status sinkronisasi (maks 500 baris)
```

### Prinsip Keamanan Utama
1. **Tidak Ada Service Role Key di Google Apps Script:** Spreadsheet hanya memegang `EXPORT_TOKEN` yang hanya memiliki akses baca terbatas melalui fungsi `export-hasil`.
2. **Kunci Jawaban Tidak Bocor:** `ANSWER_KEY` tetap tersimpan aman di Supabase. Fungsi `export-hasil` hanya menghitung penanda `b` (1 jika benar, 0 jika salah/kosong).
3. **Pencegahan Formula Injection (CSV/Sheets Injection):** Jika siswa memasukkan nama seperti `=HYPERLINK(...)` atau `=1+1`, skrip otomatis menambahkan tanda petik tunggal (`'`) di depannya sehingga Google Sheets menampilkannya sebagai teks murni dan tidak mengeksekusinya sebagai rumus.
4. **Perlindungan Token:** `EXPORT_TOKEN` disimpan di *Script Properties* Google Apps Script, tidak ditulis dalam kode, dan tidak pernah dicatat di sheet `Log`.

---

## 2. Panduan Langkah Demi Langkah (Setup Mandiri oleh Guru)

### Langkah 1: Buat Token Rahasia `EXPORT_TOKEN`
Buka terminal lokal Anda dan buat string acak sepanjang 32 byte (64 karakter heksadesimal):
```bash
openssl rand -hex 32
```
*Simpan token ini di tempat yang aman (misalnya pengelola kata sandi). Jangan pernah meng-commit token ini ke Git.*

---

### Langkah 2: Setel Secret di Supabase
Jalankan perintah CLI berikut (atau masukkan via web dashboard Supabase di *Project Settings -> Edge Functions -> Secrets*):
```bash
supabase secrets set EXPORT_TOKEN="<HASIL_TOKEN_DARI_LANGKAH_1>"
```

---

### Langkah 3: Deploy Edge Function `export-hasil`
Deploy fungsi `export-hasil` ke Supabase:
```bash
supabase functions deploy export-hasil --no-verify-jwt
```
*(Catatan: Flag `--no-verify-jwt` digunakan karena autentikasi dilakukan mandiri oleh fungsi menggunakan header `x-export-token`).*

---

### Langkah 4: Siapkan Google Spreadsheet Baru
1. Buka [Google Sheets](https://sheets.new) dan buat spreadsheet baru (misalnya beri judul *"Hasil Kuis PAI - Ketentuan Jenazah"*).
2. Di menu atas, klik **Extensions** (Ekstensi) > **Apps Script**.
3. Di editor Apps Script:
   * **Buka file `appsscript.json`**:
     * Klik ikon roda gigi (*Project Settings*) di bilah kiri, centang opsi *"Show 'appsscript.json' manifest file in editor"*.
     * Kembali ke menu Editor, klik `appsscript.json`, dan ganti seluruh isinya dengan file [apps-script/appsscript.json](file:///home/rizzxx/Projects/kuis/apps-script/appsscript.json).
   * **Buka file `Code.gs`**:
     * Ganti seluruh isinya dengan kode dari file [apps-script/Code.gs](file:///home/rizzxx/Projects/kuis/apps-script/Code.gs).
4. Klik ikon disket (**Save project**).
5. Muat ulang (*refresh*) halaman Google Spreadsheet Anda di browser.

---

### Langkah 5: Atur Koneksi di Spreadsheet
Setelah spreadsheet dimuat ulang, akan muncul menu baru di bilah atas bernama **Hasil Kuis**:
1. Klik menu **Hasil Kuis** > **Atur koneksi**.
2. Masukkan **SUPABASE_URL** proyek Anda (contoh: `https://xxxx.supabase.co`).
3. Masukkan **EXPORT_TOKEN** rahasia yang telah Anda buat di Langkah 1.
4. Klik **OK**. Kredensial akan tersimpan aman di *Script Properties*.

---

### Langkah 6: Jalankan Sinkronisasi Pertama & Otorisasi OAuth
1. Klik menu **Hasil Kuis** > **Sinkronkan sekarang**.
2. Google akan menampilkan jendela persetujuan izin (*Authorization Required*):
   * Klik **Continue**.
   * Pilih akun Google Anda.
   * Jika muncul peringatan *"Google hasn't verified this app"*, klik **Advanced** > **Go to ... (unsafe)**.
   * **Penjelasan Scope Izin:**
     * `See, edit, create, and delete all your Google Sheets spreadsheets`: Untuk menulis data ke tab *Hasil*, *Rekap*, dan *Log*.
     * `Connect to an external service`: Untuk memanggil endpoint Edge Function Supabase melalui `UrlFetchApp`.
     * `Allow this application to run when you are not present`: Untuk menjalankan pemicu waktu sinkronisasi otomatis.
   * Klik **Allow**.
3. Setelah izin diberikan, klik kembali menu **Hasil Kuis** > **Sinkronkan sekarang**.
4. Tab **Hasil**, **Rekap**, dan **Log** akan dibuat secara otomatis dan data kuis pertama akan ditarik.

---

### Langkah 7: Pasang Pemicu Sinkronisasi Otomatis
1. Klik menu **Hasil Kuis** > **Pasang sinkronisasi otomatis**.
2. Sistem akan menjadwalkan sinkronisasi berjalan otomatis setiap **5 menit** di latar belakang tanpa perlu membuka spreadsheet.

---

## 3. Prosedur Rotasi Token (Jika Token Bocor atau Guru Berganti)

Jika suatu saat `EXPORT_TOKEN` perlu diganti:
1. Buat token baru di terminal: `openssl rand -hex 32`.
2. Perbarui secret di Supabase:
   ```bash
   supabase secrets set EXPORT_TOKEN="<TOKEN_BARU>"
   ```
3. Buka Google Spreadsheet > menu **Hasil Kuis** > **Atur koneksi**.
4. Masukkan kembali URL Supabase dan tempelkan token baru tersebut.
5. Jalankan **Sinkronkan sekarang** untuk memastikan koneksi kembali normal.

---

## 4. Catatan Operasional & Batasan

1. **Jeda Otomatis Proyek Gratis (*Auto-pause*):**
   * Proyek gratis Supabase dijeda jika tidak ada aktivitas selama 7 hari.
   * Jika proyek sedang dijeda, pemicu otomatis akan mencatat status `GAGAL_JARINGAN` atau `GAGAL_SERVER` di sheet `Log`.
   * Cukup buka Supabase Dashboard dan klik *Restore Project* sebelum jam pelajaran/evaluasi.
2. **Keterlambatan Sinkronisasi (Delay):**
   * Sinkronisasi berjalan setiap 5 menit (interval Google Apps Script time-driven trigger).
   * Nilai siswa yang baru saja submit di kelas akan muncul di spreadsheet dalam rentang 0–5 menit berikutnya, atau guru dapat langsung mengklik menu **Sinkronkan sekarang** untuk pembaruan instan.
3. **Hak Akses Spreadsheet:**
   * Batasi hak akses berbagi (*Share*) Google Spreadsheet hanya untuk guru dan pihak berwenang karena memuat identitas dan nilai siswa.
   * Spreadsheet ini adalah salinan laporan (*reporting replica*); basis data utama yang menjadi sumber kebenaran (*single source of truth*) tetap berada di tabel `public.hasil` Supabase.
