<?php
// ============================================================
// api/comments/index.php — Récupère les commentaires d'un post
// ============================================================
require_once '../config.php';
requireMethod('GET');

$currentUser = requireAuth();
$postId      = intval($_GET['post_id'] ?? 0);

if (!$postId) {
    jsonResponse(false, 'ID du post manquant.');
}

$pdo  = getDB();
$stmt = $pdo->prepare("
    SELECT
        c.id, c.contenu, c.created_at,
        u.id AS user_id, u.nom, u.prenom, u.photo_profil
    FROM comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.post_id = ? AND c.est_supprime = 0
    ORDER BY c.created_at ASC
");
$stmt->execute([$postId]);
$comments = $stmt->fetchAll();

jsonResponse(true, 'Commentaires récupérés.', ['comments' => $comments]);
