// ============================================================
// PROFILE.JS — Profil utilisateur + paramètres
// ============================================================

// ============================================================
// RENDU DU PROFIL
// ============================================================
async function renderProfile(userId = null) {
    const targetId = userId || Session.getUser()?.id;
    const isOwn    = !userId || userId == Session.getUser()?.id;

    document.getElementById('page-content').innerHTML = `
    <div class="profile-layout">
        <div class="profile-loading">
            <div class="loader"></div>
        </div>
    </div>`;

    const res = await apiRequest(`/users/profile.php?id=${targetId}`);
    if (!res.success) { showToast('Profil introuvable.', 'error'); return; }

    const { user, posts } = res.data;

    document.getElementById('page-content').innerHTML = `
    <div class="profile-layout">

        <!-- En-tête du profil -->
        <div class="profile-header-card card">
            <div class="profile-cover"></div>
            <div class="profile-info">
                <div class="profile-avatar-wrap">
                    <img src="${avatarUrl(user.photo_profil)}" class="avatar profile-avatar" alt="Avatar" id="profile-avatar-img">
                    ${isOwn ? `
                    <label class="avatar-edit-btn" for="avatar-input" title="Changer la photo">
                        <i class="fa-solid fa-camera"></i>
                    </label>
                    <input type="file" id="avatar-input" accept="image/*" style="display:none;" onchange="handleAvatarChange(this)">
                    ` : ''}
                </div>
                <div class="profile-details">
                    <h2>${user.prenom} ${user.nom}</h2>
                    <p class="profile-bio">${user.bio || (isOwn ? '<em>Ajoutez une bio...</em>' : 'Aucune bio')}</p>
                    <div class="profile-stats">
                        <div class="profile-stat">
                            <strong>${user.nb_posts}</strong>
                            <span>Posts</span>
                        </div>
                        <div class="profile-stat">
                            <strong>${user.nb_amis}</strong>
                            <span>Amis</span>
                        </div>
                    </div>
                </div>
                <div class="profile-actions">
                    ${isOwn
                        ? `<button class="btn btn-primary" onclick="openEditModal()">
                               <i class="fa-solid fa-pen"></i> Modifier le profil
                           </button>`
                        : renderProfileRelationBtn(user)
                    }
                </div>
            </div>
        </div>

        <div class="profile-body">
            <!-- Colonne gauche : infos -->
            <aside class="profile-sidebar">
                <div class="card">
                    <div class="card-header">Informations</div>
                    <div class="card-body profile-info-list">
                        ${user.date_naissance ? `
                        <div class="info-item">
                            <i class="fa-solid fa-cake-candles"></i>
                            <span>${new Date(user.date_naissance).toLocaleDateString('fr-FR')}</span>
                        </div>` : ''}
                        ${user.email ? `
                        <div class="info-item">
                            <i class="fa-solid fa-envelope"></i>
                            <span>${user.email}</span>
                        </div>` : ''}
                        ${user.telephone ? `
                        <div class="info-item">
                            <i class="fa-solid fa-phone"></i>
                            <span>${user.telephone}</span>
                        </div>` : ''}
                        <div class="info-item">
                            <i class="fa-solid fa-calendar"></i>
                            <span>Membre depuis ${new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
                        </div>
                    </div>
                </div>

                ${isOwn ? `
                <div class="card" style="margin-top:16px;">
                    <div class="card-header">Sécurité</div>
                    <div class="card-body">
                        <button class="btn btn-secondary btn-full" onclick="openPasswordModal()">
                            <i class="fa-solid fa-lock"></i> Changer le mot de passe
                        </button>
                    </div>
                </div>` : ''}
            </aside>

            <!-- Colonne droite : posts -->
            <main class="profile-posts">
                <h3 class="section-title">Publications</h3>
                <div id="profile-posts-list">
                    ${posts.length === 0
                        ? `<p class="text-muted" style="padding:16px 0;">Aucune publication.</p>`
                        : posts.map(p => renderPostCard(p)).join('')
                    }
                </div>
            </main>
        </div>
    </div>

    <!-- Modal édition profil -->
    <div id="edit-modal" class="modal-overlay" style="display:none;" onclick="closeEditModal(event)">
        <div class="modal">
            <div class="modal-header">
                <h3>Modifier le profil</h3>
                <button class="modal-close" onclick="closeEditModal()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="modal-body">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="form-group">
                        <label>Prénom</label>
                        <input type="text" id="edit-prenom" class="form-control" value="${user.prenom}">
                    </div>
                    <div class="form-group">
                        <label>Nom</label>
                        <input type="text" id="edit-nom" class="form-control" value="${user.nom}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Bio</label>
                    <textarea id="edit-bio" class="form-control" rows="3" maxlength="300">${user.bio || ''}</textarea>
                </div>
                <div class="form-group">
                    <label>Téléphone</label>
                    <input type="tel" id="edit-telephone" class="form-control" value="${user.telephone || ''}">
                </div>
                <div class="form-group">
                    <label>Date de naissance</label>
                    <input type="date" id="edit-ddn" class="form-control" value="${user.date_naissance || ''}">
                </div>
                <button id="btn-save-profile" class="btn btn-primary btn-full" data-label="Enregistrer" onclick="handleSaveProfile()">
                    Enregistrer
                </button>
            </div>
        </div>
    </div>

    <!-- Modal changement de mot de passe -->
    <div id="password-modal" class="modal-overlay" style="display:none;" onclick="closePasswordModal(event)">
        <div class="modal">
            <div class="modal-header">
                <h3>Changer le mot de passe</h3>
                <button class="modal-close" onclick="closePasswordModal()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="modal-body">
                <div id="password-alert"></div>
                <div class="form-group">
                    <label>Ancien mot de passe</label>
                    <input type="password" id="old-mdp" class="form-control" placeholder="••••••••">
                </div>
                <div class="form-group">
                    <label>Nouveau mot de passe</label>
                    <input type="password" id="new-mdp" class="form-control" placeholder="••••••••">
                </div>
                <div class="form-group">
                    <label>Confirmer le nouveau mot de passe</label>
                    <input type="password" id="new-mdp2" class="form-control" placeholder="••••••••">
                </div>
                <button id="btn-save-password" class="btn btn-primary btn-full" data-label="Changer" onclick="handleChangePassword()">
                    Changer
                </button>
            </div>
        </div>
    </div>`;
}

// ============================================================
// BOUTON RELATION (ami / en attente / ajouter)
// ============================================================
function renderProfileRelationBtn(user) {
    const currentUserId = Session.getUser()?.id;
    switch (user.relation) {
        case 'accepte':
            return `
            <button class="btn btn-secondary" onclick="navigateTo('chat', ${user.id})">
                <i class="fa-solid fa-comment"></i> Message
            </button>
            <button class="btn btn-secondary" onclick="handleRemoveFriend(${user.id})">
                <i class="fa-solid fa-user-minus"></i> Retirer
            </button>`;
        case 'en_attente':
            if (user.demandeur_id == currentUserId) {
                return `<button class="btn btn-secondary" disabled>
                    <i class="fa-solid fa-clock"></i> Demande envoyée
                </button>`;
            }
            return `
            <button class="btn btn-primary" onclick="handleRespondFriend(${user.friendship_id}, 'accepte')">
                <i class="fa-solid fa-check"></i> Accepter
            </button>
            <button class="btn btn-secondary" onclick="handleRespondFriend(${user.friendship_id}, 'refuse')">
                Refuser
            </button>`;
        default:
            return `<button class="btn btn-primary" onclick="handleSendFriendRequest(${user.id}, this)">
                <i class="fa-solid fa-user-plus"></i> Ajouter en ami
            </button>`;
    }
}

// ============================================================
// CHANGEMENT DE PHOTO DE PROFIL
// ============================================================
async function handleAvatarChange(input) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('type',  'photo');
    formData.append('photo', file);

    showToast('Téléchargement en cours...', 'info');
    const res = await apiRequest('/users/update.php', 'POST', formData);

    if (!res.success) { showToast(res.message, 'error'); return; }

    // Met à jour l'avatar affiché
    const newUrl = avatarUrl(res.data.photo_profil);
    document.getElementById('profile-avatar-img').src = newUrl;
    document.getElementById('nav-avatar').src          = newUrl;

    // Met à jour la session
    const user = Session.getUser();
    user.photo_profil = res.data.photo_profil;
    Session.set(user, Session.getToken());

    showToast('Photo mise à jour !', 'success');
}

// ============================================================
// ÉDITION DU PROFIL
// ============================================================
function openEditModal() {
    document.getElementById('edit-modal').style.display = 'flex';
}
function closeEditModal(event) {
    if (!event || event.target.id === 'edit-modal') {
        document.getElementById('edit-modal').style.display = 'none';
    }
}

async function handleSaveProfile() {
    const nom            = document.getElementById('edit-nom').value.trim();
    const prenom         = document.getElementById('edit-prenom').value.trim();
    const bio            = document.getElementById('edit-bio').value.trim();
    const telephone      = document.getElementById('edit-telephone').value.trim();
    const date_naissance = document.getElementById('edit-ddn').value;

    if (!nom || !prenom) { showToast('Nom et prénom obligatoires.', 'error'); return; }

    setLoading('btn-save-profile', true);
    const res = await apiRequest('/users/update.php', 'POST', {
        type: 'infos', nom, prenom, bio, telephone, date_naissance
    });
    setLoading('btn-save-profile', false);

    if (!res.success) { showToast(res.message, 'error'); return; }

    // Met à jour la session
    const user = Session.getUser();
    Object.assign(user, res.data.user);
    Session.set(user, Session.getToken());

    // Met à jour la navbar
    document.getElementById('nav-username').textContent = prenom + ' ' + nom;

    closeEditModal();
    showToast('Profil mis à jour !', 'success');
    renderProfile(); // Recharge le profil
}

// ============================================================
// CHANGEMENT DE MOT DE PASSE
// ============================================================
function openPasswordModal() {
    document.getElementById('password-modal').style.display = 'flex';
}
function closePasswordModal(event) {
    if (!event || event.target.id === 'password-modal') {
        document.getElementById('password-modal').style.display = 'none';
    }
}

async function handleChangePassword() {
    const ancien  = document.getElementById('old-mdp').value;
    const nouveau = document.getElementById('new-mdp').value;
    const confirm = document.getElementById('new-mdp2').value;
    const alert   = document.getElementById('password-alert');

    if (!ancien || !nouveau || !confirm) {
        alert.innerHTML = `<div class="auth-alert error"><i class="fa-solid fa-circle-xmark"></i> Tous les champs sont obligatoires.</div>`;
        return;
    }
    if (nouveau !== confirm) {
        alert.innerHTML = `<div class="auth-alert error"><i class="fa-solid fa-circle-xmark"></i> Les mots de passe ne correspondent pas.</div>`;
        return;
    }

    setLoading('btn-save-password', true);
    const res = await apiRequest('/users/update.php', 'POST', {
        type: 'mot_de_passe',
        ancien_mdp:         ancien,
        nouveau_mdp:        nouveau,
        nouveau_mdp_confirm: confirm
    });
    setLoading('btn-save-password', false);

    if (!res.success) {
        alert.innerHTML = `<div class="auth-alert error"><i class="fa-solid fa-circle-xmark"></i> ${res.message}</div>`;
        return;
    }

    closePasswordModal();
    showToast('Mot de passe changé avec succès !', 'success');
}

// ============================================================
// PAGE PARAMÈTRES
// ============================================================
function renderSettings() {
    // Redirige vers le profil personnel avec onglet édition
    renderProfile();
    setTimeout(() => openEditModal(), 300);
}
