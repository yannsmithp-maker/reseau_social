// ============================================================
// CONFIG.JS - Configuration globale côté client
// ============================================================

const CONFIG = {
    // URL de base de l'API PHP
    API_URL: 'http://localhost/reseau_social/api',

    // Intervalle de rafraîchissement du chat (en ms)
    CHAT_INTERVAL: 3000,

    // Intervalle de rafraîchissement des notifications (en ms)
    NOTIF_INTERVAL: 5000,

    // URL des images par défaut
    DEFAULT_AVATAR: 'assets/images/uploads/default.png',
};

// ============================================================
// GESTION DE LA SESSION (sessionStorage)
// ============================================================
const Session = {
    /**
     * Sauvegarde les données de l'utilisateur connecté
     */
    set(user, token) {
        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('token', token);
    },

    /**
     * Retourne l'utilisateur connecté
     */
    getUser() {
        const user = sessionStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    /**
     * Retourne le token d'authentification
     */
    getToken() {
        return sessionStorage.getItem('token') || '';
    },

    /**
     * Vérifie si un utilisateur est connecté
     */
    isLoggedIn() {
        return !!sessionStorage.getItem('token');
    },

    /**
     * Supprime la session (déconnexion)
     */
    clear() {
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
    }
};
