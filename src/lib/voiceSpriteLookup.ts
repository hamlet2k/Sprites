/**
 * Rule-based speech → sprite match (no LLM).
 * Flexible aliases for variants + families in English and Spanish.
 */
import {
  SPRITE_FAMILIES,
  SPRITES,
  type SpriteEntry,
  type Variant,
} from '../data/sprites'

export type VoiceMatchResult =
  | { ok: true; sprite: SpriteEntry; confidence: number; heard: string }
  | { ok: false; heard: string; reason: 'empty' | 'no-match' }

/** Strip accents, lower-case, keep letters/numbers/spaces. */
export function normalizeSpeech(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Remove filler words that people say around the name. */
function stripFillers(text: string): string {
  return text
    .replace(
      /\b(el|la|los|las|un|una|the|a|an|sprite|espiritu|espíritu|creature|criatura|show|muestra|busca|buscar|find|quiero|want|please|por favor|me|my|mi)\b/g,
      ' ',
    )
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Longer / more specific aliases first when sorting for extraction.
 * Base is implicit when no variant keyword is heard.
 */
const VARIANT_ALIASES: { variant: Exclude<Variant, 'base'>; aliases: string[] }[] =
  [
    {
      variant: 'holofoil',
      aliases: [
        'holofoil',
        'holo foil',
        'holographic',
        'holografico',
        'holografica',
        'holográfico',
        'holográfica',
        'holo',
      ],
    },
    {
      variant: 'gummy',
      aliases: ['gummy', 'gummi', 'candy', 'caramelo', 'gominola', 'gomita'],
    },
    {
      variant: 'gold',
      aliases: ['golden', 'gold', 'dorado', 'dorada', 'oro'],
    },
    {
      variant: 'galaxy',
      aliases: ['galaxy', 'galaxia', 'espacial'],
    },
    {
      variant: 'cube',
      aliases: ['cube', 'cubo', 'cubic', 'cubico', 'cúbico'],
    },
    {
      variant: 'gem',
      aliases: ['gem', 'gema', 'jewel', 'joya'],
    },
    {
      variant: 'quack',
      aliases: ['quack', 'cuack', 'cuac'],
    },
  ]

/** Family id → spoken nicknames (EN + ES + common mishears). */
const FAMILY_ALIASES: Record<string, string[]> = {
  'john-wick': ['john wick', 'johnwick', 'wick', 'john', 'baba yaga'],
  batman: ['batman', 'bat man', 'murcielago', 'murciélago', 'bruce'],
  water: ['water', 'agua', 'aqua', 'h2o'],
  earth: ['earth', 'tree', 'tierra', 'arbol', 'árbol', 'forest', 'bosque'],
  fire: ['fire', 'fuego', 'flame', 'llama fuego', 'flama'],
  duck: ['duck', 'ducky', 'pato', 'patito', 'pato'],
  ghost: ['ghost', 'fantasma', 'spirit', 'espectro'],
  dream: [
    'dream',
    'dreamy',
    'pillow',
    'almohada',
    'sueno',
    'sueño',
    'sleepy',
    'dormilon',
    'dormilón',
  ],
  demon: ['demon', 'demonio', 'diablo', 'red demon'],
  punk: ['punk', 'punky'],
  king: ['king', 'rey', 'crown', 'corona'],
  'burnt-peanut': [
    'burnt peanut',
    'burntpeanut',
    'peanut',
    'mani',
    'maní',
    'cacahuete',
    'burnt',
  ],
  'vini-jr': [
    'vini jr',
    'vini junior',
    'vinicius',
    'vini',
    'vinny',
    'soccer player',
    'futbolista',
    'football player',
  ],
  'zero-point': [
    'zero point',
    'zeropoint',
    'zero',
    'punto cero',
    'puntozero',
    'punto zero',
  ],
  fishy: ['fishy', 'fish', 'pez', 'pescado', 'pececito'],
  striker: [
    'striker',
    'soccer ball',
    'soccer',
    'football',
    'ball',
    'balon',
    'balón',
    'futbol',
    'fútbol',
    'pelota',
  ],
  aura: [
    'aura',
    'hoody',
    'hoodie',
    'hood',
    'sudadera',
    'drifter',
    'capucha',
  ],
  boss: ['boss', 'jefe', 'jefa', 'patron', 'patrón'],
  grim: [
    'grim',
    'grim reaper',
    'reaper',
    'parca',
    'muerte',
    'segador',
  ],
  air: ['air', 'aire', 'wind', 'viento', 'sky', 'cielo'],
  seven: ['seven', 'siete', '7', 'the seven'],
  ironmouse: [
    'ironmouse',
    'iron mouse',
    'iron mouse',
    'doll',
    'muneca',
    'muñeca',
    'mouse',
    'raton',
    'ratón',
  ],
  pollo: [
    'pollo',
    'poyo',
    'poio',
    'poyo',
    'chicken',
    'gallina',
    'pollito',
  ],
  llama: ['llama', 'llamma', 'loot llama', 'pinata', 'piñata'],
  peely: [
    'peely',
    'peely',
    'banana',
    'platano',
    'plátano',
    'banano',
    'peel',
  ],
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (!a.length) return b.length
  if (!b.length) return a.length
  const row = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) row[j] = j
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost)
      prev = tmp
    }
  }
  return row[b.length]
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  if (a === b) return 1
  const maxLen = Math.max(a.length, b.length)
  return 1 - levenshtein(a, b) / maxLen
}

function extractVariant(text: string): {
  variant: Variant
  rest: string
  hitAlias?: string
} {
  const sorted = VARIANT_ALIASES.flatMap((v) =>
    v.aliases.map((alias) => ({ variant: v.variant, alias })),
  ).sort((a, b) => b.alias.length - a.alias.length)

  for (const { variant, alias } of sorted) {
    const re = new RegExp(`(?:^|\\s)${escapeReg(alias)}(?:\\s|$)`)
    if (re.test(text)) {
      const rest = text.replace(re, ' ').replace(/\s+/g, ' ').trim()
      return { variant, rest, hitAlias: alias }
    }
  }
  return { variant: 'base', rest: text }
}

function escapeReg(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function familyAliasList(familyId: string, name: string): string[] {
  const custom = FAMILY_ALIASES[familyId] ?? []
  const base = [
    name.toLowerCase(),
    normalizeSpeech(name),
    familyId.replace(/-/g, ' '),
    familyId.replace(/-/g, ''),
  ]
  return [...new Set([...custom, ...base].map(normalizeSpeech).filter(Boolean))]
}

function scoreFamilyText(text: string, familyId: string, name: string): number {
  if (!text) return 0
  const aliases = familyAliasList(familyId, name)
  let best = 0
  for (const alias of aliases) {
    if (!alias) continue
    // Exact / contains
    if (text === alias) best = Math.max(best, 1)
    else if (text.includes(alias) && alias.length >= 3)
      best = Math.max(best, 0.92)
    else if (alias.includes(text) && text.length >= 3)
      best = Math.max(best, 0.85)
    else {
      // Token-wise fuzzy
      const tokens = text.split(' ')
      for (const tok of tokens) {
        if (tok.length < 2) continue
        best = Math.max(best, similarity(tok, alias) * 0.95)
        for (const at of alias.split(' ')) {
          if (at.length < 2) continue
          best = Math.max(best, similarity(tok, at) * 0.9)
        }
      }
      best = Math.max(best, similarity(text, alias) * 0.88)
    }
  }
  return best
}

/**
 * Match free-form speech to a catalog sprite entry.
 */
export function matchSpriteFromSpeech(raw: string): VoiceMatchResult {
  const heard = raw.trim()
  const cleaned = stripFillers(normalizeSpeech(heard))
  if (!cleaned) return { ok: false, heard, reason: 'empty' }

  const { variant, rest } = extractVariant(cleaned)
  const familyText = rest || cleaned

  // Score each family
  type Cand = { familyId: string; score: number }
  const familyScores: Cand[] = SPRITE_FAMILIES.map((f) => ({
    familyId: f.id,
    score: scoreFamilyText(familyText, f.id, f.name),
  }))

  // Also try full cleaned string if rest is empty after variant strip only
  if (rest !== cleaned) {
    for (const f of SPRITE_FAMILIES) {
      const s = scoreFamilyText(cleaned, f.id, f.name)
      const cur = familyScores.find((c) => c.familyId === f.id)!
      cur.score = Math.max(cur.score, s * 0.95)
    }
  }

  familyScores.sort((a, b) => b.score - a.score)
  const bestFamily = familyScores[0]
  if (!bestFamily || bestFamily.score < 0.55) {
    return { ok: false, heard, reason: 'no-match' }
  }

  // Prefer exact variant if it exists for this family; else best available
  const candidates = SPRITES.filter((s) => s.familyId === bestFamily.familyId)
  let sprite =
    candidates.find((s) => s.variant === variant) ??
    candidates.find((s) => s.variant === 'base') ??
    candidates[0]

  if (!sprite) return { ok: false, heard, reason: 'no-match' }

  // If user said a variant but only base exists, still show base with lower conf
  const conf =
    sprite.variant === variant
      ? bestFamily.score
      : Math.min(bestFamily.score, 0.75)

  return { ok: true, sprite, confidence: conf, heard }
}

export function getSpeechRecognitionCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === 'undefined') return null
  const w = window as Window &
    typeof globalThis & {
      SpeechRecognition?: new () => SpeechRecognition
      webkitSpeechRecognition?: new () => SpeechRecognition
    }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

export function speechLangForLocale(locale: string): string {
  return locale === 'es' ? 'es-ES' : 'en-US'
}
