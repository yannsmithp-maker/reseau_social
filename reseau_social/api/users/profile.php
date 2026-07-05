<?php
// ============================================================
// api/users/profile.php — Récupère le profil d'un utilisateur
// ============================================================
require_once '../config.php';
requireMethod('GET');

$currentUser = requireAuth();
$pdo         = getDB();

// Si pas d'ID fourni, on retourne le profil de l'utilisateur connecté
$userId = intval($_GET['id'] ?? $currentUser['id']);

$stmt = $pdo->prepare("
    SELECT
        u.id, u.nom, u.prenom, u.email, u.photo_profil,
        u.bio, u.date_naissance, u.telephone, u.created_at,
        -- Nombre d'amis
        (SELECT COUNT(*) FROM friendships
         WHERE (demandeur_id = u.id OR recepteur_id = u.id)
           AND statut = 'accepte') AS nb_amis,
        -- Nombre de posts
        (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND est_supprime = 0) AS nb_posts,
        -- Relation avec l'utilisateur courant
        (SELECT statut FROM friendships
         WHERE (demandeur_id = :uid AND recepteur_id = u.id)
            OR (recepteur_id = :uid AND demandeur_id = u.id)
         LIMIT 1) AS relation,
        (SELECT id FROM friendships
         WHERE (demandeur_id = :uid AND recepteur_id = u.id)
            OR (recepteur_id = :uid AND demandeur_id = u.id)
         LIMIT 1) AS friendship_id,
        (SELECT demandeur_id FROM friendships
         WHERE (demandeur_id = :uid AND recepteur_id = u.id)
            OR (recepteur_id = :uid AND demandeur_id = u.id)
         LIMIT 1) AS demandeur_id
    FROM users u
    WHERE u.id = :userId AND u.est_actif = 1
");
$stmt->execute([':uid' => $currentUser['id'], ':userId' => $userId]);
$user = $stmt->fetch();

if (!$user) {
    jsonResponse(false, 'Utilisateur introuvable.');
}

// Récupère les posts de cet utilisateur
$stmt = $pdo->prepare("
    SELECT
        p.id, p.contenu, p.image, p.created_at,
        u.id AS user_id, u.nom, u.prenom, u.photo_profil,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND type = 'like')    AS nb_likes,
        (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND type = 'dislike') AS nb_dislikes,
        (SELECT COUNT(*) FROM comments WHERE post_id = p.id AND est_supprime = 0) AS nb_comments,
        (SELECT type FROM likes WHERE post_id = p.id AND user_id = :uid)       AS ma_reaction
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.user_id = :userId AND p.est_supprime = 0
    ORDER BY p.created_at DESC
    LIMIT 20
");
$stmt->execute([':uid' => $currentUser['id'], ':userId' => $userId]);
$posts = $stmt->fetchAll();

// Cache l'email si ce n'est pas le profil de l'utilisateur connecté
if ($userId !== $currentUser['id']) {
    unset($user['email']);
    unset($user['telephone']);
}

jsonResponse(true, 'Profil récupéré.', [
    'user'  => $user,
    'posts' => $posts,
]);
