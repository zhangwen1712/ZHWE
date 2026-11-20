export const languages = {en:'English',zh:'简体中文','zh-Hant':'繁體中文',fr:'Français',es:'Español',it:'Italiano',de:'Deutsch'};
export const labels = {
 en:{map:'Footprints',theme:'Appearance',light:'Light',dark:'Dark',system:'System',nav:'Main navigation',footer:'Footer navigation',language:'Language',home:'Home',about:'About',links:'Links',history:'Site history',privacy:'Privacy',posts:'Posts',all:'All posts',featured:'Featured',more:'More posts',read:'Read',comments:'Comments',next:'Next',previous:'Previous',tagline:'Welcome to my site. . .',toggleLight:'Switch to light mode',toggleDark:'Switch to dark mode'},
 'zh-Hant':{map:'足跡',theme:'外觀',light:'淺色',dark:'深色',system:'隨系統',nav:'主導覽',footer:'頁尾導覽',language:'語言',home:'首頁',about:'關於章文',links:'友情連結',history:'建站日誌',privacy:'隱私權政策',posts:'文章',all:'全部文章',featured:'精選集',more:'查看更多文章',read:'閱讀',comments:'評論',next:'下一頁',previous:'上一頁',tagline:'歡迎來到我的站點. . .',toggleLight:'切換至淺色模式',toggleDark:'切換至深色模式'},
 zh:{map:'足迹',theme:'外观',light:'浅色',dark:'深色',system:'随系统',nav:'主导航',footer:'页脚导航',language:'语言',home:'首页',about:'关于章文',links:'友情链接',history:'建站日志',privacy:'隐私政策',posts:'文章',all:'全部文章',featured:'精选集',more:'查看更多文章',read:'阅读',comments:'评论',next:'下一页',previous:'上一页',tagline:'欢迎来到我的站点. . .',toggleLight:'切换到浅色模式',toggleDark:'切换到深色模式'},
 fr:{map:'Mes pas',theme:'Apparence',light:'Clair',dark:'Sombre',system:'Système',nav:'Navigation principale',footer:'Navigation de pied de page',language:'Langue',home:'Accueil',about:'À propos',links:'Liens',history:'Historique du site',privacy:'Confidentialité',posts:'Articles',all:'Tous les articles',featured:'Sélection',more:'Plus d’articles',read:'Lire',comments:'Commentaires',next:'Suivant',previous:'Précédent',tagline:'Bienvenue sur mon site. . .',toggleLight:'Activer le mode clair',toggleDark:'Activer le mode sombre'},
 es:{map:'Mis pasos',theme:'Apariencia',light:'Claro',dark:'Oscuro',system:'Sistema',nav:'Navegación principal',footer:'Navegación del pie de página',language:'Idioma',home:'Inicio',about:'Acerca de',links:'Enlaces',history:'Historia del sitio',privacy:'Privacidad',posts:'Artículos',all:'Todos los artículos',featured:'Selección',more:'Más artículos',read:'Leer',comments:'Comentarios',next:'Siguiente',previous:'Anterior',tagline:'Bienvenido a mi sitio. . .',toggleLight:'Activar modo claro',toggleDark:'Activar modo oscuro'},
 it:{map:'I miei passi',theme:'Aspetto',light:'Chiaro',dark:'Scuro',system:'Sistema',nav:'Navigazione principale',footer:'Navigazione piè di pagina',language:'Lingua',home:'Home',about:'Chi sono',links:'Link',history:'Storia del sito',privacy:'Privacy',posts:'Articoli',all:'Tutti gli articoli',featured:'In evidenza',more:'Altri articoli',read:'Leggi',comments:'Commenti',next:'Successivo',previous:'Precedente',tagline:'Benvenuti nel mio sito. . .',toggleLight:'Attiva modalità chiara',toggleDark:'Attiva modalità scura'},
 de:{map:'Meine Spuren',theme:'Darstellung',light:'Hell',dark:'Dunkel',system:'System',nav:'Hauptnavigation',footer:'Fußzeilennavigation',language:'Sprache',home:'Startseite',about:'Über mich',links:'Links',history:'Website-Chronik',privacy:'Datenschutz',posts:'Beiträge',all:'Alle Beiträge',featured:'Auswahl',more:'Weitere Beiträge',read:'Lesen',comments:'Kommentare',next:'Weiter',previous:'Zurück',tagline:'Willkommen auf meiner Website. . .',toggleLight:'Hellen Modus aktivieren',toggleDark:'Dunklen Modus aktivieren'}
};
export const localPath=(path,lang)=>lang==='en'?path:`/${lang}${path.startsWith('/')?path:'/'+path}`;

export const searchLabels = {
 en:{title:'Search posts',action:'Search',query:'Keywords',loading:'Searching…',empty:'No matching posts found.',error:'Search is unavailable. Please try again.',results:'{count} posts found.',more:'Load more results',noScript:'Enable JavaScript to search posts.'},
 'zh-Hant':{title:'搜尋文章',action:'搜尋',query:'關鍵字',loading:'搜尋中…',empty:'沒有找到符合的文章。',error:'暫時無法搜尋，請重試。',results:'找到 {count} 篇文章。',more:'載入更多結果',noScript:'請啟用 JavaScript 以搜尋文章。'},
  zh: {
    title: '搜索文章', action: '搜索', query: '关键词',
    loading: '正在搜索…', empty: '没有找到匹配的文章。',
    error: '暂时无法搜索，请重试。', results: '找到 {count} 篇文章。',
    more: '加载更多结果', noScript: '请启用 JavaScript 以搜索文章。'
  },
  fr: {
    title: 'Rechercher des articles', action: 'Rechercher', query: 'Mots-clés',
    loading: 'Recherche en cours…', empty: 'Aucun article correspondant.',
    error: 'La recherche est indisponible. Réessayez.', results: 'Articles trouvés : {count}.',
    more: 'Afficher plus de résultats', noScript: 'Activez JavaScript pour rechercher des articles.'
  },
  es: {
    title: 'Buscar artículos', action: 'Buscar', query: 'Palabras clave',
    loading: 'Buscando…', empty: 'No se encontraron artículos.',
    error: 'La búsqueda no está disponible. Inténtalo de nuevo.', results: 'Artículos encontrados: {count}.',
    more: 'Ver más resultados', noScript: 'Activa JavaScript para buscar artículos.'
  },
  it: {
    title: 'Cerca articoli', action: 'Cerca', query: 'Parole chiave',
    loading: 'Ricerca in corso…', empty: 'Nessun articolo corrispondente.',
    error: 'La ricerca non è disponibile. Riprova.', results: 'Articoli trovati: {count}.',
    more: 'Mostra altri risultati', noScript: 'Attiva JavaScript per cercare articoli.'
  },
  de: {
    title: 'Beiträge suchen', action: 'Suchen', query: 'Suchbegriffe',
    loading: 'Suche läuft…', empty: 'Keine passenden Beiträge gefunden.',
    error: 'Die Suche ist derzeit nicht verfügbar. Bitte versuche es erneut.', results: 'Gefundene Beiträge: {count}.',
    more: 'Weitere Ergebnisse anzeigen', noScript: 'Aktiviere JavaScript, um Beiträge zu suchen.'
  }
};
