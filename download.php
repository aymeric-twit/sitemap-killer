<?php

declare(strict_types=1);

$jobId = $_GET['job'] ?? '';
$type = $_GET['type'] ?? 'csv';

if (!preg_match('/^[a-f0-9]{24}$/', $jobId)) {
    http_response_code(400);
    echo 'Job ID invalide';
    exit;
}

$dossierJob = __DIR__ . '/data/jobs/' . $jobId;

if (!is_dir($dossierJob)) {
    http_response_code(404);
    echo 'Job introuvable';
    exit;
}

if ($type === 'erreurs') {
    $fichier = $dossierJob . '/erreurs.txt';
    $mimeType = 'text/plain';
    $nomFichier = 'sitemap-erreurs-' . substr($jobId, 0, 8) . '.txt';
} else {
    $fichier = $dossierJob . '/urls.csv';
    $mimeType = 'text/csv';
    $nomFichier = 'sitemap-export-' . substr($jobId, 0, 8) . '.csv';
}

if (!file_exists($fichier)) {
    http_response_code(404);
    echo 'Fichier introuvable';
    exit;
}

header('Content-Type: ' . $mimeType . '; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $nomFichier . '"');
header('Content-Length: ' . filesize($fichier));
header('Cache-Control: no-cache');

readfile($fichier);
