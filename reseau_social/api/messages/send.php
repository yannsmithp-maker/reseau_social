<?php
// ============================================================
// api/messages/send.php — Envoie un message
// ============================================================
require_once '../config.php';
requireMethod('POST');

$currentUser = requireAuth();
$pdo         = getDB();

// Supporte JSON et multipart (pour les images)
if (!empty($_POST)) {
    $recepteurId    = intval($_POST['recepteur_id']    ?? 0);
    $conversationId = intval($_POST['conversation_id'] ?? 0);
    $contenu        = sanitize($_POST['contenu']        ?? '');
} else {
    $data           = json_decode(file_get_contents('php://input'), true);
    $recepteurId    = intval($data['recepteur_id']    ?? 0);
    $conversationId = intval($data['conversation_id'] ?? 0);
    $contenu        = sanitize($data['contenu']        ?? '');
}

if (!$contenu && empty($_FILES['image']['name'])) {
    jsonResponse(false, 'Message vide.');
}

// --- Trouve ou crée la conversation ---
if (!$conversationId && $recepteurId) {
    // Vérifie si une conversation existe déjà
    $stmt = $pdo->prepare("
        SELECT id FROM conversations
        WHERE (user1_id = ? AND user2_id = ?)
           OR (user1_id = ? AND user2_id = ?)
    ");
    $stmt->execute([$currentUser['id'], $recepteurId, $recepteurId, $currentUser['id']]);
    $conv = $stmt->fetch();

    if ($conv) {
        $conversationId = $conv['id'];
    } else {
        // Crée une nouvelle conversation
        $stmt = $pdo->prepare("INSERT INTO conversations (user1_id, user2_id) VALUES (?, ?)");
        $stmt->execute([$currentUser['id'], $recepteurId]);
        $conversationId = $pdo->lastInsertId();
    }
} elseif ($conversationId) {
    // Vérifie que l'utilisateur fait partie de cette conversation
    $stmt = $pdo->prepare("
        SELECT * FROM conversations
        WHERE id = ? AND (user1_id = ? OR user2_id = ?)
    ");
    $stmt->execute([$conversationId, $currentUser['id'], $currentUser['id']]);
    if (!$stmt->fetch()) {
        http_response_code(403);
        jsonResponse(false, 'Accès refusé.');
    }
} else {
    jsonResponse(false, 'Destinataire ou conversation manquant.');
}

// Gestion de l'image optionnelle
$imageFilename = null;
if (!empty($_FILES['image']['name'])) {
    $imageFilename = uploadImage($_FILES['image'], 'msg');
    if (!$imageFilename) {
        jsonResponse(false, 'Image invalide.');
    }
}

// Insère le message
$stmt = $pdo->prepare("
    INSERT INTO messages (conversation_id, expediteur_id, contenu, image)
    VALUES (?, ?, ?, ?)
");
$stmt->execute([$conversationId, $currentUser['id'], $contenu ?: null, $imageFilename]);
$messageId = $pdo->lastInsertId();

// Met à jour la date de la conversation
$pdo->prepare("UPDATE conversations SET updated_at = NOW() WHERE id = ?")->execute([$conversationId]);

// Retourne le message complet
$stmt = $pdo->prepare("
    SELECT m.id, m.contenu, m.image, m.est_lu, m.created_at,
           u.id AS expediteur_id, u.nom, u.prenom, u.photo_profil
    FROM messages m
    JOIN users u ON u.id = m.expediteur_id
    WHERE m.id = ?
");
$stmt->execute([$messageId]);
$message = $stmt->fetch();

jsonResponse(true, 'Message envoyé.', [
    'message'         => $message,
    'conversation_id' => $conversationId
]);
