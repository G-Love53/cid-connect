ANON_KEY=''
set -euo pipefail
BASE='https://zyaqtsmeeygcyqrvpyuy.databasepad.com'
EMAIL='bindtest99@example.com'
PASS='TempPass123!'
if test -z "$ANON_KEY"; then echo "Put your anon key inside the quotes on line 1 only"; exit 1; fi
TOKEN_JSON=$(curl -sS -X POST "${BASE}/auth/v1/token?grant_type=password" -H "apikey: ${ANON_KEY}" -H "Authorization: Bearer ${ANON_KEY}" -H "Content-Type: application/json" -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}")
USER_JWT=$(echo "$TOKEN_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('access_token',''))")
if test -z "$USER_JWT"; then echo "$TOKEN_JSON"; exit 1; fi
curl -sS -X POST "${BASE}/functions/v1/redeem-bind-token" -H "apikey: ${ANON_KEY}" -H "Authorization: Bearer ${USER_JWT}" -H "Content-Type: application/json" -d '{"action":"validate","token":"smoke-token-123","email":"test@test.com"}'
echo
