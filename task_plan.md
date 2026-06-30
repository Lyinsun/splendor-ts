# Task Plan

## Objective

Build a TypeScript MVP for a multiplayer online Splendor-style elemental companion game, with original generated assets and project-local architecture/specification guidance.

## Work Items

- [x] Create TypeScript/Hono/React project skeleton.
- [x] Implement game domain rules for resources, reserve, purchase, scoring, mentors, turn order, and final round.
- [x] Implement in-memory room service and WebSocket room broadcast.
- [x] Implement React Dashboard for lobby and game table.
- [x] Create project-local AGENTS/docs/skills guardrails.
- [x] Generate and store original hero art under `assets/splendor-monsters/`.
- [x] Run typecheck, tests, Dashboard build, and server smoke.

## Verification Plan

```bash
source "$HOME/.nvm/nvm.sh" && nvm use 22 && npm run typecheck
source "$HOME/.nvm/nvm.sh" && nvm use 22 && npm test
source "$HOME/.nvm/nvm.sh" && nvm use 22 && npm run build:dashboard
```
