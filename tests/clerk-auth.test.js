/**
 * Tests for src/clerk-auth.js — the Clerk "Sign in with GitHub" integration.
 */

describe('ClerkAuth', () => {
    let ClerkAuth;

    beforeEach(() => {
        // Reset the globals the module reads between tests.
        delete window.Clerk;
        delete window.GitHubAuth;
        delete window.GitHubAPI;
        delete window.EventBus;
        document.head.innerHTML = '';
        global.fetch = jest.fn();

        // Re-require so module-local `state` resets each test.
        delete require.cache[require.resolve('../src/clerk-auth.js')];
        ClerkAuth = require('../src/clerk-auth.js');
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('fetchConfig', () => {
        test('returns parsed config on success', async () => {
            global.fetch.mockResolvedValue({ ok: true, json: async () => ({ clerkPublishableKey: 'pk' }) });
            await expect(ClerkAuth.fetchConfig()).resolves.toEqual({ clerkPublishableKey: 'pk' });
            expect(global.fetch).toHaveBeenCalledWith('/api/config');
        });

        test('returns null when the response is not ok', async () => {
            global.fetch.mockResolvedValue({ ok: false });
            await expect(ClerkAuth.fetchConfig()).resolves.toBeNull();
        });

        test('returns null when fetch rejects (no backend)', async () => {
            global.fetch.mockRejectedValue(new Error('network'));
            await expect(ClerkAuth.fetchConfig()).resolves.toBeNull();
        });

        test('prefixes the API base from GitHubAuth (cross-origin static build)', async () => {
            window.GitHubAuth = { getApiBase: () => 'https://dashban-production.up.railway.app' };
            global.fetch.mockResolvedValue({ ok: true, json: async () => ({ clerkPublishableKey: 'pk' }) });

            await ClerkAuth.fetchConfig();

            expect(global.fetch).toHaveBeenCalledWith('https://dashban-production.up.railway.app/api/config');
        });

        test('uses a relative path when GitHubAuth exposes no getApiBase', async () => {
            window.GitHubAuth = {};
            global.fetch.mockResolvedValue({ ok: true, json: async () => ({}) });

            await ClerkAuth.fetchConfig();

            expect(global.fetch).toHaveBeenCalledWith('/api/config');
        });
    });

    describe('frontendApiFromKey', () => {
        test('decodes the frontend API host from a publishable key', () => {
            const host = 'able-albacore-57.clerk.accounts.dev';
            const key = `pk_test_${btoa(host + '$')}`;
            expect(ClerkAuth.frontendApiFromKey(key)).toBe(host);
        });

        test('returns null when the key has no encoded segment', () => {
            expect(ClerkAuth.frontendApiFromKey('invalid')).toBeNull();
        });

        test('returns null when the decoded host is empty', () => {
            const key = `pk_test_${btoa('$')}`;
            expect(ClerkAuth.frontendApiFromKey(key)).toBeNull();
        });

        test('returns null when decoding throws', () => {
            // '@' is not a valid base64 character, so atob throws.
            expect(ClerkAuth.frontendApiFromKey('pk_test_@')).toBeNull();
        });
    });

    describe('loadClerkScript', () => {
        test('resolves immediately when window.Clerk already exists', async () => {
            window.Clerk = {};
            await expect(ClerkAuth.loadClerkScript('pk_test_anything')).resolves.toBeUndefined();
            expect(document.head.querySelector('script[data-clerk-publishable-key]')).toBeNull();
        });

        test('rejects when the publishable key is invalid', async () => {
            await expect(ClerkAuth.loadClerkScript('invalid')).rejects.toThrow('Invalid Clerk publishable key');
        });

        test('injects the script and resolves after Clerk.load()', async () => {
            const host = 'able-albacore-57.clerk.accounts.dev';
            const key = `pk_test_${btoa(host + '$')}`;
            const promise = ClerkAuth.loadClerkScript(key);

            const script = document.head.querySelector('script[data-clerk-publishable-key]');
            expect(script).not.toBeNull();
            expect(script.src).toContain(host);
            expect(script.getAttribute('data-clerk-publishable-key')).toBe(key);

            window.Clerk = { load: jest.fn().mockResolvedValue() };
            script.dispatchEvent(new Event('load'));

            await expect(promise).resolves.toBeUndefined();
            expect(window.Clerk.load).toHaveBeenCalled();
        });

        test('rejects when Clerk.load() fails', async () => {
            const key = `pk_test_${btoa('host.example$')}`;
            const promise = ClerkAuth.loadClerkScript(key);
            const script = document.head.querySelector('script[data-clerk-publishable-key]');

            window.Clerk = { load: jest.fn().mockRejectedValue(new Error('load failed')) };
            script.dispatchEvent(new Event('load'));

            await expect(promise).rejects.toThrow('load failed');
        });

        test('rejects when the script fails to load', async () => {
            const key = `pk_test_${btoa('host.example$')}`;
            const promise = ClerkAuth.loadClerkScript(key);
            const script = document.head.querySelector('script[data-clerk-publishable-key]');

            script.dispatchEvent(new Event('error'));

            await expect(promise).rejects.toThrow('Failed to load Clerk');
        });
    });

    describe('githubUsername', () => {
        test('returns "GitHub User" when there is no user', () => {
            expect(ClerkAuth.githubUsername(null)).toBe('GitHub User');
        });

        test('uses the GitHub external account username', () => {
            const user = { externalAccounts: [{ provider: 'github', username: 'octocat' }] };
            expect(ClerkAuth.githubUsername(user)).toBe('octocat');
        });

        test('matches the oauth_github provider string too', () => {
            const user = { externalAccounts: [{ provider: 'oauth_github', username: 'octo2' }] };
            expect(ClerkAuth.githubUsername(user)).toBe('octo2');
        });

        test('falls back to the Clerk username when the GitHub account has none', () => {
            const user = { externalAccounts: [{ provider: 'github' }], username: 'fallback' };
            expect(ClerkAuth.githubUsername(user)).toBe('fallback');
        });

        test('ignores non-GitHub external accounts', () => {
            const user = { externalAccounts: [{ provider: 'google', username: 'g' }], username: 'me' };
            expect(ClerkAuth.githubUsername(user)).toBe('me');
        });

        test('falls back to "GitHub User" when nothing is available', () => {
            expect(ClerkAuth.githubUsername({})).toBe('GitHub User');
        });
    });

    describe('syncAuthState', () => {
        test('does nothing when GitHubAuth is unavailable', () => {
            expect(() => ClerkAuth.syncAuthState()).not.toThrow();
        });

        test('mirrors a signed-in Clerk user into GitHubAuth and refreshes', () => {
            const githubAuth = { isAuthenticated: false, accessToken: null, user: null, mode: null };
            const updateGitHubSignInUI = jest.fn();
            window.GitHubAuth = { githubAuth, updateGitHubSignInUI };
            window.GitHubAPI = { loadGitHubIssues: jest.fn() };
            window.EventBus = { emit: jest.fn() };
            window.Clerk = { user: { externalAccounts: [{ provider: 'github', username: 'octocat' }] } };

            ClerkAuth.syncAuthState();

            expect(githubAuth).toMatchObject({
                isAuthenticated: true, accessToken: null, mode: 'clerk', user: { login: 'octocat' }
            });
            expect(window.EventBus.emit).toHaveBeenCalledWith('github:auth-changed', {
                mode: 'clerk', user: { login: 'octocat' }
            });
            expect(updateGitHubSignInUI).toHaveBeenCalled();
            expect(window.GitHubAPI.loadGitHubIssues).toHaveBeenCalled();
        });

        test('clears Clerk auth on sign-out', () => {
            const githubAuth = { isAuthenticated: true, accessToken: null, user: { login: 'octocat' }, mode: 'clerk' };
            window.GitHubAuth = { githubAuth, updateGitHubSignInUI: jest.fn() };
            window.GitHubAPI = { loadGitHubIssues: jest.fn() };
            window.Clerk = {}; // signed out: no user

            ClerkAuth.syncAuthState();

            expect(githubAuth).toMatchObject({ isAuthenticated: false, accessToken: null, mode: null, user: null });
        });

        test('leaves non-Clerk (PAT) auth untouched', () => {
            const githubAuth = { isAuthenticated: true, accessToken: 'pat', user: { login: 'patuser' }, mode: 'pat' };
            window.GitHubAuth = { githubAuth, updateGitHubSignInUI: jest.fn() };
            window.Clerk = {}; // no user

            ClerkAuth.syncAuthState();

            expect(githubAuth).toMatchObject({ isAuthenticated: true, accessToken: 'pat', mode: 'pat' });
        });

        test('works without EventBus, updateGitHubSignInUI, or GitHubAPI present', () => {
            const githubAuth = { isAuthenticated: false, accessToken: null, user: null, mode: null };
            window.GitHubAuth = { githubAuth }; // no updateGitHubSignInUI
            window.Clerk = { user: { username: 'solo' } };

            expect(() => ClerkAuth.syncAuthState()).not.toThrow();
            expect(githubAuth.mode).toBe('clerk');
            expect(githubAuth.user).toEqual({ login: 'solo' });
        });
    });

    describe('signIn / signOut / getToken / isSignedIn / isAvailable', () => {
        test('signIn opens the Clerk modal when available', () => {
            window.Clerk = { openSignIn: jest.fn() };
            ClerkAuth.signIn();
            expect(window.Clerk.openSignIn).toHaveBeenCalled();
        });

        test('signIn is a no-op without Clerk', () => {
            expect(() => ClerkAuth.signIn()).not.toThrow();
        });

        test('signOut delegates to Clerk when available', async () => {
            window.Clerk = { signOut: jest.fn().mockResolvedValue('done') };
            await expect(ClerkAuth.signOut()).resolves.toBe('done');
        });

        test('signOut resolves without Clerk', async () => {
            await expect(ClerkAuth.signOut()).resolves.toBeUndefined();
        });

        test('getToken returns the session token', async () => {
            window.Clerk = { session: { getToken: jest.fn().mockResolvedValue('jwt') } };
            await expect(ClerkAuth.getToken()).resolves.toBe('jwt');
        });

        test('getToken returns null when there is a Clerk but no session', async () => {
            window.Clerk = {};
            await expect(ClerkAuth.getToken()).resolves.toBeNull();
        });

        test('getToken returns null when Clerk is absent', async () => {
            await expect(ClerkAuth.getToken()).resolves.toBeNull();
        });

        test('isSignedIn reflects Clerk user presence', () => {
            expect(ClerkAuth.isSignedIn()).toBe(false);
            window.Clerk = { user: { id: 'u' } };
            expect(ClerkAuth.isSignedIn()).toBe(true);
        });

        test('isAvailable starts false', () => {
            expect(ClerkAuth.isAvailable()).toBe(false);
        });
    });

    describe('initialize', () => {
        test('falls back to the built-in key when there is no backend config', async () => {
            // No /api/config (e.g. the static GitHub Pages build).
            global.fetch.mockResolvedValue({ ok: false });
            // Pre-set Clerk so loadClerkScript resolves immediately.
            window.Clerk = { load: jest.fn().mockResolvedValue(), addListener: jest.fn(), user: null };

            await expect(ClerkAuth.initialize()).resolves.toBe(true);
            expect(ClerkAuth.isAvailable()).toBe(true);
            expect(ClerkAuth.state.publishableKey)
                .toBe('pk_test_YWJsZS1hbGJhY29yZS01Ny5jbGVyay5hY2NvdW50cy5kZXYk');
            expect(ClerkAuth.state.githubRepo).toBeNull();
        });

        test('falls back to the built-in key when config omits the publishable key', async () => {
            global.fetch.mockResolvedValue({ ok: true, json: async () => ({ githubRepo: 'a/b' }) });
            window.Clerk = { load: jest.fn().mockResolvedValue(), addListener: jest.fn(), user: null };

            await expect(ClerkAuth.initialize()).resolves.toBe(true);
            expect(ClerkAuth.state.publishableKey)
                .toBe('pk_test_YWJsZS1hbGJhY29yZS01Ny5jbGVyay5hY2NvdW50cy5kZXYk');
            expect(ClerkAuth.state.githubRepo).toBe('a/b');
        });

        test('loads Clerk and wires up the listener on success', async () => {
            const host = 'able-albacore-57.clerk.accounts.dev';
            const key = `pk_test_${btoa(host + '$')}`;
            global.fetch.mockResolvedValue({
                ok: true, json: async () => ({ clerkPublishableKey: key, githubRepo: 'a/b' })
            });
            // Pre-set Clerk so loadClerkScript resolves immediately; addListener
            // invokes its callback so the listener wiring is exercised.
            const addListener = jest.fn((cb) => cb());
            window.Clerk = { load: jest.fn().mockResolvedValue(), addListener, user: null };
            window.GitHubAuth = { githubAuth: { mode: null }, updateGitHubSignInUI: jest.fn() };

            await expect(ClerkAuth.initialize()).resolves.toBe(true);
            expect(ClerkAuth.isAvailable()).toBe(true);
            expect(addListener).toHaveBeenCalled();
            expect(ClerkAuth.state.githubRepo).toBe('a/b');
        });

        test('defaults githubRepo to null when omitted', async () => {
            const key = `pk_test_${btoa('host.example$')}`;
            global.fetch.mockResolvedValue({ ok: true, json: async () => ({ clerkPublishableKey: key }) });
            window.Clerk = { load: jest.fn().mockResolvedValue(), addListener: jest.fn(), user: null };
            window.GitHubAuth = { githubAuth: { mode: null } };

            await ClerkAuth.initialize();
            expect(ClerkAuth.state.githubRepo).toBeNull();
        });

        test('returns false when clerk-js fails to load', async () => {
            // Valid config but an invalid key makes loadClerkScript reject.
            global.fetch.mockResolvedValue({ ok: true, json: async () => ({ clerkPublishableKey: 'invalid' }) });
            await expect(ClerkAuth.initialize()).resolves.toBe(false);
            expect(ClerkAuth.isAvailable()).toBe(false);
        });
    });
});
