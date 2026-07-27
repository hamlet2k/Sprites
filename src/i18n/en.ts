import type { MessageTree } from './locales'

const en: MessageTree = {
  app: {
    title: 'Sprite Squad',
    suggest: 'Exchanges',
  },
  lang: {
    label: 'Language',
    en: 'English',
    es: 'Español',
  },
  tabs: {
    collection: 'Collection',
    suggest: 'Exchanges',
    squad: 'Squad',
    help: 'Help',
  },
  status: {
    missing: 'Missing',
    ready: 'Ready',
    available: 'Available',
    lost: 'Lost',
    mastered: 'Mastered',
    notMastered: 'Not Mastered',
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
  effects: {
    family: {
      batman: 'Bat Cape — boosted midair glide',
      water: 'Replenishes Shield for you and squadmates while in water',
      earth: 'Increased chance to find additional rare items in chests',
      fire: 'Creates a fire burst after dealing enough damage to an enemy',
      duck: 'Emoting or jamming replenishes Shield',
      ghost: 'Grants cloak for a short duration upon reloading',
      dream:
        'Random item each level-up; at Level 5 explodes with Legendary loot, auto-extracts, resets to 1',
      demon: 'Siphon Health and Shield on elimination',
      punk: 'At Level 5, can grant infinite ammo buff',
      king: 'Increases Pickaxe damage',
      'burnt-peanut':
        'Chance of extra rare loot (sometimes Mythic) on eliminations',
      'vini-jr':
        'Sprinting enables damaging slide; slide into enemies boosts reload and fire rate',
      'zero-point': 'Shield Bubble Jr. when you use a healing item on yourself',
      fishy: 'Increased swim speed; speed boost after taking damage',
      striker: 'Brief Overdrive when you mantle, hurdle, or wall scramble',
      aura: 'Shock Rock charge after dealing enough damage (shockwave effect)',
      boss: 'Increases max Health and Shield',
      grim: 'Players who damage you become marked for a short duration',
      air: 'Increased jump height and sprint speed; removes fall damage',
      seven: "Reveals opponents' foot trails for a few seconds",
      pollo:
        'Slowly replenishes Shield for you and teammates after an elimination',
    },
    variant: {
      gold: '3× bonus XP from eliminations',
      gummy: 'Bonus Sprite Dust on extraction',
      galaxy: 'Bonus ammo when looting',
      holofoil: '+5% chance to find rare Sprite variants in chests (squad)',
      cube: 'Overdrive while in the Storm / extra shield on level-up',
      gem: '30% less fall damage (upcoming)',
      quack: 'Special Quack themed variant',
    },
  },
  collection: {
    owned: 'Owned',
    available: 'Available',
    lost: 'Lost',
    mastered: 'Mastered',
    legendTapPrefix: 'Tap:',
    legendMissing: '✕ Missing',
    legendMastered: '♛ Mastered',
    statsFilterLabel: 'Quick status filters',
    legendFilterLabel: 'Legend filters',
    filterOwnedTitle: 'Show all sprites',
    filterAvailableTitle: 'Show Ready only',
    filterLostTitle: 'Show Lost only',
    filterMasteredTitle: 'Show Mastered only',
    legendTapTitle: 'Toggle Ready ↔ Missing + Lost',
    legendMissingTitle: 'Show Missing only',
    legendMasteredTitle: 'Show Mastered only',
    searchPlaceholder: 'Search sprites…',
    sortTitle: 'Sort families',
    sortType: 'Sort: Type',
    sortRarity: 'Sort: Rarity',
    sortDust: 'Sort: Cost',
    allStatus: 'All Status',
    needFilter: 'Missing + Lost',
    dustTitle: 'Sprite Dust to re-summon after loss',
    dust: 'dust',
    markMissing: 'Mark missing',
    toggleMastered: 'Toggle mastered',
    masteredBadge: 'Mastered',
    noMatch: 'No sprites match your filters.',
  },
  suggest: {
    whoPlaying: 'Who is playing this match?',
    generate: 'Generate Exchange Plan',
    modeLabel: 'Plan style',
    modeCompletion: 'Focus Completion',
    modeFair: 'Focus Parity',
    modeCompletionHint:
      'Maximize new acquisitions each match. Unfair paths OK if the squad finishes faster.',
    modeFairHint:
      'Prefer mutual A↔B trades and balance who gives vs receives every match.',
    hintCompletion:
      'Complete everyone’s Missing catalog as fast as possible. Ready gifts first; rarity is only a tiny tie-break. Unfair paths OK if they complete more gaps. Pure lost thrash → mastery. Exchanged / Lost / Ignore after the match.',
    hintFair:
      'Fair 1:1 trades: mutual swaps first and balance give/receive so nobody is only a pure giver. New acquisitions before lost restores; pure lost thrash → mastery. Exchanged / Lost / Ignore after the match.',
    modeMismatch:
      'This plan was built with a different style. Generate again to apply the selected style.',
    noAssignments: 'No assignments yet. Mark collections and select players.',
    round: 'Match {n}',
    exchange: 'exchange',
    exchanges: 'exchanges',
    confirmed: '{n} exchanged',
    handled: '{n} handled',
    masteryCount: '{n} mastery',
    allConfirmed: 'All handled',
    allHandled: 'All handled',
    noExchanges: 'No exchanges',
    confirmRemaining: 'Exchanged remaining ({n})',
    confirmAll: 'Exchanged all',
    failed: 'Lost',
    failedTitle:
      'Trade failed in-game (died or lost sprite before extract). Bringer → Lost; receiver does not get it.',
    failedAll: 'Mark all lost',
    failedRemaining: 'Mark remaining lost ({n})',
    failedTag: 'Lost',
    ignore: 'Ignore',
    ignoreTitle:
      'Forgot to bring — no collection changes. Receiver does not get it; bringer keeps their status.',
    ignoreAll: 'Ignore all',
    ignoreRemaining: 'Ignore remaining ({n})',
    ignoredTag: 'Ignored',
    newMissing: 'New acquisition',
    restoreLost: 'Restore lost',
    mastery: 'Mastery',
    bringerRepurchase: 'Bringer repurchase',
    confirmedTag: 'Exchanged',
    brings: 'brings',
    dustBringerPays: 'dust (bringer pays)',
    confirm: 'Exchanged',
    done: 'Done',
    dustIfLost: 'Sprite Dust cost if lost / re-summon',
    dustBringerMust: 'Bringer must re-summon with dust before trading',
    selectPlayers: 'Select who is playing, then open Exchanges.',
    summaryPlayers: '{n} players',
    summaryExchanges: '{n} exchanges',
    summaryMissing: '{n} new acquisitions',
    summaryRestores: '{n} restores',
    summaryGifts: '{n} gifts',
    summaryRepurchases: '{n} repurchases',
    summaryMastery: '{n} mastery',
    summaryCompletion:
      '{players} players · Focus Completion · {exchanges} exchange(s) · {missing} new acquisitions · {restores} restore · {gifts} gift · {repurchases} repurchase · {mastery} mastery',
    summaryFair:
      '{players} players · Focus Parity · {exchanges} exchange(s) · {missing} new acquisitions · {restores} restore · {gifts} gift · {repurchases} repurchase · {mastery} mastery',
    needMissing: 'new acquisition for their collection',
    needLost: 'lost — restore without their dust',
    tradeRepurchase:
      'Repurchase first ({cost} dust) → {receiver} ({need}, {difficulty})',
    tradeReady: 'Trade to {receiver} — {need} ({difficulty})',
    masteryNoTradeRepurchase:
      'No trades — repurchase & level for mastery ({cost} dust)',
    masteryNoTrade: 'No valuable trades — bring to level toward mastery',
    masteryThrashRepurchase:
      'Pure lost-restore match skipped — repurchase & level mastery ({cost} dust)',
    masteryThrash: 'Pure lost-restore match skipped — bring to level toward mastery',
    huntThrash:
      'This match only had lost-restore swaps (skipped thrash) — hunt / trade mid-game for new finds',
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
    titleOne: 'Mark this as exchanged?',
    titleRoundOne: 'Mark Match {n} exchange as done?',
    titleRoundMany: 'Mark {count} remaining Match {n} exchanges as done?',
    subtitle:
      'Recipients become Ready; bringers mark these sprites Lost. Only mark trades that actually happened.',
    failTitleOne: 'Mark this exchange as lost?',
    failTitleRoundOne: 'Mark Match {n} exchange as lost?',
    failTitleRoundMany: 'Mark {count} remaining Match {n} exchanges as lost?',
    failSubtitle:
      'Use this when the bringer died or lost the sprite before extract. Bringer → Lost. Receiver stays Missing/Lost (does not acquire it).',
    ignoreTitleOne: 'Ignore this exchange?',
    ignoreTitleRoundOne: 'Ignore Match {n} exchange?',
    ignoreTitleRoundMany: 'Ignore {count} remaining Match {n} exchanges?',
    ignoreSubtitle:
      'Use when someone forgot to bring the sprite. No collection changes for bringer or receiver — just clear this plan row.',
    cancel: 'Cancel',
    confirmOne: 'Exchanged',
    confirmMany: 'Exchanged ({n})',
    failConfirmOne: 'Lost',
    failConfirmMany: 'Lost ({n})',
    ignoreConfirmOne: 'Ignore',
    ignoreConfirmMany: 'Ignore ({n})',
    nothingTitle: 'Nothing updated',
    nothingSkipped: 'Could not apply these exchanges.',
    nothingIds:
      'Player ids may not match — regenerate the plan and try again.',
    successOne: 'Exchange recorded',
    successMany: '{n} exchanges recorded',
    successMsg:
      'Collections updated: recipients Ready, bringers Lost. Check Collection if you want to double-check.',
    failSuccessOne: 'Exchange marked lost',
    failSuccessMany: '{n} exchanges marked lost',
    failSuccessMsg:
      'Bringers marked Lost. Receivers were not given the sprite. Check Collection if you want to double-check.',
    ignoreSuccessOne: 'Exchange ignored',
    ignoreSuccessMany: '{n} exchanges ignored',
    ignoreSuccessMsg:
      'No collection changes. Plan row cleared for everyone in the session.',
    alreadyTitle: 'Already handled',
    alreadyMsg: 'These exchanges were already applied for this plan.',
    ok: 'OK',
    tagNew: 'New',
    tagRestore: 'Restore',
    tagRepurchase: 'Repurchase',
  },
  squad: {
    shareTitle: 'Sync with Squad',
    cloudUnavailable:
      'Shared sessions are not available on this build. You can still track collections locally and use Export / Import (whole squad or per player) to share files.',
    roomCode: 'Session code:',
    roomHint: 'Everyone opens the same link and edits the same collection live.',
    copyLink: 'Copy share link',
    leaveRoom: 'Leave session',
    status: 'Status:',
    createHint: "Start a shared session from your current data, or join a teammate's code.",
    createRoom: 'Start session',
    working: 'Working…',
    roomPlaceholder: 'Session code',
    join: 'Join session',
    moveUp: 'Move up',
    moveDown: 'Move down',
    export: 'Export',
    import: 'Import',
    remove: 'Remove',
    exportPlayerTitle: 'Export this player only',
    importPlayerTitle: 'Import into this player only (others unchanged)',
    removeTitle: 'Remove player',
    addPlayer: '+ Add Player',
    exportFull: 'Export squad',
    importFull: 'Import squad',
    footer:
      'Progress is saved in this browser. In a shared session, changes sync for everyone. Per-player Export / Import only touches that one collection.',
    playerN: 'Player {n}',
    cloudNotAvailable: 'Shared sessions are not available on this build.',
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
    connecting: 'Session {code}…',
    saving: 'Saving {code}',
    synced: 'Live · {code}',
    error: 'Sync error · {code}',
    offline: 'Offline · {code}',
    pleaseWait: 'Saving to session… wait a moment',
    errorTapRefresh: 'Tap to refresh the page and re-sync',
  },
  help: {
    introTitle: 'What is Sprite Squad?',
    introP1:
      'A simple helper for your Fortnite squad during Chapter 7 Season 3 Sprites. Use it in the lobby or between matches to track who owns what — and who should bring which sprite to trade with friends.',
    introP2:
      'It does not change the game. You update it while you play, then follow the trade plan it suggests.',

    startTitle: 'Quick start (first time)',
    start1:
      'Open the Squad tab. Rename the players to your squad (and add or remove people if needed).',
    start2:
      'Optional: create a room and share the link or code so everyone sees the same list on their phone.',
    start3:
      'Open Collection. Pick a player, then tap sprites to mark what they have.',
    start4:
      'When you queue up, open Suggest, check who is in this match, and generate a plan.',
    start5:
      'After the match, confirm only the trades that actually happened.',

    statusesTitle: 'Sprite statuses (the important bit)',
    statusMissingTitle: 'Missing',
    statusMissingBody: 'They never got this sprite into the collection.',
    statusReadyTitle: 'Ready',
    statusReadyBody:
      'It is in their collection and they can equip/bring it without spending Sprite Dust.',
    statusLostTitle: 'Lost',
    statusLostBody:
      'They had it before, but it needs Sprite Dust to re-summon before they can bring it again.',
    statusMasteredTitle: 'Mastered (crown)',
    statusMasteredBody:
      'Extracted at max level (Level 5). Separate from Ready/Lost — tap the crown button to toggle.',

    collectionTitle: 'Updating the collection',
    collectionP1:
      'In Collection, choose a player at the top. Tap a sprite card to switch Ready ↔ Lost. If it was Missing, the first tap sets it to Ready.',
    collectionP2:
      'Use the crossed-circle button on a card if you need to mark it Missing again (mistake, or never really owned).',
    collectionP3:
      'Use search and filters if the grid feels long. Reorder players in Squad if you want the chips in a different order.',

    matchTitle: 'Before and after a match',
    matchBeforeTitle: 'Before you drop',
    matchBefore1: 'Go to Suggest and tick who is playing this game.',
    matchBefore2: 'Tap Generate (or Suggest in the header).',
    matchBefore3:
      'Read each round: who brings which sprite → who receives it. Up to 4 bring slots per player.',
    matchAfterTitle: 'After the match',
    matchAfter1:
      'Confirm each trade that worked (one by one, or confirm remaining in a round).',
    matchAfter2:
      'Confirmed trades update the list for you: receiver becomes Ready, bringer becomes Lost for that sprite.',
    matchAfter3:
      'Skip confirm on trades that failed (someone died with the sprite, wrong person, etc.).',

    suggestTitle: 'What the plan tries to do',
    suggest1:
      'First prioritize new acquisitions (Missing gaps) for squad mates, using fair one-give / one-receive trades each round.',
    suggest2:
      'If someone already has a sprite but Lost it, restores can be mixed in when that is fair.',
    suggest3:
      'If a round would only swap Lost restores back and forth (no new acquisitions), it suggests mastery or free hunting instead — so you do not ping-pong the same Lost/Ready cycle forever.',
    suggest4:
      'It prefers bringers who already have the sprite Ready (no dust) when possible.',

    shareTitle: 'Playing with friends on the same list',
    share1:
      'Squad tab → Create room. Copy the share link (or tell them the room code).',
    share2:
      'Friends open the link, or type the code and Join. Everyone edits the same collections live.',
    share3:
      'Leave room stops syncing on your device; your local copy stays. You can join another code later.',
    shareNote:
      'If live rooms are not available on this build, use Export / Import files instead to share data.',

    backupTitle: 'Backups (optional but useful)',
    backupFull:
      'Export full squad saves everyone at once. Import full squad replaces the whole squad with that file — use carefully.',
    backupPlayer:
      'Export / Import on one player row only updates that person. Handy for a personal backup or to load one friend without touching the others.',

    tipTitle: 'Tips',
    tip1: 'Update collections as soon as you extract or lose a sprite so Suggest stays accurate.',
    tip2: 'Only confirm trades that really happened in-game.',
    tip3: 'Language can be switched anytime with the selector in the top bar (English / Español).',
    tipCatalog:
      'The app lists {sprites} sprite combos across {families} families (community catalog; Epic may add more over the season).',
  },
  close: 'Close',
}

export default en
