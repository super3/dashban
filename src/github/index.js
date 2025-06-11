(function(windowObj, moduleObj) {
    const auth = (moduleObj && moduleObj.exports) ? require('./auth.js') : windowObj.GitHubAuth;
    const issues = (moduleObj && moduleObj.exports) ? require('./issues.js') : windowObj.GitHubIssues;
    const ui = (moduleObj && moduleObj.exports) ? require('./ui.js') : windowObj.GitHubUI;

    const GitHub = { ...auth, ...issues, ...ui };

    if (moduleObj && moduleObj.exports) {
        moduleObj.exports = GitHub;
    }
    if (windowObj) {
        windowObj.GitHub = GitHub;
    }

    if (windowObj && windowObj.document) {
        windowObj.document.addEventListener('DOMContentLoaded', function() {
            console.log('🔄 Initializing GitHub integration...');
            const gitHubTokenModal = document.getElementById('github-token-modal');
            const gitHubTokenForm = document.getElementById('github-token-form');
            const gitHubTokenInput = document.getElementById('github-token-input');
            const cancelGitHubTokenBtn = document.getElementById('cancel-github-token');
            const toggleTokenVisibilityBtn = document.getElementById('toggle-token-visibility');
            const tokenEyeIcon = document.getElementById('token-eye-icon');

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

            if (cancelGitHubTokenBtn) {
                cancelGitHubTokenBtn.addEventListener('click', () => {
                    auth.hideGitHubTokenModal();
                    auth.updateGitHubSignInUI();
                });
            }

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
                        const success = await auth.validateAndSetToken(token.trim());
                        if (success) {
                            auth.hideGitHubTokenModal();
                            auth.updateGitHubSignInUI();
                        }
                    } finally {
                        if (saveButton) {
                            saveButton.disabled = false;
                            saveButton.innerHTML = '<i class="fas fa-key mr-2"></i>Save Token';
                        }
                    }
                });
            }

            if (gitHubTokenModal) {
                gitHubTokenModal.addEventListener('click', (e) => {
                    if (e.target === gitHubTokenModal) {
                        auth.hideGitHubTokenModal();
                        auth.updateGitHubSignInUI();
                    }
                });
            }

            auth.initializeGitHubAuth();
            issues.initializeGitHubIssues();
            console.log('✅ GitHub integration initialized');
        });
    }
})(typeof window !== 'undefined' ? window : null, typeof module !== 'undefined' ? module : null);
