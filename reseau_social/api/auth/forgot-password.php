<?php
// ============================================================
// api/auth/forgot-password.php — Mot de passe oublié
// ============================================================
require_once '../config.php';
requireMethod('POST');

$data  = json_decode(file_get_contents('php://input'), true);
$email = filter_var($data['email'] ?? '', FILTER_SANITIZE_EMAIL);

if (!$email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(false, 'Adresse email invalide.');
}

$pdo  = getDB();
$stmt = $pdo->prepare("SELECT id, prenom, nom FROM users WHERE email = ? AND est_actif = 1");
$stmt->execute([$email]);
$user = $stmt->fetch();

// On répond toujours "succès" pour ne pas révéler si l'email existe
if (!$user) {
    jsonResponse(true, 'Si cet email existe, un lien de réinitialisation a été envoyé.');
}

// Supprime les anciens tokens pour cet email
$pdo->prepare("DELETE FROM password_resets WHERE email = ?")->execute([$email]);

// Génère un nouveau token valable 1 heure
$token     = generateToken();
$expireAt  = date('Y-m-d H:i:s', time() + TOKEN_EXPIRY);

$stmt = $pdo->prepare("INSERT INTO password_resets (email, token, expire_at) VALUES (?, ?, ?)");
$stmt->execute([$email, $token, $expireAt]);

// Envoie l'email avec le lien de réinitialisation
$resetUrl  = SITE_URL . '/index.html?reset_token=' . $token;
$emailBody = getResetEmailTemplate($user['prenom'], $user['nom'], $resetUrl);

sendEmail($email, 'Réinitialisation de votre mot de passe — ' . SITE_NAME, $emailBody);

jsonResponse(true, 'Si cet email existe, un lien de réinitialisation a été envoyé.');

// ============================================================
// Template HTML de l'email de réinitialisation
// ============================================================
function getResetEmailTemplate(string $prenom, string $nom, string $url): string {
    return '<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Réinitialisation du mot de passe</title></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:40px 16px;">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <tr><td style="background:#1877f2;padding:30px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:28px;">🌐 ' . SITE_NAME . '</h1>
        </td></tr>
        <tr><td style="padding:40px 32px;">
          <h2 style="color:#1c1e21;margin:0 0 16px;">Réinitialisation du mot de passe</h2>
          <p style="color:#65676b;font-size:16px;line-height:1.6;margin:0 0 8px;">
            Bonjour <strong>' . $prenom . ' ' . $nom . '</strong>,
          </p>
          <p style="color:#65676b;font-size:16px;line-height:1.6;margin:0 0 24px;">
            Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous pour en créer un nouveau. Ce lien est valable <strong>1 heure</strong>.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="' . $url . '" style="background:#e74c3c;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;display:inline-block;">
              🔑 Réinitialiser mon mot de passe
            </a>
          </div>
          <p style="color:#65676b;font-size:13px;margin:24px 0 0;">
            Si vous n\'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe restera inchangé.
          </p>
        </td></tr>
        <tr><td style="background:#f0f2f5;padding:20px;text-align:center;">
          <p style="color:#8a8d91;font-size:12px;margin:0;">© ' . date('Y') . ' ' . SITE_NAME . ' — Tous droits réservés</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>';
}

function sendEmail(string $to, string $subject, string $body): bool {
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: " . MAIL_FROM_NAME . " <" . MAIL_FROM . ">\r\n";
    $headers .= "Reply-To: " . MAIL_FROM . "\r\n";
    return mail($to, $subject, $body, $headers);
}
