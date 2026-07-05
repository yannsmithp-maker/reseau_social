<?php
// ============================================================
// api/messages/conversations.php — Liste des conversations
// ============================================================
require_once '../config.php';
requireMethod('GET');

$currentUser = requireAuth();
$pdo         = getDB();

$stmt = $pdo->prepare("
    SELECT
        c.id AS conversation_id,
        -- L'autre utilisateur
        u.id AS user_id, u.nom, u.prenom, u.photo_profil,
        -- Dernier message
        (SELECT contenu FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS dernier_message,
        (SELECT image  FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS dernier_image,
        (SELECT created_at FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS dernier_at,
        -- Nombre de messages non lus
        (SELECT COUNT(*) FROM messages
         WHERE conversation_id = c.id AND expediteur_id != :uid AND est_lu = 0) AS non_lus
    FROM conversations c
    JOIN users u ON u.id = CASE
        WHEN c.user1_id = :uid THEN c.user2_id
        ELSE c.user1_id
    END
    WHERE c.user1_id = :uid OR c.user2_id = :uid
    ORDER BY dernier_at DESC
");
$stmt->execute([':uid' => $currentUser['id']]);
$conversations = $stmt->fetchAll();

jsonResponse(true, 'Conversations récupérées.', ['conversations' => $conversations]);
