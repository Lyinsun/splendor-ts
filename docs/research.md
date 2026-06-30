# 规则调研与主题边界

## 调研来源

- 《璀璨宝石》公开资料显示，游戏核心围绕宝石资源、发展卡、贵族和声望分数展开；玩家购买卡牌获得永久折扣，达到指定分数触发终局。
- 宝可梦主题的可借鉴点只取“元素属性、伙伴收集、训练挑战”的抽象表达。项目不复制官方宝可梦名称、角色、图像、音效或商标化 UI。
- 外部资料只用于抽象规则映射和主题边界判断，不复制规则书原文、官方卡牌数据或受保护美术。

## MVP 映射

| Splendor 概念 | 本项目概念 |
| --- | --- |
| 宝石 token | 元素能量 |
| 黄金 token | 万能棱晶 |
| 发展卡 | 元素伙伴卡 |
| 发展卡 bonus | 元素徽章 |
| 贵族 | 道馆导师 |
| 声望分 | 荣耀分 |

## 设计判断

- 选择原创伙伴卡名和原创 hero 视觉，降低 IP 风险。
- 元素类型保留火、水、草、电、念力五类，便于玩家立即理解费用和折扣。
- 第一版不实现网络匹配，先把多人房间与实时状态广播做扎实。
- “宝可梦版”商业诉求在本仓库先落地为 `creature-academy` 原创主题：保留收集、属性、训练、进阶和徽章挑战的抽象体验，但不使用官方角色名、角色造型、Logo、卡面、音效或商标化文案。
- 卡牌插画采用元素/等级图集裁切：5 个属性列、3 个等级行，共 15 张卡图。MVP 阶段同属性同等级的多张伙伴卡复用一张插画；后续若需要更高美术密度，可在不改变服务端规则的前提下扩展为逐卡插画。

## 来源

- [Splendor overview](https://en.wikipedia.org/wiki/Splendor_%28game%29)
- [Pokemon Trading Card Game overview](https://en.wikipedia.org/wiki/Pok%C3%A9mon_Trading_Card_Game)
- [Pokemon official site](https://www.pokemon.com/)
- [Pokemon TCG official site](https://tcg.pokemon.com/)
