// ============================================================
// UTILS.JS - Fonctions utilitaires globales
// ============================================================

/**
 * Effectue une requête API avec le token d'authentification
 * @param {string} endpoint - Chemin de l'API (ex: /auth/login.php)
 * @param {string} method - Méthode HTTP (GET, POST, etc.)
 * @param {object|FormData} body - Corps de la requête
 * @returns {Promise<object>} - Réponse JSON
 */
async function apiRequest(endpoint, method = 'GET', body = null) {
    const headers = {
        'Authorization': 'Bearer ' + Session.getToken()
    };

    // Si le body n'est pas un FormData, on envoie du JSON
    if (body && !(body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }

    try {
        const response = await fetch(CONFIG.API_URL + endpoint, {
            method,
            headers,
            body: method !== 'GET' ? body : null
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Erreur API:', error);
        return { success: false, message: 'Erreur de connexion au serveur.' };
    }
}

/**
 * Affiche un message toast (notification temporaire)
 * @param {string} message 
 * @param {string} type - 'success' | 'error' | 'info' | 'warning'
 */
function showToast(message, type = 'info') {
    // Supprime les toasts existants
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);

    // Affiche puis masque après 3 secondes
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Formate une date en texte lisible (ex: "il y a 2 heures")
 * @param {string} dateStr - Date au format MySQL
 */
function timeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `Il y a ${Math.floor(diff / 86400)} jour(s)`;
    return date.toLocaleDateString('fr-FR');
}

/**
 * Retourne l'URL complète d'une image de profil
 * @param {string} filename 
 */
function avatarUrl(filename) {
    if (!filename || filename === 'default.png') {
        return CONFIG.DEFAULT_AVATAR;
    }
    return CONFIG.API_URL.replace('/api', '') + '/assets/images/uploads/' + filename;
}

/**
 * Injecte du HTML dans un conteneur
 * @param {string} containerId - ID du conteneur
 * @param {string} html - HTML à injecter
 */
function renderTo(containerId, html) {
    const el = document.getElementById(containerId);
    if (el) el.innerHTML = html;
}

/**
 * Active/désactive le bouton de soumission d'un formulaire
 * @param {string} btnId 
 * @param {boolean} loading 
 */
function setLoading(btnId, loading) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled = loading;
    btn.innerHTML = loading
        ? '<i class="fa-solid fa-spinner fa-spin"></i> Chargement...'
        : btn.dataset.label || 'Envoyer';
}

/**
 * Ferme tous les dropdowns ouverts
 */
function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(d => d.style.display = 'none');
    const notifPanel = document.getElementById('notifications-panel');
    if (notifPanel) notifPanel.style.display = 'none';
}

// Ferme les dropdowns si on clique ailleurs
document.addEventListener('click', function(e) {
    if (!e.target.closest('.user-menu') && !e.target.closest('#user-dropdown')) {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) dropdown.style.display = 'none';
    }
    if (!e.target.closest('.nav-btn') && !e.target.closest('#notifications-panel')) {
        const notifPanel = document.getElementById('notifications-panel');
        if (notifPanel) notifPanel.style.display = 'none';
    }
});
