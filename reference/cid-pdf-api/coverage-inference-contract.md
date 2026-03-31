# Coverage Inference Contract (Render)

Endpoint: `POST /api/coverage-chat/inference`

## Auth

- Header: `Authorization: Bearer <CID_INTERNAL_API_KEY>`

## Request Body

```json
{
  "message": "Am I covered for water damage?",
  "policyContext": {},
  "aiSummary": {},
  "chatHistory": []
}
```

## Response Body

```json
{
  "success": true,
  "message": "Coverage answer...",
  "model_used": "claude",
  "fallback_used": false,
  "fallback_reason": null,
  "latency_ms": 1200
}
```

## Model Policy

- Primary: `claude-sonnet-4-20250514`
- Fallback: `gemini-2.5-flash`
- Fallback triggers: 429, 5xx, timeout, empty response.

## Render Env

- `ANTHROPIC_API_KEY`
- `GEMINI_API_KEY`
- Optional: `CLAUDE_MODEL`, `GEMINI_MODEL`
