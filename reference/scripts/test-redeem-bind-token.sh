# Run: bash reference/scripts/test-redeem-bind-token.sh
# Edit ONLY the next line (paste your Famous anon key between the quotes).
ANON_KEY='PASTE_YOUR_ANON_KEY_HERE'

set -euo pipefail
BASE='https://zyaqtsmeeygcyqrvpyuy.databasepad.com'
EMAIL='bindtest99@example.com'
PASS='TempPass123!'

if [[ "$ANON_KEY" == "PASTE_YOUR_ANON_KEY_HERE" || -z "$ANON_KEY" ]]; then
  echo "Edit ANON_KEY at the top of this file (Famous anon key)."
  exit 1
fi

TOKEN_JSON=$(curl -sS -X POST "${BASE}/auth/v1/token?grant_type=password" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}")

USER_JWT=$(echo "$TOKEN_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))")

if [[ -z "$USER_JWT" ]]; then
  echo "Login failed:"
  echo "$TOKEN_JSON"
  exit 1
fi

curl -sS -X POST "${BASE}/functions/v1/redeem-bind-token" \
  -H "apikey: ${ANON_KEY}" \
  -H "Authorization: Bearer ${USER_JWT}" \
  -H "Content-Type: application/json" \
  -d '{"action":"validate","token":"smoke-token-123","email":"test@test.com"}'
echo
