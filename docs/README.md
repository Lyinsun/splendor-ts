# Docs README

本目录采用参考项目的渐进式披露方式：顶层文档说明目标、边界和阅读路径，具体实现细节下沉到专题文档。

推荐阅读顺序：

1. [架构设计](./架构设计.md)
2. [MVP 设计](./mvp-design.md)
3. [游戏引擎与房间同步](./模块设计/01-游戏引擎与房间同步.md)
4. [V1 实现设计](./V1实现设计/)
5. [主题设计：灵兽学院](./主题设计/01-灵兽学院主题设计.md)
6. [规则调研与主题边界](./research.md)
7. 当前代码骨架：`src/main.ts`、`src/game/`、`src/gateway/`、`frontend/dashboard/`

## 维护规则

- 规则事实以 `src/game/domain` 的结算为准。
- Dashboard 美术资源只作为 display metadata，不写入游戏事实。
- HTTP 与 WebSocket 只负责传输玩家意图和广播结果，不承载规则分支。
- 若领域规则、API 合约或房间同步机制变化，应同步更新 `mvp-design.md`。
- 若工程规范或 agent 执行约束变化，应同步更新仓库根目录 `AGENTS.md` 与 `docs/skills/`。
