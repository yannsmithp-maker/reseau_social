<?php
// ============================================================
// api/comments/delete.php — Supprime un commentaire
// ============================================================
require_once '../config.php';
requireMethod('POST');

$currentUser = requireAuth();
$data        = json_decode(file_get_contents('php://input'), true);
$commentId   = intval($data['comment_id'] ?? 0);

if (!$commentId) {
    jsonResponse(false, 'ID du commentaire manquant.');
}

$pdo  = getDB();
$stmt = $pdo->prepare("SELECT user_id FROM comments WHERE id = ? AND est_supprime = 0");
$stmt->execute([$commentId]);
$comment = $stmt->fetch();

if (!$comment) {
    jsonResponse(false, 'Commentaire introuvable.');
}

$isOwner = $comment['user_id'] === $currentUser['id'];
$isAdmin = in_array($currentUser['role'], ['administrateur', 'moderateur']);

if (!$isOwner && !$isAdmin) {
    http_response_code(403);
    jsonResponse(false, 'Action non autorisée.');
}

$pdo->prepare("UPDATE comments SET est_supprime = 1 WHERE id = ?")->execute([$commentId]);

jsonResponse(true, 'Commentaire supprimé.');
