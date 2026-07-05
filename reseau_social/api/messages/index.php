<?php
// ============================================================
// api/messages/index.php — Messages d'une conversation
// ============================================================
require_once '../config.php';
requireMethod('GET');

$currentUser     = requireAuth();
$conversationId  = intval($_GET['conversation_id'] ?? 0);
$pdo             = getDB();

if (!$conversationId) {
    jsonResponse(false, 'ID conversation manquant.');
}

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

// Récupère les messages
$stmt = $pdo->prepare("
    SELECT m.id, m.contenu, m.image, m.est_lu, m.created_at,
           u.id AS expediteur_id, u.nom, u.prenom, u.photo_profil
    FROM messages m
    JOIN users u ON u.id = m.expediteur_id
    WHERE m.conversation_id = ?
    ORDER BY m.created_at ASC
");
$stmt->execute([$conversationId]);
$messages = $stmt->fetchAll();

// Marque les messages non lus comme lus
$pdo->prepare("
    UPDATE messages SET est_lu = 1
    WHERE conversation_id = ? AND expediteur_id != ? AND est_lu = 0
")->execute([$conversationId, $currentUser['id']]);

jsonResponse(true, 'Messages récupérés.', ['messages' => $messages]);
