// Clerk-based "Sign in with GitHub" for Dashban — the only authentication method.
//
// The user signs in with their own GitHub account through Clerk, and GitHub API
// calls are routed through the backend proxy, which attaches the user's own
// token. The browser never sees a GitHub token.
//
// This works whether the app is served by its own backend (Railway) or as a
// static build on another host (e.g. GitHub Pages on dashban.com): config is
// fetched from the backend via getApiBase(), and if that is unreachable we fall
// back to the built-in publishable key so Clerk still initializes. Clerk-js is
// loaded cross-origin from Clerk's frontend API. Initialization is driven by
// github.js so the module has no side effects at load time.
(function () {
    'use strict';

    // Browser-safe Clerk publishable key. Used as a fallback so Clerk can still
    // initialize when the backend's /api/config is unreachable (e.g. on the
    // static GitHub Pages build, or before the cross-origin request resolves).
    const DEFAULT_CLERK_PUBLISHABLE_KEY = 'pk_test_YWJsZS1hbGJhY29yZS01Ny5jbGVyay5hY2NvdW50cy5kZXYk';

    const state = {
        available: false,   // Clerk has loaded and is ready to use
        publishableKey: null,
        githubRepo: null
    };

    // Read the browser-safe config the backend exposes (via getApiBase() so the
    // static build can reach the backend cross-origin). Returns null when the
    // backend is unreachable or the request otherwise fails.
    async function fetchConfig() {
        try {
            const base = window.GitHubAuth?.getApiBase?.() || '';
            const response = await fetch(`${base}/api/config`);
            if (!response.ok) {
                return null;
            }
            return await response.json();
        } catch {
            return null;
        }
    }

    // Clerk encodes its Frontend API host in the publishable key as
    // `pk_<env>_<base64("<host>$")>`. Decode it so clerk-js can be loaded from the
    // correct host without hardcoding it.
    function frontendApiFromKey(publishableKey) {
        try {
            const encoded = String(publishableKey).split('_')[2];
            if (!encoded) {
                return null;
            }
            const host = atob(encoded).replace(/\$+$/, '');
            return host || null;
        } catch {
            return null;
        }
    }

    // Inject the clerk-js script and resolve once window.Clerk has loaded.
    function loadClerkScript(publishableKey) {
        return new Promise((resolve, reject) => {
            if (window.Clerk) {
                // Already present (e.g. loaded by a previous initialize() call).
                resolve();
                return;
            }

            const frontendApi = frontendApiFromKey(publishableKey);
            if (!frontendApi) {
                reject(new Error('Invalid Clerk publishable key'));
                return;
            }

            const script = document.createElement('script');
            script.src = `https://${frontendApi}/npm/@clerk/clerk-js@5/dist/clerk.browser.js`;
            script.async = true;
            script.crossOrigin = 'anonymous';
            script.setAttribute('data-clerk-publishable-key', publishableKey);
            script.addEventListener('load', () => {
                window.Clerk.load().then(resolve).catch(reject);
            });
            script.addEventListener('error', () => {
                reject(new Error('Failed to load Clerk'));
            });
            document.head.appendChild(script);
        });
    }

    // Resolve the user's GitHub username from their Clerk profile.
    function githubUsername(user) {
        if (!user) {
            return 'GitHub User';
        }
        const accounts = user.externalAccounts || [];
        const github = accounts.find((account) =>
            account.provider === 'github' || account.provider === 'oauth_github'
        );
        if (github && github.username) {
            return github.username;
        }
        return user.username || 'GitHub User';
    }

    // Mirror the current Clerk session into the shared GitHubAuth state and ask
    // the rest of the app to refresh (header UI + issue list).
    function syncAuthState() {
        const auth = window.GitHubAuth && window.GitHubAuth.githubAuth;
        if (!auth) {
            return;
        }

        const user = window.Clerk && window.Clerk.user;
        if (user) {
            auth.isAuthenticated = true;
            auth.mode = 'clerk';
            auth.user = { login: githubUsername(user) };
        } else if (auth.mode === 'clerk') {
            // Was signed in with Clerk, now signed out.
            auth.isAuthenticated = false;
            auth.mode = null;
            auth.user = null;
        } else {
            // Not a Clerk session and never was — leave any PAT auth untouched.
            return;
        }

        if (window.EventBus) {
            window.EventBus.emit('github:auth-changed', { mode: auth.mode, user: auth.user });
        }
        if (window.GitHubAuth.updateGitHubSignInUI) {
            window.GitHubAuth.updateGitHubSignInUI();
        }
        if (window.GitHubAPI && window.GitHubAPI.loadGitHubIssues) {
            window.GitHubAPI.loadGitHubIssues();
        }
    }

    // Initialize Clerk. Resolves to true when Clerk is available for use, false
    // when clerk-js fails to load.
    async function initialize() {
        const config = await fetchConfig();
        // Fall back to the built-in key so Clerk still initializes when the
        // backend config is unreachable (e.g. the static GitHub Pages build).
        const publishableKey = (config && config.clerkPublishableKey) || DEFAULT_CLERK_PUBLISHABLE_KEY;
        state.publishableKey = publishableKey;
        state.githubRepo = (config && config.githubRepo) || null;

        try {
            await loadClerkScript(publishableKey);
        } catch (error) {
            /* istanbul ignore next: console noise only runs outside the Jest test environment */
            if (typeof jest === 'undefined') {
                console.error('Failed to initialize Clerk:', error);
            }
            state.available = false;
            return false;
        }

        state.available = true;
        window.Clerk.addListener(() => syncAuthState());
        syncAuthState();
        return true;
    }

    // Open Clerk's sign-in modal (GitHub is the only configured provider).
    function signIn() {
        if (window.Clerk) {
            window.Clerk.openSignIn();
        }
    }

    function signOut() {
        if (window.Clerk) {
            return window.Clerk.signOut();
        }
        return Promise.resolve();
    }

    // Short-lived session token for the proxy's `Authorization: Bearer` header.
    async function getToken() {
        if (window.Clerk && window.Clerk.session) {
            return window.Clerk.session.getToken();
        }
        return null;
    }

    function isAvailable() {
        return state.available;
    }

    function isSignedIn() {
        return Boolean(window.Clerk && window.Clerk.user);
    }

    const ClerkAuth = {
        state,
        fetchConfig,
        frontendApiFromKey,
        loadClerkScript,
        githubUsername,
        syncAuthState,
        initialize,
        signIn,
        signOut,
        getToken,
        isAvailable,
        isSignedIn
    };

    window.ClerkAuth = ClerkAuth;

    /* istanbul ignore else: the browser-only path (no CommonJS module) is unreachable under Jest */
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = ClerkAuth;
    }
})();
