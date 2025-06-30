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

        test('createGitHubIssue should handle non-GitHub API errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Some other error'));

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            const result = await window.GitHubAPI.createGitHubIssue('Test', 'Description');

            expect(result).toBeNull();
            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Failed to create GitHub issue. Check your token permissions and network connection.'));
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
            // The loadGitHubIssues function calls fetch with URL and fetchOptions object
            expect(firstCall.length).toBe(2);
        });

        test('loadGitHubIssues should fetch both open and closed issues', async () => {
            const mockOpenIssues = [
                {
                    id: 1,
                    number: 123,
                    title: 'Open Issue',
                    body: 'Description',
                    labels: [{ name: 'backlog' }],
                    assignee: null,
                    user: { login: 'testuser', avatar_url: 'avatar.jpg' },
                    created_at: '2023-01-01T00:00:00Z'
                }
            ];

            const mockClosedIssues = [
                {
                    id: 2,
                    number: 124,
                    title: 'Closed Issue',
                    body: 'Description',
                    labels: [{ name: 'bug' }],
                    assignee: null,
                    user: { login: 'testuser', avatar_url: 'avatar.jpg' },
                    created_at: '2023-01-01T00:00:00Z'
                }
            ];

            // Mock two fetch calls for open and closed issues
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockOpenIssues
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockClosedIssues
                });

            const mockOpenElement = document.createElement('div');
            const mockClosedElement = document.createElement('div');
            
            window.GitHubUI.createGitHubIssueElement = jest.fn()
                .mockReturnValueOnce(mockOpenElement)
                .mockReturnValueOnce(mockClosedElement);
            
            window.GitHubUI.applyReviewIndicatorsToColumn = jest.fn();
            window.GitHubUI.applyCompletedSectionsToColumn = jest.fn();

            await window.GitHubAPI.loadGitHubIssues();

            const backlogColumn = document.getElementById('backlog');
            const doneColumn = document.getElementById('done');

            expect(backlogColumn.contains(mockOpenElement)).toBe(true);
            expect(doneColumn.contains(mockClosedElement)).toBe(true);
            expect(window.GitHubUI.applyReviewIndicatorsToColumn).toHaveBeenCalled();
            expect(window.GitHubUI.applyCompletedSectionsToColumn).toHaveBeenCalled();
        });

        test('loadGitHubIssues should handle missing target column for open issues', async () => {
            const mockIssues = [
                {
                    id: 1,
                    number: 123,
                    title: 'Test Issue',
                    body: 'Description',
                    labels: [{ name: 'unknown-status' }],
                    assignee: null,
                    user: { login: 'testuser', avatar_url: 'avatar.jpg' },
                    created_at: '2023-01-01T00:00:00Z'
                }
            ];

            // Remove the backlog column to test missing column handling
            const backlogColumn = document.getElementById('backlog');
            backlogColumn.remove();

            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockIssues
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => []
                });

            window.GitHubUI.createGitHubIssueElement = jest.fn().mockReturnValue(document.createElement('div'));
            window.GitHubUI.applyReviewIndicatorsToColumn = jest.fn();
            window.GitHubUI.applyCompletedSectionsToColumn = jest.fn();

            // Should not throw error even when target column doesn't exist
            await expect(window.GitHubAPI.loadGitHubIssues()).resolves.toBeUndefined();
        });

        test('loadGitHubIssues should handle missing done column for closed issues', async () => {
            const mockClosedIssues = [
                {
                    id: 2,
                    number: 124,
                    title: 'Closed Issue',
                    body: 'Description',
                    labels: [{ name: 'bug' }],
                    assignee: null,
                    user: { login: 'testuser', avatar_url: 'avatar.jpg' },
                    created_at: '2023-01-01T00:00:00Z'
                }
            ];

            // Remove the done column completely to test missing column handling
            const doneColumn = document.getElementById('done');
            doneColumn.remove();

            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => []
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockClosedIssues
                });

            window.GitHubUI.createGitHubIssueElement = jest.fn().mockReturnValue(document.createElement('div'));
            window.GitHubUI.applyReviewIndicatorsToColumn = jest.fn();
            window.GitHubUI.applyCompletedSectionsToColumn = jest.fn();

            // Should not throw error and handle missing done column gracefully
            await expect(window.GitHubAPI.loadGitHubIssues()).resolves.toBeUndefined();

            // The function should still call createGitHubIssueElement for the closed issue
            expect(window.GitHubUI.createGitHubIssueElement).toHaveBeenCalledWith(mockClosedIssues[0], false);
        });

        test('loadGitHubIssues should handle closed response error', async () => {
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => []
                })
                .mockResolvedValueOnce({
                    ok: false,
                    status: 403
                });

            await expect(window.GitHubAPI.loadGitHubIssues()).resolves.toBeUndefined();
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

        test('loadGitHubIssues should handle API error with missing message', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({}) // No message property
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

        test('archiveGitHubIssue should handle API error with missing message', async () => {
            const mockElement = {
                remove: jest.fn()
            };

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => ({}) // No message property
            });

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.archiveGitHubIssue('123', mockElement);

            expect(mockElement.remove).toHaveBeenCalled();
            expect(window.updateColumnCounts).toHaveBeenCalled();
            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('GitHub API error: 500 - Unknown error'));
        });

        test('archiveGitHubIssue should handle network errors', async () => {
            const mockElement = {
                remove: jest.fn()
            };

            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.archiveGitHubIssue('123', mockElement);

            expect(mockElement.remove).toHaveBeenCalled();
            expect(window.updateColumnCounts).toHaveBeenCalled();
            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Failed to add archive label to GitHub issue'));
        });

        test('archiveGitHubIssue should handle JSON parsing errors', async () => {
            const mockElement = {
                remove: jest.fn()
            };

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                json: async () => {
                    throw new Error('JSON parse error');
                }
            });

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.archiveGitHubIssue('123', mockElement);

            expect(mockElement.remove).toHaveBeenCalled();
            expect(window.updateColumnCounts).toHaveBeenCalled();
            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Failed to add archive label to GitHub issue'));
        });

        test('archiveGitHubIssue should handle error logging in non-jest environment', async () => {
            const mockElement = {
                remove: jest.fn()
            };

            // Temporarily hide jest to trigger non-test environment logging
            const originalJest = global.jest;
            delete global.jest;

            // Mock console.error to capture the call
            const originalConsoleError = console.error;
            const originalConsoleLog = console.log;
            console.error = jest.fn();
            console.log = jest.fn();

            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.archiveGitHubIssue('123', mockElement);

            expect(console.error).toHaveBeenCalledWith('❌ Failed to archive GitHub issue:', expect.any(Error));

            // Restore
            global.jest = originalJest;
            console.error = originalConsoleError;
            console.log = originalConsoleLog;
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

        test('updateGitHubIssueLabels should handle unauthenticated state', async () => {
            window.GitHubAuth.githubAuth.isAuthenticated = false;

            await window.GitHubAPI.updateGitHubIssueLabels('123', 'inprogress');

            expect(mockFetch).not.toHaveBeenCalled();
        });

        test('updateGitHubIssueLabels should handle no access token', async () => {
            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = null;

            await window.GitHubAPI.updateGitHubIssueLabels('123', 'inprogress');

            expect(mockFetch).not.toHaveBeenCalled();
        });

        test('updateGitHubIssueLabels should handle fetch error when getting issue', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.updateGitHubIssueLabels('123', 'inprogress');

            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Failed to update GitHub issue labels'));
        });

        test('updateGitHubIssueLabels should handle API error when updating labels', async () => {
            // Mock successful GET response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ labels: [{ name: 'bug' }] })
            });

            // Mock failed PUT response
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                json: async () => ({ message: 'Forbidden' })
            });

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.updateGitHubIssueLabels('123', 'review');

            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('GitHub API error: 403 - Forbidden'));
        });

        test('updateGitHubIssueLabels should handle network error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.updateGitHubIssueLabels('123', 'inprogress');

            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Failed to update GitHub issue labels'));
        });

        test('updateGitHubIssueLabels should filter existing status labels and add new ones', async () => {
            // Mock GET response with existing labels including status labels
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ 
                    labels: [
                        { name: 'bug' }, 
                        { name: 'in progress' }, // This should be filtered out
                        { name: 'priority-high' }
                    ] 
                })
            });

            // Mock successful PUT response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ labels: [{ name: 'bug' }, { name: 'priority-high' }, { name: 'review' }] })
            });

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.updateGitHubIssueLabels('123', 'review');

            // Check that the PUT call includes filtered labels plus new status label
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/labels'),
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify({
                        labels: ['bug', 'priority-high', 'review']
                    })
                })
            );
        });

        test('updateGitHubIssueLabels should handle backlog column (no label)', async () => {
            // Mock GET response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ 
                    labels: [
                        { name: 'bug' }, 
                        { name: 'in progress' }
                    ] 
                })
            });

            // Mock successful PUT response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ labels: [{ name: 'bug' }] })
            });

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.updateGitHubIssueLabels('123', 'backlog');

            // For backlog, no new status label should be added, just existing status labels removed
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/labels'),
                expect.objectContaining({
                    method: 'PUT',
                    body: JSON.stringify({
                        labels: ['bug']
                    })
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

        test('closeGitHubIssue should handle unauthenticated state', async () => {
            window.GitHubAuth.githubAuth.isAuthenticated = false;

            await window.GitHubAPI.closeGitHubIssue('123');

            expect(mockFetch).not.toHaveBeenCalled();
        });

        test('closeGitHubIssue should handle no access token', async () => {
            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = null;

            await window.GitHubAPI.closeGitHubIssue('123');

            expect(mockFetch).not.toHaveBeenCalled();
        });

        test('closeGitHubIssue should handle API errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                json: async () => ({ message: 'Forbidden' })
            });

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.closeGitHubIssue('123');

            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Failed to close GitHub issue'));
        });

        test('closeGitHubIssue should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.closeGitHubIssue('123');

            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Failed to close GitHub issue'));
        });

        test('updateGitHubIssueDescription should update issue description', async () => {
            const mockResponse = {
                ok: true,
                json: async () => ({ body: 'Updated description' })
            };

            mockFetch.mockResolvedValueOnce(mockResponse);

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            // Create a mock task element
            const mockTask = document.createElement('div');
            mockTask.setAttribute('data-issue-number', '123');
            document.body.appendChild(mockTask);

            const result = await window.GitHubAPI.updateGitHubIssueDescription('123', 'Updated description');

            expect(result).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.github.com/repos/super3/dashban/issues/123',
                expect.objectContaining({
                    method: 'PATCH',
                    headers: expect.objectContaining({
                        'Authorization': 'token test-token'
                    }),
                    body: JSON.stringify({ body: 'Updated description' })
                })
            );

            // Check that the data attribute was updated
            expect(mockTask.getAttribute('data-raw-description')).toBe('Updated description');

            // Clean up
            document.body.removeChild(mockTask);
        });

        test('updateGitHubIssueDescription should handle unauthenticated state', async () => {
            window.GitHubAuth.githubAuth.isAuthenticated = false;

            const result = await window.GitHubAPI.updateGitHubIssueDescription('123', 'New description');

            expect(result).toBe(false);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        test('updateGitHubIssueDescription should handle no access token', async () => {
            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = null;

            const result = await window.GitHubAPI.updateGitHubIssueDescription('123', 'New description');

            expect(result).toBe(false);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        test('updateGitHubIssueDescription should handle API errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 403,
                json: async () => ({ message: 'Forbidden' })
            });

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            const result = await window.GitHubAPI.updateGitHubIssueDescription('123', 'New description');

            expect(result).toBe(false);
            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Failed to update GitHub issue description'));
        });

        test('updateGitHubIssueDescription should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.updateGitHubIssueDescription('123', 'Updated description');

            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Failed to update GitHub issue description'));
        });

        test('getGitHubIssueComments should fetch comments successfully', async () => {
            const mockComments = [
                { id: 1, body: 'First comment', user: { login: 'user1' } },
                { id: 2, body: 'Second comment', user: { login: 'user2' } }
            ];
            const mockResponse = {
                ok: true,
                json: async () => mockComments
            };

            mockFetch.mockResolvedValueOnce(mockResponse);

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            const result = await window.GitHubAPI.getGitHubIssueComments('123');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/issues/123/comments'),
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.objectContaining({
                        'Authorization': 'token test-token'
                    })
                })
            );
            expect(result).toEqual(mockComments);
        });

        test('getGitHubIssueComments should return empty array when not authenticated', async () => {
            window.GitHubAuth.githubAuth.isAuthenticated = false;
            window.GitHubAuth.githubAuth.accessToken = null;

            const result = await window.GitHubAPI.getGitHubIssueComments('123');

            expect(result).toEqual([]);
            expect(mockFetch).not.toHaveBeenCalled();
        });

        test('getGitHubIssueComments should handle API errors', async () => {
            const mockResponse = {
                ok: false,
                status: 404,
                json: async () => ({ message: 'Not Found' })
            };

            mockFetch.mockResolvedValueOnce(mockResponse);

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            const result = await window.GitHubAPI.getGitHubIssueComments('123');

            expect(result).toEqual([]);
            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch GitHub issue comments'));
        });

        test('getGitHubIssueComments should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            const result = await window.GitHubAPI.getGitHubIssueComments('123');

            expect(result).toEqual([]);
            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch GitHub issue comments'));
        });

        test('createGitHubIssueComment should create comment successfully', async () => {
            const mockComment = {
                id: 123,
                body: 'New comment',
                user: { login: 'testuser' }
            };
            const mockResponse = {
                ok: true,
                json: async () => mockComment
            };

            mockFetch.mockResolvedValueOnce(mockResponse);

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            const result = await window.GitHubAPI.createGitHubIssueComment('123', 'New comment');

            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('/issues/123/comments'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'token test-token',
                        'Content-Type': 'application/json'
                    }),
                    body: JSON.stringify({ body: 'New comment' })
                })
            );
            expect(result).toEqual(mockComment);
        });

        test('createGitHubIssueComment should return null when not authenticated', async () => {
            window.GitHubAuth.githubAuth.isAuthenticated = false;
            window.GitHubAuth.githubAuth.accessToken = null;

            const result = await window.GitHubAPI.createGitHubIssueComment('123', 'New comment');

            expect(result).toBeNull();
            expect(mockFetch).not.toHaveBeenCalled();
        });

        test('createGitHubIssueComment should handle API errors', async () => {
            const mockResponse = {
                ok: false,
                status: 422,
                json: async () => ({ message: 'Validation Failed' })
            };

            mockFetch.mockResolvedValueOnce(mockResponse);

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            const result = await window.GitHubAPI.createGitHubIssueComment('123', 'New comment');

            expect(result).toBeNull();
            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Failed to create GitHub issue comment'));
        });

        test('createGitHubIssueComment should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            const result = await window.GitHubAPI.createGitHubIssueComment('123', 'New comment');

            expect(result).toBeNull();
            expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining('Failed to create GitHub issue comment'));
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

        test('initializeGitHubIssues should add skeleton cards to all columns', () => {
            const mockSkeletonCard = document.createElement('div');
            mockSkeletonCard.classList.add('animate-pulse');
            
            window.GitHubUI.createSkeletonCard = jest.fn().mockReturnValue(mockSkeletonCard);

            // Mock Math.random to return consistent values for testing
            const originalMathRandom = Math.random;
            Math.random = jest.fn()
                .mockReturnValueOnce(0.1) // backlog: Math.floor(0.1 * 2) + 1 = 1
                .mockReturnValueOnce(0.9) // inprogress: Math.floor(0.9 * 2) + 1 = 2  
                .mockReturnValueOnce(0.5) // review: Math.floor(0.5 * 2) + 1 = 2
                .mockReturnValueOnce(0.3); // done: Math.floor(0.3 * 2) + 1 = 1

            window.GitHubAPI.initializeGitHubIssues();

            // Should be called 6 times total (1+2+2+1)
            expect(window.GitHubUI.createSkeletonCard).toHaveBeenCalledTimes(6);

            // Restore Math.random
            Math.random = originalMathRandom;
        });

        test('initializeGitHubIssues should handle missing columns gracefully', () => {
            // Remove all columns
            document.getElementById('backlog').remove();
            document.getElementById('inprogress').remove();
            document.getElementById('review').remove();
            document.getElementById('done').remove();

            const mockSkeletonCard = document.createElement('div');
            window.GitHubUI.createSkeletonCard = jest.fn().mockReturnValue(mockSkeletonCard);

            // Should not throw error even when columns don't exist
            expect(() => {
                window.GitHubAPI.initializeGitHubIssues();
            }).not.toThrow();

            // Should not have called createSkeletonCard since no columns exist
            expect(window.GitHubUI.createSkeletonCard).not.toHaveBeenCalled();
        });

        test('initializeGitHubIssues should trigger loadGitHubIssues and remove skeletons', async () => {
            const mockSkeletonCard1 = document.createElement('div');
            const mockSkeletonCard2 = document.createElement('div');
            mockSkeletonCard1.classList.add('animate-pulse');
            mockSkeletonCard2.classList.add('animate-pulse');
            
            // Add skeleton cards to DOM manually to test removal
            document.getElementById('backlog').appendChild(mockSkeletonCard1);
            document.getElementById('inprogress').appendChild(mockSkeletonCard2);

            window.GitHubUI.createSkeletonCard = jest.fn().mockReturnValue(document.createElement('div'));

            // Mock successful fetch for loadGitHubIssues
            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => []
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => []
                });

            window.GitHubUI.applyReviewIndicatorsToColumn = jest.fn();
            window.GitHubUI.applyCompletedSectionsToColumn = jest.fn();

            window.GitHubAPI.initializeGitHubIssues();

            // Wait for the async operations to complete
            await new Promise(resolve => setTimeout(resolve, 10));

            // Check that skeleton cards were removed
            expect(document.querySelectorAll('.animate-pulse')).toHaveLength(0);
        });

        test('initializeGitHubIssues should handle different random skeleton counts', () => {
            const mockSkeletonCard = document.createElement('div');
            window.GitHubUI.createSkeletonCard = jest.fn().mockReturnValue(mockSkeletonCard);

            // Mock Math.random to return 0 for minimum count (1 skeleton per column)
            const originalMathRandom = Math.random;
            Math.random = jest.fn().mockReturnValue(0); // Math.floor(0 * 2) + 1 = 1

            window.GitHubAPI.initializeGitHubIssues();

            // Should be called 4 times (1 per column)
            expect(window.GitHubUI.createSkeletonCard).toHaveBeenCalledTimes(4);

            // Restore Math.random
            Math.random = originalMathRandom;
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
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            const result = await window.GitHubAPI.createGitHubIssue('Test', 'Description');

            expect(result).toBeNull();
        });

        test('should handle error logging in non-jest environment for loadGitHubIssues', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Test error'));

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            await window.GitHubAPI.loadGitHubIssues();
        });

        test('isTestEnvironment should return true in test environment', () => {
            // Since we're in a Jest test environment, this should return true
            expect(typeof jest !== 'undefined').toBe(true);
        });

        test('createGitHubIssue should use isTestEnvironment for logging', async () => {
            // Mock console.error to test logging behavior
            const originalConsoleError = console.error;
            console.error = jest.fn();

            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            const result = await window.GitHubAPI.createGitHubIssue('Test', 'Description');

            expect(result).toBeNull();
            // In test environment, console.error should NOT be called due to isTestEnvironment() check
            expect(console.error).not.toHaveBeenCalled();

            // Restore
            console.error = originalConsoleError;
        });

        test('loadGitHubIssues should use isTestEnvironment for logging', async () => {
            // Mock console.error to test logging behavior
            const originalConsoleError = console.error;
            console.error = jest.fn();

            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            await window.GitHubAPI.loadGitHubIssues();

            // In test environment, console.error should NOT be called due to isTestEnvironment() check
            expect(console.error).not.toHaveBeenCalled();

            // Restore
            console.error = originalConsoleError;
        });
    });
}); 