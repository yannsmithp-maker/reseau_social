<?php
// ============================================================
// api/users/search.php — Recherche d'utilisateurs
// ============================================================
require_once '../config.php';
requireMethod('GET');

$currentUser = requireAuth();
$q           = sanitize($_GET['q'] ?? '');

if (strlen($q) < 2) {
    jsonResponse(false, 'Recherche trop courte.');
}

$pdo  = getDB();
$like = '%' . $q . '%';

$stmt = $pdo->prepare("
    SELECT
        u.id, u.nom, u.prenom, u.photo_profil, u.bio,
        -- Relation avec l'utilisateur courant
        f.id AS friendship_id,
        CASE
            WHEN f.statut = 'accepte' THEN 'accepte'
            WHEN f.statut = 'en_attente' AND f.demandeur_id = :uid THEN 'en_attente_envoyee'
            WHEN f.statut = 'en_attente' AND f.recepteur_id = :uid THEN 'en_attente_recue'
            ELSE 'aucune'
        END AS relation
    FROM users u
    LEFT JOIN friendships f
        ON (f.demandeur_id = :uid AND f.recepteur_id = u.id)
        OR (f.recepteur_id = :uid AND f.demandeur_id = u.id)
    WHERE u.id != :uid
      AND u.est_actif = 1
      AND u.role = 'client'
      AND (u.nom LIKE :like OR u.prenom LIKE :like OR u.email LIKE :like)
    LIMIT 20
");
$stmt->execute([':uid' => $currentUser['id'], ':like' => $like]);
$users = $stmt->fetchAll();

jsonResponse(true, 'Résultats trouvés.', ['users' => $users]);
