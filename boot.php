<?php
// Sitemap Killer — autoloader pour les classes src/
spl_autoload_register(function (string $classe): void {
    $fichier = __DIR__ . '/src/' . $classe . '.php';
    if (file_exists($fichier)) {
        require_once $fichier;
    }
});
