<?php
// ============================================================
// api/posts/index.php — Récupère tous les posts du flux
// ============================================================
require_once '../config.php';
requireMethod('GET');

$currentUser = requireAuth();
$pdo         = getDB();

// Pagination
$page  = max(1, intval($_GET['page'] ?? 1));
$limit = 10;
$offset = ($page - 1) * $limit;

// Récupère les posts avec infos auteur + nombre de likes/dislikes/commentaires
// + réaction de l'utilisateur courant
$stmt = $pdo->prepare("
    SELECT
        p.id, p.contenu, p.image, p.created_at,
        u.id AS user_id, u.nom, u.prenom, u.photo_profil,
        -- Nombre de likes
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND type = 'like') AS nb_likes,
        -- Nombre de dislikes
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND type = 'dislike') AS nb_dislikes,
        -- Nombre de commentaires
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND est_supprime = 0) AS nb_comments,
        -- Réaction de l'utilisateur courant (like / dislike / null)
        (SELECT type FROM likes WHERE post_id = p.id AND user_id = :uid) AS ma_reaction
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.est_supprime = 0
    ORDER BY p.created_at DESC
    LIMIT :limit OFFSET :offset
");
$stmt->bindValue(':uid',    $currentUser['id'], PDO::PARAM_INT);
$stmt->bindValue(':limit',  $limit,             PDO::PARAM_INT);
$stmt->bindValue(':offset', $offset,            PDO::PARAM_INT);
$stmt->execute();
$posts = $stmt->fetchAll();

// Compte total pour la pagination
$total = $pdo->query("SELECT COUNT(*) FROM posts WHERE est_supprime = 0")->fetchColumn();

jsonResponse(true, 'Posts récupérés.', [
    'posts'      => $posts,
    'page'       => $page,
    'total'      => (int)$total,
    'has_more'   => ($offset + $limit) < $total
]);
