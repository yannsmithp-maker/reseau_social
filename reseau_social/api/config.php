<?php
// ============================================================
// CONFIGURATION GÉNÉRALE DU PROJET
// Réseau Social PHP/AJAX
// ============================================================

// --- Configuration de la base de données ---
define('DB_HOST', 'localhost');
define('DB_NAME', 'reseau_social');
define('DB_USER', 'root');         // À modifier selon votre environnement
define('DB_PASS', '');             // À modifier selon votre environnement
define('DB_CHARSET', 'utf8mb4');

// --- Configuration générale du site ---
define('SITE_NAME', 'MonRéseau');
define('SITE_URL', 'http://localhost/reseau_social'); // À modifier en production
define('SITE_EMAIL', 'noreply@monreseau.com');

// --- Configuration des uploads ---
define('UPLOAD_DIR', __DIR__ . '/../assets/images/uploads/');
define('UPLOAD_URL', SITE_URL . '/assets/images/uploads/');
define('MAX_FILE_SIZE', 5 * 1024 * 1024); // 5 MB
define('ALLOWED_TYPES', ['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

// --- Configuration des emails (PHPMailer ou mail() natif) ---
define('MAIL_HOST', 'smtp.gmail.com');
define('MAIL_PORT', 587);
define('MAIL_USERNAME', 'votre_email@gmail.com'); // À modifier
define('MAIL_PASSWORD', 'votre_mot_de_passe');    // À modifier
define('MAIL_FROM', 'noreply@monreseau.com');
define('MAIL_FROM_NAME', 'MonRéseau');

// --- Durée de vie des tokens ---
define('TOKEN_EXPIRY', 3600); // 1 heure en secondes

// --- Mode debug (mettre false en production) ---
define('DEBUG_MODE', true);

// ============================================================
// CONNEXION À LA BASE DE DONNÉES (PDO)
// ============================================================
function getDB(): PDO {
    static $pdo = null;

    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,  // Lance des exceptions en cas d'erreur
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,        // Retourne des tableaux associatifs
                PDO::ATTR_EMULATE_PREPARES   => false,                   // Requêtes préparées natives
            ];
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            if (DEBUG_MODE) {
                die(json_encode([
                    'success' => false,
                    'message' => 'Erreur de connexion : ' . $e->getMessage()
                ]));
            } else {
                die(json_encode([
                    'success' => false,
                    'message' => 'Erreur interne du serveur.'
                ]));
            }
        }
    }

    return $pdo;
}

// ============================================================
// FONCTIONS UTILITAIRES GLOBALES
// ============================================================

/**
 * Retourne une réponse JSON et stoppe l'exécution
 */
function jsonResponse(bool $success, string $message, array $data = []): void {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => $success,
        'message' => $message,
        'data'    => $data
    ]);
    exit;
}

/**
 * Vérifie que la méthode HTTP est bien celle attendue
 */
function requireMethod(string $method): void {
    if ($_SERVER['REQUEST_METHOD'] !== strtoupper($method)) {
        http_response_code(405);
        jsonResponse(false, 'Méthode HTTP non autorisée.');
    }
}

/**
 * Vérifie que l'utilisateur est connecté via sessionStorage (token JWT ou session PHP)
 * Le token est envoyé dans le header Authorization: Bearer <token>
 */
function requireAuth(): array {
    $headers = getallheaders();
    $token = $headers['Authorization'] ?? '';

    if (empty($token)) {
        http_response_code(401);
        jsonResponse(false, 'Non authentifié. Veuillez vous connecter.');
    }

    // Nettoie le préfixe "Bearer "
    $token = str_replace('Bearer ', '', $token);

    // Vérifie le token en base de données
    $pdo = getDB();
    $stmt = $pdo->prepare("SELECT * FROM users WHERE token_verification = ? AND est_actif = 1");
    $stmt->execute([$token]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(401);
        jsonResponse(false, 'Token invalide ou expiré.');
    }

    return $user;
}

/**
 * Vérifie que l'utilisateur connecté est admin ou modérateur
 */
function requireAdmin(): array {
    $user = requireAuth();
    if (!in_array($user['role'], ['administrateur', 'moderateur'])) {
        http_response_code(403);
        jsonResponse(false, 'Accès refusé. Droits insuffisants.');
    }
    return $user;
}

/**
 * Vérifie que l'utilisateur connecté est administrateur uniquement
 */
function requireSuperAdmin(): array {
    $user = requireAuth();
    if ($user['role'] !== 'administrateur') {
        http_response_code(403);
        jsonResponse(false, 'Accès refusé. Réservé aux administrateurs.');
    }
    return $user;
}

/**
 * Nettoie et sécurise une chaîne de caractères
 */
function sanitize(string $input): string {
    return htmlspecialchars(strip_tags(trim($input)), ENT_QUOTES, 'UTF-8');
}

/**
 * Génère un token unique sécurisé
 */
function generateToken(): string {
    return bin2hex(random_bytes(32));
}

/**
 * Gère l'upload d'une image et retourne le nom du fichier
 */
function uploadImage(array $file, string $prefix = 'img'): string|false {
    // Vérifie qu'il n'y a pas d'erreur
    if ($file['error'] !== UPLOAD_ERR_OK) {
        return false;
    }

    // Vérifie la taille
    if ($file['size'] > MAX_FILE_SIZE) {
        return false;
    }

    // Vérifie le type MIME réel
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mimeType, ALLOWED_TYPES)) {
        return false;
    }

    // Génère un nom unique
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = $prefix . '_' . uniqid() . '.' . strtolower($extension);

    // Crée le dossier si nécessaire
    if (!is_dir(UPLOAD_DIR)) {
        mkdir(UPLOAD_DIR, 0755, true);
    }

    // Déplace le fichier
    if (move_uploaded_file($file['tmp_name'], UPLOAD_DIR . $filename)) {
        return $filename;
    }

    return false;
}

// ============================================================
// EN-TÊTES CORS (pour les requêtes AJAX)
// ============================================================
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Gère les requêtes OPTIONS (preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
