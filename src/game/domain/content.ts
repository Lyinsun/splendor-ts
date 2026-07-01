import type { CardTier, CompanionCard, Element, ElementCost, GymLeader, SpecialCardRank } from './types.js';

interface CardOptions {
  pokemonId?: string;
  species?: string;
  bonusValue?: number;
  specialRank?: SpecialCardRank;
  evolvesFrom?: string;
  evolvesTo?: CompanionCard['evolvesTo'];
  evolutionRequirement?: ElementCost;
  requiresPrism?: boolean;
}

function pokemonCard(
  id: string,
  tier: CardTier,
  name: string,
  element: Element,
  points: number,
  cost: ElementCost,
  options: CardOptions = {},
): CompanionCard {
  const card: CompanionCard = {
    id,
    tier,
    name,
    element,
    points,
    cost,
    species: options.species ?? 'Pokemon',
  };

  if (options.pokemonId !== undefined) {
    card.pokemonId = options.pokemonId;
  }
  if (options.bonusValue !== undefined) {
    card.bonusValue = options.bonusValue;
  }
  if (options.specialRank !== undefined) {
    card.specialRank = options.specialRank;
  }
  if (options.evolvesFrom !== undefined) {
    card.evolvesFrom = options.evolvesFrom;
  }
  if (options.evolvesTo !== undefined) {
    card.evolvesTo = options.evolvesTo;
  }
  if (options.evolutionRequirement !== undefined) {
    card.evolutionRequirement = options.evolutionRequirement;
  }
  if (options.requiresPrism !== undefined) {
    card.requiresPrism = options.requiresPrism;
  }

  return card;
}

export const COMPANION_CARDS: CompanionCard[] = [
  pokemonCard('pdf-t1-dratini-01', 1, 'Dratini', 'grass', 1, { grass: 4 }, {
    pokemonId: 'dratini',
    species: 'Dragon Pokemon',
    evolvesTo: { pokemonId: 'dragonair', requirement: { water: 3 } },
  }),
  pokemonCard('pdf-t1-caterpie-01', 1, 'Caterpie', 'psychic', 0, { fire: 1, water: 1, grass: 1, electric: 1 }, {
    pokemonId: 'caterpie',
    species: 'Worm Pokemon',
    evolvesTo: { pokemonId: 'metapod', requirement: { water: 3 } },
  }),
  pokemonCard('pdf-t1-bulbasaur-01', 1, 'Bulbasaur', 'electric', 1, { electric: 4 }, {
    pokemonId: 'bulbasaur',
    species: 'Seed Pokemon',
    evolvesTo: { pokemonId: 'ivysaur', requirement: { psychic: 3 } },
  }),
  pokemonCard('pdf-t1-charmander-01', 1, 'Charmander', 'water', 1, { water: 4 }, {
    pokemonId: 'charmander',
    species: 'Lizard Pokemon',
    evolvesTo: { pokemonId: 'charmeleon', requirement: { electric: 3 } },
  }),
  pokemonCard('pdf-t1-squirtle-01', 1, 'Squirtle', 'fire', 1, { fire: 4 }, {
    pokemonId: 'squirtle',
    species: 'Tiny Turtle Pokemon',
    evolvesTo: { pokemonId: 'wartortle', requirement: { grass: 3 } },
  }),
  pokemonCard('pdf-t1-weedle-01', 1, 'Weedle', 'grass', 0, { fire: 1, water: 1, electric: 1, psychic: 1 }, {
    pokemonId: 'weedle',
    species: 'Hairy Bug Pokemon',
    evolvesTo: { pokemonId: 'kakuna', requirement: { fire: 3 } },
  }),
  pokemonCard('pdf-t1-poliwag-01', 1, 'Poliwag', 'psychic', 0, { water: 2, electric: 1 }, {
    pokemonId: 'poliwag',
    species: 'Tadpole Pokemon',
    evolvesTo: { pokemonId: 'poliwhirl', requirement: { grass: 2 } },
  }),
  pokemonCard('pdf-t1-nidoran-f-01', 1, 'Nidoran F', 'electric', 0, { fire: 2, psychic: 1 }, {
    pokemonId: 'nidoran-f',
    species: 'Poison Pin Pokemon',
    evolvesTo: { pokemonId: 'nidorina', requirement: { water: 2 } },
  }),
  pokemonCard('pdf-t1-pidgey-01', 1, 'Pidgey', 'water', 0, { grass: 1, electric: 2 }, {
    pokemonId: 'pidgey',
    species: 'Tiny Bird Pokemon',
    evolvesTo: { pokemonId: 'pidgeotto', requirement: { fire: 2 } },
  }),
  pokemonCard('pdf-t1-machop-01', 1, 'Machop', 'fire', 0, { water: 1, grass: 1, electric: 1, psychic: 1 }, {
    pokemonId: 'machop',
    species: 'Superpower Pokemon',
    evolvesTo: { pokemonId: 'machoke', requirement: { electric: 3 } },
  }),

  pokemonCard('pdf-t1-oddish-01', 1, 'Oddish', 'grass', 0, { fire: 1, psychic: 2 }, {
    pokemonId: 'oddish',
    species: 'Weed Pokemon',
    evolvesTo: { pokemonId: 'gloom', requirement: { electric: 2 } },
  }),
  pokemonCard('pdf-t1-abra-01', 1, 'Abra', 'psychic', 1, { psychic: 4 }, {
    pokemonId: 'abra',
    species: 'Psi Pokemon',
    evolvesTo: { pokemonId: 'kadabra', requirement: { fire: 3 } },
  }),
  pokemonCard('pdf-t1-gastly-01', 1, 'Gastly', 'electric', 0, { fire: 1, water: 1, grass: 1, psychic: 1 }, {
    pokemonId: 'gastly',
    species: 'Gas Pokemon',
    evolvesTo: { pokemonId: 'haunter', requirement: { grass: 3 } },
  }),
  pokemonCard('pdf-t1-geodude-01', 1, 'Geodude', 'water', 0, { fire: 1, grass: 1, electric: 1, psychic: 1 }, {
    pokemonId: 'geodude',
    species: 'Rock Pokemon',
    evolvesTo: { pokemonId: 'graveler', requirement: { psychic: 3 } },
  }),
  pokemonCard('pdf-t1-bellsprout-01', 1, 'Bellsprout', 'fire', 0, { water: 1, grass: 2 }, {
    pokemonId: 'bellsprout',
    species: 'Flower Pokemon',
    evolvesTo: { pokemonId: 'weepinbell', requirement: { psychic: 2 } },
  }),
  pokemonCard('pdf-t1-bellsprout-02', 1, 'Bellsprout', 'fire', 0, { fire: 2, psychic: 2 }, {
    pokemonId: 'bellsprout',
    species: 'Flower Pokemon',
    evolvesTo: { pokemonId: 'weepinbell', requirement: { psychic: 2 } },
  }),
  pokemonCard('pdf-t1-pidgey-02', 1, 'Pidgey', 'water', 0, { fire: 2, water: 2 }, {
    pokemonId: 'pidgey',
    species: 'Tiny Bird Pokemon',
    evolvesTo: { pokemonId: 'pidgeotto', requirement: { fire: 2 } },
  }),
  pokemonCard('pdf-t1-nidoran-f-02', 1, 'Nidoran F', 'electric', 0, { water: 2, electric: 2 }, {
    pokemonId: 'nidoran-f',
    species: 'Poison Pin Pokemon',
    evolvesTo: { pokemonId: 'nidorina', requirement: { water: 2 } },
  }),
  pokemonCard('pdf-t1-poliwag-02', 1, 'Poliwag', 'psychic', 0, { grass: 2, psychic: 2 }, {
    pokemonId: 'poliwag',
    species: 'Tadpole Pokemon',
    evolvesTo: { pokemonId: 'poliwhirl', requirement: { grass: 2 } },
  }),
  pokemonCard('pdf-t1-machop-02', 1, 'Machop', 'fire', 0, { grass: 1, electric: 2, psychic: 1 }, {
    pokemonId: 'machop',
    species: 'Superpower Pokemon',
    evolvesTo: { pokemonId: 'machoke', requirement: { electric: 3 } },
  }),

  pokemonCard('pdf-t1-oddish-02', 1, 'Oddish', 'grass', 0, { grass: 2, electric: 2 }, {
    pokemonId: 'oddish',
    species: 'Weed Pokemon',
    evolvesTo: { pokemonId: 'gloom', requirement: { electric: 2 } },
  }),
  pokemonCard('pdf-t1-abra-02', 1, 'Abra', 'psychic', 1, { water: 3, electric: 2 }, {
    pokemonId: 'abra',
    species: 'Psi Pokemon',
    evolvesTo: { pokemonId: 'kadabra', requirement: { fire: 3 } },
  }),
  pokemonCard('pdf-t1-gastly-02', 1, 'Gastly', 'electric', 0, { fire: 1, grass: 1, psychic: 2 }, {
    pokemonId: 'gastly',
    species: 'Gas Pokemon',
    evolvesTo: { pokemonId: 'haunter', requirement: { grass: 3 } },
  }),
  pokemonCard('pdf-t1-geodude-02', 1, 'Geodude', 'water', 0, { fire: 2, water: 1, electric: 1 }, {
    pokemonId: 'geodude',
    species: 'Rock Pokemon',
    evolvesTo: { pokemonId: 'graveler', requirement: { psychic: 3 } },
  }),
  pokemonCard('pdf-t1-dratini-02', 1, 'Dratini', 'grass', 1, { fire: 2, electric: 3 }, {
    pokemonId: 'dratini',
    species: 'Dragon Pokemon',
    evolvesTo: { pokemonId: 'dragonair', requirement: { water: 3 } },
  }),
  pokemonCard('pdf-t1-caterpie-02', 1, 'Caterpie', 'psychic', 0, { water: 1, grass: 2, electric: 1 }, {
    pokemonId: 'caterpie',
    species: 'Worm Pokemon',
    evolvesTo: { pokemonId: 'metapod', requirement: { water: 3 } },
  }),
  pokemonCard('pdf-t1-bulbasaur-02', 1, 'Bulbasaur', 'electric', 1, { fire: 3, grass: 2 }, {
    pokemonId: 'bulbasaur',
    species: 'Seed Pokemon',
    evolvesTo: { pokemonId: 'ivysaur', requirement: { psychic: 3 } },
  }),
  pokemonCard('pdf-t1-charmander-02', 1, 'Charmander', 'water', 1, { grass: 3, psychic: 2 }, {
    pokemonId: 'charmander',
    species: 'Lizard Pokemon',
    evolvesTo: { pokemonId: 'charmeleon', requirement: { electric: 3 } },
  }),
  pokemonCard('pdf-t1-squirtle-02', 1, 'Squirtle', 'fire', 1, { water: 2, psychic: 3 }, {
    pokemonId: 'squirtle',
    species: 'Tiny Turtle Pokemon',
    evolvesTo: { pokemonId: 'wartortle', requirement: { grass: 3 } },
  }),
  pokemonCard('pdf-t1-weedle-02', 1, 'Weedle', 'grass', 0, { fire: 1, water: 2, psychic: 1 }, {
    pokemonId: 'weedle',
    species: 'Hairy Bug Pokemon',
    evolvesTo: { pokemonId: 'kakuna', requirement: { fire: 3 } },
  }),

  pokemonCard('pdf-t1-bellsprout-03', 1, 'Bellsprout', 'fire', 0, { electric: 3 }, {
    pokemonId: 'bellsprout',
    species: 'Flower Pokemon',
    evolvesTo: { pokemonId: 'weepinbell', requirement: { psychic: 2 } },
  }),
  pokemonCard('pdf-t1-pidgey-03', 1, 'Pidgey', 'water', 0, { psychic: 3 }, {
    pokemonId: 'pidgey',
    species: 'Tiny Bird Pokemon',
    evolvesTo: { pokemonId: 'pidgeotto', requirement: { fire: 2 } },
  }),
  pokemonCard('pdf-t1-nidoran-f-03', 1, 'Nidoran F', 'electric', 0, { grass: 3 }, {
    pokemonId: 'nidoran-f',
    species: 'Poison Pin Pokemon',
    evolvesTo: { pokemonId: 'nidorina', requirement: { water: 2 } },
  }),
  pokemonCard('pdf-t1-poliwag-03', 1, 'Poliwag', 'psychic', 0, { fire: 3 }, {
    pokemonId: 'poliwag',
    species: 'Tadpole Pokemon',
    evolvesTo: { pokemonId: 'poliwhirl', requirement: { grass: 2 } },
  }),
  pokemonCard('pdf-t1-oddish-03', 1, 'Oddish', 'grass', 0, { water: 3 }, {
    pokemonId: 'oddish',
    species: 'Weed Pokemon',
    evolvesTo: { pokemonId: 'gloom', requirement: { electric: 2 } },
  }),

  pokemonCard('pdf-t2-dragonair-01', 2, 'Dragonair', 'grass', 3, { grass: 6 }, {
    pokemonId: 'dragonair',
    species: 'Dragon Pokemon',
    evolvesTo: { pokemonId: 'dragonite', requirement: { electric: 4 } },
  }),
  pokemonCard('pdf-t2-metapod-01', 2, 'Metapod', 'psychic', 2, { psychic: 5, grass: 2 }, {
    pokemonId: 'metapod',
    species: 'Cocoon Pokemon',
    evolvesTo: { pokemonId: 'butterfree', requirement: { electric: 3 } },
  }),
  pokemonCard('pdf-t2-ivysaur-01', 2, 'Ivysaur', 'electric', 3, { electric: 6 }, {
    pokemonId: 'ivysaur',
    species: 'Seed Pokemon',
    evolvesTo: { pokemonId: 'venusaur', requirement: { water: 4 } },
  }),
  pokemonCard('pdf-t2-charmeleon-01', 2, 'Charmeleon', 'water', 3, { water: 6 }, {
    pokemonId: 'charmeleon',
    species: 'Flame Pokemon',
    evolvesTo: { pokemonId: 'charizard', requirement: { fire: 4 } },
  }),
  pokemonCard('pdf-t2-wartortle-01', 2, 'Wartortle', 'fire', 3, { fire: 6 }, {
    pokemonId: 'wartortle',
    species: 'Turtle Pokemon',
    evolvesTo: { pokemonId: 'blastoise', requirement: { psychic: 4 } },
  }),
  pokemonCard('pdf-t2-kakuna-01', 2, 'Kakuna', 'grass', 2, { grass: 5, electric: 2 }, {
    pokemonId: 'kakuna',
    species: 'Cocoon Pokemon',
    evolvesTo: { pokemonId: 'beedrill', requirement: { psychic: 3 } },
  }),
  pokemonCard('pdf-t2-poliwhirl-01', 2, 'Poliwhirl', 'psychic', 1, { psychic: 3, water: 2, electric: 2 }, {
    pokemonId: 'poliwhirl',
    species: 'Tadpole Pokemon',
    evolvesTo: { pokemonId: 'poliwrath', requirement: { grass: 4 } },
  }),
  pokemonCard('pdf-t2-nidorina-01', 2, 'Nidorina', 'electric', 1, { electric: 3, psychic: 2, fire: 2 }, {
    pokemonId: 'nidorina',
    species: 'Poison Pin Pokemon',
    evolvesTo: { pokemonId: 'nidoqueen', requirement: { water: 4 } },
  }),
  pokemonCard('pdf-t2-pidgeotto-01', 2, 'Pidgeotto', 'water', 1, { water: 3, psychic: 2, grass: 2 }, {
    pokemonId: 'pidgeotto',
    species: 'Bird Pokemon',
    evolvesTo: { pokemonId: 'pidgeot', requirement: { fire: 4 } },
  }),
  pokemonCard('pdf-t2-machoke-01', 2, 'Machoke', 'fire', 2, { fire: 5, psychic: 2 }, {
    pokemonId: 'machoke',
    species: 'Superpower Pokemon',
    evolvesTo: { pokemonId: 'machamp', requirement: { water: 3 } },
  }),

  pokemonCard('pdf-t2-gloom-01', 2, 'Gloom', 'grass', 1, { grass: 3, electric: 2, water: 2 }, {
    pokemonId: 'gloom',
    species: 'Weed Pokemon',
    evolvesTo: { pokemonId: 'vileplume', requirement: { electric: 4 } },
  }),
  pokemonCard('pdf-t2-kadabra-01', 2, 'Kadabra', 'psychic', 3, { psychic: 6 }, {
    pokemonId: 'kadabra',
    species: 'Psi Pokemon',
    evolvesTo: { pokemonId: 'alakazam', requirement: { grass: 4 } },
  }),
  pokemonCard('pdf-t2-haunter-01', 2, 'Haunter', 'electric', 2, { electric: 5, water: 2 }, {
    pokemonId: 'haunter',
    species: 'Gas Pokemon',
    evolvesTo: { pokemonId: 'gengar', requirement: { fire: 3 } },
  }),
  pokemonCard('pdf-t2-graveler-01', 2, 'Graveler', 'water', 2, { water: 5, fire: 2 }, {
    pokemonId: 'graveler',
    species: 'Rock Pokemon',
    evolvesTo: { pokemonId: 'golem', requirement: { grass: 3 } },
  }),
  pokemonCard('pdf-t2-weepinbell-01', 2, 'Weepinbell', 'fire', 1, { fire: 3, grass: 2, electric: 2 }, {
    pokemonId: 'weepinbell',
    species: 'Flycatcher Pokemon',
    evolvesTo: { pokemonId: 'victreebel', requirement: { psychic: 4 } },
  }),
  pokemonCard('pdf-t2-dragonair-02', 2, 'Dragonair', 'grass', 3, { water: 4, psychic: 4, electric: 1 }, {
    pokemonId: 'dragonair',
    species: 'Dragon Pokemon',
    evolvesTo: { pokemonId: 'dragonite', requirement: { electric: 4 } },
  }),
  pokemonCard('pdf-t2-metapod-02', 2, 'Metapod', 'psychic', 2, { water: 4, fire: 2, electric: 1 }, {
    pokemonId: 'metapod',
    species: 'Cocoon Pokemon',
    evolvesTo: { pokemonId: 'butterfree', requirement: { electric: 3 } },
  }),
  pokemonCard('pdf-t2-ivysaur-02', 2, 'Ivysaur', 'electric', 3, { psychic: 4, fire: 4, water: 1 }, {
    pokemonId: 'ivysaur',
    species: 'Seed Pokemon',
    evolvesTo: { pokemonId: 'venusaur', requirement: { water: 4 } },
  }),
  pokemonCard('pdf-t2-charmeleon-02', 2, 'Charmeleon', 'water', 3, { electric: 4, grass: 4, fire: 1 }, {
    pokemonId: 'charmeleon',
    species: 'Flame Pokemon',
    evolvesTo: { pokemonId: 'charizard', requirement: { fire: 4 } },
  }),
  pokemonCard('pdf-t2-wartortle-02', 2, 'Wartortle', 'fire', 3, { water: 4, grass: 4, psychic: 1 }, {
    pokemonId: 'wartortle',
    species: 'Turtle Pokemon',
    evolvesTo: { pokemonId: 'blastoise', requirement: { psychic: 4 } },
  }),

  pokemonCard('pdf-t2-kakuna-02', 2, 'Kakuna', 'grass', 2, { fire: 4, water: 2, psychic: 1 }, {
    pokemonId: 'kakuna',
    species: 'Cocoon Pokemon',
    evolvesTo: { pokemonId: 'beedrill', requirement: { psychic: 3 } },
  }),
  pokemonCard('pdf-t2-poliwhirl-02', 2, 'Poliwhirl', 'psychic', 1, { grass: 3, fire: 2, water: 2 }, {
    pokemonId: 'poliwhirl',
    species: 'Tadpole Pokemon',
    evolvesTo: { pokemonId: 'poliwrath', requirement: { grass: 4 } },
  }),
  pokemonCard('pdf-t2-nidorina-02', 2, 'Nidorina', 'electric', 1, { water: 3, psychic: 2, grass: 2 }, {
    pokemonId: 'nidorina',
    species: 'Poison Pin Pokemon',
    evolvesTo: { pokemonId: 'nidoqueen', requirement: { water: 4 } },
  }),
  pokemonCard('pdf-t2-pidgeotto-02', 2, 'Pidgeotto', 'water', 1, { fire: 3, psychic: 2, electric: 2 }, {
    pokemonId: 'pidgeotto',
    species: 'Bird Pokemon',
    evolvesTo: { pokemonId: 'pidgeot', requirement: { fire: 4 } },
  }),
  pokemonCard('pdf-t2-machoke-02', 2, 'Machoke', 'fire', 2, { electric: 4, grass: 2, water: 1 }, {
    pokemonId: 'machoke',
    species: 'Superpower Pokemon',
    evolvesTo: { pokemonId: 'machamp', requirement: { water: 3 } },
  }),
  pokemonCard('pdf-t2-kadabra-02', 2, 'Kadabra', 'psychic', 3, { fire: 4, electric: 4, grass: 1 }, {
    pokemonId: 'kadabra',
    species: 'Psi Pokemon',
    evolvesTo: { pokemonId: 'alakazam', requirement: { grass: 4 } },
  }),
  pokemonCard('pdf-t2-haunter-02', 2, 'Haunter', 'electric', 2, { grass: 4, psychic: 2, fire: 1 }, {
    pokemonId: 'haunter',
    species: 'Gas Pokemon',
    evolvesTo: { pokemonId: 'gengar', requirement: { fire: 3 } },
  }),
  pokemonCard('pdf-t2-graveler-02', 2, 'Graveler', 'water', 2, { psychic: 4, electric: 2, grass: 1 }, {
    pokemonId: 'graveler',
    species: 'Rock Pokemon',
    evolvesTo: { pokemonId: 'golem', requirement: { grass: 3 } },
  }),
  pokemonCard('pdf-t2-weepinbell-02', 2, 'Weepinbell', 'fire', 1, { psychic: 3, grass: 2, electric: 2 }, {
    pokemonId: 'weepinbell',
    species: 'Flycatcher Pokemon',
    evolvesTo: { pokemonId: 'victreebel', requirement: { psychic: 4 } },
  }),
  pokemonCard('pdf-t2-gloom-02', 2, 'Gloom', 'grass', 1, { electric: 3, fire: 2, water: 2 }, {
    pokemonId: 'gloom',
    species: 'Weed Pokemon',
    evolvesTo: { pokemonId: 'vileplume', requirement: { electric: 4 } },
  }),

  pokemonCard('pdf-t3-dragonite-01', 3, 'Dragonite', 'grass', 5, { psychic: 7, water: 3 }, { pokemonId: 'dragonite', species: 'Dragon Pokemon' }),
  pokemonCard('pdf-t3-butterfree-01', 3, 'Butterfree', 'psychic', 4, { water: 6, grass: 4 }, { pokemonId: 'butterfree', species: 'Butterfly Pokemon' }),
  pokemonCard('pdf-t3-venusaur-01', 3, 'Venusaur', 'electric', 5, { fire: 7, psychic: 3 }, { pokemonId: 'venusaur', species: 'Seed Pokemon' }),
  pokemonCard('pdf-t3-charizard-01', 3, 'Charizard', 'water', 5, { grass: 7, electric: 3 }, { pokemonId: 'charizard', species: 'Flame Pokemon' }),
  pokemonCard('pdf-t3-blastoise-01', 3, 'Blastoise', 'fire', 5, { water: 7, grass: 3 }, { pokemonId: 'blastoise', species: 'Shellfish Pokemon' }),
  pokemonCard('pdf-t3-beedrill-01', 3, 'Beedrill', 'grass', 4, { fire: 6, electric: 4 }, { pokemonId: 'beedrill', species: 'Poison Bee Pokemon' }),
  pokemonCard('pdf-t3-poliwrath-01', 3, 'Poliwrath', 'psychic', 3, { psychic: 5, electric: 2, fire: 2 }, { pokemonId: 'poliwrath', species: 'Tadpole Pokemon' }),
  pokemonCard('pdf-t3-nidoqueen-01', 3, 'Nidoqueen', 'electric', 3, { electric: 5, psychic: 2, fire: 2 }, { pokemonId: 'nidoqueen', species: 'Drill Pokemon' }),
  pokemonCard('pdf-t3-pidgeot-01', 3, 'Pidgeot', 'water', 3, { water: 5, grass: 2, electric: 2 }, { pokemonId: 'pidgeot', species: 'Bird Pokemon' }),
  pokemonCard('pdf-t3-machamp-01', 3, 'Machamp', 'fire', 4, { electric: 6, psychic: 4 }, { pokemonId: 'machamp', species: 'Superpower Pokemon' }),
  pokemonCard('pdf-t3-vileplume-01', 3, 'Vileplume', 'grass', 3, { grass: 5, water: 2, psychic: 2 }, { pokemonId: 'vileplume', species: 'Flower Pokemon' }),
  pokemonCard('pdf-t3-alakazam-01', 3, 'Alakazam', 'psychic', 5, { electric: 7, fire: 3 }, { pokemonId: 'alakazam', species: 'Psi Pokemon' }),
  pokemonCard('pdf-t3-gengar-01', 3, 'Gengar', 'electric', 4, { grass: 6, water: 4 }, { pokemonId: 'gengar', species: 'Shadow Pokemon' }),
  pokemonCard('pdf-t3-golem-01', 3, 'Golem', 'water', 4, { psychic: 6, fire: 4 }, { pokemonId: 'golem', species: 'Megaton Pokemon' }),
  pokemonCard('pdf-t3-victreebel-01', 3, 'Victreebel', 'fire', 3, { fire: 5, grass: 2, water: 2 }, { pokemonId: 'victreebel', species: 'Flycatcher Pokemon' }),

  pokemonCard('pdf-rare-eevee', 3, 'Eevee', 'grass', 0, { psychic: 1, electric: 3, fire: 2 }, {
    pokemonId: 'eevee',
    species: 'Evolution Pokemon',
    bonusValue: 2,
    specialRank: 'rare',
    requiresPrism: true,
  }),
  pokemonCard('pdf-rare-snorlax', 3, 'Snorlax', 'psychic', 0, { psychic: 1, fire: 3, grass: 2 }, {
    pokemonId: 'snorlax',
    species: 'Sleeping Pokemon',
    bonusValue: 2,
    specialRank: 'rare',
    requiresPrism: true,
  }),
  pokemonCard('pdf-rare-aerodactyl', 3, 'Aerodactyl', 'electric', 0, { psychic: 1, water: 3, fire: 2 }, {
    pokemonId: 'aerodactyl',
    species: 'Fossil Pokemon',
    bonusValue: 2,
    specialRank: 'rare',
    requiresPrism: true,
  }),
  pokemonCard('pdf-rare-ditto', 3, 'Ditto', 'water', 0, { psychic: 1, grass: 3, electric: 2 }, {
    pokemonId: 'ditto',
    species: 'Transform Pokemon',
    bonusValue: 2,
    specialRank: 'rare',
    requiresPrism: true,
  }),
  pokemonCard('pdf-rare-lapras', 3, 'Lapras', 'fire', 0, { psychic: 1, grass: 3, water: 2 }, {
    pokemonId: 'lapras',
    species: 'Transport Pokemon',
    bonusValue: 2,
    specialRank: 'rare',
    requiresPrism: true,
  }),

  pokemonCard('pdf-legendary-mewtwo', 3, 'Mewtwo', 'grass', 2, { psychic: 3, fire: 3, water: 3 }, {
    pokemonId: 'mewtwo',
    species: 'Genetic Pokemon',
    bonusValue: 2,
    specialRank: 'legendary',
    requiresPrism: true,
  }),
  pokemonCard('pdf-legendary-moltres', 3, 'Moltres', 'psychic', 2, { water: 3, electric: 3, grass: 3 }, {
    pokemonId: 'moltres',
    species: 'Flame Pokemon',
    bonusValue: 2,
    specialRank: 'legendary',
    requiresPrism: true,
  }),
  pokemonCard('pdf-legendary-articuno', 3, 'Articuno', 'electric', 2, { fire: 3, psychic: 3, grass: 3 }, {
    pokemonId: 'articuno',
    species: 'Freeze Pokemon',
    bonusValue: 2,
    specialRank: 'legendary',
    requiresPrism: true,
  }),
  pokemonCard('pdf-legendary-mew', 3, 'Mew', 'water', 2, { grass: 3, electric: 3, fire: 3 }, {
    pokemonId: 'mew',
    species: 'New Species Pokemon',
    bonusValue: 2,
    specialRank: 'legendary',
    requiresPrism: true,
  }),
  pokemonCard('pdf-legendary-zapdos', 3, 'Zapdos', 'fire', 2, { psychic: 3, water: 3, electric: 3 }, {
    pokemonId: 'zapdos',
    species: 'Electric Pokemon',
    bonusValue: 2,
    specialRank: 'legendary',
    requiresPrism: true,
  }),
];

export const GYM_LEADERS: GymLeader[] = [];
