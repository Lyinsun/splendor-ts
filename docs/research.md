# 规则调研与主题边界

## 调研来源

- 《璀璨宝石》公开资料显示，游戏核心围绕资源、发展卡、永久 bonus 和声望分数展开；玩家购买卡牌获得永久折扣，达到指定分数触发终局。
- 2026-07-01 项目负责人确认本项目具备 Pokémon 相关授权。后续规则和内容基准切换为授权 Pokémon 版 Splendor，授权边界记录在 `docs/license-scope.md`。
- 本地授权资料已放入 `docs/璀璨宝石宝可梦_简规.pdf` 和 `docs/璀璨宝石宝可梦_A4DIY_有皮卡丘_ver1201.pdf`。前者作为规则流程来源，后者作为卡牌、token、图鉴板、人物卡和提示卡来源。
- 外部资料用于规则映射和实现设计。授权范围内可使用 Pokémon 名称、属性、进化链、卡牌信息和资产；授权范围外仍不复制规则书原文、卡牌数据或受保护美术。

## MVP 映射

| Splendor 概念 | Pokémon 版目标概念 |
| --- | --- |
| 宝石 token | ball/token |
| 黄金 token | Master Ball / prism |
| 发展卡 | Pokémon 卡 |
| 发展卡 bonus | 捕获 bonus / 类型 bonus |
| 贵族 | 稀有/传说/幻之特殊卡区 |
| 声望分 | 分数 / victory points |
| 牌堆等级 | Pokémon 阶段、稀有度和市场等级 |
| 无对应原版机制 | Pokémon 进化 |

## 设计判断

- 项目方向从原创抽象主题切换为授权 Pokémon 版规则实现。
- 元素类型、ball/token、Master Ball、进化链和特殊卡区应优先来自授权资料；缺口再由项目自定义规则补齐并标注。
- 第一版不实现网络匹配，先把多人房间与实时状态广播做扎实。
- `creature-academy` 当前保留为过渡主题；授权 Pokémon 主题接入时可替换为逐卡资源与官方显示信息。
- 服务端领域卡表必须成为 Pokémon 卡存在、费用、分数、bonus、进化和特殊卡区的唯一事实来源。
- 规则目标分为 18；平局先比较进化记录数量，再比较面前 Pokémon 数量。

## 来源

- [Splendor overview](https://en.wikipedia.org/wiki/Splendor_%28game%29)
- [Pokemon Trading Card Game overview](https://en.wikipedia.org/wiki/Pok%C3%A9mon_Trading_Card_Game)
- [Pokemon official site](https://www.pokemon.com/)
- [Pokemon TCG official site](https://tcg.pokemon.com/)
- [Pokémon 版 Splendor 机制调研](./research/2026-07-01-pokemon-splendor-variant.md)
- 本地资料：`docs/璀璨宝石宝可梦_简规.pdf`
- 本地资料：`docs/璀璨宝石宝可梦_A4DIY_有皮卡丘_ver1201.pdf`
