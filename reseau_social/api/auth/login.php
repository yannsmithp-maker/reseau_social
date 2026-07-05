<?php
// ============================================================
// api/auth/login.php — Connexion utilisateur
// ============================================================
require_once '../config.php';
requireMethod('POST');

$data  = json_decode(file_get_contents('php://input'), true);
$email = filter_var($data['email'] ?? '', FILTER_SANITIZE_EMAIL);
$mdp   = $data['mot_de_passe'] ?? '';

if (!$email || !$mdp) {
    jsonResponse(false, 'Email et mot de passe obligatoires.');
}

$pdo  = getDB();
$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? AND est_actif = 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

// Vérifie l'existence et le mot de passe
if (!$user || !password_verify($mdp, $user['mot_de_passe'])) {
    jsonResponse(false, 'Email ou mot de passe incorrect.');
}

// Vérifie que l'email est confirmé
if (!$user['est_verifie']) {
    jsonResponse(false, 'Veuillez confirmer votre email avant de vous connecter.');
}

// Génère un token de session et le sauvegarde en BDD
$token = generateToken();
$stmt  = $pdo->prepare("UPDATE users SET token_verification = ? WHERE id = ?");
$stmt->execute([$token, $user['id']]);

// Retourne les infos publiques + le token
jsonResponse(true, 'Connexion réussie.', [
    'token' => $token,
    'user'  => [
        'id'           => $user['id'],
        'nom'          => $user['nom'],
        'prenom'       => $user['prenom'],
        'email'        => $user['email'],
        'photo_profil' => $user['photo_profil'],
        'role'         => $user['role'],
        'bio'          => $user['bio'],
    ]
]);
