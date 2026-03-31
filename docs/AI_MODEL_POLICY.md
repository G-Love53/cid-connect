# AI Model Policy v2.0

## Coverage Chat Architecture

Browser -> Famous `coverage-chat` -> Render `/api/coverage-chat/inference` -> Claude/Gemini

## Model Hierarchy

- Primary: Claude (`claude-sonnet-4-20250514`)
- Fallback: Gemini (`gemini-2.5-flash`)
- Fallback on 429/5xx/timeout/empty upstream response.

## Key Isolation

- Famous keys for coverage chat: `CID_API_BASE_URL`, `CID_INTERNAL_API_KEY`
- Render keys: `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
- `ANTHROPIC_API_KEY` and `GEMINI_API_KEY` never live in Famous or browser env.

## Canonical Sources

- `reference/functions/coverage-chat/index.ts`
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
