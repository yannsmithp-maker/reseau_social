# 🌐 MonRéseau — Réseau Social PHP/AJAX

Un réseau social complet développé en PHP natif et JavaScript (AJAX), inspiré de Facebook.

---

## 📋 Description du projet

Notre Réseau est une application web de type réseau social développée dans le cadre d'un projet final. Elle permet aux utilisateurs de publier des articles, interagir via likes et commentaires, gérer des amis, et discuter en temps réel via un système de chat.

---

## 🚀 Technologies utilisées

| Côté | Technologies |
|------|-------------|
| Frontend | HTML5, CSS3, JavaScript natif (Fetch API) |
| Backend | PHP natif |
| Base de données | MySQL |
| Icônes | Font Awesome 6 |

---

## ✅ Fonctionnalités implémentées

### 🔐 Authentification
- Inscription avec confirmation par email (template HTML)
- Connexion avec gestion de session via `sessionStorage`
- Mot de passe oublié avec lien de réinitialisation par email
- Réinitialisation du mot de passe (token expirant après 1h)

### 📰 Flux d'articles (Feed)
- Affichage des posts avec avatar, nom, date, contenu et image optionnelle
- Création de post avec image (sans rechargement de page)
- Système de likes / dislikes avec changement de couleur
- Commentaires avec champ fixé, ajout sans rechargement
- Pagination (chargement progressif)

### 👥 Gestion des amis
- Affichage de tous les utilisateurs inscrits
- Envoi, réception, acceptation et refus de demandes d'amitié
- Suppression d'amis
- Recherche d'utilisateurs en temps réel
- Suggestions d'amis

### 👤 Profil utilisateur
- Consultation du profil (le sien et celui des autres)
- Modification des informations personnelles
- Changement de photo de profil
- Modification du mot de passe
- Affichage des posts de l'utilisateur

### 💬 Chat en temps réel
- Sidebar listant les conversations existantes
- Recherche d'amis pour démarrer une conversation
- Rafraîchissement automatique des messages toutes les **3 secondes** (polling JS)
- Envoi de messages textuels et d'images
- Compteur de messages non lus

### 🔔 Notifications
- Notifications pour : demandes d'amitié, acceptations, likes, commentaires
- Badge dans la navbar
- Marquage comme lu (individuel ou en masse)

### 🛠️ Back-Office
- Page de connexion distincte (`/vues/back-office/login.html`)
- Dashboard avec statistiques détaillées (utilisateurs, posts, commentaires, messages, amis)
- Graphique des inscriptions sur 7 jours
- **Modérateur** : gestion des posts et utilisateurs (consultation, suspension, suppression)
- **Administrateur** : gestion complète + ajout/suppression de modérateurs et admins
- Aucun rechargement de page (SPA)

---

## 🏗️ Architecture du projet

```
reseau_social/
├── index.html                  # Page principale (SPA)
├── database.sql                # Script de création BDD
├── README.md
├── assets/
│   ├── css/
│   │   ├── style.css           # Styles globaux
│   │   ├── auth.css            # Authentification
│   │   ├── feed.css            # Flux d'articles
│   │   ├── friends.css         # Amis
│   │   ├── profile.css         # Profil
│   │   ├── chat.css            # Chat
│   │   └── admin.css           # Back-office
│   ├── images/
│   │   └── uploads/            # Images uploadées
│   └── js/
│       ├── config.js           # Configuration + Session
│       ├── utils.js            # Fonctions utilitaires
│       ├── app.js              # Routeur SPA
│       ├── auth.js             # Authentification
│       ├── feed.js             # Flux d'articles
│       ├── friends.js          # Amis
│       ├── profile.js          # Profil
│       ├── chat.js             # Chat
│       ├── notifications.js    # Notifications
│       └── admin.js            # Back-office
├── vues/
│   ├── clients/
│   └── back-office/
│       ├── login.html          # Connexion admin
│       └── dashboard.html      # Dashboard admin
└── api/
    ├── config.php              # Config + connexion BDD + helpers
    ├── auth/                   # register, login, logout, verify, forgot/reset password
    ├── posts/                  # index, create, delete
    ├── likes/                  # toggle
    ├── comments/               # index, create, delete
    ├── friends/                # index, send, respond, remove, suggestions
    ├── messages/               # index, send, conversations
    ├── users/                  # profile, update, search
    ├── notifications/          # index, mark-read
    └── admin/                  # dashboard, users, posts
```

## 🔑 Identifiants de test

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Administrateur | admin@reseau.com | Test1234! |
| Modérateur | moderateur@reseau.com | Test1234! |
| Client | client@reseau.com | Test1234! |
| Client | amina@reseau.com | Test1234! |

> Back-office accessible sur : `http://localhost/reseau_social/vues/back-office/login.html`

---

## 👥 Membres du groupe

| Nom | Prénom | Tâches réalisées |
| FANOU | Osé |-----------------|
| KEMAVO | Deo | ... |
| SEGLA | Charlène Mahougnon | ... |
| PADONOU | Yann Smith | ... |

## 🔗 Lien du dépôt

> []

