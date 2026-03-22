<?php

declare(strict_types=1);

require_once __DIR__ . '/src/ExtractionSitemap.php';

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache');
header('X-Accel-Buffering: no');

while (ob_get_level()) {
    ob_end_flush();
}

set_time_limit(0);
ini_set('memory_limit', '512M');

// ─── Validation ─────────────────────────────

$jobId = $_GET['job'] ?? '';

if (!preg_match('/^[a-f0-9]{24}$/', $jobId)) {
    envoyerEvenement('error', ['message' => 'Job ID invalide']);
    exit;
}

$dossierJob = __DIR__ . '/data/jobs/' . $jobId;
$fichierConfig = $dossierJob . '/config.json';

if (!file_exists($fichierConfig)) {
    envoyerEvenement('error', ['message' => 'Job introuvable']);
    exit;
}

$config = json_decode(file_get_contents($fichierConfig), true);
$tempsDebut = microtime(true);

// ─── Configuration de l'extracteur ──────────

$extracteur = new ExtractionSitemap();
$extracteur
    ->setTimeout($config['timeout'])
    ->setTentatives($config['tentatives'])
    ->setProfondeurMax($config['profondeurMax'])
    ->setExtraireHreflang($config['hreflang'])
    ->setFormatHreflang($config['formatHreflang'])
    ->setDelimiteurCsv($config['delimiteur'])
    ->setUserAgent($config['userAgent']);

if ($config['filtre'] !== '') {
    $extracteur->setFiltreUrl('/' . str_replace('/', '\/', $config['filtre']) . '/i');
}

// ─── Callbacks SSE ──────────────────────────

$extracteur->setCallbackLog(function (string $message) {
    envoyerEvenement('log', [
        'message'     => $message,
        'horodatage'  => date('H:i:s'),
    ]);
});

$extracteur->setCallbackUrls(function (array $lot) {
    envoyerEvenement('urls', ['lot' => $lot]);
});

$extracteur->setCallbackProgression(function (array $stats) use ($tempsDebut) {
    $stats['duree'] = round(microtime(true) - $tempsDebut, 1);
    envoyerEvenement('stats', $stats);
});

// ─── Extraction ─────────────────────────────

if (!empty($config['urls'])) {
    $extracteur->extraireMulti($config['urls']);
} elseif ($config['robots']) {
    $extracteur->extraireDepuisRobots($config['url']);
} else {
    $extracteur->extraire($config['url']);
}

$duree = round(microtime(true) - $tempsDebut, 2);

// ─── Écriture des fichiers de résultats ─────

$fichierCsv = $dossierJob . '/urls.csv';
$extracteur->exporterCsv($fichierCsv, !$config['masquerEntete']);

$fichierErreurs = $dossierJob . '/erreurs.txt';
$extracteur->exporterErreurs($fichierErreurs);

// ─── Décompter le crédit après extraction réussie ─

if (class_exists('\\Platform\\Module\\Quota')) {
    try {
        \Platform\Module\Quota::track('sitemap-killer');
    } catch (\Throwable $e) {
        // Ne pas bloquer si le tracking échoue
    }
}

// ─── Événement de fin ───────────────────────

$stats = $extracteur->getStatistiques();
$stats['duree'] = $duree;

envoyerEvenement('done', [
    'statistiques' => $stats,
    'csvPret'      => true,
    'aErreurs'     => count($extracteur->getErreurs()) > 0,
]);

// ─── Helper SSE ─────────────────────────────

function envoyerEvenement(string $type, array $donnees): void
{
    echo "event: $type\ndata: " . json_encode($donnees, JSON_UNESCAPED_UNICODE) . "\n\n";
    flush();

    if (connection_aborted()) {
        exit;
    }
}
