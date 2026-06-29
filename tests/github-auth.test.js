/**
 * GitHub Authentication tests — Clerk-only ("Sign in with GitHub").
 */

describe('GitHub Authentication (Clerk-only)', () => {
    let container;
    let originalFetch;

    beforeEach(() => {
        originalFetch = global.fetch;

        container = document.createElement('div');
        container.innerHTML = `
            <header class="bg-gray-900 text-white px-6 py-4 shadow-lg">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <a href="https://github.com/super3/dashban" target="_blank" class="flex items-center space-x-2">
                            <i class="fab fa-github"></i>
                            <span>Connect to GitHub</span>
                        </a>
                    </div>
                </div>
            </header>
            <button id="add-task-btn">Add Issue</button>
            <span id="repo-name">project</span>
        `;
        document.body.appendChild(container);

        delete window.ClerkAuth;
        delete require.cache[require.resolve('../src/github-auth.js')];
        require('../src/github-auth.js');

        // Start signed out.
        window.GitHubAuth.githubAuth.isAuthenticated = false;
        window.GitHubAuth.githubAuth.user = null;
        window.GitHubAuth.githubAuth.mode = null;
    });

    afterEach(() => {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        global.fetch = originalFetch;
        delete window.ClerkAuth;
    });

    // Put the shared auth state into a signed-in (Clerk) state.
    function signInClerk(login = 'octocat') {
        window.GitHubAuth.githubAuth.isAuthenticated = true;
        window.GitHubAuth.githubAuth.mode = 'clerk';
        window.GitHubAuth.githubAuth.user = { login };
    }

    describe('Configuration', () => {
        test('exposes the GitHub config', () => {
            expect(window.GitHubAuth.GITHUB_CONFIG.apiBaseUrl).toBe('https://api.github.com');
            expect(window.GitHubAuth.GITHUB_CONFIG.owner).toBe('super3');
            expect(window.GitHubAuth.GITHUB_CONFIG.repo).toBe('dashban');
        });

        test('starts signed out', () => {
            expect(window.GitHubAuth.githubAuth.isAuthenticated).toBe(false);
            expect(window.GitHubAuth.githubAuth.user).toBeNull();
            expect(window.GitHubAuth.githubAuth.mode).toBeNull();
        });
    });

    describe('isGitHubAuthed', () => {
        test('is true when authenticated in Clerk mode', () => {
            signInClerk();
            expect(window.GitHubAuth.isGitHubAuthed()).toBe(true);
        });

        test('is false when not authenticated', () => {
            expect(window.GitHubAuth.isGitHubAuthed()).toBe(false);
        });

        test('is false when authenticated flag set but mode is not clerk', () => {
            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.mode = null;
            expect(window.GitHubAuth.isGitHubAuthed()).toBe(false);
        });
    });

    describe('getApiBase', () => {
        test('uses relative paths on localhost (the dev server serves the API too)', () => {
            expect(window.GitHubAuth.getApiBase('localhost')).toBe('');
            expect(window.GitHubAuth.getApiBase('127.0.0.1')).toBe('');
        });

        test('uses the absolute Railway backend URL for a static host (e.g. dashban.com)', () => {
            expect(window.GitHubAuth.getApiBase('dashban.com'))
                .toBe('https://dashban-production.up.railway.app');
        });

        test('defaults to the current page hostname when none is given', () => {
            // jsdom serves the tests from http://localhost, so this resolves to relative.
            expect(window.GitHubAuth.getApiBase()).toBe('');
        });
    });

    describe('buildGitHubRequest', () => {
        test('routes through the proxy with a Bearer token when signed in', async () => {
            signInClerk();
            window.ClerkAuth = { getToken: jest.fn().mockResolvedValue('clerk-jwt') };

            const { url, headers } = await window.GitHubAuth.buildGitHubRequest('/repos/o/r/issues');

            expect(url).toBe('/api/github/repos/o/r/issues');
            expect(headers).toEqual({
                'Authorization': 'Bearer clerk-jwt',
                'Accept': 'application/vnd.github.v3+json'
            });
        });

        test('merges caller-supplied headers in proxy mode', async () => {
            signInClerk();
            window.ClerkAuth = { getToken: jest.fn().mockResolvedValue('clerk-jwt') };

            const { headers } = await window.GitHubAuth.buildGitHubRequest('/x', { 'Content-Type': 'application/json' });

            expect(headers).toEqual({
                'Content-Type': 'application/json',
                'Authorization': 'Bearer clerk-jwt',
                'Accept': 'application/vnd.github.v3+json'
            });
        });

        test('omits auth headers when signed in but no token is available', async () => {
            signInClerk();
            window.ClerkAuth = { getToken: jest.fn().mockResolvedValue(null) };

            const { url, headers } = await window.GitHubAuth.buildGitHubRequest('/x');

            expect(url).toBe('/api/github/x');
            expect(headers).toEqual({});
        });

        test('omits auth headers when signed in but ClerkAuth is absent', async () => {
            signInClerk();
            delete window.ClerkAuth;

            const { url, headers } = await window.GitHubAuth.buildGitHubRequest('/x');

            expect(url).toBe('/api/github/x');
            expect(headers).toEqual({});
        });

        test('hits api.github.com with no auth headers when signed out', async () => {
            const { url, headers } = await window.GitHubAuth.buildGitHubRequest('/repos/o/r/issues');

            expect(url).toBe('https://api.github.com/repos/o/r/issues');
            expect(headers).toEqual({});
        });
    });

    describe('githubFetch', () => {
        test('issues a proxy request with a Bearer token when signed in', async () => {
            signInClerk();
            window.ClerkAuth = { getToken: jest.fn().mockResolvedValue('clerk-jwt') };
            const mockFetch = jest.fn().mockResolvedValue({ ok: true });
            global.fetch = mockFetch;

            await window.GitHubAuth.githubFetch('/repos/o/r/issues', { method: 'GET' });

            expect(mockFetch).toHaveBeenCalledWith(
                '/api/github/repos/o/r/issues',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({ 'Authorization': 'Bearer clerk-jwt' })
                })
            );
        });

        test('issues an anonymous request to GitHub when signed out', async () => {
            const mockFetch = jest.fn().mockResolvedValue({ ok: true });
            global.fetch = mockFetch;

            await window.GitHubAuth.githubFetch('/repos/o/r/issues');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.github.com/repos/o/r/issues',
                expect.objectContaining({ headers: {} })
            );
        });
    });

    describe('signInWithGitHub', () => {
        test('starts the Clerk sign-in flow when available', () => {
            window.ClerkAuth = { signIn: jest.fn() };
            window.GitHubAuth.signInWithGitHub();
            expect(window.ClerkAuth.signIn).toHaveBeenCalled();
        });

        test('is a no-op when Clerk is unavailable', () => {
            expect(() => window.GitHubAuth.signInWithGitHub()).not.toThrow();
        });
    });

    describe('signOutGitHub', () => {
        test('signs out through Clerk when available', () => {
            window.ClerkAuth = { signOut: jest.fn() };
            window.GitHubAuth.signOutGitHub();
            expect(window.ClerkAuth.signOut).toHaveBeenCalled();
        });

        test('is a no-op when Clerk is unavailable', () => {
            expect(() => window.GitHubAuth.signOutGitHub()).not.toThrow();
        });
    });

    describe('initializeGitHubAuth', () => {
        test('renders the signed-out UI and the repo name', () => {
            window.GitHubAuth.initializeGitHubAuth();

            const button = container.querySelector('header a');
            expect(button.innerHTML).toContain('Sign in with GitHub');
            expect(document.getElementById('repo-name').textContent).toBe('dashban');
        });
    });

    describe('updateGitHubSignInUI', () => {
        test('returns quietly when the header button is absent', () => {
            container.querySelector('header a').remove();
            expect(() => window.GitHubAuth.updateGitHubSignInUI()).not.toThrow();
        });

        test('shows the signed-in user and wires the dropdown', () => {
            signInClerk('octocat');
            window.GitHubAuth.updateGitHubSignInUI();

            const button = container.querySelector('header a');
            expect(button.innerHTML).toContain('octocat');
            expect(button.title).toBe('User menu');

            // Clicking opens the dropdown (covers the onclick handler).
            button.onclick(new MouseEvent('click'));
            expect(container.querySelector('.user-dropdown')).not.toBeNull();
        });

        test('shows the signed-out button and wires sign-in', () => {
            window.ClerkAuth = { signIn: jest.fn() };
            window.GitHubAuth.updateGitHubSignInUI();

            const button = container.querySelector('header a');
            expect(button.innerHTML).toContain('Sign in with GitHub');

            // Clicking starts sign-in (covers the onclick handler).
            button.onclick(new MouseEvent('click'));
            expect(window.ClerkAuth.signIn).toHaveBeenCalled();
        });

        test('enables the Add Issue button when signed in', () => {
            signInClerk();
            window.GitHubAuth.updateGitHubSignInUI();
            expect(document.getElementById('add-task-btn').disabled).toBe(false);
        });

        test('disables the Add Issue button when signed out', () => {
            window.GitHubAuth.updateGitHubSignInUI();
            expect(document.getElementById('add-task-btn').disabled).toBe(true);
        });
    });

    describe('updateAddIssueButtonState', () => {
        test('returns quietly when the button is absent', () => {
            document.getElementById('add-task-btn').remove();
            expect(() => window.GitHubAuth.updateAddIssueButtonState()).not.toThrow();
        });

        test('enables the button when signed in', () => {
            signInClerk();
            window.GitHubAuth.updateAddIssueButtonState();
            const btn = document.getElementById('add-task-btn');
            expect(btn.disabled).toBe(false);
            expect(btn.title).toBe('Create a new GitHub issue');
        });

        test('disables the button when signed out', () => {
            window.GitHubAuth.updateAddIssueButtonState();
            const btn = document.getElementById('add-task-btn');
            expect(btn.disabled).toBe(true);
            expect(btn.title).toBe('Sign in with GitHub first to create issues');
        });
    });

    describe('toggleUserDropdown', () => {
        beforeEach(() => {
            // Put the header button into the signed-in state (href="#") first.
            signInClerk();
            window.GitHubAuth.updateGitHubSignInUI();
        });

        test('returns quietly when the button is absent', () => {
            container.querySelector('header a').remove();
            expect(() => window.GitHubAuth.toggleUserDropdown()).not.toThrow();
        });

        test('opens then closes the dropdown on repeated calls', () => {
            window.GitHubAuth.toggleUserDropdown();
            expect(container.querySelector('.user-dropdown')).not.toBeNull();

            // Second call toggles it back off.
            window.GitHubAuth.toggleUserDropdown();
            expect(container.querySelector('.user-dropdown')).toBeNull();
        });

        test('Sign out triggers Clerk sign-out', () => {
            window.ClerkAuth = { signOut: jest.fn() };
            window.GitHubAuth.toggleUserDropdown();

            const signOutBtn = container.querySelector('.user-dropdown button');
            signOutBtn.onclick();

            expect(window.ClerkAuth.signOut).toHaveBeenCalled();
            expect(container.querySelector('.user-dropdown')).toBeNull();
        });

        test('a click outside the menu closes it', async () => {
            window.GitHubAuth.toggleUserDropdown();
            expect(container.querySelector('.user-dropdown')).not.toBeNull();

            // The outside-click listener is registered on a 0ms timeout.
            await new Promise((resolve) => setTimeout(resolve, 0));
            document.body.click();

            expect(container.querySelector('.user-dropdown')).toBeNull();
        });

        test('a click inside the menu leaves it open', async () => {
            window.GitHubAuth.toggleUserDropdown();
            const dropdown = container.querySelector('.user-dropdown');
            expect(dropdown).not.toBeNull();

            await new Promise((resolve) => setTimeout(resolve, 0));
            dropdown.click(); // inside the container -> stays open

            expect(container.querySelector('.user-dropdown')).not.toBeNull();
        });
    });

    describe('updateHeaderRepoName', () => {
        test('writes the repo name into the header', () => {
            document.getElementById('repo-name').textContent = 'stale';
            window.GitHubAuth.updateHeaderRepoName();
            expect(document.getElementById('repo-name').textContent).toBe('dashban');
        });

        test('returns quietly when the repo-name element is absent', () => {
            document.getElementById('repo-name').remove();
            expect(() => window.GitHubAuth.updateHeaderRepoName()).not.toThrow();
        });
    });

    describe('Export API', () => {
        test('exposes the Clerk-only surface', () => {
            const api = window.GitHubAuth;
            ['isGitHubAuthed', 'getApiBase', 'buildGitHubRequest', 'githubFetch', 'initializeGitHubAuth',
                'signInWithGitHub', 'signOutGitHub', 'updateGitHubSignInUI',
                'updateAddIssueButtonState', 'toggleUserDropdown', 'updateHeaderRepoName']
                .forEach((fn) => expect(typeof api[fn]).toBe('function'));
        });

        test('no longer exposes the removed PAT functions', () => {
            const api = window.GitHubAuth;
            ['showGitHubTokenModal', 'hideGitHubTokenModal', 'validateAndSetToken',
                'promptForAccessToken', 'initializeAuthModalListeners', 'updateGitHubOptionUI']
                .forEach((fn) => expect(api[fn]).toBeUndefined());
        });
    });
});
