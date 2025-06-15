/**
 * GitHub Authentication Tests for Personal Access Token functionality
 */

describe('GitHub Authentication', () => {
    let container;
    let originalFetch;
    let originalLocalStorage;

    beforeEach(() => {
        // Store originals
        originalFetch = global.fetch;
        originalLocalStorage = global.localStorage;

        // Create test DOM
        container = document.createElement('div');
        container.innerHTML = `
            <header>
                <a href="https://github.com/super3/dashban" target="_blank" class="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200">
                    <i class="fab fa-github"></i>
                    <span>Connect to GitHub</span>
                </a>
            </header>
            <div id="github-token-modal" class="hidden">
                <form id="github-token-form">
                    <input type="text" id="github-token-input" name="token" />
                    <button type="button" id="cancel-github-token">Cancel</button>
                    <button type="button" id="toggle-token-visibility">
                        <i class="fas fa-eye" id="token-eye-icon"></i>
                    </button>
                    <button type="submit">Save Token</button>
                </form>
            </div>
        `;
        document.body.appendChild(container);

        // Clear require cache and load fresh module
        delete require.cache[require.resolve('../src/github-auth.js')];
        require('../src/github-auth.js');
    });

    afterEach(() => {
        // Clean up DOM
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        
        // Restore originals
        global.fetch = originalFetch;
        global.localStorage = originalLocalStorage;
        
        // Reset auth state if it exists
        if (global.window && global.window.GitHubAuth) {
            global.window.GitHubAuth.githubAuth.isAuthenticated = false;
            global.window.GitHubAuth.githubAuth.accessToken = null;
            global.window.GitHubAuth.githubAuth.user = null;
        }
    });

    describe('Configuration', () => {
        test('should have correct GITHUB_CONFIG', () => {
            expect(window.GitHubAuth.GITHUB_CONFIG.apiBaseUrl).toBe('https://api.github.com');
            expect(window.GitHubAuth.GITHUB_CONFIG.owner).toBe('super3');
            expect(window.GitHubAuth.GITHUB_CONFIG.repo).toBe('dashban');
        });

        test('should initialize with correct default state', () => {
            expect(window.GitHubAuth.githubAuth.isAuthenticated).toBe(false);
            expect(window.GitHubAuth.githubAuth.accessToken).toBeNull();
            expect(window.GitHubAuth.githubAuth.user).toBeNull();
        });
    });

    describe('Token Modal Functions', () => {
        test('showGitHubTokenModal should show modal', () => {
            const modal = document.getElementById('github-token-modal');
            
            window.GitHubAuth.showGitHubTokenModal();
            
            expect(modal.classList.contains('hidden')).toBe(false);
        });

        test('hideGitHubTokenModal should hide modal and reset form', () => {
            const modal = document.getElementById('github-token-modal');
            const input = document.getElementById('github-token-input');
            const eyeIcon = document.getElementById('token-eye-icon');
            
            // Show modal first
            modal.classList.remove('hidden');
            input.type = 'text';
            input.value = 'test-token';
            eyeIcon.className = 'fas fa-eye-slash';
            
            window.GitHubAuth.hideGitHubTokenModal();
            
            expect(modal.classList.contains('hidden')).toBe(true);
            expect(input.type).toBe('password');
            expect(eyeIcon.className).toBe('fas fa-eye');
        });

        test('promptForAccessToken should show modal', () => {
            const modal = document.getElementById('github-token-modal');
            
            window.GitHubAuth.promptForAccessToken();
            
            expect(modal.classList.contains('hidden')).toBe(false);
        });
    });

    describe('Authentication State Management', () => {
        test('initializeGitHubAuth should not throw error', () => {
            expect(() => {
                window.GitHubAuth.initializeGitHubAuth();
            }).not.toThrow();
        });

        test('signInWithGitHub should show token modal', () => {
            const modal = document.getElementById('github-token-modal');
            
            window.GitHubAuth.signInWithGitHub();
            
            expect(modal.classList.contains('hidden')).toBe(false);
        });

        test('signOutGitHub should clear internal auth state', () => {
            // Set up authenticated state
            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';
            window.GitHubAuth.githubAuth.user = { login: 'testuser' };

            window.GitHubAuth.signOutGitHub();

            expect(window.GitHubAuth.githubAuth.isAuthenticated).toBe(false);
            expect(window.GitHubAuth.githubAuth.accessToken).toBeNull();
            expect(window.GitHubAuth.githubAuth.user).toBeNull();
        });

        test('validateAndSetToken should handle successful authentication', async () => {
            // Mock fetch for this test
            const mockUser = { login: 'testuser', id: 123 };
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser
            });

            const result = await window.GitHubAuth.validateAndSetToken('valid-token');

            expect(result).toBe(true);
            expect(window.GitHubAuth.githubAuth.isAuthenticated).toBe(true);
            expect(window.GitHubAuth.githubAuth.accessToken).toBe('valid-token');
            expect(window.GitHubAuth.githubAuth.user).toEqual(mockUser);
        });

        test('validateAndSetToken should handle failed authentication', async () => {
            // Mock fetch to simulate failure
            global.fetch = jest.fn().mockRejectedValueOnce(new Error('Unauthorized'));

            const result = await window.GitHubAuth.validateAndSetToken('invalid-token');

            expect(result).toBe(false);
        });

        test('validateAndSetToken should handle non-ok response', async () => {
            // Mock fetch to return non-ok response
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: false,
                status: 401
            });

            const result = await window.GitHubAuth.validateAndSetToken('invalid-token');

            expect(result).toBe(false);
        });
    });

    describe('UI Functions', () => {
        test('updateGitHubSignInUI should show authenticated state', () => {
            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'token';
            window.GitHubAuth.githubAuth.user = { login: 'testuser' };

            window.GitHubAuth.updateGitHubSignInUI();

            const signInButton = document.querySelector('header a');
            expect(signInButton.innerHTML).toContain('Signed in as testuser');
            expect(signInButton.title).toBe('Click to sign out');
        });

        test('updateGitHubSignInUI should show unauthenticated state', () => {
            window.GitHubAuth.githubAuth.isAuthenticated = false;
            window.GitHubAuth.githubAuth.accessToken = null;
            window.GitHubAuth.githubAuth.user = null;

            window.GitHubAuth.updateGitHubSignInUI();

            const signInButton = document.querySelector('header a');
            expect(signInButton.innerHTML).toContain('Connect to GitHub');
            expect(signInButton.title).toBe('Add Personal Access Token to create issues');
        });

        test('updateGitHubSignInUI should handle missing sign-in button gracefully', () => {
            // Remove the sign-in button
            const header = document.querySelector('header');
            header.innerHTML = '';

            // Should not throw error
            expect(() => {
                window.GitHubAuth.updateGitHubSignInUI();
            }).not.toThrow();
        });

        test('updateGitHubOptionUI should not throw error', () => {
            // This function is kept for backward compatibility but does nothing
            expect(() => {
                window.GitHubAuth.updateGitHubOptionUI();
            }).not.toThrow();
        });
    });

    describe('Modal Event Listeners', () => {
        test('initializeAuthModalListeners should not throw error', () => {
            expect(() => {
                window.GitHubAuth.initializeAuthModalListeners();
            }).not.toThrow();
        });
    });

    describe('Export API', () => {
        test('should export all required functions', () => {
            expect(typeof window.GitHubAuth.GITHUB_CONFIG).toBe('object');
            expect(typeof window.GitHubAuth.githubAuth).toBe('object');
            expect(typeof window.GitHubAuth.initializeGitHubAuth).toBe('function');
            expect(typeof window.GitHubAuth.signInWithGitHub).toBe('function');
            expect(typeof window.GitHubAuth.validateAndSetToken).toBe('function');
            expect(typeof window.GitHubAuth.signOutGitHub).toBe('function');
            expect(typeof window.GitHubAuth.updateGitHubSignInUI).toBe('function');
            expect(typeof window.GitHubAuth.updateGitHubOptionUI).toBe('function');
            expect(typeof window.GitHubAuth.promptForAccessToken).toBe('function');
            expect(typeof window.GitHubAuth.showGitHubTokenModal).toBe('function');
            expect(typeof window.GitHubAuth.hideGitHubTokenModal).toBe('function');
            expect(typeof window.GitHubAuth.initializeAuthModalListeners).toBe('function');
        });

        test('should export configuration with correct structure', () => {
            const config = window.GitHubAuth.GITHUB_CONFIG;
            expect(config).toHaveProperty('apiBaseUrl');
            expect(config).toHaveProperty('owner');
            expect(config).toHaveProperty('repo');
            expect(typeof config.apiBaseUrl).toBe('string');
            expect(typeof config.owner).toBe('string');
            expect(typeof config.repo).toBe('string');
        });

        test('should export auth state with correct structure', () => {
            const auth = window.GitHubAuth.githubAuth;
            expect(auth).toHaveProperty('isAuthenticated');
            expect(auth).toHaveProperty('accessToken');
            expect(auth).toHaveProperty('user');
            expect(typeof auth.isAuthenticated).toBe('boolean');
        });
    });
}); 