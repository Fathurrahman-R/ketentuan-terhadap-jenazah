-- ==============================================================================
-- Migrasi: 001_hasil.sql
-- Proyek: Kuis PAI "Ketentuan terhadap Jenazah"
-- ==============================================================================

-- 1. Buat tabel utama penyimpanan hasil kuis
create table if not exists public.hasil (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nama text not null check (char_length(nama) >= 1 and char_length(nama) <= 60),
  kelas text not null check (char_length(kelas) >= 1 and char_length(kelas) <= 30),
  nis text check (nis is null or char_length(nis) <= 30),
  skor int not null check (skor >= 0 and skor <= 100),
  benar int not null check (benar >= 0 and benar <= 10),
  jawaban jsonb not null,
  durasi int not null check (durasi >= 0 and durasi <= 86400),
  ip_hash text not null
);

-- 2. Index untuk mendukung query rate limit, pengecekan duplikat, dan agregasi
create index if not exists idx_hasil_created_at
  on public.hasil (created_at desc);

create index if not exists idx_hasil_nama_kelas_created
  on public.hasil (lower(nama), kelas, created_at desc);

create index if not exists idx_hasil_ip_hash_created
  on public.hasil (ip_hash, created_at desc);

-- 3. Keamanan: Aktifkan Row Level Security (RLS) & Cabut Akses Publik
alter table public.hasil enable row level security;

-- JANGAN buat policy apapun untuk anon maupun authenticated.
-- Cabut seluruh hak akses dari role anon dan authenticated:
revoke all on table public.hasil from anon, authenticated;

-- 4. View siap pakai untuk ekspor CSV lewat SQL Editor Dashboard
-- Waktu otomatis dikonversi ke zona waktu Asia/Jakarta (WIB)
create or replace view public.ekspor_hasil as
select
  to_char(created_at at time zone 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') as waktu_jakarta,
  nama,
  kelas,
  nis,
  skor,
  benar,
  durasi
from public.hasil
order by created_at desc;

-- Cabut akses view dari role anon dan authenticated
revoke all on public.ekspor_hasil from anon, authenticated;
