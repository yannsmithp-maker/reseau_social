<?php
// ============================================================
// api/friends/respond.php — Accepte ou refuse une demande
// ============================================================
require_once '../config.php';
requireMethod('POST');

$currentUser  = requireAuth();
$data         = json_decode(file_get_contents('php://input'), true);
$friendshipId = intval($data['friendship_id'] ?? 0);
$action       = $data['action'] ?? ''; // 'accepte' ou 'refuse'

if (!$friendshipId || !in_array($action, ['accepte', 'refuse'])) {
    jsonResponse(false, 'Données invalides.');
}

$pdo  = getDB();
$stmt = $pdo->prepare("
    SELECT * FROM friendships
    WHERE id = ? AND recepteur_id = ? AND statut = 'en_attente'
");
$stmt->execute([$friendshipId, $currentUser['id']]);
$friendship = $stmt->fetch();

if (!$friendship) {
    jsonResponse(false, 'Demande introuvable ou déjà traitée.');
}

// Met à jour le statut
$pdo->prepare("UPDATE friendships SET statut = ? WHERE id = ?")->execute([$action, $friendshipId]);

// Notifie l'expéditeur si accepté
if ($action === 'accepte') {
    $message = $currentUser['prenom'] . ' ' . $currentUser['nom'] . ' a accepté votre demande d\'amitié.';
    $pdo->prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, 'ami', ?)")
        ->execute([$friendship['demandeur_id'], $message]);
}

$msg = $action === 'accepte' ? 'Demande acceptée !' : 'Demande refusée.';
jsonResponse(true, $msg);
