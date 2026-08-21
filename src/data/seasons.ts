/**
 * Season registry — each season has its own sprite catalog.
 * Collections are stored by unique sprite id (no collision across seasons).
 */
import {
  C7S4_FAMILIES,
  C7S4_SPRITES,
  C7S4_VARIANT_ORDER,
} from './c7s4'
import {
  SPRITE_FAMILIES as C7S3_FAMILIES,
  SPRITES as C7S3_SPRITES,
  VARIANT_ORDER as C7S3_VARIANT_ORDER,
  type SpriteEntry,
  type SpriteFamily,
  type Variant,
} from './sprites'

export type SeasonId = 'c7s3' | 'c7s4'

export interface SeasonMeta {
  id: SeasonId
  /** Short label for the header selector, e.g. C7 S4 */
  shortLabel: string
  /** Longer label, e.g. Chapter 7 Season 4 */
  label: string
  /** In-game season subtitle */
  subtitle: string
}

export interface SeasonCatalog {
  id: SeasonId
  families: SpriteFamily[]
  sprites: SpriteEntry[]
  variantOrder: Variant[]
}

export const SEASONS: SeasonMeta[] = [
  {
    id: 'c7s4',
    shortLabel: 'C7 S4',
    label: 'Chapter 7 Season 4',
    subtitle: 'Override',
  },
  {
    id: 'c7s3',
    shortLabel: 'C7 S3',
    label: 'Chapter 7 Season 3',
    subtitle: 'Runners',
  },
]

export const DEFAULT_SEASON_ID: SeasonId = 'c7s4'

export const SEASON_STORAGE_KEY = 'fortnite-sprite-squad-season'

const CATALOGS: Record<SeasonId, SeasonCatalog> = {
  c7s3: {
    id: 'c7s3',
    families: C7S3_FAMILIES,
    sprites: C7S3_SPRITES,
    variantOrder: C7S3_VARIANT_ORDER,
  },
  c7s4: {
    id: 'c7s4',
    families: C7S4_FAMILIES,
    sprites: C7S4_SPRITES,
    variantOrder: C7S4_VARIANT_ORDER,
  },
}

/** Union of every season’s sprites — for lookups in plans / voice / import. */
export const ALL_SPRITES: SpriteEntry[] = [
  ...C7S3_SPRITES,
  ...C7S4_SPRITES,
]

export const ALL_SPRITE_BY_ID: Record<string, SpriteEntry> = Object.fromEntries(
  ALL_SPRITES.map((s) => [s.id, s]),
)

let activeSeasonId: SeasonId = DEFAULT_SEASON_ID

export function loadSeasonId(): SeasonId {
  try {
    const raw = localStorage.getItem(SEASON_STORAGE_KEY)
    if (raw === 'c7s3' || raw === 'c7s4') {
      activeSeasonId = raw
      return raw
    }
  } catch {
    /* ignore */
  }
  activeSeasonId = DEFAULT_SEASON_ID
  return DEFAULT_SEASON_ID
}

export function saveSeasonId(id: SeasonId): void {
  activeSeasonId = id
  try {
    localStorage.setItem(SEASON_STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

export function setActiveSeasonId(id: SeasonId): void {
  activeSeasonId = id
}

export function getActiveSeasonId(): SeasonId {
  return activeSeasonId
}

export function getCatalog(id: SeasonId = activeSeasonId): SeasonCatalog {
  return CATALOGS[id]
}

export function getSeasonMeta(id: SeasonId = activeSeasonId): SeasonMeta {
  return SEASONS.find((s) => s.id === id) ?? SEASONS[0]
}

/** Active-season sprites (suggestion engine / filters). */
export function getActiveSprites(): SpriteEntry[] {
  return getCatalog(activeSeasonId).sprites
}

export function getActiveFamilies(): SpriteFamily[] {
  return getCatalog(activeSeasonId).families
}
