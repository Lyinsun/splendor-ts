# Docs README

本目录采用参考项目的渐进式披露方式：顶层文档说明目标、边界和阅读路径，具体实现细节下沉到专题文档。

推荐阅读顺序：

1. [架构设计](./架构设计.md)
2. [MVP 设计](./mvp-design.md)
3. [授权范围说明](./license-scope.md)
4. [游戏引擎与房间同步](./模块设计/01-游戏引擎与房间同步.md)
5. [V1 实现设计](./V1实现设计/)
6. [主题设计：灵兽学院](./主题设计/01-灵兽学院主题设计.md)
7. [规则调研与主题边界](./research.md)
8. 当前代码骨架：`src/main.ts`、`src/game/`、`src/gateway/`、`frontend/dashboard/`

## 维护规则

- 规则事实以 `src/game/domain` 的结算为准；Pokémon 版新增的进化与特殊卡区也必须落在 domain settlement。
- Dashboard 美术资源只作为 display metadata，不写入游戏事实。
- HTTP 与 WebSocket 只负责传输玩家意图和广播结果，不承载规则分支。
- 若领域规则、API 合约或房间同步机制变化，应同步更新 `mvp-design.md`。
- Pokémon 内容使用范围以 `license-scope.md` 为准；敏感授权材料不进入仓库。
- 若工程规范或 agent 执行约束变化，应同步更新仓库根目录 `AGENTS.md` 与 `docs/skills/`。
