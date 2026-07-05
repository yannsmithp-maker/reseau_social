<?php
// ============================================================
// api/admin/dashboard.php — Statistiques du back-office
// ============================================================
require_once '../config.php';
requireMethod('GET');

requireAdmin(); // Seuls admin et modérateur peuvent accéder
$pdo = getDB();

// Statistiques générales
$stats = [
    'total_users'    => $pdo->query("SELECT COUNT(*) FROM users WHERE role = 'client'")->fetchColumn(),
    'total_posts'    => $pdo->query("SELECT COUNT(*) FROM posts WHERE est_supprime = 0")->fetchColumn(),
    'total_comments' => $pdo->query("SELECT COUNT(*) FROM comments WHERE est_supprime = 0")->fetchColumn(),
    'total_messages' => $pdo->query("SELECT COUNT(*) FROM messages")->fetchColumn(),
    'total_amis'     => $pdo->query("SELECT COUNT(*) FROM friendships WHERE statut = 'accepte'")->fetchColumn(),
    'nouveaux_users_7j' => $pdo->query("
        SELECT COUNT(*) FROM users
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ")->fetchColumn(),
    'nouveaux_posts_7j' => $pdo->query("
        SELECT COUNT(*) FROM posts
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND est_supprime = 0
    ")->fetchColumn(),
];

// Inscriptions par jour sur les 7 derniers jours
$stmt = $pdo->query("
    SELECT DATE(created_at) AS jour, COUNT(*) AS nb
    FROM users
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    GROUP BY DATE(created_at)
    ORDER BY jour ASC
");
$inscriptions = $stmt->fetchAll();

// Posts par jour sur les 7 derniers jours
$stmt = $pdo->query("
    SELECT DATE(created_at) AS jour, COUNT(*) AS nb
    FROM posts
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) AND est_supprime = 0
    GROUP BY DATE(created_at)
    ORDER BY jour ASC
");
$posts_stats = $stmt->fetchAll();

// Top 5 des utilisateurs les plus actifs
$stmt = $pdo->query("
    SELECT u.id, u.nom, u.prenom, u.photo_profil, u.email,
           COUNT(p.id) AS nb_posts
    FROM users u
    LEFT JOIN posts p ON p.user_id = u.id AND p.est_supprime = 0
    WHERE u.role = 'client'
    GROUP BY u.id
    ORDER BY nb_posts DESC
    LIMIT 5
");
$top_users = $stmt->fetchAll();

jsonResponse(true, 'Statistiques récupérées.', [
    'stats'         => $stats,
    'inscriptions'  => $inscriptions,
    'posts_stats'   => $posts_stats,
    'top_users'     => $top_users,
]);
