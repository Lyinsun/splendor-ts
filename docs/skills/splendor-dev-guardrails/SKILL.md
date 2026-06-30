---
name: splendor-dev-guardrails
description: Enforce Splendor Monsters TS architecture, game-rule authority, DDD layering, frontend, asset, docs, and verification guardrails before and after non-trivial work.
argument-hint: "[task or change description]"
---

Apply Splendor Monsters TS development guardrails to `$ARGUMENTS`.

## Purpose

Use this skill to keep implementation aligned with the project goal: a TypeScript multiplayer board-game MVP with server-authoritative Splendor-style settlement and original elemental companion theming.

The project must not drift into a client-authoritative game, a copied Pokemon/Splendor asset pack, or a UI-only prototype without rule settlement.

## Core invariants

- The server-side game engine is the only writer of objective game state.
- Browser clients submit `GameAction` intents only.
- `applyGameAction` is the settlement boundary.
- HTTP handlers translate transport requests and responses only.
- WebSocket broadcasts room snapshots and never defines business rules.
- Resource changes are conserved between bank and players unless explicit rules say otherwise.
- Logs and visual assets are downstream display surfaces, not sources of game facts.

## DDD guardrail

Layer code as:

```text
domain          // entities, value objects, rules, invariants, settlement
application     // room use cases, command/query orchestration
infrastructure  // websocket hubs, external adapters, persistence implementations
gateway         // Hono HTTP/static delivery
```

Dependency direction:

```text
delivery / interfaces -> application -> domain
                         |
                         -> infrastructure
```

Do not:

- Put token, card, score, final-round, or winner rules in Hono handlers.
- Import Hono, WebSocket, DOM, or React types into domain code.
- Let React import `src/game/domain` or `src/game/application`.
- Hide game rules in generic utilities.
- Let generated art or asset metadata influence game state.

## Frontend guardrail

- First viewport should be the usable lobby/table.
- Show endpoint errors visibly.
- Keep actions disabled when it is not the local player's turn.
- Use existing API/WS contracts instead of local state mutation.
- Use generated assets only as display metadata.

## IP and research guardrail

- Do not use official Pokemon character names, images, sprites, logos, or sounds.
- Do not store official Splendor art or copied card data.
- If external rule assumptions are needed, research and document the source under `docs/research.md` or `docs/research/`.

## Required workflow

1. Classify the change: domain, application, infrastructure, gateway, dashboard, assets, docs, or tests.
2. Read `AGENTS.md`, `docs/README.md`, `docs/架构设计.md`, and relevant module/V1 docs when architecture-facing.
3. Reuse existing project patterns before adding new libraries.
4. Plan tests and docs updates before editing non-trivial behavior.
5. Implement in small slices.
6. Verify:

```bash
source "$HOME/.nvm/nvm.sh" && nvm use 22 && npm run typecheck
source "$HOME/.nvm/nvm.sh" && nvm use 22 && npm test
source "$HOME/.nvm/nvm.sh" && nvm use 22 && npm run build:dashboard
```

## Post-change checklist

- [ ] Domain remains framework-free.
- [ ] Server remains authoritative.
- [ ] HTTP handlers are thin DTO mapping.
- [ ] WebSocket only broadcasts authoritative snapshots.
- [ ] Dashboard does not import domain/application modules.
- [ ] IP/asset boundaries are respected.
- [ ] Tests cover changed game rules or API behavior.
- [ ] Docs are synchronized or divergence is recorded.
