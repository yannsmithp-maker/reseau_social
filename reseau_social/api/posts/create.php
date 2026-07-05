<?php
// ============================================================
// api/posts/create.php — Crée un nouveau post
// ============================================================
require_once '../config.php';
requireMethod('POST');

$currentUser = requireAuth();

// Récupère le contenu texte (multipart/form-data car il peut y avoir une image)
$contenu = sanitize($_POST['contenu'] ?? '');

if (!$contenu && empty($_FILES['image'])) {
    jsonResponse(false, 'Le post doit contenir du texte ou une image.');
}
if (strlen($contenu) > 5000) {
    jsonResponse(false, 'Le contenu est trop long (max 5000 caractères).');
}

// Gestion de l'image optionnelle
$imageFilename = null;
if (!empty($_FILES['image']['name'])) {
    $imageFilename = uploadImage($_FILES['image'], 'post');
    if (!$imageFilename) {
        jsonResponse(false, 'Image invalide. Formats acceptés : JPG, PNG, GIF, WEBP. Max 5 Mo.');
    }
}

$pdo  = getDB();
$stmt = $pdo->prepare("INSERT INTO posts (user_id, contenu, image) VALUES (?, ?, ?)");
$stmt->execute([$currentUser['id'], $contenu, $imageFilename]);
$postId = $pdo->lastInsertId();

// Retourne le post complet pour l'affichage immédiat
$stmt = $pdo->prepare("
    SELECT p.*, u.nom, u.prenom, u.photo_profil,
           0 AS nb_likes, 0 AS nb_dislikes, 0 AS nb_comments, NULL AS ma_reaction
    FROM posts p
    JOIN users u ON u.id = p.user_id
    WHERE p.id = ?
");
$stmt->execute([$postId]);
$post = $stmt->fetch();

jsonResponse(true, 'Post publié avec succès.', ['post' => $post]);
