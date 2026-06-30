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
  - `assets/splendor-monsters/arena-hero.png`
  - `assets/splendor-monsters/image-generation/arena-hero-manifest.json`
- Verification passed:
  - `npm run typecheck`
  - `npm test`
  - `npm run build:dashboard`
  - local `GET /healthz`
  - create room, add demo player, start room, take tokens
  - dashboard HTML and hero image static loading

## Known Remaining Work

- Visual browser screenshot QA was not available because no browser-control tool was exposed in this session.
