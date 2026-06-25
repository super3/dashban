// Simple Node/Express backend for Dashban.
//
// On Railway this single process serves the static frontend and hosts the small
// API the app needs: a health check, a browser-safe config endpoint, and a
// Clerk-authenticated GitHub proxy (each signed-in user acts as themselves).
//
// It deliberately serves only the frontend assets (index.html and src/), never
// the repo root, so server code, package metadata and any .env stay private.
const express = require('express');
const path = require('path');
const { clerkMiddleware, requireAuth, getAuth, clerkClient } = require('@clerk/express');

const app = express();
app.use(express.json());

const ROOT = __dirname;

// Liveness/health check (used by Railway and uptime monitors).
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'dashban' });
});

// Public, browser-safe configuration the frontend reads at startup (e.g. to
// initialize Clerk). Only non-secret values belong here.
app.get('/api/config', (req, res) => {
    res.json({
        clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY || null,
        githubRepo: process.env.GITHUB_REPO || 'super3/dashban'
    });
});

// Authenticated GitHub API proxy. Each request is tied to a signed-in Clerk
// user; we look up *their* GitHub OAuth token server-side and forward the call
// to the GitHub REST API, so the token is never exposed to the browser.
// e.g. `/api/github/repos/super3/dashban/issues` -> `https://api.github.com/repos/super3/dashban/issues`.
//
// Only mounted when Clerk is configured; otherwise we return a clear 503 rather
// than letting the Clerk middleware throw a 500 (so the board still runs before
// the keys are set).
if (process.env.CLERK_SECRET_KEY) {
    app.use('/api/github', clerkMiddleware(), requireAuth(), githubProxy);
} else {
    app.use('/api/github', (req, res) => {
        res.status(503).json({ error: 'GitHub proxy is not configured (set CLERK_SECRET_KEY).' });
    });
}

async function githubProxy(req, res) {
    const { userId } = getAuth(req);

    let githubToken;
    try {
        // Clerk's GitHub provider token for this user (requires the GitHub social
        // connection to be configured with `repo`/`issues` scope).
        const tokens = await clerkClient.users.getUserOauthAccessToken(userId, 'github');
        const entry = (tokens.data || [])[0];
        githubToken = entry && entry.token;
    } catch {
        return res.status(502).json({ error: 'Could not retrieve GitHub token from Clerk' });
    }

    if (!githubToken) {
        return res.status(403).json({ error: 'No GitHub account connected for this user' });
    }

    const headers = {
        'Accept': 'application/vnd.github+json',
        'Authorization': `Bearer ${githubToken}`,
        'User-Agent': 'dashban-server'
    };

    const options = { method: req.method, headers };
    if (Object.keys(req.body).length > 0) {
        options.body = JSON.stringify(req.body);
        headers['Content-Type'] = 'application/json';
    }

    let githubResponse;
    try {
        githubResponse = await fetch(`https://api.github.com${req.url}`, options);
    } catch {
        return res.status(502).json({ error: 'GitHub request failed' });
    }

    const body = await githubResponse.text();
    res.status(githubResponse.status);
    const contentType = githubResponse.headers.get('content-type');
    if (contentType) {
        res.set('Content-Type', contentType);
    }
    res.send(body);
}

// Serve the frontend: index.html at the root, plus the src/ modules it loads.
app.get('/', (req, res) => {
    res.sendFile(path.join(ROOT, 'index.html'));
});
app.use('/src', express.static(path.join(ROOT, 'src')));

const PORT = process.env.PORT || 3000;

/* istanbul ignore next: the listen call only runs when started directly, not under test */
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Dashban server listening on port ${PORT}`);
    });
}

module.exports = app;
