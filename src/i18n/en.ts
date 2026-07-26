import type { MessageTree } from './locales'

const en: MessageTree = {
  app: {
    title: 'Sprite Squad',
    suggest: 'Suggest',
  },
  lang: {
    label: 'Language',
    en: 'English',
    es: 'Español',
  },
  tabs: {
    collection: 'Collection',
    suggest: 'Suggest',
    squad: 'Squad',
    help: 'Help',
  },
  status: {
    missing: 'Missing',
    ready: 'Ready',
    available: 'Available',
    lost: 'Lost',
    mastered: 'Mastered',
    notMastered: 'Not mastered',
  },
  rarity: {
    rare: 'Rare',
    epic: 'Epic',
    legendary: 'Legendary',
    mythic: 'Mythic',
    special: 'Special',
  },
  variant: {
    all: 'All variants',
    base: 'Base',
    gold: 'Gold',
    gummy: 'Gummy',
    galaxy: 'Galaxy',
    holofoil: 'Holofoil',
    cube: 'Cube',
    gem: 'Gem',
    quack: 'Quack',
  },
  collection: {
    owned: 'owned',
    available: 'available',
    lost: 'lost',
    mastered: 'mastered',
    legendTap: 'Tap: Ready ↔ Lost',
    legendMissing: '✕ Missing',
    legendMastered: '♛ Mastered',
    searchPlaceholder: 'Search sprites…',
    sortTitle: 'Sort families',
    sortType: 'Sort: In-game type',
    sortRarity: 'Sort: Rarity',
    sortDust: 'Sort: Sprite Dust cost',
    allStatus: 'All status',
    needFilter: 'Missing + lost',
    dustTitle: 'Sprite Dust to re-summon after loss',
    dust: 'dust',
    markMissing: 'Mark missing',
    toggleMastered: 'Toggle mastered',
    masteredBadge: 'Mastered',
    noMatch: 'No sprites match your filters.',
  },
  suggest: {
    whoPlaying: 'Who is playing this match?',
    generate: 'Generate bring / gift plan',
    hint:
      'Each round aims for a fair 1:1 — every player gives one and receives one when possible. Missing fills always beat lost restores. A round that would only swap lost restores (no new Missing fills) becomes mastery / hunt instead, so you do not thrash the same Lost/Ready cycle. Mixed missing + restore rounds stay fair trades. After the match, confirm each exchange that happened.',
    noAssignments: 'No assignments yet. Mark collections and select players.',
    round: 'Round {n}',
    exchange: 'exchange',
    exchanges: 'exchanges',
    confirmed: '{n} confirmed',
    masteryCount: '{n} mastery',
    allConfirmed: 'All confirmed',
    noExchanges: 'No exchanges',
    confirmRemaining: 'Confirm remaining ({n})',
    confirmAll: 'Confirm all',
    newMissing: 'New (missing)',
    restoreLost: 'Restore lost',
    mastery: 'Mastery',
    bringerRepurchase: 'Bringer repurchase',
    confirmedTag: 'Confirmed',
    brings: 'brings',
    dustBringerPays: 'dust (bringer pays)',
    confirm: 'Confirm',
    done: 'Done',
    dustIfLost: 'Sprite Dust cost if lost / re-summon',
    dustBringerMust: 'Bringer must re-summon with dust before trading',
    selectPlayers: 'Select who is playing, then run Suggest.',
    summary:
      '{players} players · fair 1:1 · {exchanges} exchange(s) · {missing} missing · {restores} restore · {gifts} gift · {repurchases} repurchase · {mastery} mastery',
    needMissing: 'missing from collection',
    needLost: 'lost — restore without their dust',
    tradeRepurchase:
      'Repurchase first ({cost} dust) → {receiver} ({need}, {difficulty})',
    tradeReady: 'Trade to {receiver} — {need} ({difficulty})',
    masteryNoTradeRepurchase:
      'No trades — repurchase & level for mastery ({cost} dust)',
    masteryNoTrade: 'No valuable trades — bring to level toward mastery',
    masteryThrashRepurchase:
      'Pure lost-restore round skipped — repurchase & level mastery ({cost} dust)',
    masteryThrash: 'Pure lost-restore round skipped — bring to level toward mastery',
    huntThrash:
      'This round only had lost-restore swaps (skipped thrash) — hunt / trade mid-game for new finds',
    huntFree:
      'No trade or mastery targets — open chests / trade mid-game for new finds',
    huntName: 'Hunt freely',
    difficulty: {
      ultraRare: 'ultra rare',
      veryRare: 'very rare',
      rare: 'rare',
      uncommon: 'uncommon',
      common: 'common gap',
    },
  },
  confirm: {
    titleOne: 'Confirm this exchange?',
    titleRoundOne: 'Confirm Round {n} exchange?',
    titleRoundMany: 'Confirm {count} remaining Round {n} exchanges?',
    subtitle:
      'Recipients become Ready; bringers mark these sprites Lost. Only confirm trades that actually happened.',
    cancel: 'Cancel',
    confirmOne: 'Confirm exchange',
    confirmMany: 'Confirm {n} exchanges',
    nothingTitle: 'Nothing updated',
    nothingSkipped: 'Could not apply these exchanges.',
    nothingIds:
      'Player ids may not match — regenerate the plan and try again.',
    successOne: 'Exchange confirmed',
    successMany: '{n} exchanges confirmed',
    successMsg:
      'Collections updated: recipients Ready, bringers Lost. Check Collection if you want to double-check.',
    alreadyTitle: 'Already confirmed',
    alreadyMsg: 'These exchanges were already applied for this plan.',
    ok: 'OK',
    tagNew: 'New',
    tagRestore: 'Restore',
    tagRepurchase: 'Repurchase',
  },
  squad: {
    shareTitle: 'Share with squad (internet)',
    cloudUnavailable:
      'Live rooms are not available on this build. You can still track collections locally and use Export / Import (whole squad or per player) to share files.',
    roomCode: 'Room code:',
    roomHint: 'Everyone opens the same link and edits the same collection live.',
    copyLink: 'Copy share link',
    leaveRoom: 'Leave room',
    status: 'Status:',
    createHint: "Create a room from your current data, or join a teammate's code.",
    createRoom: 'Create room',
    working: 'Working…',
    roomPlaceholder: 'Room code',
    join: 'Join',
    moveUp: 'Move up',
    moveDown: 'Move down',
    export: 'Export',
    import: 'Import',
    remove: 'Remove',
    exportPlayerTitle: 'Export this player only',
    importPlayerTitle: 'Import into this player only (others unchanged)',
    removeTitle: 'Remove player',
    addPlayer: '+ Add player',
    exportFull: 'Export full squad',
    importFull: 'Import full squad',
    footer:
      'Progress is saved in this browser. In a live room, changes sync for everyone. Per-player Export / Import only touches that one collection.',
    playerN: 'Player {n}',
    cloudNotAvailable: 'Cloud rooms are not available on this build.',
  },
  deletePlayer: {
    title: 'Remove player?',
    body:
      'Remove {name} and their entire collection from this squad? This cannot be undone unless you have an export backup.',
    confirm: 'Remove player',
  },
  importExport: {
    linkCopiedTitle: 'Link copied',
    linkCopiedMsg: 'Share link copied to the clipboard. Send it to your squad.',
    copyLinkTitle: 'Copy this link',
    importFailed: 'Import failed',
    importSquadInvalid: 'Could not import file — invalid squad JSON.',
    playerImportedTitle: 'Player imported',
    playerImportedMsg:
      'Updated {name} collection only. Other squad members were not changed.',
    playerDefault: 'player',
  },
  sync: {
    connecting: 'Room {code}…',
    saving: 'Saving {code}',
    synced: 'Live · {code}',
    error: 'Sync error · {code}',
    offline: 'Offline · {code}',
  },
  help: {
    howTitle: 'How to use (in lobby / between games)',
    collection:
      'Collection — pick a squad mate, then tap a sprite card to toggle Ready ↔ Lost (Missing first becomes Ready).',
    missingBtn: 'Tap the crossed-circle button on a card to mark it Missing.',
    readyLost:
      'Ready = can bring without Sprite Dust. Lost = needs repurchase before bringing.',
    crown: 'Tap the crown when a sprite is mastered (extracted at Level 5).',
    squadOrder: 'Squad — use ↑ / ↓ to reorder players; Collection chips follow that order.',
    suggest: 'Suggest — check who is in the next game, then generate a plan.',
    roomsTitle: 'Live rooms',
    createRoom:
      'Create room (Squad tab) — uploads your current squad and gives a short room code.',
    shareLink:
      'Copy share link — send the URL to teammates, or they can type the room code and hit Join.',
    liveEdit:
      'Everyone in the same room edits the same collections live (status shows Live / Saving).',
    leaveRoom:
      'Leave room — stops syncing this browser; your local copy stays. Join another code or create a new room anytime.',
    exportTitle: 'Export & import',
    exportFull:
      'Export full squad / Import full squad — backup or replace the entire squad JSON (all players).',
    exportPlayer:
      "Export on a player row — saves only that person's collection (share with them, or keep a personal backup).",
    importPlayer:
      'Import on a player row — loads a player file into that slot only; other squad members stay unchanged. Accepts a single-player export, or a full squad file that contains exactly one player.',
    rulesTitle: 'Suggestion rules',
    fair:
      'Fair 1:1: each round, every player gives at most one and receives at most one (when the collections allow it).',
    primary: 'Primary need: missing (never collected) before any lost restore.',
    rounds:
      'Rounds 1–4: bring slots; confirm each exchange (or remaining round) so recipients become Ready and bringers Lost. Leave failed trades unconfirmed.',
    thrash:
      'Pure lost-restore rounds are skipped: if a round only restores Lost copies (no Missing fills), everyone brings for mastery / hunt instead of thrashing swaps.',
    readyPrefer: 'Prefers Ready inventory over repurchase on the bringer.',
    catalogTitle: 'Catalog',
    catalogCount:
      '{sprites} sprite combinations across {families} families (C7S3 data as of July 2026).',
    variants:
      'Variants: Base, Gold, Gummy, Galaxy, Holofoil, Cube (Gem/Quack reserved for future).',
  },
  close: 'Close',
}

export default en
