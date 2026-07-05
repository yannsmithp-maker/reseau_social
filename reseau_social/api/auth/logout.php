<?php
// ============================================================
// api/auth/logout.php — Déconnexion
// ============================================================
require_once '../config.php';
requireMethod('POST');

$user = requireAuth();

// Invalide le token en BDD
$pdo  = getDB();
$stmt = $pdo->prepare("UPDATE users SET token_verification = NULL WHERE id = ?");
$stmt->execute([$user['id']]);

jsonResponse(true, 'Déconnexion réussie.');
