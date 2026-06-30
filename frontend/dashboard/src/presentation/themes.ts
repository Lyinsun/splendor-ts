import type { CardTier, CompanionCard, GameLogEntry, GameState, GymLeader, TokenKind } from '../api/types';
import { creatureAcademyLore } from './creatureAcademy';

export const LOCALES = ['zh-CN', 'en-US'] as const;
export type Locale = (typeof LOCALES)[number];

export const THEME_IDS = ['elemental-league', 'crystal-observatory', 'creature-academy'] as const;
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
      strategy: 'element-tier';
    };
  };
}

export const LOCALE_OPTIONS: Array<{ id: Locale; label: string }> = [
  { id: 'zh-CN', label: '中文' },
  { id: 'en-US', label: 'English' },
];

export const THEMES: Record<ThemeId, ThemeDefinition> = {
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
    label: { 'zh-CN': '火焰', 'en-US': 'Fire' },
    shortLabel: { 'zh-CN': '火', 'en-US': 'F' },
  },
  water: {
    className: 'token-water',
    label: { 'zh-CN': '水流', 'en-US': 'Water' },
    shortLabel: { 'zh-CN': '水', 'en-US': 'W' },
  },
  grass: {
    className: 'token-grass',
    label: { 'zh-CN': '草木', 'en-US': 'Grass' },
    shortLabel: { 'zh-CN': '草', 'en-US': 'G' },
  },
  electric: {
    className: 'token-electric',
    label: { 'zh-CN': '雷电', 'en-US': 'Volt' },
    shortLabel: { 'zh-CN': '雷', 'en-US': 'V' },
  },
  psychic: {
    className: 'token-psychic',
    label: { 'zh-CN': '心灵', 'en-US': 'Mind' },
    shortLabel: { 'zh-CN': '念', 'en-US': 'M' },
  },
  prism: {
    className: 'token-prism',
    label: { 'zh-CN': '棱晶', 'en-US': 'Prism' },
    shortLabel: { 'zh-CN': '晶', 'en-US': 'P' },
  },
};

export const APP_COPY = {
  'zh-CN': {
    appTitle: '璀璨伙伴',
    appSubtitle: 'TypeScript 多人 MVP',
    languageLabel: '语言',
    themeLabel: '主题',
    refreshRooms: '刷新房间',
    liveSync: '实时同步',
    offlineSync: '同步离线',
    noRoomStatus: '未入座',
    heroEyebrow: '元素伙伴联盟',
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
    energyBank: '能量银行',
    noEnergySelected: '未选择能量',
    clear: '清空',
    takeEnergy: '拿取能量',
    open: '公开',
    tier: '等级',
    gymMentors: '道馆导师',
    yourReserve: '你的保留区',
    noReserved: '没有保留的伙伴。',
    battleLog: '战斗日志',
    buy: '购买',
    reserve: '保留',
    glory: '荣耀',
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
    appTitle: 'Splendor Monsters',
    appSubtitle: 'TypeScript multiplayer MVP',
    languageLabel: 'Language',
    themeLabel: 'Theme',
    refreshRooms: 'Refresh rooms',
    liveSync: 'Live sync',
    offlineSync: 'Offline sync',
    noRoomStatus: 'no room',
    heroEyebrow: 'Element companion league',
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
    energyBank: 'Energy bank',
    noEnergySelected: 'No energy selected',
    clear: 'Clear',
    takeEnergy: 'Take energy',
    open: 'open',
    tier: 'Tier',
    gymMentors: 'Gym mentors',
    yourReserve: 'Your reserve',
    noReserved: 'No reserved companions.',
    battleLog: 'Battle log',
    buy: 'Buy',
    reserve: 'Reserve',
    glory: 'glory',
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
  't1-fire-embercub': { name: '余烬幼兽', species: '火花潜行者' },
  't1-fire-cinderkit': { name: '炉灰灵猫', species: '炉心精灵' },
  't1-fire-ashdrake': { name: '灰翼幼龙', species: '小型炎龙' },
  't1-water-mistfin': { name: '雾鳍', species: '涟漪鳍影' },
  't1-water-bubblepup': { name: '泡沫幼犬', species: '潮汐幼犬' },
  't1-water-reeflet': { name: '礁灵', species: '珊瑚滑翔者' },
  't1-grass-spriglynx': { name: '新枝灵猞', species: '藤蔓跃击者' },
  't1-grass-mossling': { name: '苔芽灵', species: '苔藓精灵' },
  't1-grass-thornbit': { name: '荆棘哨兵', species: '灌木侦察者' },
  't1-electric-sparkit': { name: '火花幼兽', species: '静电幼兽' },
  't1-electric-voltail': { name: '伏尾兽', species: '奔雷者' },
  't1-electric-glimwire': { name: '微光铜线', species: '铜线幽光' },
  't1-psychic-dreamite': { name: '梦粒', species: '心念微光' },
  't1-psychic-orbowl': { name: '星球夜鸮', species: '静默守望者' },
  't1-psychic-aurapup': { name: '灵光幼犬', species: '光环幼犬' },
  't2-fire-pyrolynx': { name: '炎步灵猞', species: '烈焰潜伏者' },
  't2-fire-forgehorn': { name: '锻角兽', species: '熔炉山羊' },
  't2-fire-sunscale': { name: '日鳞', species: '太阳幼龙' },
  't2-water-torrentail': { name: '激流尾', species: '河道奔行者' },
  't2-water-shellmage': { name: '贝壳法师', species: '潮汐先知' },
  't2-water-moonray': { name: '月辉鳐', species: '月光鳐影' },
  't2-grass-canopyra': { name: '冠荫蛇', species: '林冠长蛇' },
  't2-grass-bloomguard': { name: '绽放守卫', species: '花瓣哨卫' },
  't2-grass-verdantstag': { name: '翠林雄鹿', species: '林地鹿角' },
  't2-electric-stormkit': { name: '风暴灵猫', species: '云影潜行者' },
  't2-electric-railfang': { name: '磁轨牙', species: '磁力尖牙' },
  't2-electric-thunderrook': { name: '雷霆堡鸟', species: '苍穹充能者' },
  't2-psychic-mindmoth': { name: '心念蛾', species: '清明蝶翼' },
  't2-psychic-starseer': { name: '观星者', species: '星界守望者' },
  't2-psychic-echowisp': { name: '回声幽光', species: '记忆幽光' },
  't3-fire-volcanor': { name: '火山巨灵', species: '熔火泰坦' },
  't3-fire-crimsonwyrm': { name: '绯红巨蛇', species: '红玉巨蛇' },
  't3-fire-dawnphoenix': { name: '曙光凤凰', species: '太阳之翼' },
  't3-water-abyssorca': { name: '深渊鲸', species: '深潮之影' },
  't3-water-glaciermare': { name: '冰川骏马', species: '霜潮驰骋者' },
  't3-water-tidematriarch': { name: '潮汐女王', species: '海冠主母' },
  't3-grass-elderbloom': { name: '古绽花灵', species: '远古林地' },
  't3-grass-ironroot': { name: '铁根巨像', species: '根系巨像' },
  't3-grass-worldseed': { name: '世界种子', species: '原初新芽' },
  't3-electric-tempestcat': { name: '风暴猫', species: '雷云潜行者' },
  't3-electric-zenithram': { name: '天顶公羊', species: '电压巨角' },
  't3-electric-auroracoil': { name: '极光环蛇', species: '棱光长蛇' },
  't3-psychic-oracleon': { name: '预言灵', species: '未来引导者' },
  't3-psychic-celestowl': { name: '星穹夜鸮', species: '星光夜鸮' },
  't3-psychic-novasphinx': { name: '新星狮身', species: '心智王冠' },
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
  return THEME_IDS.includes(value as ThemeId) ? (value as ThemeId) : 'elemental-league';
}

export function tokenLabel(token: TokenKind, locale: Locale): string {
  return TOKEN_PRESENTATION[token].label[locale];
}

export function tokenClassName(token: TokenKind): string {
  return TOKEN_PRESENTATION[token].className;
}

export function cardText(card: CompanionCard, locale: Locale, themeId: ThemeId = 'elemental-league'): { name: string; species: string } {
  const translated = locale === 'zh-CN' ? ZH_CARD_COPY[card.id] : undefined;
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

export function cardArt(card: CompanionCard, locale: Locale, themeId: ThemeId): { src: string; alt: string } | null {
  const art = THEMES[themeId].assets.cardArt;
  if (art === undefined) {
    return null;
  }
  const text = cardText(card, locale, themeId);
  return {
    src: `${art.basePath}/${card.element}-t${card.tier}.png`,
    alt: locale === 'zh-CN' ? `${text.name} 卡牌插画` : `${text.name} card art`,
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
    return `${took[1]} 拿取了 ${translatedTokens} 能量。`;
  }

  const reserved = /^(.*) reserved (.*?)( and gained a prism)?\.$/.exec(entry.message);
  if (reserved?.[1] !== undefined && reserved[2] !== undefined) {
    return `${reserved[1]} 保留了 ${reserved[2]}${reserved[3] === undefined ? '' : '，并获得 1 枚棱晶'}。`;
  }

  const recruited = /^(.*) recruited (.*?) for (\d+) glory\.$/.exec(entry.message);
  if (recruited?.[1] !== undefined && recruited[2] !== undefined && recruited[3] !== undefined) {
    return `${recruited[1]} 招募了 ${recruited[2]}，获得 ${recruited[3]} 点荣耀。`;
  }

  const invited = /^(.*) invited (.*?) for (\d+) glory\.$/.exec(entry.message);
  if (invited?.[1] !== undefined && invited[2] !== undefined && invited[3] !== undefined) {
    return `${invited[1]} 邀请了 ${invited[2]}，获得 ${invited[3]} 点荣耀。`;
  }

  const finalRound = /^(.*) reached (\d+) glory\. Final round begins\.$/.exec(entry.message);
  if (finalRound?.[1] !== undefined && finalRound[2] !== undefined) {
    return `${finalRound[1]} 达到 ${finalRound[2]} 点荣耀，终局轮开始。`;
  }

  const finished = /^Game finished\. Winner: (.*)\.$/.exec(entry.message);
  if (finished?.[1] !== undefined) {
    return `游戏结束。胜者：${finished[1]}。`;
  }

  return entry.message;
}
