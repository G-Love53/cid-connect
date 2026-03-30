# CID Connect — E2E Smoke Test Script

**Date:** 2026-03-30 (updated)  
**Source of truth:** Famous (Supabase project)

---

## Prerequisites

- Admin/staff account logged in
- At least 2 quotes in the system (for comparison test)
- `GATEWAY_API_KEY` secret value available for webhook test
- Seeded webhook rules present (test_event/log_audit, external_claim_filed/create_claim, policy_renewed/send_notification)

---

## Test Steps

### 1. Admin → Overview → Alerts Banner

| Step | Action | Expected |
|------|--------|----------|
| 1a | Navigate to Admin Dashboard → Overview tab | Overview loads with today's counts, sparklines, activity feed |
| 1b | Check AdminAlertsBanner | Shows alerts for: expiring policies (7d), stale claims (>48h), failed renewals/webhooks (7d) |
| 1c | Click an alert link | Navigates to the correct tab (renewals, claims, webhooks) |

**Result:** PASS / FAIL  
**Notes:**

---

### 2. Admin → Rules → Create Rule + Verify Seeded Rules

| Step | Action | Expected |
|------|--------|----------|
| 2a | Navigate to Admin Dashboard → Webhook Rules tab | Rules list loads with seeded rules |
| 2b | Verify seeded rules exist | `test_event`/log_audit, `external_claim_filed`/create_claim, `policy_renewed`/send_notification |
| 2c | Click "Add Rule" | Form opens |
| 2d | Fill: event_type_match=`custom_test`, action_type=`log_audit`, description="Manual smoke test rule" | Form validates |
| 2e | Save | Rule appears in list with is_active=true |
| 2f | Toggle rule off/on | is_active toggles correctly |
| 2g | Delete the manual rule | Rule removed from list |

**Result:** PASS / FAIL  
**Notes:**

---

### 3. Admin → Renewals → Toggle Cron + Manual Run

| Step | Action | Expected |
|------|--------|----------|
| 3a | Navigate to Admin Dashboard → Renewals tab | Renewal alerts load, cron setup panel visible |
| 3b | Toggle "Enable Cron" off | `app_settings.renewal_cron_enabled` = 'false' |
| 3c | Click "Run Renewal Check" | Function returns `{ success: true, skipped: true, reason: 'renewal_cron_enabled is false' }` |
| 3d | Toggle "Enable Cron" on | `app_settings.renewal_cron_enabled` = 'true' |
| 3e | Click "Run Renewal Check" again | Function processes policies, returns `{ success: true, processed: N }` |
| 3f | Check `app_settings.renewal_last_cron_at` | Updated to current timestamp |

**Result:** PASS / FAIL  
**Notes:**

---

### 4. Policy Chat → Message → AI Reply

| Step | Action | Expected |
|------|--------|----------|
| 4a | Navigate to Chat tab (or Services → Coverage Chat) | Chat UI loads |
| 4b | Type "What does my general liability cover?" and send | Message appears in chat |
| 4c | Wait for AI response | AI reply appears with coverage context from bound quote's ai_summary |
| 4d | Check `chat_messages` table | Both user and assistant messages stored |

**Result:** PASS / FAIL  
**Notes:**

---

### 5. Quote History → Compare 2–3 Quotes

| Step | Action | Expected |
|------|--------|----------|
| 5a | Navigate to Services → Quote History | Quote list loads |
| 5b | Click "Compare Quotes" button | Compare mode activates with checkbox UI |
| 5c | Select 2 quotes | Checkboxes highlight, counter shows "2/3 selected" |
| 5d | Click "Compare 2 Quotes" | QuoteComparison view renders with side-by-side table |
| 5e | Verify comparison table | Premium, carrier, coverage, eligibility, GL limit, deductible columns |
| 5f | Check lowest premium highlight | Green badge on lowest premium quote |
| 5g | Click "Back to Quote History" | Returns to quote history list |

**Result:** PASS / FAIL  
**Notes:**

---

### 6. POST Inbound Webhook → Rule Execution (log_audit)

| Step | Action | Expected |
|------|--------|----------|
| 6a | Ensure seeded rule exists (event_type=`test_event`, action=`log_audit`) | Rule is active |
| 6b | Send webhook: | |

```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/receive-external-webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: <GATEWAY_API_KEY>" \
  -d '{
    "source": "smoke-test",
    "event_type": "test_event",
    "payload": {
      "message": "E2E smoke test",
      "timestamp": "2026-03-30T20:30:00Z"
    }
  }'
```

| Step | Action | Expected |
|------|--------|----------|
| 6c | Check response | `{ "ok": true, "rules_matched": >=1, "rules_succeeded": >=1, "rules_failed": 0 }` |
| 6d | Check `webhook_events` (inbound) | Row with event_type=`test_event`, direction=`inbound` |
| 6e | Check `webhook_events` (outbound) | Row with event_type=`rule_execution_log_audit`, direction=`outbound`, source=`rule-execution` |
| 6f | Check `admin_audit_log` | Row with action=`webhook_rule_test_event`, admin_user_id=NULL (system), entity_type=`webhook` |

**Result:** PASS / FAIL  
**Notes:**

---

### 7. POST Inbound Webhook → Rule Execution (create_claim with field_mappings)

| Step | Action | Expected |
|------|--------|----------|
| 7a | Ensure seeded rule exists (event_type=`external_claim_filed`, action=`create_claim`) | Rule is active |
| 7b | Get a valid user_id and policy_id from the DB | |

```sql
SELECT u.id as user_id, p.id as policy_id
FROM profiles u JOIN policies p ON p.user_id = u.id
LIMIT 1;
```

| 7c | Send webhook with field_mappings payload: | |

```bash
curl -X POST https://<PROJECT_REF>.supabase.co/functions/v1/receive-external-webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: <GATEWAY_API_KEY>" \
  -d '{
    "source": "external-system",
    "event_type": "external_claim_filed",
    "payload": {
      "user_id": "<USER_ID>",
      "policy_id": "<POLICY_ID>",
      "details": {
        "description": "Water damage from burst pipe in kitchen",
        "incident_date": "2026-03-28",
        "estimated_amount": 4500,
        "location": "123 Main St, Suite 100",
        "third_party": {
          "name": "ABC Plumbing Co",
          "phone": "555-0199"
        }
      }
    }
  }'
```

| Step | Action | Expected |
|------|--------|----------|
| 7d | Check response | `rules_matched >= 1`, `rules_succeeded >= 1`, rule_results includes `create_claim` with `success: true` |
| 7e | Check `claims` table | New claim with: description="Water damage...", incident_date="2026-03-28", estimated_amount=4500, incident_location="123 Main St...", third_party_name="ABC Plumbing Co", segment="bar", status="submitted" |
| 7f | Check `webhook_events` (outbound) | Row with event_type=`rule_execution_create_claim`, response_body.success=true, response_body.details.claim_number starts with "CLM-WH-" |

**Result:** PASS / FAIL  
**Notes:**

---

### 8. send-notification Rate Limiting (Deduplication)

| Step | Action | Expected |
|------|--------|----------|
| 8a | Send a notification via admin UI (e.g., update claim status → triggers email) | Email sent, logged in webhook_events |
| 8b | Immediately repeat the same status update | Second call returns `{ sent: false, skipped: true, reason: "Duplicate notification..." }` |
| 8c | Check `webhook_events` | Second row has response_body.skipped=true, response_body.reason="duplicate_within_window" |
| 8d | Wait 5+ minutes, repeat | Email sends normally (dedup window expired) |

**Result:** PASS / FAIL  
**Notes:**

---

## Verification SQL

```sql
-- Check inbound webhook event
SELECT id, event_type, direction, source, response_body
FROM webhook_events
WHERE event_type = 'test_event' AND direction = 'inbound'
ORDER BY created_at DESC LIMIT 1;

-- Check rule execution logs (outbound)
SELECT id, event_type, direction, source, response_status,
       response_body->'success' as success,
       response_body->'error' as error
FROM webhook_events
WHERE source = 'rule-execution'
ORDER BY created_at DESC LIMIT 10;

-- Check audit log entry (system rows have NULL admin_user_id)
SELECT id, admin_user_id, admin_email, action, entity_type, entity_id, details
FROM admin_audit_log
WHERE admin_user_id IS NULL
ORDER BY created_at DESC LIMIT 5;

-- Check auto-created claim from field_mappings
SELECT id, claim_number, segment, description, incident_date,
       estimated_amount, incident_location, third_party_name, status,
       backend_response->'source' as source
FROM claims
WHERE claim_number LIKE 'CLM-WH-%'
ORDER BY created_at DESC LIMIT 5;

-- Check quote comparison (verify quotes exist)
SELECT id, quote_id, segment, premium, eligibility
FROM quotes
ORDER BY created_at DESC LIMIT 5;

-- Check dedup skipped sends
SELECT id, event_type, response_body
FROM webhook_events
WHERE source = 'send-notification'
  AND response_body->>'skipped' = 'true'
ORDER BY created_at DESC LIMIT 5;

-- Check seeded webhook rules
SELECT id, event_type_match, source_match, action_type, is_active, description
FROM webhook_rules
ORDER BY created_at DESC;
```

---

## Summary

| # | Test | Status |
|---|------|--------|
| 1 | Admin Overview + Alerts Banner | |
| 2 | Webhook Rules CRUD + Seeded Rules | |
| 3 | Renewals Toggle + Manual Run | |
| 4 | Coverage Chat E2E | |
| 5 | Quote Comparison | |
| 6 | Inbound Webhook → log_audit Rule Execution | |
| 7 | Inbound Webhook → create_claim with field_mappings | |
| 8 | send-notification Rate Limiting (Dedup) | |

---

## Field Mappings Reference

The `create_claim` action supports `action_config.field_mappings` for JSON path extraction from the inbound payload.

### Syntax

```json
{
  "field_mappings": {
    "<target_claims_column>": "<dot.notation.path.in.payload>"
  }
}
```

### Supported path features

- **Dot notation:** `details.description` → `payload.details.description`
- **Array indexing:** `items.0.name` → `payload.items[0].name`
- **Nested objects:** `details.third_party.name` → `payload.details.third_party.name`

### Resolution order (per column)

1. `field_mappings` value (resolved from payload)
2. `action_config` static value (e.g., `"segment": "bar"`)
3. Payload root field (e.g., `payload.user_id`)
4. Default value (e.g., auto-generated claim_number)

### Example rule

```json
{
  "event_type_match": "external_claim_filed",
  "source_match": null,
  "action_type": "create_claim",
  "action_config": {
    "segment": "bar",
    "status": "submitted",
    "claim_type": "automated",
    "field_mappings": {
      "user_id": "user_id",
      "policy_id": "policy_id",
      "description": "details.description",
      "incident_date": "details.incident_date",
      "estimated_amount": "details.estimated_amount",
      "incident_location": "details.location",
      "third_party_name": "details.third_party.name",
      "third_party_contact": "details.third_party.phone"
    }
  }
}
```
