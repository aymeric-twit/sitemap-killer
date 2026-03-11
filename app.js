/* ════════════════════════════════════════════
   Sitemap Killer — Frontend
   ════════════════════════════════════════════ */

// ─── i18n ──────────────────────────────────

var langueActuelle = (function () {
    if (typeof window.PLATFORM_LANG === 'string' && window.PLATFORM_LANG) return window.PLATFORM_LANG;
    try { var p = new URLSearchParams(window.location.search).get('lg'); if (p) return p; } catch (_) {}
    try { var s = localStorage.getItem('lang'); if (s) return s; } catch (_) {}
    return 'fr';
})();

function t(cle, params) {
    var trad = (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS[langueActuelle] && TRANSLATIONS[langueActuelle][cle])
        ? TRANSLATIONS[langueActuelle][cle]
        : (typeof TRANSLATIONS !== 'undefined' && TRANSLATIONS.fr && TRANSLATIONS.fr[cle])
            ? TRANSLATIONS.fr[cle]
            : cle;
    if (params) {
        Object.keys(params).forEach(function (k) {
            trad = trad.replace(new RegExp('\\{' + k + '\\}', 'g'), params[k]);
        });
    }
    return trad;
}

function traduirePage() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
        el.innerHTML = t(el.getAttribute('data-i18n'));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
    });
    // Traduire les options du select lignesParPage
    traduireLignesParPage();
}

function traduireLignesParPage() {
    var sel = document.getElementById('lignesParPage');
    if (!sel) return;
    var options = sel.querySelectorAll('option');
    options.forEach(function (opt) {
        opt.textContent = t('resultats.lignes', { n: opt.value });
    });
}

function changerLangue(lng) {
    langueActuelle = lng;
    try { localStorage.setItem('lang', lng); } catch (_) {}
    traduirePage();
}

function initLangueSelect() {
    var select = document.getElementById('lang-select');
    if (!select) return;
    select.value = langueActuelle;
    select.addEventListener('change', function () {
        changerLangue(this.value);
    });
}

if (typeof window !== 'undefined') {
    window.addEventListener('platformLangChange', function (e) {
        if (e.detail && e.detail.lang) changerLangue(e.detail.lang);
    });
}

// ─── Configuration ──────────────────────────

var baseUrl = window.MODULE_BASE_URL || '.';

// ─── État ────────────────────────────────────

var resultats = [];
var resultatsFiltres = [];
var jobId = null;
var evtSource = null;
var enCours = false;
var sortColonne = null;
var sortDirection = 'asc';
var pageActuelle = 1;
var lignesParPage = 50;
var hreflangActif = false;
var aChangefreq = false;
var aPriority = false;
var sourcesSitemap = [];
var filtreSitemapActif = '';

// ─── Éléments DOM ───────────────────────────

var elBtnExtraire = document.getElementById('btnExtraire');
var elBtnArreter = document.getElementById('btnArreter');
var elStatusMsg = document.getElementById('statusMsg');
var elSectionJournal = document.getElementById('sectionJournal');
var elJournal = document.getElementById('journal');
var elSectionKpi = document.getElementById('sectionKpi');
var elSectionResultats = document.getElementById('sectionResultats');
var elEnteteTable = document.getElementById('enteteTable');
var elCorpsTable = document.getElementById('corpsTable');
var elRechercheUrl = document.getElementById('rechercheUrl');
var elLignesParPage = document.getElementById('lignesParPage');
var elBadgeTotal = document.getElementById('badgeTotal');
var elInfoPagination = document.getElementById('infoPagination');
var elPagination = document.getElementById('pagination');
var elBtnTelechargerCsv = document.getElementById('btnTelechargerCsv');
var elBtnTelechargerErreurs = document.getElementById('btnTelechargerErreurs');
var elBtnToggleJournal = document.getElementById('btnToggleJournal');
var elCorpsJournal = document.getElementById('corpsJournal');
var elFiltreSitemap = document.getElementById('filtreSitemap');
var elFiltreSitemapWrap = document.querySelector('.filtre-sitemap-wrap');
var elSectionAudit = document.getElementById('sectionAudit');
var elCorpsAudit = document.getElementById('corpsAudit');
var elBtnExportFiltre = document.getElementById('btnExportFiltre');

// ─── Initialisation ─────────────────────────

document.addEventListener('DOMContentLoaded', function () {
    traduirePage();
    initLangueSelect();

    elBtnExtraire.addEventListener('click', lancerExtraction);
    elBtnArreter.addEventListener('click', arreterExtraction);

    // Toggle hreflang format
    document.getElementById('hreflang').addEventListener('change', function () {
        document.getElementById('groupFormatHreflang').style.display = this.checked ? '' : 'none';
    });

    // Recherche URL
    elRechercheUrl.addEventListener('input', function () {
        pageActuelle = 1;
        filtrerResultats();
        renderPage();
    });

    // Filtre par sitemap source
    elFiltreSitemap.addEventListener('change', function () {
        filtreSitemapActif = this.value;
        pageActuelle = 1;
        filtrerResultats();
        renderPage();
    });

    // Lignes par page
    elLignesParPage.addEventListener('change', function () {
        lignesParPage = parseInt(this.value, 10);
        pageActuelle = 1;
        renderPage();
    });

    // Téléchargements
    elBtnTelechargerCsv.addEventListener('click', telechargerCsv);
    elBtnTelechargerErreurs.addEventListener('click', telechargerErreurs);
    elBtnExportFiltre.addEventListener('click', exporterCsvFiltre);

    // Toggle journal
    elBtnToggleJournal.addEventListener('click', function () {
        var visible = elCorpsJournal.style.display !== 'none';
        elCorpsJournal.style.display = visible ? 'none' : '';
        this.querySelector('i').className = visible ? 'bi bi-chevron-right' : 'bi bi-chevron-down';
    });

    // Raccourci clavier Ctrl+Entrée
    document.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !enCours) {
            lancerExtraction();
        }
    });
});

// ─── Extraction ─────────────────────────────

function lancerExtraction() {
    var url = document.getElementById('url').value.trim();
    if (!url) {
        afficherStatus(t('status.saisir_url'), 'error');
        return;
    }

    // Réinitialiser
    resultats = [];
    resultatsFiltres = [];
    jobId = null;
    sortColonne = null;
    sortDirection = 'asc';
    pageActuelle = 1;
    aChangefreq = false;
    aPriority = false;
    sourcesSitemap = [];
    filtreSitemapActif = '';
    elJournal.innerHTML = '';
    elCorpsTable.innerHTML = '';
    hreflangActif = document.getElementById('hreflang').checked;

    // UI : mode extraction
    enCours = true;
    elBtnExtraire.disabled = true;
    elBtnArreter.classList.remove('d-none');
    var helpPanel = document.getElementById('helpPanel');
    if (helpPanel) helpPanel.style.display = 'none';
    elSectionJournal.classList.remove('d-none');
    elCorpsJournal.style.display = '';
    elBtnToggleJournal.querySelector('i').className = 'bi bi-chevron-down';
    elSectionKpi.classList.remove('d-none');
    elSectionResultats.classList.add('d-none');
    elBtnTelechargerErreurs.classList.add('d-none');
    elFiltreSitemapWrap.classList.add('d-none');
    elFiltreSitemap.value = '';
    elSectionAudit.classList.add('d-none');
    elCorpsAudit.innerHTML = '';
    reinitialiserKpi();
    afficherStatus(t('status.preparation'), 'loading');

    // Construire le FormData
    var formData = new FormData();
    formData.append('url', url);
    formData.append('robots', document.getElementById('robots').checked ? '1' : '0');
    formData.append('hreflang', hreflangActif ? '1' : '0');
    formData.append('formatHreflang', document.getElementById('formatHreflang').value);
    formData.append('filtre', document.getElementById('filtre').value.trim());
    formData.append('delimiteur', document.getElementById('delimiteur').value);
    formData.append('profondeurMax', document.getElementById('profondeurMax').value);
    formData.append('timeout', document.getElementById('timeout').value);
    formData.append('tentatives', document.getElementById('tentatives').value);
    formData.append('userAgent', document.getElementById('userAgent').value.trim());
    formData.append('masquerEntete', document.getElementById('masquerEntete').checked ? '1' : '0');

    // POST → créer le job
    fetch(baseUrl + '/process.php', {
        method: 'POST',
        body: formData,
    })
        .then(function (res) {
            if (res.status === 429) {
                throw new Error(t('status.quota_epuise'));
            }
            if (!res.ok) {
                return res.json().then(function (data) {
                    throw new Error(data.erreur || t('error.http', { code: res.status }));
                });
            }
            return res.json();
        })
        .then(function (data) {
            jobId = data.jobId;
            afficherStatus(t('status.en_cours'), 'loading');
            demarrerStream(jobId);
        })
        .catch(function (err) {
            finirExtraction();
            afficherStatus(err.message, 'error');
        });
}

function demarrerStream(id) {
    var url = baseUrl + '/stream.php?job=' + encodeURIComponent(id);
    evtSource = new EventSource(url);

    evtSource.addEventListener('log', function (e) {
        var data = JSON.parse(e.data);
        ajouterLog(data.message, data.horodatage);
    });

    evtSource.addEventListener('urls', function (e) {
        var data = JSON.parse(e.data);
        ajouterUrls(data.lot);
    });

    evtSource.addEventListener('stats', function (e) {
        var data = JSON.parse(e.data);
        mettreAJourKpi(data);
    });

    evtSource.addEventListener('done', function (e) {
        var data = JSON.parse(e.data);
        evtSource.close();
        evtSource = null;
        mettreAJourKpi(data.statistiques);

        if (data.aErreurs) {
            elBtnTelechargerErreurs.classList.remove('d-none');
        }

        finirExtraction();
        afficherStatus(
            t('status.succes', { count: resultats.length, duree: data.statistiques.duree }),
            'success'
        );

        // Afficher les résultats
        if (resultats.length > 0) {
            construireEnteteTable();
            filtrerResultats();
            renderPage();
            elSectionResultats.classList.remove('d-none');
            genererRapportAudit();
        }
    });

    evtSource.addEventListener('error', function (e) {
        // Vérifier s'il y avait un événement d'erreur custom
        if (e.data) {
            var data = JSON.parse(e.data);
            afficherStatus(data.message || t('error.serveur'), 'error');
        }

        if (evtSource) {
            evtSource.close();
            evtSource = null;
        }

        // Si pas encore terminé, c'est une erreur de connexion
        if (enCours) {
            finirExtraction();
            if (!e.data) {
                afficherStatus(t('status.connexion_interrompue'), 'error');
            }
        }
    });
}

function arreterExtraction() {
    if (evtSource) {
        evtSource.close();
        evtSource = null;
    }
    finirExtraction();
    afficherStatus(t('status.arretee'), 'warning');

    // Afficher ce qu'on a déjà
    if (resultats.length > 0) {
        construireEnteteTable();
        filtrerResultats();
        renderPage();
        elSectionResultats.classList.remove('d-none');
        genererRapportAudit();
    }
}

function finirExtraction() {
    enCours = false;
    elBtnExtraire.disabled = false;
    elBtnArreter.classList.add('d-none');
}

// ─── Journal ────────────────────────────────

function ajouterLog(message, horodatage) {
    var classeSpeciale = '';
    if (message.indexOf('Terminé') !== -1 || message.indexOf('URLs') !== -1) {
        classeSpeciale = ' log-ok';
    } else if (message.indexOf('Échec') !== -1 || message.indexOf('invalide') !== -1 || message.indexOf('échouée') !== -1) {
        classeSpeciale = ' log-warn';
    }

    elJournal.innerHTML += '<span class="log-time">[' + horodatage + ']</span>'
        + '<span class="' + classeSpeciale + '"> ' + echapper(message) + '</span>\n';

    // Auto-scroll
    elJournal.scrollTop = elJournal.scrollHeight;
}

// ─── KPI ────────────────────────────────────

function reinitialiserKpi() {
    document.getElementById('kpiUrls').textContent = '0';
    document.getElementById('kpiSitemaps').textContent = '0';
    document.getElementById('kpiRequetes').textContent = '0';
    document.getElementById('kpiErreurs').textContent = '0';
    document.getElementById('kpiDuree').textContent = '—';
    document.getElementById('kpiLangues').innerHTML = '';
    document.getElementById('kpiErreursCard').style.display = 'none';
    document.getElementById('kpiLanguesCard').style.display = 'none';
}

function mettreAJourKpi(stats) {
    document.getElementById('kpiUrls').textContent = formaterNombre(stats.totalUrls);
    document.getElementById('kpiSitemaps').textContent = formaterNombre(stats.totalSitemaps);
    document.getElementById('kpiRequetes').textContent = formaterNombre(stats.totalRequetes);

    if (stats.totalErreurs > 0) {
        document.getElementById('kpiErreurs').textContent = formaterNombre(stats.totalErreurs);
        document.getElementById('kpiErreursCard').style.display = '';
    }

    if (stats.duree !== undefined) {
        document.getElementById('kpiDuree').textContent = stats.duree + 's';
    }

    if (stats.languesTrouvees && stats.languesTrouvees.length > 0) {
        var langHtml = '';
        for (var i = 0; i < stats.languesTrouvees.length; i++) {
            langHtml += '<span class="badge-langue">' + echapper(stats.languesTrouvees[i]) + '</span>';
        }
        document.getElementById('kpiLangues').innerHTML = langHtml;
        document.getElementById('kpiLanguesCard').style.display = '';
    }
}

// ─── URLs / Résultats ───────────────────────

function ajouterUrls(lot) {
    for (var i = 0; i < lot.length; i++) {
        resultats.push(lot[i]);
    }
    // Mise à jour du compteur pendant l'extraction
    document.getElementById('kpiUrls').textContent = formaterNombre(resultats.length);
}

function construireEnteteTable() {
    // Détecter si changefreq / priority ont des données
    aChangefreq = false;
    aPriority = false;
    var sourcesSet = {};

    for (var i = 0; i < resultats.length; i++) {
        var r = resultats[i];
        if (r.changefreq && r.changefreq !== '') aChangefreq = true;
        if (r.priority && r.priority !== '') aPriority = true;
        if (r.sitemapSource && r.sitemapSource !== '') {
            sourcesSet[r.sitemapSource] = true;
        }
    }

    // Collecter et trier les sources
    sourcesSitemap = Object.keys(sourcesSet).sort();

    // Peupler le dropdown filtre sitemap
    peuplerFiltreSitemap();

    // Construire les colonnes dynamiquement
    var colonnes = [
        { cle: 'loc', label: t('table.url'), triable: true },
        { cle: 'lastmod', label: t('table.lastmod'), triable: true },
    ];

    if (aChangefreq) {
        colonnes.push({ cle: 'changefreq', label: t('table.changefreq'), triable: true });
    }
    if (aPriority) {
        colonnes.push({ cle: 'priority', label: t('table.priority'), triable: true });
    }

    colonnes.push({ cle: 'sitemapSource', label: t('table.sitemap_source'), triable: true });

    if (hreflangActif) {
        colonnes.push({ cle: 'hreflangs', label: t('table.hreflang'), triable: false });
    }

    var html = '';
    for (var j = 0; j < colonnes.length; j++) {
        var col = colonnes[j];
        if (col.triable) {
            html += '<th class="sortable" data-sort="' + col.cle + '" onclick="trierTableau(\'' + col.cle + '\')">' + col.label + '</th>';
        } else {
            html += '<th>' + col.label + '</th>';
        }
    }

    elEnteteTable.innerHTML = html;
}

function peuplerFiltreSitemap() {
    var html = '<option value="">' + t('resultats.tous_sitemaps') + ' (' + sourcesSitemap.length + ')</option>';
    for (var i = 0; i < sourcesSitemap.length; i++) {
        html += '<option value="' + echapper(sourcesSitemap[i]) + '">' + echapper(tronquer(sourcesSitemap[i], 60)) + '</option>';
    }
    elFiltreSitemap.innerHTML = html;

    // Afficher le dropdown uniquement si plus d'une source
    if (sourcesSitemap.length > 1) {
        elFiltreSitemapWrap.classList.remove('d-none');
    } else {
        elFiltreSitemapWrap.classList.add('d-none');
    }
}

function filtrerResultats() {
    var termeRecherche = elRechercheUrl.value.trim().toLowerCase();

    resultatsFiltres = resultats.filter(function (r) {
        // Filtre texte
        if (termeRecherche !== '' && r.loc.toLowerCase().indexOf(termeRecherche) === -1) {
            return false;
        }
        // Filtre sitemap source
        if (filtreSitemapActif !== '' && r.sitemapSource !== filtreSitemapActif) {
            return false;
        }
        return true;
    });

    elBadgeTotal.textContent = formaterNombre(resultatsFiltres.length);
}

function renderPage() {
    var totalPages = Math.max(1, Math.ceil(resultatsFiltres.length / lignesParPage));
    if (pageActuelle > totalPages) pageActuelle = totalPages;

    var debut = (pageActuelle - 1) * lignesParPage;
    var fin = Math.min(debut + lignesParPage, resultatsFiltres.length);
    var page = resultatsFiltres.slice(debut, fin);

    // Compter les colonnes pour le colspan du message vide
    var nbColonnes = 3; // loc + lastmod + sitemapSource
    if (aChangefreq) nbColonnes++;
    if (aPriority) nbColonnes++;
    if (hreflangActif) nbColonnes++;

    var html = '';
    for (var i = 0; i < page.length; i++) {
        var r = page[i];
        html += '<tr>';
        html += '<td class="col-url"><a href="' + echapper(r.loc) + '" target="_blank" rel="noopener" title="' + echapper(r.loc) + '">' + echapper(tronquer(r.loc, 80)) + '</a></td>';
        html += '<td>' + echapper(r.lastmod) + '</td>';
        if (aChangefreq) html += '<td>' + echapper(r.changefreq) + '</td>';
        if (aPriority) html += '<td>' + echapper(r.priority) + '</td>';
        html += '<td class="col-url">' + echapper(tronquer(r.sitemapSource || '', 60)) + '</td>';
        if (hreflangActif) {
            html += '<td>' + renderHreflangBadge(r.hreflangs) + '</td>';
        }
        html += '</tr>';
    }

    elCorpsTable.innerHTML = html || '<tr><td colspan="' + nbColonnes + '" class="text-center text-muted py-3">' + t('resultats.aucun') + '</td></tr>';

    // Pagination info
    if (resultatsFiltres.length > 0) {
        elInfoPagination.textContent = t('resultats.pagination', {
            debut: debut + 1,
            fin: fin,
            total: formaterNombre(resultatsFiltres.length)
        });
    } else {
        elInfoPagination.textContent = '';
    }

    renderPagination(totalPages);

    // Initialiser les tooltips Bootstrap
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        var tooltips = document.querySelectorAll('#tableResultats [data-bs-toggle="tooltip"]');
        tooltips.forEach(function (el) {
            new bootstrap.Tooltip(el, { html: true });
        });
    }
}

function renderHreflangBadge(hreflangs) {
    if (!hreflangs || typeof hreflangs !== 'object') return '';
    var langues = Object.keys(hreflangs);
    if (langues.length === 0) return '';

    var titre = langues.map(function (l) {
        return l + ': ' + echapper(tronquer(hreflangs[l], 60));
    }).join('&#10;');

    return '<span class="badge-hreflang" data-bs-toggle="tooltip" data-bs-placement="left" title="' + titre + '">'
        + langues.length + ' lang'
        + '</span>';
}

// ─── Tri ────────────────────────────────────

function trierTableau(colonne) {
    if (sortColonne === colonne) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColonne = colonne;
        sortDirection = 'asc';
    }

    // MAJ des indicateurs visuels
    document.querySelectorAll('.sortable').forEach(function (th) {
        th.classList.remove('sort-asc', 'sort-desc');
    });
    var thActif = document.querySelector('[data-sort="' + colonne + '"]');
    if (thActif) thActif.classList.add('sort-' + sortDirection);

    resultatsFiltres.sort(function (a, b) {
        var va = a[colonne] || '';
        var vb = b[colonne] || '';

        if (colonne === 'priority') {
            va = parseFloat(va) || 0;
            vb = parseFloat(vb) || 0;
        } else {
            va = va.toLowerCase();
            vb = vb.toLowerCase();
        }

        if (va < vb) return sortDirection === 'asc' ? -1 : 1;
        if (va > vb) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    pageActuelle = 1;
    renderPage();
}

// ─── Pagination ─────────────────────────────

function renderPagination(totalPages) {
    if (totalPages <= 1) {
        elPagination.innerHTML = '';
        return;
    }

    var html = '';

    // Précédent
    html += '<button class="pg-btn" ' + (pageActuelle <= 1 ? 'disabled' : '') + ' onclick="allerPage(' + (pageActuelle - 1) + ')">&laquo;</button>';

    // Pages
    var pages = calcPages(pageActuelle, totalPages, 7);
    for (var i = 0; i < pages.length; i++) {
        var p = pages[i];
        if (p === '...') {
            html += '<span class="pg-btn" style="cursor:default;border:none;">&hellip;</span>';
        } else {
            html += '<button class="pg-btn' + (p === pageActuelle ? ' pg-active' : '') + '" onclick="allerPage(' + p + ')">' + p + '</button>';
        }
    }

    // Suivant
    html += '<button class="pg-btn" ' + (pageActuelle >= totalPages ? 'disabled' : '') + ' onclick="allerPage(' + (pageActuelle + 1) + ')">&raquo;</button>';

    elPagination.innerHTML = html;
}

function allerPage(page) {
    pageActuelle = page;
    renderPage();
    // Scroll vers le tableau
    elSectionResultats.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function calcPages(current, total, maxVisible) {
    if (total <= maxVisible) {
        var arr = [];
        for (var i = 1; i <= total; i++) arr.push(i);
        return arr;
    }

    var pages = [1];
    var gauche = Math.max(2, current - 1);
    var droite = Math.min(total - 1, current + 1);

    if (gauche > 2) pages.push('...');
    for (var j = gauche; j <= droite; j++) pages.push(j);
    if (droite < total - 1) pages.push('...');
    pages.push(total);

    return pages;
}

// ─── Téléchargement ─────────────────────────

function telechargerCsv() {
    if (!jobId) return;
    window.open(baseUrl + '/download.php?job=' + encodeURIComponent(jobId) + '&type=csv', '_blank');
}

function telechargerErreurs() {
    if (!jobId) return;
    window.open(baseUrl + '/download.php?job=' + encodeURIComponent(jobId) + '&type=erreurs', '_blank');
}

function exporterCsvFiltre() {
    if (resultatsFiltres.length === 0) return;

    var delimiteur = document.getElementById('delimiteur').value;
    if (delimiteur === 'tab') delimiteur = '\t';

    // Construire les colonnes dynamiquement
    var colonnes = ['loc', 'lastmod'];
    var entetes = [t('table.url'), t('table.lastmod')];

    if (aChangefreq) {
        colonnes.push('changefreq');
        entetes.push(t('table.changefreq'));
    }
    if (aPriority) {
        colonnes.push('priority');
        entetes.push(t('table.priority'));
    }

    colonnes.push('sitemapSource');
    entetes.push(t('table.sitemap_source'));

    if (hreflangActif) {
        colonnes.push('hreflangs');
        entetes.push(t('table.hreflang'));
    }

    // BOM UTF-8
    var bom = '\uFEFF';
    var lignes = [entetes.join(delimiteur)];

    for (var i = 0; i < resultatsFiltres.length; i++) {
        var r = resultatsFiltres[i];
        var valeurs = [];

        for (var j = 0; j < colonnes.length; j++) {
            var col = colonnes[j];
            var val = '';

            if (col === 'hreflangs') {
                if (r.hreflangs && typeof r.hreflangs === 'object') {
                    var paires = Object.keys(r.hreflangs).map(function (l) {
                        return l + ':' + r.hreflangs[l];
                    });
                    val = paires.join(' | ');
                }
            } else {
                val = r[col] || '';
            }

            // Échapper les guillemets et envelopper si nécessaire
            if (val.indexOf(delimiteur) !== -1 || val.indexOf('"') !== -1 || val.indexOf('\n') !== -1) {
                val = '"' + val.replace(/"/g, '""') + '"';
            }

            valeurs.push(val);
        }

        lignes.push(valeurs.join(delimiteur));
    }

    var contenuCsv = bom + lignes.join('\n');
    var blob = new Blob([contenuCsv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);

    // Nom du fichier
    var suffixe = 'tous';
    if (filtreSitemapActif) {
        suffixe = filtreSitemapActif.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    }
    var nomFichier = 'sitemap-filtre-' + suffixe + '.csv';

    var lien = document.createElement('a');
    lien.href = url;
    lien.download = nomFichier;
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    URL.revokeObjectURL(url);
}

// ─── Audit SEO ─────────────────────────────

function detecterDoublons() {
    var compteur = {};
    for (var i = 0; i < resultats.length; i++) {
        var loc = resultats[i].loc;
        if (!compteur[loc]) {
            compteur[loc] = [];
        }
        compteur[loc].push(resultats[i].sitemapSource || '');
    }

    var doublons = [];
    var cles = Object.keys(compteur);
    for (var j = 0; j < cles.length; j++) {
        if (compteur[cles[j]].length > 1) {
            doublons.push({
                loc: cles[j],
                sources: compteur[cles[j]],
                count: compteur[cles[j]].length,
            });
        }
    }

    return doublons;
}

function detecterSansHreflang() {
    if (!hreflangActif) return [];

    var sansHreflang = [];
    for (var i = 0; i < resultats.length; i++) {
        var r = resultats[i];
        var aHreflang = r.hreflangs && typeof r.hreflangs === 'object' && Object.keys(r.hreflangs).length > 0;
        if (!aHreflang) {
            sansHreflang.push(r);
        }
    }

    return sansHreflang;
}

function detecterSansReciprocite() {
    if (!hreflangActif) return [];

    // Construire un index loc → hreflangs
    var index = {};
    for (var i = 0; i < resultats.length; i++) {
        var r = resultats[i];
        if (r.hreflangs && typeof r.hreflangs === 'object') {
            index[r.loc] = r.hreflangs;
        }
    }

    var problemes = [];
    var dejaTrouve = {};

    var locs = Object.keys(index);
    for (var j = 0; j < locs.length; j++) {
        var loc = locs[j];
        var hreflangs = index[loc];
        var langues = Object.keys(hreflangs);

        for (var k = 0; k < langues.length; k++) {
            var lang = langues[k];
            var cible = hreflangs[lang];

            // Ignorer les self-references
            if (cible === loc) continue;

            // Vérifier la réciprocité : la cible doit pointer vers loc
            var cibleHreflangs = index[cible] || null;
            if (!cibleHreflangs) {
                var cleProbleme = loc + '→' + cible;
                if (!dejaTrouve[cleProbleme]) {
                    dejaTrouve[cleProbleme] = true;
                    problemes.push({
                        source: loc,
                        cible: cible,
                        lang: lang,
                        raison: 'cible_absente',
                        cibleHreflangs: null,
                    });
                }
                continue;
            }

            // Vérifier qu'au moins une langue de la cible pointe vers la source
            var reciproque = false;
            var languesCible = Object.keys(cibleHreflangs);
            for (var l = 0; l < languesCible.length; l++) {
                if (cibleHreflangs[languesCible[l]] === loc) {
                    reciproque = true;
                    break;
                }
            }

            if (!reciproque) {
                var cleP = loc + '→' + cible;
                if (!dejaTrouve[cleP]) {
                    dejaTrouve[cleP] = true;
                    problemes.push({
                        source: loc,
                        cible: cible,
                        lang: lang,
                        raison: 'pas_de_retour',
                        cibleHreflangs: cibleHreflangs,
                    });
                }
            }
        }
    }

    return problemes;
}

function genererRapportAudit() {
    var doublons = detecterDoublons();
    var sansHreflang = detecterSansHreflang();
    var sansReciprocite = detecterSansReciprocite();

    var totalProblemes = doublons.length + sansHreflang.length + sansReciprocite.length;

    if (totalProblemes === 0) {
        elSectionAudit.classList.add('d-none');
        return;
    }

    var html = '';
    var compteurSection = 0;

    // Doublons
    if (doublons.length > 0) {
        html += renderAuditSection(
            'doublons' + compteurSection,
            'bi-files',
            t('audit.doublons'),
            doublons.length,
            'attention',
            renderTableauDoublons(doublons)
        );
        compteurSection++;
    }

    // Sans hreflang
    if (sansHreflang.length > 0) {
        html += renderAuditSection(
            'sansHreflang' + compteurSection,
            'bi-translate',
            t('audit.sans_hreflang'),
            sansHreflang.length,
            'attention',
            renderTableauSansHreflang(sansHreflang)
        );
        compteurSection++;
    }

    // Sans réciprocité
    if (sansReciprocite.length > 0) {
        html += renderAuditSection(
            'sansRecip' + compteurSection,
            'bi-arrow-left-right',
            t('audit.sans_reciprocite'),
            sansReciprocite.length,
            'erreur',
            renderTableauSansReciprocite(sansReciprocite)
        );
    }

    elCorpsAudit.innerHTML = html;
    elSectionAudit.classList.remove('d-none');

    // Initialiser les tooltips Bootstrap dans l'audit
    if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
        var tooltipsAudit = elCorpsAudit.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipsAudit.forEach(function (el) {
            new bootstrap.Tooltip(el, { html: true });
        });
    }
}

function renderAuditSection(id, icone, titre, count, severite, contenu) {
    var badgeClasse = severite === 'erreur' ? 'badge-erreur' : 'badge-attention';

    return '<div class="audit-issue">'
        + '<div class="audit-issue-header" data-bs-toggle="collapse" href="#audit_' + id + '" role="button" aria-expanded="false">'
        + '<i class="bi ' + icone + '"></i> '
        + '<span>' + titre + '</span> '
        + '<span class="' + badgeClasse + '">' + count + '</span>'
        + '<i class="bi bi-chevron-right ms-auto"></i>'
        + '</div>'
        + '<div class="collapse" id="audit_' + id + '">'
        + '<div class="audit-issue-body">'
        + contenu
        + '</div>'
        + '</div>'
        + '</div>';
}

function renderTableauDoublons(doublons) {
    var limite = Math.min(doublons.length, 100);
    var html = '<table class="table table-sm mb-0">';
    html += '<thead><tr><th>' + t('audit.table_url') + '</th><th>' + t('audit.table_occurrences') + '</th><th>' + t('audit.table_sources') + '</th></tr></thead><tbody>';

    for (var i = 0; i < limite; i++) {
        var d = doublons[i];
        html += '<tr>';
        html += '<td class="col-url"><a href="' + echapper(d.loc) + '" target="_blank" rel="noopener">' + echapper(tronquer(d.loc, 70)) + '</a></td>';
        html += '<td>' + d.count + '</td>';
        html += '<td>' + echapper(d.sources.join(', ')) + '</td>';
        html += '</tr>';
    }

    html += '</tbody></table>';

    if (doublons.length > 100) {
        html += '<p class="text-muted mt-2 mb-0" style="font-size:0.8rem;">' + t('audit.et_plus', { count: doublons.length - 100 }) + '</p>';
    }

    return html;
}

function renderTableauSansHreflang(urls) {
    var limite = Math.min(urls.length, 100);
    var html = '<table class="table table-sm mb-0">';
    html += '<thead><tr><th>' + t('audit.table_url') + '</th><th>' + t('audit.table_sitemap_source') + '</th></tr></thead><tbody>';

    for (var i = 0; i < limite; i++) {
        var r = urls[i];
        html += '<tr>';
        html += '<td class="col-url"><a href="' + echapper(r.loc) + '" target="_blank" rel="noopener">' + echapper(tronquer(r.loc, 70)) + '</a></td>';
        html += '<td>' + echapper(tronquer(r.sitemapSource || '', 50)) + '</td>';
        html += '</tr>';
    }

    html += '</tbody></table>';

    if (urls.length > 100) {
        html += '<p class="text-muted mt-2 mb-0" style="font-size:0.8rem;">' + t('audit.et_plus', { count: urls.length - 100 }) + '</p>';
    }

    return html;
}

function renderTableauSansReciprocite(problemes) {
    var limite = Math.min(problemes.length, 100);
    var html = '<table class="table table-sm mb-0">';
    html += '<thead><tr><th>' + t('audit.table_url_source') + '</th><th>' + t('audit.table_langue') + '</th><th>' + t('audit.table_url_cible') + '</th><th>' + t('audit.table_diagnostic') + '</th></tr></thead><tbody>';

    for (var i = 0; i < limite; i++) {
        var p = problemes[i];
        var estAbsente = p.raison === 'cible_absente';
        var badgeClasse = estAbsente ? 'badge-attention' : 'badge-erreur';
        var badgeTexte = estAbsente ? t('audit.cible_absente') : t('audit.pas_de_retour');
        var tooltipHtml = construireTooltipReciprocite(p);

        html += '<tr>';
        html += '<td class="col-url"><a href="' + echapper(p.source) + '" target="_blank" rel="noopener">' + echapper(tronquer(p.source, 50)) + '</a></td>';
        html += '<td><span class="badge-langue">' + echapper(p.lang) + '</span></td>';
        html += '<td class="col-url"><a href="' + echapper(p.cible) + '" target="_blank" rel="noopener">' + echapper(tronquer(p.cible, 50)) + '</a></td>';
        html += '<td><span class="diagnostic-badge ' + badgeClasse + '" data-bs-toggle="tooltip" data-bs-placement="left" data-bs-html="true" title="' + tooltipHtml + '">' + badgeTexte + '</span></td>';
        html += '</tr>';
    }

    html += '</tbody></table>';

    if (problemes.length > 100) {
        html += '<p class="text-muted mt-2 mb-0" style="font-size:0.8rem;">' + t('audit.et_plus', { count: problemes.length - 100 }) + '</p>';
    }

    return html;
}

function construireTooltipReciprocite(p) {
    var lignes = [];
    lignes.push(t('tooltip.declare_hreflang', { lang: echapper(p.lang) }));

    if (!p.cibleHreflangs) {
        lignes.push(t('tooltip.b_absente'));
        lignes.push(t('tooltip.verifier_b'));
    } else {
        lignes.push(t('tooltip.b_ne_pointe_pas'));
        lignes.push(t('tooltip.b_declare'));
        var langues = Object.keys(p.cibleHreflangs);
        var max = Math.min(langues.length, 10);
        for (var i = 0; i < max; i++) {
            lignes.push(' \u2022 ' + echapper(langues[i]) + ' \u2192 ' + echapper(tronquer(p.cibleHreflangs[langues[i]], 40)));
        }
        if (langues.length > 10) {
            lignes.push(t('tooltip.et_autres', { count: langues.length - 10 }));
        }
        lignes.push(t('tooltip.ajouter_hreflang'));
    }

    return lignes.join('&lt;br&gt;');
}

// ─── Utilitaires ────────────────────────────

function afficherStatus(message, type) {
    elStatusMsg.textContent = message;
    elStatusMsg.className = 'status-msg status-' + type + ' mb-4';
    elStatusMsg.classList.remove('d-none');
}

function formaterNombre(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '\u202F');
}

function echapper(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

function tronquer(str, max) {
    if (!str || str.length <= max) return str;
    return str.substring(0, max) + '…';
}
