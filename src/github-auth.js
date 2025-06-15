// GitHub Authentication and Configuration for Dashban Kanban Board

// GitHub configuration
const GITHUB_CONFIG = {
    apiBaseUrl: 'https://api.github.com',
    owner: 'super3',
    repo: 'dashban'
};

// GitHub authentication state
let githubAuth = {
    isAuthenticated: false,
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

// GitHub Personal Access Token Authentication Functions
function initializeGitHubAuth() {
    // Check for existing token
    const savedToken = localStorage.getItem('github_access_token');
    
    if (savedToken) {
        console.log('🔄 Found saved token, validating...');
        validateAndSetToken(savedToken);
        return;
    }
    
    updateGitHubSignInUI();
}

function signInWithGitHub() {
    // Show the GitHub token modal for Personal Access Token input
    showGitHubTokenModal();
}

async function validateAndSetToken(token) {
    try {
        console.log('🔄 Validating GitHub token...');
        
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
        
        console.log('✅ GitHub authentication successful:', user.login);
        updateGitHubSignInUI();
        
        return true;
    } catch (error) {
        // Only log errors in non-test environments
        if (typeof jest === 'undefined') {
            console.error('❌ Token validation failed:', error);
        }
        signOutGitHub();
        return false;
    }
}

function signOutGitHub() {
    console.log('🔓 Signing out of GitHub...');
    
    // Clear authentication state
    githubAuth.isAuthenticated = false;
    githubAuth.accessToken = null;
    githubAuth.user = null;
    
    // Clear stored access token
    localStorage.removeItem('github_access_token');
    
    // Update UI
    updateGitHubSignInUI();
    
    console.log('✅ Successfully signed out and cleared access token');
    
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
    
    // Debug logging to see authentication state
    console.log('🔄 Updating GitHub Sign-In UI - Auth state:', {
        isAuthenticated: githubAuth.isAuthenticated,
        hasAccessToken: !!githubAuth.accessToken,
        hasUser: !!githubAuth.user,
        userLogin: githubAuth.user?.login,
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
            signOutGitHub();
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
    validateAndSetToken,
    signOutGitHub,
    updateGitHubSignInUI,
    updateGitHubOptionUI,
    promptForAccessToken,
    
    // Modal functions
    showGitHubTokenModal,
    hideGitHubTokenModal,
    initializeAuthModalListeners
}; 