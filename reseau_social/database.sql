-- ============================================================
-- RÉSEAU SOCIAL - Script de création de la base de données
-- ============================================================
-- Auteur : Généré automatiquement
-- Date : 2026-06-23
-- Description : Script complet pour le réseau social PHP/AJAX
-- ============================================================

CREATE DATABASE IF NOT EXISTS reseau_social CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE reseau_social;

-- ============================================================
-- TABLE : users
-- Contient tous les utilisateurs (clients, modérateurs, admins)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    email VARCHAR(191) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(255) NOT NULL,          -- Hashé avec password_hash()
    photo_profil VARCHAR(255) DEFAULT 'default.png',
    bio TEXT DEFAULT NULL,
    role ENUM('client', 'moderateur', 'administrateur') DEFAULT 'client',
    est_verifie TINYINT(1) DEFAULT 0,            -- 1 = email vérifié
    token_verification VARCHAR(255) DEFAULT NULL, -- Token pour vérification email
    est_actif TINYINT(1) DEFAULT 1,              -- 1 = compte actif
    date_naissance DATE DEFAULT NULL,
    telephone VARCHAR(20) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE : password_resets
-- Tokens pour la réinitialisation des mots de passe
-- ============================================================
CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expire_at TIMESTAMP NOT NULL,               -- Expire après 1h
    utilise TINYINT(1) DEFAULT 0,               -- 1 = déjà utilisé
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE : posts
-- Articles/publications du flux principal
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    contenu TEXT NOT NULL,
    image VARCHAR(255) DEFAULT NULL,            -- Image optionnelle du post
    est_supprime TINYINT(1) DEFAULT 0,          -- Suppression logique
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE : likes
-- Likes et dislikes sur les posts
-- ============================================================
CREATE TABLE IF NOT EXISTS likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    type ENUM('like', 'dislike') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_like (post_id, user_id),  -- Un seul vote par user/post
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE : comments
-- Commentaires sur les posts
-- ============================================================
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id INT NOT NULL,
    user_id INT NOT NULL,
    contenu TEXT NOT NULL,
    est_supprime TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_post_id (post_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE : friendships
-- Gestion des relations d'amitié entre utilisateurs
-- ============================================================
CREATE TABLE IF NOT EXISTS friendships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    demandeur_id INT NOT NULL,                  -- Celui qui envoie la demande
    recepteur_id INT NOT NULL,                  -- Celui qui reçoit la demande
    statut ENUM('en_attente', 'accepte', 'refuse', 'bloque') DEFAULT 'en_attente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_friendship (demandeur_id, recepteur_id),
    FOREIGN KEY (demandeur_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recepteur_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_demandeur (demandeur_id),
    INDEX idx_recepteur (recepteur_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE : conversations
-- Conversations entre utilisateurs (chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user1_id INT NOT NULL,
    user2_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_conversation (user1_id, user2_id),
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE : messages
-- Messages du module chat
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    expediteur_id INT NOT NULL,
    contenu TEXT DEFAULT NULL,                  -- Texte du message
    image VARCHAR(255) DEFAULT NULL,            -- Image optionnelle
    est_lu TINYINT(1) DEFAULT 0,               -- 1 = message lu
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (expediteur_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_conversation (conversation_id),
    INDEX idx_expediteur (expediteur_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- TABLE : notifications
-- Notifications système pour les utilisateurs
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,                       -- Destinataire
    type ENUM('ami', 'like', 'commentaire', 'message', 'systeme') NOT NULL,
    message TEXT NOT NULL,
    lien VARCHAR(255) DEFAULT NULL,             -- Lien vers la ressource concernée
    est_lu TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DONNÉES PAR DÉFAUT : Comptes de test
-- ============================================================

-- Mot de passe pour tous les comptes de test : "Test1234!"
-- Hashé avec password_hash("Test1234!", PASSWORD_BCRYPT)

INSERT INTO users (nom, prenom, email, mot_de_passe, role, est_verifie, photo_profil, bio) VALUES
(
    'Admin',
    'Super',
    'admin@reseau.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Test1234!
    'administrateur',
    1,
    'default.png',
    'Compte administrateur principal'
),
(
    'Dupont',
    'Marie',
    'moderateur@reseau.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Test1234!
    'moderateur',
    1,
    'default.png',
    'Compte modérateur'
),
(
    'Martin',
    'Jean',
    'client@reseau.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Test1234!
    'client',
    1,
    'default.png',
    'Compte client de test'
),
(
    'Kofi',
    'Amina',
    'amina@reseau.com',
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- Test1234!
    'client',
    1,
    'default.png',
    'Bonjour, je suis Amina !'
);

-- ============================================================
-- FIN DU SCRIPT
-- ============================================================
