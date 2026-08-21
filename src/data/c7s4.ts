/**
 * Fortnite Chapter 7 Season 4 — Override sprite catalog (launch roster).
 * Source: fortnite.gg + Epic / Polygon / esports.gg (Aug 2026).
 * Variants at launch: Base, Gold, Cheat Master (36 sprites).
 * Icons: https://fortnite.gg/img/x/sprites/icons/...
 */
import type {
  Rarity,
  SpriteEntry,
  SpriteFamily,
  Variant,
} from './sprites'

const ICON_BASE = 'https://fortnite.gg/img/x/sprites/icons'

const VARIANT_BONUS: Record<'gold' | 'cheat-master', string> = {
  gold: '3× bonus XP from eliminations',
  'cheat-master':
    'All inputs count as correct when entering world cheat codes',
}

/** Reduced dust costs vs C7S3 (Epic QoL for Override). */
const SPECIAL_SUMMON: Record<Exclude<Rarity, 'special'>, number> = {
  rare: 3000,
  epic: 4500,
  legendary: 7500,
  mythic: 11000,
}

const FAMILIES: SpriteFamily[] = [
  {
    id: 'killswitch',
    name: 'Killswitch',
    rarity: 'epic',
    ability: 'Enter Hangtime with improved accuracy',
    summonCost: 3000,
    sortOrder: 0,
  },
  {
    id: 'crown',
    name: 'Crown',
    rarity: 'mythic',
    ability:
      'Gain extra Crown Wins after a Victory Royale. Level up only by winning matches',
    summonCost: 7500,
    sortOrder: 1,
  },
  {
    id: 'jonesy',
    name: 'Jonesy',
    rarity: 'rare',
    ability:
      'After a short duration, recover some Health or Shield after being damaged',
    summonCost: 100,
    sortOrder: 2,
  },
  {
    id: 'klombo',
    name: 'Klombo',
    rarity: 'mythic',
    ability:
      'Grants random items at each level. Level up only by using Health/Shield consumables',
    summonCost: 7500,
    sortOrder: 3,
    location: 'Very rare find',
  },
  {
    id: 'tails',
    name: 'Tails',
    rarity: 'epic',
    ability: 'Hover with the help of Tails',
    summonCost: 3000,
    sortOrder: 4,
  },
  {
    id: 'sonic',
    name: 'Sonic',
    rarity: 'epic',
    ability: 'Gotta Go Fast! Sprint faster',
    summonCost: 3000,
    sortOrder: 5,
  },
  {
    id: '8-bit',
    name: '8-Bit',
    rarity: 'rare',
    ability:
      'Find an 8-Bit Shotgun in your first chest and gain a score multiplier for it',
    summonCost: 100,
    sortOrder: 6,
  },
  {
    id: 'jackrabbit',
    name: 'Jackrabbit',
    rarity: 'legendary',
    ability: 'Perform another jump while mid-air',
    summonCost: 4500,
    sortOrder: 7,
  },
  {
    id: 'adventure',
    name: 'Adventure',
    rarity: 'rare',
    ability: 'Upgrade a random item in your inventory at each level',
    summonCost: 100,
    sortOrder: 8,
  },
  {
    id: 'shadow',
    name: 'Shadow',
    rarity: 'epic',
    ability:
      'Automatically reload weapons over time, even when unequipped',
    summonCost: 3000,
    sortOrder: 9,
  },
  {
    id: 'bush',
    name: 'Bush',
    rarity: 'rare',
    ability:
      'Spawns a Bush on you after a duration. At max Level, gain a Bush on elimination',
    summonCost: 100,
    sortOrder: 10,
  },
  {
    id: 'storm-scout',
    name: 'Storm Scout',
    rarity: 'rare',
    ability:
      'Applies Overdrive after taking enough Storm damage; at max Level also reveals future storm circles',
    summonCost: 100,
    sortOrder: 11,
  },
]

type S4Variant = 'base' | 'gold' | 'cheat-master'

/** Drop rates unknown / event-driven at launch — use placeholders. */
const FAMILY_VARIANTS: Record<string, Partial<Record<S4Variant, number>>> = {
  jackrabbit: { base: 1, gold: 0.08, 'cheat-master': 0.05 },
  shadow: { base: 2, gold: 0.12, 'cheat-master': 0.08 },
  bush: { base: 4, gold: 0.2, 'cheat-master': 0.12 },
  tails: { base: 2, gold: 0.12, 'cheat-master': 0.08 },
  killswitch: { base: 2, gold: 0.12, 'cheat-master': 0.08 },
  adventure: { base: 4, gold: 0.2, 'cheat-master': 0.12 },
  klombo: { base: 0.15, gold: 0.02, 'cheat-master': 0.01 },
  jonesy: { base: 4, gold: 0.2, 'cheat-master': 0.12 },
  sonic: { base: 2, gold: 0.12, 'cheat-master': 0.08 },
  crown: { base: 0.15, gold: 0.02, 'cheat-master': 0.01 },
  '8-bit': { base: 4, gold: 0.2, 'cheat-master': 0.12 },
  'storm-scout': { base: 4, gold: 0.2, 'cheat-master': 0.12 },
}

const ICONS: Record<string, Partial<Record<S4Variant, string>>> = {
  jackrabbit: {
    base: 'T_Icon_BR_Creature_Sprite_JazzJackrabbit_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_JazzJackrabbit_Gold_L.webp',
    'cheat-master':
      'T_Icon_BR_Creature_Sprite_JazzJackrabbit_Cheatmaster_L.webp',
  },
  shadow: {
    base: 'T_Icon_BR_Creature_Sprite_NarrowFlea_Scribe_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_NarrowFlea_Scribe_Gold_L.webp',
    'cheat-master':
      'T_Icon_BR_Creature_Sprite_NarrowFlea_Scribe_Cheatmaster_L.webp',
  },
  bush: {
    base: 'T_Icon_BR_Creature_Sprite_BushRanger_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_BushRanger_Gold_L.webp',
    'cheat-master':
      'T_Icon_BR_Creature_Sprite_BushRanger_Cheatmaster_L.webp',
  },
  tails: {
    base: 'T_Icon_BR_Creature_Sprite_NarrowFlea_Monkey_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_NarrowFlea_Monkey_Gold_L.webp',
    'cheat-master':
      'T_Icon_BR_Creature_Sprite_NarrowFlea_Monkey_Cheatmaster_L.webp',
  },
  killswitch: {
    base: 'T_Icon_BR_Creature_Sprite_Killswitch_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Killswitch_Gold_L.webp',
    'cheat-master':
      'T_Icon_BR_Creature_Sprite_Killswitch_Cheatmaster_L.webp',
  },
  adventure: {
    base: 'T_Icon_BR_Creature_Sprite_Dwarf_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Dwarf_Gold_L.webp',
    'cheat-master': 'T_Icon_BR_Creature_Sprite_Dwarf_Cheatmaster_L.webp',
  },
  klombo: {
    base: 'T_Icon_BR_Creature_Sprite_Klombo_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Klombo_Gold_L.webp',
    'cheat-master': 'T_Icon_BR_Creature_Sprite_Klombo_Cheatmaster_L.webp',
  },
  jonesy: {
    base: 'T_Icon_BR_Creature_Sprite_Jonesy_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Jonesy_Gold_L.webp',
    'cheat-master': 'T_Icon_BR_Creature_Sprite_Jonesy_Cheatmaster_L.webp',
  },
  sonic: {
    base: 'T_Icon_BR_Creature_Sprite_NarrowFlea_Obsidian_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_NarrowFlea_Obsidian_Gold_L.webp',
    'cheat-master':
      'T_Icon_BR_Creature_Sprite_NarrowFlea_Obsidian_Cheatmaster_L.webp',
  },
  crown: {
    base: 'T_Icon_BR_Creature_Sprite_Crown_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Crown_Gold_L.webp',
    'cheat-master': 'T_Icon_BR_Creature_Sprite_Crown_Cheatmaster_L.webp',
  },
  '8-bit': {
    base: 'T_Icon_BR_Creature_Sprite_EightBitBlaster_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_EightBitBlaster_Gold_L.webp',
    'cheat-master':
      'T_Icon_BR_Creature_Sprite_EightBitBlaster_Cheatmaster_L.webp',
  },
  'storm-scout': {
    base: 'T_Icon_BR_Creature_Sprite_StormScout_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_StormScout_Gold_L.webp',
    'cheat-master':
      'T_Icon_BR_Creature_Sprite_StormScout_Cheatmaster_L.webp',
  },
}

function capitalizeVariant(v: S4Variant): string {
  if (v === 'cheat-master') return 'Cheat Master'
  return v.charAt(0).toUpperCase() + v.slice(1)
}

function iconUrl(familyId: string, variant: S4Variant): string {
  const file = ICONS[familyId]?.[variant] ?? ICONS[familyId]?.base
  return file
    ? `${ICON_BASE}/${file}`
    : `${ICON_BASE}/T_Icon_BR_Creature_Sprite_JazzJackrabbit_L.webp`
}

function buildCatalog(): SpriteEntry[] {
  const entries: SpriteEntry[] = []
  for (const family of FAMILIES) {
    const variants = FAMILY_VARIANTS[family.id]
    if (!variants) continue
    for (const [variant, dropRate] of Object.entries(variants) as [
      S4Variant,
      number,
    ][]) {
      const isBase = variant === 'base'
      const id = isBase ? family.id : `${variant}-${family.id}`
      const name = isBase
        ? `${family.name} Sprite`
        : `${capitalizeVariant(variant)} ${family.name} Sprite`
      const rarity: Rarity = isBase ? family.rarity : 'special'
      const summonCost = isBase
        ? family.summonCost
        : SPECIAL_SUMMON[family.rarity]
      entries.push({
        id,
        familyId: family.id,
        name,
        variant: variant as Variant,
        rarity,
        familyRarity: family.rarity,
        dropRate,
        ability: family.ability,
        variantBonus: isBase ? undefined : VARIANT_BONUS[variant],
        summonCost,
        sortOrder: family.sortOrder,
        imageUrl: iconUrl(family.id, variant),
      })
    }
  }
  return entries
}

export const C7S4_FAMILIES = FAMILIES
export const C7S4_SPRITES: SpriteEntry[] = buildCatalog()
export const C7S4_VARIANT_ORDER: Variant[] = ['base', 'gold', 'cheat-master']
