# Panduan Backend Kuis PAI "Ketentuan terhadap Jenazah"

Backend kuis ini menggunakan **Supabase** (PostgreSQL dengan Row Level Security dan satu Deno Edge Function `submit-quiz`). Frontend (situs statis di GitHub Pages) hanya berinteraksi melalui Edge Function ini.

---

## 1. Arsitektur & Keamanan

```
[ Browser / Siswa ]
       │
       │ POST /functions/v1/submit-quiz
       ▼
[ Supabase Edge Function (submit-quiz) ]
   ├── Validasi ketat (Nama, Kelas, NIS, Jawaban 10 butir, Durasi)
   ├── Honeypot check (field `website` harus kosong)
   ├── Rate Limiting (Maks 10 submit / 10 menit per IP hash)
   ├── Anti-Duplikasi (Nama & Kelas sama dalam 60 detik ditolak)
   ├── Penilaian di server (Kunci dibaca dari secret `ANSWER_KEY`)
   └── Simpan ke DB via SUPABASE_SERVICE_ROLE_KEY
       │
       ▼
[ PostgreSQL (public.hasil) ]
   ├── RLS Aktif (REVOKE ALL dari anon & authenticated)
   └── Akses ekspor data hanya via Dashboard SQL Editor (Admin/Guru)
```

### Otorisasi & Keputusan JWT (`verify_jwt = false`)
- **Temuan Dokumentasi Resmi:** Supabase menyediakan dua format public key: format tradisional berupa JWT HS256 (`eyJ...`) dan format next-gen publishable key (`sb_publishable_...`). Format baru bukan merupakan JWT standar sehingga gateway Supabase akan menolak request dengan status `401 Unauthorized` jika gateway memaksakan verifikasi JWT.
- **Keputusan:** Fungsi `submit-quiz` dikonfigurasi dengan `verify_jwt = false` (melalui `supabase/config.toml` dan flag deploy).
- **Konsekuensi & Mitigasi:** Endpoint dapat dipanggil langsung oleh publik tanpa login akun pengguna. Pengamanan penuh dialihkan dan dijamin oleh Edge Function melalui:
  1. Header CORS sesuai daftar origin terpercaya.
  2. Pembatasan ukuran payload maksimal 4 KB.
  3. Sanitasi string dan pembuangan karakter kontrol.
  4. Proteksi honeypot bot.
  5. Rate limit berbasis SHA-256 IP hash (IP mentah tidak pernah disimpan).
  6. Pemeriksaan duplikasi 60 detik.
  7. Row Level Security (RLS) di database yang mencabut seluruh hak akses dari role `anon` dan `authenticated`.

---

## 2. Struktur File Backend

```
├── .gitignore
├── README-backend.md
├── scripts/
│   └── test.sh
└── supabase/
    ├── config.toml
    ├── migrations/
    │   └── 001_hasil.sql
    └── functions/
        └── submit-quiz/
            ├── deno.json
            └── index.ts
```

---

## 3. Langkah Deployment (Langkah Manual oleh Guru/Admin)

> **PENTING:** Jangan pernah membagikan atau menuliskan password akun, token CLI, atau `service_role key` ke dalam file git/repo.

### Langkah 1: Buat Proyek di Supabase
1. Masuk ke [Supabase Dashboard](https://supabase.com/dashboard).
2. Buat proyek baru (pilih region terdekat, misalnya **Singapore (ap-southeast-1)**).
3. Catat **Project Reference ID** (misal: `abcdefghijklmno`), **Project URL**, dan **Anon/Publishable Key** dari menu *Project Settings -> API*.

### Langkah 2: Login & Tautkan CLI
Buka terminal lokal Anda dan jalankan:
```bash
# Login ke akun Supabase Anda (browser akan terbuka untuk konfirmasi)
supabase login

# Tautkan direktori lokal ke proyek Supabase
supabase link --project-ref <PROJECT_REFERENCE_ID>
```

### Langkah 3: Terapkan Migrasi Database
Jalankan migrasi untuk membuat tabel `public.hasil`, index, RLS, dan view ekspor:
```bash
supabase db push
```

### Langkah 4: Set Environment Secrets
Setel 3 variabel rahasia pada Edge Function. **Gunakan nilai rahasia Anda sendiri dan jangan tulis di file apapun**:
```bash
# Format kunci: 10 angka 0-3 dipisah koma (contoh placeholder: "1,3,2,2,2,1,2,1,1,1")
# Format ALLOWED_ORIGINS: domain GitHub Pages dan localhost dipisah koma
# Format IP_SALT: string acak panjang untuk salt hashing SHA-256
supabase secrets set \
  ANSWER_KEY="<KUNCI_10_ANGKA_DIPISAH_KOMA>" \
  ALLOWED_ORIGINS="https://<USERNAME_GITHUB>.github.io,http://localhost:8000" \
  IP_SALT="<STRING_ACAK_PANJANG_UNIK>"
```
*(Catatan: `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` secara otomatis disuntikkan oleh runtime Supabase Edge Function).*

### Langkah 5: Deploy Edge Function
Deploy fungsi `submit-quiz` dengan verifikasi JWT dinonaktifkan:
```bash
supabase functions deploy submit-quiz --no-verify-jwt
```

### Langkah 6: Hubungkan Frontend
Buka file `config.js` di root proyek dan perbarui nilainya:
```javascript
const SUPABASE_URL = "https://<PROJECT_REFERENCE_ID>.supabase.co";
const SUPABASE_ANON_KEY = "<ANON_ATAU_PUBLISHABLE_KEY>";
const FUNCTION_NAME = "submit-quiz";
const USE_MOCK = false; // Ubah menjadi false untuk menggunakan backend nyata
```

---

## 4. Panduan Operasional & Ekspor Nilai

### Penggunaan Jaringan Wi-Fi Sekolah (Penyesuaian Rate Limit)
- Secara default, sistem membatasi **10 pengiriman per 10 menit dari satu IP publik**.
- Jika seluruh siswa di kelas mengerjakan kuis secara serentak menggunakan Wi-Fi sekolah yang sama, semua siswa akan berbagi 1 IP publik keluar (*NAT*). Hal ini berisiko memicu error `429 TERLALU_BANYAK` bagi siswa ke-11 dan seterusnya.
- **Solusi:** Di file `supabase/functions/submit-quiz/index.ts`, Anda dapat menyesuaikan konstanta:
  ```typescript
  const RATE_LIMIT_MAX_REQUESTS = 60; // Naikkan sesuai kapasitas siswa dalam satu sesi
  ```
  Lalu jalankan deploy ulang: `supabase functions deploy submit-quiz --no-verify-jwt`.

### Proyek Gratis Dijeda Otomatis (*Auto-pause*)
- Supabase paket gratis (*Free Tier*) akan menjeda proyek secara otomatis jika tidak ada aktivitas database selama ±7 hari.
- **SOP Sebelum Jam Pelajaran:**
  1. H-1 atau 1 jam sebelum ujian/kelas dimulai, buka dashboard Supabase.
  2. Jika proyek dalam status *Paused*, klik tombol **Restore Project** (butuh waktu 1-2 menit).
  3. Lakukan 1 kali tes submit untuk memastikan endpoint sudah responsif dan tidak ada kendala *cold start*.

### Ekspor Hasil Kuis ke CSV
Untuk mengunduh rekap nilai siswa:
1. Buka Supabase Dashboard -> menu **SQL Editor**.
2. Jalankan query berikut:
   ```sql
   select * from public.ekspor_hasil;
   ```
3. Klik tombol **Export CSV** di kanan atas tabel hasil query.
4. Buka file CSV di Microsoft Excel atau Google Sheets. Kolom waktu sudah otomatis menggunakan waktu Indonesia Barat (`Asia/Jakarta`).

---

## 5. Pengujian dengan `scripts/test.sh`

Skrip pengujian otomatis berbasis `curl` disediakan untuk memverifikasi fungsionalitas dan keamanan backend:
```bash
SUPABASE_URL="https://<PROJECT_REF>.supabase.co" \
SUPABASE_ANON_KEY="<ANON_KEY>" \
ALLOWED_ORIGIN="https://<USERNAME_GITHUB>.github.io" \
bash scripts/test.sh
```

Pengujian mencakup:
1. CORS Preflight dari allowed origin (204 dengan header yang sesuai).
2. CORS Preflight dari unknown origin (204 tanpa allow-origin).
3. Penolakan method non-POST (405).
4. Penolakan payload bukan JSON (400).
5. Penolakan payload > 4 KB (400).
6. Penolakan bot honeypot `website` (400).
7. Validasi karakter dan panjang `nama`, `kelas`, `nis`, `durasi`.
8. Validasi isi jawaban (tepat 10 elemen, nilai 0-3).
9. Penolakan duplikat dalam jendela 60 detik (409).
10. Proteksi database RLS (akses REST langsung via anon key ditolak).
