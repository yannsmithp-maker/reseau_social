<?php
// ============================================================
// api/auth/verify.php — Vérification de l'email
// ============================================================
require_once '../config.php';

$token = sanitize($_GET['token'] ?? '');

if (!$token) {
    // Redirige vers l'accueil avec une erreur
    header('Location: ' . SITE_URL . '/index.html?error=token_manquant');
    exit;
}

$pdo = getDB();
$stmt = $pdo->prepare("SELECT id, est_verifie FROM users WHERE token_verification = ?");
$stmt->execute([$token]);
$user = $stmt->fetch();

if (!$user) {
    header('Location: ' . SITE_URL . '/index.html?error=token_invalide');
    exit;
}

if ($user['est_verifie']) {
    // Déjà vérifié — redirige directement vers la connexion
    header('Location: ' . SITE_URL . '/index.html?info=deja_verifie');
    exit;
}

// Active le compte
$stmt = $pdo->prepare("UPDATE users SET est_verifie = 1, token_verification = NULL WHERE id = ?");
$stmt->execute([$user['id']]);

// Redirige vers le site avec un message de succès
header('Location: ' . SITE_URL . '/index.html?success=email_verifie');
exit;
