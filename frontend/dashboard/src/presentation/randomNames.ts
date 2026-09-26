import type { Locale } from './themes';

/**
 * Default trainer names: "<adjective>的<noun>" in Chinese, "<Adjective> <Noun>" in English.
 * Any adjective pairs with any noun, so 30 x 30 gives 900 names per locale.
 */
const ADJECTIVES: Record<Locale, readonly string[]> = {
  'zh-CN': [
    '害羞', '贪睡', '勇敢', '好奇', '淘气', '温柔', '倔强', '冷静', '爱哭', '慢吞吞',
    '急性子', '闪闪发光', '软乎乎', '迷路', '吃饱', '认真', '爱笑', '神秘', '胆小', '热血',
    '懒洋洋', '爱唱歌', '毛茸茸', '想家', '元气满满', '迷糊', '骄傲', '安静', '爱干净', '运气好',
  ],
  'en-US': [
    'Shy', 'Sleepy', 'Brave', 'Curious', 'Naughty', 'Gentle', 'Stubborn', 'Calm', 'Teary', 'Slow',
    'Hasty', 'Shiny', 'Fluffy', 'Lost', 'Full', 'Serious', 'Cheerful', 'Mysterious', 'Timid', 'Fiery',
    'Lazy', 'Singing', 'Fuzzy', 'Homesick', 'Bouncy', 'Dizzy', 'Proud', 'Quiet', 'Tidy', 'Lucky',
  ],
};

const NOUNS: Record<Locale, readonly string[]> = {
  'zh-CN': [
    '皮卡丘', '卡比兽', '胖丁', '可达鸭', '伊布', '妙蛙种子', '小火龙', '杰尼龟', '喵喵', '呆呆兽',
    '六尾', '走路草', '绿毛虫', '波波', '小拳石', '鬼斯', '凯西', '迷你龙', '蚊香蝌蚪', '大岩蛇',
    '腕力', '喇叭芽', '独角虫', '百变怪', '拉普拉斯', '胡地', '快龙', '梦幻', '训练师', '波克比',
  ],
  'en-US': [
    'Pikachu', 'Snorlax', 'Jigglypuff', 'Psyduck', 'Eevee', 'Bulbasaur', 'Charmander', 'Squirtle', 'Meowth', 'Slowpoke',
    'Vulpix', 'Oddish', 'Caterpie', 'Pidgey', 'Geodude', 'Gastly', 'Abra', 'Dratini', 'Poliwag', 'Onix',
    'Machop', 'Bellsprout', 'Weedle', 'Ditto', 'Lapras', 'Alakazam', 'Dragonite', 'Mew', 'Trainer', 'Togepi',
  ],
};

function pick<T>(list: readonly T[], random: () => number): T {
  return list[Math.floor(random() * list.length) % list.length]!;
}

/** A random default name; pass `previous` to guarantee the reroll button visibly changes it. */
export function randomTrainerName(locale: Locale, previous?: string, random: () => number = Math.random): string {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const adjective = pick(ADJECTIVES[locale], random);
    const noun = pick(NOUNS[locale], random);
    const name = locale === 'zh-CN' ? `${adjective}的${noun}` : `${adjective} ${noun}`;
    if (name !== previous) {
      return name;
    }
  }
  return locale === 'zh-CN' ? `${pick(ADJECTIVES[locale], random)}的训练师` : `${pick(ADJECTIVES[locale], random)} Trainer`;
}
