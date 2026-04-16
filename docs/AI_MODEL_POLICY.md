# AI Model Policy v2.0

## Coverage Chat Architecture

**Path A — Connect bridge (when `VITE_CID_API_URL` is set in the built app)**  
Browser → **`POST {VITE_CID_API_URL}/api/connect/chat`** (CID-PDF-API on Render) → **`connectChatService.js`** → Claude primary, Gemini fallback. Identity headers: **`X-User-Email`**, **`X-User-Id`**. No provider keys in the browser.

**Path B — Legacy / Edge**  
Browser → Famous **`coverage-chat`** Edge Function → (optional) Render inference route as in original wiring → Claude/Gemini.

**Path C — Am I Covered / Policy Chat**  
Same split: **`CoverageChat.tsx`** and **`AmICoveredChat.tsx`** use Path A when **`isConnectInsuranceApiEnabled()`**, else Path B.

## Model Hierarchy

- Primary: Claude (`claude-sonnet-4-20250514`)
- Fallback: Gemini (`gemini-2.5-flash`)
- Fallback on 429/5xx/timeout/empty upstream response.

## Key Isolation

- Famous keys for coverage chat: `CID_API_BASE_URL`, `CID_INTERNAL_API_KEY`
- Render keys: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY` and `GEMINI_API_KEY` never live in Famous or browser env.

## Canonical Sources

- **`pdf-backend`** `src/services/connectChatService.js`, `src/routes/connectApi.js` (`POST /chat`) — bridge mode
- `reference/functions/coverage-chat/index.ts` — legacy Edge
- `reference/cid-pdf-api/coverage-inference-contract.md`
- `reference/migrations/002_chat_model_audit_log.sql`

## Response Contract

Coverage chat responses must include:

- `success`
- `message`
- `model_used`
- `fallback_used`
- `fallback_reason`
- `latency_ms`
