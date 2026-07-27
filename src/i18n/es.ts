import type { MessageTree } from './locales'

const es: MessageTree = {
  app: {
    title: 'Sprite Squad',
    suggest: 'Intercambios',
    support: 'Apoyar',
    supportTitle: 'Propina opcional en Ko-fi — se abre en una pestaña nueva',
  },
  lang: {
    label: 'Idioma',
    en: 'English',
    es: 'Español',
  },
  tabs: {
    collection: 'Colección',
    suggest: 'Intercambios',
    squad: 'Escuadra',
    help: 'Ayuda',
  },
  status: {
    missing: 'Falta',
    ready: 'Listo',
    available: 'Disponible',
    lost: 'Perdido',
    mastered: 'Maestría',
    notMastered: 'Sin Maestría',
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
  effects: {
    family: {
      batman: 'Capa de murciélago — planeo aéreo potenciado',
      water:
        'Regenera escudo para ti y tus compañeros de escuadra mientras estás en el agua',
      earth:
        'Mayor probabilidad de encontrar objetos raros adicionales en cofres',
      fire:
        'Crea una explosión de fuego tras infligir suficiente daño a un enemigo',
      duck: 'Emotear o bailar regenera escudo',
      ghost: 'Otorga camuflaje breve al recargar',
      dream:
        'Objeto aleatorio en cada subida de nivel; al nivel 5 explota con botín legendario, se autoextrae y vuelve a 1',
      demon: 'Absorbe salud y escudo al eliminar',
      punk: 'Al nivel 5 puede otorgar munición infinita',
      king: 'Aumenta el daño del pico',
      'burnt-peanut':
        'Probabilidad de botín raro extra (a veces mítico) en eliminaciones',
      'vini-jr':
        'Al esprintar habilita un deslizamiento dañino; deslizarte hacia enemigos mejora recarga y cadencia',
      'zero-point':
        'Burbuja de escudo Jr. al usar un objeto de curación en ti mismo',
      fishy: 'Mayor velocidad de nado; impulso de velocidad al recibir daño',
      striker:
        'Sobreaceleración breve al trepar, saltar obstáculos o escalar muros',
      aura: 'Carga de Roca de Choque tras infligir suficiente daño (onda expansiva)',
      boss: 'Aumenta la salud y el escudo máximos',
      grim: 'Los jugadores que te dañan quedan marcados un breve tiempo',
      air: 'Mayor salto y velocidad de esprint; elimina el daño por caída',
      seven: 'Revela las huellas de los oponentes durante unos segundos',
      pollo:
        'Regenera lentamente escudo para ti y tus compañeros tras una eliminación',
    },
    variant: {
      gold: '3× XP de bonificación por eliminaciones',
      gummy: 'Polvo de Espíritu extra al extraer',
      galaxy: 'Munición extra al saquear',
      holofoil:
        '+5% de probabilidad de encontrar variantes raras de espíritus en cofres (escuadra)',
      cube: 'Sobreaceleración en la tormenta / escudo extra al subir de nivel',
      gem: '30% menos daño por caída (próximamente)',
      quack: 'Variante especial temática Quack',
    },
  },
  collection: {
    owned: 'Conseguidos',
    available: 'Disponibles',
    lost: 'Perdidos',
    mastered: 'Maestría',
    legendTapPrefix: 'Toca:',
    legendMissing: '✕ Falta',
    legendMastered: '♛ Maestría',
    statsFilterLabel: 'Filtros rápidos de estado',
    legendFilterLabel: 'Filtros de la leyenda',
    filterOwnedTitle: 'Mostrar todos los espíritus',
    filterAvailableTitle: 'Mostrar solo Listos',
    filterLostTitle: 'Mostrar solo Perdidos',
    filterMasteredTitle: 'Mostrar solo con Maestría',
    legendTapTitle: 'Alternar Listo ↔ Falta + Perdidos',
    legendMissingTitle: 'Mostrar solo los que Faltan',
    legendMasteredTitle: 'Mostrar solo con Maestría',
    searchPlaceholder: 'Buscar espíritus…',
    sortTitle: 'Ordenar familias',
    sortType: 'Orden: Tipo',
    sortRarity: 'Orden: Rareza',
    sortDust: 'Orden: Coste',
    allStatus: 'Todos los Estados',
    needFilter: 'Falta + Perdidos',
    dustTitle: 'Polvo de Espíritu para reinvocar tras perderlo',
    dust: 'polvo',
    markMissing: 'Marcar como falta',
    toggleMastered: 'Alternar maestría',
    masteredBadge: 'Maestría',
    noMatch: 'Ningún espíritu coincide con los filtros.',
  },
  suggest: {
    whoPlaying: '¿Quién juega esta partida?',
    generate: 'Generar plan de intercambios',
    modeLabel: 'Estilo del plan',
    modeCompletion: 'Enfoque Completar',
    modeFair: 'Enfoque Paridad',
    modeCompletionHint:
      'Maximiza nuevas adquisiciones cada partida. Los caminos injustos valen si la escuadra termina antes.',
    modeFairHint:
      'Prioriza trueques mutuos A↔B y equilibra quién da y quién recibe en cada partida.',
    hintCompletion:
      'Completar lo que Falta lo más rápido posible. Regalos Listos primero; la rareza solo desempata. Caminos injustos OK si completan más huecos. Ping-pong de perdidos → maestría. Tras la partida: Intercambiado / Perdido / Ignorar.',
    hintFair:
      'Trueques 1:1 justos: primero intercambios mutuos y balance dar/recibir para que nadie sea solo dador. Nuevas adquisiciones antes que restaurar perdidos; solo perdidos → maestría. Tras la partida: Intercambiado / Perdido / Ignorar.',
    modeMismatch:
      'Este plan se generó con otro estilo. Vuelve a generar para aplicar el estilo seleccionado.',
    noAssignments: 'Aún no hay asignaciones. Marca colecciones y elige jugadores.',
    round: 'Partida {n}',
    exchange: 'intercambio',
    exchanges: 'intercambios',
    confirmed: '{n} intercambiados',
    handled: '{n} resueltos',
    masteryCount: '{n} maestría',
    allConfirmed: 'Todo resuelto',
    allHandled: 'Todo resuelto',
    noExchanges: 'Sin intercambios',
    confirmRemaining: 'Intercambiados restantes ({n})',
    confirmAll: 'Intercambiar todos',
    failed: 'Perdido',
    failedTitle:
      'El trueque falló en partida (murió o perdió el espíritu antes de extraer). Portador → Perdido; el receptor no lo obtiene.',
    failedAll: 'Marcar todos perdidos',
    failedRemaining: 'Marcar restantes perdidos ({n})',
    failedTag: 'Perdido',
    ignore: 'Ignorar',
    ignoreTitle:
      'Olvidó traerlo — sin cambios de colección. El receptor no lo obtiene; el portador conserva su estado.',
    ignoreAll: 'Ignorar todos',
    ignoreRemaining: 'Ignorar restantes ({n})',
    ignoredTag: 'Ignorado',
    newMissing: 'Nueva adquisición',
    restoreLost: 'Restaurar perdido',
    mastery: 'Maestría',
    bringerRepurchase: 'Recompra del portador',
    confirmedTag: 'Intercambiado',
    brings: 'trae',
    dustBringerPays: 'polvo (paga el portador)',
    confirm: 'Intercambiado',
    done: 'Hecho',
    dustIfLost: 'Coste de polvo si se pierde / reinvoca',
    dustBringerMust: 'El portador debe reinvocar con polvo antes de intercambiar',
    selectPlayers: 'Elige quién juega y abre Intercambios.',
    summaryPlayers: '{n} jugadores',
    summaryExchanges: '{n} intercambios',
    summaryMissing: '{n} nuevas adquisiciones',
    summaryRestores: '{n} restauraciones',
    summaryGifts: '{n} regalos',
    summaryRepurchases: '{n} recompras',
    summaryMastery: '{n} maestría',
    summaryCompletion:
      '{players} jugadores · Enfoque Completar · {exchanges} intercambio(s) · {missing} nuevas adquisiciones · {restores} restaurar · {gifts} regalo · {repurchases} recompra · {mastery} maestría',
    summaryFair:
      '{players} jugadores · Enfoque Paridad · {exchanges} intercambio(s) · {missing} nuevas adquisiciones · {restores} restaurar · {gifts} regalo · {repurchases} recompra · {mastery} maestría',
    needMissing: 'nueva adquisición para su colección',
    needLost: 'perdido — restaurar sin su polvo',
    tradeRepurchase:
      'Recompra primero ({cost} polvo) → {receiver} ({need}, {difficulty})',
    tradeReady: 'Trueque a {receiver} — {need} ({difficulty})',
    masteryNoTradeRepurchase:
      'Sin trueques — recompra y sube maestría ({cost} polvo)',
    masteryNoTrade: 'Sin trueques útiles — tráelo para subir maestría',
    masteryThrashRepurchase:
      'Partida solo de restaurar perdidos omitida — recompra y maestría ({cost} polvo)',
    masteryThrash:
      'Partida solo de restaurar perdidos omitida — tráelo para subir maestría',
    huntThrash:
      'Esta partida solo tenía intercambios de perdidos (omitidos) — caza / truequea a mitad de partida',
    huntFree:
      'Sin trueque ni objetivos de maestría — abre cofres / truequea a mitad de partida',
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
    titleOne: '¿Marcar como intercambiado?',
    titleRoundOne: '¿Marcar el intercambio de la Partida {n} como hecho?',
    titleRoundMany:
      '¿Marcar {count} intercambios restantes de la Partida {n} como hechos?',
    subtitle:
      'Los receptores pasan a Listo; los portadores marcan esos espíritus como Perdidos. Marca solo los trueques que sí ocurrieron.',
    failTitleOne: '¿Marcar este intercambio como perdido?',
    failTitleRoundOne: '¿Marcar el intercambio de la Partida {n} como perdido?',
    failTitleRoundMany:
      '¿Marcar {count} intercambios restantes de la Partida {n} como perdidos?',
    failSubtitle:
      'Úsalo si el portador murió o perdió el espíritu antes de extraer. Portador → Perdido. El receptor se queda Falta/Perdido (no lo adquiere).',
    ignoreTitleOne: '¿Ignorar este intercambio?',
    ignoreTitleRoundOne: '¿Ignorar el intercambio de la Partida {n}?',
    ignoreTitleRoundMany:
      '¿Ignorar {count} intercambios restantes de la Partida {n}?',
    ignoreSubtitle:
      'Úsalo si alguien olvidó traer el espíritu. Sin cambios de colección para portador ni receptor — solo se cierra esta fila del plan.',
    cancel: 'Cancelar',
    confirmOne: 'Intercambiado',
    confirmMany: 'Intercambiado ({n})',
    failConfirmOne: 'Perdido',
    failConfirmMany: 'Perdido ({n})',
    ignoreConfirmOne: 'Ignorar',
    ignoreConfirmMany: 'Ignorar ({n})',
    nothingTitle: 'Nada actualizado',
    nothingSkipped: 'No se pudieron aplicar estos intercambios.',
    nothingIds:
      'Los ids de jugador no coinciden — regenera el plan e inténtalo de nuevo.',
    successOne: 'Intercambio registrado',
    successMany: '{n} intercambios registrados',
    successMsg:
      'Colecciones actualizadas: receptores Listo, portadores Perdido. Revisa Colección si quieres comprobarlo.',
    failSuccessOne: 'Intercambio marcado perdido',
    failSuccessMany: '{n} intercambios marcados perdidos',
    failSuccessMsg:
      'Portadores marcados Perdido. Los receptores no recibieron el espíritu. Revisa Colección si quieres comprobarlo.',
    ignoreSuccessOne: 'Intercambio ignorado',
    ignoreSuccessMany: '{n} intercambios ignorados',
    ignoreSuccessMsg:
      'Sin cambios de colección. La fila del plan se cierra para todos en la sesión.',
    alreadyTitle: 'Ya resuelto',
    alreadyMsg: 'Estos intercambios ya se aplicaron en este plan.',
    ok: 'Vale',
    tagNew: 'Nueva adquisición',
    tagRestore: 'Restaurar',
    tagRepurchase: 'Recompra',
  },
  squad: {
    shareTitle: 'Sincronizar con la escuadra',
    cloudUnavailable:
      'Las sesiones compartidas no están disponibles en esta versión. Aún puedes llevar colecciones en local y usar Exportar / Importar (escuadra o por jugador) para compartir archivos.',
    roomCode: 'Código de sesión:',
    roomHint: 'Todos abren el mismo enlace y editan la misma colección en vivo.',
    copyLink: 'Copiar enlace',
    leaveRoom: 'Salir de la sesión',
    status: 'Estado:',
    createHint:
      'Inicia una sesión compartida con tus datos actuales, o únete al código de un compañero.',
    createRoom: 'Iniciar sesión',
    working: 'Trabajando…',
    roomPlaceholder: 'Código de sesión',
    join: 'Unirse a sesión',
    moveUp: 'Subir',
    moveDown: 'Bajar',
    export: 'Exportar',
    import: 'Importar',
    remove: 'Eliminar',
    exportPlayerTitle: 'Exportar solo este jugador',
    importPlayerTitle: 'Importar solo en este jugador (los demás no cambian)',
    removeTitle: 'Eliminar jugador',
    addPlayer: '+ Agregar Jugador',
    exportFull: 'Exportar escuadra',
    importFull: 'Importar escuadra',
    footer:
      'El progreso se guarda en este navegador. En una sesión compartida, los cambios se sincronizan para todos. Exportar / Importar por jugador solo toca esa colección.',
    playerN: 'Jugador {n}',
    cloudNotAvailable:
      'Las sesiones compartidas no están disponibles en esta versión.',
  },
  deletePlayer: {
    title: '¿Eliminar jugador?',
    body:
      '¿Eliminar a {name} y toda su colección de esta escuadra? No se puede deshacer salvo que tengas una exportación de respaldo.',
    confirm: 'Eliminar jugador',
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
    connecting: 'Sesión {code}…',
    saving: 'Guardando {code}',
    synced: 'En vivo · {code}',
    error: 'Error de sync · {code}',
    offline: 'Sin conexión · {code}',
    pleaseWait: 'Guardando en la sesión… espera un momento',
    errorTapRefresh: 'Toca para recargar la página y re-sincronizar',
  },
  help: {
    introTitle: '¿Qué es Sprite Squad?',
    introP1:
      'Un ayudante sencillo para tu escuadra de Fortnite con los Espíritus de Capítulo 7 Temporada 3. Úsalo en el lobby o entre partidas para saber quién tiene qué — y quién debería llevar cada espíritu para truequear con los amigos.',
    introP2:
      'No modifica el juego. Tú actualizas la app mientras jugáis y luego seguís el plan de trueques que sugiere.',

    disclaimerTitle: 'Aviso legal',
    disclaimerBody:
      'Herramienta no oficial hecha por fans. No está afiliada, respaldada ni conectada con Epic Games de ninguna forma. Todos los nombres, recursos y datos de Fortnite pertenecen a Epic Games. Esta herramienta es gratis. Las donaciones son totalmente opcionales y solo apoyan el desarrollo.',

    supportTitle: 'Apoyar el desarrollo',
    supportBody:
      'Sprite Squad sigue siendo gratis para todos — sin muros de pago ni funciones exclusivas. Si te gusta y quieres aportar de forma opcional, puedes invitarme a un café. Es completamente voluntario.',
    supportButton: 'Apoyar en Ko-fi',
    supportLinkHint: 'Abre ko-fi.com en una pestaña nueva',

    startTitle: 'Empezar (primera vez)',
    start1:
      'Abre la pestaña Escuadra. Pon el nombre de cada jugador (añade o quita gente si hace falta).',
    start2:
      'Opcional: crea una sala y comparte el enlace o el código para que todos vean la misma lista en el móvil.',
    start3:
      'Abre Colección. Elige un jugador y toca los espíritus para marcar lo que tiene.',
    start4:
      'Cuando hagáis cola, abre Intercambios, marca quién entra en esa partida y genera un plan.',
    start5:
      'Después de la partida, confirma solo los trueques que de verdad ocurrieron.',

    statusesTitle: 'Estados de un espíritu (lo importante)',
    statusMissingTitle: 'Falta',
    statusMissingBody: 'Nunca lo metió en la colección.',
    statusReadyTitle: 'Listo',
    statusReadyBody:
      'Está en su colección y puede equiparlo/llevarlo sin gastar Polvo de Espíritu.',
    statusLostTitle: 'Perdido',
    statusLostBody:
      'Lo tuvo, pero necesita Polvo de Espíritu para reinvocarlo antes de poder llevarlo otra vez.',
    statusMasteredTitle: 'Maestría (corona)',
    statusMasteredBody:
      'Extraído al nivel máximo (nivel 5). Va aparte de Listo/Perdido: usa el botón de la corona para marcarlo.',

    collectionTitle: 'Actualizar la colección',
    collectionP1:
      'En Colección, elige un jugador arriba. Toca una carta para alternar Listo ↔ Perdido. Si estaba en Falta, el primer toque lo pone Listo.',
    collectionP2:
      'Usa el botón de círculo tachado si necesitas marcarlo otra vez como Falta (error, o en realidad no lo tenía).',
    collectionP3:
      'Usa la búsqueda y los filtros si la lista es larga. Reordena jugadores en Escuadra si quieres otra orden en las fichas.',

    matchTitle: 'Antes y después de una partida',
    matchBeforeTitle: 'Antes de entrar',
    matchBefore1: 'Ve a Intercambios y marca quién juega esta partida.',
    matchBefore2: 'Pulsa Generar plan de intercambios.',
    matchBefore3:
      'Lee cada partida: quién trae qué espíritu → quién lo recibe. Hasta 4 huecos por jugador.',
    matchAfterTitle: 'Después de la partida',
    matchAfter1:
      'Marca cada trueque que salió bien (uno a uno, o los restantes de una partida).',
    matchAfter2:
      'Al marcarlo como Intercambiado, la app actualiza la lista: el receptor queda Listo y el portador Perdido en ese espíritu.',
    matchAfter3:
      'Usa Perdido si el trueque falló (alguien murió con el espíritu, persona equivocada, etc.).',

    suggestTitle: 'Qué intenta hacer el plan',
    suggest1:
      'Primero rellenar huecos reales (Falta / nuevas adquisiciones) de los compañeros, con trueques de uno da / uno recibe por partida.',
    suggest2:
      'Si alguien ya lo tenía pero está Perdido, las restauraciones se pueden mezclar cuando el plan lo elija.',
    suggest3:
      'Si una partida solo intercambiaría restauraciones de Perdidos (sin nuevas adquisiciones), sugiere maestría o cazar libremente — para no ciclar el mismo Listo/Perdido sin fin.',
    suggest4:
      'Prefiere portadores que ya tienen el espíritu Listo (sin polvo) cuando puede.',

    shareTitle: 'Jugar con amigos en la misma lista',
    share1:
      'Pestaña Escuadra → Iniciar sesión. Copia el enlace (o diles el código de sesión).',
    share2:
      'Los amigos abren el enlace, o escriben el código y pulsan Unirse. Todos editan las mismas colecciones en vivo.',
    share3:
      'Salir de la sesión deja de sincronizar en tu dispositivo; la copia local se queda. Luego puedes unirte a otro código.',
    shareNote:
      'Si en esta versión no hay sesiones compartidas, usa Exportar / Importar archivos para compartir los datos.',

    backupTitle: 'Copias de seguridad (opcionales pero útiles)',
    backupFull:
      'Exportar escuadra guarda a todos. Importar escuadra sustituye toda la escuadra por ese archivo — úsalo con cuidado.',
    backupPlayer:
      'Exportar / Importar en la fila de un jugador solo actualiza a esa persona. Ideal para un respaldo personal o cargar un amigo sin tocar al resto.',

    tipTitle: 'Consejos',
    tip1: 'Actualiza la colección en cuanto extraigáis o perdáis un espíritu para que Intercambios sea fiable.',
    tip2: 'Marca solo los trueques que de verdad pasaron en la partida.',
    tip3: 'Puedes cambiar el idioma cuando quieras con el selector de la barra superior (English / Español).',
    tipCatalog:
      'La app lista {sprites} combinaciones de espíritus en {families} familias (catálogo de la comunidad; Epic puede añadir más durante la temporada).',
  },
  close: 'Cerrar',
}

export default es
