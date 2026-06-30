# Progress

## 2026-06-30

- Created a TypeScript MVP skeleton with Hono server, React/Vite Dashboard, WebSocket dependency, tests, and startup script.
- Implemented server-authoritative game rules in `src/game/domain`.
- Implemented `RoomService` and `RoomWebSocketHub`.
- Implemented the first Dashboard UI for lobby, table, bank, market, reserve, player panels, mentors, and logs.
- Added project-local guidance files adapted from the reference project:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `docs/skills/splendor-dev-guardrails/SKILL.md`
  - `docs/skills/splendor-doc-write/SKILL.md`
  - `docs/skills/splendor-research/SKILL.md`
  - `docs/架构设计.md`
  - `docs/模块设计/01-游戏引擎与房间同步.md`
  - `docs/V1实现设计/`
- Generated and saved original dashboard hero art:
  - `assets/splendor-monsters/themes/elemental-league/arena-hero.png`
  - `assets/splendor-monsters/image-generation/elemental-league/arena-hero-manifest.json`
- Verification passed:
  - `npm run typecheck`
  - `npm test`
  - `npm run build:dashboard`
  - local `GET /healthz`
  - create room, add demo player, start room, take tokens
  - dashboard HTML and hero image static loading

## Known Remaining Work

- Visual browser screenshot QA was not available because no browser-control tool was exposed in this session.

## 2026-06-30 Theme/Locale Update

- Added Dashboard presentation layer for `zh-CN` / `en-US` text, element labels, companion display names, mentor display names, and basic log localization.
- Split art assets into theme directories under `assets/splendor-monsters/themes/`.
- Added `elemental-league` and generated `crystal-observatory` hero assets with per-theme generation manifests.
- Kept theme and locale as display concerns only; no authoritative game-rule state was changed.
