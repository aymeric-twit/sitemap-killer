<?php

declare(strict_types=1);

header('Content-Type: application/json');
header('X-Content-Type-Options: nosniff');
ini_set('display_errors', '0');
error_reporting(0);

// ─── Validation ─────────────────────────────

require_once __DIR__ . '/src/ExtractionSitemap.php';

$urlsBrutes = trim($_POST['urls'] ?? '');
$url = trim($_POST['url'] ?? '');
$urlsValides = [];

if ($urlsBrutes !== '') {
    // Mode multi
    $lignes = array_filter(array_map('trim', explode("\n", $urlsBrutes)));
    $lignes = array_slice($lignes, 0, 100); // Limite à 100 sitemaps max
    foreach ($lignes as $ligne) {
        if (!preg_match('#^https?://#i', $ligne)) {
            $ligne = 'https://' . $ligne;
        }
        if (filter_var($ligne, FILTER_VALIDATE_URL) && ExtractionSitemap::estUrlPublique($ligne)) {
            $urlsValides[] = $ligne;
        }
    }
    if (empty($urlsValides)) {
        http_response_code(400);
        echo json_encode(['erreur' => 'Aucune URL valide']);
        exit;
    }
    $url = $urlsValides[0];
} else {
    // Mode single
    if ($url === '') {
        http_response_code(400);
        echo json_encode(['erreur' => 'URL requise']);
        exit;
    }
    if (!preg_match('#^https?://#i', $url)) {
        $url = 'https://' . $url;
    }
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        http_response_code(400);
        echo json_encode(['erreur' => 'URL invalide']);
        exit;
    }
    if (!ExtractionSitemap::estUrlPublique($url)) {
        http_response_code(400);
        echo json_encode(['erreur' => 'URL non autorisée (adresse privée ou réservée)']);
        exit;
    }
}

// Valider le filtre regex
$filtre = trim($_POST['filtre'] ?? '');
if ($filtre !== '') {
    $regex = '/' . str_replace('/', '\/', $filtre) . '/i';
    if (@preg_match($regex, '') === false) {
        http_response_code(400);
        echo json_encode(['erreur' => 'Expression régulière invalide']);
        exit;
    }
}

// ─── Vérification crédits (sans déduire) ────

if (class_exists('\\Platform\\Module\\Quota')) {
    if (!\Platform\Module\Quota::creditsDisponibles('sitemap-killer')) {
        http_response_code(429);
        echo json_encode(['erreur' => 'Crédits épuisés']);
        exit;
    }
}

// ─── Création du job ────────────────────────

$jobId = bin2hex(random_bytes(12));
$dossierJobs = __DIR__ . '/data/jobs';
$dossierJob = $dossierJobs . '/' . $jobId;

// Nettoyage des anciens jobs (> 1h)
nettoyerAnciensJobs($dossierJobs, 3600);

if (!is_dir($dossierJobs)) {
    mkdir($dossierJobs, 0755, true);
}
mkdir($dossierJob, 0755, true);

// Sécurité : empêcher l'accès direct au dossier data/
$htaccess = __DIR__ . '/data/.htaccess';
if (!file_exists($htaccess)) {
    file_put_contents($htaccess, "Deny from all\n");
}

// ─── Sauvegarde de la configuration ─────────

$config = [
    'url'            => $url,
    'urls'           => $urlsValides,
    'robots'         => filter_var($_POST['robots'] ?? false, FILTER_VALIDATE_BOOLEAN),
    'hreflang'       => filter_var($_POST['hreflang'] ?? false, FILTER_VALIDATE_BOOLEAN),
    'formatHreflang' => in_array($_POST['formatHreflang'] ?? 'flat', ['flat', 'pivot'], true)
        ? $_POST['formatHreflang']
        : 'flat',
    'filtre'         => $filtre,
    'delimiteur'     => match ($_POST['delimiteur'] ?? ';') {
        ','    => ',',
        'tab'  => "\t",
        default => ';',
    },
    'profondeurMax'  => max(1, min(50, (int) ($_POST['profondeurMax'] ?? 10))),
    'timeout'        => max(5, min(120, (int) ($_POST['timeout'] ?? 30))),
    'tentatives'     => max(1, min(10, (int) ($_POST['tentatives'] ?? 3))),
    'userAgent'      => substr(trim($_POST['userAgent'] ?? ''), 0, 200) ?: 'SitemapKiller/1.0 (PHP)',
    'masquerEntete'  => filter_var($_POST['masquerEntete'] ?? false, FILTER_VALIDATE_BOOLEAN),
    'horodatage'     => date('Y-m-d H:i:s'),
];

file_put_contents(
    $dossierJob . '/config.json',
    json_encode($config, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT)
);

echo json_encode(['jobId' => $jobId], JSON_UNESCAPED_UNICODE);

// ─── Nettoyage des anciens jobs ─────────────

function nettoyerAnciensJobs(string $dossier, int $ttl): void
{
    if (!is_dir($dossier)) {
        return;
    }

    $limite = time() - $ttl;

    foreach (new DirectoryIterator($dossier) as $item) {
        if ($item->isDot() || !$item->isDir()) {
            continue;
        }
        if ($item->getMTime() >= $limite) {
            continue;
        }

        $chemin = $item->getPathname();
        $fichiers = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($chemin, RecursiveDirectoryIterator::SKIP_DOTS),
            RecursiveIteratorIterator::CHILD_FIRST
        );
        foreach ($fichiers as $fichier) {
            $fichier->isDir() ? @rmdir($fichier->getPathname()) : @unlink($fichier->getPathname());
        }
        @rmdir($chemin);
    }
}
