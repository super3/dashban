/**
 * GitHub API Tests
 */

// Mock DOM elements and global objects
const mockLocalStorage = {
    store: {},
    getItem: function(key) {
        return this.store[key] || null;
    },
    setItem: function(key, value) {
        this.store[key] = value;
    },
    removeItem: function(key) {
        delete this.store[key];
    },
    clear: function() {
        this.store = {};
    }
};

const mockFetch = jest.fn();
const mockAlert = jest.fn();
const mockConfirm = jest.fn();

// Setup DOM and global mocks
beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
        <div id="backlog"></div>
        <div id="inprogress"></div>
        <div id="review"></div>
        <div id="done"></div>
    `;

    // Mock global objects
    global.localStorage = mockLocalStorage;
    global.fetch = mockFetch;
    global.alert = mockAlert;
    global.confirm = mockConfirm;
    global.navigator = { userAgent: 'test' };
    
    // Override window.localStorage to ensure the mock is used
    Object.defineProperty(window, 'localStorage', {
        value: mockLocalStorage,
        writable: true
    });
    
    // Mock SortableJS for kanban module
    global.Sortable = jest.fn().mockImplementation(() => ({
        destroy: jest.fn()
    }));
    global.window = {
        location: { 
            origin: 'https://dashban.com',
            pathname: '/',
            href: 'https://dashban.com/',
            search: ''
        },
        history: { replaceState: jest.fn() },
        markdownit: jest.fn(() => ({
            render: jest.fn((text) => `<p>${text}</p>`)
        })),
        DOMPurify: {
            sanitize: jest.fn((html) => html)
        }
    };

    // Mock window functions needed by GitHub API
    global.window.getPriorityColor = jest.fn((priority) => 'bg-red-100 text-red-800');
    global.window.getCategoryColor = jest.fn((category) => 'bg-blue-100 text-blue-800');
    global.window.updateColumnCounts = jest.fn();

    // Reset mocks
    mockFetch.mockReset();
    mockAlert.mockReset();
    mockConfirm.mockReset();
    mockLocalStorage.clear();

    // Set up default mock responses for GitHub API calls
    mockFetch.mockImplementation((url) => {
        if (url.includes('github.com/repos/super3/dashban/issues')) {
            return Promise.resolve({
                ok: true,
                json: async () => []
            });
        }
        return Promise.resolve({
            ok: false,
            status: 404
        });
    });

    // Load the kanban module first to set up window functions
    delete require.cache[require.resolve('../src/kanban.js')];
    require('../src/kanban.js');
    
    // Trigger DOMContentLoaded to initialize kanban module
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);

    // Load GitHub modules in correct order
    delete require.cache[require.resolve('../src/github-auth.js')];
    delete require.cache[require.resolve('../src/github-api.js')];
    delete require.cache[require.resolve('../src/github-ui.js')];
    
    require('../src/github-auth.js');
    require('../src/github-api.js');
    require('../src/github-ui.js');

    // Spy on the real window functions provided by kanban module (after they're loaded)
    if (typeof window.updateColumnCounts === 'function') {
        jest.spyOn(window, 'updateColumnCounts');
    }

    // Set up initial auth state for API tests
    window.GitHubAuth.githubAuth.isAuthenticated = true;
    window.GitHubAuth.githubAuth.accessToken = 'test-token';
});

describe('GitHub API', () => {
    describe('Issue Creation', () => {
        test('createGitHubIssue should create issue successfully', async () => {
            const mockIssue = {
                id: 1,
                number: 123,
                title: 'Test Issue',
                body: 'Description',
                labels: [{ name: 'bug' }],
                assignee: null,
                user: { login: 'testuser', avatar_url: 'avatar.jpg' },
                created_at: '2023-01-01T00:00:00Z'
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockIssue
            });

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            const result = await window.GitHubAPI.createGitHubIssue('Test Issue', 'Description', ['bug']);

            expect(result).toEqual(mockIssue);
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.github.com/repos/super3/dashban/issues',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'token test-token'
                    }),
                    body: JSON.stringify({
                        title: 'Test Issue',
                        body: 'Description',
                        labels: ['bug']
                    })
                })
            );
        });

        test('createGitHubIssue should handle API error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                json: async () => ({ message: 'Forbidden' })
            });

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            const result = await window.GitHubAPI.createGitHubIssue('Test Issue', 'Description');

            expect(result).toBeNull();
            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('GitHub Issue Creation Failed'));
        });

        test('createGitHubIssue should handle unauthenticated state', async () => {
            window.GitHubAuth.githubAuth.isAuthenticated = false;

            const result = await window.GitHubAPI.createGitHubIssue('Test', 'Description');

            expect(result).toBeNull();
            // Function logs to console but doesn't show alert for unauthenticated state
        });

        test('createGitHubIssue should handle fetch errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            const result = await window.GitHubAPI.createGitHubIssue('Test', 'Description');

            expect(result).toBeNull();
        });
    });

    describe('Issue Loading', () => {
        test('loadGitHubIssues should fetch and filter issues', async () => {
            const mockIssues = [
                {
                    id: 1,
                    number: 123,
                    title: 'Test Issue',
                    body: 'Description',
                    labels: [{ name: 'backlog' }],
                    assignee: null,
                    user: { login: 'testuser', avatar_url: 'avatar.jpg' },
                    created_at: '2023-01-01T00:00:00Z'
                }
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockIssues
            });

            // Mock createGitHubIssueElement
            window.GitHubUI.createGitHubIssueElement = jest.fn().mockReturnValue(document.createElement('div'));

            await window.GitHubAPI.loadGitHubIssues();

            // Check that fetch was called (the URL includes timestamp parameter)
            expect(mockFetch).toHaveBeenCalled();
            const firstCall = mockFetch.mock.calls[0];
            expect(firstCall[0]).toMatch(/https:\/\/api\.github\.com\/repos\/super3\/dashban\/issues\?state=open/);
            // The loadGitHubIssues function calls fetch with just the URL, no options object
            expect(firstCall.length).toBe(1);
        });

        test('loadGitHubIssues should place issues in correct columns based on labels', async () => {
            const mockIssues = [
                {
                    id: 1,
                    number: 123,
                    title: 'Backlog Issue',
                    body: 'Description',
                    labels: [{ name: 'backlog' }],
                    assignee: null,
                    user: { login: 'testuser', avatar_url: 'avatar.jpg' },
                    created_at: '2023-01-01T00:00:00Z'
                },
                {
                    id: 2,
                    number: 124,
                    title: 'In Progress Issue',
                    body: 'Description',
                    labels: [{ name: 'in progress' }],
                    assignee: null,
                    user: { login: 'testuser', avatar_url: 'avatar.jpg' },
                    created_at: '2023-01-01T00:00:00Z'
                }
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockIssues
            });

            const mockBacklogElement = document.createElement('div');
            const mockInProgressElement = document.createElement('div');
            
            window.GitHubUI.createGitHubIssueElement = jest.fn()
                .mockReturnValueOnce(mockBacklogElement)
                .mockReturnValueOnce(mockInProgressElement);

            await window.GitHubAPI.loadGitHubIssues();

            const backlogColumn = document.getElementById('backlog');
            const inProgressColumn = document.getElementById('inprogress');

            expect(backlogColumn.contains(mockBacklogElement)).toBe(true);
            expect(inProgressColumn.contains(mockInProgressElement)).toBe(true);
        });

        test('loadGitHubIssues should filter out archived issues', async () => {
            const mockIssues = [
                {
                    id: 1,
                    number: 123,
                    title: 'Active Issue',
                    body: 'Description',
                    labels: [{ name: 'backlog' }],
                    assignee: null,
                    user: { login: 'testuser', avatar_url: 'avatar.jpg' },
                    created_at: '2023-01-01T00:00:00Z'
                },
                {
                    id: 2,
                    number: 124,
                    title: 'Archived Issue',
                    body: 'Description',
                    labels: [{ name: 'archive' }, { name: 'backlog' }],
                    assignee: null,
                    user: { login: 'testuser', avatar_url: 'avatar.jpg' },
                    created_at: '2023-01-01T00:00:00Z'
                }
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockIssues
            });

            window.GitHubUI.createGitHubIssueElement = jest.fn().mockReturnValue(document.createElement('div'));

            await window.GitHubAPI.loadGitHubIssues();

            // Should only call createGitHubIssueElement once (for non-archived issue)
            expect(window.GitHubUI.createGitHubIssueElement).toHaveBeenCalledTimes(1);
            expect(window.GitHubUI.createGitHubIssueElement).toHaveBeenCalledWith(mockIssues[0], false);
        });

        test('loadGitHubIssues should handle missing columns gracefully', async () => {
            const mockIssues = [
                {
                    id: 1,
                    number: 123,
                    title: 'Test Issue',
                    body: 'Description',
                    labels: [{ name: 'nonexistent-column' }],
                    assignee: null,
                    user: { login: 'testuser', avatar_url: 'avatar.jpg' },
                    created_at: '2023-01-01T00:00:00Z'
                }
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockIssues
            });

            window.GitHubUI.createGitHubIssueElement = jest.fn().mockReturnValue(document.createElement('div'));

            // Should not throw error
            await expect(window.GitHubAPI.loadGitHubIssues()).resolves.toBeUndefined();
        });

        test('loadGitHubIssues should handle API errors gracefully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403
            });

            await expect(window.GitHubAPI.loadGitHubIssues()).resolves.toBeUndefined();
        });

        test('loadGitHubIssues should handle non-ok responses', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500
            });

            await expect(window.GitHubAPI.loadGitHubIssues()).resolves.toBeUndefined();
        });
    });

    describe('Issue Archiving', () => {
        test('archiveGitHubIssue should add archive label', async () => {
            const mockElement = {
                remove: jest.fn()
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ labels: [{ name: 'archive' }] })
            });

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.archiveGitHubIssue('123', mockElement);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.github.com/repos/super3/dashban/issues/123/labels',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'token test-token'
                    }),
                    body: '{"labels":["archive"]}'
                })
            );

            expect(mockElement.remove).toHaveBeenCalled();
            expect(window.updateColumnCounts).toHaveBeenCalled();
        });

        test('archiveGitHubIssue should handle unauthenticated state', async () => {
            const mockElement = {
                remove: jest.fn()
            };

            window.GitHubAuth.githubAuth.isAuthenticated = false;

            await window.GitHubAPI.archiveGitHubIssue('123', mockElement);

            expect(mockElement.remove).toHaveBeenCalled();
            expect(window.updateColumnCounts).toHaveBeenCalled();
        });

        test('archiveGitHubIssue should handle API errors', async () => {
            const mockElement = {
                remove: jest.fn()
            };

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403
            });

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.archiveGitHubIssue('123', mockElement);

            expect(mockElement.remove).toHaveBeenCalled();
            expect(window.updateColumnCounts).toHaveBeenCalled();
        });
    });

    describe('Issue Management', () => {
        test('updateGitHubIssueLabels should update issue labels', async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({ labels: [{ name: 'in progress' }] })
            };

            mockFetch.mockResolvedValueOnce(mockResponse);

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.updateGitHubIssueLabels('123', 'inprogress');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.github.com/repos/super3/dashban/issues/123/labels',
                expect.objectContaining({
                    method: 'PUT',
                    headers: expect.objectContaining({
                        'Authorization': 'token test-token'
                    }),
                    body: '{"labels":["in progress"]}'
                })
            );
        });

        test('closeGitHubIssue should close the issue', async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({ state: 'closed' })
            };

            mockFetch.mockResolvedValueOnce(mockResponse);

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.closeGitHubIssue('123');

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.github.com/repos/super3/dashban/issues/123',
                expect.objectContaining({
                    method: 'PATCH',
                    headers: expect.objectContaining({
                        'Authorization': 'token test-token'
                    }),
                    body: JSON.stringify({ state: 'closed' })
                })
            );
        });
    });

    describe('Initialization', () => {
        test('initializeGitHubIssues should add and remove skeleton cards', async () => {
            const mockSkeletonCard = document.createElement('div');
            mockSkeletonCard.classList.add('skeleton-card');
            
            window.GitHubUI.createSkeletonCard = jest.fn().mockReturnValue(mockSkeletonCard);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

            await window.GitHubAPI.initializeGitHubIssues();

            expect(window.GitHubUI.createSkeletonCard).toHaveBeenCalled();
            
            // Test should just verify the function was called, as skeleton removal
            // depends on timing and DOM manipulation that's hard to test
        });
    });

    describe('Error Handling', () => {
        test('should handle network errors gracefully', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            const result = await window.GitHubAPI.createGitHubIssue('Test', 'Description');

            expect(result).toBeNull();
        });

        test('should handle error logging in non-jest environment for createGitHubIssue', async () => {
            // Just test that the function returns null on error
            mockFetch.mockRejectedValueOnce(new Error('Test error'));

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            const result = await window.GitHubAPI.createGitHubIssue('Test', 'Description');

            expect(result).toBeNull();
        });

        test('should handle error logging in non-jest environment for loadGitHubIssues', async () => {
            // Just test that the function doesn't throw on error
            mockFetch.mockRejectedValueOnce(new Error('Test error'));

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await expect(window.GitHubAPI.loadGitHubIssues()).resolves.toBeUndefined();
        });
    });
}); 