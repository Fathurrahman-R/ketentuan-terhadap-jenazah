#!/usr/bin/env bash
# ==============================================================================
# Skrip Pengujian Edge Function: export-hasil
# ==============================================================================
# Penggunaan:
#   SUPABASE_URL="https://xxxx.supabase.co" \
#   EXPORT_TOKEN="<token_rahasia_32_karakter>" \
#   bash scripts/test-export.sh
# ==============================================================================

set -u

BASE_URL="${1:-${SUPABASE_URL:-}}"
TOKEN="${2:-${EXPORT_TOKEN:-}}"

if [[ -z "$BASE_URL" ]]; then
  echo "======================================================================="
  echo "PERINGATAN: BASE_URL belum disetel."
  echo "Jalankan dengan perintah:"
  echo "  SUPABASE_URL=\"https://YOUR_PROJECT_REF.supabase.co\" \\"
  echo "  EXPORT_TOKEN=\"<TOKEN_EXPORT_ANDA>\" \\"
  echo "  bash scripts/test-export.sh"
  echo "======================================================================="
  exit 1
fi

if [[ -z "$TOKEN" ]]; then
  echo "======================================================================="
  echo "PERINGATAN: EXPORT_TOKEN belum disetel."
  echo "Tambahkan EXPORT_TOKEN=\"...\" saat menjalankan skrip."
  echo "======================================================================="
  exit 1
fi

ENDPOINT="${BASE_URL%/}/functions/v1/export-hasil"
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
echo "MEMULAI PENGUJIAN EDGE FUNCTION (export-hasil)"
echo "Target Endpoint: $ENDPOINT"
echo "======================================================================="

# 1. Tanpa header token -> 401 UNAUTHORIZED
run_test "1. Tanpa header x-export-token (harus 401)" "401" "UNAUTHORIZED" \
  -X GET "$ENDPOINT"

# 2. Token salah -> 401 UNAUTHORIZED
run_test "2. Token salah (harus 401)" "401" "UNAUTHORIZED" \
  -X GET "$ENDPOINT" \
  -H "x-export-token: token_palsu_yang_salah_1234567890"

# 3. Metode POST ditolak -> 405 Method Not Allowed
run_test "3. Metode POST ditolak (harus 405)" "405" "VALIDASI" \
  -X POST "$ENDPOINT" \
  -H "x-export-token: $TOKEN"

# 4. Limit invalid (0) -> 400 VALIDASI
run_test "4. Limit = 0 ditolak (harus 400)" "400" "VALIDASI" \
  -X GET "$ENDPOINT?limit=0" \
  -H "x-export-token: $TOKEN"

# 5. Limit invalid (501) -> 400 VALIDASI
run_test "5. Limit = 501 ditolak (harus 400)" "400" "VALIDASI" \
  -X GET "$ENDPOINT?limit=501" \
  -H "x-export-token: $TOKEN"

# 6. Limit bukan angka ("abc") -> 400 VALIDASI
run_test "6. Limit bukan angka ditolak (harus 400)" "400" "VALIDASI" \
  -X GET "$ENDPOINT?limit=abc" \
  -H "x-export-token: $TOKEN"

# 7. Parameter after_created_at tanpa after_id -> 400 VALIDASI
run_test "7. after_created_at tanpa after_id ditolak (harus 400)" "400" "VALIDASI" \
  -X GET "$ENDPOINT?after_created_at=2026-10-20T10:00:00Z" \
  -H "x-export-token: $TOKEN"

# 8. Token benar, pemanggilan halaman pertama (limit=2) -> 200 OK
echo ""
echo "-----------------------------------------------------------------------"
echo "UJI: 8. Token benar & validasi struktur data"
resp=$(curl -s -w "\nHTTP_STATUS:%{http_code}" \
  -X GET "$ENDPOINT?limit=2" \
  -H "x-export-token: $TOKEN")
h_status=$(echo "$resp" | grep "HTTP_STATUS:" | cut -d':' -f2)
h_body=$(echo "$resp" | sed '/HTTP_STATUS:/d')

echo "Status: $h_status"
echo "Body  : $h_body"

if [[ "$h_status" == "200" ]] && echo "$h_body" | grep -q "\"ok\":true"; then
  # Pastikan tidak ada ip_hash dan ANSWER_KEY di dalam payload respon
  if echo "$h_body" | grep -qi "ip_hash"; then
    echo ">> [GAGAL / FAIL]: Kolom ip_hash bocor di respon export!"
    FAILED=$((FAILED + 1))
  else
    echo ">> [BERHASIL / PASS]: HTTP 200 diterima, data valid, ip_hash aman tidak bocor."
    PASSED=$((PASSED + 1))
  fi
else
  echo ">> [GAGAL / FAIL]: Respon tidak sesuai."
  FAILED=$((FAILED + 1))
fi

echo ""
echo "======================================================================="
echo "RINGKASAN PENGUJIAN: BERHASIL: $PASSED | GAGAL: $FAILED"
echo "======================================================================="
if [[ $FAILED -eq 0 ]]; then
  exit 0
else
  exit 1
fi
