<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sitemap Killer — Extraction de sitemaps XML</title>
    <!-- CDN (ignorés en mode embedded) -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
    <!-- CSS local -->
    <link rel="stylesheet" href="styles.css">
</head>
<body>

<!-- Navbar (supprimée en mode embedded) -->
<nav class="navbar mb-4">
    <div class="container">
        <span class="navbar-brand mb-0 h1">
            <i class="bi bi-diagram-3"></i> Sitemap Killer
            <span class="d-block d-sm-inline ms-sm-2">Extraction de sitemaps XML</span>
        </span>
    </div>
</nav>

<div class="container pb-5">

    <!-- ─── Formulaire ───────────────────────── -->
    <div class="card mb-4">
        <div class="card-header">
            <h6 class="mb-0"><i class="bi bi-gear"></i> Configuration</h6>
        </div>
        <div class="card-body">
            <form id="formExtraction">
                <!-- URL -->
                <div class="mb-3">
                    <label for="url" class="form-label">URL du sitemap</label>
                    <input type="text" class="form-control" id="url" name="url"
                           placeholder="https://example.com/sitemap.xml" required>
                    <div class="form-text">URL directe du sitemap ou du site (avec l'option robots.txt)</div>
                </div>

                <!-- Options principales -->
                <div class="row mb-3">
                    <div class="col-sm-6 col-md-4">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="robots" name="robots">
                            <label class="form-check-label" for="robots">
                                <i class="bi bi-robot"></i> Détecter depuis robots.txt
                            </label>
                        </div>
                    </div>
                    <div class="col-sm-6 col-md-4">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="hreflang" name="hreflang">
                            <label class="form-check-label" for="hreflang">
                                <i class="bi bi-translate"></i> Extraire les hreflang
                            </label>
                        </div>
                    </div>
                    <div class="col-sm-6 col-md-4" id="groupFormatHreflang" style="display:none;">
                        <label for="formatHreflang" class="form-label">Format hreflang</label>
                        <select class="form-select form-select-sm" id="formatHreflang" name="formatHreflang">
                            <option value="flat">Flat (1 ligne par langue)</option>
                            <option value="pivot">Pivot (1 colonne par langue)</option>
                        </select>
                    </div>
                </div>

                <!-- Filtre -->
                <div class="mb-3">
                    <label for="filtre" class="form-label">Filtre URL (regex)</label>
                    <input type="text" class="form-control" id="filtre" name="filtre"
                           placeholder="/blog/|/products/">
                    <div class="form-text">Expression régulière pour filtrer les URLs extraites (optionnel)</div>
                </div>

                <!-- Options avancées -->
                <div class="mb-3">
                    <a class="btn btn-sm btn-outline-secondary" data-bs-toggle="collapse" href="#optionsAvancees" role="button">
                        <i class="bi bi-sliders"></i> Options avancées
                    </a>
                </div>
                <div class="collapse mb-3" id="optionsAvancees">
                    <div class="card card-body bg-light border-0">
                        <div class="row g-3">
                            <div class="col-sm-6 col-md-3">
                                <label for="delimiteur" class="form-label">Délimiteur CSV</label>
                                <select class="form-select form-select-sm" id="delimiteur" name="delimiteur">
                                    <option value=";" selected>Point-virgule (;)</option>
                                    <option value=",">Virgule (,)</option>
                                    <option value="tab">Tabulation</option>
                                </select>
                            </div>
                            <div class="col-sm-6 col-md-3">
                                <label for="profondeurMax" class="form-label">Profondeur max</label>
                                <input type="number" class="form-control form-control-sm" id="profondeurMax"
                                       name="profondeurMax" value="10" min="1" max="50">
                            </div>
                            <div class="col-sm-6 col-md-3">
                                <label for="timeout" class="form-label">Timeout (s)</label>
                                <input type="number" class="form-control form-control-sm" id="timeout"
                                       name="timeout" value="30" min="5" max="120">
                            </div>
                            <div class="col-sm-6 col-md-3">
                                <label for="tentatives" class="form-label">Tentatives</label>
                                <input type="number" class="form-control form-control-sm" id="tentatives"
                                       name="tentatives" value="3" min="1" max="10">
                            </div>
                            <div class="col-sm-8">
                                <label for="userAgent" class="form-label">User-Agent</label>
                                <input type="text" class="form-control form-control-sm" id="userAgent"
                                       name="userAgent" placeholder="SitemapKiller/1.0 (PHP)">
                            </div>
                            <div class="col-sm-4 d-flex align-items-end">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" id="masquerEntete" name="masquerEntete">
                                    <label class="form-check-label" for="masquerEntete">Masquer l'en-tête CSV</label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Boutons -->
                <div class="d-flex gap-2">
                    <button type="button" class="btn btn-primary" id="btnExtraire">
                        <i class="bi bi-play-fill"></i> Extraire
                    </button>
                    <button type="button" class="btn btn-outline-secondary d-none" id="btnArreter">
                        <i class="bi bi-stop-fill"></i> Arrêter
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- ─── Status ───────────────────────────── -->
    <div id="statusMsg" class="status-msg d-none mb-4"></div>

    <!-- ─── Journal ──────────────────────────── -->
    <div class="card mb-4 d-none" id="sectionJournal">
        <div class="card-header d-flex justify-content-between align-items-center">
            <h6 class="mb-0"><i class="bi bi-terminal"></i> Journal d'extraction</h6>
            <button type="button" class="btn btn-sm btn-outline-secondary" id="btnToggleJournal">
                <i class="bi bi-chevron-down"></i>
            </button>
        </div>
        <div class="card-body p-0" id="corpsJournal">
            <pre class="journal-log mb-0" id="journal"></pre>
        </div>
    </div>

    <!-- ─── KPI ──────────────────────────────── -->
    <div class="kpi-row mb-4 d-none" id="sectionKpi">
        <div class="kpi-card kpi-dark">
            <div class="kpi-value" id="kpiUrls">0</div>
            <div class="kpi-label">URLs extraites</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value" id="kpiSitemaps">0</div>
            <div class="kpi-label">Sitemaps traités</div>
        </div>
        <div class="kpi-card kpi-gold">
            <div class="kpi-value" id="kpiRequetes">0</div>
            <div class="kpi-label">Requêtes HTTP</div>
        </div>
        <div class="kpi-card kpi-red" id="kpiErreursCard" style="display:none;">
            <div class="kpi-value" id="kpiErreurs">0</div>
            <div class="kpi-label">Erreurs</div>
        </div>
        <div class="kpi-card kpi-green">
            <div class="kpi-value" id="kpiDuree">—</div>
            <div class="kpi-label">Durée</div>
        </div>
        <div class="kpi-card" id="kpiLanguesCard" style="display:none;">
            <div class="kpi-label mb-1">Langues hreflang</div>
            <div class="kpi-langues-wrap" id="kpiLangues"></div>
        </div>
    </div>

    <!-- ─── Audit SEO ──────────────────────────── -->
    <div class="card mb-4 d-none" id="sectionAudit">
        <div class="card-header">
            <h6 class="mb-0"><i class="bi bi-shield-check"></i> Rapport d'audit SEO</h6>
        </div>
        <div class="card-body" id="corpsAudit"></div>
    </div>

    <!-- ─── Résultats ────────────────────────── -->
    <div class="card d-none" id="sectionResultats">
        <div class="card-header">
            <div class="d-flex flex-wrap justify-content-between align-items-center gap-2">
                <h6 class="mb-0"><i class="bi bi-table"></i> Résultats <span class="badge bg-secondary" id="badgeTotal"></span></h6>
                <div class="d-flex gap-2 flex-wrap">
                    <div class="filtre-sitemap-wrap d-none">
                        <select class="form-select form-select-sm" id="filtreSitemap" style="width:auto;min-width:180px;">
                            <option value="">Tous les sitemaps</option>
                        </select>
                        <button type="button" class="btn btn-sm btn-outline-primary" id="btnExportFiltre" title="Exporter le CSV filtré">
                            <i class="bi bi-download"></i>
                        </button>
                    </div>
                    <input type="text" class="form-control form-control-sm" id="rechercheUrl"
                           placeholder="Rechercher une URL..." style="width:220px;">
                    <select class="form-select form-select-sm" id="lignesParPage" style="width:auto;">
                        <option value="25">25 lignes</option>
                        <option value="50" selected>50 lignes</option>
                        <option value="100">100 lignes</option>
                        <option value="250">250 lignes</option>
                    </select>
                    <div class="btn-group btn-group-sm">
                        <button type="button" class="btn btn-primary" id="btnTelechargerCsv" title="Télécharger le CSV">
                            <i class="bi bi-download"></i> CSV
                        </button>
                        <button type="button" class="btn btn-outline-secondary d-none" id="btnTelechargerErreurs" title="Rapport d'erreurs">
                            <i class="bi bi-exclamation-triangle"></i> Erreurs
                        </button>
                    </div>
                </div>
            </div>
        </div>
        <div class="card-body p-0">
            <div class="table-responsive">
                <table class="table table-sm mb-0" id="tableResultats">
                    <thead>
                        <tr id="enteteTable"></tr>
                    </thead>
                    <tbody id="corpsTable"></tbody>
                </table>
            </div>
            <div class="d-flex justify-content-between align-items-center px-3 py-2 border-top" id="barPagination">
                <span class="text-muted" style="font-size:0.82rem;" id="infoPagination"></span>
                <div id="pagination"></div>
            </div>
        </div>
    </div>

</div>

<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
<script src="app.js"></script>
</body>
</html>
