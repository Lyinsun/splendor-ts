# CLAUDE.md

Project instructions for Claude Code and compatible coding agents in this repository.

Use `AGENTS.md` as the primary source of truth. This file mirrors the operational summary for tools that prefer `CLAUDE.md`.

## Identity

Splendor Monsters TS is a TypeScript multiplayer MVP. The server is authoritative for all game facts. The theme is original elemental companions and must not copy official Pokemon or Splendor creative assets.

## Commands

```bash
source "$HOME/.nvm/nvm.sh" && nvm use 22
npm install
npm run typecheck
npm test
npm run build:dashboard
npm run start
```

## Non-negotiable constraints

- Keep DDD boundaries: `domain`, `application`, `infrastructure`, `gateway`.
- Keep Hono handlers thin.
- Keep React Dashboard separate from domain imports.
- Put Splendor-style rules in `src/game/domain`.
- Preserve server-authoritative room state and WebSocket broadcast semantics.
- Keep generated art under `assets/splendor-monsters/` and treat assets as display metadata only.
- Update docs when changing architecture, API, rules, or frontend behavior.
