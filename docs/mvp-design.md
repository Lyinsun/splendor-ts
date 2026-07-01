# MVP 设计

## 系统定位

本项目是一个多人线上桌游 MVP。规则基准切换为授权 Pokémon 版 Splendor：在《璀璨宝石》式资源引擎上加入 Pokémon 版进化、特殊卡区和 Master Ball 语义。Pokémon 名称、进化链、属性、卡牌数据和资产的使用范围以 `docs/license-scope.md` 为准，具体规则资料以 `docs/璀璨宝石宝可梦_简规.pdf` 和 `docs/璀璨宝石宝可梦_A4DIY_有皮卡丘_ver1201.pdf` 为本地来源。

核心目标：

- 多个玩家在同一房间中实时同步。
- 服务端是唯一游戏事实写入者。
- 前端只提交意图，不直接改写资源、卡牌、分数或回合。
- MVP 先覆盖 Pokémon 版可玩闭环，不实现账号系统、公网匹配和持久化数据库；AI Agent 可作为后续房间玩家控制器接入。

## 分层

| 层 | 目录 | 职责 |
| --- | --- | --- |
| domain | `src/game/domain` | 卡牌、资源、玩家状态、进化、特殊卡区、行动校验与结算 |
| application | `src/game/application` | 房间创建、加入、开始、行动编排与广播事件 |
| infrastructure | `src/game/infrastructure` | WebSocket 房间广播 |
| delivery | `src/gateway/http` | HTTP API、静态资源、请求 DTO 映射 |
| dashboard | `frontend/dashboard` | 浏览器操作台，只通过 API/WS 读写 |

## 目标规则摘要

- 组件：普通精灵球 5 色各 7 个，大师球 5 个；卡牌共 90 张，其中 1 级 35 张、2 级 30 张、3 级 15 张、罕见 5 张、传说 5 张；另有人物卡 4 张、宝可梦图鉴 1 本和先手标记。
- 2 人/3 人游戏中，除大师球外每种普通精灵球分别移除 3 个/2 个。
- 开局：1-3 级牌堆各翻开 4 张；罕见牌堆和传说牌堆各翻开 1 张；从先手玩家开始顺时针各拿 1 张人物卡。
- 资源类型：普通 ball/token 与 Master Ball 类万能资源。当前代码仍使用 `fire`、`water`、`grass`、`electric`、`psychic` 和 `prism`，后续可按授权卡表映射为 Pokémon 版 token。
- 每回合主行动选择：
  - 拿 3 个不同普通 token。
  - 若普通 token 只剩 2 种可选，其中一种可以拿 2 个。
  - 拿 2 个同类普通 token，要求银行该类 token 在拿取前满足数量门槛。
  - 保留 1 张场上或 1-3 级牌堆顶卡，若有 Master Ball/prism 则获得 1 个；不能保留罕见或传说卡；最多保留 3 张。
  - 捕获/购买 1 张场上卡或保留卡；大师球视为任意普通 token；捕获罕见/传说卡时必须支付大师球。
- 每张已捕获卡提供永久 bonus，后续捕获同类费用降低。
- 主行动后按顺序执行：补充场上卡、公开弃掉超过 10 个的 token、可选执行 1 次进化、检查是否达到 18 分。
- Pokémon 版进化：1 级可进化为 2 级，2 级可进化为 3 级；罕见和传说不参与进化。进化不是主行动，每回合最多 1 次，可选择不进化。
- 进化要求：玩家拥有对应的前置 Pokémon，目标进化卡在场上或手牌中，且玩家拥有足够的 bonus 标记；只有卡牌 bonus 计入要求，不能用 token 代替；罕见和传说提供 2 个 bonus，并按 2 个计入进化要求。
- 进化结算：目标卡替代被进化卡，被进化卡放在人物卡下作为进化记录，其分数和 bonus 不再计入。若从场上拿目标卡，立即补牌。
- 终局：任一玩家达到或超过 18 分后触发公平轮，直到起始玩家右侧玩家完成回合后结束。
- 胜负：最高分获胜；若平局，进化记录较多者胜；若仍平局，面前拥有较多 Pokémon 的玩家胜。

## 多人同步

- HTTP action 成功后返回权威 `GameState`。
- WebSocket `/ws/rooms/:roomId` 广播 `room_state`。
- 客户端断线后可重新 `GET /v1/rooms/:roomId` 恢复。

## 展示主题与语言

- Dashboard 支持 `zh-CN` 与 `en-US` 展示语言。
- 主题资源以 `assets/splendor-monsters/themes/<theme-id>/` 分割，当前包含 `elemental-league`、`crystal-observatory` 与 `creature-academy`。
- `frontend/dashboard/src/presentation/themes.ts` 负责把服务端稳定 id 映射为语言文案和主题资源路径。
- `creature-academy` 是过渡展示主题。授权 Pokémon 主题接入后，可使用逐卡 Pokémon 素材、官方名称、属性和进化信息，但仍必须由服务端稳定 id 和领域卡表决定规则事实。
- `locale` 与 `themeId` 只影响显示，不改变服务端规则、卡牌 id、分数、回合或胜者。

## MVP 非目标

- 不提交授权合同、密钥或授权外官方素材。
- 不实现数据库持久化；进程重启后房间清空。
