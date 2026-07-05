<?php
// ============================================================
// api/posts/delete.php — Supprime un post (auteur ou admin)
// ============================================================
require_once '../config.php';
requireMethod('POST');

$currentUser = requireAuth();
$data        = json_decode(file_get_contents('php://input'), true);
$postId      = intval($data['post_id'] ?? 0);

if (!$postId) {
    jsonResponse(false, 'ID du post manquant.');
}

$pdo  = getDB();
$stmt = $pdo->prepare("SELECT user_id FROM posts WHERE id = ? AND est_supprime = 0");
$stmt->execute([$postId]);
$post = $stmt->fetch();

if (!$post) {
    jsonResponse(false, 'Post introuvable.');
}

// Seul l'auteur ou un admin/modérateur peut supprimer
$isOwner = $post['user_id'] === $currentUser['id'];
$isAdmin = in_array($currentUser['role'], ['administrateur', 'moderateur']);

if (!$isOwner && !$isAdmin) {
    http_response_code(403);
    jsonResponse(false, 'Vous n\'êtes pas autorisé à supprimer ce post.');
}

// Suppression logique
$pdo->prepare("UPDATE posts SET est_supprime = 1 WHERE id = ?")->execute([$postId]);

jsonResponse(true, 'Post supprimé.');
