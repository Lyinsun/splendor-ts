export type CreatureAcademyLocale = 'zh-CN' | 'en-US';

export type CreatureAcademyLore = Record<CreatureAcademyLocale, string>;

export const CREATURE_ACADEMY_CARD_LORE: Record<string, CreatureAcademyLore> = {
  't1-fire-embercub': {
    'zh-CN': '入门火场的巡灯伙伴，擅长把第一枚火焰徽章点亮。',
    'en-US': 'A novice torch runner that helps light the first fire badge.',
  },
  't1-fire-cinderkit': {
    'zh-CN': '在炉灰课上守护余温，能把零散能量收束成稳定火种。',
    'en-US': 'Keeps forge embers steady and turns stray energy into a clean spark.',
  },
  't1-fire-ashdrake': {
    'zh-CN': '用灰翼穿过训练环，是火系学徒第一次冲分的标志。',
    'en-US': 'Glides through ember hoops, marking a fire student ready to score.',
  },
  't1-water-mistfin': {
    'zh-CN': '雾池边的侦察伙伴，能在低费用路线里打开水流节奏。',
    'en-US': 'A mist-pool scout that opens an efficient water route.',
  },
  't1-water-bubblepup': {
    'zh-CN': '泡泡课程的陪练，会把紧张的开局变成轻快练习。',
    'en-US': 'A bubble-course partner that turns tense openings into smooth practice.',
  },
  't1-water-reeflet': {
    'zh-CN': '礁石馆的滑翔新星，第一次带来真正的水系荣耀。',
    'en-US': 'A reef-hall glider that brings the first real water glory.',
  },
  't1-grass-spriglynx': {
    'zh-CN': '新枝跑道上的跃击手，适合铺开草木徽章基础。',
    'en-US': 'A sprig-lane pouncer built for growing the first grass badges.',
  },
  't1-grass-mossling': {
    'zh-CN': '苔藓温室的小看护，擅长把长期折扣慢慢养成。',
    'en-US': 'A moss-house keeper that patiently grows lasting discounts.',
  },
  't1-grass-thornbit': {
    'zh-CN': '荆棘边线的哨兵，用低阶荣耀逼迫对手加快节奏。',
    'en-US': 'A thorn-line scout that pressures rivals with early glory.',
  },
  't1-electric-sparkit': {
    'zh-CN': '雷电课的第一只放电伙伴，负责启动快攻资源链。',
    'en-US': 'The first volt-class discharge partner, starting fast resource chains.',
  },
  't1-electric-voltail': {
    'zh-CN': '用尾弧标记跑道，是雷系徽章积累的稳定起点。',
    'en-US': 'Marks the track with a tail arc, a steady start for volt badges.',
  },
  't1-electric-glimwire': {
    'zh-CN': '铜线实验室的微光学生，能把心灵和草木费用接回电路。',
    'en-US': 'A copper-lab student that wires mind and grass costs back into play.',
  },
  't1-psychic-dreamite': {
    'zh-CN': '梦境课堂的微光伙伴，适合打开心灵路线的第一步。',
    'en-US': 'A dream-class mote suited to opening the first mind route.',
  },
  't1-psychic-orbowl': {
    'zh-CN': '静默观星台的夜巡者，靠低成本维持心灵徽章成长。',
    'en-US': 'A silent stargazer that grows mind badges at low cost.',
  },
  't1-psychic-aurapup': {
    'zh-CN': '光环跑道的敏捷学徒，会把早期资源换成首个荣耀。',
    'en-US': 'An aura-lane apprentice that turns early resources into first glory.',
  },
  't2-fire-pyrolynx': {
    'zh-CN': '中阶火场的潜伏者，开始把多色训练转成火系优势。',
    'en-US': 'A mid-tier blaze stalker that converts mixed drills into fire advantage.',
  },
  't2-fire-forgehorn': {
    'zh-CN': '锻炉课程的冲撞手，用厚重费用换来可靠得分。',
    'en-US': 'A forge-class charger that trades heavy costs for reliable points.',
  },
  't2-fire-sunscale': {
    'zh-CN': '日照屋顶的鳞翼王牌，代表火系路线进入爆发期。',
    'en-US': 'A sun-roof ace showing the fire route has reached its burst phase.',
  },
  't2-water-torrentail': {
    'zh-CN': '激流训练渠的领跑者，适合把水系徽章推向中盘。',
    'en-US': 'A torrent-channel runner that pushes water badges into the midgame.',
  },
  't2-water-shellmage': {
    'zh-CN': '贝壳讲堂的潮汐术士，能在防守节奏里稳定拿分。',
    'en-US': 'A shell-hall tide mage that scores steadily from a defensive tempo.',
  },
  't2-water-moonray': {
    'zh-CN': '月池考核的优等生，水系高折扣后的关键跃迁。',
    'en-US': 'A moon-pool honors companion, the key jump after water discounts.',
  },
  't2-grass-canopyra': {
    'zh-CN': '林冠桥上的缠绕者，把火与心灵训练编进草木路线。',
    'en-US': 'A canopy-bridge binder that weaves fire and mind drills into grass.',
  },
  't2-grass-bloomguard': {
    'zh-CN': '花瓣守卫队的主力，适合稳住中盘徽章数量。',
    'en-US': 'A petal-guard mainstay for stabilizing midgame badge counts.',
  },
  't2-grass-verdantstag': {
    'zh-CN': '翠林考场的角冠领袖，草系冲分路线的明显信号。',
    'en-US': 'A grove-antler leader that clearly signals a grass scoring line.',
  },
  't2-electric-stormkit': {
    'zh-CN': '云廊短跑的进阶伙伴，压缩回合并制造节奏压力。',
    'en-US': 'A cloud-lane sprinter that compresses turns and creates tempo pressure.',
  },
  't2-electric-railfang': {
    'zh-CN': '磁轨训练室的尖牙学生，把水草费用牵引进雷电核心。',
    'en-US': 'A rail-lab fang that pulls water and grass costs into the volt core.',
  },
  't2-electric-thunderrook': {
    'zh-CN': '高塔冲刺课的充能者，雷系从折扣转向荣耀的节点。',
    'en-US': 'A tower charger where volt discounts start becoming glory.',
  },
  't2-psychic-mindmoth': {
    'zh-CN': '心念温室的清明蝶翼，擅长支撑细腻的资源转换。',
    'en-US': 'A lucid-wing partner that supports delicate resource conversion.',
  },
  't2-psychic-starseer': {
    'zh-CN': '星盘课堂的观测者，用均衡费用换取中盘主动权。',
    'en-US': 'A star-chart watcher that buys midgame initiative with balanced costs.',
  },
  't2-psychic-echowisp': {
    'zh-CN': '记忆回廊的幽光，是心灵路线显露锋芒的三分牌。',
    'en-US': 'A memory-hall wisp, the three-point reveal of a mind route.',
  },
  't3-fire-volcanor': {
    'zh-CN': '火山终考的守门者，要求多系徽章协同后才能驾驭。',
    'en-US': 'A volcanic final-exam guardian requiring multi-badge coordination.',
  },
  't3-fire-crimsonwyrm': {
    'zh-CN': '红玉试炼的巨蛇，火系主线成熟后的高分选择。',
    'en-US': 'A ruby-trial wyrm and a high-score pick for mature fire lines.',
  },
  't3-fire-dawnphoenix': {
    'zh-CN': '曙光高塔的终阶王牌，常常直接推开终局轮。',
    'en-US': 'A dawn-tower apex ace that often opens the final round.',
  },
  't3-water-abyssorca': {
    'zh-CN': '深潮终考的潜行巨影，需要全面资源掌控。',
    'en-US': 'A deep-tide final shadow that demands broad resource control.',
  },
  't3-water-glaciermare': {
    'zh-CN': '冰川长桥的冲锋者，水系高分与跨系费用的结合。',
    'en-US': 'A glacier-bridge charger combining water scoring and cross costs.',
  },
  't3-water-tidematriarch': {
    'zh-CN': '潮冠学院的水系王者，用极高水流掌控换取五点荣耀。',
    'en-US': 'A tide-crown ruler that turns deep water control into five glory.',
  },
  't3-grass-elderbloom': {
    'zh-CN': '古树终考的守护灵，检验整局成长是否扎实。',
    'en-US': 'An elder-grove guardian testing whether the whole growth line is solid.',
  },
  't3-grass-ironroot': {
    'zh-CN': '铁根试炼的巨像，草系厚积薄发后的核心高分牌。',
    'en-US': 'An ironroot colossus and the core payoff for a patient grass line.',
  },
  't3-grass-worldseed': {
    'zh-CN': '世界种子温室的终阶伙伴，能把草木路线推向终局。',
    'en-US': 'A worldseed apex companion that can carry grass into the finale.',
  },
  't3-electric-tempestcat': {
    'zh-CN': '风暴终考的潜行者，要求雷电路线兼顾三色基础。',
    'en-US': 'A tempest final-exam prowler requiring volt plus three-color support.',
  },
  't3-electric-zenithram': {
    'zh-CN': '天顶雷塔的巨角王牌，用高压徽章换取四点荣耀。',
    'en-US': 'A zenith-tower ace that converts high-voltage badges into four glory.',
  },
  't3-electric-auroracoil': {
    'zh-CN': '极光回路的终阶长蛇，是雷电路线的五分终点。',
    'en-US': 'An aurora-circuit apex coil, the five-point finish for volt lines.',
  },
  't3-psychic-oracleon': {
    'zh-CN': '预言终考的引导者，需要心灵路线兼顾多系支撑。',
    'en-US': 'An oracle final guide needing mind focus and multi-element support.',
  },
  't3-psychic-celestowl': {
    'zh-CN': '星穹塔的夜鸮导师候选，是心灵高分的稳定答案。',
    'en-US': 'A celest tower candidate and a stable high-score answer for mind.',
  },
  't3-psychic-novasphinx': {
    'zh-CN': '新星殿堂的心智王冠，象征心灵路线抵达终点。',
    'en-US': 'A nova-hall mind crown that marks the endpoint of the mind route.',
  },
};

export function creatureAcademyLore(cardId: string, locale: CreatureAcademyLocale): string | null {
  return CREATURE_ACADEMY_CARD_LORE[cardId]?.[locale] ?? null;
}
