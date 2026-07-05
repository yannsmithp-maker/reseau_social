<?php
// ============================================================
// api/friends/remove.php — Supprime une amitié
// ============================================================
require_once '../config.php';
requireMethod('POST');

$currentUser = requireAuth();
$data        = json_decode(file_get_contents('php://input'), true);
$amiId       = intval($data['ami_id'] ?? 0);

if (!$amiId) {
    jsonResponse(false, 'ID ami manquant.');
}

$pdo  = getDB();
$stmt = $pdo->prepare("
    DELETE FROM friendships
    WHERE statut = 'accepte'
      AND ((demandeur_id = ? AND recepteur_id = ?)
        OR (demandeur_id = ? AND recepteur_id = ?))
");
$stmt->execute([$currentUser['id'], $amiId, $amiId, $currentUser['id']]);

if ($stmt->rowCount() === 0) {
    jsonResponse(false, 'Amitié introuvable.');
}

jsonResponse(true, 'Ami supprimé.');
