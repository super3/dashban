/**
 * GitHub Integration Tests
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
        <header>
            <a href="https://github.com/super3/dashban" class="flex items-center space-x-2">GitHub</a>
        </header>
        <div id="github-token-modal" class="hidden">
            <form id="github-token-form">
                <input id="github-token-input" name="token" type="password">
                <button type="submit">Save Token</button>
                <button id="cancel-github-token" type="button">Cancel</button>
            </form>
            <button id="toggle-token-visibility">
                <i id="token-eye-icon" class="fas fa-eye"></i>
            </button>
        </div>
        <div id="github-option">
            <input id="create-github-issue" type="checkbox">
            <span id="github-status-text"></span>
        </div>
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
        history: { replaceState: jest.fn() }
    };
    global.URL = jest.fn().mockImplementation((url) => ({
        searchParams: {
            set: jest.fn()
        },
        toString: () => url
    }));
    global.URLSearchParams = jest.fn().mockImplementation((search) => ({
        get: jest.fn().mockReturnValue(null)
    }));

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

    // Load the github.js module
    delete require.cache[require.resolve('../src/github.js')];
    require('../src/github.js');

    // Spy on the real window functions provided by kanban module (after they're loaded)
    if (typeof window.updateColumnCounts === 'function') {
        jest.spyOn(window, 'updateColumnCounts');
    }
});

describe('GitHub Integration', () => {
    describe('Configuration', () => {
        test('should export GitHub configuration', () => {
            expect(window.GitHub.GITHUB_CONFIG).toBeDefined();
            expect(window.GitHub.GITHUB_CONFIG.appId).toBe('1385203');
            expect(window.GitHub.GITHUB_CONFIG.owner).toBe('super3');
            expect(window.GitHub.GITHUB_CONFIG.repo).toBe('dashban');
        });

        test('should initialize with default auth state', () => {
            expect(window.GitHub.githubAuth).toBeDefined();
            expect(window.GitHub.githubAuth.isAuthenticated).toBe(false);
            expect(window.GitHub.githubAuth.installationId).toBeNull();
            expect(window.GitHub.githubAuth.accessToken).toBeNull();
            expect(window.GitHub.githubAuth.user).toBeNull();
        });
    });

    describe('Token Modal Functions', () => {
        test('showGitHubTokenModal should show modal', () => {
            const modal = document.getElementById('github-token-modal');
            expect(modal.classList.contains('hidden')).toBe(true);
            
            window.GitHub.showGitHubTokenModal();
            
            expect(modal.classList.contains('hidden')).toBe(false);
        });

        test('hideGitHubTokenModal should hide modal and reset form', () => {
            const modal = document.getElementById('github-token-modal');
            const form = document.getElementById('github-token-form');
            const input = document.getElementById('github-token-input');
            
            modal.classList.remove('hidden');
            input.value = 'test-token';
            
            window.GitHub.hideGitHubTokenModal();
            
            expect(modal.classList.contains('hidden')).toBe(true);
            expect(input.value).toBe('');
        });
    });

    describe('Authentication Functions', () => {
        test('validateAndSetToken should validate token and store user data', async () => {
            const mockUser = { login: 'testuser', id: 123 };
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUser
            });

            const result = await window.GitHub.validateAndSetToken('test-token');

            expect(result).toBe(true);
            expect(window.GitHub.githubAuth.isAuthenticated).toBe(true);
            expect(window.GitHub.githubAuth.accessToken).toBe('test-token');
            expect(window.GitHub.githubAuth.user).toEqual(mockUser);
            expect(mockLocalStorage.getItem('github_access_token')).toBe('test-token');
        });

        test('validateAndSetToken should handle invalid token', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401
            });

            const result = await window.GitHub.validateAndSetToken('invalid-token');

            expect(result).toBe(false);
            expect(window.GitHub.githubAuth.accessToken).toBeNull();
        });

        test('signOutGitHub should clear token but preserve installation', () => {
            // Setup authenticated state
            window.GitHub.githubAuth.isAuthenticated = true;
            window.GitHub.githubAuth.installationId = '123456';
            window.GitHub.githubAuth.accessToken = 'token';
            window.GitHub.githubAuth.user = { login: 'test' };
            mockLocalStorage.setItem('github_installation_id', '123456');

            window.GitHub.signOutGitHub();

            expect(window.GitHub.githubAuth.isAuthenticated).toBe(true); // App still installed
            expect(window.GitHub.githubAuth.installationId).toBe('123456');
            expect(window.GitHub.githubAuth.accessToken).toBeNull();
            expect(window.GitHub.githubAuth.user).toBeNull();
            expect(mockLocalStorage.getItem('github_access_token')).toBeNull();
        });
    });

    describe('GitHub API Functions', () => {
        beforeEach(() => {
            // Setup authenticated state
            window.GitHub.githubAuth.isAuthenticated = true;
            window.GitHub.githubAuth.accessToken = 'test-token';
        });

        test('createGitHubIssue should create issue successfully', async () => {
            const mockIssue = { 
                number: 123, 
                title: 'Test Issue',
                id: 456,
                html_url: 'https://github.com/test/repo/issues/123'
            };
            
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockIssue
            });

            const result = await window.GitHub.createGitHubIssue('Test Issue', 'Description', ['bug']);

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

            const result = await window.GitHub.createGitHubIssue('Test Issue', 'Description');

            expect(result).toBeNull();
            expect(mockAlert).toHaveBeenCalledWith(
                expect.stringContaining('GitHub Issue Creation Failed')
            );
        });

        test('archiveGitHubIssue should add archive label', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({})
            });

            const mockElement = {
                remove: jest.fn()
            };

            await window.GitHub.archiveGitHubIssue('123', mockElement);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.github.com/repos/super3/dashban/issues/123/labels',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ labels: ['archive'] })
                })
            );
            expect(mockElement.remove).toHaveBeenCalled();
        });

        test('loadGitHubIssues should fetch and filter issues', async () => {
            // Reset the fetch mock to clear previous calls from initialization
            mockFetch.mockReset();
            
            // Reset the spy on updateColumnCounts
            if (window.updateColumnCounts && window.updateColumnCounts.mockReset) {
                window.updateColumnCounts.mockReset();
            }
            
            const mockOpenIssues = [
                { number: 1, labels: [{ name: 'bug' }], title: 'Bug Issue', user: { login: 'testuser' }, created_at: '2023-01-01T00:00:00Z' },
                { number: 2, labels: [{ name: 'archive' }], title: 'Archived Issue', user: { login: 'testuser' }, created_at: '2023-01-01T00:00:00Z' }
            ];
            const mockClosedIssues = [
                { number: 3, labels: [{ name: 'enhancement' }], title: 'Closed Issue', user: { login: 'testuser' }, created_at: '2023-01-01T00:00:00Z' }
            ];

            mockFetch
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockOpenIssues
                })
                .mockResolvedValueOnce({
                    ok: true,
                    json: async () => mockClosedIssues
                });

            await window.GitHub.loadGitHubIssues();

            // Should filter out archived issues
            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(window.updateColumnCounts).toHaveBeenCalled();
        });
    });

    describe('Utility Functions', () => {
        test('extractPriorityFromLabels should extract priority correctly', () => {
            const labels = [
                { name: 'bug' },
                { name: 'high' },
                { name: 'feature' }
            ];

            const priority = window.GitHub.extractPriorityFromLabels(labels);
            expect(priority).toBe('High');
        });

        test('extractCategoryFromLabels should extract category correctly', () => {
            const labels = [
                { name: 'high' },
                { name: 'bug' },
                { name: 'urgent' }
            ];

            const category = window.GitHub.extractCategoryFromLabels(labels);
            expect(category).toBe('Bug');
        });

        test('renderMarkdown should convert basic markdown', () => {
            const markdown = '**bold** *italic* `code` [link](http://example.com)';
            const html = window.GitHub.renderMarkdown(markdown);
            
            expect(html).toContain('<strong>bold</strong>');
            expect(html).toContain('<em>italic</em>');
            expect(html).toContain('<code class="bg-gray-100 text-gray-800 px-1 rounded text-xs">code</code>');
            expect(html).toContain('<a href="http://example.com" target="_blank" class="text-blue-600 hover:text-blue-800 underline">link</a>');
        });

        test('createSkeletonCard should create loading placeholder', () => {
            const skeleton = window.GitHub.createSkeletonCard();
            
            expect(skeleton.tagName).toBe('DIV');
            expect(skeleton.classList.contains('animate-pulse')).toBe(true);
        });
    });

    describe('GitHub Issue Element Creation', () => {
        test('createGitHubIssueElement should create issue element', () => {
            const mockIssue = {
                number: 123,
                id: 456,
                title: 'Test Issue',
                body: 'Test description',
                html_url: 'https://github.com/test/repo/issues/123',
                labels: [{ name: 'bug' }, { name: 'high' }],
                user: { login: 'testuser' },
                created_at: '2023-01-01T00:00:00Z'
            };

            const element = window.GitHub.createGitHubIssueElement(mockIssue, false);

            expect(element.tagName).toBe('DIV');
            expect(element.getAttribute('data-issue-number')).toBe('123');
            expect(element.getAttribute('data-issue-id')).toBe('456');
            expect(element.innerHTML).toContain('Test Issue');
            expect(element.innerHTML).toContain('#123');
            expect(element.innerHTML).toContain('testuser');
        });

        test('createGitHubIssueElement should show archive button for completed issues', () => {
            const mockIssue = {
                number: 123,
                id: 456,
                title: 'Completed Issue',
                body: null,
                html_url: 'https://github.com/test/repo/issues/123',
                labels: [],
                user: { login: 'testuser' },
                created_at: '2023-01-01T00:00:00Z'
            };

            const element = window.GitHub.createGitHubIssueElement(mockIssue, true);

            expect(element.innerHTML).toContain('archive-btn');
            expect(element.innerHTML).toContain('Completed');
            // The reverted design doesn't use opacity-75 class for completed issues
            expect(element.draggable).toBe(true);
        });
    });

    describe('UI State Management', () => {
        test('updateGitHubOptionUI should update form based on auth state', () => {
            const checkbox = document.getElementById('create-github-issue');
            const statusText = document.getElementById('github-status-text');

            // Test unauthenticated state
            window.GitHub.githubAuth.isAuthenticated = false;
            window.GitHub.updateGitHubOptionUI();

            expect(checkbox.disabled).toBe(true);
            expect(statusText.textContent).toContain('Install GitHub App');

            // Test authenticated but no token
            window.GitHub.githubAuth.isAuthenticated = true;
            window.GitHub.githubAuth.accessToken = null;
            window.GitHub.updateGitHubOptionUI();

            expect(checkbox.disabled).toBe(true);
            expect(statusText.textContent).toContain('Add a Personal Access Token');

            // Test fully authenticated
            window.GitHub.githubAuth.accessToken = 'token';
            window.GitHub.githubAuth.user = { login: 'testuser' };
            window.GitHub.updateGitHubOptionUI();

            expect(checkbox.disabled).toBe(false);
            expect(statusText.textContent).toContain('as testuser');
        });
    });

    describe('Installation Handling', () => {
        test('handleInstallationCallback should store installation ID', async () => {
            await window.GitHub.handleInstallationCallback('123456', 'auth-code');

            expect(window.GitHub.githubAuth.installationId).toBe('123456');
            expect(window.GitHub.githubAuth.isAuthenticated).toBe(true);
            expect(mockLocalStorage.getItem('github_installation_id')).toBe('123456');
        });

        test('validateAndSetInstallation should validate existing installation', async () => {
            mockLocalStorage.setItem('github_access_token', 'existing-token');
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ login: 'testuser' })
            });

            const result = await window.GitHub.validateAndSetInstallation('123456');

            expect(result).toBe(true);
            expect(window.GitHub.githubAuth.installationId).toBe('123456');
            expect(window.GitHub.githubAuth.isAuthenticated).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('should handle network errors gracefully', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await window.GitHub.createGitHubIssue('Test', 'Description');

            expect(result).toBeNull();
            expect(mockAlert).toHaveBeenCalled();
        });

        test('should handle missing DOM elements gracefully', () => {
            // Remove required elements
            document.getElementById('github-token-modal').remove();

            // Should not throw error
            expect(() => {
                window.GitHub.showGitHubTokenModal();
            }).not.toThrow();
        });
    });
}); 