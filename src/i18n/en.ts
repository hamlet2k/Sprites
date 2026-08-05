import type { MessageTree } from './locales'

const en: MessageTree = {
  app: {
    title: 'Sprite Squad',
    suggest: 'Exchanges',
    support: 'Support',
    supportTitle: 'Optional tip on Ko-fi — opens in a new tab',
    account: 'Account',
    signIn: 'Sign in',
    signOut: 'Sign out',
  },
  auth: {
    loginTitle: 'Sign in',
    signupTitle: 'Create account',
    forgotTitle: 'Reset password',
    optionalNote:
      'Optional. Sign in to keep your collection when you switch squads, and to reopen recent squads.',
    google: 'Continue with Google',
    discord: 'Continue with Discord',
    orEmail: 'or email',
    email: 'Email',
    password: 'Password',
    displayName: 'Display name',
    displayNamePlaceholder: 'How squad mates see you',
    login: 'Sign in',
    signup: 'Create account',
    sendReset: 'Send reset link',
    working: 'Please wait…',
    forgotLink: 'Forgot password?',
    needAccount: 'Create an account',
    haveAccount: 'Already have an account? Sign in',
    backToLogin: 'Back to sign in',
    checkEmail: 'Check your email to confirm the account, then sign in.',
    resetSent: 'If that email is registered, a reset link is on the way.',
    signedInAs: 'Signed in as {name}',
    newPassword: 'Choose a new password',
    savePassword: 'Save new password',
    passwordUpdated: 'Password updated. You can keep using the app.',
    linkTitle: 'Link your account to a squad seat',
    linkBody:
      'This squad already has players with collections that are not linked to an account. Pick who you are so we do not create a duplicate seat. Your portable collection will merge with that seat and follow you into every squad.',
    linkCreateNew: 'None of these — new seat',
    oauthError: 'Sign-in did not complete: {msg}',
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
      'john-wick':
        'Knocking players reveals others nearby. Mark duration increases at each Level Up (3s → 5s)',
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
      ironmouse:
        'Regenerate health over time when low. While regenerating, gain Cloak and low gravity',
      pollo:
        'Slowly replenishes Shield for you and teammates after an elimination',
      llama:
        'Opening ammo boxes has a chance to grant a weapon upgrade (5% → 20% by level)',
      peely:
        'Emits a ping for players with rare sprites nearby, but marks you on the map',
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
    createHint:
      'Start a new shared session with only your seat (add friends with + Add Player), or join a teammate’s code.',
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
      'Progress is saved in this browser. In a shared session, changes sync for everyone. Per-player Export / Import only touches that one collection. Sign in to keep your personal collection across squads.',
    playerN: 'Player {n}',
    cloudNotAvailable: 'Shared sessions are not available on this build.',
    squadName: 'Squad name',
    squadNamePlaceholder: 'Optional alias (e.g. Friday Night)',
    updateName: 'Update name',
    recentTitle: 'Recent squads',
    recentEmpty: 'No recent squads yet. Join or start a session while signed in.',
    recentJoin: 'Open',
    unnamedSquad: 'Unnamed squad',
    youBadge: 'You',
    copyCodeTitle: 'Copy session code',
    codeCopiedTitle: 'Code copied',
    codeCopiedMsg: 'Session code {code} copied to the clipboard.',
  },
  seat: {
    chooseTitle: 'Who are you?',
    chooseBody:
      'Pick your seat on this device. You can view others, but only your collection can be edited. (After importing a squad file, pick who you are.)',
    chooseJoinBody:
      'You joined a session. Choose your seat so we know who you are — seats marked Taken already belong to someone else.',
    createNew: 'I am a new player',
    switch: 'Switch seat',
    youHint: 'Your seat — you can edit this collection',
    viewOnlyHint: 'Viewing {name} (read-only)',
    viewingOther:
      'Viewing {name} — read only. Switch to your seat (or use Switch seat) to edit.',
    takenBadge: 'Taken',
    takenHint: '{name} is taken by another player (read-only for you)',
    lockedTitle: 'Not your seat',
    lockedImport: 'You can only import into your own seat.',
    cannotRemoveSelf: 'Switch seat first if you need to remove this player.',
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
    squadImportedTitle: 'Squad imported',
    squadImportedMsg:
      'Loaded {n} players. Pick your seat, then continue. Left any live session so the cloud does not overwrite this import.',
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

    disclaimerTitle: 'Disclaimer',
    disclaimerBody:
      'Unofficial fan tool. Not affiliated with, endorsed by, or connected to Epic Games in any way. All Fortnite names, assets and data belong to Epic Games. This tool is free. Donations are completely optional and only support development.',

    supportTitle: 'Support development',
    supportBody:
      'Sprite Squad stays free for everyone — no paywalls, no exclusive features. If you enjoy it and want to chip in optionally, you can buy me a coffee. Totally voluntary.',
    supportButton: 'Support on Ko-fi',
    supportLinkHint: 'Opens ko-fi.com in a new tab',

    startTitle: 'Quick start (first time)',
    start1:
      'Choose your seat when asked (“Who are you?”). That seat is the only collection you can edit.',
    start2:
      'Open Collection. With your seat selected, tap sprites to mark Ready / Lost / Missing / Mastered.',
    start3:
      'Optional: sign in (email, Google, or Discord) so your collection follows you across squads.',
    start4:
      'Squad tab: start a session (only your seat is uploaded) or join a code. Share the link with friends.',
    start5:
      'When you queue up, open Exchanges, tick everyone in this match (any number of players), and generate a plan. Confirm trades after the match.',

    seatsTitle: 'Your seat (important)',
    seats1:
      'Every device picks one seat. You can view teammates’ collections, but only your seat is editable — this avoids accidental changes.',
    seats2:
      'Use Switch seat if you need to become a different player on this device (rare).',
    seats3:
      'Leaving a session keeps only your seat locally. Starting a new session seeds the room with only you — add more players on the Squad tab as needed.',

    accountTitle: 'Optional account',
    account1:
      'Sign in from the header (email / Google / Discord). Guests still work fine without an account.',
    account2:
      'When signed in, your collection is saved to your account. Joining another squad reuses it on your linked seat.',
    account3:
      'If the squad already has unlinked players with progress, you will be asked which seat is you so we do not create a duplicate.',
    account4:
      'Recent squads appear on the Squad tab so you can reopen them quickly.',

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
      'In Collection, stay on your seat (marked You). Tap a sprite card to switch Ready ↔ Lost. If it was Missing, the first tap sets it to Ready.',
    collectionP2:
      'Use the crossed-circle button on a card if you need to mark it Missing again (mistake, or never really owned).',
    collectionP3:
      'You can tap another player’s chip to view their collection (read-only). Use search and filters if the grid feels long.',

    matchTitle: 'Before and after a match',
    matchBeforeTitle: 'Before you drop',
    matchBefore1:
      'Go to Exchanges and tick everyone playing this game (no limit on how many).',
    matchBefore2: 'Tap Generate Exchange Plan.',
    matchBefore3:
      'Read each match slot: who brings which sprite → who receives it. Up to 4 bring slots per player.',
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
      'Squad tab → Start session (optional squad name + Update name later). Copy the share link or code.',
    share2:
      'Friends open the link, choose their seat, and everyone shares the same list live. Each person only edits their own seat.',
    share3:
      'Leave session stops syncing; only your seat stays on this device. Join another code anytime (signed-in users see Recent squads).',
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
