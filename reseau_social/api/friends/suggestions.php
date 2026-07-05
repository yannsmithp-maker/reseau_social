<?php
// ============================================================
// api/friends/suggestions.php — Suggestions d'amis
// ============================================================
require_once '../config.php';
requireMethod('GET');

$currentUser = requireAuth();
$pdo         = getDB();

// Retourne des utilisateurs qui ne sont pas encore amis
// et avec qui il n'y a pas de demande en cours
$stmt = $pdo->prepare("
    SELECT u.id, u.nom, u.prenom, u.photo_profil
    FROM users u
    WHERE u.id != :uid
      AND u.est_actif = 1
      AND u.role = 'client'
      AND u.id NOT IN (
          SELECT CASE WHEN demandeur_id = :uid THEN recepteur_id ELSE demandeur_id END
          FROM friendships
          WHERE (demandeur_id = :uid OR recepteur_id = :uid)
            AND statut IN ('accepte', 'en_attente')
      )
    ORDER BY RAND()
    LIMIT 5
");
$stmt->execute([':uid' => $currentUser['id']]);
$users = $stmt->fetchAll();

jsonResponse(true, 'Suggestions récupérées.', ['users' => $users]);
