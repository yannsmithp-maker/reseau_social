<?php
// ============================================================
// api/auth/register.php — Inscription d'un nouvel utilisateur
// ============================================================
require_once '../config.php';
requireMethod('POST');

// Récupère les données JSON envoyées par le client
$data = json_decode(file_get_contents('php://input'), true);

// --- Validation des champs obligatoires ---
$nom    = sanitize($data['nom'] ?? '');
$prenom = sanitize($data['prenom'] ?? '');
$email  = filter_var($data['email'] ?? '', FILTER_SANITIZE_EMAIL);
$mdp    = $data['mot_de_passe'] ?? '';
$mdp2   = $data['mot_de_passe_confirm'] ?? '';

if (!$nom || !$prenom || !$email || !$mdp || !$mdp2) {
    jsonResponse(false, 'Tous les champs sont obligatoires.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, 'Adresse email invalide.');
}
if (strlen($mdp) < 8) {
    jsonResponse(false, 'Le mot de passe doit contenir au moins 8 caractères.');
}
if ($mdp !== $mdp2) {
    jsonResponse(false, 'Les mots de passe ne correspondent pas.');
}

$pdo = getDB();

// Vérifie que l'email n'est pas déjà utilisé
$stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
$stmt->execute([$email]);
if ($stmt->fetch()) {
    jsonResponse(false, 'Cette adresse email est déjà utilisée.');
}

// Hash du mot de passe et génération du token de vérification
$hash  = password_hash($mdp, PASSWORD_BCRYPT);
$token = generateToken();

// Insertion en base
$stmt = $pdo->prepare("
    INSERT INTO users (nom, prenom, email, mot_de_passe, token_verification, est_verifie)
    VALUES (?, ?, ?, ?, ?, 0)
");
$stmt->execute([$nom, $prenom, $email, $hash, $token]);
$userId = $pdo->lastInsertId();

// Envoi de l'email de vérification
$verifyUrl = SITE_URL . '/api/auth/verify.php?token=' . $token;
$emailBody = getVerificationEmailTemplate($prenom, $nom, $verifyUrl);
sendEmail($email, 'Confirmez votre inscription sur ' . SITE_NAME, $emailBody);

jsonResponse(true, 'Inscription réussie ! Vérifiez votre email pour activer votre compte.', [
    'user_id' => $userId
]);

// ============================================================
// Template HTML de l'email de vérification
// ============================================================
function getVerificationEmailTemplate(string $prenom, string $nom, string $url): string {
    return '<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Confirmez votre inscription</title></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr><td style="background:#1877f2;padding:30px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:28px;">🌐 ' . SITE_NAME . '</h1>
        </td></tr>
        <!-- Corps -->
        <tr><td style="padding:40px 32px;">
          <h2 style="color:#1c1e21;margin:0 0 16px;">Bienvenue, ' . $prenom . ' ' . $nom . ' !</h2>
          <p style="color:#65676b;font-size:16px;line-height:1.6;margin:0 0 24px;">
            Merci de vous être inscrit sur <strong>' . SITE_NAME . '</strong>. Pour activer votre compte, cliquez sur le bouton ci-dessous.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="' . $url . '" style="background:#1877f2;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
              ✅ Confirmer mon email
            </a>
          </div>
          <p style="color:#65676b;font-size:13px;margin:24px 0 0;">
            Ce lien expire dans 24 heures. Si vous n\'avez pas créé de compte, ignorez cet email.
          </p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f0f2f5;padding:20px;text-align:center;">
          <p style="color:#8a8d91;font-size:12px;margin:0;">© ' . date('Y') . ' ' . SITE_NAME . ' — Tous droits réservés</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>';
}

// ============================================================
// Fonction d'envoi d'email (mail() natif PHP)
// ============================================================
function sendEmail(string $to, string $subject, string $body): bool {
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: " . MAIL_FROM_NAME . " <" . MAIL_FROM . ">\r\n";
    $headers .= "Reply-To: " . MAIL_FROM . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();
    return mail($to, $subject, $body, $headers);
}
