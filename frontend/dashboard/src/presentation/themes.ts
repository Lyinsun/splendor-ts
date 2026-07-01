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
    copyRoom: '复制房间',
    leave: '离开',
    demoRival: 'Demo 对手',
    start: '开始',
    winner: '胜者',
    currentTurn: '当前回合',
    yourMove: '轮到你',
    watching: '观战中',
    energyBank: '精灵球供应',
    noEnergySelected: '未选择精灵球',
    clear: '清空',
    takeEnergy: '拿取',
    settlement: '回合结算',
    discardTokens: '弃球',
    optionalEvolution: '可选进化',
    noEvolution: '不进化',
    reserveDeck: '保留牌堆顶',
    open: '公开',
    tier: '等级',
    specialCards: '特殊卡区',
    specialRank: {
      rare: '罕见',
      legendary: '传说',
    } satisfies Record<'rare' | 'legendary', string>,
    gymMentors: '训练师人物',
    yourReserve: '你的保留区',
    noReserved: '没有保留的伙伴。',
    battleLog: '战斗日志',
    buy: '购买',
    reserve: '保留',
    glory: '分',
    evolutions: '进化记录',
    pokemonInPlay: '在场宝可梦',
    you: '你',
    turn: '回合',
    roomStatus: {
      lobby: '等待中',
      playing: '进行中',
      finished: '已结束',
    } satisfies Record<GameState['status'], string>,
    roomMeta: (players: number, round: number, turn: number) => `${players} 位训练师 · 第 ${round} 轮 · 第 ${turn} 回合`,
    playerCount: (players: number, maxPlayers: number, status: GameState['status']) => `${players}/${maxPlayers} 位训练师 · ${APP_COPY['zh-CN'].roomStatus[status]}`,
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
    copyRoom: 'Copy room',
    leave: 'Leave',
    demoRival: 'Demo rival',
    start: 'Start',
    winner: 'Winner',
    currentTurn: 'Current turn',
    yourMove: 'Your move',
    watching: 'Watching',
    energyBank: 'Ball supply',
    noEnergySelected: 'No ball selected',
    clear: 'Clear',
    takeEnergy: 'Take',
    settlement: 'Turn settlement',
    discardTokens: 'Discard',
    optionalEvolution: 'Optional evolution',
    noEvolution: 'No evolution',
    reserveDeck: 'Reserve deck top',
    open: 'open',
    tier: 'Tier',
    specialCards: 'Special cards',
    specialRank: {
      rare: 'Rare',
      legendary: 'Legendary',
    } satisfies Record<'rare' | 'legendary', string>,
    gymMentors: 'Trainer tiles',
    yourReserve: 'Your reserve',
    noReserved: 'No reserved companions.',
    battleLog: 'Battle log',
    buy: 'Buy',
    reserve: 'Reserve',
    glory: 'points',
    evolutions: 'Evolutions',
    pokemonInPlay: 'Pokemon in play',
    you: 'you',
    turn: 'Turn',
    roomStatus: {
      lobby: 'lobby',
      playing: 'playing',
      finished: 'finished',
    } satisfies Record<GameState['status'], string>,
    roomMeta: (players: number, round: number, turn: number) => `${players} trainers · round ${round} · turn ${turn}`,
    playerCount: (players: number, maxPlayers: number, status: GameState['status']) => `${players}/${maxPlayers} trainers · ${APP_COPY['en-US'].roomStatus[status]}`,
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
