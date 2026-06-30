import type { CardTier, CompanionCard, Element, ElementCost, GymLeader } from './types.js';

function card(id: string, tier: CardTier, name: string, element: Element, points: number, species: string, cost: ElementCost): CompanionCard {
  return { id, tier, name, element, points, species, cost };
}

export const COMPANION_CARDS: CompanionCard[] = [
  card('t1-fire-embercub', 1, 'Ember Cub', 'fire', 0, 'Spark Prowler', { water: 1, grass: 1, electric: 1 }),
  card('t1-fire-cinderkit', 1, 'Cinder Kit', 'fire', 0, 'Hearth Sprite', { fire: 1, grass: 2 }),
  card('t1-fire-ashdrake', 1, 'Ash Drake', 'fire', 1, 'Tiny Drake', { water: 2, psychic: 2 }),
  card('t1-water-mistfin', 1, 'Mistfin', 'water', 0, 'Ripple Fin', { fire: 1, grass: 1, psychic: 1 }),
  card('t1-water-bubblepup', 1, 'Bubble Pup', 'water', 0, 'Tide Pup', { water: 1, electric: 2 }),
  card('t1-water-reeflet', 1, 'Reeflet', 'water', 1, 'Coral Glider', { fire: 2, grass: 2 }),
  card('t1-grass-spriglynx', 1, 'Sprig Lynx', 'grass', 0, 'Vine Pouncer', { fire: 1, water: 1, electric: 1 }),
  card('t1-grass-mossling', 1, 'Mossling', 'grass', 0, 'Moss Sprite', { grass: 1, psychic: 2 }),
  card('t1-grass-thornbit', 1, 'Thornbit', 'grass', 1, 'Briar Scout', { water: 2, electric: 2 }),
  card('t1-electric-sparkit', 1, 'Sparkit', 'electric', 0, 'Static Cub', { fire: 1, water: 1, psychic: 1 }),
  card('t1-electric-voltail', 1, 'Voltail', 'electric', 0, 'Bolt Runner', { electric: 1, fire: 2 }),
  card('t1-electric-glimwire', 1, 'Glimwire', 'electric', 1, 'Copper Wisp', { grass: 2, psychic: 2 }),
  card('t1-psychic-dreamite', 1, 'Dreamite', 'psychic', 0, 'Mind Mote', { water: 1, electric: 1, grass: 1 }),
  card('t1-psychic-orbowl', 1, 'Orb Owl', 'psychic', 0, 'Silent Watcher', { psychic: 1, water: 2 }),
  card('t1-psychic-aurapup', 1, 'Aura Pup', 'psychic', 1, 'Halo Pup', { fire: 2, electric: 2 }),

  card('t2-fire-pyrolynx', 2, 'Pyro Lynx', 'fire', 1, 'Blaze Stalker', { fire: 2, water: 2, grass: 3 }),
  card('t2-fire-forgehorn', 2, 'Forgehorn', 'fire', 2, 'Furnace Ram', { fire: 3, electric: 2, psychic: 2 }),
  card('t2-fire-sunscale', 2, 'Sunscale', 'fire', 3, 'Solar Drake', { fire: 5, grass: 3 }),
  card('t2-water-torrentail', 2, 'Torrentail', 'water', 1, 'River Runner', { water: 2, grass: 2, electric: 3 }),
  card('t2-water-shellmage', 2, 'Shell Mage', 'water', 2, 'Tide Oracle', { water: 3, psychic: 2, fire: 2 }),
  card('t2-water-moonray', 2, 'Moonray', 'water', 3, 'Lunar Ray', { water: 5, electric: 3 }),
  card('t2-grass-canopyra', 2, 'Canopyra', 'grass', 1, 'Canopy Serpent', { grass: 2, fire: 2, psychic: 3 }),
  card('t2-grass-bloomguard', 2, 'Bloom Guard', 'grass', 2, 'Petal Sentinel', { grass: 3, water: 2, electric: 2 }),
  card('t2-grass-verdantstag', 2, 'Verdant Stag', 'grass', 3, 'Grove Antler', { grass: 5, fire: 3 }),
  card('t2-electric-stormkit', 2, 'Storm Kit', 'electric', 1, 'Cloud Prowler', { electric: 2, psychic: 2, fire: 3 }),
  card('t2-electric-railfang', 2, 'Railfang', 'electric', 2, 'Magnet Fang', { electric: 3, grass: 2, water: 2 }),
  card('t2-electric-thunderrook', 2, 'Thunder Rook', 'electric', 3, 'Sky Charger', { electric: 5, psychic: 3 }),
  card('t2-psychic-mindmoth', 2, 'Mindmoth', 'psychic', 1, 'Lucid Wing', { psychic: 2, electric: 2, water: 3 }),
  card('t2-psychic-starseer', 2, 'Starseer', 'psychic', 2, 'Astral Watcher', { psychic: 3, fire: 2, grass: 2 }),
  card('t2-psychic-echowisp', 2, 'Echowisp', 'psychic', 3, 'Memory Wisp', { psychic: 5, water: 3 }),

  card('t3-fire-volcanor', 3, 'Volcanor', 'fire', 3, 'Caldera Titan', { fire: 4, water: 3, electric: 3, psychic: 3 }),
  card('t3-fire-crimsonwyrm', 3, 'Crimson Wyrm', 'fire', 4, 'Ruby Wyrm', { fire: 6, grass: 3, psychic: 3 }),
  card('t3-fire-dawnphoenix', 3, 'Dawn Phoenix', 'fire', 5, 'Solar Wing', { fire: 7, electric: 3 }),
  card('t3-water-abyssorca', 3, 'Abyss Orca', 'water', 3, 'Deep Tide', { water: 4, fire: 3, grass: 3, psychic: 3 }),
  card('t3-water-glaciermare', 3, 'Glacier Mare', 'water', 4, 'Frost Charger', { water: 6, electric: 3, fire: 3 }),
  card('t3-water-tidematriarch', 3, 'Tide Matriarch', 'water', 5, 'Ocean Crown', { water: 7, grass: 3 }),
  card('t3-grass-elderbloom', 3, 'Elderbloom', 'grass', 3, 'Ancient Grove', { grass: 4, water: 3, fire: 3, electric: 3 }),
  card('t3-grass-ironroot', 3, 'Ironroot', 'grass', 4, 'Root Colossus', { grass: 6, psychic: 3, water: 3 }),
  card('t3-grass-worldseed', 3, 'Worldseed', 'grass', 5, 'Prime Sprout', { grass: 7, fire: 3 }),
  card('t3-electric-tempestcat', 3, 'Tempest Cat', 'electric', 3, 'Storm Prowler', { electric: 4, grass: 3, water: 3, fire: 3 }),
  card('t3-electric-zenithram', 3, 'Zenith Ram', 'electric', 4, 'Voltage Horn', { electric: 6, psychic: 3, grass: 3 }),
  card('t3-electric-auroracoil', 3, 'Aurora Coil', 'electric', 5, 'Prism Serpent', { electric: 7, water: 3 }),
  card('t3-psychic-oracleon', 3, 'Oracleon', 'psychic', 3, 'Future Guide', { psychic: 4, electric: 3, fire: 3, water: 3 }),
  card('t3-psychic-celestowl', 3, 'Celestowl', 'psychic', 4, 'Starlit Owl', { psychic: 6, water: 3, electric: 3 }),
  card('t3-psychic-novasphinx', 3, 'Nova Sphinx', 'psychic', 5, 'Mind Crown', { psychic: 7, grass: 3 }),
];

export const GYM_LEADERS: GymLeader[] = [
  { id: 'leader-flare', name: 'Flare Mentor', element: 'fire', points: 3, requirement: { fire: 3, electric: 3, psychic: 3 } },
  { id: 'leader-tide', name: 'Tide Mentor', element: 'water', points: 3, requirement: { water: 3, grass: 3, psychic: 3 } },
  { id: 'leader-grove', name: 'Grove Mentor', element: 'grass', points: 3, requirement: { grass: 4, water: 2, fire: 2 } },
  { id: 'leader-storm', name: 'Storm Mentor', element: 'electric', points: 3, requirement: { electric: 4, fire: 2, grass: 2 } },
  { id: 'leader-oracle', name: 'Oracle Mentor', element: 'psychic', points: 3, requirement: { psychic: 4, water: 2, electric: 2 } },
  { id: 'leader-prism', name: 'Prism Mentor', element: 'psychic', points: 3, requirement: { fire: 2, water: 2, grass: 2, electric: 2, psychic: 2 } },
];
