<?php
// ============================================================
// api/friends/index.php — Liste des amis de l'utilisateur
// ============================================================
require_once '../config.php';
requireMethod('GET');

$currentUser = requireAuth();
$pdo         = getDB();

// Récupère tous les amis acceptés
$stmt = $pdo->prepare("
    SELECT
        u.id, u.nom, u.prenom, u.photo_profil, u.bio,
        f.id AS friendship_id, f.created_at AS ami_depuis
    FROM friendships f
    JOIN users u ON u.id = CASE
        WHEN f.demandeur_id = :uid THEN f.recepteur_id
        ELSE f.demandeur_id
    END
    WHERE (f.demandeur_id = :uid OR f.recepteur_id = :uid)
      AND f.statut = 'accepte'
    ORDER BY u.prenom ASC
");
$stmt->execute([':uid' => $currentUser['id']]);
$amis = $stmt->fetchAll();

// Demandes reçues en attente
$stmt = $pdo->prepare("
    SELECT f.id AS friendship_id, f.created_at,
           u.id, u.nom, u.prenom, u.photo_profil
    FROM friendships f
    JOIN users u ON u.id = f.demandeur_id
    WHERE f.recepteur_id = ? AND f.statut = 'en_attente'
    ORDER BY f.created_at DESC
");
$stmt->execute([$currentUser['id']]);
$demandes = $stmt->fetchAll();

// Demandes envoyées en attente
$stmt = $pdo->prepare("
    SELECT f.id AS friendship_id, f.created_at,
           u.id, u.nom, u.prenom, u.photo_profil
    FROM friendships f
    JOIN users u ON u.id = f.recepteur_id
    WHERE f.demandeur_id = ? AND f.statut = 'en_attente'
    ORDER BY f.created_at DESC
");
$stmt->execute([$currentUser['id']]);
$envoyees = $stmt->fetchAll();

jsonResponse(true, 'Liste récupérée.', [
    'amis'     => $amis,
    'demandes' => $demandes,
    'envoyees' => $envoyees,
]);
