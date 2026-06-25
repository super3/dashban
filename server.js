// Simple Node/Express backend for Dashban.
//
// On Railway this single process serves the static frontend and hosts the small
// API the app needs. For now that is a health check and a browser-safe config
// endpoint; the Clerk-authenticated GitHub proxy is layered on top of this.
//
// It deliberately serves only the frontend assets (index.html and src/), never
// the repo root, so server code, package metadata and any .env stay private.
const express = require('express');
const path = require('path');

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
