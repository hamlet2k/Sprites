import type { MessageTree } from './locales'

const es: MessageTree = {
  app: {
    title: 'Sprite Squad',
    suggest: 'Sugerir',
  },
  lang: {
    label: 'Idioma',
    en: 'English',
    es: 'Español',
  },
  tabs: {
    collection: 'Colección',
    suggest: 'Sugerir',
    squad: 'Escuadra',
    help: 'Ayuda',
  },
  status: {
    missing: 'Falta',
    ready: 'Listo',
    available: 'Disponible',
    lost: 'Perdido',
    mastered: 'Dominado',
    notMastered: 'Sin dominar',
  },
  rarity: {
    rare: 'Raro',
    epic: 'Épico',
    legendary: 'Legendario',
    mythic: 'Mítico',
    special: 'Especial',
  },
  variant: {
    all: 'Todas las variantes',
    base: 'Base',
    gold: 'Oro',
    gummy: 'Gomoso',
    galaxy: 'Galaxia',
    holofoil: 'Holofoil',
    cube: 'Cubo',
    gem: 'Gema',
    quack: 'Quack',
  },
  collection: {
    owned: 'conseguidos',
    available: 'disponibles',
    lost: 'perdidos',
    mastered: 'dominados',
    legendTap: 'Toca: Listo ↔ Perdido',
    legendMissing: '✕ Falta',
    legendMastered: '♛ Dominado',
    searchPlaceholder: 'Buscar sprites…',
    sortTitle: 'Ordenar familias',
    sortType: 'Orden: tipo del juego',
    sortRarity: 'Orden: rareza',
    sortDust: 'Orden: coste de polvo',
    allStatus: 'Todos los estados',
    needFilter: 'Falta + perdidos',
    dustTitle: 'Polvo de Sprite para reinvocar tras perderlo',
    dust: 'polvo',
    markMissing: 'Marcar como falta',
    toggleMastered: 'Alternar dominado',
    masteredBadge: 'Dominado',
    noMatch: 'Ningún sprite coincide con los filtros.',
  },
  suggest: {
    whoPlaying: '¿Quién juega esta partida?',
    generate: 'Generar plan de regalos / traídas',
    hint:
      'Cada ronda busca un 1:1 justo: cada jugador da uno y recibe uno cuando sea posible. Rellenar lo que falta siempre gana a restaurar perdidos. Si una ronda solo intercambiaría restauraciones de perdidos (sin huecos nuevos), pasa a dominio / cazar, para no ciclar Listo/Perdido. Las rondas mixtas (falta + restaurar) se mantienen como trueques justos. Tras la partida, confirma cada intercambio que sí ocurrió.',
    noAssignments: 'Aún no hay asignaciones. Marca colecciones y elige jugadores.',
    round: 'Ronda {n}',
    exchange: 'intercambio',
    exchanges: 'intercambios',
    confirmed: '{n} confirmados',
    masteryCount: '{n} dominio',
    allConfirmed: 'Todo confirmado',
    noExchanges: 'Sin intercambios',
    confirmRemaining: 'Confirmar restantes ({n})',
    confirmAll: 'Confirmar todos',
    newMissing: 'Nuevo (falta)',
    restoreLost: 'Restaurar perdido',
    mastery: 'Dominio',
    bringerRepurchase: 'Recompra del portador',
    confirmedTag: 'Confirmado',
    brings: 'trae',
    dustBringerPays: 'polvo (paga el portador)',
    confirm: 'Confirmar',
    done: 'Hecho',
    dustIfLost: 'Coste de polvo si se pierde / reinvoca',
    dustBringerMust: 'El portador debe reinvocar con polvo antes de intercambiar',
    selectPlayers: 'Elige quién juega y pulsa Sugerir.',
    summary:
      '{players} jugadores · 1:1 justo · {exchanges} intercambio(s) · {missing} faltan · {restores} restaurar · {gifts} regalo · {repurchases} recompra · {mastery} dominio',
    needMissing: 'falta en la colección',
    needLost: 'perdido — restaurar sin su polvo',
    tradeRepurchase:
      'Recompra primero ({cost} polvo) → {receiver} ({need}, {difficulty})',
    tradeReady: 'Trueque a {receiver} — {need} ({difficulty})',
    masteryNoTradeRepurchase:
      'Sin trueques — recompra y sube dominio ({cost} polvo)',
    masteryNoTrade: 'Sin trueques útiles — tráelo para subir dominio',
    masteryThrashRepurchase:
      'Ronda solo de restaurar perdidos omitida — recompra y dominio ({cost} polvo)',
    masteryThrash:
      'Ronda solo de restaurar perdidos omitida — tráelo para subir dominio',
    huntThrash:
      'Esta ronda solo tenía intercambios de perdidos (omitidos) — caza / truequea a mitad de partida',
    huntFree:
      'Sin trueque ni objetivos de dominio — abre cofres / truequea a mitad de partida',
    huntName: 'Cazar libremente',
    difficulty: {
      ultraRare: 'ultra raro',
      veryRare: 'muy raro',
      rare: 'raro',
      uncommon: 'poco común',
      common: 'hueco común',
    },
  },
  confirm: {
    titleOne: '¿Confirmar este intercambio?',
    titleRoundOne: '¿Confirmar intercambio de la ronda {n}?',
    titleRoundMany: '¿Confirmar {count} intercambios restantes de la ronda {n}?',
    subtitle:
      'Los receptores pasan a Listo; los portadores marcan esos sprites como Perdidos. Confirma solo los trueques que sí ocurrieron.',
    cancel: 'Cancelar',
    confirmOne: 'Confirmar intercambio',
    confirmMany: 'Confirmar {n} intercambios',
    nothingTitle: 'Nada actualizado',
    nothingSkipped: 'No se pudieron aplicar estos intercambios.',
    nothingIds:
      'Los ids de jugador no coinciden — regenera el plan e inténtalo de nuevo.',
    successOne: 'Intercambio confirmado',
    successMany: '{n} intercambios confirmados',
    successMsg:
      'Colecciones actualizadas: receptores Listo, portadores Perdido. Revisa Colección si quieres comprobarlo.',
    alreadyTitle: 'Ya confirmado',
    alreadyMsg: 'Estos intercambios ya se aplicaron en este plan.',
    ok: 'Vale',
    tagNew: 'Nuevo',
    tagRestore: 'Restaurar',
    tagRepurchase: 'Recompra',
  },
  squad: {
    shareTitle: 'Compartir con la escuadra (internet)',
    cloudUnavailable:
      'Las salas en vivo no están disponibles en esta versión. Aún puedes llevar colecciones en local y usar Exportar / Importar (escuadra completa o por jugador) para compartir archivos.',
    roomCode: 'Código de sala:',
    roomHint: 'Todos abren el mismo enlace y editan la misma colección en vivo.',
    copyLink: 'Copiar enlace',
    leaveRoom: 'Salir de la sala',
    status: 'Estado:',
    createHint: 'Crea una sala con tus datos actuales, o únete al código de un compañero.',
    createRoom: 'Crear sala',
    working: 'Trabajando…',
    roomPlaceholder: 'Código de sala',
    join: 'Unirse',
    moveUp: 'Subir',
    moveDown: 'Bajar',
    export: 'Exportar',
    import: 'Importar',
    remove: 'Quitar',
    exportPlayerTitle: 'Exportar solo este jugador',
    importPlayerTitle: 'Importar solo en este jugador (los demás no cambian)',
    removeTitle: 'Quitar jugador',
    addPlayer: '+ Añadir jugador',
    exportFull: 'Exportar escuadra completa',
    importFull: 'Importar escuadra completa',
    footer:
      'El progreso se guarda en este navegador. En una sala en vivo, los cambios se sincronizan para todos. Exportar / Importar por jugador solo toca esa colección.',
    playerN: 'Jugador {n}',
    cloudNotAvailable: 'Las salas en la nube no están disponibles en esta versión.',
  },
  deletePlayer: {
    title: '¿Quitar jugador?',
    body:
      '¿Quitar a {name} y toda su colección de esta escuadra? No se puede deshacer salvo que tengas una exportación de respaldo.',
    confirm: 'Quitar jugador',
  },
  importExport: {
    linkCopiedTitle: 'Enlace copiado',
    linkCopiedMsg: 'Enlace copiado al portapapeles. Envíalo a tu escuadra.',
    copyLinkTitle: 'Copia este enlace',
    importFailed: 'Error al importar',
    importSquadInvalid: 'No se pudo importar el archivo — JSON de escuadra no válido.',
    playerImportedTitle: 'Jugador importado',
    playerImportedMsg:
      'Solo se actualizó la colección de {name}. El resto de la escuadra no cambió.',
    playerDefault: 'jugador',
  },
  sync: {
    connecting: 'Sala {code}…',
    saving: 'Guardando {code}',
    synced: 'En vivo · {code}',
    error: 'Error de sync · {code}',
    offline: 'Sin conexión · {code}',
  },
  help: {
    howTitle: 'Cómo usarlo (en el lobby / entre partidas)',
    collection:
      'Colección — elige un compañero y toca una carta para alternar Listo ↔ Perdido (si falta, el primer toque lo pone Listo).',
    missingBtn: 'Toca el botón de círculo tachado para marcarlo como Falta.',
    readyLost:
      'Listo = se puede llevar sin Polvo de Sprite. Perdido = hay que recomprarlo antes de llevarlo.',
    crown: 'Toca la corona cuando un sprite está dominado (extraído al nivel 5).',
    squadOrder:
      'Escuadra — usa ↑ / ↓ para reordenar jugadores; las fichas de Colección siguen ese orden.',
    suggest: 'Sugerir — marca quién juega la siguiente partida y genera un plan.',
    roomsTitle: 'Salas en vivo',
    createRoom:
      'Crear sala (pestaña Escuadra) — sube tu escuadra actual y obtiene un código corto.',
    shareLink:
      'Copiar enlace — envía la URL a tus compañeros, o que escriban el código y pulsen Unirse.',
    liveEdit:
      'Todos en la misma sala editan las mismas colecciones en vivo (el estado muestra En vivo / Guardando).',
    leaveRoom:
      'Salir de la sala — deja de sincronizar este navegador; la copia local se queda. Puedes unirte a otro código o crear una sala nueva cuando quieras.',
    exportTitle: 'Exportar e importar',
    exportFull:
      'Exportar / Importar escuadra completa — respaldo o reemplazo del JSON de toda la escuadra.',
    exportPlayer:
      'Exportar en la fila de un jugador — guarda solo su colección (para compartírsela o un respaldo personal).',
    importPlayer:
      'Importar en la fila de un jugador — carga un archivo solo en ese hueco; el resto no cambia. Acepta una exportación de un jugador, o una escuadra con exactamente un jugador.',
    rulesTitle: 'Reglas de sugerencias',
    fair:
      '1:1 justo: cada ronda, cada jugador da como máximo uno y recibe como máximo uno (si las colecciones lo permiten).',
    primary: 'Prioridad: lo que falta (nunca conseguido) antes de restaurar perdidos.',
    rounds:
      'Rondas 1–4: huecos para llevar; confirma cada intercambio (o el resto de la ronda) para que los receptores queden Listo y los portadores Perdido. Deja sin confirmar los trueques fallidos.',
    thrash:
      'Se omiten rondas solo de restaurar perdidos: si una ronda solo restauraría copias Perdidas (sin huecos nuevos), todos llevan para dominio / cazar en lugar de ciclar intercambios.',
    readyPrefer: 'Prefiere inventario Listo antes que recompra del portador.',
    catalogTitle: 'Catálogo',
    catalogCount:
      '{sprites} combinaciones de sprites en {families} familias (datos C7S3 a julio 2026).',
    variants:
      'Variantes: Base, Oro, Gomoso, Galaxia, Holofoil, Cubo (Gema/Quack reservados).',
  },
  close: 'Cerrar',
}

export default es
