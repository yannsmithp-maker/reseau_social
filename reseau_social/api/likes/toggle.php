<?php
// ============================================================
// api/likes/toggle.php — Like ou Dislike un post
// ============================================================
require_once '../config.php';
requireMethod('POST');

$currentUser = requireAuth();
$data        = json_decode(file_get_contents('php://input'), true);
$postId      = intval($data['post_id'] ?? 0);
$type        = $data['type'] ?? ''; // 'like' ou 'dislike'

if (!$postId || !in_array($type, ['like', 'dislike'])) {
    jsonResponse(false, 'Données invalides.');
}

$pdo = getDB();

// Vérifie que le post existe
$stmt = $pdo->prepare("SELECT id FROM posts WHERE id = ? AND est_supprime = 0");
$stmt->execute([$postId]);
if (!$stmt->fetch()) {
    jsonResponse(false, 'Post introuvable.');
}

// Vérifie si l'utilisateur a déjà une réaction sur ce post
$stmt = $pdo->prepare("SELECT id, type FROM likes WHERE post_id = ? AND user_id = ?");
$stmt->execute([$postId, $currentUser['id']]);
$existing = $stmt->fetch();

if ($existing) {
    if ($existing['type'] === $type) {
        // Même réaction → on la retire (toggle off)
        $pdo->prepare("DELETE FROM likes WHERE id = ?")->execute([$existing['id']]);
        $maReaction = null;
    } else {
        // Réaction différente → on la change
        $pdo->prepare("UPDATE likes SET type = ? WHERE id = ?")->execute([$type, $existing['id']]);
        $maReaction = $type;
    }
} else {
    // Pas de réaction → on l'ajoute
    $pdo->prepare("INSERT INTO likes (post_id, user_id, type) VALUES (?, ?, ?)")
        ->execute([$postId, $currentUser['id'], $type]);
    $maReaction = $type;
}

// Retourne les nouveaux compteurs
$nb_likes    = $pdo->prepare("SELECT COUNT(*) FROM likes WHERE post_id = ? AND type = 'like'");
$nb_likes->execute([$postId]);
$nb_dislikes = $pdo->prepare("SELECT COUNT(*) FROM likes WHERE post_id = ? AND type = 'dislike'");
$nb_dislikes->execute([$postId]);

jsonResponse(true, 'Réaction enregistrée.', [
    'ma_reaction' => $maReaction,
    'nb_likes'    => (int)$nb_likes->fetchColumn(),
    'nb_dislikes' => (int)$nb_dislikes->fetchColumn(),
]);
