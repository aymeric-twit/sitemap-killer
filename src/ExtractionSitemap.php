<?php

declare(strict_types=1);

/**
 * Extraction récursive de sitemaps XML.
 *
 * Supporte : sitemap index, urlset, .xml.gz, hreflang, filtrage regex.
 * Zéro dépendance externe — simplexml + file_get_contents natifs.
 */
class ExtractionSitemap
{
    // ─── Configuration ──────────────────────────

    private string $userAgent = 'SitemapKiller/1.0 (PHP)';
    private int $timeout = 30;
    private int $tentatives = 3;
    private int $profondeurMax = 10;
    private bool $extraireHreflang = false;
    private string $formatHreflang = 'flat';
    private string $delimiteurCsv = ';';
    private ?string $filtreUrl = null;

    // ─── État ────────────────────────────────────

    /** @var array<int, array<string, mixed>> */
    private array $urls = [];
    /** @var string[] */
    private array $erreurs = [];
    /** @var string[] */
    private array $languesHreflang = [];
    private int $compteurSitemaps = 0;
    private int $compteurRequetes = 0;
    private string $sitemapEnCours = '';

    // ─── Callbacks SSE ───────────────────────────

    /** @var ?\Closure(string|array): void */
    private ?\Closure $callbackLog = null;
    /** @var ?\Closure(array): void */
    private ?\Closure $callbackUrls = null;
    /** @var ?\Closure(array): void */
    private ?\Closure $callbackProgression = null;

    private int $tailleLot = 50;
    /** @var array<int, array<string, mixed>> */
    private array $tamponLot = [];

    // ─── Setters chaînables ─────────────────────

    public function setUserAgent(string $ua): self
    {
        $this->userAgent = $ua;
        return $this;
    }

    public function setTimeout(int $t): self
    {
        $this->timeout = max(1, $t);
        return $this;
    }

    public function setTentatives(int $r): self
    {
        $this->tentatives = max(1, $r);
        return $this;
    }

    public function setProfondeurMax(int $d): self
    {
        $this->profondeurMax = max(1, $d);
        return $this;
    }

    public function setExtraireHreflang(bool $h): self
    {
        $this->extraireHreflang = $h;
        return $this;
    }

    public function setFormatHreflang(string $f): self
    {
        $this->formatHreflang = in_array($f, ['flat', 'pivot'], true) ? $f : 'flat';
        return $this;
    }

    public function setDelimiteurCsv(string $d): self
    {
        $this->delimiteurCsv = $d;
        return $this;
    }

    public function setFiltreUrl(?string $f): self
    {
        $this->filtreUrl = $f;
        return $this;
    }

    public function setCallbackLog(?\Closure $fn): self
    {
        $this->callbackLog = $fn;
        return $this;
    }

    public function setCallbackUrls(?\Closure $fn): self
    {
        $this->callbackUrls = $fn;
        return $this;
    }

    public function setCallbackProgression(?\Closure $fn): self
    {
        $this->callbackProgression = $fn;
        return $this;
    }

    // ─── Extraction principale ──────────────────

    /**
     * Extraire toutes les URLs à partir d'une URL de sitemap.
     *
     * @return array<int, array<string, mixed>>
     */
    public function extraire(string $urlSitemap): array
    {
        $this->reinitialiser();
        $this->log("Démarrage de l'extraction : $urlSitemap", "Starting extraction: $urlSitemap");
        $this->traiterSitemap($urlSitemap, 0);
        $this->viderTampon();
        $this->emettreFin();

        return $this->urls;
    }

    /**
     * Extraire les URLs à partir de plusieurs sitemaps.
     *
     * @param string[] $urlsSitemap
     * @return array<int, array<string, mixed>>
     */
    public function extraireMulti(array $urlsSitemap): array
    {
        $this->reinitialiser();
        $this->log("Démarrage multi-extraction : " . count($urlsSitemap) . " sitemap(s)", "Starting multi-extraction: " . count($urlsSitemap) . " sitemap(s)");
        foreach ($urlsSitemap as $url) {
            $this->log("Sitemap : $url", "Sitemap: $url");
            $this->traiterSitemap($url, 0);
        }
        $this->viderTampon();
        $this->emettreFin();

        return $this->urls;
    }

    /**
     * Détecter les sitemaps depuis robots.txt, puis les traiter.
     *
     * @return array<int, array<string, mixed>>
     */
    public function extraireDepuisRobots(string $urlBase): array
    {
        $this->reinitialiser();
        $urlRobots = rtrim($urlBase, '/') . '/robots.txt';
        $this->log("Lecture de robots.txt : $urlRobots", "Reading robots.txt: $urlRobots");

        $contenu = $this->telechargerUrl($urlRobots);
        if ($contenu === null) {
            $this->erreurs[] = "Impossible de lire robots.txt : $urlRobots";
            $this->log("Échec lecture robots.txt — tentative /sitemap.xml par défaut", "Failed to read robots.txt — trying /sitemap.xml as default");
            $this->traiterSitemap(rtrim($urlBase, '/') . '/sitemap.xml', 0);
        } else {
            $urlsSitemap = [];
            foreach (explode("\n", $contenu) as $ligne) {
                if (preg_match('/^Sitemap:\s*(.+)$/i', trim($ligne), $m)) {
                    $urlsSitemap[] = trim($m[1]);
                }
            }

            if (empty($urlsSitemap)) {
                $this->log("Aucun sitemap dans robots.txt — tentative /sitemap.xml", "No sitemap in robots.txt — trying /sitemap.xml");
                $urlsSitemap[] = rtrim($urlBase, '/') . '/sitemap.xml';
            }

            $this->log(count($urlsSitemap) . " sitemap(s) détecté(s) dans robots.txt", count($urlsSitemap) . " sitemap(s) found in robots.txt");
            foreach ($urlsSitemap as $url) {
                $this->log("Sitemap : $url", "Sitemap: $url");
                $this->traiterSitemap($url, 0);
            }
        }

        $this->viderTampon();
        $this->emettreFin();

        return $this->urls;
    }

    // ─── Traitement récursif ────────────────────

    private function traiterSitemap(string $url, int $profondeur): void
    {
        if ($profondeur > $this->profondeurMax) {
            $this->erreurs[] = "Profondeur max ({$this->profondeurMax}) atteinte : $url";
            $this->log("Profondeur max atteinte — ignoré : $url", "Max depth reached — skipped: $url");
            return;
        }

        if (connection_aborted()) {
            return;
        }

        $this->log("Traitement sitemap (profondeur $profondeur) : $url", "Processing sitemap (depth $profondeur): $url");

        $contenu = $this->telechargerUrl($url);
        if ($contenu === null) {
            return;
        }

        // Décompression gzip : par extension .gz OU par détection magic bytes \x1f\x8b
        $chemin = strtolower(parse_url($url, PHP_URL_PATH) ?? '');
        $estGzip = str_ends_with($chemin, '.gz')
            || (strlen($contenu) >= 2 && $contenu[0] === "\x1f" && $contenu[1] === "\x8b");
        if ($estGzip) {
            $decode = @gzdecode($contenu);
            if ($decode === false) {
                $this->erreurs[] = "Décompression gzip échouée : $url";
                $this->log("Décompression gzip échouée : $url", "Gzip decompression failed: $url");
                return;
            }
            $contenu = $decode;
        }

        // Parser XML
        libxml_use_internal_errors(true);
        $xml = simplexml_load_string($contenu);
        if ($xml === false) {
            $errs = array_map(fn($e) => trim($e->message), libxml_get_errors());
            libxml_clear_errors();
            $apercu = mb_substr(trim($contenu), 0, 120);
            $taille = strlen($contenu);
            $this->erreurs[] = "XML invalide ($url) : " . implode('; ', $errs) . " [{$taille} octets, début: {$apercu}]";
            $this->log(
                "XML invalide ({$taille} octets) : $url — " . mb_substr($apercu, 0, 80),
                "Invalid XML ({$taille} bytes): $url — " . mb_substr($apercu, 0, 80)
            );
            return;
        }

        $this->compteurSitemaps++;
        $namespaces = $xml->getNamespaces(true);
        $nomRacine = $xml->getName();

        if ($nomRacine === 'sitemapindex') {
            $this->traiterSitemapIndex($xml, $namespaces, $profondeur);
        } elseif ($nomRacine === 'urlset') {
            $this->sitemapEnCours = $url;
            $this->traiterUrlset($xml, $namespaces);
        } else {
            $this->erreurs[] = "Type de sitemap inconnu ($nomRacine) : $url";
            $this->log("Type inconnu : $nomRacine", "Unknown type: $nomRacine");
        }

        $this->emettreProgression();
    }

    /**
     * @param array<string, string> $namespaces
     */
    private function traiterSitemapIndex(SimpleXMLElement $xml, array $namespaces, int $profondeur): void
    {
        $ns = $namespaces[''] ?? 'http://www.sitemaps.org/schemas/sitemap/0.9';
        $compteur = 0;

        foreach ($xml->children($ns) as $enfant) {
            if ($enfant->getName() !== 'sitemap') {
                continue;
            }

            $enfantsNs = $enfant->children($ns);
            $loc = isset($enfantsNs->loc) ? trim((string) $enfantsNs->loc) : null;

            if ($loc !== null && $loc !== '') {
                $compteur++;
                $this->traiterSitemap($loc, $profondeur + 1);
            }
        }

        $this->log("Sitemap index : $compteur sous-sitemap(s)", "Sitemap index: $compteur sub-sitemap(s)");
    }

    /**
     * @param array<string, string> $namespaces
     */
    private function traiterUrlset(SimpleXMLElement $xml, array $namespaces): void
    {
        $ns = $namespaces[''] ?? 'http://www.sitemaps.org/schemas/sitemap/0.9';
        $xhtmlNs = $namespaces['xhtml'] ?? 'http://www.w3.org/1999/xhtml';
        $compteur = 0;

        foreach ($xml->children($ns) as $noeudUrl) {
            if ($noeudUrl->getName() !== 'url') {
                continue;
            }

            $enfants = $noeudUrl->children($ns);
            $loc = isset($enfants->loc) ? trim((string) $enfants->loc) : null;
            if ($loc === null || $loc === '') {
                continue;
            }

            // Filtre regex
            if ($this->filtreUrl !== null && !@preg_match($this->filtreUrl, $loc)) {
                continue;
            }

            $entree = [
                'loc'           => $loc,
                'lastmod'       => isset($enfants->lastmod) ? trim((string) $enfants->lastmod) : '',
                'changefreq'    => isset($enfants->changefreq) ? trim((string) $enfants->changefreq) : '',
                'priority'      => isset($enfants->priority) ? trim((string) $enfants->priority) : '',
                'sitemapSource' => $this->sitemapEnCours,
            ];

            // Extraction hreflang
            if ($this->extraireHreflang) {
                $hreflangs = [];
                foreach ($noeudUrl->children($xhtmlNs) as $lien) {
                    if ($lien->getName() !== 'link') {
                        continue;
                    }
                    $attrs = $lien->attributes();
                    $rel = (string) ($attrs['rel'] ?? '');
                    $langAttr = (string) ($attrs['hreflang'] ?? '');
                    $href = (string) ($attrs['href'] ?? '');

                    if ($rel === 'alternate' && $langAttr !== '' && $href !== '') {
                        $hreflangs[$langAttr] = $href;
                        if (!in_array($langAttr, $this->languesHreflang, true)) {
                            $this->languesHreflang[] = $langAttr;
                        }
                    }
                }
                $entree['hreflangs'] = $hreflangs;
            }

            $this->urls[] = $entree;
            $this->tamponLot[] = $entree;
            $compteur++;

            if (count($this->tamponLot) >= $this->tailleLot) {
                $this->viderTampon();
            }
        }

        $this->log("Urlset : $compteur URLs (total : " . count($this->urls) . ")", "Urlset: $compteur URLs (total: " . count($this->urls) . ")");
    }

    // ─── Réseau ─────────────────────────────────

    /**
     * Vérifier qu'une URL est publique (anti-SSRF).
     *
     * Rejette les schémas non HTTP(S) et les hôtes résolvant vers des IP
     * privées ou réservées (127.0.0.0/8, 10/8, 172.16/12, 192.168/16, 169.254/16, ::1…).
     */
    public static function estUrlPublique(string $url): bool
    {
        $parties = parse_url($url);
        $scheme = strtolower($parties['scheme'] ?? '');
        $hote = $parties['host'] ?? '';

        if (!in_array($scheme, ['http', 'https'], true) || $hote === '') {
            return false;
        }

        // Résoudre le nom d'hôte en IP
        $ip = gethostbyname($hote);

        // gethostbyname renvoie le hostname tel quel en cas d'échec
        if ($ip === $hote && !filter_var($hote, FILTER_VALIDATE_IP)) {
            return false;
        }

        // Rejeter les IP privées et réservées (IPv4)
        if (!filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return false;
        }

        return true;
    }

    private function telechargerUrl(string $url): ?string
    {
        if (!self::estUrlPublique($url)) {
            $this->erreurs[] = "URL bloquée (adresse privée/réservée) : $url";
            $this->log("URL bloquée (SSRF) : $url", "URL blocked (SSRF): $url");
            return null;
        }

        // Toujours utiliser stream_context natif (pas WebClient)
        // Le WebClient envoie Accept-Encoding: br (Brotli) que cURL
        // ne décompresse pas si libcurl n'a pas le support Brotli compilé
        $codeHttp = 0;

        for ($tentative = 1; $tentative <= $this->tentatives; $tentative++) {
            // Suivre les redirections manuellement (anti-SSRF sur chaque hop)
            $urlCourante = $url;
            $contenu = false;

            for ($redir = 0; $redir <= 5; $redir++) {
                $this->compteurRequetes++;

                $contexte = stream_context_create([
                    'http' => [
                        'method'          => 'GET',
                        'header'          => "User-Agent: {$this->userAgent}\r\n",
                        'timeout'         => $this->timeout,
                        'follow_location' => false,
                        'ignore_errors'   => true,
                    ],
                    'ssl' => [
                        'verify_peer'      => true,
                        'verify_peer_name' => true,
                    ],
                ]);

                $contenu = @file_get_contents($urlCourante, false, $contexte);
                $codeHttp = $this->extraireCodeHttp($http_response_header ?? []);

                if ($codeHttp >= 300 && $codeHttp < 400) {
                    $location = $this->extraireHeader($http_response_header ?? [], 'Location');
                    if ($location === '') {
                        break;
                    }
                    // Résoudre les URLs relatives
                    if (!preg_match('#^https?://#i', $location)) {
                        $base = parse_url($urlCourante);
                        $location = ($base['scheme'] ?? 'https') . '://' . ($base['host'] ?? '') . $location;
                    }
                    if (!self::estUrlPublique($location)) {
                        $this->erreurs[] = "Redirection bloquée (SSRF) : $urlCourante → $location";
                        $this->log("Redirection bloquée (SSRF) : $location", "Redirect blocked (SSRF): $location");
                        return null;
                    }
                    $urlCourante = $location;
                    continue;
                }

                break; // Pas une redirection, sortir de la boucle redirect
            }

            if ($contenu !== false && $codeHttp >= 200 && $codeHttp < 300) {
                // Décompression Content-Encoding gzip (header ou détection magique \x1f\x8b)
                $encoding = $this->extraireHeader($http_response_header ?? [], 'Content-Encoding');
                $estGzip = stripos($encoding, 'gzip') !== false
                    || (strlen($contenu) >= 2 && $contenu[0] === "\x1f" && $contenu[1] === "\x8b");
                if ($estGzip) {
                    $decode = @gzdecode($contenu);
                    if ($decode !== false) {
                        $contenu = $decode;
                    }
                }
                return $contenu;
            }

            if ($tentative < $this->tentatives) {
                $attente = $tentative * 2;
                $this->log("HTTP $codeHttp — retry $tentative/{$this->tentatives} dans {$attente}s", "HTTP $codeHttp — retry $tentative/{$this->tentatives} in {$attente}s");
                sleep($attente);
            }
        }

        $this->erreurs[] = "Échec après {$this->tentatives} tentatives : $url (HTTP $codeHttp)";
        $this->log("Échec définitif : $url (HTTP $codeHttp)", "Final failure: $url (HTTP $codeHttp)");

        return null;
    }

    /**
     * @param string[] $headers
     */
    private function extraireCodeHttp(array $headers): int
    {
        // Parcourir en ordre inverse pour prendre le dernier statut (après redirections)
        for ($i = count($headers) - 1; $i >= 0; $i--) {
            if (preg_match('/^HTTP\/[\d.]+ (\d{3})/', $headers[$i], $m)) {
                return (int) $m[1];
            }
        }
        return 0;
    }

    /**
     * @param string[] $headers
     */
    private function extraireHeader(array $headers, string $nom): string
    {
        // Parcourir en ordre inverse pour prendre le dernier header (après redirections)
        for ($i = count($headers) - 1; $i >= 0; $i--) {
            if (stripos($headers[$i], "$nom:") === 0) {
                return trim(substr($headers[$i], strlen($nom) + 1));
            }
        }
        return '';
    }

    // ─── Export CSV ──────────────────────────────

    public function exporterCsv(string $fichier, bool $inclureEntete = true): bool
    {
        $fp = fopen($fichier, 'w');
        if ($fp === false) {
            $this->erreurs[] = "Impossible d'ouvrir : $fichier";
            return false;
        }

        // BOM UTF-8 pour Excel
        fwrite($fp, "\xEF\xBB\xBF");

        $colonnesBase = ['loc', 'lastmod', 'changefreq', 'priority', 'sitemapSource'];

        if ($this->extraireHreflang && !empty($this->languesHreflang)) {
            sort($this->languesHreflang);

            if ($this->formatHreflang === 'pivot') {
                return $this->exporterCsvPivot($fp, $colonnesBase, $inclureEntete);
            }
            return $this->exporterCsvFlat($fp, $colonnesBase, $inclureEntete);
        }

        // Sans hreflang
        if ($inclureEntete) {
            fputcsv($fp, $colonnesBase, $this->delimiteurCsv);
        }

        foreach ($this->urls as $entree) {
            fputcsv($fp, [
                $entree['loc'],
                $entree['lastmod'],
                $entree['changefreq'],
                $entree['priority'],
                $entree['sitemapSource'],
            ], $this->delimiteurCsv);
        }

        fclose($fp);
        return true;
    }

    /**
     * @param resource $fp
     * @param string[] $colonnesBase
     */
    private function exporterCsvPivot($fp, array $colonnesBase, bool $inclureEntete): bool
    {
        $colonnes = array_merge(
            $colonnesBase,
            array_map(fn($l) => "hreflang_$l", $this->languesHreflang)
        );

        if ($inclureEntete) {
            fputcsv($fp, $colonnes, $this->delimiteurCsv);
        }

        foreach ($this->urls as $entree) {
            $ligne = [
                $entree['loc'],
                $entree['lastmod'],
                $entree['changefreq'],
                $entree['priority'],
                $entree['sitemapSource'],
            ];
            foreach ($this->languesHreflang as $lang) {
                $ligne[] = $entree['hreflangs'][$lang] ?? '';
            }
            fputcsv($fp, $ligne, $this->delimiteurCsv);
        }

        fclose($fp);
        return true;
    }

    /**
     * @param resource $fp
     * @param string[] $colonnesBase
     */
    private function exporterCsvFlat($fp, array $colonnesBase, bool $inclureEntete): bool
    {
        $colonnes = array_merge($colonnesBase, ['hreflang_lang', 'hreflang_url']);

        if ($inclureEntete) {
            fputcsv($fp, $colonnes, $this->delimiteurCsv);
        }

        foreach ($this->urls as $entree) {
            $base = [
                $entree['loc'],
                $entree['lastmod'],
                $entree['changefreq'],
                $entree['priority'],
                $entree['sitemapSource'],
            ];

            if (!empty($entree['hreflangs'])) {
                foreach ($entree['hreflangs'] as $lang => $href) {
                    fputcsv($fp, array_merge($base, [$lang, $href]), $this->delimiteurCsv);
                }
            } else {
                fputcsv($fp, array_merge($base, ['', '']), $this->delimiteurCsv);
            }
        }

        fclose($fp);
        return true;
    }

    /**
     * Exporter le journal d'erreurs.
     */
    public function exporterErreurs(string $fichier): bool
    {
        if (empty($this->erreurs)) {
            return true;
        }

        $fp = fopen($fichier, 'w');
        if ($fp === false) {
            return false;
        }

        fwrite($fp, "\xEF\xBB\xBF");
        fwrite($fp, "# Rapport d'erreurs — Sitemap Killer\n");
        fwrite($fp, "# Date : " . date('Y-m-d H:i:s') . "\n\n");

        foreach ($this->erreurs as $i => $erreur) {
            fwrite($fp, ($i + 1) . ". $erreur\n");
        }

        fclose($fp);
        return true;
    }

    // ─── Getters ────────────────────────────────

    /** @return string[] */
    public function getErreurs(): array
    {
        return $this->erreurs;
    }

    /** @return string[] */
    public function getLanguesHreflang(): array
    {
        return $this->languesHreflang;
    }

    /**
     * @return array{totalUrls: int, totalSitemaps: int, totalRequetes: int, totalErreurs: int, languesTrouvees: string[]}
     */
    public function getStatistiques(): array
    {
        return [
            'totalUrls'       => count($this->urls),
            'totalSitemaps'   => $this->compteurSitemaps,
            'totalRequetes'   => $this->compteurRequetes,
            'totalErreurs'    => count($this->erreurs),
            'languesTrouvees' => $this->languesHreflang,
        ];
    }

    // ─── Helpers internes ───────────────────────

    private function reinitialiser(): void
    {
        $this->urls = [];
        $this->erreurs = [];
        $this->languesHreflang = [];
        $this->compteurSitemaps = 0;
        $this->compteurRequetes = 0;
        $this->sitemapEnCours = '';
        $this->tamponLot = [];
    }

    private function viderTampon(): void
    {
        if (!empty($this->tamponLot) && $this->callbackUrls !== null) {
            ($this->callbackUrls)($this->tamponLot);
        }
        $this->tamponLot = [];
    }

    private function emettreProgression(): void
    {
        if ($this->callbackProgression !== null) {
            ($this->callbackProgression)($this->getStatistiques());
        }
    }

    private function emettreFin(): void
    {
        $total = count($this->urls);
        $sitemaps = $this->compteurSitemaps;
        $requetes = $this->compteurRequetes;
        $erreurs = count($this->erreurs);
        $this->log("Terminé — $total URLs, $sitemaps sitemaps, $requetes requêtes, $erreurs erreur(s)", "Done — $total URLs, $sitemaps sitemaps, $requetes requests, $erreurs error(s)");
    }

    private function log(string $message, ?string $messageEn = null): void
    {
        if ($this->callbackLog !== null) {
            if ($messageEn !== null) {
                ($this->callbackLog)(['fr' => $message, 'en' => $messageEn]);
            } else {
                ($this->callbackLog)($message);
            }
        }
    }
}
