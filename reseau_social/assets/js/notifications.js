// ============================================================
// NOTIFICATIONS.JS — Gestion des notifications
// ============================================================

/**
 * Charge et affiche les notifications dans le panneau
 */
async function loadNotifications() {
    const list = document.getElementById('notifications-list');
    if (!list) return;

    list.innerHTML = '<p class="text-muted" style="padding:16px;text-align:center;">Chargement...</p>';

    const res = await apiRequest('/notifications/index.php');
    if (!res.success) {
        list.innerHTML = '<p class="text-muted" style="padding:16px;">Erreur de chargement.</p>';
        return;
    }

    updateNotifBadge(res.data.non_lues);

    if (res.data.notifications.length === 0) {
        list.innerHTML = `
        <div style="text-align:center;padding:32px;color:var(--text-muted);">
            <i class="fa-regular fa-bell" style="font-size:2rem;opacity:0.4;"></i>
            <p style="margin-top:8px;">Aucune notification</p>
        </div>`;
        return;
    }

    list.innerHTML = res.data.notifications.map(n => renderNotifItem(n)).join('');
}

/**
 * Rendu d'un item de notification
 */
function renderNotifItem(n) {
    const icon = {
        'ami':         'fa-user-group',
        'like':        'fa-thumbs-up',
        'commentaire': 'fa-comment',
        'message':     'fa-envelope',
        'systeme':     'fa-bell',
    }[n.type] || 'fa-bell';

    const color = {
        'ami':         'var(--primary)',
        'like':        '#e74c3c',
        'commentaire': '#f39c12',
        'message':     'var(--secondary)',
        'systeme':     'var(--text-muted)',
    }[n.type] || 'var(--primary)';

    return `
    <div class="notif-item ${n.est_lu ? '' : 'unread'}" onclick="handleNotifClick(${n.id}, '${n.lien || ''}')">
        <div class="notif-icon" style="color:${color};">
            <i class="fa-solid ${icon}"></i>
        </div>
        <div style="flex:1;min-width:0;">
            <p>${n.message}</p>
            <span>${timeAgo(n.created_at)}</span>
        </div>
        ${!n.est_lu ? '<div class="notif-dot"></div>' : ''}
    </div>`;
}

/**
 * Gère le clic sur une notification
 */
async function handleNotifClick(notifId, lien) {
    // Marque comme lu
    await apiRequest('/notifications/mark-read.php', 'POST', { id: notifId });

    // Retire le style "non lu"
    const el = document.querySelector(`[onclick*="handleNotifClick(${notifId}"]`);
    if (el) {
        el.classList.remove('unread');
        el.querySelector('.notif-dot')?.remove();
    }

    // Navigue vers le lien si présent
    if (lien) {
        // Ferme le panneau
        document.getElementById('notifications-panel').style.display = 'none';
        // Navigation simple selon le type de lien
        if (lien.startsWith('profile:')) {
            navigateTo('profile', parseInt(lien.split(':')[1]));
        } else if (lien.startsWith('post:')) {
            navigateTo('feed');
        } else if (lien.startsWith('chat:')) {
            navigateTo('chat', parseInt(lien.split(':')[1]));
        }
    }

    // Met à jour le badge
    loadNotificationCount();
}

/**
 * Marque toutes les notifications comme lues
 */
async function markAllRead() {
    await apiRequest('/notifications/mark-read.php', 'POST', {});
    document.querySelectorAll('.notif-item.unread').forEach(el => {
        el.classList.remove('unread');
        el.querySelector('.notif-dot')?.remove();
    });
    updateNotifBadge(0);
}

/**
 * Récupère uniquement le nombre de notifications non lues (pour le polling)
 */
async function loadNotificationCount() {
    const res = await apiRequest('/notifications/index.php');
    if (!res.success) return;
    updateNotifBadge(res.data.non_lues);
    // Met aussi à jour le badge messages
    updateMsgBadge();
}

/**
 * Met à jour le badge de notifications dans la navbar
 */
function updateNotifBadge(count) {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;
    badge.textContent   = count;
    badge.style.display = count > 0 ? 'block' : 'none';
}
