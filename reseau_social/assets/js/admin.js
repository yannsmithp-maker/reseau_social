// ============================================================
// ADMIN.JS — Logique du back-office
// ============================================================

let currentSection  = 'dashboard';
let usersPage       = 1;
let postsPage       = 1;
let usersSearchTimer = null;

// ============================================================
// INITIALISATION
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Vérifie l'accès admin
    if (!Session.isLoggedIn()) {
        window.location.href = 'login.html';
        return;
    }
    const user = Session.getUser();
    if (!['administrateur', 'moderateur'].includes(user.role)) {
        window.location.href = 'login.html';
        return;
    }

    // Affiche les infos admin dans la sidebar
    document.getElementById('admin-name').textContent  = user.prenom + ' ' + user.nom;
    document.getElementById('admin-role').textContent  = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    document.getElementById('admin-avatar').src        = avatarUrl(user.photo_profil);
    document.getElementById('admin-date').textContent  = new Date().toLocaleDateString('fr-FR', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // Affiche le menu "Administrateurs" uniquement pour les admins
    if (user.role === 'administrateur') {
        document.getElementById('nav-admins').style.display = 'flex';
    }

    // Charge le dashboard par défaut
    showSection('dashboard');
});

// ============================================================
// NAVIGATION ENTRE SECTIONS
// ============================================================
function showSection(section) {
    currentSection = section;

    // Masque toutes les sections
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.admin-nav-item').forEach(n => n.classList.remove('active'));

    // Affiche la section cible
    document.getElementById(`section-${section}`).classList.add('active');
    document.querySelector(`[onclick="showSection('${section}')"]`)?.classList.add('active');

    // Met à jour le titre
    const titles = {
        dashboard: 'Dashboard',
        users:     'Gestion des utilisateurs',
        posts:     'Gestion des publications',
        admins:    'Gestion des administrateurs',
    };
    document.getElementById('admin-page-title').textContent = titles[section] || 'Dashboard';

    // Charge les données
    switch (section) {
        case 'dashboard': loadDashboard();  break;
        case 'users':     loadAdminUsers(); break;
        case 'posts':     loadAdminPosts(); break;
        case 'admins':    loadAdmins();     break;
    }
}

// ============================================================
// DASHBOARD — STATISTIQUES
// ============================================================
async function loadDashboard() {
    const res = await apiRequest('/admin/dashboard.php');
    if (!res.success) { showToast('Erreur de chargement.', 'error'); return; }

    const { stats, inscriptions, posts_stats, top_users } = res.data;

    // Cartes de stats
    document.getElementById('stats-grid').innerHTML = `
        ${renderStatCard('fa-users',    'var(--primary)',   'Utilisateurs',       stats.total_users,    `+${stats.nouveaux_users_7j} cette semaine`)}
        ${renderStatCard('fa-newspaper','#e74c3c',          'Publications',        stats.total_posts,    `+${stats.nouveaux_posts_7j} cette semaine`)}
        ${renderStatCard('fa-comments', '#f39c12',          'Commentaires',        stats.total_comments, '')}
        ${renderStatCard('fa-envelope', 'var(--secondary)', 'Messages',            stats.total_messages, '')}
        ${renderStatCard('fa-heart',    '#e74c3c',          'Amitiés',             stats.total_amis,     '')}
    `;

    // Graphique simple des inscriptions (barres HTML)
    renderBarChart('chart-inscriptions', inscriptions, 'Inscriptions');

    // Top utilisateurs
    document.getElementById('top-users-list').innerHTML = top_users.length === 0
        ? '<p class="text-muted">Aucune donnée.</p>'
        : top_users.map((u, i) => `
        <div class="top-user-item">
            <span class="top-rank">#${i + 1}</span>
            <img src="${avatarUrl(u.photo_profil)}" class="avatar avatar-sm" alt="Avatar">
            <span style="flex:1;">${u.prenom} ${u.nom}</span>
            <strong>${u.nb_posts} posts</strong>
        </div>`).join('');
}

function renderStatCard(icon, color, label, value, sub) {
    return `
    <div class="stat-card">
        <div class="stat-icon" style="background:${color}20;color:${color};">
            <i class="fa-solid ${icon}"></i>
        </div>
        <div class="stat-info">
            <strong>${parseInt(value).toLocaleString('fr-FR')}</strong>
            <span>${label}</span>
            ${sub ? `<small>${sub}</small>` : ''}
        </div>
    </div>`;
}

function renderBarChart(containerId, data, label) {
    const container = document.getElementById(containerId);
    if (!data.length) {
        container.innerHTML = '<p class="text-muted">Aucune donnée cette semaine.</p>';
        return;
    }
    const max = Math.max(...data.map(d => d.nb));
    container.innerHTML = `
    <div class="bar-chart">
        ${data.map(d => `
        <div class="bar-item">
            <div class="bar-fill" style="height:${max > 0 ? (d.nb / max * 100) : 0}%">
                <span class="bar-value">${d.nb}</span>
            </div>
            <span class="bar-label">${new Date(d.jour).toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit'})}</span>
        </div>`).join('')}
    </div>`;
}

// ============================================================
// GESTION DES UTILISATEURS
// ============================================================
async function loadAdminUsers(page = 1, search = '') {
    usersPage = page;
    const tbody = document.getElementById('users-tbody');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;">
        <i class="fa-solid fa-spinner fa-spin"></i> Chargement...
    </td></tr>`;

    const res = await apiRequest(`/admin/users.php?page=${page}&q=${encodeURIComponent(search)}`);
    if (!res.success) { showToast('Erreur.', 'error'); return; }

    const { users, total, has_more } = res.data;

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">Aucun utilisateur trouvé.</td></tr>`;
        return;
    }

    const currentUser = Session.getUser();

    tbody.innerHTML = users.map(u => `
    <tr>
        <td>
            <div style="display:flex;align-items:center;gap:8px;">
                <img src="${avatarUrl(u.photo_profil)}" class="avatar avatar-sm" alt="Avatar">
                <span>${u.prenom} ${u.nom}</span>
            </div>
        </td>
        <td>${u.email}</td>
        <td><span class="role-badge role-${u.role}">${u.role}</span></td>
        <td>${u.nb_posts}</td>
        <td>
            <span class="status-badge ${u.est_actif ? 'status-active' : 'status-inactive'}">
                ${u.est_actif ? 'Actif' : 'Inactif'}
            </span>
        </td>
        <td>${new Date(u.created_at).toLocaleDateString('fr-FR')}</td>
        <td>
            <div class="action-btns">
                ${u.id !== currentUser.id ? `
                <button class="btn-icon btn-warning" title="${u.est_actif ? 'Désactiver' : 'Activer'}"
                        onclick="handleUserAction(${u.id}, '${u.est_actif ? 'desactiver' : 'activer'}')">
                    <i class="fa-solid fa-${u.est_actif ? 'ban' : 'check'}"></i>
                </button>
                ${currentUser.role === 'administrateur' ? `
                <select class="role-select" onchange="handleChangeRole(${u.id}, this.value)" title="Changer le rôle">
                    <option value="client"          ${u.role === 'client'          ? 'selected' : ''}>Client</option>
                    <option value="moderateur"      ${u.role === 'moderateur'      ? 'selected' : ''}>Modérateur</option>
                    <option value="administrateur"  ${u.role === 'administrateur'  ? 'selected' : ''}>Admin</option>
                </select>
                <button class="btn-icon btn-danger" title="Supprimer"
                        onclick="handleUserAction(${u.id}, 'supprimer')">
                    <i class="fa-solid fa-trash"></i>
                </button>` : ''}
                ` : '<span class="text-muted" style="font-size:0.8rem;">Vous</span>'}
            </div>
        </td>
    </tr>`).join('');

    // Pagination
    renderPagination('users-pagination', page, has_more, total,
        p => loadAdminUsers(p, document.getElementById('users-search').value));
}

function searchAdminUsers(query) {
    clearTimeout(usersSearchTimer);
    usersSearchTimer = setTimeout(() => loadAdminUsers(1, query), 400);
}

async function handleUserAction(userId, action) {
    const confirmMsg = {
        supprimer:  'Supprimer définitivement cet utilisateur ?',
        desactiver: 'Désactiver ce compte ?',
        activer:    'Réactiver ce compte ?',
    }[action];

    if (action === 'supprimer' && !confirm(confirmMsg)) return;

    const res = await apiRequest('/admin/users.php', 'POST', { action, user_id: userId });
    if (!res.success) { showToast(res.message, 'error'); return; }
    showToast(res.message, 'success');
    loadAdminUsers(usersPage, document.getElementById('users-search')?.value || '');
}

async function handleChangeRole(userId, newRole) {
    if (!confirm(`Changer le rôle de cet utilisateur en "${newRole}" ?`)) {
        loadAdminUsers(usersPage); // Annule la sélection
        return;
    }
    const res = await apiRequest('/admin/users.php', 'POST', { action: 'changer_role', user_id: userId, role: newRole });
    if (!res.success) { showToast(res.message, 'error'); loadAdminUsers(usersPage); return; }
    showToast(res.message, 'success');
    loadAdminUsers(usersPage);
}

// ============================================================
// GESTION DES POSTS
// ============================================================
async function loadAdminPosts(page = 1) {
    postsPage = page;
    const tbody = document.getElementById('posts-tbody');
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;">
        <i class="fa-solid fa-spinner fa-spin"></i> Chargement...
    </td></tr>`;

    const res = await apiRequest(`/admin/posts.php?page=${page}`);
    if (!res.success) { showToast('Erreur.', 'error'); return; }

    const { posts, total, has_more } = res.data;

    if (posts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-muted);">Aucun post.</td></tr>`;
        return;
    }

    tbody.innerHTML = posts.map(p => `
    <tr class="${p.est_supprime ? 'row-deleted' : ''}">
        <td>
            <div style="display:flex;align-items:center;gap:6px;">
                <small>${p.prenom} ${p.nom}</small>
            </div>
        </td>
        <td>
            <span class="post-preview">${p.contenu?.substring(0, 80) || '(image seulement)'}${p.contenu?.length > 80 ? '...' : ''}</span>
        </td>
        <td>${p.nb_likes}</td>
        <td>${p.nb_comments}</td>
        <td>
            <span class="status-badge ${p.est_supprime ? 'status-inactive' : 'status-active'}">
                ${p.est_supprime ? 'Supprimé' : 'Visible'}
            </span>
        </td>
        <td>${new Date(p.created_at).toLocaleDateString('fr-FR')}</td>
        <td>
            <div class="action-btns">
                ${p.est_supprime
                    ? `<button class="btn-icon btn-success" onclick="handlePostAction(${p.id}, 'restaurer')" title="Restaurer">
                           <i class="fa-solid fa-rotate-left"></i>
                       </button>`
                    : `<button class="btn-icon btn-danger" onclick="handlePostAction(${p.id}, 'supprimer')" title="Supprimer">
                           <i class="fa-solid fa-trash"></i>
                       </button>`
                }
            </div>
        </td>
    </tr>`).join('');

    renderPagination('posts-pagination', page, has_more, total, p => loadAdminPosts(p));
}

async function handlePostAction(postId, action) {
    if (action === 'supprimer' && !confirm('Supprimer ce post ?')) return;
    const res = await apiRequest('/admin/posts.php', 'POST', { action, post_id: postId });
    if (!res.success) { showToast(res.message, 'error'); return; }
    showToast(res.message, 'success');
    loadAdminPosts(postsPage);
}

// ============================================================
// GESTION DES ADMINS (admin uniquement)
// ============================================================
async function loadAdmins() {
    const res = await apiRequest('/admin/users.php?page=1&q=');
    if (!res.success) return;

    const admins = res.data.users.filter(u => ['administrateur', 'moderateur'].includes(u.role));
    const container = document.getElementById('admins-list');

    if (admins.length === 0) {
        container.innerHTML = '<p class="text-muted">Aucun administrateur trouvé.</p>';
        return;
    }

    container.innerHTML = `
    <table class="admin-table">
        <thead>
            <tr><th>Utilisateur</th><th>Email</th><th>Rôle</th><th>Actions</th></tr>
        </thead>
        <tbody>
            ${admins.map(u => `
            <tr>
                <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <img src="${avatarUrl(u.photo_profil)}" class="avatar avatar-sm" alt="">
                        ${u.prenom} ${u.nom}
                    </div>
                </td>
                <td>${u.email}</td>
                <td><span class="role-badge role-${u.role}">${u.role}</span></td>
                <td>
                    <select class="role-select" onchange="handleChangeRole(${u.id}, this.value)">
                        <option value="client"         ${u.role === 'client'         ? 'selected':''}>Client</option>
                        <option value="moderateur"     ${u.role === 'moderateur'     ? 'selected':''}>Modérateur</option>
                        <option value="administrateur" ${u.role === 'administrateur' ? 'selected':''}>Admin</option>
                    </select>
                    <button class="btn-icon btn-danger" onclick="handleUserAction(${u.id}, 'supprimer')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>`).join('')}
        </tbody>
    </table>`;
}

// ============================================================
// PAGINATION
// ============================================================
function renderPagination(containerId, currentPage, hasMore, total, callback) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
    <div class="pagination">
        <button class="btn btn-secondary btn-sm" onclick="(${callback})(${currentPage - 1})"
                ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fa-solid fa-chevron-left"></i> Précédent
        </button>
        <span>Page ${currentPage} — ${total} résultat(s)</span>
        <button class="btn btn-secondary btn-sm" onclick="(${callback})(${currentPage + 1})"
                ${!hasMore ? 'disabled' : ''}>
            Suivant <i class="fa-solid fa-chevron-right"></i>
        </button>
    </div>`;
}

// ============================================================
// DÉCONNEXION
// ============================================================
async function adminLogout() {
    await apiRequest('/auth/logout.php', 'POST');
    Session.clear();
    window.location.href = 'login.html';
}
