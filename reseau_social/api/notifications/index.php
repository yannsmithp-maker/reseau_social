<?php
// ============================================================
// api/notifications/index.php — Récupère les notifications
// ============================================================
require_once '../config.php';
requireMethod('GET');

$currentUser = requireAuth();
$pdo         = getDB();

$stmt = $pdo->prepare("
    SELECT id, type, message, lien, est_lu, created_at
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 30
");
$stmt->execute([$currentUser['id']]);
$notifications = $stmt->fetchAll();

// Compte les non lues
$nonLues = array_reduce($notifications, fn($acc, $n) => $acc + ($n['est_lu'] ? 0 : 1), 0);

jsonResponse(true, 'Notifications récupérées.', [
    'notifications' => $notifications,
    'non_lues'      => $nonLues,
]);
