<?php
// ============================================================
// api/auth/reset-password.php — Réinitialisation du mot de passe
// ============================================================
require_once '../config.php';
requireMethod('POST');

$data  = json_decode(file_get_contents('php://input'), true);
$token = sanitize($data['token'] ?? '');
$mdp   = $data['mot_de_passe'] ?? '';
$mdp2  = $data['mot_de_passe_confirm'] ?? '';

if (!$token || !$mdp || !$mdp2) {
    jsonResponse(false, 'Tous les champs sont obligatoires.');
}
if (strlen($mdp) < 8) {
    jsonResponse(false, 'Le mot de passe doit contenir au moins 8 caractères.');
}
if ($mdp !== $mdp2) {
    jsonResponse(false, 'Les mots de passe ne correspondent pas.');
}

$pdo  = getDB();

// Vérifie le token : existe, non utilisé, non expiré
$stmt = $pdo->prepare("
    SELECT * FROM password_resets
    WHERE token = ? AND utilise = 0 AND expire_at > NOW()
");
$stmt->execute([$token]);
$reset = $stmt->fetch();

if (!$reset) {
    jsonResponse(false, 'Ce lien est invalide ou a expiré. Veuillez refaire une demande.');
}

// Met à jour le mot de passe
$hash = password_hash($mdp, PASSWORD_BCRYPT);
$stmt = $pdo->prepare("UPDATE users SET mot_de_passe = ? WHERE email = ?");
$stmt->execute([$hash, $reset['email']]);

// Marque le token comme utilisé
$pdo->prepare("UPDATE password_resets SET utilise = 1 WHERE token = ?")->execute([$token]);

jsonResponse(true, 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.');
