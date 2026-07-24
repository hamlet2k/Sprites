/**
 * Fortnite Chapter 7 Season 3 — Sprite catalog
 * Data compiled from fortnite.gg/sprites, IGN checklist, Fortnite Wiki (as of 2026-07-24).
 * 91 collectible sprite combinations currently tracked.
 */

export type Rarity = 'rare' | 'epic' | 'legendary' | 'mythic' | 'special'
export type Variant =
  | 'base'
  | 'gold'
  | 'gummy'
  | 'galaxy'
  | 'holofoil'
  | 'cube'
  | 'gem'
  | 'quack'

export interface SpriteFamily {
  id: string
  name: string
  rarity: Exclude<Rarity, 'special'>
  ability: string
  /** Base summon cost in Sprite Dust (special variants cost more). */
  summonCost: number
  location?: string
}

export interface SpriteEntry {
  id: string
  familyId: string
  name: string
  variant: Variant
  /** Display rarity: base uses family rarity; variants are "special". */
  rarity: Rarity
  /** Approximate drop rate % (0 = extremely rare / event / unknown). Used for difficulty scoring. */
  dropRate: number
  ability: string
  variantBonus?: string
  summonCost: number
}

const VARIANT_BONUS: Record<Exclude<Variant, 'base'>, string> = {
  gold: '3× bonus XP from eliminations',
  gummy: 'Bonus Sprite Dust on extraction',
  galaxy: 'Bonus ammo when looting',
  holofoil: '+5% chance to find rare Sprite variants in chests (squad)',
  cube: 'Overdrive while in the Storm / extra shield on level-up',
  gem: '30% less fall damage (upcoming)',
  quack: 'Special Quack themed variant',
}

/** Special-variant summon multiplier vs base (approx. from community guides). */
const SPECIAL_SUMMON: Record<Exclude<Rarity, 'special'>, number> = {
  rare: 4000,
  epic: 6000,
  legendary: 10000,
  mythic: 15000,
}

const FAMILIES: SpriteFamily[] = [
  {
    id: 'water',
    name: 'Water',
    rarity: 'rare',
    ability: 'Replenishes Shield for you and squadmates while in water',
    summonCost: 100,
    location: 'Rivers, beaches, water POIs',
  },
  {
    id: 'earth',
    name: 'Earth',
    rarity: 'rare',
    ability: 'Increased chance to find additional rare items in chests',
    summonCost: 100,
    location: 'Forests, wooded regions',
  },
  {
    id: 'fire',
    name: 'Fire',
    rarity: 'rare',
    ability: 'Creates a fire burst after dealing enough damage to an enemy',
    summonCost: 100,
    location: 'Urban areas',
  },
  {
    id: 'fishy',
    name: 'Fishy',
    rarity: 'rare',
    ability: 'Increased swim speed; speed boost after taking damage',
    summonCost: 100,
    location: 'Water and mountainous areas',
  },
  {
    id: 'air',
    name: 'Air',
    rarity: 'rare',
    ability: 'Increased jump height and sprint speed; removes fall damage',
    summonCost: 100,
    location: 'High / mountainous areas',
  },
  {
    id: 'duck',
    name: 'Duck',
    rarity: 'epic',
    ability: 'Emoting or jamming replenishes Shield',
    summonCost: 3000,
    location: 'Cluster Coast / mogul vault',
  },
  {
    id: 'ghost',
    name: 'Ghost',
    rarity: 'epic',
    ability: 'Grants cloak for a short duration upon reloading',
    summonCost: 3000,
    location: 'World at nighttime',
  },
  {
    id: 'demon',
    name: 'Demon',
    rarity: 'epic',
    ability: 'Siphon Health and Shield on elimination',
    summonCost: 3000,
  },
  {
    id: 'king',
    name: 'King',
    rarity: 'epic',
    ability: 'Increases Pickaxe damage',
    summonCost: 3000,
  },
  {
    id: 'aura',
    name: 'Aura',
    rarity: 'epic',
    ability: 'Shock Rock charge after dealing enough damage (shockwave effect)',
    summonCost: 3000,
    location: 'High / mountainous areas',
  },
  {
    id: 'striker',
    name: 'Striker',
    rarity: 'epic',
    ability: 'Brief Overdrive when you mantle, hurdle, or wall scramble',
    summonCost: 3000,
    location: 'Soccer pitch POI',
  },
  {
    id: 'dream',
    name: 'Dream',
    rarity: 'legendary',
    ability:
      'Random item each level-up; at Level 5 explodes with Legendary loot, auto-extracts, resets to 1',
    summonCost: 5000,
    location: 'Storage crates',
  },
  {
    id: 'punk',
    name: 'Punk',
    rarity: 'legendary',
    ability: 'At Level 5, can grant infinite ammo buff',
    summonCost: 5000,
  },
  {
    id: 'boss',
    name: 'Boss',
    rarity: 'legendary',
    ability: 'Increases max Health and Shield',
    summonCost: 5000,
    location: 'After defeating a powerful adversary',
  },
  {
    id: 'seven',
    name: 'Seven',
    rarity: 'legendary',
    ability: "Reveals opponents' foot trails for a few seconds",
    summonCost: 5000,
    location: 'High / mountainous areas',
  },
  {
    id: 'zero-point',
    name: 'Zero Point',
    rarity: 'mythic',
    ability: 'Shield Bubble Jr. when you use a healing item on yourself',
    summonCost: 7500,
  },
  {
    id: 'burnt-peanut',
    name: 'Burnt Peanut',
    rarity: 'mythic',
    ability: 'Chance of extra rare loot (sometimes Mythic) on eliminations',
    summonCost: 7500,
    location: 'Relic Chests',
  },
  {
    id: 'grim',
    name: 'Grim',
    rarity: 'mythic',
    ability: 'Players who damage you become marked for a short duration',
    summonCost: 7500,
  },
  {
    id: 'batman',
    name: 'Batman',
    rarity: 'mythic',
    ability: 'Bat Cape — boosted midair glide',
    summonCost: 7500,
    location: 'Sprite chests or DC boss duels',
  },
  {
    id: 'vini-jr',
    name: 'Vini Jr.',
    rarity: 'mythic',
    ability:
      'Sprinting enables damaging slide; slide into enemies boosts reload and fire rate',
    summonCost: 7500,
    location: 'Relic Chests',
  },
  {
    id: 'pollo',
    name: 'Pollo',
    rarity: 'mythic',
    ability: "Slowly replenishes Shield for you and teammates after an elimination",
    summonCost: 7500,
    location: 'Primarily trade / player drops',
  },
]

/** Variants known live for each family (from fortnite.gg, July 2026). */
const FAMILY_VARIANTS: Record<
  string,
  Partial<Record<Variant, number>>
> = {
  // drop rates from fortnite.gg (approximate %)
  water: { base: 13.92, gold: 0.75, gummy: 0.62, galaxy: 0.5, holofoil: 0.25 },
  earth: { base: 13.92, gold: 0.75, gummy: 0.62, galaxy: 0.5, cube: 0.01 },
  fire: {
    base: 13.92,
    gold: 0.75,
    gummy: 0.62,
    galaxy: 0.5,
    holofoil: 0.25,
    cube: 0.01,
  },
  fishy: { base: 13.79, gold: 0.75, gummy: 0.62, galaxy: 0.5, cube: 0.01 },
  air: { base: 10, gold: 0.75, gummy: 0.62, galaxy: 0.5, holofoil: 0.25 },
  duck: { base: 9, gold: 0.4, gummy: 0.3, galaxy: 0.16 },
  ghost: { base: 9, gold: 0.4, gummy: 0.3, galaxy: 0.16, holofoil: 0.06 },
  demon: { base: 9, gold: 0.4, gummy: 0.3, galaxy: 0.16 },
  king: { base: 9, gold: 0.4, gummy: 0.3, galaxy: 0.16, holofoil: 0.06 },
  aura: { base: 6.98, gold: 0.31, gummy: 0.23, galaxy: 0.12 },
  striker: { base: 6.98, gold: 0.31, gummy: 0.23, galaxy: 0.12, holofoil: 0.05 },
  dream: { base: 6.98, gold: 0.31, gummy: 0.23, galaxy: 0.12, cube: 0.01 },
  punk: { base: 6.98, gold: 0.31, gummy: 0.23, galaxy: 0.12, cube: 0.01 },
  boss: { base: 6.98, gold: 0.31, gummy: 0.23, galaxy: 0.12, cube: 0.01 },
  seven: { base: 6.98, gold: 0.31, gummy: 0.23, galaxy: 0.12, holofoil: 0.05 },
  'zero-point': {
    base: 0.00093,
    gold: 0.000041,
    gummy: 0.000031,
    galaxy: 0.000016,
  },
  'burnt-peanut': { base: 0.5 },
  grim: {
    base: 0.09,
    gold: 0.01,
    gummy: 0.008,
    galaxy: 0.005,
    cube: 0.001,
  },
  batman: {
    base: 2.23,
    gold: 0.1,
    gummy: 0.07,
    galaxy: 0.04,
    holofoil: 0.01,
    cube: 0.005,
  },
  'vini-jr': { base: 0.3 },
  pollo: { base: 0.05 },
}

function buildCatalog(): SpriteEntry[] {
  const entries: SpriteEntry[] = []
  for (const family of FAMILIES) {
    const variants = FAMILY_VARIANTS[family.id]
    if (!variants) continue
    for (const [variant, dropRate] of Object.entries(variants) as [
      Variant,
      number,
    ][]) {
      const isBase = variant === 'base'
      const id = isBase ? family.id : `${variant}-${family.id}`
      const name = isBase ? `${family.name} Sprite` : `${capitalize(variant)} ${family.name} Sprite`
      const rarity: Rarity = isBase ? family.rarity : 'special'
      const summonCost = isBase
        ? family.summonCost
        : SPECIAL_SUMMON[family.rarity]
      entries.push({
        id,
        familyId: family.id,
        name,
        variant,
        rarity,
        dropRate,
        ability: family.ability,
        variantBonus: isBase ? undefined : VARIANT_BONUS[variant],
        summonCost,
      })
    }
  }
  return entries
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const SPRITE_FAMILIES = FAMILIES
export const SPRITES: SpriteEntry[] = buildCatalog()
export const SPRITE_BY_ID = Object.fromEntries(SPRITES.map((s) => [s.id, s]))

/** Higher = harder to find. Uses inverse log drop rate. */
export function difficultyScore(sprite: SpriteEntry): number {
  const rate = Math.max(sprite.dropRate, 0.000001)
  // Log scale so ultra-rares dominate without ignoring mid-tier
  return Math.log10(100 / rate) * 10 + rarityWeight(sprite)
}

function rarityWeight(sprite: SpriteEntry): number {
  if (sprite.variant !== 'base') {
    const v: Record<Variant, number> = {
      base: 0,
      gold: 8,
      gummy: 10,
      galaxy: 14,
      holofoil: 18,
      cube: 20,
      gem: 22,
      quack: 24,
    }
    return v[sprite.variant] + familyRarityWeight(sprite.familyId)
  }
  return familyRarityWeight(sprite.familyId)
}

function familyRarityWeight(familyId: string): number {
  const f = FAMILIES.find((x) => x.id === familyId)
  if (!f) return 0
  return { rare: 1, epic: 4, legendary: 8, mythic: 14 }[f.rarity]
}

export const VARIANT_ORDER: Variant[] = [
  'base',
  'gold',
  'gummy',
  'galaxy',
  'holofoil',
  'cube',
  'gem',
  'quack',
]

export const RARITY_LABEL: Record<Rarity, string> = {
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  mythic: 'Mythic',
  special: 'Special',
}
