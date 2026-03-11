# Sitemap Killer

> **EN** — Recursive XML sitemap extractor with hreflang audit, duplicate detection, regex filtering and CSV export.

---

## Description

**Sitemap Killer** est un outil SEO d'extraction recursive de sitemaps XML. Il parcourt en profondeur les sitemap index et les urlset, collecte toutes les URLs avec leurs metadonnees (`lastmod`, `changefreq`, `priority`, sitemap source), et propose un export CSV complet. L'extraction s'effectue en temps reel via Server-Sent Events (SSE), avec un journal en direct et des KPI mis a jour au fil de la progression.

L'outil integre un **audit SEO automatique** qui detecte trois types de problemes courants : les URLs en double entre sitemaps, les URLs sans balise hreflang, et les hreflang sans reciprocite. Chaque probleme est accompagne d'un diagnostic detaille (tooltip) permettant au consultant SEO d'identifier rapidement la cause et l'action corrective.

Le plugin supporte les fichiers `.xml.gz` compresses, la detection automatique des sitemaps via `robots.txt`, le filtrage par expression reguliere, et l'extraction des balises `xhtml:link` hreflang avec deux formats d'export (flat ou pivot). L'interface est bilingue francais/anglais et respecte la charte graphique SEO Platform.

---

## Fonctionnalites

- **Extraction recursive** de sitemap index et urlset, avec profondeur configurable (1 a 50 niveaux)
- **Detection automatique** des sitemaps declares dans `robots.txt`
- **Support des fichiers compresses** `.xml.gz` (decompression gzip transparente)
- **Extraction des hreflang** (`xhtml:link rel="alternate"`) avec deux formats d'export :
  - **Flat** : une ligne par couple langue/URL
  - **Pivot** : une colonne par langue detectee
- **Filtrage regex** des URLs extraites (cote serveur)
- **Audit SEO automatique** :
  - Detection des URLs en double entre sitemaps
  - URLs sans hreflang (quand l'extraction hreflang est activee)
  - Hreflang sans reciprocite avec diagnostic detaille (cible absente du sitemap, ou cible ne pointant pas en retour)
- **Streaming temps reel** (SSE) : journal d'extraction en direct, KPI progressifs, URLs envoyees par lots de 50
- **Export CSV** configurable : delimiteur (`;`, `,`, tabulation), avec ou sans en-tete, BOM UTF-8 pour Excel
- **Export filtre** cote client : filtrage par sitemap source ou par recherche textuelle, avec export CSV du sous-ensemble
- **Rapport d'erreurs** telechargeables (fichier `.txt`)
- **Tableau de resultats** avec tri par colonne, pagination, recherche et filtre par sitemap source
- **Interface bilingue** francais / anglais (systeme i18n `translations.js`)
- **Options avancees** : timeout, nombre de tentatives, user-agent personnalise, profondeur max
- **Protection anti-SSRF** : validation des URLs pour rejeter les adresses privees/reservees
- **Nettoyage automatique** des anciens jobs (TTL 1 heure)
- **Raccourci clavier** `Ctrl+Entree` pour lancer l'extraction

---

## Prerequis

- **PHP 8.3+** avec les extensions :
  - `simplexml`
  - `zlib` (pour la decompression gzip)
  - `json`
  - `mbstring`
- Aucune dependance Composer — le plugin fonctionne avec les fonctions natives PHP
- Dossier `data/` accessible en ecriture par le processus PHP

---

## Installation

### Standalone (developpement local)

```bash
cd /home/aymeric/projects/sitemap-killer/
php -S localhost:8080
```

Ouvrir `http://localhost:8080` dans le navigateur.

### Integration SEO Platform

1. Placer le repertoire `sitemap-killer/` dans le dossier des plugins de la plateforme
2. Installer via l'interface admin (Plugins > Installer via Git)
3. Le plugin est servi en mode `embedded` a l'URL `/m/sitemap-killer`
4. Verifier que le dossier `data/` est accessible en ecriture

---

## Utilisation

1. **Saisir l'URL** d'un sitemap XML (`sitemap.xml`, sitemap index, ou `.xml.gz`)
2. **Options** :
   - Cocher **"Detecter depuis robots.txt"** pour parser automatiquement le `robots.txt` du site et traiter tous les sitemaps declares
   - Cocher **"Extraire les hreflang"** pour collecter les balises `xhtml:link` et activer l'audit de reciprocite
   - Saisir un **filtre regex** pour ne conserver que certaines URLs (ex : `/blog/|/products/`)
3. **Options avancees** (panneau depliable) :
   - Delimiteur CSV (point-virgule, virgule, tabulation)
   - Profondeur maximale de recursion (defaut : 10)
   - Timeout par requete HTTP (defaut : 30s)
   - Nombre de tentatives en cas d'echec (defaut : 3, avec backoff)
   - User-Agent personnalise
   - Masquer l'en-tete du CSV
4. Cliquer sur **"Extraire"** (ou `Ctrl+Entree`)
5. Suivre la progression en temps reel dans le **journal d'extraction** et les **KPI**
6. Consulter les **resultats** dans le tableau (tri, recherche, filtre par sitemap source)
7. Consulter le **rapport d'audit SEO** (doublons, hreflang manquants, reciprocite)
8. **Telecharger** le CSV complet, le CSV filtre, ou le rapport d'erreurs

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Backend | PHP 8.3 natif (simplexml, file_get_contents, gzdecode) |
| Communication temps reel | Server-Sent Events (SSE) |
| Frontend | HTML5, JavaScript vanilla, Bootstrap 5.3.3 |
| Icones | Bootstrap Icons 1.11.3 |
| Typographie | Google Fonts — Poppins |
| Internationalisation | Systeme `translations.js` avec fonction `t()` |
| Stockage temporaire | Fichiers JSON/CSV dans `data/jobs/` (TTL 1h) |

---

## Structure du projet

```
sitemap-killer/
├── module.json          # Declaration du plugin (slug, quota, routes, langues)
├── boot.php             # Autoloader PSR-4 pour les classes src/
├── index.php            # Point d'entree — interface HTML (formulaire, KPI, tableau, audit)
├── process.php          # Endpoint POST — validation, creation du job, config JSON
├── stream.php           # Endpoint SSE — extraction temps reel, envoi des URLs par lots
├── download.php         # Endpoint GET — telechargement CSV ou rapport d'erreurs
├── app.js               # Logique frontend (SSE, rendu tableau, audit, pagination, export)
├── styles.css           # Charte graphique SEO Platform (variables CSS, composants)
├── translations.js      # Traductions FR/EN (cles i18n)
├── src/
│   └── ExtractionSitemap.php  # Classe metier — extraction recursive, hreflang, export CSV
├── data/
│   ├── .htaccess        # Protection Apache (Deny from all)
│   └── jobs/            # Jobs temporaires (config.json, urls.csv, erreurs.txt)
└── .gitignore           # Exclusions : vendor/, data/, .env, *.log
```

---

## Routes (module.json)

| Chemin | Methode | Type | Description |
|--------|---------|------|-------------|
| `process.php` | `POST` | `ajax` | Validation de l'URL, creation du job, retourne `{ jobId }` |
| `stream.php` | `GET` | `stream` | Flux SSE : evenements `log`, `urls`, `stats`, `done`, `error` |
| `download.php` | `GET` | `ajax` | Telechargement du CSV (`?type=csv`) ou des erreurs (`?type=erreurs`) |

### Evenements SSE (stream.php)

| Evenement | Donnees | Description |
|-----------|---------|-------------|
| `log` | `{ message, horodatage }` | Ligne de journal en temps reel |
| `urls` | `{ lot: [...] }` | Lot de 50 URLs avec metadonnees |
| `stats` | `{ totalUrls, totalSitemaps, totalRequetes, totalErreurs, duree, languesTrouvees }` | KPI mis a jour apres chaque sitemap |
| `done` | `{ statistiques, csvPret, aErreurs }` | Fin de l'extraction |
| `error` | `{ message }` | Erreur fatale |

---

## Integration plateforme

- **Display mode** : `embedded` — le HTML est injecte dans le layout de la plateforme, la navbar est supprimee, les CDN sont ignores (deja presents dans le layout)
- **Quota** : `form_submit` avec un quota par defaut de **100 soumissions/mois** — incremente automatiquement sur chaque POST vers `process.php`
- **Langues** : `fr`, `en` — l'interface s'adapte automatiquement via `window.PLATFORM_LANG`
- **Domain field** : `url` — le champ URL du formulaire est utilise pour le suivi par domaine
- **CSRF** : injecte automatiquement par la plateforme dans les formulaires POST
- **Assets** : `styles.css`, `app.js`, `translations.js` sont recrits vers `/module-assets/sitemap-killer/`
- **Routage JS** : tous les appels `fetch()` utilisent `window.MODULE_BASE_URL` pour eviter les erreurs de resolution de chemin en mode embedded
- **Gestion du 429** : le frontend affiche un message d'erreur "Quota mensuel epuise" en cas de depassement
- **Aucune variable d'environnement requise** (`env_keys: []`)
