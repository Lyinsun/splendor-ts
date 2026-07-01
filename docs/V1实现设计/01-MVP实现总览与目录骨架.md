# 01-MVP 实现总览与目录骨架

## 一、目标

把桌游核心闭环落到 TypeScript 项目中：

```text
Player action
-> HTTP command
-> RoomService
-> Domain settlement
-> authoritative GameState
-> HTTP response + WebSocket broadcast
-> Dashboard render
```

## 二、目录骨架

```text
src/
  config/
  game/
    domain/
    application/
    infrastructure/
  gateway/
    http/
  shared/
frontend/dashboard/
  src/presentation/
assets/splendor-monsters/
  themes/
  image-generation/
docs/
test/
```

## 三、V1 功能切片

| 切片 | 状态 | 验证 |
| --- | --- | --- |
| TS/Hono/React 项目骨架 | 已落地 | `npm run typecheck` |
| 领域规则结算 | 已落地 | `test/game-engine.test.ts` |
| 房间服务 | 已落地 | API 手工验证与后续集成测试 |
| WebSocket 广播 | 已落地 | 多窗口手工验证 |
| Dashboard MVP | 已落地 | `npm run build:dashboard` |
| 授权范围文档 | 已落地 | `docs/license-scope.md` |
| 过渡美术资源 | 已落地 | 文件存在和页面加载验证 |
| 主题资源分割与中英文展示 | 已落地 | `npm run typecheck` / `npm run build:dashboard` |
| Pokémon 版进化规则 | 待实现 | Domain tests |
| Pokémon 版特殊卡区 | 待实现 | Domain tests |
| AI Agent 行动工具 | 待实现 | Integration tests |

## 四、测试计划

- Domain unit tests:
  - 开局市场和银行初始化。
  - 拿 3 个不同资源。
  - 保留市场卡并获得棱晶。
  - 购买卡牌并获得永久徽章。
  - 行动后超过 10 个 token 时弃到 10 个。
  - Pokémon 版进化条件校验与结算。
  - 特殊卡区捕获与 Master Ball/prism 门槛。
  - 18 分触发公平轮，平局按进化记录数和面前 Pokémon 数量处理。
  - 非当前玩家行动被拒绝。
- Build checks:
  - `npm run typecheck`
  - `npm test`
  - `npm run build:dashboard`
- Manual smoke:
  - 启动服务。
  - 创建房间。
  - 添加 demo rival 或第二窗口加入。
  - 开局并执行至少 3 个行动。
  - 确认两个窗口状态同步。
