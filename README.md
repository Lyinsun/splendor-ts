# Splendor Monsters TS

一个 TypeScript 实现的多人线上对战 MVP：以《璀璨宝石》的资源、购买、保留、贵族拜访等核心机制为规则骨架，主题替换为原创“元素伙伴”训练营。项目避免使用官方宝可梦角色、名称或图片，所有视觉资源作为展示 metadata 使用。

## 环境要求

- Node.js 22
- npm

推荐通过 nvm 使用 Node 22：

```bash
source "$HOME/.nvm/nvm.sh" && nvm use 22
```

## 安装与启动

```bash
npm install
npm run build:dashboard
npm run start
```

也可以使用启动脚本：

```bash
./start.sh --foreground
./start.sh --port 19988
./start.sh --stop
```

默认监听 `127.0.0.1:19988`，页面入口：

| 路径 | 说明 |
| --- | --- |
| `/` | React 对战 Dashboard |
| `/healthz` | 健康检查 |
| `/v1/rooms` | 房间 API |
| `/ws/rooms/:roomId` | 房间实时广播 |

## 常用命令

```bash
npm run dev:server
npm run dev:dashboard
npm run build:dashboard
npm run typecheck
npm test
```

## MVP 范围

- 2-4 人房间、加入房间、演示对手补位
- 服务端权威结算：拿取资源、保留卡牌、购买卡牌、自动邀请道馆导师、终局判定
- WebSocket 房间广播，多个浏览器窗口可实时同步
- React + Vite Dashboard 操作界面
- 原创元素伙伴主题美术资源，保存在 `assets/splendor-monsters/`

## 规则边界

前端只提交玩家意图，不直接修改游戏事实。所有 token、卡牌、分数、回合与胜负都由 `src/game/domain` 规则和 `RoomService` 结算。
