<?php
// ============================================================
// api/notifications/mark-read.php — Marque les notifs comme lues
// ============================================================
require_once '../config.php';
requireMethod('POST');

$currentUser = requireAuth();
$data        = json_decode(file_get_contents('php://input'), true);
$pdo         = getDB();

// Si un ID précis est fourni, on marque seulement celui-là
// Sinon, on marque toutes les notifications de l'utilisateur
if (!empty($data['id'])) {
    $pdo->prepare("UPDATE notifications SET est_lu = 1 WHERE id = ? AND user_id = ?")
        ->execute([$data['id'], $currentUser['id']]);
} else {
    $pdo->prepare("UPDATE notifications SET est_lu = 1 WHERE user_id = ?")
        ->execute([$currentUser['id']]);
}

jsonResponse(true, 'Notifications marquées comme lues.');
