# Pokémon 版 Splendor 机制调研

- 日期：2026-07-01
- 范围：调研公开网页中 Pokémon 主题 Splendor 版本的组件、规则差异与对本项目 AI Agent 行动空间的影响。

## 摘要结论

- 公开资料中确实存在名为 `Splendor: Pokémon Edition` / `스플렌더: Pokémon` 的韩国流通版本。
- 2026-07-01 用户提供了本地资料 `docs/璀璨宝石宝可梦_简规.pdf` 和 `docs/璀璨宝石宝可梦_A4DIY_有皮卡丘_ver1201.pdf`。后续项目规则以这两份本地授权资料为准。
- 该版本不是简单视觉换皮。除保留 Splendor 的拿 token、保留卡、购买卡核心循环外，它增加了 Pokémon 主题的两类机制：
  - 进化系统：当玩家已收集足够 bonus，并且下一阶段 Pokémon 卡在场上可见时，可以通过进化获得新卡。
  - 稀有/传说/幻之 Pokémon 区域：在 1/2/3 级牌之外，新增特殊卡区；获取这些卡需要 Master Ball，且可能提供更高 bonus 与分数。
- 至少一个玩家评论来源明确提到：进化“不作为一个行动处理”，且进化消耗/依赖已拥有 Pokémon，而不是消耗 token。
- 因此，如果本项目要模拟 Pokémon 版 Splendor 的规则感，AI Agent 的行动空间不能只覆盖 `take_tokens`、`reserve_card`、`buy_card`；还应考虑 `evolve_card`，并决定它是主动行动、免费触发，还是回合中附加操作。
- 2026-07-01 项目负责人确认本项目具备 Pokémon 相关授权。后续可在 `docs/license-scope.md` 记录的范围内使用 Pokémon 名称、进化链、卡牌数据和资产；授权范围外仍不可使用。

## 本地资料确认的规则

- 组件：普通精灵球 5 色各 7 个，大师球 5 个；卡牌共 90 张，其中 1 级 35 张、2 级 30 张、3 级 15 张、罕见 5 张、传说 5 张；另有人物卡 4 张、宝可梦图鉴 1 本和先手标记。
- 2 人/3 人游戏中，除大师球外每色普通精灵球分别移除 3 个/2 个。
- 场面：1/2/3 级各展示 4 张，罕见和传说各展示 1 张。
- 主行动：拿 3 个不同普通精灵球；拿 2 个相同普通精灵球且供应堆至少 4 个；保留场上或 1-3 级牌堆顶 1 张并尽量获得大师球；从场上或手牌支付费用打出 1 张 Pokémon。
- 保留限制：不能保留罕见/传说卡；最多保留 3 张；保留卡本身在结算时不计分。
- 大师球：可作为任意普通精灵球支付；捕获罕见/传说时必须支付大师球。
- 回合主行动后顺序：补充场上卡、公开弃掉超过 10 个的 token、可选执行 1 次进化、检查 18 分终局条件。
- 进化：不是主行动，回合末可选执行，最多 1 次；1 级进化到 2 级，2 级进化到 3 级；罕见和传说不参与进化。
- 进化要求：目标进化卡在场上或手牌中，玩家拥有对应前置 Pokémon，并且拥有足够 bonus 标记；token 不能代替进化要求；罕见和传说提供并计作 2 个 bonus。
- 进化结算：目标卡替代原卡；原卡压到人物卡下作为进化记录，不再计算分数和 bonus；若目标来自场上，立即补牌。
- 终局：达到或超过 18 分触发公平轮，到起始玩家右侧玩家完成回合后结束。最高分获胜；平局先比较进化记录数，再比较面前 Pokémon 数量。

## 公开资料中的机制

### 核心循环

Little Board Gamers 的评论将该版本描述为韩国进口的 Pokémon 主题 Splendor：玩家目标是收集达到 18 分以上的 Pokémon；桌面包含 1/2/3 级 Pokémon 行，以及传说和幻之 Pokémon 的特殊牌堆。玩家每回合可以拿不同 ball token、拿两个相同 token、保留展示区卡并获得 Master Ball，或从展示区捕获 Pokémon。

Joom 商品描述也称该版本保持 Splendor 的简单规则和策略骨架，并将发展卡替换为 Pokémon 卡、gem token 替换为 ball token，同时新增图鉴表和训练家板块。

### 进化系统

Joom 商品描述明确列出新增 `evolution` system：如果玩家已收集足够 bonus，并且下一等级 Pokémon 已揭示，可以通过进化先前捕获的 Pokémon 获得新 Pokémon。

韩国玩家评论进一步说明：

- 进化是与普通 Splendor 不同的新系统。
- 示例描述为：当自己 Pokémon 的某类 ball marker 达到 3 个以上时，可以进行进化。
- 该评论称进化不算作一个行动。
- 进化不是使用 token，而是需要对应已拥有 Pokémon。
- 进化让低价值卡也有价值，因为它们可能是后续进化链的基础。

### 稀有/传说/幻之区域

Joom 商品描述提到在 1/2/3 级卡以外增加 Rare、Legendary/Fantasy Pokémon，它们需要 Master Ball 获取，并且提供 `2` 个 bonus。

韩国玩家评论也提到：普通 Splendor 的贵族卡位置被稀有 Pokémon、传说 Pokémon 区域取代；因为 Master Ball 是捕获这些特殊 Pokémon 的必要条件，所以保留功能更常被使用。

### 组件数量

Joom 商品页列出组件为：

- 90 张 Pokémon cards。
- 1 张随机 hologram card。
- 4 块 trainer tiles。
- 1 个起始玩家标记。
- 1 张 Pokédex sheet。
- 40 个 ball tokens，其中 5 种普通 ball 各 7 个，Master Balls 5 个。

这些组件规模仍与 Splendor 原版的 90 张发展卡、40 个 token 框架接近，但新增了主题辅助物和特殊卡表现。

## 与本项目的映射建议

| Pokémon 版机制 | 本项目可映射为 | 是否建议进 MVP |
| --- | --- | --- |
| ball token | 普通球 token / capture token | 已进入 MVP |
| Master Ball | prism / 万能 token | 已进入 MVP，特殊卡强制支付 |
| 捕获 Pokémon | `buy_card` | 已进入 MVP |
| Pokémon bonus | 永久球种 marker / bonuses | 已进入 MVP，罕见/传说计 2 bonus |
| evolution | 主行动结算后的可选进化 | 已进入 MVP，每回合最多 1 次 |
| rare/legendary/fantasy card zone | `specialMarket` / `specialDecks` | 已进入 MVP，罕见/传说各展示 1 张 |
| trainer tile | 玩家训练家板 / tableau 分组展示 | 可先作为 UI 展示，不进规则 |
| Pokédex sheet | 收集图鉴 / card index | 可作为 UI 目标或图鉴，不应驱动规则 |

## 当前实现状态

- `src/game/domain/content.ts` 已按本地规则资料的组件规模落地 90 张卡：1 级 35 张、2 级 30 张、3 级 15 张、罕见 5 张、传说 5 张。
- 当前卡组是可玩的 Pokémon 版核心卡表：使用授权 Pokémon 名称、真实进化链和特殊卡区结构；费用、分值和 bonus 分配是工程先行的平衡版本，尚未逐张 OCR/人工校准为 PDF 原卡面数值。
- 实体 PDF 卡表存在同名宝可梦多张卡的情况。领域模型已支持唯一 `id` 加共享 `pokemonId`，并支持按源卡 `evolvesTo` 记录卡面进化要求；抽取过程记录在 `docs/research/2026-07-01-pokemon-card-extraction.md`。
- `applyGameAction` 仍是结算边界。进化不作为独立主行动暴露，而是作为 `take_tokens` / `reserve_card` / `buy_card` 的可选 `evolution` 参数，在主行动、补牌、弃球之后结算。
- 罕见和传说卡不能保留，只能从 `special_market` 捕获；捕获时需要 `prism`，并提供 2 个 bonus。
- Dashboard 已暴露主行动附加结算：玩家可以预选公开弃球、选择 1 次可选进化，也可以保留 1/2/3 级牌堆顶。前端只提交意图，合法性仍由领域层校验。
- `GET /v1/rooms/:roomId/players/:playerId/legal-actions` 已提供服务端合法行动枚举。枚举器会生成拿球、保留、购买、特殊购买、弃球和可选进化组合，并用 `applyGameAction` dry-run 过滤，保证返回项是服务端可结算的 `GameAction`。

## 对 AI Agent 的影响

AI Agent 的工具接口不需要让模型直接修改状态，也不需要单独暴露一个改变状态的 `evolve_card` 主行动。推荐工具层保持：

- `take_tokens`
- `reserve_card`
- `buy_card`

每个工具都允许携带可选 `evolution` 参数。这样可以表达 Pokémon 版“主行动后可选进化一次”的规则，同时避免模型把进化误当成额外主行动。

当前推荐 Agent 流程：

1. 拉取 `GameState`。
2. 调用 `GET /legal-actions` 获取当前玩家的 `LegalGameActionList`。
3. 把局面摘要和合法行动列表提交给模型。
4. 模型只选择列表中的一个 action id 或完整 `GameAction`。
5. 工具层提交该 `GameAction`；领域层仍会再次校验。

Agent 上下文需要包含：

- 当前 `market` 与 `specialMarket`。
- 玩家 `tableau`、`reserved`、`bonuses`、`tokens`、`evolutionRecords`。
- 服务端提供的合法行动枚举。

模型仍不能直接结算进化；只能提交主行动和可选进化意图，由领域层校验。

## 风险与取舍

- 公开资料主要来自商品页和玩家评论，未找到可稳定访问的官方规则书文本；规则细节应视为二手资料。
- Pokémon IP 使用以 `docs/license-scope.md` 为准。授权范围内可以进入代码和资源；授权范围外仍只能借鉴机制结构。
- 当前实现采取单次可选进化。若后续资料确认同回合可多次进化，需要重新评估回合结算和 AI 行动枚举复杂度。
- 当前 90 张卡的费用和分值未完成逐张 PDF 校准；如果要复刻实体卡，应从 `docs/璀璨宝石宝可梦_A4DIY_有皮卡丘_ver1201.pdf` 逐张抽取并替换当前工程平衡值。

## 来源

- [Splendor Pokémon - Little Board Gamers](https://littleboardgamers.com/splendor-pokemon/)
- [PoKéMoN Splendor Board Game - Joom](https://www.joom.com/en/products/65a0bfbada06b701934e0e8b)
- [초플 후기 01. 스플렌더 포켓몬 [3인플]](https://ullookmeeple.tistory.com/entry/%EC%B4%88%ED%94%8C-%ED%9B%84%EA%B8%B0-01-%EC%8A%A4%ED%94%8C%EB%A0%8C%EB%8D%94-%ED%8F%AC%EC%BC%93%EB%AA%AC-3%EC%9D%B8%ED%94%8C)
