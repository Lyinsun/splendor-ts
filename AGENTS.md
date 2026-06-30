# AGENTS.md

This file provides guidance to Codex and other coding agents when working in this repository.

## Project context

- This repository is a TypeScript MVP for a multiplayer online board game inspired by Splendor's public rules shape.
- The theme is original elemental companions. Do not add official Pokemon names, character art, screenshots, logos, sounds, or copied card data.
- Reference `/Users/bytedance/Documents/Code/TheSeed/deepworld-seedts` for documentation discipline, DDD layering, and frontend delivery boundaries.
- Use Node.js 22 through nvm for Node/npm commands:

```bash
source "$HOME/.nvm/nvm.sh" && nvm use 22
```

## Common commands

- Install dependencies: `source "$HOME/.nvm/nvm.sh" && nvm use 22 && npm install`
- Start server: `source "$HOME/.nvm/nvm.sh" && nvm use 22 && npm run start`
- Dev server watch: `source "$HOME/.nvm/nvm.sh" && nvm use 22 && npm run dev:server`
- Dashboard dev server: `source "$HOME/.nvm/nvm.sh" && nvm use 22 && npm run dev:dashboard`
- Dashboard build: `source "$HOME/.nvm/nvm.sh" && nvm use 22 && npm run build:dashboard`
- Typecheck: `source "$HOME/.nvm/nvm.sh" && nvm use 22 && npm run typecheck`
- Tests: `source "$HOME/.nvm/nvm.sh" && nvm use 22 && npm test`

## Project skills

Project-local skill documents live in `docs/skills/`.

- `/splendor-dev-guardrails <task>`: apply architecture and implementation guardrails before/after non-trivial work.
- `/splendor-doc-write <doc path or type>`: apply docs writing standards for `docs/`.
- `/splendor-research <topic>`: use before adding non-trivial libraries, infrastructure, or external game-rule assumptions.

These are repository instructions, not automatically registered runtime tools. Read the corresponding `SKILL.md` before applying the workflow manually.

## Core architecture rules

- The server-side game engine is the only writer of objective game state.
- Browser clients submit player actions only; they must not calculate or persist authoritative resources, cards, scores, turn order, or winners.
- HTTP handlers translate request DTOs to application commands. They must not contain Splendor-style rule branches.
- WebSocket infrastructure broadcasts authoritative room snapshots. It must not define business rules.
- Game rules, validation, settlement, and scoring belong in `src/game/domain`.
- Room orchestration belongs in `src/game/application`.
- Framework adapters, WebSocket hubs, and static serving belong in `src/gateway` or `src/game/infrastructure`.

Dependency direction:

```text
delivery / interfaces -> application -> domain
                         |
                         -> infrastructure
```

## Runtime and rule semantics

- `GameState` is the objective room snapshot.
- `GameAction` is a player intent, not a direct mutation.
- `applyGameAction` is the settlement boundary for token taking, card reserve, card purchase, mentor invitation, turn advance, final-round detection, and winner calculation.
- Resource changes must conserve tokens between player holdings and bank unless explicit rules create or remove availability.
- MVP blocks actions that would exceed the 10-token limit instead of implementing post-action discard.
- Logs describe settled actions only; they are not a separate source of truth.

## Frontend rules

- The first screen must be the usable multiplayer table/lobby, not a marketing landing page.
- Dashboard code in `frontend/dashboard` may use only HTTP and WebSocket APIs. Do not import `src/game/domain` or application services into React.
- Visual assets and `asset-index.json` are display metadata only. They must not change game existence, scores, cards, turns, or winner state.
- Locale and theme selection are presentation concerns. They may translate labels, card display names, log text, and images, but must not change authoritative ids or rules.
- Endpoint errors must be visible in the UI; do not silently render failures as empty game state.
- Use compact, operations-oriented UI. Avoid large decorative hero-only layouts that hide the actual game table.

## IP and asset rules

- Use original creature names, card names, and generated art.
- Do not store official Pokemon or Splendor art assets in this repository.
- Generated project assets belong under `assets/splendor-monsters/`.
- Theme-specific art belongs under `assets/splendor-monsters/themes/<theme-id>/`.
- Theme generation metadata belongs under `assets/splendor-monsters/image-generation/<theme-id>/`.
- Record generated asset metadata in `assets/splendor-monsters/asset-index.json`.
- If a generated asset is referenced by code, it must be copied into the workspace and not left under a tool cache directory.

## Working with docs

- Before architecture-facing changes, read `docs/README.md`, `docs/架构设计.md`, and the relevant `docs/模块设计/` or `docs/V1实现设计/` files.
- If implementation diverges from docs, update docs in the same change or record the mismatch in `progress.md`.
- Docs should use Chinese prose with English code identifiers and concise Mermaid diagrams when module boundaries, data flow, or domain models change.

## Commit discipline

- Do not commit secrets or `.env`.
- If a change affects game rules, API contracts, module boundaries, WebSocket semantics, or Dashboard behavior, update docs in the same change set.
- Before handing off substantial changes, run typecheck, tests, and Dashboard build unless blocked.
