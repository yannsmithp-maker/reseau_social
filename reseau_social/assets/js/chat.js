// ============================================================
// CHAT.JS — Module de messagerie
// ============================================================

let currentConversationId = null;
let chatRefreshInterval   = null;
let lastMessageId         = 0;

// ============================================================
// RENDU PRINCIPAL DU CHAT
// ============================================================
async function renderChat(targetUserId = null) {
    document.getElementById('page-content').innerHTML = `
    <div class="chat-layout">

        <!-- Sidebar : liste des conversations -->
        <aside class="chat-sidebar">
            <div class="chat-sidebar-header">
                <h3>Messages</h3>
                <button onclick="openNewChatModal()" title="Nouvelle conversation">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
            </div>
            <div class="chat-search">
                <i class="fa-solid fa-magnifying-glass"></i>
                <input type="text" id="chat-search-input" placeholder="Rechercher une conversation..."
                       oninput="filterConversations(this.value)">
            </div>
            <div id="conversations-list">
                <p class="text-muted" style="padding:16px;">Chargement...</p>
            </div>
        </aside>

        <!-- Zone principale de chat -->
        <main class="chat-main" id="chat-main">
            <div class="chat-empty">
                <i class="fa-regular fa-comment-dots"></i>
                <p>Sélectionnez une conversation pour commencer</p>
                <button class="btn btn-primary btn-sm" onclick="openNewChatModal()">
                    <i class="fa-solid fa-user-plus"></i> Nouveau message
                </button>
            </div>
        </main>
    </div>

    <!-- Modal nouvelle conversation -->
    <div id="new-chat-modal" class="modal-overlay" style="display:none;" onclick="closeNewChatModal(event)">
        <div class="modal">
            <div class="modal-header">
                <h3>Nouvelle conversation</h3>
                <button class="modal-close" onclick="closeNewChatModal()"><i class="fa-solid fa-xmark"></i></button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <input type="text" id="new-chat-search" class="form-control"
                           placeholder="Rechercher un ami..." oninput="searchFriendsForChat(this.value)">
                </div>
                <div id="chat-friends-list"></div>
            </div>
        </div>
    </div>`;

    await loadConversations();

    // Si un utilisateur cible est fourni, ouvre directement sa conversation
    if (targetUserId) {
        openConversationWithUser(targetUserId);
    }
}

// ============================================================
// LISTE DES CONVERSATIONS
// ============================================================
async function loadConversations() {
    const res = await apiRequest('/messages/conversations.php');
    if (!res.success) return;

    const container = document.getElementById('conversations-list');

    if (res.data.conversations.length === 0) {
        container.innerHTML = `<p class="text-muted" style="padding:16px;text-align:center;">
            Aucune conversation.<br>Envoyez un message à un ami !
        </p>`;
        return;
    }

    container.innerHTML = res.data.conversations.map(c => renderConversationItem(c)).join('');
}

function renderConversationItem(c) {
    const isActive  = c.conversation_id == currentConversationId ? 'active' : '';
    const lastMsg   = c.dernier_message || (c.dernier_image ? '📷 Image' : '');
    const unreadBdg = c.non_lus > 0 ? `<span class="conv-unread">${c.non_lus}</span>` : '';

    return `
    <div class="conversation-item ${isActive}" id="conv-item-${c.conversation_id}"
         onclick="openConversation(${c.conversation_id}, ${c.user_id})">
        <div class="conv-avatar-wrap">
            <img src="${avatarUrl(c.photo_profil)}" class="avatar avatar-md" alt="Avatar">
            <span class="conv-online-dot"></span>
        </div>
        <div class="conv-info">
            <div class="conv-top">
                <strong>${c.prenom} ${c.nom}</strong>
                <span class="conv-time">${c.dernier_at ? timeAgo(c.dernier_at) : ''}</span>
            </div>
            <div class="conv-bottom">
                <span class="conv-last-msg">${lastMsg || 'Démarrez la conversation'}</span>
                ${unreadBdg}
            </div>
        </div>
    </div>`;
}

function filterConversations(query) {
    const items = document.querySelectorAll('.conversation-item');
    items.forEach(item => {
        const name = item.querySelector('strong').textContent.toLowerCase();
        item.style.display = name.includes(query.toLowerCase()) ? 'flex' : 'none';
    });
}

// ============================================================
// OUVERTURE D'UNE CONVERSATION
// ============================================================
async function openConversation(conversationId, userId) {
    // Stoppe le polling précédent
    if (chatRefreshInterval) clearInterval(chatRefreshInterval);

    currentConversationId = conversationId;
    lastMessageId         = 0;

    // Marque la conversation comme active dans la sidebar
    document.querySelectorAll('.conversation-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`conv-item-${conversationId}`)?.classList.add('active');

    // Charge les infos de l'utilisateur
    const res = await apiRequest(`/users/profile.php?id=${userId}`);
    if (!res.success) return;

    const otherUser = res.data.user;
    renderChatWindow(conversationId, otherUser);
    await loadMessages(conversationId);

    // Démarre le polling toutes les 3 secondes
    chatRefreshInterval = setInterval(() => pollNewMessages(conversationId), CONFIG.CHAT_INTERVAL);
}

async function openConversationWithUser(userId) {
    // Cherche si une conversation existe déjà avec cet utilisateur
    const res = await apiRequest('/messages/conversations.php');
    if (res.success) {
        const existing = res.data.conversations.find(c => c.user_id == userId);
        if (existing) {
            openConversation(existing.conversation_id, userId);
            return;
        }
    }
    // Sinon, ouvre une fenêtre de chat vide avec cet utilisateur
    const userRes = await apiRequest(`/users/profile.php?id=${userId}`);
    if (!userRes.success) return;
    renderChatWindow(null, userRes.data.user);
}

// ============================================================
// FENÊTRE DE CHAT
// ============================================================
function renderChatWindow(conversationId, otherUser) {
    document.getElementById('chat-main').innerHTML = `
    <div class="chat-window">
        <!-- Header de la conversation -->
        <div class="chat-header">
            <img src="${avatarUrl(otherUser.photo_profil)}" class="avatar avatar-md" alt="Avatar">
            <div>
                <strong>${otherUser.prenom} ${otherUser.nom}</strong>
                <span class="text-muted" style="font-size:0.8rem;">Actif récemment</span>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="navigateTo('profile', ${otherUser.id})" style="margin-left:auto;">
                <i class="fa-solid fa-user"></i> Profil
            </button>
        </div>

        <!-- Messages -->
        <div class="messages-area" id="messages-area">
            <p class="text-muted" style="text-align:center;padding:32px;">Chargement...</p>
        </div>

        <!-- Zone de saisie -->
        <div class="chat-input-area">
            <label for="chat-img-input" class="chat-img-btn" title="Envoyer une image">
                <i class="fa-solid fa-image"></i>
            </label>
            <input type="file" id="chat-img-input" accept="image/*" style="display:none;"
                   onchange="handleSendImage(this, ${otherUser.id}, ${conversationId || 'null'})">
            <input type="text" id="chat-message-input" class="chat-input"
                   placeholder="Écrire un message..."
                   onkeypress="handleChatKeypress(event, ${otherUser.id}, ${conversationId || 'null'})">
            <button class="chat-send-btn" onclick="handleSendMessage(${otherUser.id}, ${conversationId || 'null'})">
                <i class="fa-solid fa-paper-plane"></i>
            </button>
        </div>
    </div>`;
}

// ============================================================
// CHARGEMENT DES MESSAGES
// ============================================================
async function loadMessages(conversationId) {
    const area = document.getElementById('messages-area');
    if (!area) return;

    const res = await apiRequest(`/messages/index.php?conversation_id=${conversationId}`);
    if (!res.success) { area.innerHTML = '<p class="text-muted" style="text-align:center;">Erreur.</p>'; return; }

    if (res.data.messages.length === 0) {
        area.innerHTML = '<p class="text-muted" style="text-align:center;padding:32px;">Aucun message. Dites bonjour !</p>';
        return;
    }

    area.innerHTML = res.data.messages.map(m => renderMessage(m)).join('');

    // Enregistre le dernier ID pour le polling
    lastMessageId = res.data.messages.at(-1)?.id || 0;

    // Scroll vers le bas
    area.scrollTop = area.scrollHeight;

    // Met à jour le badge non lus dans la navbar
    updateMsgBadge();
}

// Polling : récupère uniquement les nouveaux messages
async function pollNewMessages(conversationId) {
    const area = document.getElementById('messages-area');
    if (!area || !currentConversationId) return;

    const res = await apiRequest(`/messages/index.php?conversation_id=${conversationId}&after=${lastMessageId}`);
    if (!res.success || !res.data.messages.length) return;

    // Retire le message "Aucun message" si présent
    if (area.querySelector('p')) area.innerHTML = '';

    res.data.messages.forEach(m => {
        area.insertAdjacentHTML('beforeend', renderMessage(m));
        lastMessageId = m.id;
    });

    area.scrollTop = area.scrollHeight;
}

function renderMessage(m) {
    const currentUser = Session.getUser();
    const isMine      = m.expediteur_id == currentUser.id;

    return `
    <div class="message-wrap ${isMine ? 'mine' : 'theirs'}">
        ${!isMine ? `<img src="${avatarUrl(m.photo_profil)}" class="avatar avatar-sm" alt="Avatar">` : ''}
        <div class="message-bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}">
            ${m.contenu ? `<p>${m.contenu}</p>` : ''}
            ${m.image   ? `<img src="${avatarUrl('').replace('default.png','') + m.image}" class="msg-image" alt="Image">` : ''}
            <span class="msg-time">${timeAgo(m.created_at)}</span>
        </div>
    </div>`;
}

// ============================================================
// ENVOI DE MESSAGES
// ============================================================
async function handleSendMessage(recepteurId, conversationId) {
    const input   = document.getElementById('chat-message-input');
    const contenu = input.value.trim();
    if (!contenu) return;

    input.value = '';

    const body = { contenu };
    if (conversationId) body.conversation_id = conversationId;
    else                body.recepteur_id    = recepteurId;

    const res = await apiRequest('/messages/send.php', 'POST', body);
    if (!res.success) { showToast(res.message, 'error'); return; }

    // Si nouvelle conversation, met à jour l'ID
    if (!currentConversationId) {
        currentConversationId = res.data.conversation_id;
        chatRefreshInterval = setInterval(
            () => pollNewMessages(currentConversationId), CONFIG.CHAT_INTERVAL
        );
    }

    const area = document.getElementById('messages-area');
    if (area?.querySelector('p')) area.innerHTML = '';
    area?.insertAdjacentHTML('beforeend', renderMessage(res.data.message));
    if (area) area.scrollTop = area.scrollHeight;
    lastMessageId = res.data.message.id;

    await loadConversations(); // Rafraîchit la sidebar
}

function handleChatKeypress(event, recepteurId, conversationId) {
    if (event.key === 'Enter') handleSendMessage(recepteurId, conversationId);
}

async function handleSendImage(input, recepteurId, conversationId) {
    const file = input.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);
    if (conversationId) formData.append('conversation_id', conversationId);
    else                formData.append('recepteur_id',    recepteurId);

    const res = await apiRequest('/messages/send.php', 'POST', formData);
    if (!res.success) { showToast(res.message, 'error'); return; }

    if (!currentConversationId) currentConversationId = res.data.conversation_id;

    const area = document.getElementById('messages-area');
    if (area?.querySelector('p')) area.innerHTML = '';
    area?.insertAdjacentHTML('beforeend', renderMessage(res.data.message));
    if (area) area.scrollTop = area.scrollHeight;
    lastMessageId = res.data.message.id;

    input.value = '';
    await loadConversations();
}

// ============================================================
// NOUVELLE CONVERSATION
// ============================================================
function openNewChatModal() {
    document.getElementById('new-chat-modal').style.display = 'flex';
    document.getElementById('chat-friends-list').innerHTML  = '<p class="text-muted">Chargement...</p>';
    loadFriendsForChat();
}

function closeNewChatModal(event) {
    if (!event || event.target.id === 'new-chat-modal') {
        document.getElementById('new-chat-modal').style.display = 'none';
    }
}

async function loadFriendsForChat() {
    const res = await apiRequest('/friends/index.php');
    if (!res.success) return;

    const container = document.getElementById('chat-friends-list');
    if (res.data.amis.length === 0) {
        container.innerHTML = '<p class="text-muted">Aucun ami pour l\'instant.</p>';
        return;
    }

    container.innerHTML = res.data.amis.map(a => `
    <div class="chat-friend-item" onclick="startChatWith(${a.id})">
        <img src="${avatarUrl(a.photo_profil)}" class="avatar avatar-md" alt="Avatar">
        <strong>${a.prenom} ${a.nom}</strong>
    </div>`).join('');
}

async function searchFriendsForChat(query) {
    if (query.length < 2) { loadFriendsForChat(); return; }
    const res = await apiRequest(`/users/search.php?q=${encodeURIComponent(query)}`);
    const container = document.getElementById('chat-friends-list');
    if (!res.success || !res.data.users.length) {
        container.innerHTML = '<p class="text-muted">Aucun résultat.</p>';
        return;
    }
    const amis = res.data.users.filter(u => u.relation === 'accepte');
    container.innerHTML = amis.map(a => `
    <div class="chat-friend-item" onclick="startChatWith(${a.id})">
        <img src="${avatarUrl(a.photo_profil)}" class="avatar avatar-md" alt="Avatar">
        <strong>${a.prenom} ${a.nom}</strong>
    </div>`).join('');
}

function startChatWith(userId) {
    closeNewChatModal();
    navigateTo('chat', userId);
}

// ============================================================
// BADGE DE MESSAGES NON LUS
// ============================================================
async function updateMsgBadge() {
    const res = await apiRequest('/messages/conversations.php');
    if (!res.success) return;
    const total  = res.data.conversations.reduce((acc, c) => acc + parseInt(c.non_lus || 0), 0);
    const badge  = document.getElementById('msg-badge');
    if (!badge) return;
    badge.textContent    = total;
    badge.style.display  = total > 0 ? 'block' : 'none';
}
