// ============================================================
// FEED.JS — Flux d'articles (posts, likes, commentaires)
// ============================================================

let feedPage    = 1;
let feedLoading = false;
let feedHasMore = true;

// ============================================================
// RENDU PRINCIPAL DU FEED
// ============================================================

async function renderFeed() {
    feedPage    = 1;
    feedHasMore = true;

    document.getElementById('page-content').innerHTML = `
    <div class="feed-layout">

        <!-- Sidebar gauche : infos utilisateur -->
        <aside class="feed-sidebar-left">
            ${renderUserCard()}
        </aside>

        <!-- Colonne centrale : flux des posts -->
        <main>
            <!-- Formulaire de création de post -->
            <div class="card create-post-card">
                <div class="card-body">
                    <div class="create-post-top">
                        <img src="${avatarUrl(Session.getUser()?.photo_profil)}" class="avatar avatar-md" alt="Avatar">
                        <div class="create-post-input" onclick="openPostModal()">
                            Quoi de neuf, ${Session.getUser()?.prenom} ?
                        </div>
                    </div>
                    <hr class="create-post-divider">
                    <div class="create-post-actions">
                        <button class="create-post-btn" onclick="openPostModal()">
                            <i class="fa-solid fa-image" style="color:#45bd62;"></i> Photo
                        </button>
                        <button class="create-post-btn" onclick="openPostModal()">
                            <i class="fa-solid fa-face-smile" style="color:#f7b928;"></i> Humeur
                        </button>
                    </div>
                </div>
            </div>

            <!-- Liste des posts -->
            <div id="posts-list"></div>

            <!-- Bouton "Charger plus" -->
            <div id="load-more-container" style="text-align:center;padding:16px;"></div>
        </main>

        <!-- Sidebar droite : suggestions d'amis -->
        <aside class="feed-sidebar-right">
            <div class="card">
                <div class="card-header">Suggestions d'amis</div>
                <div class="card-body" id="friend-suggestions">
                    <p style="color:var(--text-muted);font-size:0.88rem;">Chargement...</p>
                </div>
            </div>
        </aside>

    </div>

    <!-- Modal création de post -->
    <div id="post-modal" class="modal-overlay" style="display:none;" onclick="closePostModal(event)">
        <div class="modal">
            <div class="modal-header">
                <h3>Créer un post</h3>
                <button class="modal-close" onclick="closePostModal()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="modal-body">
                <div class="create-post-user">
                    <img src="${avatarUrl(Session.getUser()?.photo_profil)}" class="avatar avatar-md" alt="Avatar">
                    <strong>${Session.getUser()?.prenom} ${Session.getUser()?.nom}</strong>
                </div>
                <textarea id="post-contenu" class="form-control post-textarea"
                    placeholder="Quoi de neuf ?" rows="4" maxlength="5000"></textarea>
                <div id="post-image-preview" style="margin-top:8px;"></div>
                <div class="post-modal-actions">
                    <label class="btn btn-secondary btn-sm" for="post-image-input">
                        <i class="fa-solid fa-image"></i> Ajouter une photo
                    </label>
                    <input type="file" id="post-image-input" accept="image/*" style="display:none;" onchange="previewPostImage(this)">
                    <button id="btn-publish" class="btn btn-primary btn-sm" data-label="Publier" onclick="handleCreatePost()">
                        Publier
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    // Charge les posts et suggestions
    await loadPosts();
    loadFriendSuggestions();
}

// ============================================================
// CARTE UTILISATEUR (sidebar gauche)
// ============================================================
function renderUserCard() {
    const user = Session.getUser();
    return `
    <div class="card user-card">
        <div class="user-card-cover"></div>
        <div class="user-card-body">
            <img src="${avatarUrl(user?.photo_profil)}" class="avatar avatar-lg user-card-avatar" alt="Avatar">
            <strong>${user?.prenom} ${user?.nom}</strong>
            <p>${user?.bio || 'Aucune bio'}</p>
            <button class="btn btn-secondary btn-sm btn-full" onclick="navigateTo('profile')">
                <i class="fa-solid fa-user"></i> Mon profil
            </button>
        </div>
    </div>`;
}

// ============================================================
// CHARGEMENT DES POSTS
// ============================================================
async function loadPosts(append = false) {
    if (feedLoading || !feedHasMore) return;
    feedLoading = true;

    const container = document.getElementById('posts-list');
    const loadMore  = document.getElementById('load-more-container');

    if (!append) {
        container.innerHTML = `<div class="post-skeleton"></div><div class="post-skeleton"></div>`;
    }

    const res = await apiRequest(`/posts/index.php?page=${feedPage}`);
    feedLoading = false;

    if (!res.success) {
        container.innerHTML = `<p style="text-align:center;color:var(--text-muted);">Erreur de chargement.</p>`;
        return;
    }

    if (!append) container.innerHTML = '';

    if (res.data.posts.length === 0 && !append) {
        container.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:32px;">Aucun post pour l'instant. Soyez le premier à publier !</p>`;
        return;
    }

    res.data.posts.forEach(post => {
        container.insertAdjacentHTML('beforeend', renderPostCard(post));
    });

    feedHasMore = res.data.has_more;
    feedPage++;

    if (feedHasMore) {
        loadMore.innerHTML = `<button class="btn btn-secondary" onclick="loadPosts(true)">Charger plus</button>`;
    } else {
        loadMore.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;">Vous avez tout vu !</p>`;
    }
}

// ============================================================
// RENDU D'UN POST
// ============================================================
function renderPostCard(post) {
    const currentUser = Session.getUser();
    const isOwner     = post.user_id == currentUser.id;
    const likeActive  = post.ma_reaction === 'like'    ? 'active-like'    : '';
    const dislikeActive = post.ma_reaction === 'dislike' ? 'active-dislike' : '';

    return `
    <div class="card post-card" id="post-${post.id}">
        <div class="post-header">
            <img src="${avatarUrl(post.photo_profil)}" class="avatar avatar-md" alt="Avatar"
                 onclick="navigateTo('profile', ${post.user_id})" style="cursor:pointer;">
            <div class="post-meta">
                <strong onclick="navigateTo('profile', ${post.user_id})" style="cursor:pointer;">
                    ${post.prenom} ${post.nom}
                </strong>
                <span>${timeAgo(post.created_at)}</span>
            </div>
            ${isOwner ? `
            <div class="post-options">
                <button onclick="togglePostMenu(${post.id})"><i class="fa-solid fa-ellipsis"></i></button>
                <div class="post-menu" id="post-menu-${post.id}" style="display:none;">
                    <button onclick="handleDeletePost(${post.id})">
                        <i class="fa-solid fa-trash"></i> Supprimer
                    </button>
                </div>
            </div>` : ''}
        </div>

        <div class="post-body">
            ${post.contenu ? `<p class="post-text">${post.contenu}</p>` : ''}
            ${post.image   ? `<img src="${avatarUrl('').replace('default.png','') + post.image}" class="post-image" alt="Image du post">` : ''}
        </div>

        <div class="post-stats">
            <span>${post.nb_likes > 0 ? `<i class="fa-solid fa-thumbs-up" style="color:var(--primary);"></i> ${post.nb_likes}` : ''}</span>
            <span>${post.nb_comments > 0 ? `${post.nb_comments} commentaire(s)` : ''}</span>
        </div>

        <div class="post-actions">
            <button class="post-action-btn ${likeActive}" onclick="handleLike(${post.id}, 'like')">
                <i class="fa-${post.ma_reaction === 'like' ? 'solid' : 'regular'} fa-thumbs-up"></i>
                J'aime <span id="likes-count-${post.id}">(${post.nb_likes})</span>
            </button>
            <button class="post-action-btn ${dislikeActive}" onclick="handleLike(${post.id}, 'dislike')">
                <i class="fa-${post.ma_reaction === 'dislike' ? 'solid' : 'regular'} fa-thumbs-down"></i>
                Je n'aime pas <span id="dislikes-count-${post.id}">(${post.nb_dislikes})</span>
            </button>
            <button class="post-action-btn" onclick="toggleComments(${post.id})">
                <i class="fa-regular fa-comment"></i>
                Commenter <span id="comments-count-${post.id}">(${post.nb_comments})</span>
            </button>
        </div>

        <!-- Section commentaires (masquée par défaut) -->
        <div class="comments-section" id="comments-${post.id}" style="display:none;">
            <div class="comments-list" id="comments-list-${post.id}">
                <p style="color:var(--text-muted);font-size:0.85rem;padding:8px 0;">Chargement...</p>
            </div>
            <div class="comment-input-area">
                <img src="${avatarUrl(currentUser.photo_profil)}" class="avatar avatar-sm" alt="Avatar">
                <div class="comment-input-wrapper">
                    <input type="text" class="comment-input" id="comment-input-${post.id}"
                           placeholder="Écrire un commentaire..."
                           onkeypress="handleCommentKeypress(event, ${post.id})">
                    <button onclick="handleAddComment(${post.id})">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    </div>`;
}

// ============================================================
// CRÉATION DE POST
// ============================================================
function openPostModal() {
    document.getElementById('post-modal').style.display = 'flex';
    document.getElementById('post-contenu').focus();
}

function closePostModal(event) {
    if (!event || event.target.id === 'post-modal') {
        document.getElementById('post-modal').style.display = 'none';
        document.getElementById('post-contenu').value = '';
        document.getElementById('post-image-preview').innerHTML = '';
        document.getElementById('post-image-input').value = '';
    }
}

function previewPostImage(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        document.getElementById('post-image-preview').innerHTML = `
            <div style="position:relative;display:inline-block;">
                <img src="${e.target.result}" style="max-height:200px;border-radius:8px;">
                <button onclick="removePostImage()" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.6);color:white;border:none;border-radius:50%;width:24px;height:24px;cursor:pointer;">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>`;
    };
    reader.readAsDataURL(file);
}

function removePostImage() {
    document.getElementById('post-image-preview').innerHTML = '';
    document.getElementById('post-image-input').value = '';
}

async function handleCreatePost() {
    const contenu    = document.getElementById('post-contenu').value.trim();
    const imageInput = document.getElementById('post-image-input');

    if (!contenu && !imageInput.files[0]) {
        showToast('Écrivez quelque chose ou ajoutez une image.', 'warning');
        return;
    }

    setLoading('btn-publish', true);

    const formData = new FormData();
    formData.append('contenu', contenu);
    if (imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    const res = await apiRequest('/posts/create.php', 'POST', formData);
    setLoading('btn-publish', false);

    if (!res.success) {
        showToast(res.message, 'error');
        return;
    }

    closePostModal();
    // Ajoute le nouveau post en haut du fil sans recharger
    const container = document.getElementById('posts-list');
    container.insertAdjacentHTML('afterbegin', renderPostCard(res.data.post));
    showToast('Post publié !', 'success');
}

// ============================================================
// LIKES / DISLIKES
// ============================================================
async function handleLike(postId, type) {
    const res = await apiRequest('/likes/toggle.php', 'POST', { post_id: postId, type });
    if (!res.success) { showToast(res.message, 'error'); return; }

    // Met à jour les compteurs et les couleurs des boutons
    const postEl = document.getElementById(`post-${postId}`);
    const btns   = postEl.querySelectorAll('.post-action-btn');

    // Remet tout en neutre
    btns[0].classList.remove('active-like');
    btns[1].classList.remove('active-dislike');
    btns[0].querySelector('i').className = 'fa-regular fa-thumbs-up';
    btns[1].querySelector('i').className = 'fa-regular fa-thumbs-down';

    // Applique la nouvelle réaction
    if (res.data.ma_reaction === 'like') {
        btns[0].classList.add('active-like');
        btns[0].querySelector('i').className = 'fa-solid fa-thumbs-up';
    } else if (res.data.ma_reaction === 'dislike') {
        btns[1].classList.add('active-dislike');
        btns[1].querySelector('i').className = 'fa-solid fa-thumbs-down';
    }

    document.getElementById(`likes-count-${postId}`).textContent    = `(${res.data.nb_likes})`;
    document.getElementById(`dislikes-count-${postId}`).textContent = `(${res.data.nb_dislikes})`;
}

// ============================================================
// COMMENTAIRES
// ============================================================
async function toggleComments(postId) {
    const section = document.getElementById(`comments-${postId}`);
    const isHidden = section.style.display === 'none';
    section.style.display = isHidden ? 'block' : 'none';
    if (isHidden) await loadComments(postId);
}

async function loadComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    const res  = await apiRequest(`/comments/index.php?post_id=${postId}`);

    if (!res.success) { list.innerHTML = '<p style="color:var(--danger);">Erreur.</p>'; return; }

    if (res.data.comments.length === 0) {
        list.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;padding:8px 0;">Aucun commentaire. Soyez le premier !</p>`;
        return;
    }

    list.innerHTML = res.data.comments.map(c => renderComment(c)).join('');
}

function renderComment(c) {
    const currentUser = Session.getUser();
    const isOwner     = c.user_id == currentUser.id;
    return `
    <div class="comment-item" id="comment-${c.id}">
        <img src="${avatarUrl(c.photo_profil)}" class="avatar avatar-sm" alt="Avatar">
        <div class="comment-bubble">
            <strong>${c.prenom} ${c.nom}</strong>
            <p>${c.contenu}</p>
            <div class="comment-meta">
                <span>${timeAgo(c.created_at)}</span>
                ${isOwner ? `<button onclick="handleDeleteComment(${c.id}, ${c.post_id})">Supprimer</button>` : ''}
            </div>
        </div>
    </div>`;
}

async function handleAddComment(postId) {
    const input   = document.getElementById(`comment-input-${postId}`);
    const contenu = input.value.trim();
    if (!contenu) return;

    input.value    = '';
    input.disabled = true;

    const res = await apiRequest('/comments/create.php', 'POST', { post_id: postId, contenu });
    input.disabled = false;

    if (!res.success) { showToast(res.message, 'error'); return; }

    const list = document.getElementById(`comments-list-${postId}`);
    // Enlève le message "aucun commentaire" si présent
    if (list.querySelector('p')) list.innerHTML = '';
    list.insertAdjacentHTML('beforeend', renderComment(res.data.comment));

    // Met à jour le compteur
    const count = document.getElementById(`comments-count-${postId}`);
    const nb    = parseInt(count.textContent.replace(/\D/g, '')) + 1;
    count.textContent = `(${nb})`;
}

function handleCommentKeypress(event, postId) {
    if (event.key === 'Enter') handleAddComment(postId);
}

async function handleDeleteComment(commentId, postId) {
    if (!confirm('Supprimer ce commentaire ?')) return;
    const res = await apiRequest('/comments/delete.php', 'POST', { comment_id: commentId });
    if (!res.success) { showToast(res.message, 'error'); return; }
    document.getElementById(`comment-${commentId}`)?.remove();
    showToast('Commentaire supprimé.', 'success');
}

// ============================================================
// SUPPRESSION DE POST
// ============================================================
function togglePostMenu(postId) {
    const menu = document.getElementById(`post-menu-${postId}`);
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
}

async function handleDeletePost(postId) {
    if (!confirm('Supprimer ce post définitivement ?')) return;
    const res = await apiRequest('/posts/delete.php', 'POST', { post_id: postId });
    if (!res.success) { showToast(res.message, 'error'); return; }
    document.getElementById(`post-${postId}`)?.remove();
    showToast('Post supprimé.', 'success');
}

// ============================================================
// SUGGESTIONS D'AMIS (sidebar)
// ============================================================
async function loadFriendSuggestions() {
    const container = document.getElementById('friend-suggestions');
    if (!container) return;

    const res = await apiRequest('/friends/suggestions.php');
    if (!res.success || res.data.users.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted);font-size:0.88rem;">Aucune suggestion pour l'instant.</p>`;
        return;
    }

    container.innerHTML = res.data.users.map(u => `
        <div class="suggestion-item">
            <img src="${avatarUrl(u.photo_profil)}" class="avatar avatar-sm" alt="Avatar">
            <span onclick="navigateTo('profile', ${u.id})" style="cursor:pointer;flex:1;">
                ${u.prenom} ${u.nom}
            </span>
            <button class="btn btn-primary btn-sm" onclick="handleSendFriendRequest(${u.id}, this)">
                <i class="fa-solid fa-user-plus"></i>
            </button>
        </div>`).join('');
}

async function handleSendFriendRequest(userId, btn) {
    const res = await apiRequest('/friends/send.php', 'POST', { recepteur_id: userId });
    if (!res.success) { showToast(res.message, 'error'); return; }
    btn.innerHTML    = '<i class="fa-solid fa-check"></i>';
    btn.disabled     = true;
    btn.classList.replace('btn-primary', 'btn-secondary');
    showToast('Demande envoyée !', 'success');
}
