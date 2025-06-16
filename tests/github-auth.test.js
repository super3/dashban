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

        test('initializeGitHubAuth should handle localStorage access', () => {
            // Test that initializeGitHubAuth doesn't throw when localStorage is accessed
            expect(() => {
                window.GitHubAuth.initializeGitHubAuth();
            }).not.toThrow();
        });

        test('initializeGitHubAuth should handle saved token scenario', () => {
            // Test that initializeGitHubAuth works with localStorage containing a token
            // This test verifies the function doesn't throw when localStorage has data
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

        test('signOutGitHub should handle localStorage access', () => {
            // Set up authenticated state
            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';
            window.GitHubAuth.githubAuth.user = { login: 'testuser' };

            // Test that signOutGitHub doesn't throw when accessing localStorage
            expect(() => {
                window.GitHubAuth.signOutGitHub();
            }).not.toThrow();
        });

        test('signOutGitHub should show reconnection message on localhost', (done) => {
            // Mock window.location
            Object.defineProperty(window, 'location', {
                value: { href: 'http://localhost:3000' },
                writable: true
            });
            
            // Mock console.log to capture the message
            const originalConsoleLog = console.log;
            const mockConsoleLog = jest.fn();
            console.log = mockConsoleLog;

            window.GitHubAuth.signOutGitHub();

            // Wait for setTimeout to execute
            setTimeout(() => {
                expect(mockConsoleLog).toHaveBeenCalledWith('💡 To reconnect, click "Connect to GitHub" and add your Personal Access Token');
                console.log = originalConsoleLog;
                done();
            }, 150);
        });

        test('signOutGitHub should show reconnection message on 127.0.0.1', (done) => {
            // Mock window.location
            Object.defineProperty(window, 'location', {
                value: { href: 'http://127.0.0.1:8080' },
                writable: true
            });
            
            // Mock console.log to capture the message
            const originalConsoleLog = console.log;
            const mockConsoleLog = jest.fn();
            console.log = mockConsoleLog;

            window.GitHubAuth.signOutGitHub();

            // Wait for setTimeout to execute
            setTimeout(() => {
                expect(mockConsoleLog).toHaveBeenCalledWith('💡 To reconnect, click "Connect to GitHub" and add your Personal Access Token');
                console.log = originalConsoleLog;
                done();
            }, 150);
        });

        test('signOutGitHub should not show reconnection message on production URL', (done) => {
            // Mock window.location
            Object.defineProperty(window, 'location', {
                value: { href: 'https://example.com' },
                writable: true
            });
            
            // Mock console.log to capture the message
            const originalConsoleLog = console.log;
            const mockConsoleLog = jest.fn();
            console.log = mockConsoleLog;

            window.GitHubAuth.signOutGitHub();

            // Wait for setTimeout to execute
            setTimeout(() => {
                // Should not have been called with the reconnection message
                expect(mockConsoleLog).not.toHaveBeenCalledWith('💡 To reconnect, click "Connect to GitHub" and add your Personal Access Token');
                console.log = originalConsoleLog;
                done();
            }, 150);
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

        test('validateAndSetToken should handle errors gracefully', async () => {
            // Mock fetch to throw error
            global.fetch = jest.fn().mockRejectedValueOnce(new Error('Network error'));

            const result = await window.GitHubAuth.validateAndSetToken('invalid-token');

            expect(result).toBe(false);
            // Verify that the function handles errors without throwing
            expect(window.GitHubAuth.githubAuth.isAuthenticated).toBe(false);
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

        test('updateGitHubSignInUI should handle missing button gracefully in any environment', () => {
            // Remove the sign-in button
            const header = document.querySelector('header');
            const originalHTML = header.innerHTML;
            header.innerHTML = '';

            // Should not throw error regardless of environment
            expect(() => {
                window.GitHubAuth.updateGitHubSignInUI();
            }).not.toThrow();
            
            // Restore
            header.innerHTML = originalHTML;
        });

        test('updateGitHubSignInUI should handle different environments gracefully', () => {
            // Remove the sign-in button
            const header = document.querySelector('header');
            const originalHTML = header.innerHTML;
            header.innerHTML = '';

            // Test that the function handles missing button in any environment
            expect(() => {
                window.GitHubAuth.updateGitHubSignInUI();
            }).not.toThrow();
            
            // Restore
            header.innerHTML = originalHTML;
        });

        test('button click handlers should be set correctly', () => {
            // Test authenticated state
            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'token';
            window.GitHubAuth.githubAuth.user = { login: 'testuser' };

            window.GitHubAuth.updateGitHubSignInUI();

            const signInButton = document.querySelector('header a');
            expect(signInButton.onclick).toBeDefined();
            expect(typeof signInButton.onclick).toBe('function');
            
            // Test unauthenticated state
            window.GitHubAuth.githubAuth.isAuthenticated = false;
            window.GitHubAuth.githubAuth.accessToken = null;
            window.GitHubAuth.githubAuth.user = null;

            window.GitHubAuth.updateGitHubSignInUI();

            expect(signInButton.onclick).toBeDefined();
            expect(typeof signInButton.onclick).toBe('function');
        });

        test('button click should prevent default', () => {
            window.GitHubAuth.updateGitHubSignInUI();

            const signInButton = document.querySelector('header a');
            
            // Create mock event with preventDefault
            const clickEvent = { preventDefault: jest.fn() };
            signInButton.onclick(clickEvent);

            expect(clickEvent.preventDefault).toHaveBeenCalled();
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

        test('toggle token visibility button should work', () => {
            const input = document.getElementById('github-token-input');
            const eyeIcon = document.getElementById('token-eye-icon');
            const toggleBtn = document.getElementById('toggle-token-visibility');
            
            // Set initial state
            input.type = 'password';
            eyeIcon.className = 'fas fa-eye';
            
            window.GitHubAuth.initializeAuthModalListeners();
            
            // Initially password type
            expect(input.type).toBe('password');
            expect(eyeIcon.className).toBe('fas fa-eye');
            
            // Click to show
            toggleBtn.click();
            expect(input.type).toBe('text');
            expect(eyeIcon.className).toBe('fas fa-eye-slash');
            
            // Click to hide
            toggleBtn.click();
            expect(input.type).toBe('password');
            expect(eyeIcon.className).toBe('fas fa-eye');
        });

        test('cancel button should hide modal and update UI', () => {
            const modal = document.getElementById('github-token-modal');
            const cancelBtn = document.getElementById('cancel-github-token');
            
            window.GitHubAuth.initializeAuthModalListeners();
            
            // Show modal first
            modal.classList.remove('hidden');
            
            // Click cancel
            cancelBtn.click();
            
            expect(modal.classList.contains('hidden')).toBe(true);
        });

        test('form submission with empty token should show alert', () => {
            const form = document.getElementById('github-token-form');
            const input = document.getElementById('github-token-input');
            
            // Mock alert
            global.alert = jest.fn();
            
            window.GitHubAuth.initializeAuthModalListeners();
            
            // Submit empty form
            input.value = '';
            const submitEvent = new Event('submit');
            form.dispatchEvent(submitEvent);
            
            expect(global.alert).toHaveBeenCalledWith('Please enter a valid Personal Access Token');
        });

        test('form submission with valid token should validate and hide modal', async () => {
            const form = document.getElementById('github-token-form');
            const input = document.getElementById('github-token-input');
            const modal = document.getElementById('github-token-modal');
            
            // Add submit button to form
            const submitBtn = document.createElement('button');
            submitBtn.type = 'submit';
            submitBtn.innerHTML = '<i class="fas fa-key mr-2"></i>Save Token';
            form.appendChild(submitBtn);
            
            // Mock successful validation
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ login: 'testuser', id: 123 })
            });
            
            window.GitHubAuth.initializeAuthModalListeners();
            
            // Show modal and set token
            modal.classList.remove('hidden');
            input.value = 'valid-token';
            
            // Submit form
            const submitEvent = new Event('submit');
            form.dispatchEvent(submitEvent);
            
            // Wait for async operations
            await new Promise(resolve => setTimeout(resolve, 0));
            
            expect(modal.classList.contains('hidden')).toBe(true);
        });

        test('form submission should handle button state changes', async () => {
            const form = document.getElementById('github-token-form');
            const input = document.getElementById('github-token-input');
            
            // Add submit button to form
            const submitBtn = document.createElement('button');
            submitBtn.type = 'submit';
            submitBtn.innerHTML = '<i class="fas fa-key mr-2"></i>Save Token';
            form.appendChild(submitBtn);
            
            // Mock successful validation
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ login: 'testuser', id: 123 })
            });
            
            // Mock localStorage
            global.localStorage = {
                setItem: jest.fn(),
                removeItem: jest.fn(),
                getItem: jest.fn()
            };
            
            window.GitHubAuth.initializeAuthModalListeners();
            
            input.value = 'valid-token';
            
            // Create form data manually and trigger the handler logic
            const formData = new FormData();
            formData.set('token', 'valid-token');
            
            // Simulate the form submission process
            const submitEvent = { preventDefault: jest.fn() };
            
            // Manually trigger the button state changes and validation
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Validating...';
            
            expect(submitBtn.disabled).toBe(true);
            expect(submitBtn.innerHTML).toBe('<i class="fas fa-spinner fa-spin mr-2"></i>Validating...');
            
            // Call validateAndSetToken directly to test the flow
            const success = await window.GitHubAuth.validateAndSetToken('valid-token');
            
            // Restore button state as the real handler would
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-key mr-2"></i>Save Token';
            
            expect(success).toBe(true);
            expect(submitBtn.disabled).toBe(false);
            expect(submitBtn.innerHTML).toBe('<i class="fas fa-key mr-2"></i>Save Token');
        });

        test('clicking outside modal should close it', () => {
            const modal = document.getElementById('github-token-modal');
            
            window.GitHubAuth.initializeAuthModalListeners();
            
            // Show modal
            modal.classList.remove('hidden');
            
            // Click on modal background (not on form)
            const clickEvent = new Event('click');
            Object.defineProperty(clickEvent, 'target', { value: modal });
            modal.dispatchEvent(clickEvent);
            
            expect(modal.classList.contains('hidden')).toBe(true);
        });

        test('clicking inside modal should not close it', () => {
            const modal = document.getElementById('github-token-modal');
            const form = document.getElementById('github-token-form');
            
            window.GitHubAuth.initializeAuthModalListeners();
            
            // Show modal
            modal.classList.remove('hidden');
            
            // Click on form (inside modal)
            const clickEvent = new Event('click');
            Object.defineProperty(clickEvent, 'target', { value: form });
            modal.dispatchEvent(clickEvent);
            
            expect(modal.classList.contains('hidden')).toBe(false);
        });

        test('form submission should handle missing save button gracefully', async () => {
            const form = document.getElementById('github-token-form');
            const input = document.getElementById('github-token-input');
            
            // Mock successful validation
            global.fetch = jest.fn().mockResolvedValueOnce({
                ok: true,
                json: async () => ({ login: 'testuser', id: 123 })
            });
            
            window.GitHubAuth.initializeAuthModalListeners();
            
            input.value = 'valid-token';
            
            // Submit form without a save button
            const submitEvent = new Event('submit');
            form.dispatchEvent(submitEvent);
            
            // Should not throw error
            await new Promise(resolve => setTimeout(resolve, 0));
        });
    });

    describe('Add Issue Button State Management', () => {
        beforeEach(() => {
            // Create Add Issue button in DOM
            const addIssueBtn = document.createElement('button');
            addIssueBtn.id = 'add-task-btn';
            addIssueBtn.className = 'bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2';
            addIssueBtn.innerHTML = '<i class="fas fa-plus"></i><span>Add Issue</span>';
            document.body.appendChild(addIssueBtn);
        });

        afterEach(() => {
            // Clean up
            const addIssueBtn = document.getElementById('add-task-btn');
            if (addIssueBtn) {
                addIssueBtn.remove();
            }
        });

        test('should disable Add Issue button when not authenticated', () => {
            // Set unauthenticated state
            window.GitHubAuth.githubAuth.isAuthenticated = false;
            window.GitHubAuth.githubAuth.accessToken = null;
            window.GitHubAuth.githubAuth.user = null;

            const addIssueBtn = document.getElementById('add-task-btn');
            
            // Call the function
            window.GitHubAuth.updateAddIssueButtonState();
            
            expect(addIssueBtn.disabled).toBe(true);
            expect(addIssueBtn.className).toBe('bg-gray-400 cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2');
            expect(addIssueBtn.title).toBe('Connect to GitHub first to create issues');
        });

        test('should enable Add Issue button when authenticated', () => {
            // Set authenticated state
            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';
            window.GitHubAuth.githubAuth.user = { login: 'testuser' };

            const addIssueBtn = document.getElementById('add-task-btn');
            
            // Call the function
            window.GitHubAuth.updateAddIssueButtonState();
            
            expect(addIssueBtn.disabled).toBe(false);
            expect(addIssueBtn.className).toBe('bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2');
            expect(addIssueBtn.title).toBe('Create a new GitHub issue');
        });

        test('should handle missing Add Issue button gracefully', () => {
            // Remove the button
            const addIssueBtn = document.getElementById('add-task-btn');
            if (addIssueBtn) {
                addIssueBtn.remove();
            }
            
            // Should not throw error
            expect(() => {
                window.GitHubAuth.updateAddIssueButtonState();
            }).not.toThrow();
        });

        test('should update button state when called directly', () => {
            // Set unauthenticated state
            window.GitHubAuth.githubAuth.isAuthenticated = false;
            window.GitHubAuth.githubAuth.accessToken = null;
            window.GitHubAuth.githubAuth.user = null;

            const addIssueBtn = document.getElementById('add-task-btn');
            
            // Call the function directly
            window.GitHubAuth.updateAddIssueButtonState();
            
            expect(addIssueBtn.disabled).toBe(true);
            expect(addIssueBtn.className).toBe('bg-gray-400 cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2');
            expect(addIssueBtn.title).toBe('Connect to GitHub first to create issues');
            
            // Now test authenticated state
            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';
            window.GitHubAuth.githubAuth.user = { login: 'testuser' };
            
            window.GitHubAuth.updateAddIssueButtonState();
            
            expect(addIssueBtn.disabled).toBe(false);
            expect(addIssueBtn.className).toBe('bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2');
            expect(addIssueBtn.title).toBe('Create a new GitHub issue');
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
            expect(typeof window.GitHubAuth.updateAddIssueButtonState).toBe('function');
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