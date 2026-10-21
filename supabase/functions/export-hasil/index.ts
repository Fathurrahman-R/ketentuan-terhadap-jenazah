// ==============================================================================
// Supabase Edge Function: export-hasil
// Ekspor Data Hasil Kuis PAI ke Google Spreadsheet
// ==============================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Format respon JSON terstandardisasi.
 * Tidak menggunakan header CORS karena pemanggil adalah server (Google Apps Script).
 */
function sendJson(data: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

/**
 * Perbandingan string waktu-konstan (constant-time comparison)
 * untuk mencegah serangan timing attack pada validasi token rahasia.
 */
async function timingSafeEqualString(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const aHash = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(a)));
  const bHash = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(b)));
  let diff = 0;
  for (let i = 0; i < aHash.length; i++) {
    diff |= aHash[i] ^ bHash[i];
  }
  return diff === 0 && a === b;
}

Deno.serve(async (req: Request) => {
  // 1. Hanya izinkan metode GET
  if (req.method !== "GET") {
    return sendJson(
      { ok: false, error: "Metode tidak diizinkan.", code: "VALIDASI" },
      405
    );
  }

  // 2. Autentikasi: Verifikasi x-export-token menggunakan perbandingan waktu-konstan
  const providedToken = req.headers.get("x-export-token");
  const expectedToken = Deno.env.get("EXPORT_TOKEN");

  if (!providedToken || !expectedToken) {
    // Tolak tanpa memberikan petunjuk apapun dan tanpa mencatat token di log
    return sendJson(
      { ok: false, error: "Akses tidak diizinkan.", code: "UNAUTHORIZED" },
      401
    );
  }

  const isTokenValid = await timingSafeEqualString(providedToken, expectedToken);
  if (!isTokenValid) {
    return sendJson(
      { ok: false, error: "Akses tidak diizinkan.", code: "UNAUTHORIZED" },
      401
    );
  }

  // 3. Validasi Parameter Query (after_created_at, after_id, limit)
  const url = new URL(req.url);
  const afterCreatedAt = url.searchParams.get("after_created_at") || "";
  const afterId = url.searchParams.get("after_id") || "";
  const limitParam = url.searchParams.get("limit");

  let limit = 500;
  if (limitParam !== null && limitParam !== "") {
    if (!/^[1-9][0-9]*$/.test(limitParam.trim())) {
      return sendJson(
        { ok: false, error: "Parameter limit harus bilangan bulat antara 1 dan 500.", code: "VALIDASI" },
        400
      );
    }
    limit = parseInt(limitParam.trim(), 10);
    if (limit < 1 || limit > 500) {
      return sendJson(
        { ok: false, error: "Parameter limit harus bilangan bulat antara 1 dan 500.", code: "VALIDASI" },
        400
      );
    }
  }

  // Validasi parameter paginasi keyset
  const hasAfterCreated = afterCreatedAt.trim().length > 0;
  const hasAfterId = afterId.trim().length > 0;

  if (hasAfterCreated !== hasAfterId) {
    return sendJson(
      { ok: false, error: "Parameter after_created_at dan after_id harus disertakan bersamaan untuk paginasi.", code: "VALIDASI" },
      400
    );
  }

  if (hasAfterCreated && hasAfterId) {
    // Validasi format ISO-8601
    const parsedDate = Date.parse(afterCreatedAt);
    if (isNaN(parsedDate)) {
      return sendJson(
        { ok: false, error: "Format after_created_at tidak valid (harus ISO-8601).", code: "VALIDASI" },
        400
      );
    }

    // Validasi format UUID v4
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(afterId)) {
      return sendJson(
        { ok: false, error: "Format after_id tidak valid (harus UUID).", code: "VALIDASI" },
        400
      );
    }
  }

  // 4. Verifikasi Konfigurasi Lingkungan Server
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const answerKeyRaw = Deno.env.get("ANSWER_KEY");

  if (!supabaseUrl || !supabaseServiceKey || !answerKeyRaw) {
    console.error("Kesalahan konfigurasi lingkungan server.");
    return sendJson(
      { ok: false, error: "Terjadi kesalahan internal pada konfigurasi server.", code: "SERVER" },
      500
    );
  }

  const keyParts = answerKeyRaw.split(",").map(s => s.trim());
  if (keyParts.length !== 10 || !keyParts.every(k => /^[0-3]$/.test(k))) {
    console.error("Kesalahan konfigurasi lingkungan server: format kunci jawaban tidak sesuai.");
    return sendJson(
      { ok: false, error: "Terjadi kesalahan internal pada konfigurasi server.", code: "SERVER" },
      500
    );
  }
  const answerKey = keyParts.map(Number);

  // 5. Inisialisasi Supabase Client (Service Role)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  // 6. Query Basis Data dengan Keyset Pagination
  // PERHATIKAN: Kolom ip_hash SENGAJA TIDAK DIPILIH demi privasi siswa
  let query = supabase
    .from("hasil")
    .select("id, created_at, nama, kelas, nis, skor, benar, durasi, jawaban")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(limit + 1);

  if (hasAfterCreated && hasAfterId) {
    // Sintaks PostgREST: (created_at > afterCreatedAt) OR (created_at = afterCreatedAt AND id > afterId)
    query = query.or(`created_at.gt.${afterCreatedAt},and(created_at.eq.${afterCreatedAt},id.gt.${afterId})`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Gagal melakukan query ekspor data kuis.");
    return sendJson(
      { ok: false, error: "Terjadi kesalahan pada layanan basis data.", code: "SERVER" },
      500
    );
  }

  const rows = data || [];
  const hasMore = rows.length > limit;
  const slicedRows = hasMore ? rows.slice(0, limit) : rows;

  // 7. Hitung Penanda Benar/Salah (b) per Soal (1/0) di Sisi Server
  // Kunci jawaban mentah tidak pernah dikirim ke klien
  const exportRows = slicedRows.map(row => {
    const rawAnswers = Array.isArray(row.jawaban) ? row.jawaban : [];
    const b: number[] = [];

    for (let i = 0; i < 10; i++) {
      const studentAns = rawAnswers[i];
      const isCorrect = (studentAns !== null && studentAns !== undefined && studentAns === answerKey[i]);
      b.push(isCorrect ? 1 : 0);
    }

    return {
      id: row.id,
      created_at: row.created_at,
      nama: row.nama,
      kelas: row.kelas,
      nis: row.nis,
      skor: row.skor,
      benar: row.benar,
      durasi: row.durasi,
      b
    };
  });

  // 8. Respon Sukses
  return sendJson(
    {
      ok: true,
      rows: exportRows,
      has_more: hasMore
    },
    200
  );
});
