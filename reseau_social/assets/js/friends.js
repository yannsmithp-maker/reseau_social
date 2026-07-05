// ============================================================
// FRIENDS.JS — Gestion des amis
// ============================================================

async function renderFriends() {
    document.getElementById('page-content').innerHTML = `
    <div class="friends-layout">
        <div class="friends-header">
            <h2><i class="fa-solid fa-user-group"></i> Amis</h2>
            <div class="friends-search">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="friends-search-input" placeholder="Rechercher des utilisateurs..."
                       oninput="searchUsers(this.value)">
            </div>
        </div>

        <!-- Résultats de recherche -->
        <div id="search-results" style="display:none;">
            <h3 class="section-title">Résultats de recherche</h3>
            <div id="search-results-list" class="users-grid"></div>
        </div>

        <!-- Demandes reçues -->
        <div id="demandes-section">
            <h3 class="section-title">Demandes reçues</h3>
            <div id="demandes-list" class="users-grid">
                <p class="text-muted">Chargement...</p>
            </div>
        </div>

        <!-- Mes amis -->
        <div id="amis-section">
            <h3 class="section-title">Mes amis</h3>
            <div id="amis-list" class="users-grid">
                <p class="text-muted">Chargement...</p>
            </div>
        </div>
    </div>`;

    await loadFriends();
}

// ============================================================
// CHARGEMENT DE LA LISTE D'AMIS
// ============================================================
async function loadFriends() {
    const res = await apiRequest('/friends/index.php');
    if (!res.success) { showToast('Erreur de chargement.', 'error'); return; }

    renderDemandes(res.data.demandes);
    renderAmis(res.data.amis);
}

function renderDemandes(demandes) {
    const container = document.getElementById('demandes-list');
    document.getElementById('demandes-section').style.display = demandes.length === 0 ? 'none' : 'block';
    if (demandes.length === 0) return;

    container.innerHTML = demandes.map(d => `
    <div class="user-card-friend" id="demande-${d.friendship_id}">
        <img src="${avatarUrl(d.photo_profil)}" class="avatar avatar-lg" alt="Avatar"
             onclick="navigateTo('profile', ${d.id})" style="cursor:pointer;">
        <strong onclick="navigateTo('profile', ${d.id})" style="cursor:pointer;">
            ${d.prenom} ${d.nom}
        </strong>
        <p class="text-muted" style="font-size:0.8rem;">${timeAgo(d.created_at)}</p>
        <div class="friend-actions">
            <button class="btn btn-primary btn-sm" onclick="handleRespondFriend(${d.friendship_id}, 'accepte')">
                <i class="fa-solid fa-check"></i> Accepter
            </button>
            <button class="btn btn-secondary btn-sm" onclick="handleRespondFriend(${d.friendship_id}, 'refuse')">
                <i class="fa-solid fa-xmark"></i> Refuser
            </button>
        </div>
    </div>`).join('');
}

function renderAmis(amis) {
    const container = document.getElementById('amis-list');
    if (amis.length === 0) {
        container.innerHTML = `<p class="text-muted">Vous n'avez pas encore d'amis. Recherchez des utilisateurs !</p>`;
        return;
    }

    container.innerHTML = amis.map(a => `
    <div class="user-card-friend" id="ami-${a.id}">
        <img src="${avatarUrl(a.photo_profil)}" class="avatar avatar-lg" alt="Avatar"
             onclick="navigateTo('profile', ${a.id})" style="cursor:pointer;">
        <strong onclick="navigateTo('profile', ${a.id})" style="cursor:pointer;">
            ${a.prenom} ${a.nom}
        </strong>
        <p class="text-muted bio-short">${a.bio || 'Aucune bio'}</p>
        <div class="friend-actions">
            <button class="btn btn-primary btn-sm" onclick="navigateTo('chat', ${a.id})">
                <i class="fa-solid fa-comment"></i> Message
            </button>
            <button class="btn btn-secondary btn-sm" onclick="handleRemoveFriend(${a.id})">
                <i class="fa-solid fa-user-minus"></i>
            </button>
        </div>
    </div>`).join('');
}

// ============================================================
// RECHERCHE D'UTILISATEURS
// ============================================================
let searchTimer = null;

async function searchUsers(query) {
    const section = document.getElementById('search-results');
    const list    = document.getElementById('search-results-list');

    if (!query || query.length < 2) {
        section.style.display = 'none';
        return;
    }

    clearTimeout(searchTimer);
    searchTimer = setTimeout(async () => {
        section.style.display = 'block';
        list.innerHTML = '<p class="text-muted">Recherche...</p>';

        const res = await apiRequest(`/users/search.php?q=${encodeURIComponent(query)}`);
        if (!res.success || res.data.users.length === 0) {
            list.innerHTML = '<p class="text-muted">Aucun résultat.</p>';
            return;
        }

        list.innerHTML = res.data.users.map(u => `
        <div class="user-card-friend">
            <img src="${avatarUrl(u.photo_profil)}" class="avatar avatar-lg" alt="Avatar"
                 onclick="navigateTo('profile', ${u.id})" style="cursor:pointer;">
            <strong onclick="navigateTo('profile', ${u.id})" style="cursor:pointer;">
                ${u.prenom} ${u.nom}
            </strong>
            <p class="text-muted bio-short">${u.bio || 'Aucune bio'}</p>
            <div class="friend-actions">
                ${renderFriendButton(u)}
            </div>
        </div>`).join('');
    }, 400);
}

function renderFriendButton(u) {
    const currentUser = Session.getUser();
    if (u.id == currentUser.id) return '';
    switch (u.relation) {
        case 'accepte':
            return `<button class="btn btn-secondary btn-sm" disabled><i class="fa-solid fa-user-check"></i> Amis</button>`;
        case 'en_attente_envoyee':
            return `<button class="btn btn-secondary btn-sm" disabled><i class="fa-solid fa-clock"></i> En attente</button>`;
        case 'en_attente_recue':
            return `<button class="btn btn-primary btn-sm" onclick="handleRespondFriend(${u.friendship_id}, 'accepte')">Accepter</button>`;
        default:
            return `<button class="btn btn-primary btn-sm" onclick="handleSendFriendRequest(${u.id}, this)">
                        <i class="fa-solid fa-user-plus"></i> Ajouter
                    </button>`;
    }
}

// ============================================================
// ACTIONS
// ============================================================
async function handleSendFriendRequest(userId, btn) {
    const res = await apiRequest('/friends/send.php', 'POST', { recepteur_id: userId });
    if (!res.success) { showToast(res.message, 'error'); return; }
    btn.innerHTML = '<i class="fa-solid fa-clock"></i> En attente';
    btn.disabled  = true;
    btn.classList.replace('btn-primary', 'btn-secondary');
    showToast('Demande envoyée !', 'success');
}

async function handleRespondFriend(friendshipId, action) {
    const res = await apiRequest('/friends/respond.php', 'POST', { friendship_id: friendshipId, action });
    if (!res.success) { showToast(res.message, 'error'); return; }
    showToast(res.message, 'success');
    await loadFriends(); // Recharge la liste
}

async function handleRemoveFriend(amiId) {
    if (!confirm('Supprimer cet ami ?')) return;
    const res = await apiRequest('/friends/remove.php', 'POST', { ami_id: amiId });
    if (!res.success) { showToast(res.message, 'error'); return; }
    document.getElementById(`ami-${amiId}`)?.remove();
    showToast('Ami supprimé.', 'info');
}
