(function(windowObj, moduleObj) {
    const GITHUB_CONFIG = {
        appId: '1385203',
        redirectUri: windowObj.location ? windowObj.location.origin + windowObj.location.pathname : '',
        apiBaseUrl: 'https://api.github.com',
        owner: 'super3',
        repo: 'dashban',
        installationUrl: 'https://github.com/apps/dashban'
    };

    let githubAuth = {
        isAuthenticated: false,
        installationId: null,
        accessToken: null,
        user: null
    };

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
            if (gitHubTokenInput && tokenEyeIcon) {
                gitHubTokenInput.type = 'password';
                tokenEyeIcon.className = 'fas fa-eye';
            }
        }
    }

    function signInWithGitHub() {
        const installUrl = new URL(GITHUB_CONFIG.installationUrl);
        installUrl.searchParams.set('state', windowObj.location.href);
        windowObj.location.href = installUrl.toString();
    }

    async function handleInstallationCallback(installationId, authCode = null) {
        try {
            console.log('🔄 Processing GitHub App installation...');
            githubAuth.installationId = installationId;
            githubAuth.isAuthenticated = true;
            localStorage.setItem('github_installation_id', installationId);
            console.log('✅ GitHub App installed successfully!');
            if (authCode) {
                console.log('🔄 OAuth authorization code received');
                showGitHubTokenModal();
            } else {
                updateGitHubSignInUI();
            }
        } catch (error) {
            console.error('❌ Installation callback error:', error);
            alert('Installation failed. Please try again.');
        }
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
            githubAuth.isAuthenticated = true;
            githubAuth.accessToken = token;
            githubAuth.user = user;
            localStorage.setItem('github_access_token', token);
            console.log('✅ GitHub authentication successful:', user.login);
            updateGitHubSignInUI();
            return true;
        } catch (error) {
            if (typeof jest === 'undefined') {
                console.error('❌ Token validation failed:', error);
            }
            signOutGitHub();
            return false;
        }
    }

    async function validateAndSetInstallation(installationId) {
        try {
            console.log('🔄 Validating GitHub App installation...');
            githubAuth.installationId = installationId;
            githubAuth.isAuthenticated = true;
            const savedToken = localStorage.getItem('github_access_token');
            if (savedToken) {
                await validateAndSetToken(savedToken);
            } else {
                updateGitHubSignInUI();
            }
            return true;
        } catch (error) {
            console.error('❌ Installation validation failed:', error);
            signOutGitHub();
            return false;
        }
    }

    function signOutGitHub() {
        console.log('🔓 Signing out of GitHub App...');
        const hadInstallation = !!(githubAuth.installationId || localStorage.getItem('github_installation_id'));
        githubAuth.accessToken = null;
        githubAuth.user = null;
        if (hadInstallation) {
            githubAuth.isAuthenticated = true;
            console.log('🔄 Cleared access token but keeping app installation');
        } else {
            githubAuth.isAuthenticated = false;
            githubAuth.installationId = null;
        }
        localStorage.removeItem('github_access_token');
        updateGitHubSignInUI();
        console.log('✅ Successfully signed out and cleared access token');
        setTimeout(() => {
            if (windowObj.location.href.includes('localhost') || windowObj.location.href.includes('127.0.0.1')) {
                if (hadInstallation) {
                    console.log('💡 To reconnect, click "Add Access Token" to add your personal access token');
                } else {
                    console.log('💡 To reconnect, click "Install GitHub App" and add your access token');
                }
            }
        }, 100);
    }

    function updateGitHubSignInUI() {
        const signInButton = document.querySelector('header a[href="https://github.com/super3/dashban"]') ||
                            document.querySelector('header a[href="#"]') ||
                            document.querySelector('header .flex.items-center.space-x-2:last-child a');
        if (!signInButton) {
            if (typeof navigator !== 'undefined' && !navigator.userAgent.includes('jsdom')) {
                console.warn('⚠️ GitHub sign-in button not found in header');
            }
            return;
        }

        console.log('🔄 Updating GitHub Sign-In UI - Auth state:', {
            isAuthenticated: githubAuth.isAuthenticated,
            hasAccessToken: !!githubAuth.accessToken,
            hasUser: !!githubAuth.user,
            userLogin: githubAuth.user?.login,
            installationId: githubAuth.installationId,
            accessTokenLength: githubAuth.accessToken ? githubAuth.accessToken.length : 0,
            fullAuthObject: githubAuth
        });

        if (githubAuth.isAuthenticated && githubAuth.accessToken && githubAuth.user) {
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
        updateGitHubOptionUI();
    }

    function promptForAccessToken() {
        showGitHubTokenModal();
    }

    function updateGitHubOptionUI() {
        const gitHubOption = document.getElementById('github-option');
        const gitHubCheckbox = document.getElementById('create-github-issue');
        const gitHubStatusText = document.getElementById('github-status-text');
        if (!gitHubOption || !gitHubCheckbox || !gitHubStatusText) return;
        if (githubAuth.isAuthenticated && githubAuth.accessToken) {
            gitHubCheckbox.disabled = false;
            const userDisplay = githubAuth.user ? ` as ${githubAuth.user.login}` : '';
            gitHubStatusText.textContent = `Create real issues in the repository${userDisplay}`;
            gitHubStatusText.className = 'text-xs text-green-600 mt-0.5';
        } else if (githubAuth.isAuthenticated) {
            gitHubCheckbox.disabled = true;
            gitHubCheckbox.checked = false;
            gitHubStatusText.textContent = 'GitHub App installed. Add a Personal Access Token to create issues.';
            gitHubStatusText.className = 'text-xs text-orange-600 mt-0.5';
        } else {
            gitHubCheckbox.disabled = true;
            gitHubCheckbox.checked = false;
            gitHubStatusText.textContent = 'Install GitHub App to create real issues in the repository';
            gitHubStatusText.className = 'text-xs text-gray-500 mt-0.5';
        }
    }

    function initializeGitHubAuth() {
        const urlParams = new URLSearchParams(windowObj.location.search);
        const installationId = urlParams.get('installation_id');
        const setupAction = urlParams.get('setup_action');
        const code = urlParams.get('code');
        if (installationId && setupAction === 'install') {
            handleInstallationCallback(installationId, code);
            windowObj.history.replaceState({}, document.title, windowObj.location.pathname);
        } else {
            const savedInstallationId = localStorage.getItem('github_installation_id');
            const savedToken = localStorage.getItem('github_access_token');
            if (savedInstallationId) {
                validateAndSetInstallation(savedInstallationId);
            } else if (savedToken) {
                console.log('🔄 Found saved token without installation ID, validating...');
                githubAuth.isAuthenticated = true;
                validateAndSetToken(savedToken);
                return;
            }
        }
        updateGitHubSignInUI();
    }

    const exports = {
        GITHUB_CONFIG,
        githubAuth,
        initializeGitHubAuth,
        signInWithGitHub,
        handleInstallationCallback,
        validateAndSetToken,
        validateAndSetInstallation,
        signOutGitHub,
        updateGitHubSignInUI,
        updateGitHubOptionUI,
        promptForAccessToken,
        showGitHubTokenModal,
        hideGitHubTokenModal
    };

    if (moduleObj && moduleObj.exports) {
        moduleObj.exports = exports;
    } else if (windowObj) {
        windowObj.GitHubAuth = exports;
    }
})(typeof window !== 'undefined' ? window : null, typeof module !== 'undefined' ? module : null);
