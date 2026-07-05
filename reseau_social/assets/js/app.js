// ============================================================
// APP.JS - Point d'entrée principal de l'application (SPA)
// ============================================================

// Vue courante
let currentView = 'feed';

// Intervalles en cours (chat, notifications)
let chatInterval = null;
let notifInterval = null;

/**
 * Initialisation de l'application au chargement de la page
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Masque l'écran de chargement après 500ms
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';

        if (Session.isLoggedIn()) {
            showApp();
        } else {
            showAuth();
        }
    }, 500);
});

/**
 * Affiche l'interface principale (utilisateur connecté)
 */
function showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('main-container').style.display = 'block';

    // Charge les infos de l'utilisateur dans la navbar
    const user = Session.getUser();
    if (user) {
        document.getElementById('nav-username').textContent = user.prenom + ' ' + user.nom;
        document.getElementById('nav-avatar').src = avatarUrl(user.photo_profil);
    }

    // Charge la vue par défaut
    navigateTo('feed');

    // Démarre les intervalles de rafraîchissement
    startIntervals();
}

/**
 * Affiche l'interface d'authentification
 */
function showAuth() {
    document.getElementById('main-container').style.display = 'none';
    document.getElementById('auth-container').style.display = 'block';
    stopIntervals();
    renderLoginPage();
}

/**
 * Navigation entre les vues (SPA)
 * @param {string} view - Nom de la vue
 * @param {any} params - Paramètres optionnels
 */
function navigateTo(view, params = null) {
    currentView = view;

    // Mise à jour des boutons de navigation actifs
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    switch (view) {
        case 'feed':
            document.querySelectorAll('.nav-btn')[0]?.classList.add('active');
            renderFeed();
            break;
        case 'friends':
            document.querySelectorAll('.nav-btn')[1]?.classList.add('active');
            renderFriends();
            break;
        case 'chat':
            document.querySelectorAll('.nav-btn')[2]?.classList.add('active');
            renderChat(params);
            break;
        case 'profile':
            renderProfile(params);
            break;
        case 'settings':
            renderSettings();
            break;
        default:
            renderFeed();
    }
}

/**
 * Déconnexion de l'utilisateur
 */
async function logout() {
    await apiRequest('/auth/logout.php', 'POST');
    Session.clear();
    showAuth();
    showToast('Vous êtes déconnecté.', 'info');
}

/**
 * Affiche/masque le menu utilisateur
 */
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    const isVisible = dropdown.style.display === 'block';
    closeAllDropdowns();
    dropdown.style.display = isVisible ? 'none' : 'block';
}

/**
 * Affiche/masque le panneau de notifications
 */
function toggleNotifications() {
    const panel = document.getElementById('notifications-panel');
    const isVisible = panel.style.display === 'block';
    closeAllDropdowns();
    if (!isVisible) {
        panel.style.display = 'block';
        loadNotifications();
    }
}

/**
 * Démarre les intervalles de rafraîchissement automatique
 */
function startIntervals() {
    // Rafraîchissement des notifications
    notifInterval = setInterval(loadNotificationCount, CONFIG.NOTIF_INTERVAL);

    // Rafraîchissement du chat (géré dans chat.js)
    // chatInterval est démarré quand on ouvre une conversation
}

/**
 * Arrête tous les intervalles
 */
function stopIntervals() {
    if (chatInterval) clearInterval(chatInterval);
    if (notifInterval) clearInterval(notifInterval);
}

/**
 * Recherche globale
 */
document.getElementById('search-input')?.addEventListener('input', function() {
    const query = this.value.trim();
    if (query.length >= 2) {
        searchUsers(query);
    }
});
