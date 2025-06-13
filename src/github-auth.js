// GitHub Authentication and Configuration for Dashban Kanban Board

// GitHub App configuration
const GITHUB_CONFIG = {
    appId: '1385203', // Replace with your GitHub App ID
    redirectUri: window.location.origin + window.location.pathname,
    apiBaseUrl: 'https://api.github.com',
    owner: 'super3',
    repo: 'dashban',
    installationUrl: 'https://github.com/apps/dashban' // Replace with your app name
};

// GitHub App authentication state
let githubAuth = {
    isAuthenticated: false,
    installationId: null,
    accessToken: null,
    user: null
};

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

// GitHub App Authentication Functions
function initializeGitHubAuth() {
    // Check if we're returning from GitHub App installation/authorization
    const urlParams = new URLSearchParams(window.location.search);
    const installationId = urlParams.get('installation_id');
    const setupAction = urlParams.get('setup_action');
    const code = urlParams.get('code');
    
    if (installationId && setupAction === 'install') {
        // Handle GitHub App installation with OAuth authorization
        handleInstallationCallback(installationId, code);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
    } else {
        // Check for existing installation
        const savedInstallationId = localStorage.getItem('github_installation_id');
        const savedToken = localStorage.getItem('github_access_token');
        
        if (savedInstallationId) {
            validateAndSetInstallation(savedInstallationId);
        } else if (savedToken) {
            // We have a token but no installation ID - try to validate token
            Logger.info('🔄 Found saved token without installation ID, validating...');
            githubAuth.isAuthenticated = true; // Assume app is installed
            validateAndSetToken(savedToken);
            return; // Don't call updateGitHubSignInUI() yet, let validateAndSetToken() do it
        }
    }
    
    updateGitHubSignInUI();
}

function signInWithGitHub() {
    // For GitHub Apps, we redirect to the installation URL
    // This will install the app on the user's account/organization
    const installUrl = new URL(GITHUB_CONFIG.installationUrl);
    installUrl.searchParams.set('state', window.location.href); // Return to current page
    
    // Redirect to GitHub App installation
    window.location.href = installUrl.toString();
}

async function handleInstallationCallback(installationId, authCode = null) {
    try {
        Logger.info('🔄 Processing GitHub App installation...');
        
        // Store installation ID
        githubAuth.installationId = installationId;
        githubAuth.isAuthenticated = true;
        localStorage.setItem('github_installation_id', installationId);
        
        Logger.info('✅ GitHub App installed successfully!');
        
        if (authCode) {
            // We have an OAuth authorization code
            Logger.info('🔄 OAuth authorization code received');
            
            // Show the GitHub token modal instead of browser prompt
            showGitHubTokenModal();
        } else {
            // No OAuth code, just installation
            updateGitHubSignInUI();
        }
    } catch (error) {
        Logger.error('❌ Installation callback error:', error);
        alert('Installation failed. Please try again.');
    }
}

async function validateAndSetToken(token) {
    try {
        Logger.info('🔄 Validating GitHub token...');
        
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
        
        // Store authentication
        githubAuth.isAuthenticated = true;
        githubAuth.accessToken = token;
        githubAuth.user = user;
        
        localStorage.setItem('github_access_token', token);
        
        Logger.info('✅ GitHub authentication successful:', user.login);
        updateGitHubSignInUI();
        
        return true;
    } catch (error) {
        // Only log errors in non-test environments
        if (typeof jest === 'undefined') {
            Logger.error('❌ Token validation failed:', error);
        }
        signOutGitHub();
        return false;
    }
}

async function validateAndSetInstallation(installationId) {
    try {
        Logger.info('🔄 Validating GitHub App installation...');
        
        // Store installation
        githubAuth.installationId = installationId;
        githubAuth.isAuthenticated = true;
        
        // Check for existing token
        const savedToken = localStorage.getItem('github_access_token');
        if (savedToken) {
            await validateAndSetToken(savedToken);
        } else {
            updateGitHubSignInUI();
        }
        
        return true;
    } catch (error) {
        Logger.error('❌ Installation validation failed:', error);
        signOutGitHub();
        return false;
    }
}

function signOutGitHub() {
    Logger.info('🔓 Signing out of GitHub App...');
    
    // Check if app was installed before clearing state
    const hadInstallation = !!(githubAuth.installationId || localStorage.getItem('github_installation_id'));
    
    // Clear authentication state but preserve installation if it existed
    githubAuth.accessToken = null;
    githubAuth.user = null;
    
    if (hadInstallation) {
        // Keep installation state, just remove token
        githubAuth.isAuthenticated = true; // App still installed
        Logger.info('🔄 Cleared access token but keeping app installation');
    } else {
        // No installation, clear everything
        githubAuth.isAuthenticated = false;
        githubAuth.installationId = null;
    }
    
    // Clear stored access token only
    localStorage.removeItem('github_access_token');
    
    // Update UI
    updateGitHubSignInUI();
    
    Logger.info('✅ Successfully signed out and cleared access token');
    
    // Show appropriate reconnection message
    setTimeout(() => {
        if (window.location.href.includes('localhost') || window.location.href.includes('127.0.0.1')) {
            if (hadInstallation) {
                Logger.info('💡 To reconnect, click "Add Access Token" to add your personal access token');
            } else {
                Logger.info('💡 To reconnect, click "Install GitHub App" and add your access token');
            }
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
            Logger.warn('⚠️ GitHub sign-in button not found in header');
        }
        return;
    }
    
    // Debug logging to see authentication state
    Logger.info('🔄 Updating GitHub Sign-In UI - Auth state:', {
        isAuthenticated: githubAuth.isAuthenticated,
        hasAccessToken: !!githubAuth.accessToken,
        hasUser: !!githubAuth.user,
        userLogin: githubAuth.user?.login,
        installationId: githubAuth.installationId,
        accessTokenLength: githubAuth.accessToken ? githubAuth.accessToken.length : 0,
        fullAuthObject: githubAuth
    });
    
    if (githubAuth.isAuthenticated && githubAuth.accessToken && githubAuth.user) {
        // Fully authenticated
        signInButton.innerHTML = `
            <i class="fab fa-github"></i>
            <span>Signed in as ${githubAuth.user.login}</span>
            <i class="fas fa-sign-out-alt text-xs"></i>
        `;
        signInButton.title = 'Click to sign out';
        signInButton.href = '#';
        signInButton.className = 'flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200';
        signInButton.onclick = (e) => {
            e.preventDefault();
            if (confirm('Sign out of GitHub?')) {
                signOutGitHub();
            }
        };
    } else if (githubAuth.isAuthenticated) {
        // App installed but no token
        signInButton.innerHTML = `
            <i class="fab fa-github"></i>
            <span>Add Access Token</span>
            <i class="fas fa-key text-xs"></i>
        `;
        signInButton.title = 'Add Personal Access Token to create issues';
        signInButton.href = '#';
        signInButton.className = 'flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200';
        signInButton.onclick = (e) => {
            e.preventDefault();
            promptForAccessToken();
        };
    } else {
        // Not installed
        signInButton.innerHTML = `
            <i class="fab fa-github"></i>
            <span>Install GitHub App</span>
        `;
        signInButton.title = 'Install GitHub App to create issues';
        signInButton.href = '#';
        signInButton.className = 'flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200';
        signInButton.onclick = (e) => {
            e.preventDefault();
            signInWithGitHub();
        };
    }
    
    // Update GitHub option in form
    updateGitHubOptionUI();
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

// Export authentication functions and state
window.GitHubAuth = {
    // Configuration
    GITHUB_CONFIG,
    githubAuth,
    
    // Authentication functions
    initializeGitHubAuth,
    signInWithGitHub,
    handleInstallationCallback,
    validateAndSetToken,
    validateAndSetInstallation,
    signOutGitHub,
    updateGitHubSignInUI,
    updateGitHubOptionUI,
    promptForAccessToken,
    
    // Modal functions
    showGitHubTokenModal,
    hideGitHubTokenModal,
    initializeAuthModalListeners
}; 