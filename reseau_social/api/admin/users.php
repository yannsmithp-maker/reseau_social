<?php
// ============================================================
// api/admin/users.php — Gestion des utilisateurs (admin)
// ============================================================
require_once '../config.php';

$currentUser = requireAdmin();
$pdo         = getDB();
$method      = $_SERVER['REQUEST_METHOD'];

// GET — Liste des utilisateurs
if ($method === 'GET') {
    $page   = max(1, intval($_GET['page'] ?? 1));
    $limit  = 20;
    $offset = ($page - 1) * $limit;
    $search = sanitize($_GET['q'] ?? '');

    $where = $search ? "WHERE (u.nom LIKE :like OR u.prenom LIKE :like OR u.email LIKE :like)" : "";
    $like  = '%' . $search . '%';

    $stmt = $pdo->prepare("
        SELECT u.id, u.nom, u.prenom, u.email, u.role,
               u.est_actif, u.est_verifie, u.photo_profil, u.created_at,
               (SELECT COUNT(*) FROM posts WHERE user_id = u.id AND est_supprime = 0) AS nb_posts
        FROM users u
        $where
        ORDER BY u.created_at DESC
        LIMIT :limit OFFSET :offset
    ");

    if ($search) {
        $stmt->bindValue(':like', $like);
    }
    $stmt->bindValue(':limit',  $limit,  PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $users = $stmt->fetchAll();

    $countStmt = $pdo->prepare("SELECT COUNT(*) FROM users u $where");
    if ($search) $countStmt->bindValue(':like', $like);
    $countStmt->execute();
    $total = $countStmt->fetchColumn();

    jsonResponse(true, 'Utilisateurs récupérés.', [
        'users'    => $users,
        'total'    => (int)$total,
        'has_more' => ($offset + $limit) < $total,
    ]);
}

// POST — Actions sur un utilisateur
elseif ($method === 'POST') {
    $data   = json_decode(file_get_contents('php://input'), true);
    $action = $data['action'] ?? '';
    $userId = intval($data['user_id'] ?? 0);

    if (!$userId) jsonResponse(false, 'ID utilisateur manquant.');

    // Empêche un modérateur de toucher aux admins
    $stmt = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $stmt->execute([$userId]);
    $target = $stmt->fetch();

    if (!$target) jsonResponse(false, 'Utilisateur introuvable.');

    if ($currentUser['role'] === 'moderateur' && $target['role'] !== 'client') {
        jsonResponse(false, 'Un modérateur ne peut agir que sur les clients.');
    }

    switch ($action) {
        case 'activer':
            $pdo->prepare("UPDATE users SET est_actif = 1 WHERE id = ?")->execute([$userId]);
            jsonResponse(true, 'Utilisateur activé.');

        case 'desactiver':
            if ($userId === $currentUser['id']) jsonResponse(false, 'Vous ne pouvez pas vous désactiver.');
            $pdo->prepare("UPDATE users SET est_actif = 0 WHERE id = ?")->execute([$userId]);
            jsonResponse(true, 'Utilisateur désactivé.');

        case 'supprimer':
            if ($userId === $currentUser['id']) jsonResponse(false, 'Vous ne pouvez pas vous supprimer.');
            $pdo->prepare("DELETE FROM users WHERE id = ?")->execute([$userId]);
            jsonResponse(true, 'Utilisateur supprimé.');

        case 'changer_role':
            // Seul l'admin peut changer les rôles
            if ($currentUser['role'] !== 'administrateur') {
                jsonResponse(false, 'Action réservée aux administrateurs.');
            }
            $newRole = $data['role'] ?? '';
            if (!in_array($newRole, ['client', 'moderateur', 'administrateur'])) {
                jsonResponse(false, 'Rôle invalide.');
            }
            if ($userId === $currentUser['id']) jsonResponse(false, 'Vous ne pouvez pas changer votre propre rôle.');
            $pdo->prepare("UPDATE users SET role = ? WHERE id = ?")->execute([$newRole, $userId]);
            jsonResponse(true, 'Rôle mis à jour.');

        default:
            jsonResponse(false, 'Action invalide.');
    }
} else {
    http_response_code(405);
    jsonResponse(false, 'Méthode non autorisée.');
}
