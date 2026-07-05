<?php
// ============================================================
// api/admin/posts.php — Gestion des posts (admin/modérateur)
// ============================================================
require_once '../config.php';

requireAdmin();
$pdo    = getDB();
$method = $_SERVER['REQUEST_METHOD'];

// GET — Liste de tous les posts
if ($method === 'GET') {
    $page   = max(1, intval($_GET['page'] ?? 1));
    $limit  = 20;
    $offset = ($page - 1) * $limit;

    $stmt = $pdo->prepare("
        SELECT p.id, p.contenu, p.image, p.est_supprime, p.created_at,
               u.id AS user_id, u.nom, u.prenom, u.email,
               (SELECT COUNT(*) FROM likes    WHERE post_id = p.id AND type = 'like') AS nb_likes,
               (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND est_supprime = 0) AS nb_comments
        FROM posts p
        JOIN users u ON u.id = p.user_id
        ORDER BY p.created_at DESC
        LIMIT :limit OFFSET :offset
    ");
    $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $posts = $stmt->fetchAll();

    $total = $pdo->query("SELECT COUNT(*) FROM posts")->fetchColumn();

    jsonResponse(true, 'Posts récupérés.', [
        'posts'    => $posts,
        'total'    => (int)$total,
        'has_more' => ($offset + $limit) < $total,
    ]);
}

// POST — Suppression ou restauration d'un post
elseif ($method === 'POST') {
    $data   = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';
    $postId = intval($data['post_id'] ?? 0);

    if (!$postId) jsonResponse(false, 'ID post manquant.');

    switch ($action) {
        case 'supprimer':
            $pdo->prepare("UPDATE posts SET est_supprime = 1 WHERE id = ?")->execute([$postId]);
            jsonResponse(true, 'Post supprimé.');

        case 'restaurer':
            $pdo->prepare("UPDATE posts SET est_supprime = 0 WHERE id = ?")->execute([$postId]);
            jsonResponse(true, 'Post restauré.');

        default:
            jsonResponse(false, 'Action invalide.');
    }
} else {
    http_response_code(405);
    jsonResponse(false, 'Méthode non autorisée.');
}
