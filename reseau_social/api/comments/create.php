<?php
// ============================================================
// api/comments/create.php — Ajoute un commentaire sur un post
// ============================================================
require_once '../config.php';
requireMethod('POST');

$currentUser = requireAuth();
$data        = json_decode(file_get_contents('php://input'), true);
$postId      = intval($data['post_id'] ?? 0);
$contenu     = sanitize($data['contenu'] ?? '');

if (!$postId || !$contenu) {
    jsonResponse(false, 'Post ID et contenu obligatoires.');
}
if (strlen($contenu) > 1000) {
    jsonResponse(false, 'Commentaire trop long (max 1000 caractères).');
}

$pdo  = getDB();

// Vérifie que le post existe
$stmt = $pdo->prepare("SELECT id FROM posts WHERE id = ? AND est_supprime = 0");
$stmt->execute([$postId]);
if (!$stmt->fetch()) {
    jsonResponse(false, 'Post introuvable.');
}

// Insère le commentaire
$stmt = $pdo->prepare("INSERT INTO comments (post_id, user_id, contenu) VALUES (?, ?, ?)");
$stmt->execute([$postId, $currentUser['id'], $contenu]);
$commentId = $pdo->lastInsertId();

// Retourne le commentaire complet pour affichage immédiat
$stmt = $pdo->prepare("
    SELECT c.id, c.contenu, c.created_at,
           u.id AS user_id, u.nom, u.prenom, u.photo_profil
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
");
$stmt->execute([$commentId]);
$comment = $stmt->fetch();

jsonResponse(true, 'Commentaire ajouté.', ['comment' => $comment]);
