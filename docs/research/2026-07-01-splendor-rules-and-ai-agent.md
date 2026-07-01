# 璀璨宝石规则骨架与 AI Agent 行动空间调研

- 日期：2026-07-01
- 范围：调研《璀璨宝石》公开规则骨架，判断本项目 AI Agent、卡牌“升级/进阶”与现有 MVP 规则的关系。

> 状态说明：本文记录原版 Splendor 规则骨架，只作为历史背景。当前项目规则基准已切换为授权 Pokémon 版，具体以 `docs/璀璨宝石宝可梦_简规.pdf` 和 `docs/璀璨宝石宝可梦_A4DIY_有皮卡丘_ver1201.pdf` 为准。

## 摘要结论

- 原版《璀璨宝石》的核心机制是资源管理与引擎构筑：玩家拿取资源、保留发展卡、购买发展卡，并通过已购买卡牌获得永久折扣，最终以声望分触发终局。
- 原版没有“已拥有卡牌满足条件后升级/进化为另一张卡”的独立机制。卡牌等级表示市场牌堆难度与价值梯度，不表示同一张卡的升级链。
- “满足条件自动获得”的原版对应机制是贵族访问：玩家拥有足够类型与数量的发展卡 bonus 后，在回合末获得贵族分数；贵族不是卡牌升级。
- AI Agent 的原子行动空间应以原版主动行动为基准：拿资源、保留卡、购买卡。被动结算如贵族访问、补牌、终局判断仍应由领域层自动处理。
- 若项目要引入“伙伴进化/卡片升级”，这不是原版 Splendor 基础规则；但它符合授权 Pokémon 版 Splendor 的目标方向，应显式建模为新领域规则，不能让模型自行解释或私下结算。

## 公开规则骨架

### 组件与设置

- 2-4 名玩家。
- 5 种普通资源 token 与 1 种万能 token。
- 发展卡分为 3 个等级牌堆，每个等级展示 4 张公开市场卡。
- 贵族数量通常按玩家数加一展示。
- 普通 token 数量随玩家数变化；万能 token 保持固定数量。

### 玩家主动行动

每回合玩家执行一个主动行动：

1. 拿普通资源。
   - 常见规则描述为拿 3 个不同普通资源，部分公开摘要写作 up to three。
   - 拿 2 个相同普通资源要求该资源堆在拿取前至少有足够数量，常见阈值为 4。
2. 保留发展卡。
   - 可保留公开市场卡。
   - 公开规则还允许从某个等级牌堆盲抽保留。
   - 保留上限为 3 张。
   - 若万能 token 仍可用，保留时获得 1 个万能 token。
3. 购买发展卡。
   - 可购买公开市场卡或自己的保留卡。
   - 已购买卡牌提供对应资源类型的永久折扣。
   - 支付后的 token 回到公共池。
   - 市场空位从对应等级牌堆补牌；牌堆耗尽则空位保持为空。

### 被动结算

- 回合末检查贵族条件；满足条件时玩家获得贵族。
- 若多个贵族同时满足，原版规则通常要求玩家选择 1 个；本项目当前 MVP 自动取第一个满足者。
- 玩家 token 持有上限为 10。原版通常允许行动后超过再弃回到 10；当前 Pokémon 版目标规则也采用行动后公开弃到 10。
- 任一玩家达到目标分数后触发终局，完成当前轮，让所有玩家回合数相同后结算。
- 平局常见处理为比较购买发展卡数量，较少者胜；仍平则共享胜利。不要在未核对官方规则前添加更多 tie-breaker。

## 与本项目的映射

| Splendor 规则概念 | 当前项目概念 | 当前状态 |
| --- | --- | --- |
| 普通 gem token | 元素能量 token | 已实现 |
| gold / joker token | prism / 万能棱晶 | 已实现 |
| development card | CompanionCard / 元素伙伴卡 | 已实现 |
| development card bonus | 永久元素徽章 / bonuses | 已实现 |
| noble tile | GymLeader / 道馆导师 | 已实现，自动选择第一个满足者 |
| reserve market card | 保留市场卡 | 已实现 |
| reserve blind deck card | 盲抽保留牌堆顶卡 | 未实现 |
| discard down to 10 after action | 超过 10 后弃资源 | Pokémon 版目标规则采用行动后公开弃到 10 |
| card level/tier | 卡牌等级 / tier | 已实现为市场牌堆等级 |
| card evolution/upgrade chain | 伙伴进化/卡片升级 | 原版无此机制，当前未实现 |

## 对 AI Agent 的设计影响

- 模型可以模拟用户操作，但 tool 必须只表达主动行动意图：`take_tokens`、`reserve_card`、`buy_card`。
- `playerId` 应由服务端注入，不应交给模型填写。
- 模型输入应包含精简 `GameState`、当前玩家视角、公开市场、银行 token、玩家资源、bonuses、reserved、score、导师条件、终局状态。
- tool handler 必须调用领域层 `applyGameAction` 结算。模型不得直接修改资源、卡牌、分数、导师或胜者。
- Pokémon 版目标规则需要支持牌堆顶保留与行动后弃资源流程。
- 若要加入 Pokémon 版“进化/升级”，建议作为新 `GameAction` 或回合内免费规则实现，并在文档中标记为 Pokémon 版规则，而不是原版 Splendor 基础规则。

## 风险与取舍

- IP 风险：不要复制官方卡牌数据、贵族名称、规则书原文、美术、图标或排版；只抽象使用公开规则结构。
- 规则一致性风险：公开二手资料对“拿 3 个不同资源”是否允许少于 3 个、平局 tie-breaker 等细节表述可能不完全一致；实现前应以官方规则书为准。
- 历史 MVP 简化风险：旧代码曾阻止超过 10 token、自动选择导师、不能盲抽保留。当前 Pokémon 版实现应改为 PDF 规则：行动后弃到 10、牌堆顶保留、回合末进化和特殊卡区。

## 来源

- [Splendor (game) - Wikipedia](https://en.wikipedia.org/wiki/Splendor_%28game%29)
- [Rinascimento: Optimising Statistical Forward Planning Agents for Playing Splendor](https://arxiv.org/abs/1904.01883)
- [Splendor (jeu de société) - Wikipedia](https://fr.wikipedia.org/wiki/Splendor_%28jeu_de_soci%C3%A9t%C3%A9%29)
