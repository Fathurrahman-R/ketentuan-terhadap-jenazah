# Audit — Ketentuan terhadap Jenazah

Tanggal: 21 Oktober 2026. Cakupan: lima layar (pembuka, data diri, materi, kuis, hasil), 1440 px dan 320/390/768/1024 px, mode terang (satu-satunya tema). Arah visual: lembar spesifikasi teknis.

Metode: audit manual terukur karena launcher Impeccable tidak dapat diunduh di lingkungan ini (jaringan). Pemeriksaan kontras, hierarki, target sentuh, overflow, console, jaringan, dan gerak dijalankan lewat Playwright; pemeriksaan permukaan memakai `design-taste-frontend` (`lint.mjs --app`, `inspect.mjs --app`). Detector Impeccable **tidak dijalankan** — temuan visual diverifikasi manual di browser, bukan dari detector.

## Skor

| # | Dimensi | Skor | Temuan utama |
| --- | --- | --- | --- |
| 1 | Accessibility | 4 | AA terpenuhi penuh; 0 pelanggaran kontras; 1 h1 per layar; label, alt, fokus, skip link lengkap. |
| 2 | Performance | 3 | Aset foto 120–360 KB, satu foto eager per bagian (292 KB di pembuka); tidak ada dependensi eksternal. |
| 3 | Theming | 4 | Seluruh warna lewat token; tidak ada hex liar; satu tema terang sesuai keputusan produk. |
| 4 | Responsive Design | 3 | Fluid 320–1440, tanpa overflow; satu target sentuh 94×39 px (tautan kredit inline). |
| 5 | Implementation Integrity | 4 | Sistem aturan/garis, tipografi, dan maskot konsisten dengan produk; tidak ada drift template. |
| **Total** | | **18/20** | **Excellent — polish minor** |

## Verdict integritas

**Lulus.** Implementasi mengekspresikan sistem yang spesifik produk: lembar spesifikasi dengan bingkai gambar, crop mark, strip dokumen, grid modular 12 kolom, pemisah section 1 px, sel bergaris tipis, label mono, indeks materi sebagai daftar bergaris, lembar jawaban berpetak, tabel skor, dan Lentera sebagai etsa garis. Tidak ada komponen yang bisa ditukar dengan produk lain tanpa kehilangan makna. Tidak ada framework, CDN, atau dependensi UI.

## Temuan

Tidak ada P0/P1.

### [P2] Berat foto pendukung

- **Lokasi**: `assets/materi-pengantar.jpg` (292 KB), `materi-menguburkan.jpg` (360 KB); `app.js` memuat satu foto per bagian dengan `decoding="async"` tanpa lazy.
- **Kategori**: Performance.
- **Dampak**: Di jaringan lambat, foto bagian baru bisa terlambat muncul; pembuka mengunduh 292 KB sebelum CTA terlihat.
- **Rekomendasi**: encode ulang q70–72 pada 1200 px (perkiraan 40–50% lebih kecil), lalu ukur ulang ketajaman. Lazy loading sengaja tidak dipakai karena sempat gagal saat re-render; jika dicoba lagi, uji di Chromium + WebKit.
- **Command**: `$impeccable optimize`.

### [P3] Tautan kredit 39 px

- **Lokasi**: `.materi-credit a`, `.landing-credit a` (94×39 px).
- **Kategori**: Responsive / Accessibility.
- **Dampak**: Di bawah standar internal 48 px, tetapi masih di atas ambang WCAG 2.5.8 AA (24 px). Tautan inline di dalam caption; memperbesar padding lebih jauh akan menabrak baris caption.
- **Rekomendasi**: biarkan sebagai pengecualian inline, atau pindahkan kredit ke baris mandiri bila target 48 px wajib.

### [P3] Animasi lebar progress

- **Lokasi**: `.progress span` (`width` 180 ms).
- **Kategori**: Performance.
- **Dampak**: Memicu layout pada elemen 6 px; tidak terasa di perangkat uji, tetapi bukan animasi compositor.
- **Rekomendasi**: ganti ke `transform: scaleX()` bila ingin sempurna; nilai persen tetap disimpan di `aria-valuenow`.

### [P3] Satu tema terang

- **Lokasi**: `style.css` (`color-scheme: light`), `index.html` (`theme-color` tunggal).
- **Kategori**: Theming.
- **Dampak**: Preferensi gelap pengguna tidak diikuti. Ini keputusan pemilik produk, bukan regresi; tidak ada klaim mode gelap yang tersisa di UI/README.
- **Rekomendasi**: pertahankan selama arah lembar spesifikasi ini berlaku; bila dihidupkan lagi, token sudah siap.

## Positif

- 0 pelanggaran kontras WCAG AA pada lima layar 1440 px (22 / 22 / 43 / 24 / 120 elemen teks) dan pada landing 320 px (18 elemen); rasio teks utama jauh di atas ambang. Label mono dinaikkan ke 12 px.
- Tidak ada overflow horizontal di 320, 390, 768, 1024, dan 1440 px. Judul landing maksimal dua baris di 320/390/1440 dan satu baris di 768/1024.
- Fokus keyboard 3 px emas + offset 2 px; skip link muncul saat fokus; `prefers-reduced-motion` mematikan animasi maskot dan transisi, status tetap terlihat.
- Satu h1 per layar, urutan heading tanpa lompatan, semua input berlabel, semua gambar ber-alt, tidak ada ID ganda, tidak ada tombol tanpa nama. Section code diberi `aria-hidden` karena menduplikasi h1.
- 0 error console pada pemuatan layar yang diuji.
- `lint.mjs --app`: **0 FAIL, 7 WARN** — 5× mono (label teknis memang mono) dan 2× numbering (`decimal-leading-zero` pada tabel spesifikasi/flow; `padStart` timestamp di Edge Function). `inspect.mjs --app`: **0 FAIL, 2 WARN** — tiga typeface (serif/sans/mono, disengaja) dan h1 cover 58 px (cover sengaja bukan judul layar aplikasi).
- Alur uji end-to-end berhasil sampai hasil. Pengiriman pada putaran ini dicegat dengan respons server tiruan agar tidak menambah baris data; pengiriman live 200 sudah terverifikasi pada putaran sebelumnya. Logika CSV tidak diubah dan tidak diuji ulang.

## Belum diverifikasi

- Perangkat fisik (Android/iOS), Safari, dan pembaca layar nyata.
- Deployment GitHub Pages dan perilaku aset dari subpath.
- RLS, aturan duplikat, dan view ekspor di Supabase di luar satu pengiriman sukses.
- Mode mock (`USE_MOCK = true`) tidak diuji ulang pada putaran ini; `config.js` saat ini live.
- Detector Impeccable otomatis (launcher tidak tersedia).

## Catatan data uji

Uji alur mengirim **beberapa hasil nyata (3–4 baris)** ke `public.hasil` dengan nama **Aisyah Nur / VIII-A** (skor 0, durasi 1–161 detik) karena `USE_MOCK` sudah `false`. Hapus baris tersebut di dashboard Supabase sebelum mengambil data kelas. Pengiriman terakhir dicegat dengan mock dan tidak tersimpan. Jumlah pasti tidak dibaca balik dari database (tidak ada akses baca yang diverifikasi).
