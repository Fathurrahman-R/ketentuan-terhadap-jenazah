#!/usr/bin/env bash
# ==============================================================================
# Skrip Pengujian Backend: submit-quiz (Supabase Edge Function & Database)
# ==============================================================================
# Penggunaan:
#   SUPABASE_URL="https://xxxx.supabase.co" \
#   SUPABASE_ANON_KEY="eyJ..." \
#   ALLOWED_ORIGIN="http://localhost:8000" \
#   bash scripts/test.sh
#
# Atau jika menguji lokal:
#   bash scripts/test.sh http://127.0.0.1:54321/functions/v1/submit-quiz <anon_key>
# ==============================================================================

set -u

BASE_URL="${1:-${SUPABASE_URL:-}}"
ANON_KEY="${2:-${SUPABASE_ANON_KEY:-}}"
ALLOWED_ORIGIN="${ALLOWED_ORIGIN:-http://localhost:8000}"

if [[ -z "$BASE_URL" ]]; then
  echo "======================================================================="
  echo "PERINGATAN: BASE_URL belum disetel."
  echo "Silakan jalankan dengan argumen atau variabel lingkungan, contoh:"
  echo "  SUPABASE_URL=\"https://YOUR_PROJECT_REF.supabase.co\" \\"
  echo "  SUPABASE_ANON_KEY=\"eyJhbGciOi...\" \\"
  echo "  bash scripts/test.sh"
  echo "======================================================================="
  exit 1
fi

# Pastikan URL mengarah ke endpoint submit-quiz
if [[ "$BASE_URL" != */functions/v1/submit-quiz* ]]; then
  ENDPOINT="${BASE_URL%/}/functions/v1/submit-quiz"
  REST_URL="${BASE_URL%/}/rest/v1/hasil"
  VIEW_URL="${BASE_URL%/}/rest/v1/ekspor_hasil"
else
  ENDPOINT="$BASE_URL"
  REST_URL="${BASE_URL%/functions/v1/submit-quiz}/rest/v1/hasil"
  VIEW_URL="${BASE_URL%/functions/v1/submit-quiz}/rest/v1/ekspor_hasil"
fi

PASSED=0
FAILED=0

run_test() {
  local title="$1"
  local expected_status="$2"
  local expected_code="$3"
  shift 3
  local curl_args=("$@")

  echo ""
  echo "-----------------------------------------------------------------------"
  echo "UJI: $title"
  echo "Perintah: curl -s -w \"\\nHTTP_STATUS:%{http_code}\" ${curl_args[*]}"

  response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "${curl_args[@]}")
  http_status=$(echo "$response" | grep "HTTP_STATUS:" | cut -d':' -f2)
  body=$(echo "$response" | sed '/HTTP_STATUS:/d')

  echo "Status Diterima : $http_status (Diharapkan: $expected_status)"
  echo "Respon Body     : $body"

  local ok=true
  if [[ "$http_status" != "$expected_status" ]]; then
    ok=false
  fi

  if [[ -n "$expected_code" ]]; then
    if ! echo "$body" | grep -q "\"code\":\"$expected_code\""; then
      ok=false
    fi
  fi

  if [[ "$ok" == true ]]; then
    echo ">> [BERHASIL / PASS]"
    PASSED=$((PASSED + 1))
  else
    echo ">> [GAGAL / FAIL]"
    FAILED=$((FAILED + 1))
  fi
}

echo "======================================================================="
echo "MEMULAI PENGUJIAN BACKEND SUPABASE (submit-quiz)"
echo "Target Endpoint: $ENDPOINT"
echo "======================================================================="

# -----------------------------------------------------------------------------
# 1. CORS Preflight (Origin Terdaftar)
# -----------------------------------------------------------------------------
echo ""
echo "-----------------------------------------------------------------------"
echo "UJI: 1. CORS Preflight OPTIONS dari Allowed Origin ($ALLOWED_ORIGIN)"
cors_resp=$(curl -s -I -X OPTIONS "$ENDPOINT" \
  -H "Origin: $ALLOWED_ORIGIN" \
  -H "Access-Control-Request-Method: POST")
echo "$cors_resp"
if echo "$cors_resp" | grep -q "204" && echo "$cors_resp" | grep -qi "access-control-allow-origin: $ALLOWED_ORIGIN"; then
  echo ">> [BERHASIL / PASS]: HTTP 204 dan header Access-Control-Allow-Origin diterima."
  PASSED=$((PASSED + 1))
else
  echo ">> [GAGAL / FAIL]: Respon CORS preflight tidak sesuai."
  FAILED=$((FAILED + 1))
fi

# -----------------------------------------------------------------------------
# 2. CORS Preflight (Origin Asing / Tidak Terdaftar)
# -----------------------------------------------------------------------------
echo ""
echo "-----------------------------------------------------------------------"
echo "UJI: 2. CORS Preflight OPTIONS dari Origin Tidak Terdaftar"
cors_resp_unauth=$(curl -s -I -X OPTIONS "$ENDPOINT" \
  -H "Origin: https://situs-tidak-dikenal-evil.com" \
  -H "Access-Control-Request-Method: POST")
echo "$cors_resp_unauth"
if echo "$cors_resp_unauth" | grep -q "204" && ! echo "$cors_resp_unauth" | grep -qi "access-control-allow-origin"; then
  echo ">> [BERHASIL / PASS]: HTTP 204 tanpa header Access-Control-Allow-Origin."
  PASSED=$((PASSED + 1))
else
  echo ">> [GAGAL / FAIL]: Header Allow-Origin seharusnya tidak dikirim untuk origin liar."
  FAILED=$((FAILED + 1))
fi

# -----------------------------------------------------------------------------
# 3. Metode Selain POST (GET)
# -----------------------------------------------------------------------------
run_test "3. Metode GET ditolak" "405" "VALIDASI" \
  -X GET "$ENDPOINT"

# -----------------------------------------------------------------------------
# 4. Body Bukan JSON
# -----------------------------------------------------------------------------
run_test "4. Body bukan JSON ditolak" "400" "VALIDASI" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "ini bukan format json"

# -----------------------------------------------------------------------------
# 5. Body Melebihi 4 KB
# -----------------------------------------------------------------------------
LARGE_PAYLOAD=$(printf '{"nama":"%s","kelas":"10A","durasi":10,"jawaban":[0,1,2,3,0,1,2,3,0,1]}' "$(printf 'A%.0s' {1..5000})")
run_test "5. Body > 4 KB ditolak" "400" "VALIDASI" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "$LARGE_PAYLOAD"

# -----------------------------------------------------------------------------
# 6. Honeypot (website) Terisi
# -----------------------------------------------------------------------------
run_test "6. Honeypot website terisi ditolak (silent rejection)" "400" "VALIDASI" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"nama":"Bot Uji","kelas":"10A","nis":"123","jawaban":[0,1,2,3,0,1,2,3,0,1],"durasi":60,"website":"http://spam-link.com"}'

# -----------------------------------------------------------------------------
# 7. Validasi: Nama Kosong / Karakter Kontrol Saja
# -----------------------------------------------------------------------------
run_test "7. Nama kosong ditolak" "400" "VALIDASI" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"nama":"   \t\n  ","kelas":"10A","jawaban":[0,1,2,3,0,1,2,3,0,1],"durasi":60}'

# -----------------------------------------------------------------------------
# 8. Validasi: Nama Lebih dari 60 Karakter
# -----------------------------------------------------------------------------
LONG_NAME="Muhammad Abdullah bin Ahmad Al-Faruq bin Salim Al-Manshur bin Thohir"
run_test "8. Nama > 60 karakter ditolak" "400" "VALIDASI" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "{\"nama\":\"$LONG_NAME\",\"kelas\":\"10A\",\"jawaban\":[0,1,2,3,0,1,2,3,0,1],\"durasi\":60}"

# -----------------------------------------------------------------------------
# 9. Validasi: Kelas Kosong
# -----------------------------------------------------------------------------
run_test "9. Kelas kosong ditolak" "400" "VALIDASI" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"nama":"Ahmad Fauzi","kelas":"","jawaban":[0,1,2,3,0,1,2,3,0,1],"durasi":60}'

# -----------------------------------------------------------------------------
# 10. Validasi: Jawaban Kurang dari 10 Butir
# -----------------------------------------------------------------------------
run_test "10. Jawaban kurang dari 10 butir ditolak" "400" "VALIDASI" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"nama":"Ahmad Fauzi","kelas":"10A","jawaban":[0,1,2,3,0,1,2,3,0],"durasi":60}'

# -----------------------------------------------------------------------------
# 11. Validasi: Jawaban Mengandung Nilai di Luar 0-3
# -----------------------------------------------------------------------------
run_test "11. Jawaban dengan indeks invalid (4) ditolak" "400" "VALIDASI" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"nama":"Ahmad Fauzi","kelas":"10A","jawaban":[0,1,2,3,4,1,2,3,0,1],"durasi":60}'

# -----------------------------------------------------------------------------
# 12. Validasi: Durasi Negatif / Non-Integer
# -----------------------------------------------------------------------------
run_test "12. Durasi negatif ditolak" "400" "VALIDASI" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -d '{"nama":"Ahmad Fauzi","kelas":"10A","jawaban":[0,1,2,3,0,1,2,3,0,1],"durasi":-5}'

# -----------------------------------------------------------------------------
# 13. Pengiriman Berhasil (Jawaban Valid & Variasi Null)
# -----------------------------------------------------------------------------
RAND_ID=$((RANDOM % 90000 + 10000))
run_test "13. Pengiriman kuis valid (200 OK dengan skor & review)" "200" "" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Origin: $ALLOWED_ORIGIN" \
  -d "{\"nama\":\"Siswa Uji $RAND_ID\",\"kelas\":\"10 IPA 1\",\"nis\":\"NIS$RAND_ID\",\"jawaban\":[1,3,2,null,2,1,null,1,1,1],\"durasi\":120}"

# -----------------------------------------------------------------------------
# 14. Anti-Duplikasi: Pengiriman Ulang Identitas Sama dalam 60 Detik
# -----------------------------------------------------------------------------
run_test "14. Pengiriman duplikat identitas dalam 60 detik ditolak (409 DUPLIKAT)" "409" "DUPLIKAT" \
  -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "Origin: $ALLOWED_ORIGIN" \
  -d "{\"nama\":\"siswa uji $RAND_ID\",\"kelas\":\"10 IPA 1\",\"nis\":\"NIS$RAND_ID\",\"jawaban\":[0,0,0,0,0,0,0,0,0,0],\"durasi\":50}"

# -----------------------------------------------------------------------------
# 15. Keamanan RLS Database: Uji Akses Langsung REST API dengan Anon Key
# -----------------------------------------------------------------------------
if [[ -n "$ANON_KEY" ]]; then
  echo ""
  echo "-----------------------------------------------------------------------"
  echo "UJI: 15. Keamanan RLS: SELECT langsung ke tabel hasil via PostgREST"
  sec_select=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X GET "$REST_URL" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY")
  sec_status=$(echo "$sec_select" | grep "HTTP_STATUS:" | cut -d':' -f2)
  sec_body=$(echo "$sec_select" | sed '/HTTP_STATUS:/d')
  echo "Status: $sec_status | Body: $sec_body"
  if [[ "$sec_status" == "401" || "$sec_status" == "403" || "$sec_body" == "[]" ]]; then
    echo ">> [BERHASIL / PASS]: Akses SELECT anon ditolak atau mengembalikan 0 baris."
    PASSED=$((PASSED + 1))
  else
    echo ">> [GAGAL / FAIL]: Akses anon ke tabel hasil bocor!"
    FAILED=$((FAILED + 1))
  fi

  echo ""
  echo "-----------------------------------------------------------------------"
  echo "UJI: 16. Keamanan RLS: INSERT langsung ke tabel hasil via PostgREST"
  sec_insert=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
    -X POST "$REST_URL" \
    -H "apikey: $ANON_KEY" \
    -H "Authorization: Bearer $ANON_KEY" \
    -H "Content-Type: application/json" \
    -d '{"nama":"Hacker","kelas":"X","skor":100,"benar":10,"jawaban":[1],"durasi":1,"ip_hash":"x"}')
  sec_instat=$(echo "$sec_insert" | grep "HTTP_STATUS:" | cut -d':' -f2)
  sec_inbody=$(echo "$sec_insert" | sed '/HTTP_STATUS:/d')
  echo "Status: $sec_instat | Body: $sec_inbody"
  if [[ "$sec_instat" == "401" || "$sec_instat" == "403" || "$sec_instat" == "404" ]]; then
    echo ">> [BERHASIL / PASS]: Akses INSERT anon ditolak oleh RLS / Revoke."
    PASSED=$((PASSED + 1))
  else
    echo ">> [GAGAL / FAIL]: Akses INSERT anon berhasil masuk!"
    FAILED=$((FAILED + 1))
  fi
fi

# -----------------------------------------------------------------------------
# Ringkasan Pengujian
# -----------------------------------------------------------------------------
echo ""
echo "======================================================================="
echo "RINGKASAN PENGUJIAN: BERHASIL: $PASSED | GAGAL: $FAILED"
echo "======================================================================="
if [[ $FAILED -eq 0 ]]; then
  exit 0
else
  exit 1
fi
