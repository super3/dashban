// GitHub Authentication for Dashban — Clerk "Sign in with GitHub" only.
//
// Authentication is handled by Clerk (see clerk-auth.js). When a user signs in,
// GitHub API calls are routed through the backend proxy (/api/github), which
// attaches the user's own GitHub token — so no token is ever stored in the
// browser. The proxy is same-origin when the app is served by its backend, and
// cross-origin (an absolute Railway URL, see getApiBase) when served as a static
// build such as GitHub Pages. Unauthenticated visitors get read-only public
// access straight from api.github.com.

// GitHub configuration
const GITHUB_CONFIG = {
    apiBaseUrl: 'https://api.github.com',
    owner: 'super3',
    repo: 'dashban',
    appSlug: 'dashban'
};

// Origin of the backend API. The frontend can be served three ways:
//   • locally (localhost) — the dev server serves the API too, so relative paths.
//   • by the backend itself on Railway — same origin, relative paths work.
//   • as a static build on another host (e.g. GitHub Pages on dashban.com) —
//     there is no co-located API, so call the Railway backend by its absolute
//     URL (CORS is enabled server-side for this).
// `hostname` is injectable for testing; it defaults to the current page's host.
const BACKEND_ORIGIN = 'https://dashban-production.up.railway.app';
function getApiBase(hostname) {
    const host = hostname !== undefined ? hostname : window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
        return '';
    }
    return BACKEND_ORIGIN;
}

// GitHub authentication state. `mode` is 'clerk' when signed in via Clerk, else null.
let githubAuth = {
    isAuthenticated: false,
    user: null,
    mode: null
};

// Whether the user is authenticated (a Clerk session). The real GitHub token
// lives server-side, so there is nothing token-like to check in the browser.
function isGitHubAuthed() {
    return Boolean(githubAuth.isAuthenticated && githubAuth.mode === 'clerk');
}

// Build the URL and headers for a GitHub REST request.
//
// Authenticated calls go through the backend proxy (getApiBase() picks the right
// origin) with a short-lived Clerk session token — the proxy swaps in the user's
// real GitHub token. Anonymous calls go straight to GitHub for public, read-only
// access with no auth headers.
async function buildGitHubRequest(path, extraHeaders = {}) {
    const headers = { ...extraHeaders };

    if (isGitHubAuthed()) {
        const token = window.ClerkAuth ? await window.ClerkAuth.getToken() : null;
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            headers['Accept'] = 'application/vnd.github.v3+json';
        }
        return { url: `${getApiBase()}/api/github${path}`, headers };
    }

    return { url: `${GITHUB_CONFIG.apiBaseUrl}${path}`, headers };
}

// Perform a GitHub REST request through the appropriate transport for the
// current auth mode. `path` is everything after the API root.
async function githubFetch(path, options = {}) {
    const { url, headers } = await buildGitHubRequest(path, options.headers || {});
    return fetch(url, { ...options, headers });
}

// "Manage GitHub access" deep link. GitHub's only page that lands directly on an
// app's repository access is /settings/installations/<installation-id>, and that
// id is unique to each user's installation — it can't be hardcoded. So we look it
// up once (via the authenticated proxy: GET /user/installations) and cache it,
// falling back to the app's public page until/unless the lookup succeeds.
const MANAGE_ACCESS_FALLBACK_URL = `https://github.com/apps/${GITHUB_CONFIG.appSlug}`;
let manageAccessUrl = MANAGE_ACCESS_FALLBACK_URL;

async function refreshManageAccessUrl() {
    // Already resolved to a real installation, or no session to look it up with.
    if (manageAccessUrl !== MANAGE_ACCESS_FALLBACK_URL || !isGitHubAuthed()) {
        return manageAccessUrl;
    }
    try {
        const response = await githubFetch('/user/installations');
        if (response.ok) {
            const data = await response.json();
            const installation = (data.installations || []).find(
                (entry) => entry.app_slug === GITHUB_CONFIG.appSlug
            );
            if (installation) {
                manageAccessUrl = `https://github.com/settings/installations/${installation.id}`;
            }
        }
    } catch {
        // Network/parse error — keep the fallback URL.
    }
    return manageAccessUrl;
}

// Initialize auth UI. Clerk (clerk-auth.js, kicked off by github.js) drives the
// actual sign-in and calls back into updateGitHubSignInUI() when the session
// changes; here we just render the initial signed-out state.
function initializeGitHubAuth() {
    updateGitHubSignInUI();
    updateHeaderRepoName();
}

// Start the Clerk "Sign in with GitHub" flow.
function signInWithGitHub() {
    if (window.ClerkAuth) {
        window.ClerkAuth.signIn();
    }
}

// Sign out via Clerk; its listener (syncAuthState) then clears the shared state
// and refreshes the UI.
function signOutGitHub() {
    if (window.ClerkAuth) {
        window.ClerkAuth.signOut();
    }
}

function updateGitHubSignInUI() {
    // Find the GitHub button in header - it might have href="#" or the original URL
    const signInButton = document.querySelector('header a[href="https://github.com/super3/dashban"]') ||
                        document.querySelector('header a[href="#"]') ||
                        document.querySelector('header .flex.items-center.space-x-2:last-child a');
    if (!signInButton) {
        /* istanbul ignore next: warning only fires outside the jsdom test environment */
        if (typeof navigator !== 'undefined' && !navigator.userAgent.includes('jsdom')) {
            console.warn('⚠️ GitHub sign-in button not found in header');
        }
        return;
    }

    if (isGitHubAuthed() && githubAuth.user) {
        // Signed in - show the user menu dropdown.
        const container = signInButton.parentElement;
        container.style.position = 'relative';

        signInButton.innerHTML = `
            <i class="fas fa-user text-xs"></i>
            <span>${githubAuth.user.login}</span>
            <i class="fas fa-chevron-down text-xs"></i>
        `;
        signInButton.title = 'User menu';
        signInButton.href = '#';
        signInButton.className = 'flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200';
        signInButton.onclick = (e) => {
            e.preventDefault();
            toggleUserDropdown();
        };
    } else {
        // Signed out.
        signInButton.innerHTML = `
            <i class="fab fa-github"></i>
            <span>Sign in with GitHub</span>
        `;
        signInButton.title = 'Sign in with GitHub to create issues';
        signInButton.href = '#';
        signInButton.className = 'flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200';
        signInButton.onclick = (e) => {
            e.preventDefault();
            signInWithGitHub();
        };
    }

    // Update Add Issue button state
    updateAddIssueButtonState();
}

function updateAddIssueButtonState() {
    const addIssueButton = document.getElementById('add-task-btn');
    if (!addIssueButton) {
        return;
    }

    const isAuthenticated = isGitHubAuthed() && Boolean(githubAuth.user);

    if (isAuthenticated) {
        // Enable the button
        addIssueButton.disabled = false;
        addIssueButton.className = 'bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2';
        addIssueButton.title = 'Create a new GitHub issue';
    } else {
        // Disable the button
        addIssueButton.disabled = true;
        addIssueButton.className = 'bg-gray-400 cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2';
        addIssueButton.title = 'Sign in with GitHub first to create issues';
    }
}

// Toggle the signed-in user dropdown menu (Sign out).
function toggleUserDropdown() {
    const signInButton = document.querySelector('header a[href="#"]') ||
                        document.querySelector('header .flex.items-center.space-x-2:last-child a');
    if (!signInButton) return;

    const container = signInButton.parentElement;

    // Remove existing dropdown
    const existingDropdown = container.querySelector('.user-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
        return;
    }

    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'user-dropdown absolute right-0 top-full mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50';
    dropdown.innerHTML = `
        <a id="manage-github-access" href="${manageAccessUrl}" target="_blank" rel="noopener noreferrer"
           class="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 whitespace-nowrap">
            <i class="fas fa-key text-xs"></i>
            <span>Manage GitHub access</span>
        </a>
        <div class="border-t border-gray-100 my-1"></div>
        <button class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2">
            <i class="fas fa-sign-out-alt text-xs"></i>
            <span>Sign out</span>
        </button>
    `;

    // Add click handler for sign out
    dropdown.querySelector('button').onclick = () => {
        dropdown.remove();
        signOutGitHub();
    };

    // Close dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!container.contains(e.target)) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 0);

    container.appendChild(dropdown);

    // Look up the user's exact installation and upgrade the access link in place
    // (and cache it, so the next open renders the direct link immediately).
    refreshManageAccessUrl().then((url) => {
        dropdown.querySelector('#manage-github-access').setAttribute('href', url);
    });
}

// Function to update the header with repo name
function updateHeaderRepoName() {
    const repoNameElement = document.getElementById('repo-name');
    if (repoNameElement && GITHUB_CONFIG) {
        const { repo } = GITHUB_CONFIG;

        // Update just the repo name text
        repoNameElement.textContent = repo;
    }
}

// Export authentication functions and state
window.GitHubAuth = {
    // Configuration
    GITHUB_CONFIG,
    githubAuth,

    // Mode-aware request layer (used by github-api.js, repo.js and labels.js)
    isGitHubAuthed,
    getApiBase,
    buildGitHubRequest,
    githubFetch,

    // Authentication functions
    initializeGitHubAuth,
    signInWithGitHub,
    signOutGitHub,
    updateGitHubSignInUI,
    updateAddIssueButtonState,

    // UI functions
    toggleUserDropdown,
    updateHeaderRepoName,
    refreshManageAccessUrl
};
