<?php
// ============================================================
// api/friends/send.php — Envoie une demande d'amitié
// ============================================================
require_once '../config.php';
requireMethod('POST');

$currentUser = requireAuth();
$data        = json_decode(file_get_contents('php://input'), true);
$recepteurId = intval($data['recepteur_id'] ?? 0);

if (!$recepteurId || $recepteurId === $currentUser['id']) {
    jsonResponse(false, 'Destinataire invalide.');
}

$pdo = getDB();

// Vérifie que le destinataire existe
$stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND est_actif = 1");
$stmt->execute([$recepteurId]);
if (!$stmt->fetch()) {
    jsonResponse(false, 'Utilisateur introuvable.');
}

// Vérifie qu'il n'y a pas déjà une relation
$stmt = $pdo->prepare("
    SELECT id, statut FROM friendships
    WHERE (demandeur_id = ? AND recepteur_id = ?)
       OR (demandeur_id = ? AND recepteur_id = ?)
");
$stmt->execute([$currentUser['id'], $recepteurId, $recepteurId, $currentUser['id']]);
$existing = $stmt->fetch();

if ($existing) {
    $msg = match($existing['statut']) {
        'accepte'    => 'Vous êtes déjà amis.',
        'en_attente' => 'Une demande est déjà en cours.',
        'refuse'     => 'Cette demande a été refusée.',
        default      => 'Relation existante.',
    };
    jsonResponse(false, $msg);
}

// Crée la demande
$stmt = $pdo->prepare("INSERT INTO friendships (demandeur_id, recepteur_id) VALUES (?, ?)");
$stmt->execute([$currentUser['id'], $recepteurId]);

// Crée une notification pour le destinataire
$message = $currentUser['prenom'] . ' ' . $currentUser['nom'] . ' vous a envoyé une demande d\'amitié.';
$stmt    = $pdo->prepare("INSERT INTO notifications (user_id, type, message) VALUES (?, 'ami', ?)");
$stmt->execute([$recepteurId, $message]);

jsonResponse(true, 'Demande d\'amitié envoyée.');
