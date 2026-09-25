# Splendor Monsters TS

一个 TypeScript 实现的多人线上对战 MVP：基于授权 Pokémon 版 Splendor-style 规则资料，覆盖拿球、保留、捕获、进化、特殊卡区、训练师人物和终局计分。服务端是唯一权威规则结算方，Dashboard 只提交玩家行动意图。

Pokémon 内容使用范围以 `docs/license-scope.md` 为准。本仓库只记录工程可执行的授权边界，不提交合同、密钥、授权证明或其他敏感材料。

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

写操作需要携带创建/加入房间时返回的席位令牌：`Authorization: Bearer <seatToken>`。完整接口与 WebSocket 协议见 [docs/模块设计/02-多人会话与多端同步.md](./docs/模块设计/02-多人会话与多端同步.md)。

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `SPLENDOR_HTTP_HOST` / `SPLENDOR_HTTP_PORT` | `127.0.0.1` / `19988` | 监听地址 |
| `SPLENDOR_PUBLIC_BASE_PATH` | 空 | 反向代理子路径，如 `/splendor` |
| `SPLENDOR_DB_PATH` | `data/splendor.db` | 房间快照 SQLite 文件 |
| `SPLENDOR_MAX_ROOMS` | `200` | 房间数上限 |
| `SPLENDOR_TURN_TIMEOUT_SEC` | `0`（关闭） | 回合超时后自动代打 |
| `SPLENDOR_DASHBOARD_DIST` | `dist/dashboard` | 前端产物目录，预发实例可指向独立构建 |

## 常用命令

```bash
npm run dev:server
npm run dev:dashboard
npm run build:dashboard
npm run typecheck
npm test
npm run workflow:all
```

交付流程见 [docs/交付工作流.md](./docs/交付工作流.md)。

## MVP 范围

- 2-4 人房间、加入房间、本地多席位演示
- 服务端权威结算：拿取资源、保留卡牌、捕获卡牌、进化、特殊卡区、自动邀请训练师人物、终局判定
- 席位令牌鉴权、防冒充；牌堆与他人盲保留对其他玩家隐藏
- WebSocket 按观察者推送状态与在线状态，多设备实时同步；席位链接可在另一设备续玩同一席位
- 离开 / 踢人 / 重开、pass、幂等行动、回合超时代打、空闲房间回收、SQLite 持久化
- React + Vite Dashboard 操作界面
- 授权 Pokémon 主题与原创过渡主题资源，保存在 `assets/splendor-monsters/`

## 规则边界

前端只提交玩家意图，不直接修改游戏事实。所有 token、卡牌、分数、回合与胜负都由 `src/game/domain` 规则和 `RoomService` 结算。
