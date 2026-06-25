/**
 * @jest-environment node
 *
 * Tests for the Clerk-authenticated GitHub proxy in server.js.
 * @clerk/express is mocked so no real Clerk instance or secret key is needed.
 */

// Controllable mock state (must be prefixed `mock*` to be used in jest.mock factory).
let mockAuthed = true;
let mockUserId = 'user_123';
const mockGetUserOauthAccessToken = jest.fn();

jest.mock('@clerk/express', () => ({
    clerkMiddleware: () => (req, res, next) => next(),
    requireAuth: () => (req, res, next) => {
        if (mockAuthed) return next();
        return res.status(401).json({ error: 'Unauthenticated' });
    },
    getAuth: () => ({ userId: mockUserId }),
    clerkClient: {
        users: {
            getUserOauthAccessToken: (...args) => mockGetUserOauthAccessToken(...args)
        }
    }
}));

// Mark Clerk as configured so the real (mocked) proxy is mounted at load time.
process.env.CLERK_SECRET_KEY = 'sk_test_dummy';

const request = require('supertest');
const app = require('../server.js');

describe('GitHub proxy (/api/github)', () => {
    let originalFetch;

    beforeEach(() => {
        mockAuthed = true;
        mockUserId = 'user_123';
        mockGetUserOauthAccessToken.mockReset();
        mockGetUserOauthAccessToken.mockResolvedValue({ data: [{ token: 'gho_usertoken' }] });
        originalFetch = global.fetch;
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    function mockGitHub({ status = 200, body = '{}', contentType = 'application/json' } = {}) {
        global.fetch = jest.fn().mockResolvedValue({
            status,
            text: async () => body,
            headers: { get: (h) => (h.toLowerCase() === 'content-type' ? contentType : null) }
        });
    }

    test('rejects unauthenticated requests with 401', async () => {
        mockAuthed = false;
        const res = await request(app).get('/api/github/repos/super3/dashban/issues');
        expect(res.status).toBe(401);
        expect(mockGetUserOauthAccessToken).not.toHaveBeenCalled();
    });

    test('forwards an authenticated GET to GitHub using the user\'s own token', async () => {
        mockGitHub({ status: 200, body: JSON.stringify([{ number: 1 }]) });

        const res = await request(app).get('/api/github/repos/super3/dashban/issues?state=open');

        expect(mockGetUserOauthAccessToken).toHaveBeenCalledWith('user_123', 'github');
        expect(global.fetch).toHaveBeenCalledWith(
            'https://api.github.com/repos/super3/dashban/issues?state=open',
            expect.objectContaining({
                method: 'GET',
                headers: expect.objectContaining({ Authorization: 'Bearer gho_usertoken' })
            })
        );
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ number: 1 }]);
    });

    test('forwards a POST with a JSON body and content-type', async () => {
        mockGitHub({ status: 201, body: JSON.stringify({ number: 5 }) });

        const res = await request(app)
            .post('/api/github/repos/super3/dashban/issues')
            .send({ title: 'New issue' });

        const [, options] = global.fetch.mock.calls[0];
        expect(options.method).toBe('POST');
        expect(options.body).toBe(JSON.stringify({ title: 'New issue' }));
        expect(options.headers['Content-Type']).toBe('application/json');
        expect(res.status).toBe(201);
    });

    test('returns 403 when the user has no connected GitHub token (empty list)', async () => {
        mockGetUserOauthAccessToken.mockResolvedValue({ data: [] });
        const res = await request(app).get('/api/github/repos/x/y/issues');
        expect(res.status).toBe(403);
    });

    test('returns 403 when Clerk returns no token data at all', async () => {
        mockGetUserOauthAccessToken.mockResolvedValue({ data: null });
        const res = await request(app).get('/api/github/repos/x/y/issues');
        expect(res.status).toBe(403);
    });

    test('returns 502 when the Clerk token lookup throws', async () => {
        mockGetUserOauthAccessToken.mockRejectedValue(new Error('clerk unavailable'));
        const res = await request(app).get('/api/github/repos/x/y/issues');
        expect(res.status).toBe(502);
        expect(res.body.error).toMatch(/Clerk/);
    });

    test('returns 502 when the GitHub request itself fails', async () => {
        global.fetch = jest.fn().mockRejectedValue(new Error('network down'));
        const res = await request(app).get('/api/github/repos/x/y/issues');
        expect(res.status).toBe(502);
    });

    test('passes through a GitHub response with no content-type header', async () => {
        mockGitHub({ status: 204, body: '', contentType: null });
        const res = await request(app).delete('/api/github/repos/x/y/issues/1/labels/bug');
        expect(res.status).toBe(204);
    });
});
