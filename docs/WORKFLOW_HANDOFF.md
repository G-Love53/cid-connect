# Workflow Handoff Standard

This file defines the required handoff process between Famous (analysis/patch author) and Cursor agent (implementation + Git operations).

## Roles

- Famous: proposes changes, provides full patch handoff artifacts.
- Cursor agent: applies patch, verifies behavior, commits, and pushes to GitHub.

## Done Definition

A task is not done until:

1. Changes are committed to GitHub.
2. Commit SHA is posted in chat.
3. Smoke-test evidence is included.

## Required Patch Handoff Format

Every handoff must include:

1. Exact file paths changed (repo-relative).
2. Full file contents or precise diffs.
3. Intended commit message.
4. Smoke-test commands + expected output.
5. Required env/secrets changes.

## RSS Alignment (decision filter)

Use RSS for every architecture/process decision:

- **Reliable**: predictable deploy + rollback path, no hidden dashboard-only changes.
- **Scalable**: repeatable workflow for multi-agent handoffs and future contributors.
- **Sellable**: clean auditability and transferability for due diligence/exit.

## Security and Surface Rules

- Browser/frontend never receives service-role or provider secrets.
- Famous runtime handles auth/session context.
- Render/CID API holds model-provider secrets and privileged server credentials.
- Connect is not deployed on Render unless explicitly approved.

## Audit Requirements

For each completed change:

- Capture commit SHA.
- Include smoke-test evidence.
- Record secrets touched (names only, no secret values).
- Keep source-of-truth in Git (no dashboard-only final state).

## Failure Handling

If any required handoff item is missing, implementation pauses until the patch is complete.
