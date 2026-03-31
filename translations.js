/* ════════════════════════════════════════════
   Sitemap Killer — Traductions FR / EN
   ════════════════════════════════════════════ */

var TRANSLATIONS = {
    fr: {
        // Navbar
        'nav.titre': 'Sitemap Killer',
        'nav.soustitre': 'Extraction de sitemaps XML',

        // Card Configuration
        'config.titre': '<i class="bi bi-gear"></i> Configuration',
        'form.label_url': 'URL du sitemap',
        'form.placeholder_url': 'https://example.com/sitemap.xml',
        'form.aide_url': 'URL directe du sitemap ou du site (avec l\'option robots.txt)',
        'form.mode_single': 'Sitemap unique',
        'form.mode_bulk': 'Sitemaps multiples',
        'form.label_urls_bulk': 'URLs des sitemaps',
        'form.label_urls_bulk_hint': '(une par ligne)',
        'form.placeholder_urls_bulk': 'https://example.com/sitemap-blog.xml\nhttps://example.com/sitemap-products.xml\nhttps://other-site.com/sitemap.xml',
        'form.label_robots': '<i class="bi bi-robot"></i> Détecter depuis robots.txt',
        'form.label_hreflang': '<i class="bi bi-translate"></i> Extraire les hreflang',
        'form.label_format_hreflang': 'Format hreflang',
        'form.option_flat': 'Flat (1 ligne par langue)',
        'form.option_pivot': 'Pivot (1 colonne par langue)',
        'form.label_filtre': 'Filtre URL (regex)',
        'form.placeholder_filtre': '/blog/|/products/',
        'form.aide_filtre': 'Expression régulière pour filtrer les URLs extraites (optionnel)',
        'form.btn_options_avancees': '<i class="bi bi-sliders"></i> Options avancées',
        'form.label_delimiteur': 'Délimiteur CSV',
        'form.option_pointvirgule': 'Point-virgule (;)',
        'form.option_virgule': 'Virgule (,)',
        'form.option_tabulation': 'Tabulation',
        'form.label_profondeur': 'Profondeur max',
        'form.label_timeout': 'Timeout (s)',
        'form.label_tentatives': 'Tentatives',
        'form.label_useragent': 'User-Agent',
        'form.placeholder_useragent': 'SitemapKiller/1.0 (PHP)',
        'form.label_masquer_entete': 'Masquer l\'en-tête CSV',
        'btn.extraire': '<i class="bi bi-play-fill"></i> Extraire',
        'btn.arreter': '<i class="bi bi-stop-fill"></i> Arrêter',

        // Panneau d'aide
        'help.titre_fonctionnement': '<i class="bi bi-info-circle me-1"></i> Comment ça marche',
        'help.item_url': '<strong>URL du sitemap</strong> : collez l\'URL directe d\'un fichier <code>sitemap.xml</code> ou d\'un sitemap index.',
        'help.item_robots': '<strong>Robots.txt</strong> : cochez cette option pour détecter automatiquement les sitemaps déclarés dans le <code>robots.txt</code> du site.',
        'help.item_hreflang': '<strong>Hreflang</strong> : extrait les balises <code>xhtml:link</code> hreflang et audite la réciprocité entre les versions linguistiques.',
        'help.item_filtre': '<strong>Filtre URL</strong> : regex pour ne garder que certaines URLs (ex : <code>/blog/</code>).',
        'help.item_export': '<strong>Export CSV</strong> : téléchargez le fichier complet ou filtré par sitemap source.',
        'help.titre_audit': '<i class="bi bi-lightbulb me-1"></i> Audit automatique',
        'help.item_doublons': 'Détection des URLs en double entre sitemaps',
        'help.item_sans_hreflang': 'URLs sans hreflang (si extraction hreflang activée)',
        'help.item_reciprocite': 'Hreflang sans réciprocité avec diagnostic détaillé',
        'help.titre_credits': '<i class="bi bi-lightning-charge me-1"></i> Crédits',
        'help.item_credits_cout': '1 sitemap soumis = <strong>1 crédit</strong> (décompté après parsing réussi)',
        'help.item_credits_robots': 'Mode robots.txt = <strong>1 crédit</strong> (quel que soit le nombre de sitemaps découverts)',
        'help.item_credits_multi': 'Les sous-sitemaps récursifs (index) ne sont pas décomptés',

        // Journal
        'journal.titre': '<i class="bi bi-terminal"></i> Journal d\'extraction',

        // KPI
        'kpi.urls': 'URLs extraites',
        'kpi.sitemaps': 'Sitemaps traités',
        'kpi.requetes': 'Requêtes HTTP',
        'kpi.erreurs': 'Erreurs',
        'kpi.duree': 'Durée',
        'kpi.langues': 'Langues hreflang',

        // Audit
        'audit.titre': '<i class="bi bi-shield-check"></i> Rapport d\'audit SEO',
        'audit.doublons': 'URLs en double',
        'audit.sans_hreflang': 'URLs sans hreflang',
        'audit.sans_reciprocite': 'Hreflang sans réciprocité',
        'audit.table_url': 'URL',
        'audit.table_occurrences': 'Occurrences',
        'audit.table_sources': 'Sitemaps sources',
        'audit.table_sitemap_source': 'Sitemap source',
        'audit.table_url_source': 'URL source',
        'audit.table_langue': 'Langue',
        'audit.table_url_cible': 'URL cible',
        'audit.table_diagnostic': 'Diagnostic',
        'audit.cible_absente': 'Cible absente',
        'audit.pas_de_retour': 'Pas de retour',
        'audit.et_plus': '…et {count} de plus',

        // Résultats
        'resultats.titre': '<i class="bi bi-table"></i> Résultats',
        'resultats.tous_sitemaps': 'Tous les sitemaps',
        'resultats.placeholder_recherche': 'Rechercher une URL...',
        'resultats.lignes': '{n} lignes',
        'resultats.aucun': 'Aucun résultat',
        'resultats.pagination': '{debut}–{fin} sur {total}',
        'resultats.btn_export_filtre': 'Exporter le CSV filtré',

        // Colonnes du tableau
        'table.url': 'URL',
        'table.lastmod': 'Lastmod',
        'table.changefreq': 'Changefreq',
        'table.priority': 'Priority',
        'table.sitemap_source': 'Sitemap source',
        'table.hreflang': 'Hreflang',

        // Status
        'status.saisir_url': 'Veuillez saisir une URL.',
        'status.preparation': 'Préparation de l\'extraction...',
        'status.en_cours': 'Extraction en cours...',
        'status.succes': '{count} URLs extraites en {duree}s',
        'status.arretee': 'Extraction arrêtée.',
        'status.connexion_interrompue': 'Connexion interrompue.',
        'status.quota_epuise': 'Quota mensuel épuisé.',

        // Erreurs
        'error.http': 'Erreur HTTP {code}',
        'error.serveur': 'Erreur serveur',

        // Tooltips réciprocité
        'tooltip.declare_hreflang': 'A déclare hreflang="{lang}" → B',
        'tooltip.b_absente': '✗ B n\'apparaît dans aucun sitemap',
        'tooltip.verifier_b': '→ Vérifier que B existe et est dans un sitemap',
        'tooltip.b_ne_pointe_pas': '✗ B ne pointe vers A dans aucune langue',
        'tooltip.b_declare': 'B déclare :',
        'tooltip.et_autres': ' … et {count} autres',
        'tooltip.ajouter_hreflang': '→ Ajouter un hreflang vers A dans B'
    },
    en: {
        // Navbar
        'nav.titre': 'Sitemap Killer',
        'nav.soustitre': 'XML Sitemap Extraction',

        // Card Configuration
        'config.titre': '<i class="bi bi-gear"></i> Configuration',
        'form.label_url': 'Sitemap URL',
        'form.placeholder_url': 'https://example.com/sitemap.xml',
        'form.aide_url': 'Direct sitemap URL or website URL (with robots.txt option)',
        'form.mode_single': 'Single sitemap',
        'form.mode_bulk': 'Multiple sitemaps',
        'form.label_urls_bulk': 'Sitemap URLs',
        'form.label_urls_bulk_hint': '(one per line)',
        'form.placeholder_urls_bulk': 'https://example.com/sitemap-blog.xml\nhttps://example.com/sitemap-products.xml\nhttps://other-site.com/sitemap.xml',
        'form.label_robots': '<i class="bi bi-robot"></i> Detect from robots.txt',
        'form.label_hreflang': '<i class="bi bi-translate"></i> Extract hreflang',
        'form.label_format_hreflang': 'Hreflang format',
        'form.option_flat': 'Flat (1 row per language)',
        'form.option_pivot': 'Pivot (1 column per language)',
        'form.label_filtre': 'URL filter (regex)',
        'form.placeholder_filtre': '/blog/|/products/',
        'form.aide_filtre': 'Regular expression to filter extracted URLs (optional)',
        'form.btn_options_avancees': '<i class="bi bi-sliders"></i> Advanced options',
        'form.label_delimiteur': 'CSV delimiter',
        'form.option_pointvirgule': 'Semicolon (;)',
        'form.option_virgule': 'Comma (,)',
        'form.option_tabulation': 'Tab',
        'form.label_profondeur': 'Max depth',
        'form.label_timeout': 'Timeout (s)',
        'form.label_tentatives': 'Retries',
        'form.label_useragent': 'User-Agent',
        'form.placeholder_useragent': 'SitemapKiller/1.0 (PHP)',
        'form.label_masquer_entete': 'Hide CSV header',
        'btn.extraire': '<i class="bi bi-play-fill"></i> Extract',
        'btn.arreter': '<i class="bi bi-stop-fill"></i> Stop',

        // Help panel
        'help.titre_fonctionnement': '<i class="bi bi-info-circle me-1"></i> How it works',
        'help.item_url': '<strong>Sitemap URL</strong>: paste the direct URL of a <code>sitemap.xml</code> file or a sitemap index.',
        'help.item_robots': '<strong>Robots.txt</strong>: check this option to automatically detect sitemaps declared in the site\'s <code>robots.txt</code>.',
        'help.item_hreflang': '<strong>Hreflang</strong>: extracts <code>xhtml:link</code> hreflang tags and audits reciprocity between language versions.',
        'help.item_filtre': '<strong>URL filter</strong>: regex to keep only certain URLs (e.g.: <code>/blog/</code>).',
        'help.item_export': '<strong>CSV export</strong>: download the complete file or filter by source sitemap.',
        'help.titre_audit': '<i class="bi bi-lightbulb me-1"></i> Automatic audit',
        'help.item_doublons': 'Detection of duplicate URLs across sitemaps',
        'help.item_sans_hreflang': 'URLs without hreflang (if hreflang extraction enabled)',
        'help.item_reciprocite': 'Hreflang without reciprocity with detailed diagnosis',
        'help.titre_credits': '<i class="bi bi-lightning-charge me-1"></i> Credits',
        'help.item_credits_cout': '1 submitted sitemap = <strong>1 credit</strong> (charged after successful parsing)',
        'help.item_credits_robots': 'Robots.txt mode = <strong>1 credit</strong> (regardless of sitemaps discovered)',
        'help.item_credits_multi': 'Recursive sub-sitemaps (indexes) are not charged',

        // Log
        'journal.titre': '<i class="bi bi-terminal"></i> Extraction log',

        // KPI
        'kpi.urls': 'URLs extracted',
        'kpi.sitemaps': 'Sitemaps processed',
        'kpi.requetes': 'HTTP requests',
        'kpi.erreurs': 'Errors',
        'kpi.duree': 'Duration',
        'kpi.langues': 'Hreflang languages',

        // Audit
        'audit.titre': '<i class="bi bi-shield-check"></i> SEO Audit Report',
        'audit.doublons': 'Duplicate URLs',
        'audit.sans_hreflang': 'URLs without hreflang',
        'audit.sans_reciprocite': 'Hreflang without reciprocity',
        'audit.table_url': 'URL',
        'audit.table_occurrences': 'Occurrences',
        'audit.table_sources': 'Source sitemaps',
        'audit.table_sitemap_source': 'Source sitemap',
        'audit.table_url_source': 'Source URL',
        'audit.table_langue': 'Language',
        'audit.table_url_cible': 'Target URL',
        'audit.table_diagnostic': 'Diagnosis',
        'audit.cible_absente': 'Target missing',
        'audit.pas_de_retour': 'No return link',
        'audit.et_plus': '…and {count} more',

        // Results
        'resultats.titre': '<i class="bi bi-table"></i> Results',
        'resultats.tous_sitemaps': 'All sitemaps',
        'resultats.placeholder_recherche': 'Search URL...',
        'resultats.lignes': '{n} rows',
        'resultats.aucun': 'No results',
        'resultats.pagination': '{debut}–{fin} of {total}',
        'resultats.btn_export_filtre': 'Export filtered CSV',

        // Table columns
        'table.url': 'URL',
        'table.lastmod': 'Lastmod',
        'table.changefreq': 'Changefreq',
        'table.priority': 'Priority',
        'table.sitemap_source': 'Source sitemap',
        'table.hreflang': 'Hreflang',

        // Status
        'status.saisir_url': 'Please enter a URL.',
        'status.preparation': 'Preparing extraction...',
        'status.en_cours': 'Extraction in progress...',
        'status.succes': '{count} URLs extracted in {duree}s',
        'status.arretee': 'Extraction stopped.',
        'status.connexion_interrompue': 'Connection interrupted.',
        'status.quota_epuise': 'Monthly quota exhausted.',

        // Errors
        'error.http': 'HTTP error {code}',
        'error.serveur': 'Server error',

        // Reciprocity tooltips
        'tooltip.declare_hreflang': 'A declares hreflang="{lang}" → B',
        'tooltip.b_absente': '✗ B does not appear in any sitemap',
        'tooltip.verifier_b': '→ Check that B exists and is in a sitemap',
        'tooltip.b_ne_pointe_pas': '✗ B does not point to A in any language',
        'tooltip.b_declare': 'B declares:',
        'tooltip.et_autres': ' … and {count} more',
        'tooltip.ajouter_hreflang': '→ Add an hreflang to A in B'
    }
};
