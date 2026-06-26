// GitHub Authentication and Configuration for Dashban Kanban Board

// GitHub configuration
const GITHUB_CONFIG = {
    apiBaseUrl: 'https://api.github.com',
    owner: 'super3',
    repo: 'dashban'
};

// GitHub authentication state.
//
// `mode` records *how* the user is authenticated:
//   - 'pat'   : a Personal Access Token pasted by the user (talks to api.github.com
//               directly; this is the fallback used by the static GitHub Pages build).
//   - 'clerk' : signed in with GitHub via Clerk. GitHub calls are routed through the
//               server-side proxy (/api/github), which attaches the user's own token,
//               so `accessToken` stays null in the browser.
//   - null    : not authenticated.
let githubAuth = {
    isAuthenticated: false,
    accessToken: null,
    user: null,
    mode: null
};

// Whether the user is authenticated by either method. PAT mode requires a stored
// token; Clerk mode authenticates via the session (the token lives server-side).
function isGitHubAuthed() {
    return Boolean(githubAuth.isAuthenticated && (githubAuth.accessToken || githubAuth.mode === 'clerk'));
}

// Build the URL and headers for a GitHub REST request, honouring the auth mode.
//
// In Clerk mode the call is sent to the same-origin proxy with a Bearer session
// token; the proxy swaps in the user's real GitHub token. In PAT mode the call
// goes straight to GitHub with the classic `token` scheme. When unauthenticated
// (public, read-only browsing) no auth headers are sent — matching GitHub's
// anonymous access and keeping the request header set empty.
async function buildGitHubRequest(path, extraHeaders = {}) {
    const headers = { ...extraHeaders };

    if (githubAuth.mode === 'clerk') {
        const token = window.ClerkAuth ? await window.ClerkAuth.getToken() : null;
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
            headers['Accept'] = 'application/vnd.github.v3+json';
        }
        return { url: `/api/github${path}`, headers };
    }

    if (githubAuth.accessToken) {
        headers['Authorization'] = `token ${githubAuth.accessToken}`;
        headers['Accept'] = 'application/vnd.github.v3+json';
    }
    return { url: `${GITHUB_CONFIG.apiBaseUrl}${path}`, headers };
}

// Perform a GitHub REST request through the appropriate transport for the current
// auth mode. `path` is everything after the API root (e.g. `/repos/o/r/issues`).
async function githubFetch(path, options = {}) {
    const { url, headers } = await buildGitHubRequest(path, options.headers || {});
    return fetch(url, { ...options, headers });
}

// GitHub Token Modal Functions
function showGitHubTokenModal() {
    const gitHubTokenModal = document.getElementById('github-token-modal');
    const gitHubTokenInput = document.getElementById('github-token-input');
    if (gitHubTokenModal) {
        gitHubTokenModal.classList.remove('hidden');
        if (gitHubTokenInput) {
            setTimeout(() => gitHubTokenInput.focus(), 100);
        }
    }
}

function hideGitHubTokenModal() {
    const gitHubTokenModal = document.getElementById('github-token-modal');
    const gitHubTokenForm = document.getElementById('github-token-form');
    const gitHubTokenInput = document.getElementById('github-token-input');
    const tokenEyeIcon = document.getElementById('token-eye-icon');
    
    if (gitHubTokenModal) {
        gitHubTokenModal.classList.add('hidden');
        if (gitHubTokenForm) {
            gitHubTokenForm.reset();
        }
        // Reset password visibility
        if (gitHubTokenInput && tokenEyeIcon) {
            gitHubTokenInput.type = 'password';
            tokenEyeIcon.className = 'fas fa-eye';
        }
    }
}

// GitHub Personal Access Token Authentication Functions
function initializeGitHubAuth() {
    // Check for existing token
    const savedToken = localStorage.getItem('github_access_token');
    
    if (savedToken) {
        validateAndSetToken(savedToken);
        updateHeaderRepoName();
        return;
    }
    
    updateGitHubSignInUI();
    updateHeaderRepoName();
}

function signInWithGitHub() {
    // Prefer Clerk "Sign in with GitHub" when it is available (i.e. the backend
    // is present). Otherwise fall back to the Personal Access Token modal — this
    // is the path used by the static GitHub Pages build, which has no backend.
    if (window.ClerkAuth && window.ClerkAuth.isAvailable()) {
        window.ClerkAuth.signIn();
        return;
    }
    showGitHubTokenModal();
}

async function validateAndSetToken(token) {
    try {

        
        const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/user`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Invalid token');
        }
        
        const user = await response.json();
        
        // Store authentication (Personal Access Token mode)
        githubAuth.isAuthenticated = true;
        githubAuth.accessToken = token;
        githubAuth.user = user;
        githubAuth.mode = 'pat';

        localStorage.setItem('github_access_token', token);
        

        updateGitHubSignInUI();
        
        return true;
    } catch (error) {
        // Only log errors in non-test environments
        /* istanbul ignore next: this console logging only runs outside the Jest test environment */
        if (typeof jest === 'undefined') {
            console.error('❌ Token validation failed:', error);
        }
        signOutGitHub();
        return false;
    }
}

function signOutGitHub() {
    // A Clerk session is ended through Clerk; its listener then clears the shared
    // auth state via syncAuthState(), so there is nothing more to do here.
    if (githubAuth.mode === 'clerk' && window.ClerkAuth) {
        window.ClerkAuth.signOut();
        return;
    }

    // Clear authentication state
    githubAuth.isAuthenticated = false;
    githubAuth.accessToken = null;
    githubAuth.user = null;
    githubAuth.mode = null;

    // Clear stored access token
    localStorage.removeItem('github_access_token');
    
    // Update UI
    updateGitHubSignInUI();
    
    
    
    // Show reconnection message
    setTimeout(() => {
        if (window.location.href.includes('localhost') || window.location.href.includes('127.0.0.1')) {
            console.log('💡 To reconnect, click "Connect to GitHub" and add your Personal Access Token');
        }
    }, 100);
}

function updateGitHubSignInUI() {
    // Find the GitHub button in header - it might have href="#" or the original URL
    const signInButton = document.querySelector('header a[href="https://github.com/super3/dashban"]') || 
                        document.querySelector('header a[href="#"]') ||
                        document.querySelector('header .flex.items-center.space-x-2:last-child a');
    if (!signInButton) {
        // Only warn in non-test environments (when we're not in JSDOM)
        if (typeof navigator !== 'undefined' && !navigator.userAgent.includes('jsdom')) {
            console.warn('⚠️ GitHub sign-in button not found in header');
        }
        return;
    }
    

    
    if (githubAuth.isAuthenticated && githubAuth.accessToken && githubAuth.user) {
        // Fully authenticated - setup dropdown
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
        // Not authenticated
        signInButton.innerHTML = `
            <i class="fab fa-github"></i>
            <span>Connect to GitHub</span>
        `;
        signInButton.title = 'Add Personal Access Token to create issues';
        signInButton.href = '#';
        signInButton.className = 'flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200';
        signInButton.onclick = (e) => {
            e.preventDefault();
            signInWithGitHub();
        };
    }
    
    // Update GitHub option in form
    updateGitHubOptionUI();
    
    // Update Add Issue button state
    updateAddIssueButtonState();
}

function updateAddIssueButtonState() {
    const addIssueButton = document.getElementById('add-task-btn');
    if (!addIssueButton) {
        return;
    }
    
    const isAuthenticated = githubAuth.isAuthenticated && githubAuth.accessToken && githubAuth.user;
    
    if (isAuthenticated) {
        // Enable the button
        addIssueButton.disabled = false;
        addIssueButton.className = 'bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2';
        addIssueButton.title = 'Create a new GitHub issue';
    } else {
        // Disable the button
        addIssueButton.disabled = true;
        addIssueButton.className = 'bg-gray-400 cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2';
        addIssueButton.title = 'Connect to GitHub first to create issues';
    }
}

function promptForAccessToken() {
    showGitHubTokenModal();
}

function updateGitHubOptionUI() {
    // GitHub option UI has been removed from the Add Issue modal
    // This function is kept for backward compatibility but does nothing
    return;
}

// Initialize modal event listeners when DOM is loaded
function initializeAuthModalListeners() {
    // Set up GitHub token modal event listeners
    const gitHubTokenModal = document.getElementById('github-token-modal');
    const gitHubTokenForm = document.getElementById('github-token-form');
    const gitHubTokenInput = document.getElementById('github-token-input');
    const cancelGitHubTokenBtn = document.getElementById('cancel-github-token');
    const toggleTokenVisibilityBtn = document.getElementById('toggle-token-visibility');
    const tokenEyeIcon = document.getElementById('token-eye-icon');

    // Toggle token visibility
    if (toggleTokenVisibilityBtn && gitHubTokenInput && tokenEyeIcon) {
        toggleTokenVisibilityBtn.addEventListener('click', () => {
            if (gitHubTokenInput.type === 'password') {
                gitHubTokenInput.type = 'text';
                tokenEyeIcon.className = 'fas fa-eye-slash';
            } else {
                gitHubTokenInput.type = 'password';
                tokenEyeIcon.className = 'fas fa-eye';
            }
        });
    }

    // Handle cancel button
    if (cancelGitHubTokenBtn) {
        cancelGitHubTokenBtn.addEventListener('click', () => {
            hideGitHubTokenModal();
            updateGitHubSignInUI();
        });
    }

    // Handle form submission
    if (gitHubTokenForm) {
        gitHubTokenForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(gitHubTokenForm);
            const token = formData.get('token');
            
            if (!token || !token.trim()) {
                alert('Please enter a valid Personal Access Token');
                return;
            }

            const saveButton = gitHubTokenForm.querySelector('button[type="submit"]');
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Validating...';
            }

            try {
                const success = await validateAndSetToken(token.trim());
                if (success) {
                    hideGitHubTokenModal();
                    // Force UI update after modal closes
                    updateGitHubSignInUI();
                }
            } finally {
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.innerHTML = '<i class="fas fa-key mr-2"></i>Save Token';
                }
            }
        });
    }

    // Close modal when clicking outside
    if (gitHubTokenModal) {
        gitHubTokenModal.addEventListener('click', (e) => {
            if (e.target === gitHubTokenModal) {
                hideGitHubTokenModal();
                updateGitHubSignInUI();
            }
        });
    }
}

// Function to toggle user dropdown menu
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
    dropdown.className = 'user-dropdown absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50';
    dropdown.innerHTML = `
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

    // Mode-aware request layer (used by github-api.js and repo.js)
    isGitHubAuthed,
    buildGitHubRequest,
    githubFetch,

    // Authentication functions
    initializeGitHubAuth,
    signInWithGitHub,
    validateAndSetToken,
    signOutGitHub,
    updateGitHubSignInUI,
    updateGitHubOptionUI,
    updateAddIssueButtonState,
    promptForAccessToken,
    
    // Modal functions
    showGitHubTokenModal,
    hideGitHubTokenModal,
    initializeAuthModalListeners,
    
    // UI functions
    toggleUserDropdown,
    updateHeaderRepoName
}; 