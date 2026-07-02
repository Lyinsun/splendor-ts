import type { CardTier, CompanionCard, GameLogEntry, GameState, GymLeader, TokenKind } from '../api/types';
import { creatureAcademyLore } from './creatureAcademy';

export const LOCALES = ['zh-CN', 'en-US'] as const;
export type Locale = (typeof LOCALES)[number];

export const THEME_IDS = ['pokemon-splendor', 'elemental-league', 'crystal-observatory', 'creature-academy'] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export interface ThemeDefinition {
  id: ThemeId;
  className: string;
  label: Record<Locale, string>;
  description: Record<Locale, string>;
  defaultRoomName: Record<Locale, string>;
  assets: {
    hero: {
      src: string;
      alt: Record<Locale, string>;
    };
    cardArt?: {
      basePath: string;
      strategy: 'element-tier' | 'card-id';
      mode?: 'illustration' | 'card-face';
    };
  };
}

export const LOCALE_OPTIONS: Array<{ id: Locale; label: string }> = [
  { id: 'zh-CN', label: '中文' },
  { id: 'en-US', label: 'English' },
];

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  'pokemon-splendor': {
    id: 'pokemon-splendor',
    className: 'theme-pokemon-splendor',
    label: {
      'zh-CN': '宝可梦璀璨宝石',
      'en-US': 'Pokemon Splendor',
    },
    description: {
      'zh-CN': '以本地授权规则资料为准的宝可梦捕获、保留、进化与特殊卡区牌桌。',
      'en-US': 'A Pokemon table with capture, reserve, evolution, and special-card rows based on the local licensed rules.',
    },
    defaultRoomName: {
      'zh-CN': '宝可梦璀璨宝石牌桌',
      'en-US': 'Pokemon Splendor Table',
    },
    assets: {
      hero: {
        src: '/assets/splendor-monsters/themes/pokemon-splendor/arena-hero.png',
        alt: {
          'zh-CN': '宝可梦璀璨宝石卡牌预览',
          'en-US': 'Pokemon Splendor card preview',
        },
      },
      cardArt: {
        basePath: '/assets/splendor-monsters/themes/pokemon-splendor/cards',
        strategy: 'card-id',
        mode: 'card-face',
      },
    },
  },
  'elemental-league': {
    id: 'elemental-league',
    className: 'theme-elemental-league',
    label: {
      'zh-CN': '元素联盟',
      'en-US': 'Element League',
    },
    description: {
      'zh-CN': '宝石能量与原创元素伙伴的训练师牌桌。',
      'en-US': 'Gem energy and original elemental companions on a trainer table.',
    },
    defaultRoomName: {
      'zh-CN': '元素联盟牌桌',
      'en-US': 'Element League Table',
    },
    assets: {
      hero: {
        src: '/assets/splendor-monsters/themes/elemental-league/arena-hero.png',
        alt: {
          'zh-CN': '原创元素伙伴竞技场',
          'en-US': 'Original elemental companion arena',
        },
      },
    },
  },
  'crystal-observatory': {
    id: 'crystal-observatory',
    className: 'theme-crystal-observatory',
    label: {
      'zh-CN': '晶穹观测台',
      'en-US': 'Crystal Observatory',
    },
    description: {
      'zh-CN': '悬浮晶台、极光和元素灯塔构成的天空竞技场。',
      'en-US': 'A sky arena of floating crystal tables, auroras, and elemental lanterns.',
    },
    defaultRoomName: {
      'zh-CN': '晶穹观测台',
      'en-US': 'Crystal Observatory Table',
    },
    assets: {
      hero: {
        src: '/assets/splendor-monsters/themes/crystal-observatory/arena-hero.png',
        alt: {
          'zh-CN': '原创晶穹观测台竞技场',
          'en-US': 'Original crystal observatory arena',
        },
      },
    },
  },
  'creature-academy': {
    id: 'creature-academy',
    className: 'theme-creature-academy',
    label: {
      'zh-CN': '灵兽学院',
      'en-US': 'Creature Academy',
    },
    description: {
      'zh-CN': '原创元素灵兽、属性训练场与徽章挑战构成的收集主题。',
      'en-US': 'An original collectible-creature theme with elemental training halls and badge challenges.',
    },
    defaultRoomName: {
      'zh-CN': '灵兽学院牌桌',
      'en-US': 'Creature Academy Table',
    },
    assets: {
      hero: {
        src: '/assets/splendor-monsters/themes/creature-academy/arena-hero.png',
        alt: {
          'zh-CN': '原创灵兽学院元素竞技场',
          'en-US': 'Original creature academy elemental arena',
        },
      },
      cardArt: {
        basePath: '/assets/splendor-monsters/themes/creature-academy/cards',
        strategy: 'element-tier',
      },
    },
  },
};

export const THEME_OPTIONS = THEME_IDS.map((id) => THEMES[id]);

export const TOKEN_PRESENTATION: Record<TokenKind, { className: string; label: Record<Locale, string>; shortLabel: Record<Locale, string> }> = {
  fire: {
    className: 'token-fire',
    label: { 'zh-CN': '精灵球', 'en-US': 'Poke Ball' },
    shortLabel: { 'zh-CN': '精', 'en-US': 'P' },
  },
  water: {
    className: 'token-water',
    label: { 'zh-CN': '超级球', 'en-US': 'Great Ball' },
    shortLabel: { 'zh-CN': '超', 'en-US': 'G' },
  },
  grass: {
    className: 'token-grass',
    label: { 'zh-CN': '高级球', 'en-US': 'Ultra Ball' },
    shortLabel: { 'zh-CN': '高', 'en-US': 'U' },
  },
  electric: {
    className: 'token-electric',
    label: { 'zh-CN': '先机球', 'en-US': 'Quick Ball' },
    shortLabel: { 'zh-CN': '先', 'en-US': 'Q' },
  },
  psychic: {
    className: 'token-psychic',
    label: { 'zh-CN': '治愈球', 'en-US': 'Heal Ball' },
    shortLabel: { 'zh-CN': '愈', 'en-US': 'H' },
  },
  prism: {
    className: 'token-prism',
    label: { 'zh-CN': '大师球', 'en-US': 'Master Ball' },
    shortLabel: { 'zh-CN': '大', 'en-US': 'M' },
  },
};

export const APP_COPY = {
  'zh-CN': {
    appTitle: '宝可梦璀璨宝石',
    appSubtitle: 'TypeScript 多人 MVP',
    languageLabel: '语言',
    themeLabel: '主题',
    refreshRooms: '刷新房间',
    liveSync: '实时同步',
    offlineSync: '同步离线',
    noRoomStatus: '未入座',
    heroEyebrow: '宝可梦训练师桌',
    noRoomTitle: '创建或加入训练师牌桌',
    noRoomDescription: '房间保存在当前运行的本地服务中。打开第二个浏览器窗口即可作为另一位训练师加入。',
    finalRound: '终局轮',
    trainerSeat: '训练师席位',
    nameLabel: '名称',
    roomLabel: '房间',
    createRoom: '创建房间',
    openRooms: '开放房间',
    noRooms: '暂无房间。',
    join: '加入',
    trainers: '训练师',
    controlSeat: '控制席位',
    copyRoom: '复制房间',
    leave: '离开',
    demoRival: '添加本地玩家',
    start: '开始',
    winner: '胜者',
    currentTurn: '当前回合',
    yourMove: '可操作',
    watching: '等待中',
    energyBank: '精灵球供应',
    noEnergySelected: '未选择精灵球',
    clear: '清空',
    takeEnergy: '拿取',
    tokenTakeProblems: {
      busy: '正在结算上一项操作，请稍后再试。',
      notPlaying: '房间还没有进入进行中，暂时不能拿球。',
      notCurrentTurn: '当前不是控制席位的回合，不能拿球。',
      emptySelection: '请先选择要拿取的精灵球。',
      cannotTakePrism: '大师球不能直接拿取，只能通过保留卡获得。',
      invalidPattern: '拿球组合不合法：请选择三种不同精灵球，或两枚相同精灵球。',
      pairRequiresFour: '拿两枚相同精灵球时，银行里该球至少需要剩余 4 枚。',
      bankTokenEmpty: (token: string) => `${token} 剩余数量不足，不能按当前组合拿取。`,
      tokenDiscardRequired: (count: number) => `拿取后会超过 10 枚，请先在回合结算区选择 ${count} 枚要公开弃掉的球。`,
      serverTokenDiscardRequired: (message: string) => `拿取后会超过 10 枚，需要先补充弃球选择。${message}`,
      invalidTokenDiscard: (token: string) => `弃球中包含拿取后仍不存在的 ${token}，请调整弃球选择。`,
      invalidDiscard: '弃球选择不符合当前持有和本次拿取结果，请调整后再拿取。',
      unexpectedTokenDiscard: '当前不会超过 10 枚，不需要选择弃球。',
      thatToken: '该精灵球',
      serverFailure: (message: string) => `拿球失败：${message}`,
    },
    settlement: '回合结算',
    discardTokens: '弃球',
    optionalEvolution: '可选进化',
    noEvolution: '不进化',
    reserveDeck: '保留牌堆顶',
    deck: '牌堆',
    open: '公开',
    tier: '等级',
    specialCards: '特殊卡区',
    specialRank: {
      rare: '罕见',
      legendary: '传说',
    } satisfies Record<'rare' | 'legendary', string>,
    gymMentors: '训练师人物',
    yourReserve: '控制席位保留区',
    noReserved: '没有保留的伙伴。',
    battleLog: '战斗日志',
    buy: '购买',
    reserve: '保留',
    glory: '分',
    evolutions: '进化记录',
    pokemonInPlay: '在场宝可梦',
    you: '你',
    controlled: '控制中',
    localSeat: '本地',
    turn: '回合',
    roomStatus: {
      lobby: '等待中',
      playing: '进行中',
      finished: '已结束',
    } satisfies Record<GameState['status'], string>,
    roomMeta: (players: number, round: number, turn: number) => `${players} 位训练师 · 第 ${round} 轮 · 第 ${turn} 回合`,
    playerCount: (players: number, maxPlayers: number, status: GameState['status']) => `${players}/${maxPlayers} 位训练师 · ${APP_COPY['zh-CN'].roomStatus[status]}`,
    help: '帮助',
    helpTitle: '游戏帮助',
    helpTabs: {
      quickStart: '新手指引',
      rules: '游戏规则',
      uiGuide: '界面说明',
      faq: '常见问题',
    },
    closeHelp: '关闭',
    dontShowAgain: '不再自动显示',
    quickStart: {
      intro: '欢迎来到宝可梦璀璨宝石！以下三步带你快速上手：',
      steps: [
        {
          title: '第 1 步：创建或加入房间',
          body: '在大厅输入你的训练师名称和房间名，点击「创建房间」。如果已有房间，直接在右侧列表点击「加入」。',
        },
        {
          title: '第 2 步：开始游戏',
          body: '房主可以点击「添加本地玩家」加入 AI 对手，或邀请朋友在另一个浏览器窗口加入房间。至少 2 位玩家后，点击「开始」进入游戏。',
        },
        {
          title: '第 3 步：进行回合',
          body: '轮到你时，可以从精灵球供应区拿球、保留卡牌或捕获卡牌。目标是通过捕获宝可梦和获得训练师徽章来积累分数，率先达到 18 分触发终局轮！',
        },
      ],
      tip: '提示：拿球时可以选择 3 种不同精灵球，或 2 枚相同精灵球（银行需剩余 ≥ 4 枚）。',
    },
    rules: {
      sections: [
        {
          title: '精灵球种类',
          items: [
            { name: '精灵球（火）', desc: '红色基础资源，用于捕获火属性宝可梦。' },
            { name: '超级球（水）', desc: '蓝色基础资源，用于捕获水属性宝可梦。' },
            { name: '高级球（草）', desc: '绿色基础资源，用于捕获草属性宝可梦。' },
            { name: '先机球（电）', desc: '黄色基础资源，用于捕获电属性宝可梦。' },
            { name: '治愈球（超能力）', desc: '粉色基础资源，用于捕获超能力属性宝可梦。' },
            { name: '大师球', desc: '万能资源，可代替任意属性支付。保留卡牌时获得 1 枚。' },
          ],
        },
        {
          title: '回合行动（每回合选其一）',
          items: [
            { name: '拿取精灵球', desc: '从银行拿取精灵球。可选 3 种不同球，或 2 枚相同球（银行该球需 ≥ 4 枚）。拿球后总数不能超过 10 枚，超出需弃球。' },
            { name: '保留卡牌', desc: '从市场或牌堆顶保留一张卡牌到保留区，同时获得 1 枚大师球（如果银行还有）。最多保留 3 张。' },
            { name: '捕获卡牌', desc: '支付卡牌费用（可用已捕获宝可梦的属性加成抵扣），将其加入队伍。特殊卡需要大师球。' },
          ],
        },
        {
          title: '进化机制',
          items: [
            { name: '进化条件', desc: '回合结束时，如果你已捕获的宝可梦满足进化的属性加成要求，可以选择将其进化为更高阶段的卡牌。' },
            { name: '进化效果', desc: '进化后的卡牌替换原卡，原卡的分数和属性加成不再计入，但进化记录可在平局时作为判定依据。' },
          ],
        },
        {
          title: '特殊卡区',
          items: [
            { name: '罕见卡', desc: 'Eevee、Snorlax 等，0 分但提供 2 点属性加成，捕获需要 1 枚大师球。' },
            { name: '传说卡', desc: 'Mewtwo、闪电鸟等，2 分 + 2 点属性加成，捕获需要 1 枚大师球。' },
          ],
        },
        {
          title: '训练师徽章',
          items: [
            { name: '自动获得', desc: '当你的属性加成满足训练师人物的要求时，该训练师自动加入你的队伍并提供额外分数。' },
          ],
        },
        {
          title: '终局与胜负',
          items: [
            { name: '终局轮触发', desc: '任意玩家分数达到 18 分时，当前回合结束后进入终局轮。所有玩家再进行最后一个回合。' },
            { name: '胜负判定', desc: '终局轮结束后分数最高者获胜。平局时依次比较：进化记录数 → 在场宝可梦数量。' },
          ],
        },
      ],
    },
    uiGuide: {
      sections: [
        { title: '精灵球供应', desc: '左侧面板。点击精灵球按钮选择要拿取的组合，然后点击「拿取」按钮执行。大师球不能直接拿取。' },
        { title: '回合结算', desc: '精灵球供应下方。如果拿球后超过 10 枚，需要在此选择要弃掉的球。还可以选择是否进行进化。' },
        { title: '卡牌市场', desc: '中央区域。按等级 1/2/3 排列，每行 4 张公开卡 + 牌堆。点击「保留」或「购买」操作卡牌。' },
        { title: '特殊卡区', desc: '右侧上方。罕见和传说卡各展示 1 张，需要大师球才能捕获。' },
        { title: '训练师人物', desc: '右侧下方。展示当前可获得的训练师徽章及其属性要求。' },
        { title: '保留区与战斗日志', desc: '最右侧面板。显示你保留的卡牌（可购买）和最近的战斗行动记录。' },
        { title: '训练师列表', desc: '左侧面板。显示所有玩家的分数、属性加成、精灵球数量和进化记录。当前回合玩家有金色边框。' },
        { title: '控制席位', desc: '在本地多人模式下，你可以通过下拉菜单切换控制哪个玩家的回合。' },
      ],
    },
    faq: {
      items: [
        { q: '为什么操作按钮是灰色的？', a: '按钮灰色表示当前不可操作。可能原因：1) 不是你的回合；2) 游戏还没开始或已结束；3) 正在结算上一个操作。' },
        { q: '怎么获得大师球？', a: '大师球只能通过保留卡牌获得。每次保留一张卡牌时，如果银行还有大师球，你会获得 1 枚。' },
        { q: '拿球后超过 10 枚怎么办？', a: '在「回合结算」区域选择要弃掉的精灵球，选够数量后再点击「拿取」按钮。' },
        { q: '为什么我不能买这张卡？', a: '检查你是否有足够的精灵球（含属性加成抵扣）。特殊卡（罕见/传说）还额外需要 1 枚大师球。' },
        { q: '属性加成有什么用？', a: '每捕获一张宝可梦卡，你会获得对应属性的永久加成。购买卡牌时，加成可以抵扣对应属性的费用。' },
        { q: '保留卡牌有上限吗？', a: '最多保留 3 张卡牌。保留区的卡牌可以随时购买。' },
        { q: '怎么和朋友一起玩？', a: '创建房间后，让朋友在同一网络下访问同一个地址（默认端口 19988），在房间列表中加入即可。' },
        { q: '终局轮是什么？', a: '当任意玩家达到 18 分时触发。当前回合结束后，所有玩家再进行最后一个回合，然后结算胜负。' },
      ],
    },
  },
  'en-US': {
    appTitle: 'Pokemon Splendor',
    appSubtitle: 'TypeScript multiplayer MVP',
    languageLabel: 'Language',
    themeLabel: 'Theme',
    refreshRooms: 'Refresh rooms',
    liveSync: 'Live sync',
    offlineSync: 'Offline sync',
    noRoomStatus: 'no room',
    heroEyebrow: 'Pokemon trainer table',
    noRoomTitle: 'Create or join a trainer table',
    noRoomDescription: 'Rooms are local to this running server. Open another browser window to join as a second trainer.',
    finalRound: 'Final round',
    trainerSeat: 'Trainer seat',
    nameLabel: 'Name',
    roomLabel: 'Room',
    createRoom: 'Create room',
    openRooms: 'Open rooms',
    noRooms: 'No rooms yet.',
    join: 'Join',
    trainers: 'Trainers',
    controlSeat: 'Control seat',
    copyRoom: 'Copy room',
    leave: 'Leave',
    demoRival: 'Add local player',
    start: 'Start',
    winner: 'Winner',
    currentTurn: 'Current turn',
    yourMove: 'Playable',
    watching: 'Waiting',
    energyBank: 'Ball supply',
    noEnergySelected: 'No ball selected',
    clear: 'Clear',
    takeEnergy: 'Take',
    tokenTakeProblems: {
      busy: 'The previous action is still settling. Try again shortly.',
      notPlaying: 'The room is not playing yet, so balls cannot be taken.',
      notCurrentTurn: 'It is not the controlled seat turn.',
      emptySelection: 'Select balls before taking them.',
      cannotTakePrism: 'Master Balls cannot be taken directly; reserve a card to gain one.',
      invalidPattern: 'Invalid take: choose three different balls or two matching balls.',
      pairRequiresFour: 'Taking two matching balls requires at least four of that ball in the bank.',
      bankTokenEmpty: (token: string) => `Not enough ${token} remain in the bank for this take.`,
      tokenDiscardRequired: (count: number) => `This take would exceed 10 balls. Choose ${count} ball(s) to discard in turn settlement first.`,
      serverTokenDiscardRequired: (message: string) => `This take would exceed 10 balls. Add the required discard selection first. ${message}`,
      invalidTokenDiscard: (token: string) => `The discard selection includes ${token} that will not be available after this take.`,
      invalidDiscard: 'The discard selection does not match the current holding and this take.',
      unexpectedTokenDiscard: 'This action will not exceed 10 balls, so no discard is needed.',
      thatToken: 'that ball',
      serverFailure: (message: string) => `Take failed: ${message}`,
    },
    settlement: 'Turn settlement',
    discardTokens: 'Discard',
    optionalEvolution: 'Optional evolution',
    noEvolution: 'No evolution',
    reserveDeck: 'Reserve deck top',
    deck: 'deck',
    open: 'open',
    tier: 'Tier',
    specialCards: 'Special cards',
    specialRank: {
      rare: 'Rare',
      legendary: 'Legendary',
    } satisfies Record<'rare' | 'legendary', string>,
    gymMentors: 'Trainer tiles',
    yourReserve: 'Controlled reserve',
    noReserved: 'No reserved companions.',
    battleLog: 'Battle log',
    buy: 'Buy',
    reserve: 'Reserve',
    glory: 'points',
    evolutions: 'Evolutions',
    pokemonInPlay: 'Pokemon in play',
    you: 'you',
    controlled: 'controlled',
    localSeat: 'local',
    turn: 'Turn',
    roomStatus: {
      lobby: 'lobby',
      playing: 'playing',
      finished: 'finished',
    } satisfies Record<GameState['status'], string>,
    roomMeta: (players: number, round: number, turn: number) => `${players} trainers · round ${round} · turn ${turn}`,
    playerCount: (players: number, maxPlayers: number, status: GameState['status']) => `${players}/${maxPlayers} trainers · ${APP_COPY['en-US'].roomStatus[status]}`,
    help: 'Help',
    helpTitle: 'Game Help',
    helpTabs: {
      quickStart: 'Quick Start',
      rules: 'Game Rules',
      uiGuide: 'UI Guide',
      faq: 'FAQ',
    },
    closeHelp: 'Close',
    dontShowAgain: "Don't show again",
    quickStart: {
      intro: 'Welcome to Pokemon Splendor! Get started in three steps:',
      steps: [
        {
          title: 'Step 1: Create or join a room',
          body: 'Enter your trainer name and a room name, then click "Create room". If a room already exists, click "Join" in the list on the right.',
        },
        {
          title: 'Step 2: Start the game',
          body: 'The host can click "Add local player" to add an AI opponent, or invite a friend to join from another browser window. With at least 2 players, click "Start" to begin.',
        },
        {
          title: 'Step 3: Take your turn',
          body: 'On your turn, take balls from the supply, reserve a card, or capture a card. The goal is to reach 18 points by capturing Pokemon and earning trainer badges to trigger the final round!',
        },
      ],
      tip: 'Tip: When taking balls, choose 3 different kinds or 2 of the same kind (requires ≥ 4 of that ball in the bank).',
    },
    rules: {
      sections: [
        {
          title: 'Ball Types',
          items: [
            { name: 'Poke Ball (Fire)', desc: 'Red basic resource. Used to capture Fire-type Pokemon.' },
            { name: 'Great Ball (Water)', desc: 'Blue basic resource. Used to capture Water-type Pokemon.' },
            { name: 'Ultra Ball (Grass)', desc: 'Green basic resource. Used to capture Grass-type Pokemon.' },
            { name: 'Quick Ball (Electric)', desc: 'Yellow basic resource. Used to capture Electric-type Pokemon.' },
            { name: 'Heal Ball (Psychic)', desc: 'Pink basic resource. Used to capture Psychic-type Pokemon.' },
            { name: 'Master Ball', desc: 'Wildcard resource that pays for any element. Gain 1 by reserving a card.' },
          ],
        },
        {
          title: 'Turn Actions (choose one per turn)',
          items: [
            { name: 'Take Balls', desc: 'Take balls from the bank. Choose 3 different kinds, or 2 of the same kind (bank must have ≥ 4 of that ball). Total cannot exceed 10; discard excess in settlement.' },
            { name: 'Reserve Card', desc: 'Reserve a card from the market or deck top to your reserve area. Gain 1 Master Ball if available. Max 3 reserved.' },
            { name: 'Capture Card', desc: 'Pay the card cost (bonuses from captured Pokemon reduce the cost) and add it to your team. Special cards require a Master Ball.' },
          ],
        },
        {
          title: 'Evolution',
          items: [
            { name: 'Evolution Requirement', desc: 'At end of turn, if a captured Pokemon meets the element bonus requirement of its evolution target, you may evolve it.' },
            { name: 'Evolution Effect', desc: 'The evolved card replaces the source. The source card\'s points and bonuses no longer count, but the evolution record helps break ties.' },
          ],
        },
        {
          title: 'Special Cards',
          items: [
            { name: 'Rare', desc: 'Eevee, Snorlax, etc. 0 points but +2 element bonus. Requires 1 Master Ball to capture.' },
            { name: 'Legendary', desc: 'Mewtwo, Moltres, etc. 2 points + 2 element bonus. Requires 1 Master Ball to capture.' },
          ],
        },
        {
          title: 'Trainer Badges',
          items: [
            { name: 'Auto-Award', desc: 'When your element bonuses meet a Gym Leader\'s requirement, they automatically join your team and add points.' },
          ],
        },
        {
          title: 'End Game & Winning',
          items: [
            { name: 'Final Round Trigger', desc: 'When any player reaches 18 points, the current round ends and the final round begins. All players get one last turn.' },
            { name: 'Tiebreakers', desc: 'Highest score wins. Ties broken by: most evolution records → most Pokemon in play.' },
          ],
        },
      ],
    },
    uiGuide: {
      sections: [
        { title: 'Ball Supply', desc: 'Left panel. Click ball buttons to select your take combination, then click "Take". Master Balls cannot be taken directly.' },
        { title: 'Turn Settlement', desc: 'Below the ball supply. If taking would exceed 10 balls, select which to discard here. You may also choose an evolution.' },
        { title: 'Card Market', desc: 'Center area. Tiers 1/2/3 each show 4 face-up cards plus a deck. Click "Reserve" or "Buy" on a card.' },
        { title: 'Special Cards', desc: 'Upper right. Rare and Legendary cards each show 1 face-up. Requires a Master Ball to capture.' },
        { title: 'Trainer Tiles', desc: 'Lower right. Shows available Gym Leader badges and their element requirements.' },
        { title: 'Reserve & Battle Log', desc: 'Rightmost panel. Shows your reserved cards (buyable) and recent battle action records.' },
        { title: 'Trainer List', desc: 'Left panel. Shows all players\' scores, bonuses, ball counts, and evolution records. The active turn player has a gold border.' },
        { title: 'Control Seat', desc: 'In local multi-seat mode, switch which player you control via the dropdown.' },
      ],
    },
    faq: {
      items: [
        { q: 'Why are the action buttons grayed out?', a: 'Buttons are disabled when: 1) It\'s not your turn; 2) The game hasn\'t started or has ended; 3) The previous action is still settling.' },
        { q: 'How do I get Master Balls?', a: 'Master Balls are only obtained by reserving cards. Each time you reserve a card, you gain 1 Master Ball if any remain in the bank.' },
        { q: 'What if I exceed 10 balls after taking?', a: 'Select the balls to discard in the "Turn Settlement" area, then click "Take" once the required number is selected.' },
        { q: 'Why can\'t I buy this card?', a: 'Check if you have enough balls (including element bonus deductions). Special cards (Rare/Legendary) also require 1 Master Ball.' },
        { q: 'What do element bonuses do?', a: 'Each captured Pokemon gives a permanent element bonus. When buying cards, bonuses reduce the cost of matching elements.' },
        { q: 'Is there a limit on reserved cards?', a: 'You can reserve up to 3 cards. Reserved cards can be purchased at any time on your turn.' },
        { q: 'How do I play with friends?', a: 'Create a room and have your friend visit the same address (default port 19988) on the same network. They can join from the room list.' },
        { q: 'What is the final round?', a: 'Triggered when any player reaches 18 points. After the current turn ends, all players get one last turn before scoring determines the winner.' },
      ],
    },
  },
} as const;

const ZH_CARD_COPY: Partial<Record<string, { name: string; species: string }>> = {
  charmander: { name: '小火龙', species: '火蜥蜴宝可梦' },
  dratini: { name: '迷你龙', species: '龙宝可梦' },
  dragonair: { name: '哈克龙', species: '龙宝可梦' },
  vulpix: { name: '六尾', species: '狐狸宝可梦' },
  growlithe: { name: '卡蒂狗', species: '小狗宝可梦' },
  ponyta: { name: '小火马', species: '火马宝可梦' },
  machop: { name: '腕力', species: '怪力宝可梦' },
  geodude: { name: '小拳石', species: '岩石宝可梦' },
  koffing: { name: '瓦斯弹', species: '毒气宝可梦' },
  squirtle: { name: '杰尼龟', species: '小龟宝可梦' },
  poliwag: { name: '蚊香蝌蚪', species: '蝌蚪宝可梦' },
  horsea: { name: '墨海马', species: '龙宝可梦' },
  psyduck: { name: '可达鸭', species: '鸭宝可梦' },
  slowpoke: { name: '呆呆兽', species: '憨憨宝可梦' },
  shellder: { name: '大舌贝', species: '双壳贝宝可梦' },
  seel: { name: '小海狮', species: '海狮宝可梦' },
  bulbasaur: { name: '妙蛙种子', species: '种子宝可梦' },
  oddish: { name: '走路草', species: '杂草宝可梦' },
  bellsprout: { name: '喇叭芽', species: '花宝可梦' },
  caterpie: { name: '绿毛虫', species: '虫宝宝可梦' },
  metapod: { name: '铁甲蛹', species: '蛹宝可梦' },
  weedle: { name: '独角虫', species: '毛毛虫宝可梦' },
  kakuna: { name: '铁壳蛹', species: '蛹宝可梦' },
  exeggcute: { name: '蛋蛋', species: '蛋宝可梦' },
  cubone: { name: '卡拉卡拉', species: '孤独宝可梦' },
  pikachu: { name: '皮卡丘', species: '鼠宝可梦' },
  magnemite: { name: '小磁怪', species: '磁铁宝可梦' },
  voltorb: { name: '霹雳电球', species: '球宝可梦' },
  'nidoran-f': { name: '尼多兰', species: '毒针宝可梦' },
  'nidoran-m': { name: '尼多朗', species: '毒针宝可梦' },
  pidgey: { name: '波波', species: '小鸟宝可梦' },
  doduo: { name: '嘟嘟', species: '两头鸟宝可梦' },
  abra: { name: '凯西', species: '念力宝可梦' },
  gastly: { name: '鬼斯', species: '气体宝可梦' },
  zubat: { name: '超音蝠', species: '蝙蝠宝可梦' },
  drowzee: { name: '催眠貘', species: '催眠宝可梦' },
  krabby: { name: '大钳蟹', species: '河蟹宝可梦' },
  rhyhorn: { name: '独角犀牛', species: '尖尖宝可梦' },
  tentacool: { name: '玛瑙水母', species: '水母宝可梦' },
  charmeleon: { name: '火恐龙', species: '火焰宝可梦' },
  ninetales: { name: '九尾', species: '狐狸宝可梦' },
  arcanine: { name: '风速狗', species: '传说宝可梦' },
  rapidash: { name: '烈焰马', species: '火马宝可梦' },
  machoke: { name: '豪力', species: '怪力宝可梦' },
  graveler: { name: '隆隆石', species: '岩石宝可梦' },
  weezing: { name: '双弹瓦斯', species: '毒气宝可梦' },
  wartortle: { name: '卡咪龟', species: '龟宝可梦' },
  poliwhirl: { name: '蚊香君', species: '蝌蚪宝可梦' },
  seadra: { name: '海刺龙', species: '龙宝可梦' },
  golduck: { name: '哥达鸭', species: '鸭宝可梦' },
  slowbro: { name: '呆壳兽', species: '寄居蟹宝可梦' },
  cloyster: { name: '刺甲贝', species: '双壳贝宝可梦' },
  dewgong: { name: '白海狮', species: '海狮宝可梦' },
  ivysaur: { name: '妙蛙草', species: '种子宝可梦' },
  gloom: { name: '臭臭花', species: '杂草宝可梦' },
  weepinbell: { name: '口呆花', species: '捕蝇宝可梦' },
  butterfree: { name: '巴大蝶', species: '蝴蝶宝可梦' },
  beedrill: { name: '大针蜂', species: '毒蜂宝可梦' },
  exeggutor: { name: '椰蛋树', species: '椰子宝可梦' },
  marowak: { name: '嘎啦嘎啦', species: '爱骨宝可梦' },
  raichu: { name: '雷丘', species: '鼠宝可梦' },
  magneton: { name: '三合一磁怪', species: '磁铁宝可梦' },
  electrode: { name: '顽皮雷弹', species: '球宝可梦' },
  nidorina: { name: '尼多娜', species: '毒针宝可梦' },
  nidorino: { name: '尼多力诺', species: '毒针宝可梦' },
  pidgeotto: { name: '比比鸟', species: '鸟宝可梦' },
  dodrio: { name: '嘟嘟利', species: '三头鸟宝可梦' },
  kadabra: { name: '勇基拉', species: '念力宝可梦' },
  haunter: { name: '鬼斯通', species: '气体宝可梦' },
  charizard: { name: '喷火龙', species: '火焰宝可梦' },
  machamp: { name: '怪力', species: '怪力宝可梦' },
  golem: { name: '隆隆岩', species: '重量级宝可梦' },
  blastoise: { name: '水箭龟', species: '甲壳宝可梦' },
  poliwrath: { name: '蚊香泳士', species: '蝌蚪宝可梦' },
  gyarados: { name: '暴鲤龙', species: '凶恶宝可梦' },
  venusaur: { name: '妙蛙花', species: '种子宝可梦' },
  vileplume: { name: '霸王花', species: '花宝可梦' },
  victreebel: { name: '大食花', species: '捕蝇宝可梦' },
  nidoqueen: { name: '尼多后', species: '钻锥宝可梦' },
  nidoking: { name: '尼多王', species: '钻锥宝可梦' },
  pidgeot: { name: '大比鸟', species: '鸟宝可梦' },
  alakazam: { name: '胡地', species: '念力宝可梦' },
  gengar: { name: '耿鬼', species: '影子宝可梦' },
  dragonite: { name: '快龙', species: '龙宝可梦' },
  eevee: { name: '伊布', species: '进化宝可梦' },
  snorlax: { name: '卡比兽', species: '瞌睡宝可梦' },
  ditto: { name: '百变怪', species: '变身宝可梦' },
  lapras: { name: '拉普拉斯', species: '乘载宝可梦' },
  aerodactyl: { name: '化石翼龙', species: '化石宝可梦' },
  mewtwo: { name: '超梦', species: '基因宝可梦' },
  mew: { name: '梦幻', species: '新种宝可梦' },
  zapdos: { name: '闪电鸟', species: '电击宝可梦' },
  moltres: { name: '火焰鸟', species: '火焰宝可梦' },
  articuno: { name: '急冻鸟', species: '冰冻宝可梦' },
};

const ZH_LEADER_COPY: Partial<Record<string, string>> = {
  'leader-flare': '焰光导师',
  'leader-tide': '潮汐导师',
  'leader-grove': '林冠导师',
  'leader-storm': '风暴导师',
  'leader-oracle': '预言导师',
  'leader-prism': '棱晶导师',
};

const CARD_TIER_COPY: Record<CardTier, Record<Locale, string>> = {
  1: { 'zh-CN': '初阶', 'en-US': 'Novice' },
  2: { 'zh-CN': '进阶', 'en-US': 'Evolved' },
  3: { 'zh-CN': '巅峰', 'en-US': 'Apex' },
};

export function browserDefaultLocale(): Locale {
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en-US';
}

export function normalizeLocale(value: string | null | undefined, fallback: Locale): Locale {
  return LOCALES.includes(value as Locale) ? (value as Locale) : fallback;
}

export function normalizeThemeId(value: string | null | undefined): ThemeId {
  return THEME_IDS.includes(value as ThemeId) ? (value as ThemeId) : 'pokemon-splendor';
}

export function tokenLabel(token: TokenKind, locale: Locale): string {
  return TOKEN_PRESENTATION[token].label[locale];
}

export function tokenClassName(token: TokenKind): string {
  return TOKEN_PRESENTATION[token].className;
}

export function cardText(card: CompanionCard, locale: Locale, themeId: ThemeId = 'pokemon-splendor'): { name: string; species: string } {
  const translated = locale === 'zh-CN' ? ZH_CARD_COPY[card.id] ?? (card.pokemonId === undefined ? undefined : ZH_CARD_COPY[card.pokemonId]) : undefined;
  const name = translated?.name ?? card.name;
  const species = translated?.species ?? card.species;
  if (themeId === 'creature-academy') {
    const tier = CARD_TIER_COPY[card.tier][locale];
    const element = tokenLabel(card.element, locale);
    return {
      name,
      species: locale === 'zh-CN' ? `${element}${tier}伙伴 · ${species}` : `${tier} ${element} companion · ${species}`,
    };
  }

  return {
    name,
    species,
  };
}

export function cardArt(card: CompanionCard, locale: Locale, themeId: ThemeId): { src: string; alt: string; mode: 'illustration' | 'card-face' } | null {
  const art = THEMES[themeId].assets.cardArt;
  if (art === undefined) {
    return null;
  }
  const text = cardText(card, locale, themeId);
  const filename = art.strategy === 'card-id' ? `${card.id}.png` : `${card.element}-t${card.tier}.png`;
  return {
    src: `${art.basePath}/${filename}`,
    alt: locale === 'zh-CN' ? `${text.name} 卡牌插画` : `${text.name} card art`,
    mode: art.mode ?? 'illustration',
  };
}

export function cardFlavor(card: CompanionCard, locale: Locale, themeId: ThemeId): string | null {
  if (themeId !== 'creature-academy') {
    return null;
  }
  return creatureAcademyLore(card.id, locale);
}

export function leaderName(leader: GymLeader, locale: Locale): string {
  return locale === 'zh-CN' ? ZH_LEADER_COPY[leader.id] ?? leader.name : leader.name;
}

export function formatLogMessage(entry: GameLogEntry, locale: Locale): string {
  if (locale === 'en-US') {
    return entry.message;
  }

  const created = /^(.*) created the training table\.$/.exec(entry.message);
  if (created?.[1] !== undefined) {
    return `${created[1]} 创建了训练牌桌。`;
  }

  const joined = /^(.*) joined the table\.$/.exec(entry.message);
  if (joined?.[1] !== undefined) {
    return `${joined[1]} 加入了牌桌。`;
  }

  if (entry.message === 'The first trainer round has started.') {
    return '第一轮训练师回合已开始。';
  }

  const took = /^(.*) took ([a-z, ]+) energy\.$/.exec(entry.message);
  if (took?.[1] !== undefined && took[2] !== undefined) {
    const translatedTokens = took[2]
      .split(', ')
      .map((token) => tokenLabel(token as TokenKind, locale))
      .join('、');
    return `${took[1]} 拿取了 ${translatedTokens}。`;
  }

  const discarded = /^(.*) discarded ([a-z, ]+) energy\.$/.exec(entry.message);
  if (discarded?.[1] !== undefined && discarded[2] !== undefined) {
    const translatedTokens = discarded[2]
      .split(', ')
      .map((token) => tokenLabel(token as TokenKind, locale))
      .join('、');
    return `${discarded[1]} 公开弃掉了 ${translatedTokens}。`;
  }

  const reserved = /^(.*) reserved (.*?)( and gained a prism)?\.$/.exec(entry.message);
  if (reserved?.[1] !== undefined && reserved[2] !== undefined) {
    return `${reserved[1]} 保留了 ${reserved[2]}${reserved[3] === undefined ? '' : '，并获得 1 枚大师球'}。`;
  }

  const recruited = /^(.*) recruited (.*?) for (\d+) glory\.$/.exec(entry.message);
  if (recruited?.[1] !== undefined && recruited[2] !== undefined && recruited[3] !== undefined) {
    return `${recruited[1]} 捕获了 ${recruited[2]}，获得 ${recruited[3]} 分。`;
  }

  const invited = /^(.*) invited (.*?) for (\d+) glory\.$/.exec(entry.message);
  if (invited?.[1] !== undefined && invited[2] !== undefined && invited[3] !== undefined) {
    return `${invited[1]} 邀请了 ${invited[2]}，获得 ${invited[3]} 分。`;
  }

  const evolved = /^(.*) evolved (.*?) into (.*?)\.$/.exec(entry.message);
  if (evolved?.[1] !== undefined && evolved[2] !== undefined && evolved[3] !== undefined) {
    return `${evolved[1]} 将 ${evolved[2]} 进化为 ${evolved[3]}。`;
  }

  const finalRound = /^(.*) reached (\d+) glory\. Final round begins\.$/.exec(entry.message);
  if (finalRound?.[1] !== undefined && finalRound[2] !== undefined) {
    return `${finalRound[1]} 达到 ${finalRound[2]} 分，终局轮开始。`;
  }

  const finished = /^Game finished\. Winner: (.*)\.$/.exec(entry.message);
  if (finished?.[1] !== undefined) {
    return `游戏结束。胜者：${finished[1]}。`;
  }

  return entry.message;
}
