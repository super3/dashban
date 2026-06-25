/**
 * @jest-environment node
 *
 * Tests for the Express backend (server.js).
 */
const request = require('supertest');
const app = require('../server.js');

describe('Dashban server', () => {
    describe('GET /api/health', () => {
        test('returns an ok status payload', async () => {
            const res = await request(app).get('/api/health');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ status: 'ok', service: 'dashban' });
        });
    });

    describe('GET /api/config', () => {
        const ORIGINAL = { ...process.env };

        afterEach(() => {
            process.env = { ...ORIGINAL };
        });

        test('returns safe defaults when no env vars are set', async () => {
            delete process.env.CLERK_PUBLISHABLE_KEY;
            delete process.env.GITHUB_REPO;

            const res = await request(app).get('/api/config');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({
                clerkPublishableKey: null,
                githubRepo: 'super3/dashban'
            });
        });

        test('reflects configured env vars without exposing secrets', async () => {
            process.env.CLERK_PUBLISHABLE_KEY = 'pk_test_123';
            process.env.GITHUB_REPO = 'acme/widgets';

            const res = await request(app).get('/api/config');

            expect(res.body).toEqual({
                clerkPublishableKey: 'pk_test_123',
                githubRepo: 'acme/widgets'
            });
        });
    });

    describe('static frontend', () => {
        test('serves index.html at the root', async () => {
            const res = await request(app).get('/');
            expect(res.status).toBe(200);
            expect(res.text).toContain('<!DOCTYPE html>');
        });

        test('serves modules under /src', async () => {
            const res = await request(app).get('/src/event-bus.js');
            expect(res.status).toBe(200);
            expect(res.headers['content-type']).toMatch(/javascript/);
            expect(res.text).toContain('EventBus');
        });

        test('does not expose backend or secret files outside the frontend', async () => {
            // server.js, package.json and dotfiles must not be reachable over HTTP.
            expect((await request(app).get('/server.js')).status).toBe(404);
            expect((await request(app).get('/package.json')).status).toBe(404);
            expect((await request(app).get('/.env')).status).toBe(404);
        });
    });

    describe('unknown routes', () => {
        test('an unknown API route returns 404', async () => {
            const res = await request(app).get('/api/does-not-exist');
            expect(res.status).toBe(404);
        });
    });
});
