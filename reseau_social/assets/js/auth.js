// ============================================================
// AUTH.JS — Gestion de l'authentification côté client
// ============================================================

// ============================================================
// RENDU DES PAGES D'AUTHENTIFICATION
// ============================================================

/**
 * Affiche la page de connexion
 */
function renderLoginPage() {
    // Vérifie si un token de réinitialisation est dans l'URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset_token')) {
        renderResetPasswordPage(params.get('reset_token'));
        return;
    }

    // Message de succès/info venant d'une redirection
    let alertHtml = '';
    if (params.get('success') === 'email_verifie') {
        alertHtml = `<div class="auth-alert success"><i class="fa-solid fa-check-circle"></i> Email vérifié ! Vous pouvez maintenant vous connecter.</div>`;
    }
    if (params.get('info') === 'deja_verifie') {
        alertHtml = `<div class="auth-alert info"><i class="fa-solid fa-circle-info"></i> Votre email est déjà vérifié.</div>`;
    }

    document.getElementById('auth-container').innerHTML = `
    <div class="auth-box">
        <div class="auth-header">
            <div class="logo-icon"><i class="fa-solid fa-globe"></i></div>
            <h1>${CONFIG?.SITE_NAME || 'MonRéseau'}</h1>
            <p>Connectez-vous avec vos amis</p>
        </div>
        <div class="auth-body">
            ${alertHtml}
            <div id="auth-alert"></div>
            <div class="form-group input-icon">
                <i class="fa-solid fa-envelope"></i>
                <input type="email" id="login-email" class="form-control" placeholder="Adresse email">
            </div>
            <div class="form-group input-icon">
                <i class="fa-solid fa-lock"></i>
                <input type="password" id="login-mdp" class="form-control" placeholder="Mot de passe">
                <button class="toggle-password" onclick="togglePasswordVisibility('login-mdp', this)">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </div>
            <span class="forgot-link" onclick="renderForgotPasswordPage()">Mot de passe oublié ?</span>
            <button id="btn-login" class="btn btn-primary btn-full" data-label="Se connecter" onclick="handleLogin()">
                Se connecter
            </button>
        </div>
        <div class="auth-footer">
            Pas encore de compte ? <a onclick="renderRegisterPage()">Créer un compte</a>
        </div>
    </div>`;

    // Connexion avec la touche Entrée
    document.getElementById('login-mdp').addEventListener('keypress', e => {
        if (e.key === 'Enter') handleLogin();
    });
}

/**
 * Affiche la page d'inscription
 */
function renderRegisterPage() {
    document.getElementById('auth-container').innerHTML = `
    <div class="auth-box">
        <div class="auth-header">
            <div class="logo-icon"><i class="fa-solid fa-user-plus"></i></div>
            <h1>Créer un compte</h1>
            <p>Rejoignez la communauté !</p>
        </div>
        <div class="auth-body">
            <div id="auth-alert"></div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div class="form-group">
                    <input type="text" id="reg-prenom" class="form-control" placeholder="Prénom">
                </div>
                <div class="form-group">
                    <input type="text" id="reg-nom" class="form-control" placeholder="Nom">
                </div>
            </div>
            <div class="form-group input-icon">
                <i class="fa-solid fa-envelope"></i>
                <input type="email" id="reg-email" class="form-control" placeholder="Adresse email">
            </div>
            <div class="form-group input-icon">
                <i class="fa-solid fa-lock"></i>
                <input type="password" id="reg-mdp" class="form-control" placeholder="Mot de passe (8 caractères min.)">
                <button class="toggle-password" onclick="togglePasswordVisibility('reg-mdp', this)">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </div>
            <div class="form-group input-icon">
                <i class="fa-solid fa-lock"></i>
                <input type="password" id="reg-mdp2" class="form-control" placeholder="Confirmer le mot de passe">
            </div>
            <button id="btn-register" class="btn btn-primary btn-full" data-label="Créer mon compte" onclick="handleRegister()">
                Créer mon compte
            </button>
        </div>
        <div class="auth-footer">
            Déjà un compte ? <a onclick="renderLoginPage()">Se connecter</a>
        </div>
    </div>`;
}

/**
 * Affiche la page "Mot de passe oublié"
 */
function renderForgotPasswordPage() {
    document.getElementById('auth-container').innerHTML = `
    <div class="auth-box">
        <div class="auth-header">
            <div class="logo-icon"><i class="fa-solid fa-key"></i></div>
            <h1>Mot de passe oublié</h1>
            <p>Entrez votre email pour recevoir un lien de réinitialisation</p>
        </div>
        <div class="auth-body">
            <div id="auth-alert"></div>
            <div class="form-group input-icon">
                <i class="fa-solid fa-envelope"></i>
                <input type="email" id="forgot-email" class="form-control" placeholder="Adresse email">
            </div>
            <button id="btn-forgot" class="btn btn-primary btn-full" data-label="Envoyer le lien" onclick="handleForgotPassword()">
                Envoyer le lien
            </button>
        </div>
        <div class="auth-footer">
            <a onclick="renderLoginPage()"><i class="fa-solid fa-arrow-left"></i> Retour à la connexion</a>
        </div>
    </div>`;
}

/**
 * Affiche la page de réinitialisation du mot de passe
 */
function renderResetPasswordPage(token) {
    document.getElementById('auth-container').innerHTML = `
    <div class="auth-box">
        <div class="auth-header">
            <div class="logo-icon"><i class="fa-solid fa-shield-halved"></i></div>
            <h1>Nouveau mot de passe</h1>
            <p>Choisissez un nouveau mot de passe sécurisé</p>
        </div>
        <div class="auth-body">
            <div id="auth-alert"></div>
            <div class="form-group input-icon">
                <i class="fa-solid fa-lock"></i>
                <input type="password" id="reset-mdp" class="form-control" placeholder="Nouveau mot de passe">
                <button class="toggle-password" onclick="togglePasswordVisibility('reset-mdp', this)">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </div>
            <div class="form-group input-icon">
                <i class="fa-solid fa-lock"></i>
                <input type="password" id="reset-mdp2" class="form-control" placeholder="Confirmer le mot de passe">
            </div>
            <button id="btn-reset" class="btn btn-primary btn-full" data-label="Réinitialiser" onclick="handleResetPassword('${token}')">
                Réinitialiser
            </button>
        </div>
    </div>`;
}

// ============================================================
// HANDLERS (logique des formulaires)
// ============================================================

/**
 * Gère la soumission du formulaire de connexion
 */
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const mdp   = document.getElementById('login-mdp').value;

    if (!email || !mdp) {
        showAuthAlert('Veuillez remplir tous les champs.', 'error');
        return;
    }

    setLoading('btn-login', true);

    const res = await apiRequest('/auth/login.php', 'POST', {
        email,
        mot_de_passe: mdp
    });

    setLoading('btn-login', false);

    if (!res.success) {
        showAuthAlert(res.message, 'error');
        return;
    }

    // Sauvegarde la session dans le sessionStorage
    Session.set(res.data.user, res.data.token);

    // Nettoie l'URL et affiche l'app
    window.history.replaceState({}, document.title, window.location.pathname);
    showApp();
    showToast('Bienvenue ' + res.data.user.prenom + ' !', 'success');
}

/**
 * Gère la soumission du formulaire d'inscription
 */
async function handleRegister() {
    const prenom = document.getElementById('reg-prenom').value.trim();
    const nom    = document.getElementById('reg-nom').value.trim();
    const email  = document.getElementById('reg-email').value.trim();
    const mdp    = document.getElementById('reg-mdp').value;
    const mdp2   = document.getElementById('reg-mdp2').value;

    if (!prenom || !nom || !email || !mdp || !mdp2) {
        showAuthAlert('Veuillez remplir tous les champs.', 'error');
        return;
    }
    if (mdp.length < 8) {
        showAuthAlert('Le mot de passe doit contenir au moins 8 caractères.', 'error');
        return;
    }
    if (mdp !== mdp2) {
        showAuthAlert('Les mots de passe ne correspondent pas.', 'error');
        return;
    }

    setLoading('btn-register', true);

    const res = await apiRequest('/auth/register.php', 'POST', {
        nom, prenom, email,
        mot_de_passe: mdp,
        mot_de_passe_confirm: mdp2
    });

    setLoading('btn-register', false);

    if (!res.success) {
        showAuthAlert(res.message, 'error');
        return;
    }

    showAuthAlert('✅ ' + res.message, 'success');
    setTimeout(() => renderLoginPage(), 3000);
}

/**
 * Gère la demande de réinitialisation de mot de passe
 */
async function handleForgotPassword() {
    const email = document.getElementById('forgot-email').value.trim();

    if (!email) {
        showAuthAlert('Veuillez entrer votre adresse email.', 'error');
        return;
    }

    setLoading('btn-forgot', true);

    const res = await apiRequest('/auth/forgot-password.php', 'POST', { email });

    setLoading('btn-forgot', false);
    showAuthAlert(res.message, res.success ? 'success' : 'error');
}

/**
 * Gère la soumission du nouveau mot de passe
 */
async function handleResetPassword(token) {
    const mdp  = document.getElementById('reset-mdp').value;
    const mdp2 = document.getElementById('reset-mdp2').value;

    if (!mdp || !mdp2) {
        showAuthAlert('Veuillez remplir tous les champs.', 'error');
        return;
    }
    if (mdp !== mdp2) {
        showAuthAlert('Les mots de passe ne correspondent pas.', 'error');
        return;
    }

    setLoading('btn-reset', true);

    const res = await apiRequest('/auth/reset-password.php', 'POST', {
        token,
        mot_de_passe: mdp,
        mot_de_passe_confirm: mdp2
    });

    setLoading('btn-reset', false);

    if (!res.success) {
        showAuthAlert(res.message, 'error');
        return;
    }

    showAuthAlert('✅ ' + res.message, 'success');
    setTimeout(() => {
        window.history.replaceState({}, document.title, window.location.pathname);
        renderLoginPage();
    }, 2000);
}

// ============================================================
// FONCTIONS UTILITAIRES AUTH
// ============================================================

/**
 * Affiche un message d'alerte dans le formulaire auth
 */
function showAuthAlert(message, type = 'error') {
    const el = document.getElementById('auth-alert');
    if (el) {
        el.innerHTML = `<div class="auth-alert ${type}">
            <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'info' ? 'fa-circle-info' : 'fa-circle-xmark'}"></i>
            ${message}
        </div>`;
    }
}

/**
 * Affiche/cache le mot de passe dans un champ
 */
function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    const icon  = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}
