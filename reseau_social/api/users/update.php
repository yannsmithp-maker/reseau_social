<?php
// ============================================================
// api/users/update.php — Met à jour le profil utilisateur
// ============================================================
require_once '../config.php';
requireMethod('POST');

$currentUser = requireAuth();
$pdo         = getDB();

// Détermine si c'est une mise à jour de photo ou d'infos
$type = $_POST['type'] ?? 'infos';

if ($type === 'photo') {
    // --- Mise à jour de la photo de profil ---
    if (empty($_FILES['photo']['name'])) {
        jsonResponse(false, 'Aucune photo fournie.');
    }

    $filename = uploadImage($_FILES['photo'], 'avatar');
    if (!$filename) {
        jsonResponse(false, 'Image invalide. Formats acceptés : JPG, PNG, GIF, WEBP. Max 5 Mo.');
    }

    // Supprime l'ancienne photo si ce n'est pas la photo par défaut
    $stmt = $pdo->prepare("SELECT photo_profil FROM users WHERE id = ?");
    $stmt->execute([$currentUser['id']]);
    $old = $stmt->fetchColumn();
    if ($old && $old !== 'default.png' && file_exists(UPLOAD_DIR . $old)) {
        unlink(UPLOAD_DIR . $old);
    }

    $pdo->prepare("UPDATE users SET photo_profil = ? WHERE id = ?")->execute([$filename, $currentUser['id']]);

    jsonResponse(true, 'Photo de profil mise à jour.', ['photo_profil' => $filename]);

} elseif ($type === 'mot_de_passe') {
    // --- Changement de mot de passe ---
    $data       = json_decode(file_get_contents('php://input'), true);
    $ancien     = $data['ancien_mdp']           ?? '';
    $nouveau    = $data['nouveau_mdp']           ?? '';
    $confirm    = $data['nouveau_mdp_confirm']   ?? '';

    if (!$ancien || !$nouveau || !$confirm) {
        jsonResponse(false, 'Tous les champs sont obligatoires.');
    }
    if (strlen($nouveau) < 8) {
        jsonResponse(false, 'Le nouveau mot de passe doit contenir au moins 8 caractères.');
    }
    if ($nouveau !== $confirm) {
        jsonResponse(false, 'Les mots de passe ne correspondent pas.');
    }

    // Vérifie l'ancien mot de passe
    $stmt = $pdo->prepare("SELECT mot_de_passe FROM users WHERE id = ?");
    $stmt->execute([$currentUser['id']]);
    $hash = $stmt->fetchColumn();

    if (!password_verify($ancien, $hash)) {
        jsonResponse(false, 'Ancien mot de passe incorrect.');
    }

    $pdo->prepare("UPDATE users SET mot_de_passe = ? WHERE id = ?")
        ->execute([password_hash($nouveau, PASSWORD_BCRYPT), $currentUser['id']]);

    jsonResponse(true, 'Mot de passe mis à jour avec succès.');

} else {
    // --- Mise à jour des informations générales ---
    $data = json_decode(file_get_contents('php://input'), true);

    $nom            = sanitize($data['nom']            ?? '');
    $prenom         = sanitize($data['prenom']         ?? '');
    $bio            = sanitize($data['bio']            ?? '');
    $telephone      = sanitize($data['telephone']      ?? '');
    $date_naissance = $data['date_naissance']          ?? null;

    if (!$nom || !$prenom) {
        jsonResponse(false, 'Nom et prénom obligatoires.');
    }

    // Validation de la date
    if ($date_naissance && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date_naissance)) {
        $date_naissance = null;
    }

    $pdo->prepare("
        UPDATE users
        SET nom = ?, prenom = ?, bio = ?, telephone = ?, date_naissance = ?
        WHERE id = ?
    ")->execute([$nom, $prenom, $bio, $telephone, $date_naissance, $currentUser['id']]);

    // Retourne les nouvelles infos pour mettre à jour la session
    $stmt = $pdo->prepare("SELECT id, nom, prenom, email, photo_profil, bio, role FROM users WHERE id = ?");
    $stmt->execute([$currentUser['id']]);
    $updatedUser = $stmt->fetch();

    jsonResponse(true, 'Profil mis à jour.', ['user' => $updatedUser]);
}
