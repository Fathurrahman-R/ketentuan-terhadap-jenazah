// ==============================================================================
// Supabase Edge Function: submit-quiz
// Kuis PAI "Ketentuan terhadap Jenazah"
// ==============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

// ------------------------------------------------------------------------------
// KONSTANTA & KONFIGURASI
// (Batas limit dan durasi dapat disesuaikan di sini bila diperlukan)
// ------------------------------------------------------------------------------
const RATE_LIMIT_MAX_REQUESTS = 10;            // Maksimum 10 submit per IP
const RATE_LIMIT_WINDOW_SECONDS = 10 * 60;      // Dalam rentang 10 menit
const DUPLICATE_WINDOW_SECONDS = 60;           // Jeda anti-duplikat 60 detik
const MAX_BODY_BYTES = 4096;                   // Batas ukuran payload 4 KB

// Pembahasan resmi soal kuis (indeks 0-9 = soal 1-10)
// Catatan: Teks pembahasan ini bersifat edukatif dan publik untuk review siswa
const PEMBAHASAN: readonly string[] = [
  "Fardhu kifayah: jika sebagian muslim sudah melakukannya, gugurlah kewajiban yang lain.",
  "Empat kewajiban: memandikan, mengkafani, menshalatkan, menguburkan. Memasang tenda pesta bukan termasuk.",
  "Shalat jenazah dilakukan dengan 4 kali takbir, tanpa rukuk dan sujud.",
  "Laki-laki 3 lembar, perempuan 5 lembar. Minimal wajib 1 lembar yang menutup seluruh tubuh.",
  "Takbir 1: Al-Fatihah, takbir 2: shalawat, takbir 3: doa untuk jenazah, takbir 4: doa lalu salam.",
  "Jenazah diletakkan di liang lahad miring ke kanan dan menghadap kiblat.",
  "Setelah takbir pertama membaca Al-Fatihah.",
  "Siraman terakhir dicampur kapur barus (wewangian).",
  "Adab ta'ziyah: mendoakan almarhum dan menghibur keluarga, tanpa meratap berlebihan.",
  "Menurut jumhur ulama, syahid di medan perang tidak dimandikan dan tidak dishalatkan."
];

// ------------------------------------------------------------------------------
// FUNGSI BANTUAN (HELPERS)
// ------------------------------------------------------------------------------

/**
 * Membangun header CORS berdasarkan secret ALLOWED_ORIGINS.
 * CATATAN PENTING KEAMANAN:
 * CORS bukan pengamanan sejati di sisi server (karena dapat dilewati curl/skrip non-browser),
 * melainkan mekanisme browser untuk membatasi pemanggilan antar-origin yang tidak sah.
 */
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const allowedEnv = Deno.env.get("ALLOWED_ORIGINS") || "";
  const allowedList = allowedEnv
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };

  // Kirim header Access-Control-Allow-Origin hanya jika origin pengirim terdaftar
  if (origin && allowedList.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

/**
 * Mengirimkan respon JSON terstandardisasi beserta header CORS.
 */
function sendJson(
  data: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders
    }
  });
}

/**
 * Membersihkan teks: membuang karakter kontrol (0x00-0x1F, 0x7F-0x9F),
 * memangkas spasi depan-belakang, dan merapikan spasi ganda.
 */
function sanitizeText(val: unknown): string | null {
  if (typeof val !== "string") return null;
  const noControl = val.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
  return noControl.trim().replace(/\s+/g, " ");
}

/**
 * Mengambil IP klien dari header x-forwarded-for elemen pertama,
 * atau header proxy lainnya bila ada.
 */
function getClientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0].trim();
    if (first) return first;
  }
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  const xRealIp = req.headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();
  return "0.0.0.0";
}

/**
 * Menghitung hash SHA-256 dari IP klien + salt rahasia.
 * IP mentah tidak pernah disimpan ke database.
 */
async function computeIpHash(ip: string, salt: string): Promise<string> {
  const data = new TextEncoder().encode(ip + salt);
  const digestBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(digestBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Escape karakter wildcard SQL LIKE/ILIKE (% dan _) untuk pencarian nama eksak case-insensitive.
 */
function escapeIlike(text: string): string {
  return text.replace(/[%_\\]/g, "\\$&");
}

// ------------------------------------------------------------------------------
// HANDLER UTAMA EDGE FUNCTION
// ------------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // 1. Tangani preflight CORS (OPTIONS)
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // 2. Hanya izinkan metode POST
  if (req.method !== "POST") {
    return sendJson(
      { ok: false, error: "Metode tidak diizinkan.", code: "VALIDASI" },
      405,
      corsHeaders
    );
  }

  // 3. Batasi ukuran body maksimal 4 KB
  let rawBody: Uint8Array;
  try {
    const buffer = await req.arrayBuffer();
    if (buffer.byteLength > MAX_BODY_BYTES) {
      return sendJson(
        { ok: false, error: "Ukuran permintaan melebihi batas 4 KB.", code: "VALIDASI" },
        400,
        corsHeaders
      );
    }
    rawBody = new Uint8Array(buffer);
  } catch (_e) {
    return sendJson(
      { ok: false, error: "Gagal membaca data permintaan.", code: "VALIDASI" },
      400,
      corsHeaders
    );
  }

  // 4. Parse JSON
  let payload: Record<string, unknown>;
  try {
    const text = new TextDecoder().decode(rawBody);
    payload = JSON.parse(text);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Payload bukan objek");
    }
  } catch (_e) {
    return sendJson(
      { ok: false, error: "Format data JSON tidak valid.", code: "VALIDASI" },
      400,
      corsHeaders
    );
  }

  // 5. Validasi Honeypot (website)
  // Field ini tidak boleh diisi. Jika bot mengisinya, tolak tanpa menyimpan apapun.
  if (payload.website !== undefined && payload.website !== null && payload.website !== "") {
    return sendJson(
      { ok: false, error: "Permintaan tidak dapat diproses.", code: "VALIDASI" },
      400,
      corsHeaders
    );
  }

  // 6. Validasi Identitas (nama, kelas, nis)
  const nama = sanitizeText(payload.nama);
  if (!nama || nama.length < 1 || nama.length > 60) {
    return sendJson(
      { ok: false, error: "Nama wajib diisi dengan panjang 1-60 karakter.", code: "VALIDASI" },
      400,
      corsHeaders
    );
  }

  const kelas = sanitizeText(payload.kelas);
  if (!kelas || kelas.length < 1 || kelas.length > 30) {
    return sendJson(
      { ok: false, error: "Kelas wajib diisi dengan panjang 1-30 karakter.", code: "VALIDASI" },
      400,
      corsHeaders
    );
  }

  let nis: string | null = null;
  if (payload.nis !== undefined && payload.nis !== null) {
    if (typeof payload.nis !== "string") {
      return sendJson(
        { ok: false, error: "NIS harus berupa teks.", code: "VALIDASI" },
        400,
        corsHeaders
      );
    }
    const cleanNis = sanitizeText(payload.nis);
    if (cleanNis && cleanNis.length > 30) {
      return sendJson(
        { ok: false, error: "NIS tidak boleh melebihi 30 karakter.", code: "VALIDASI" },
        400,
        corsHeaders
      );
    }
    nis = cleanNis && cleanNis.length > 0 ? cleanNis : null;
  }

  // 7. Validasi Jawaban (tepat 10 butir, tiap butir 0-3 atau null)
  if (!Array.isArray(payload.jawaban) || payload.jawaban.length !== 10) {
    return sendJson(
      { ok: false, error: "Jawaban harus berupa daftar tepat 10 butir soal.", code: "VALIDASI" },
      400,
      corsHeaders
    );
  }

  const jawaban: (number | null)[] = [];
  for (let i = 0; i < 10; i++) {
    const item = payload.jawaban[i];
    if (item === null) {
      jawaban.push(null);
    } else if (typeof item === "number" && Number.isInteger(item) && item >= 0 && item <= 3) {
      jawaban.push(item);
    } else {
      return sendJson(
        { ok: false, error: "Pilihan jawaban setiap nomor harus berupa angka 0-3 atau null.", code: "VALIDASI" },
        400,
        corsHeaders
      );
    }
  }

  // 8. Validasi Durasi (integer 0-86400)
  const durasi = payload.durasi;
  if (typeof durasi !== "number" || !Number.isInteger(durasi) || durasi < 0 || durasi > 86400) {
    return sendJson(
      { ok: false, error: "Durasi pengerjaan harus bilangan bulat antara 0 dan 86400 detik.", code: "VALIDASI" },
      400,
      corsHeaders
    );
  }

  // 9. Validasi Konfigurasi Environment Server
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const ipSalt = Deno.env.get("IP_SALT");
  const answerKeyRaw = Deno.env.get("ANSWER_KEY");

  if (!supabaseUrl || !supabaseServiceKey || !ipSalt) {
    console.error("Kesalahan konfigurasi lingkungan server.");
    return sendJson(
      { ok: false, error: "Terjadi kesalahan internal pada konfigurasi server.", code: "SERVER" },
      500,
      corsHeaders
    );
  }

  if (!answerKeyRaw) {
    console.error("Kesalahan konfigurasi lingkungan server: kunci jawaban belum dikonfigurasi.");
    return sendJson(
      { ok: false, error: "Terjadi kesalahan internal pada konfigurasi server.", code: "SERVER" },
      500,
      corsHeaders
    );
  }

  const keyParts = answerKeyRaw.split(",").map(s => s.trim());
  if (keyParts.length !== 10 || !keyParts.every(k => /^[0-3]$/.test(k))) {
    console.error("Kesalahan konfigurasi lingkungan server: format kunci jawaban tidak sesuai.");
    return sendJson(
      { ok: false, error: "Terjadi kesalahan internal pada konfigurasi server.", code: "SERVER" },
      500,
      corsHeaders
    );
  }
  const answerKey = keyParts.map(Number);

  // 10. Inisialisasi Supabase Client (Service Role)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  // 11. Pemeriksaan Rate Limit (Batas Frekuensi Pengiriman)
  const clientIp = getClientIp(req);
  const ipHash = await computeIpHash(clientIp, ipSalt);

  const tenMinutesAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  const { count: ipCount, error: countError } = await supabase
    .from("hasil")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("created_at", tenMinutesAgo);

  if (countError) {
    console.error("Gagal melakukan pengecekan frekuensi pengiriman.");
    return sendJson(
      { ok: false, error: "Terjadi kesalahan pada layanan basis data.", code: "SERVER" },
      500,
      corsHeaders
    );
  }

  if ((ipCount ?? 0) >= RATE_LIMIT_MAX_REQUESTS) {
    return sendJson(
      {
        ok: false,
        error: "Terlalu banyak pengiriman kuis dari jaringan ini dalam 10 menit terakhir. Silakan tunggu beberapa saat.",
        code: "TERLALU_BANYAK"
      },
      429,
      corsHeaders
    );
  }

  // 12. Pemeriksaan Duplikat (Identitas sama dalam 60 detik)
  const sixtySecondsAgo = new Date(Date.now() - DUPLICATE_WINDOW_SECONDS * 1000).toISOString();
  let duplicateQuery = supabase
    .from("hasil")
    .select("id", { count: "exact", head: true })
    .ilike("nama", escapeIlike(nama))
    .eq("kelas", kelas)
    .gte("created_at", sixtySecondsAgo);

  if (nis === null) {
    duplicateQuery = duplicateQuery.is("nis", null);
  } else {
    duplicateQuery = duplicateQuery.eq("nis", nis);
  }

  const { count: dupCount, error: dupError } = await duplicateQuery;

  if (dupError) {
    console.error("Gagal melakukan pengecekan duplikasi pengiriman.");
    return sendJson(
      { ok: false, error: "Terjadi kesalahan pada layanan basis data.", code: "SERVER" },
      500,
      corsHeaders
    );
  }

  if ((dupCount ?? 0) > 0) {
    return sendJson(
      {
        ok: false,
        error: "Jawaban kuis dengan nama dan kelas ini baru saja terkirim. Mohon tunggu 1 menit jika ingin mengirim ulang.",
        code: "DUPLIKAT"
      },
      409,
      corsHeaders
    );
  }

  // 13. Penilaian & Pembuatan Ulasan (Review)
  let benar = 0;
  const review = [];

  for (let i = 0; i < 10; i++) {
    const kunci = answerKey[i];
    const jawabanmu = jawaban[i];
    const isBenar = jawabanmu !== null && jawabanmu === kunci;
    if (isBenar) {
      benar++;
    }
    review.push({
      no: i + 1,
      jawabanmu,
      kunci,
      benar: isBenar,
      pembahasan: PEMBAHASAN[i]
    });
  }

  const skor = benar * 10;

  // 14. Simpan ke tabel public.hasil
  const { error: insertError } = await supabase.from("hasil").insert({
    nama,
    kelas,
    nis,
    skor,
    benar,
    jawaban,
    durasi,
    ip_hash: ipHash
  });

  if (insertError) {
    console.error("Gagal menyimpan hasil kuis."); // Tidak membocorkan nama, data siswa, atau kunci
    return sendJson(
      { ok: false, error: "Gagal menyimpan hasil kuis ke database.", code: "SERVER" },
      500,
      corsHeaders
    );
  }

  // 15. Kirim Respon Sukses
  return sendJson(
    {
      ok: true,
      skor,
      benar,
      total: 10,
      review
    },
    200,
    corsHeaders
  );
});
