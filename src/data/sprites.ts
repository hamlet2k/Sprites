/**
 * Fortnite Chapter 7 Season 3 — Sprite catalog
 * Type order matches in-game collection (fortnite.gg / client), Aug 2026.
 * Icons: https://fortnite.gg/img/x/sprites/icons/...
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
  /** C7S4 Override — easier cheat-code entry */
  | 'cheat-master'

export type SortMode = 'type' | 'rarity' | 'dust'

export interface SpriteFamily {
  id: string
  name: string
  rarity: Exclude<Rarity, 'special'>
  ability: string
  /** Base summon cost in Sprite Dust (special variants cost more). */
  summonCost: number
  /** In-game catalog order (lower = earlier). */
  sortOrder: number
  location?: string
}

export interface SpriteEntry {
  id: string
  familyId: string
  name: string
  variant: Variant
  /** Display rarity of this specific card (base = family tier; variants = special). */
  rarity: Rarity
  /** Family base rarity — used for name color so types stay recognizable. */
  familyRarity: Exclude<Rarity, 'special'>
  dropRate: number
  ability: string
  variantBonus?: string
  summonCost: number
  sortOrder: number
  /** Full URL to official icon art. */
  imageUrl: string
}

const ICON_BASE = 'https://fortnite.gg/img/x/sprites/icons'

const VARIANT_BONUS: Record<Exclude<Variant, 'base'>, string> = {
  gold: '3× bonus XP from eliminations',
  gummy: 'Bonus Sprite Dust on extraction',
  galaxy: 'Bonus ammo when looting',
  holofoil: '+5% chance to find rare Sprite variants in chests (squad)',
  cube: 'Overdrive while in the Storm / extra shield on level-up',
  gem: '30% less fall damage',
  quack: 'Special Quack themed variant',
  'cheat-master': 'All inputs count as correct when entering world cheat codes',
}

const SPECIAL_SUMMON: Record<Exclude<Rarity, 'special'>, number> = {
  rare: 4000,
  epic: 6000,
  legendary: 10000,
  mythic: 15000,
}

/**
 * In-game type order. Grim sits after Boss / before Air (catalog order on fortnite.gg;
 * user did not have Grim to confirm in-client).
 */
const FAMILIES: SpriteFamily[] = [
  {
    id: 'john-wick',
    name: 'John Wick',
    rarity: 'mythic',
    ability:
      'Knocking players reveals others nearby. Mark duration increases at each Level Up (3s → 5s)',
    summonCost: 6750,
    sortOrder: 0,
    location: 'Found rarely in Sprite Chests',
  },
  {
    id: 'batman',
    name: 'Batman',
    rarity: 'mythic',
    ability: 'Bat Cape — boosted midair glide',
    summonCost: 7500,
    sortOrder: 1,
    location: 'Sprite chests or DC boss duels',
  },
  {
    id: 'water',
    name: 'Water',
    rarity: 'rare',
    ability: 'Replenishes Shield for you and squadmates while in water',
    summonCost: 100,
    sortOrder: 2,
    location: 'Rivers, beaches, water POIs',
  },
  {
    id: 'earth',
    name: 'Earth',
    rarity: 'rare',
    ability: 'Increased chance to find additional rare items in chests',
    summonCost: 100,
    sortOrder: 3,
    location: 'Forests, wooded regions',
  },
  {
    id: 'fire',
    name: 'Fire',
    rarity: 'rare',
    ability: 'Creates a fire burst after dealing enough damage to an enemy',
    summonCost: 100,
    sortOrder: 4,
    location: 'Urban areas',
  },
  {
    id: 'duck',
    name: 'Duck',
    rarity: 'epic',
    ability: 'Emoting or jamming replenishes Shield',
    summonCost: 3000,
    sortOrder: 5,
    location: 'Cluster Coast / mogul vault',
  },
  {
    id: 'ghost',
    name: 'Ghost',
    rarity: 'epic',
    ability: 'Grants cloak for a short duration upon reloading',
    summonCost: 3000,
    sortOrder: 6,
    location: 'World at nighttime',
  },
  {
    id: 'dream',
    name: 'Dream',
    rarity: 'legendary',
    ability:
      'Random item each level-up; at Level 5 explodes with Legendary loot, auto-extracts, resets to 1',
    summonCost: 5000,
    sortOrder: 7,
    location: 'Storage crates',
  },
  {
    id: 'demon',
    name: 'Demon',
    rarity: 'epic',
    ability: 'Siphon Health and Shield on elimination',
    summonCost: 3000,
    sortOrder: 8,
  },
  {
    id: 'punk',
    name: 'Punk',
    rarity: 'legendary',
    ability: 'At Level 5, can grant infinite ammo buff',
    summonCost: 5000,
    sortOrder: 9,
  },
  {
    id: 'king',
    name: 'King',
    rarity: 'epic',
    ability: 'Increases Pickaxe damage',
    summonCost: 3000,
    sortOrder: 10,
  },
  {
    id: 'burnt-peanut',
    name: 'Burnt Peanut',
    rarity: 'mythic',
    ability: 'Chance of extra rare loot (sometimes Mythic) on eliminations',
    summonCost: 7500,
    sortOrder: 11,
    location: 'Relic Chests',
  },
  {
    id: 'vini-jr',
    name: 'Vini Jr.',
    rarity: 'mythic',
    ability:
      'Sprinting enables damaging slide; slide into enemies boosts reload and fire rate',
    summonCost: 7500,
    sortOrder: 12,
    location: 'Relic Chests',
  },
  {
    id: 'zero-point',
    name: 'Zero Point',
    rarity: 'mythic',
    ability: 'Shield Bubble Jr. when you use a healing item on yourself',
    summonCost: 7500,
    sortOrder: 13,
  },
  {
    id: 'fishy',
    name: 'Fishy',
    rarity: 'rare',
    ability: 'Increased swim speed; speed boost after taking damage',
    summonCost: 100,
    sortOrder: 14,
    location: 'Water and mountainous areas',
  },
  {
    id: 'striker',
    name: 'Striker',
    rarity: 'epic',
    ability: 'Brief Overdrive when you mantle, hurdle, or wall scramble',
    summonCost: 3000,
    sortOrder: 15,
    location: 'Soccer pitch POI',
  },
  {
    id: 'aura',
    name: 'Aura',
    rarity: 'epic',
    ability: 'Shock Rock charge after dealing enough damage (shockwave effect)',
    summonCost: 3000,
    sortOrder: 16,
    location: 'High / mountainous areas',
  },
  {
    id: 'boss',
    name: 'Boss',
    rarity: 'legendary',
    ability: 'Increases max Health and Shield',
    summonCost: 5000,
    sortOrder: 17,
    location: 'After defeating a powerful adversary',
  },
  {
    id: 'grim',
    name: 'Grim',
    rarity: 'mythic',
    ability: 'Players who damage you become marked for a short duration',
    summonCost: 7500,
    sortOrder: 18,
  },
  {
    id: 'air',
    name: 'Air',
    rarity: 'rare',
    ability: 'Increased jump height and sprint speed; removes fall damage',
    summonCost: 100,
    sortOrder: 19,
    location: 'High / mountainous areas',
  },
  {
    id: 'seven',
    name: 'Seven',
    rarity: 'legendary',
    ability: "Reveals opponents' foot trails for a few seconds",
    summonCost: 5000,
    sortOrder: 20,
    location: 'High / mountainous areas',
  },
  {
    id: 'ironmouse',
    name: 'Ironmouse',
    rarity: 'mythic',
    ability:
      'Regenerate health over time when low. While regenerating, gain Cloak and low gravity',
    summonCost: 7500,
    sortOrder: 21,
    location: 'Found in Relic Chests',
  },
  {
    id: 'pollo',
    name: 'Pollo',
    rarity: 'mythic',
    ability: "Slowly replenishes Shield for you and teammates after an elimination",
    summonCost: 7500,
    sortOrder: 22,
    location: 'Primarily trade / player drops',
  },
  {
    id: 'llama',
    name: 'Llama',
    rarity: 'legendary',
    ability:
      'Opening ammo boxes has a chance to grant a weapon upgrade (5% → 20% by level)',
    summonCost: 4500,
    sortOrder: 23,
    location: 'Found in Relic Chests',
  },
  {
    id: 'peely',
    name: 'Peely',
    rarity: 'legendary',
    ability:
      'Emits a ping for players with rare sprites nearby, but marks you on the map',
    summonCost: 4500,
    sortOrder: 24,
    location: 'Spotted near high and mountainous areas',
  },
]

/** Live variants + drop rates (%). */
const FAMILY_VARIANTS: Record<string, Partial<Record<Variant, number>>> = {
  batman: {
    base: 2.23,
    gold: 0.1,
    gummy: 0.07,
    galaxy: 0.04,
    holofoil: 0.01,
    cube: 0.005,
  },
  water: {
    base: 13.92,
    gold: 0.53,
    gummy: 0.53,
    galaxy: 0.43,
    holofoil: 0.53,
    gem: 0.37,
    quack: 0.01,
  },
  earth: {
    base: 13.92,
    gold: 0.53,
    gummy: 0.53,
    galaxy: 0.43,
    cube: 0.21,
    gem: 0.37,
    quack: 0.01,
  },
  fire: {
    base: 13.92,
    gold: 0.53,
    gummy: 0.53,
    galaxy: 0.43,
    holofoil: 0.53,
    cube: 0.21,
    quack: 0.01,
  },
  duck: { base: 9, gold: 0.4, gummy: 0.3, galaxy: 0.16, gem: 0.1 },
  ghost: { base: 9, gold: 0.4, gummy: 0.3, galaxy: 0.16, holofoil: 0.06 },
  dream: { base: 6.98, gold: 0.31, gummy: 0.23, galaxy: 0.12, cube: 0.01 },
  demon: { base: 9, gold: 0.4, gummy: 0.3, galaxy: 0.16, gem: 0.1 },
  punk: { base: 6.98, gold: 0.31, gummy: 0.23, galaxy: 0.12, cube: 0.01 },
  king: { base: 9, gold: 0.4, gummy: 0.3, galaxy: 0.16, holofoil: 0.06 },
  'burnt-peanut': { base: 0.5 },
  'vini-jr': { base: 0.3 },
  'zero-point': {
    base: 0.00093,
    gold: 0.000041,
    gummy: 0.000031,
    galaxy: 0.000016,
    cube: 0.000005,
    holofoil: 0.000008,
    gem: 0.00001,
    quack: 0.00001,
  },
  fishy: { base: 13.79, gold: 0.75, gummy: 0.62, galaxy: 0.5, cube: 0.01 },
  striker: { base: 6.98, gold: 0.31, gummy: 0.23, galaxy: 0.12, holofoil: 0.05 },
  aura: { base: 6.98, gold: 0.31, gummy: 0.23, galaxy: 0.12, gem: 0.08 },
  boss: { base: 6.98, gold: 0.31, gummy: 0.23, galaxy: 0.12, cube: 0.01 },
  grim: {
    base: 0.09,
    gold: 0.01,
    gummy: 0.008,
    galaxy: 0.005,
    cube: 0.001,
    holofoil: 0.0005,
    gem: 0.00099,
  },
  air: { base: 10, gold: 0.75, gummy: 0.62, galaxy: 0.5, holofoil: 0.25 },
  seven: { base: 6.98, gold: 0.31, gummy: 0.23, galaxy: 0.12, holofoil: 0.05 },
  ironmouse: { base: 0.08 },
  pollo: { base: 0.05 },
  llama: {
    base: 0.4,
    gold: 0.02,
    gummy: 0.015,
    galaxy: 0.008,
    gem: 0.005,
  },
  peely: {
    base: 0.4,
    gold: 0.02,
    gummy: 0.015,
    galaxy: 0.008,
    holofoil: 0.004,
  },
  'john-wick': { base: 0.12 },
}

/** Icon file names on fortnite.gg (released variants only). */
const ICONS: Record<string, Partial<Record<Variant, string>>> = {
  'john-wick': {
    base: 'T_Icon_Reload_FillerGrunt_icon_L.webp',
  },
  batman: {
    base: 'T_Icon_BR_FossilMeal_Default_L.webp',
    gold: 'T_Icon_BR_FossilMeal_Gold_L.webp',
    gummy: 'T_Icon_BR_FossilMeal_Candy_L.webp',
    galaxy: 'T_Icon_BR_FossilMeal_Galaxy_L.webp',
    holofoil: 'T_Icon_BR_FossilMeal_Holofoil_L.webp',
    cube: 'T_Icon_BR_FossilMeal_Cube_L.webp',
  },
  water: {
    base: 'T_Icon_BR_Creature_Sprite_Water_Unvault_Ch7S3_ui_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Water_Gold_ui_L.webp',
    gummy: 'T_Icon_BR_Creature_Sprite_Water_Candy_ui_L.webp',
    galaxy: 'T_Icon_BR_Creature_Sprite_Water_Galaxy_ui_L.webp',
    holofoil: 'T_Icon_BR_Creature_Sprite_Water_Holofoil_ui_L.webp',
    gem: 'T_Icon_BR_Creature_Sprite_Water_Gem_ui_L.webp',
    quack: 'T_Icon_BR_Creature_Sprite_Water_Quack_ui_L.webp',
  },
  earth: {
    base: 'T_Icon_BR_Creature_Sprite_Earth_Ch7S3_UI_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Earth_Gold_ui_L.webp',
    gummy: 'T_Icon_BR_Creature_Sprite_Earth_Candy_ui_L.webp',
    galaxy: 'T_Icon_BR_Creature_Sprite_Earth_Galaxy_ui_L.webp',
    cube: 'T_Icon_BR_Creature_Sprite_Earth_Cube_ui_L.webp',
    gem: 'T_Icon_BR_Creature_Sprite_Earth_Gem_ui_L.webp',
    quack: 'T_Icon_BR_Creature_Sprite_Earth_Quack_ui_L.webp',
  },
  fire: {
    base: 'T_Icon_BR_Creature_Sprite_Fire_Unvault_Ch7S3_ui_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Fire_Gold_ui_L.webp',
    gummy: 'T_Icon_BR_Creature_Sprite_Fire_Candy_ui_L.webp',
    galaxy: 'T_Icon_BR_Creature_Sprite_Fire_Galaxy_ui_L.webp',
    holofoil: 'T_Icon_BR_Creature_Sprite_Fire_Holofoil_ui_L.webp',
    cube: 'T_Icon_BR_Creature_Sprite_Fire_Cube_ui_L.webp',
    quack: 'T_Icon_BR_Creature_Sprite_Fire_Quack_ui_L.webp',
  },
  duck: {
    base: 'T_Icon_BR_Duck_Default_L.webp',
    gold: 'T_Icon_BR_Duck_Gold_L.webp',
    gummy: 'T_Icon_BR_Duck_Candy_L.webp',
    galaxy: 'T_Icon_BR_Duck_Galaxy_L.webp',
    gem: 'T_Icon_BR_Duck_Gem_L.webp',
  },
  ghost: {
    base: 'T_Icon_BR_Creature_Sprite_Ghost_Unvault_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Ghost_Gold_L.webp',
    gummy: 'T_Icon_BR_Creature_Sprite_Ghost_Candy_L.webp',
    galaxy: 'T_Icon_BR_Creature_Sprite_Ghost_Galaxy_L.webp',
    holofoil: 'T_Icon_BR_Creature_Sprite_Ghost_Holo_L.webp',
  },
  dream: {
    base: 'T_Icon_BR_Creature_Sprite_Sleepy_ui_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Sleepy_Gold_ui_L.webp',
    gummy: 'T_Icon_BR_Creature_Sprite_Sleepy_Candy_ui_L.webp',
    galaxy: 'T_Icon_BR_Creature_Sprite_Sleepy_Galaxy_ui_L.webp',
    cube: 'T_Icon_BR_Creature_Sprite_Sleepy_Cube_ui_L.webp',
  },
  demon: {
    base: 'T_Icon_BR_RedDemon_Default_L.webp',
    gold: 'T_Icon_BR_RedDemon_Gold_L.webp',
    gummy: 'T_Icon_BR_RedDemon_Candy_L.webp',
    galaxy: 'T_Icon_BR_RedDemon_Galaxy_L.webp',
    gem: 'T_Icon_BR_RedDemon_Gem_L.webp',
  },
  punk: {
    base: 'T_Icon_BR_Creature_Sprite_Punk_ui_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Punk_Gold_ui_L.webp',
    gummy: 'T_Icon_BR_Creature_Sprite_Punk_Candy_ui_L.webp',
    galaxy: 'T_Icon_BR_Creature_Sprite_Punk_Galaxy_ui_L.webp',
    cube: 'T_Icon_BR_Creature_Sprite_Punk_Cube_ui_L.webp',
  },
  king: {
    base: 'T_Icon_BR_Creature_Sprite_King_ui_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_King_Gold_ui_L.webp',
    gummy: 'T_Icon_BR_Creature_Sprite_King_Candy_ui_L.webp',
    galaxy: 'T_Icon_BR_Creature_Sprite_King_Galaxy_ui_L.webp',
    holofoil: 'T_Icon_BR_Creature_Sprite_King_Holofoil_ui_L.webp',
  },
  'burnt-peanut': {
    base: 'T_Icon_BR_Creature_Sprite_BurntPeanut_ui_L.webp',
  },
  'vini-jr': {
    base: 'T_Icon_BR_CokeParmesan_Default_L.webp',
  },
  'zero-point': {
    base: 'T_Icon_BR_Creature_Sprite_ZeroPoint_ui_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_ZeroPoint_Gold_ui_L.webp',
    gummy: 'T_Icon_BR_Creature_Sprite_ZeroPoint_Candy_ui_L.webp',
    galaxy: 'T_Icon_BR_Creature_Sprite_ZeroPoint_Galaxy_ui_L.webp',
    cube: 'T_Icon_BR_Creature_Sprite_ZeroPoint_Cube_ui_L.webp',
    holofoil: 'T_Icon_BR_Creature_Sprite_ZeroPoint_Holofoil_ui_L.webp',
    gem: 'T_Icon_BR_Creature_Sprite_ZeroPoint_Gem_ui_L.webp',
    quack: 'T_Icon_BR_Creature_Sprite_ZeroPoint_Quack_ui_L.webp',
  },
  fishy: {
    base: 'T_Icon_BR_Creature_Sprite_Fishy_ui_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Fishy_Gold_ui_L.webp',
    gummy: 'T_Icon_BR_Creature_Sprite_Fishy_Candy_ui_L.webp',
    galaxy: 'T_Icon_BR_Creature_Sprite_Fishy_Galaxy_ui_L.webp',
    cube: 'T_Icon_BR_Creature_Sprite_Fishy_Cube_L.webp',
  },
  striker: {
    base: 'T_Icon_BR_Creature_Sprite_Soccer_ui_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Soccer_Gold_L.webp',
    gummy: 'T_Icon_BR_Creature_Sprite_Soccer_Candy_L.webp',
    galaxy: 'T_Icon_BR_Creature_Sprite_Soccer_Galaxy_L.webp',
    holofoil: 'T_Icon_BR_Creature_Sprite_Soccer_Holofoil_L.webp',
  },
  aura: {
    base: 'T_Icon_BR_Creature_Sprite_Drifter_ui_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Drifter_Gold_ui_L.webp',
    gummy: 'T_Icon_BR_Creature_Sprite_Drifter_Candy_ui_L.webp',
    galaxy: 'T_Icon_BR_Creature_Sprite_Drifter_Galaxy_ui_L.webp',
    gem: 'T_Icon_BR_Creature_Sprite_Drifter_Gem_ui_L.webp',
  },
  boss: {
    base: 'T_Icon_BR_Creature_Sprite_Boss_ui_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Boss_Gold_ui_L.webp',
    gummy: 'T_Icon_BR_Creature_Sprite_Boss_Candy_ui_L.webp',
    galaxy: 'T_Icon_BR_Creature_Sprite_Boss_Galaxy_ui_L.webp',
    cube: 'T_Icon_BR_Creature_Sprite_Boss_Cube_ui_L.webp',
  },
  grim: {
    base: 'T_Icon_BR_GrimReaper_Default_L.webp',
    gold: 'T_Icon_BR_GrimReaper_Gold_L.webp',
    gummy: 'T_Icon_BR_GrimReaper_Candy_L.webp',
    galaxy: 'T_Icon_BR_GrimReaper_Galaxy_L.webp',
    cube: 'T_Icon_BR_GrimReaper_Cube_L.webp',
    holofoil: 'T_Icon_BR_GrimReaper_Holofoil_L.webp',
    gem: 'T_Icon_BR_GrimReaper_Gem_L.webp',
  },
  air: {
    base: 'T_Icon_BR_Air_Default_L.webp',
    gold: 'T_Icon_BR_Air_Gold_L.webp',
    gummy: 'T_Icon_BR_Air_Candy_L.webp',
    galaxy: 'T_Icon_BR_Air_Galaxy_L.webp',
    holofoil: 'T_Icon_BR_Air_Holo_L.webp',
  },
  seven: {
    base: 'T_Icon_BR_Creature_Sprite_Seven_ui_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Seven_Gold_ui_L.webp',
    gummy: 'T_Icon_BR_Creature_Sprite_Seven_Candy_ui_L.webp',
    galaxy: 'T_Icon_BR_Creature_Sprite_Seven_Galaxy_ui_L.webp',
    holofoil: 'T_Icon_BR_Creature_Sprite_Seven_Holofoil_ui_L.webp',
  },
  ironmouse: {
    base: 'T_Icon_BR_PedicureAntacid_L.webp',
  },
  pollo: {
    base: 'T_Icon_BR_CompanyStargazer_Default_L.webp',
  },
  llama: {
    base: 'T_Icon_BR_Creature_Sprite_Llama_ui_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Llama_Gold_ui_L.webp',
    gummy: 'T_Icon_BR_Creature_Sprite_Llama_Candy_ui_L.webp',
    galaxy: 'T_Icon_BR_Creature_Sprite_Llama_Galaxy_ui_L.webp',
    gem: 'T_Icon_BR_Creature_Sprite_Llama_Gem_ui_L.webp',
  },
  peely: {
    base: 'T_Icon_BR_Creature_Sprite_Peely_ui_L.webp',
    gold: 'T_Icon_BR_Creature_Sprite_Peely_Gold_ui_L.webp',
    gummy: 'T_Icon_BR_Creature_Sprite_Peely_Candy_ui_L.webp',
    galaxy: 'T_Icon_BR_Creature_Sprite_Peely_Galaxy_ui_L.webp',
    holofoil: 'T_Icon_BR_Creature_Sprite_Peely_Holofoil_ui_L.webp',
  },
}

function iconUrl(familyId: string, variant: Variant): string {
  const file = ICONS[familyId]?.[variant]
  if (file) return `${ICON_BASE}/${file}`
  // Fallback to base icon of the family
  const base = ICONS[familyId]?.base
  return base ? `${ICON_BASE}/${base}` : `${ICON_BASE}/T_Icon_BR_Creature_Sprite_Water_Unvault_Ch7S3_ui_L.webp`
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
      const name = isBase
        ? `${family.name} Sprite`
        : `${capitalize(variant)} ${family.name} Sprite`
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export const SPRITE_FAMILIES = FAMILIES
export const SPRITES: SpriteEntry[] = buildCatalog()
export const SPRITE_BY_ID = Object.fromEntries(SPRITES.map((s) => [s.id, s]))

/** Rarity rank for sorting (lower = higher rarity first when sorting by rarity). */
export const RARITY_RANK: Record<Exclude<Rarity, 'special'>, number> = {
  mythic: 0,
  legendary: 1,
  epic: 2,
  rare: 3,
}

export function difficultyScore(sprite: SpriteEntry): number {
  const rate = Math.max(sprite.dropRate, 0.000001)
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
      'cheat-master': 16,
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

/** Left-to-right order as shown in the in-game collection. */
export const VARIANT_ORDER: Variant[] = [
  'base',
  'cube',
  'gold',
  'gummy',
  'galaxy',
  'holofoil',
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

/** Sort families for the collection view. */
export function sortFamilies(
  families: SpriteFamily[],
  mode: SortMode,
): SpriteFamily[] {
  const copy = [...families]
  if (mode === 'type') {
    copy.sort((a, b) => a.sortOrder - b.sortOrder)
  } else if (mode === 'rarity') {
    copy.sort((a, b) => {
      const r = RARITY_RANK[a.rarity] - RARITY_RANK[b.rarity]
      if (r !== 0) return r
      return a.sortOrder - b.sortOrder
    })
  } else {
    // Cheapest base re-summon cost first; type order as tiebreaker
    copy.sort((a, b) => {
      const d = a.summonCost - b.summonCost
      if (d !== 0) return d
      return a.sortOrder - b.sortOrder
    })
  }
  return copy
}
