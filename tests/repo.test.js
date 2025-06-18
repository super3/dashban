// Repository Management Tests for Dashban

// Mock localStorage
const localStorageMock = {
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

// Mock fetch
global.fetch = jest.fn();

// Set up global window object if it doesn't exist
if (typeof global.window === 'undefined') {
    global.window = {};
}

// Mock DOM elements
document.body.innerHTML = `
    <div id="repo-selector" class="relative">
        <div class="project-selector">
            <span id="repo-name">Project Board</span>
        </div>
    </div>
    <button id="add-task-btn"></button>
`;

// Mock window.GitHubAuth
global.window.GitHubAuth = {
    GITHUB_CONFIG: {
        owner: 'super3',
        repo: 'dashban'
    },
    githubAuth: {
        isAuthenticated: false,
        accessToken: null
    }
};

// Mock window.GitHubAPI
global.window.GitHubAPI = {
    loadGitHubIssues: jest.fn()
};

describe('Repository Management', () => {
    let originalLocalStorage;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        localStorageMock.clear();
        
        // Mock localStorage
        originalLocalStorage = global.localStorage;
        global.localStorage = localStorageMock;
        
        // Reset DOM
        document.body.innerHTML = `
            <div id="repo-name">Project Board</div>
            <button id="add-task-btn">Add Task</button>
        `;
        
        if (document.getElementById('repo-name')) {
            document.getElementById('repo-name').textContent = 'Project Board';
        }
        if (document.getElementById('add-task-btn')) {
            document.getElementById('add-task-btn').disabled = false;
        }
        
        // Reset GitHubAuth mock state
        global.window.GitHubAuth.githubAuth.isAuthenticated = false;
        global.window.GitHubAuth.githubAuth.accessToken = null;
        global.window.GitHubAuth.GITHUB_CONFIG.owner = 'super3';
        global.window.GitHubAuth.GITHUB_CONFIG.repo = 'dashban';
        
        // Reset window.RepoManager if it exists
        if (global.window.RepoManager) {
            delete global.window.RepoManager;
        }
        
        // Load the repo.js module fresh for coverage tracking
        delete require.cache[require.resolve('../src/repo.js')];
        
        // Now we can use require directly since repo.js supports Node.js exports
        const RepoManager = require('../src/repo.js');
        
        // Set up the window object with the loaded module
        global.window.RepoManager = RepoManager;
        
        // Verify RepoManager was loaded and reset state
        if (!global.window.RepoManager) {
            throw new Error('window.RepoManager was not created after loading repo.js');
        }
        
        // Reset the repository state after loading
        global.window.RepoManager.repoState.savedRepos = [];
        global.window.RepoManager.repoState.currentRepo = null;
        
        // Mock DOM manipulation functions
        global.window.RepoManager.updateRepositoryDropdown = jest.fn();
        global.window.RepoManager.createRepositoryDropdown = jest.fn();
    });

    afterEach(() => {
        global.localStorage = originalLocalStorage;
    });

    describe('Repository Validation', () => {
        test('validateRepository should validate public repository', async () => {
            const mockRepoData = {
                name: 'vscode',
                owner: { login: 'microsoft' },
                private: false,
                open_issues_count: 247
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockRepoData)
            });

            const result = await window.RepoManager.validateRepository('microsoft', 'vscode');

            expect(result.valid).toBe(true);
            expect(result.accessLevel).toBe('read-only');
            expect(result.canModify).toBe(false);
            expect(result.isPrivate).toBe(false);
            expect(result.issueCount).toBe(247);
        });

        test('validateRepository should handle repository not found', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            const result = await window.RepoManager.validateRepository('nonexistent', 'repo');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Repository not found or private');
        });

        test('validateRepository should check write access for authenticated users', async () => {
            // Set up authenticated state
            window.GitHubAuth.githubAuth.isAuthenticated = true;
            window.GitHubAuth.githubAuth.accessToken = 'test-token';

            const mockRepoData = {
                name: 'dashban',
                owner: { login: 'super3' },
                private: false,
                open_issues_count: 5
            };

            const mockAuthRepoData = {
                ...mockRepoData,
                permissions: {
                    push: true,
                    admin: false
                }
            };

            // First call (public access)
            fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockRepoData)
            });

            // Second call (authenticated access)
            fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockAuthRepoData)
            });

            const result = await window.RepoManager.validateRepository('super3', 'dashban');

            expect(result.valid).toBe(true);
            expect(result.accessLevel).toBe('full');
            expect(result.canModify).toBe(true);
            expect(fetch).toHaveBeenCalledTimes(2);
        });
    });

    describe('Repository Storage', () => {
        test('loadSavedRepositories should load from localStorage', () => {
            const savedRepos = [
                {
                    owner: 'microsoft',
                    repo: 'vscode',
                    accessLevel: 'read-only',
                    canModify: false
                }
            ];

            localStorage.setItem('dashban_repositories', JSON.stringify(savedRepos));
            localStorage.setItem('dashban_current_repo', JSON.stringify({ owner: 'microsoft', repo: 'vscode' }));

            window.RepoManager.loadSavedRepositories();

            expect(window.RepoManager.repoState.savedRepos).toEqual(savedRepos);
            expect(window.RepoManager.repoState.currentRepo).toEqual({ owner: 'microsoft', repo: 'vscode' });
        });

        test('saveRepositories should save to localStorage', () => {
            window.RepoManager.repoState.savedRepos = [
                {
                    owner: 'facebook',
                    repo: 'react',
                    accessLevel: 'read-only'
                }
            ];
            window.RepoManager.repoState.currentRepo = { owner: 'facebook', repo: 'react' };

            window.RepoManager.saveRepositories();

            expect(localStorage.getItem('dashban_repositories')).toBe(
                JSON.stringify(window.RepoManager.repoState.savedRepos)
            );
            expect(localStorage.getItem('dashban_current_repo')).toBe(
                JSON.stringify(window.RepoManager.repoState.currentRepo)
            );
        });
    });

    describe('Repository Management', () => {
        test('addRepository should add valid repository', async () => {
            // Start with clean state
            window.RepoManager.repoState.savedRepos = [];
            
            const mockRepoData = {
                name: 'react',
                owner: { login: 'facebook' },
                private: false,
                open_issues_count: 123
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockRepoData)
            });

            const result = await window.RepoManager.addRepository('facebook', 'react');

            expect(result.owner).toBe('facebook');
            expect(result.repo).toBe('react');
            expect(result.accessLevel).toBe('read-only');
            expect(window.RepoManager.repoState.savedRepos).toContain(result);
        });

        test('addRepository should reject duplicate repository', async () => {
            // Start with clean state
            window.RepoManager.repoState.savedRepos = [];
            
            // Mock successful validation first
            const mockRepoData = {
                name: 'react',
                owner: { login: 'facebook' },
                private: false,
                open_issues_count: 123
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockRepoData)
            });

            // Add a repository first
            await window.RepoManager.addRepository('facebook', 'react');

            // Now try to add the same repository again
            fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockRepoData)
            });

            await expect(window.RepoManager.addRepository('facebook', 'react'))
                .rejects.toThrow('Repository already added');
        });

        test('handleAddRepository should auto-switch to newly added repository', async () => {
            // Add the DOM elements needed for handleAddRepository
            document.body.innerHTML += `
                <div id="add-repo-modal">
                    <input id="repo-input" value="https://github.com/microsoft/vscode" />
                    <div id="repo-error" class="hidden"><p></p></div>
                    <button id="confirm-add-repo">Add Repository</button>
                </div>
            `;

            // Mock fetch for repository validation
            const mockRepoData = {
                name: 'vscode',
                owner: { login: 'microsoft' },
                private: false,
                open_issues_count: 50
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve(mockRepoData)
            });

            // Set initial current repo to something different
            window.RepoManager.repoState.currentRepo = {
                owner: 'super3',
                repo: 'dashban'
            };
            window.RepoManager.repoState.savedRepos = [];

            // Call handleAddRepository (which includes the auto-switch)
            await window.RepoManager.handleAddRepository();

            // Verify the current repo switched to the newly added one
            expect(window.RepoManager.repoState.currentRepo.owner).toBe('microsoft');
            expect(window.RepoManager.repoState.currentRepo.repo).toBe('vscode');
            
            // Verify GitHub config was updated
            expect(window.GitHubAuth.GITHUB_CONFIG.owner).toBe('microsoft');
            expect(window.GitHubAuth.GITHUB_CONFIG.repo).toBe('vscode');
            
            // Verify the repo was added to saved repos
            expect(window.RepoManager.repoState.savedRepos).toHaveLength(1);
            expect(window.RepoManager.repoState.savedRepos[0].owner).toBe('microsoft');
            expect(window.RepoManager.repoState.savedRepos[0].repo).toBe('vscode');
        });

        test('removeRepository should remove repository from saved list', async () => {
            // Add some test repositories
            window.RepoManager.repoState.savedRepos = [
                {
                    owner: 'super3',
                    repo: 'dashban',
                    accessLevel: 'full',
                    canModify: true
                },
                {
                    owner: 'microsoft',
                    repo: 'vscode',
                    accessLevel: 'read-only',
                    canModify: false
                }
            ];
            
            // Set current repo to dashban (so we're not removing the current one)
            window.RepoManager.repoState.currentRepo = {
                owner: 'super3',
                repo: 'dashban'
            };

            const result = await window.RepoManager.removeRepository('microsoft', 'vscode');

            expect(result).toBe(true);
            expect(window.RepoManager.repoState.savedRepos).toHaveLength(1);
            expect(window.RepoManager.repoState.savedRepos[0].repo).toBe('dashban');
        });

        test('removeRepository should prevent removing default repository', async () => {
            // Set up default repo
            window.RepoManager.repoState.defaultRepo = {
                owner: 'super3',
                repo: 'dashban'
            };
            
            window.RepoManager.repoState.savedRepos = [
                {
                    owner: 'super3',
                    repo: 'dashban',
                    accessLevel: 'full',
                    canModify: true
                }
            ];

            // Mock alert
            global.alert = jest.fn();

            const result = await window.RepoManager.removeRepository('super3', 'dashban');

            expect(result).toBe(false);
            expect(global.alert).toHaveBeenCalledWith('Cannot remove the default repository');
            expect(window.RepoManager.repoState.savedRepos).toHaveLength(1);
        });

        test('removeRepository should switch to default when removing current repository', async () => {
            // Set up repositories
            window.RepoManager.repoState.defaultRepo = {
                owner: 'super3',
                repo: 'dashban'
            };
            
            window.RepoManager.repoState.savedRepos = [
                {
                    owner: 'super3',
                    repo: 'dashban',
                    accessLevel: 'full',
                    canModify: true
                },
                {
                    owner: 'microsoft',
                    repo: 'vscode',
                    accessLevel: 'read-only',
                    canModify: false
                }
            ];
            
            // Set current repo to vscode (the one we'll remove)
            window.RepoManager.repoState.currentRepo = {
                owner: 'microsoft',
                repo: 'vscode'
            };

            const result = await window.RepoManager.removeRepository('microsoft', 'vscode');

            expect(result).toBe(true);
            // Should switch to default repo when removing current one
            expect(window.RepoManager.repoState.currentRepo.owner).toBe('super3');
            expect(window.RepoManager.repoState.currentRepo.repo).toBe('dashban');
            expect(window.RepoManager.repoState.savedRepos).toHaveLength(1);
            expect(window.RepoManager.repoState.savedRepos[0].repo).toBe('dashban');
        });

        test('switchRepository should update current repo and GitHub config', async () => {
            // Start with clean state
            window.RepoManager.repoState.savedRepos = [
                { 
                    owner: 'facebook', 
                    repo: 'react',
                    accessLevel: 'read-only',
                    canModify: false
                }
            ];
            window.RepoManager.repoState.currentRepo = null;

            await window.RepoManager.switchRepository('facebook', 'react');

            expect(window.RepoManager.repoState.currentRepo).toEqual({
                owner: 'facebook',
                repo: 'react'
            });
            expect(window.GitHubAuth.GITHUB_CONFIG.owner).toBe('facebook');
            expect(window.GitHubAuth.GITHUB_CONFIG.repo).toBe('react');
            expect(window.GitHubAPI.loadGitHubIssues).toHaveBeenCalled();
            
            // Reset back to defaults for subsequent tests
            window.GitHubAuth.GITHUB_CONFIG.owner = 'super3';
            window.GitHubAuth.GITHUB_CONFIG.repo = 'dashban';
        });
    });

    describe('UI Functions', () => {
        test('updateHeaderRepoName should update repo name element', () => {
            window.RepoManager.repoState.currentRepo = { owner: 'facebook', repo: 'react' };

            window.RepoManager.updateHeaderRepoName();

            expect(document.getElementById('repo-name').textContent).toBe('react');
        });

        test('updateUIForAccessLevel should disable button for read-only access', () => {
            const addButton = document.getElementById('add-task-btn');

            window.RepoManager.updateUIForAccessLevel('read-only', false);

            expect(addButton.disabled).toBe(true);
            expect(addButton.className).toContain('bg-gray-400');
            expect(addButton.title).toContain('Read-only access');
        });

        test('updateUIForAccessLevel should enable button for full access', () => {
            const addButton = document.getElementById('add-task-btn');

            window.RepoManager.updateUIForAccessLevel('full', true);

            expect(addButton.disabled).toBe(false);
            expect(addButton.className).toContain('bg-indigo-600');
        });

        test('initializeRepositorySelector should set up default repository', () => {
            // Make sure we start with completely clean state
            window.RepoManager.repoState.savedRepos = [];
            window.RepoManager.repoState.currentRepo = null;
            
            // Clear any localStorage that might affect the test
            localStorage.clear();
            
            window.RepoManager.initializeRepositorySelector();

            expect(window.RepoManager.repoState.currentRepo).toEqual({
                owner: 'super3',
                repo: 'dashban'
            });

            // Should add default repo to saved repos
            const defaultRepo = window.RepoManager.repoState.savedRepos.find(r => 
                r.owner === 'super3' && r.repo === 'dashban'
            );
            expect(defaultRepo).toBeTruthy();
            expect(defaultRepo.accessLevel).toBe('full');
        });
    });

    describe('URL Parsing', () => {
        test('parseGitHubUrl should parse HTTPS URLs', () => {
            const result = window.RepoManager.parseGitHubUrl('https://github.com/microsoft/vscode');
            expect(result).toEqual({ owner: 'microsoft', repo: 'vscode' });
        });

        test('parseGitHubUrl should parse HTTP URLs', () => {
            const result = window.RepoManager.parseGitHubUrl('http://github.com/facebook/react');
            expect(result).toEqual({ owner: 'facebook', repo: 'react' });
        });

        test('parseGitHubUrl should parse URLs with .git extension', () => {
            const result = window.RepoManager.parseGitHubUrl('https://github.com/microsoft/vscode.git');
            expect(result).toEqual({ owner: 'microsoft', repo: 'vscode' });
        });

        test('parseGitHubUrl should parse SSH URLs', () => {
            const result = window.RepoManager.parseGitHubUrl('git@github.com:microsoft/vscode.git');
            expect(result).toEqual({ owner: 'microsoft', repo: 'vscode' });
        });

        test('parseGitHubUrl should parse URLs without protocol', () => {
            const result = window.RepoManager.parseGitHubUrl('github.com/microsoft/vscode');
            expect(result).toEqual({ owner: 'microsoft', repo: 'vscode' });
        });

        test('parseGitHubUrl should parse URLs with www', () => {
            const result = window.RepoManager.parseGitHubUrl('www.github.com/microsoft/vscode');
            expect(result).toEqual({ owner: 'microsoft', repo: 'vscode' });
        });

        test('parseGitHubUrl should parse URLs with trailing paths', () => {
            const result = window.RepoManager.parseGitHubUrl('https://github.com/microsoft/vscode/issues/123');
            expect(result).toEqual({ owner: 'microsoft', repo: 'vscode' });
        });

        test('parseGitHubUrl should parse owner/repo format', () => {
            const result = window.RepoManager.parseGitHubUrl('microsoft/vscode');
            expect(result).toEqual({ owner: 'microsoft', repo: 'vscode' });
        });

        test('parseGitHubUrl should handle whitespace', () => {
            const result = window.RepoManager.parseGitHubUrl('  microsoft/vscode  ');
            expect(result).toEqual({ owner: 'microsoft', repo: 'vscode' });
        });

        test('parseGitHubUrl should return null for invalid URLs', () => {
            expect(window.RepoManager.parseGitHubUrl('invalid-url')).toBeNull();
            expect(window.RepoManager.parseGitHubUrl('https://gitlab.com/owner/repo')).toBeNull();
            expect(window.RepoManager.parseGitHubUrl('owner/repo/extra/parts')).toBeNull();
            expect(window.RepoManager.parseGitHubUrl('')).toBeNull();
        });

        test('parseGitHubUrl should return null for incomplete owner/repo', () => {
            expect(window.RepoManager.parseGitHubUrl('microsoft/')).toBeNull();
            expect(window.RepoManager.parseGitHubUrl('/vscode')).toBeNull();
            expect(window.RepoManager.parseGitHubUrl('microsoft')).toBeNull();
        });
    });

    describe('Error Handling', () => {
        test('validateRepository should handle network errors', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await window.RepoManager.validateRepository('test', 'repo');

            expect(result.valid).toBe(false);
            expect(result.error).toBe('Network error or repository not accessible');
        });

        test('loadSavedRepositories should handle corrupted localStorage', () => {
            localStorage.setItem('dashban_repositories', 'invalid-json');

            // Should not throw and should use defaults
            window.RepoManager.loadSavedRepositories();

            expect(window.RepoManager.repoState.savedRepos).toEqual([]);
            expect(window.RepoManager.repoState.currentRepo).toEqual({
                owner: 'super3',
                repo: 'dashban'
            });
        });
    });

    describe('Modal and UI Functions', () => {
        test('showAddRepositoryModal should create modal if not exists', () => {
            // Ensure modal doesn't exist
            const existingModal = document.getElementById('add-repo-modal');
            if (existingModal) {
                existingModal.remove();
            }

            window.RepoManager.showAddRepositoryModal();

            const modal = document.getElementById('add-repo-modal');
            expect(modal).toBeTruthy();
            expect(modal.classList.contains('fixed')).toBe(true);
            expect(document.getElementById('repo-input')).toBeTruthy();
            expect(document.getElementById('confirm-add-repo')).toBeTruthy();
        });

        test('showAddRepositoryModal should show existing modal', () => {
            // Create modal first
            window.RepoManager.showAddRepositoryModal();
            const modal = document.getElementById('add-repo-modal');
            modal.classList.add('hidden');

            // Call again
            window.RepoManager.showAddRepositoryModal();

            expect(modal.classList.contains('hidden')).toBe(false);
        });

        test('hideAddRepositoryModal should hide modal', () => {
            window.RepoManager.showAddRepositoryModal();
            const modal = document.getElementById('add-repo-modal');

            window.RepoManager.hideAddRepositoryModal();

            expect(modal.classList.contains('hidden')).toBe(true);
        });

        test('hideAddRepositoryModal should handle missing modal', () => {
            // Remove modal
            const modal = document.getElementById('add-repo-modal');
            if (modal) {
                modal.remove();
            }

            // Should not throw
            expect(() => {
                window.RepoManager.hideAddRepositoryModal();
            }).not.toThrow();
        });

        test('showError should display error message', () => {
            window.RepoManager.showAddRepositoryModal();
            const errorDiv = document.getElementById('repo-error');
            
            window.RepoManager.showError(errorDiv, 'Test error message');

            expect(errorDiv.classList.contains('hidden')).toBe(false);
            expect(errorDiv.querySelector('p').textContent).toBe('Test error message');
        });

                 test('toggleRepositoryDropdown should create dropdown when none exists', () => {
             // Mock the repo selector
             document.body.innerHTML = `
                 <div id="repo-name">Project Board</div>
                 <button id="add-task-btn">Add Task</button>
                 <div id="repo-selector">
                     <div class="project-selector">Click me</div>
                 </div>
             `;

             window.RepoManager.repoState.savedRepos = [
                 {
                     owner: 'test',
                     repo: 'repo',
                     accessLevel: 'read-only',
                     canModify: false,
                     isPrivate: false
                 }
             ];

             window.RepoManager.toggleRepositoryDropdown();

             const dropdown = document.querySelector('.repo-dropdown');
             expect(dropdown).toBeTruthy();
             expect(dropdown.querySelector('#repo-list')).toBeTruthy();
             expect(dropdown.querySelector('#add-repo-btn')).toBeTruthy();
         });

                 test('toggleRepositoryDropdown should remove dropdown when exists', () => {
             // Set up DOM
             document.body.innerHTML = `
                 <div id="repo-name">Project Board</div>
                 <button id="add-task-btn">Add Task</button>
                 <div id="repo-selector">
                     <div class="project-selector">Click me</div>
                     <div class="repo-dropdown">Existing dropdown</div>
                 </div>
             `;

             window.RepoManager.toggleRepositoryDropdown();

             const dropdown = document.querySelector('.repo-dropdown');
             expect(dropdown).toBeFalsy();
         });

        test('toggleRepositoryDropdown should handle missing container', () => {
            // Remove repo selector
            const container = document.getElementById('repo-selector');
            if (container) {
                container.remove();
            }

            // Should not throw
            expect(() => {
                window.RepoManager.toggleRepositoryDropdown();
            }).not.toThrow();
        });

                 

        test('updateRepositoryDropdown should handle missing dropdown', () => {
            // Should not throw when no dropdown exists
            expect(() => {
                window.RepoManager.updateRepositoryDropdown();
            }).not.toThrow();
        });

        test('updateHeaderRepoName should handle missing element', () => {
            // Remove repo name element
            const element = document.getElementById('repo-name');
            if (element) {
                element.remove();
            }

            window.RepoManager.repoState.currentRepo = { owner: 'test', repo: 'repo' };

            // Should not throw
            expect(() => {
                window.RepoManager.updateHeaderRepoName();
            }).not.toThrow();
        });

        test('updateUIForAccessLevel should handle missing button', () => {
            // Remove button
            const button = document.getElementById('add-task-btn');
            if (button) {
                button.remove();
            }

            // Should not throw
            expect(() => {
                window.RepoManager.updateUIForAccessLevel('read-only', false);
            }).not.toThrow();
        });
    });

    describe('Additional Error Handling', () => {
        test('validateRepository should handle malformed response', async () => {
            fetch.mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: () => Promise.resolve({}) // Missing required fields
            });

            const result = await window.RepoManager.validateRepository('test', 'repo');

            // Should handle gracefully with defaults
            expect(result.valid).toBe(true);
            expect(result.accessLevel).toBe('read-only');
        });

                 test('validateRepository should handle non-200 status codes', async () => {
             fetch.mockResolvedValueOnce({
                 ok: false,
                 status: 403
             });

             const result = await window.RepoManager.validateRepository('test', 'repo');

             expect(result.valid).toBe(false);
             expect(result.error).toBe('GitHub API error: 403');
         });

        test('handleAddRepository should handle empty input', async () => {
            window.RepoManager.showAddRepositoryModal();
            const input = document.getElementById('repo-input');
            const errorDiv = document.getElementById('repo-error');
            
            input.value = '';

            await window.RepoManager.handleAddRepository();

            expect(errorDiv.classList.contains('hidden')).toBe(false);
            expect(errorDiv.querySelector('p').textContent).toBe('Please enter a GitHub repository URL');
        });

        test('handleAddRepository should handle invalid URL', async () => {
            window.RepoManager.showAddRepositoryModal();
            const input = document.getElementById('repo-input');
            const errorDiv = document.getElementById('repo-error');
            
            input.value = 'invalid-url';

            await window.RepoManager.handleAddRepository();

            expect(errorDiv.classList.contains('hidden')).toBe(false);
            expect(errorDiv.querySelector('p').textContent).toBe('Please enter a valid GitHub URL (e.g., https://github.com/microsoft/vscode)');
        });

                 test('handleAddRepository should handle addRepository failure', async () => {
             window.RepoManager.showAddRepositoryModal();
             const input = document.getElementById('repo-input');
             const errorDiv = document.getElementById('repo-error');
             const button = document.getElementById('confirm-add-repo');
             
             input.value = 'https://github.com/test/repo';

             // Mock validateRepository to fail
             fetch.mockRejectedValueOnce(new Error('Network error or repository not accessible'));

             await window.RepoManager.handleAddRepository();

             expect(errorDiv.classList.contains('hidden')).toBe(false);
             expect(errorDiv.querySelector('p').textContent).toBe('Network error or repository not accessible');
             expect(button.disabled).toBe(false);
             expect(button.textContent).toBe('Add Repository');
         });

        test('loadSavedRepositories should handle missing currentRepo in localStorage', () => {
            localStorage.setItem('dashban_repositories', JSON.stringify([{owner: 'test', repo: 'repo'}]));
            localStorage.removeItem('dashban_current_repo');

            window.RepoManager.loadSavedRepositories();

            // Should use default current repo
            expect(window.RepoManager.repoState.currentRepo).toEqual({
                owner: 'super3',
                repo: 'dashban'
            });
        });

                 test('removeRepository should handle non-existent repository', async () => {
             window.RepoManager.repoState.savedRepos = [];
             window.RepoManager.repoState.currentRepo = {
                 owner: 'super3',
                 repo: 'dashban'
             };

             const result = await window.RepoManager.removeRepository('nonexistent', 'repo');

             expect(result).toBe(true); // Should succeed even if repo doesn't exist
         });
     });

     describe('Repository Item Creation and Interaction', () => {
         test('createRepositoryItem should create item with full access styling', () => {
             const repoInfo = {
                 owner: 'test',
                 repo: 'repo',
                 accessLevel: 'full',
                 canModify: true,
                 isPrivate: true
             };

             const item = window.RepoManager.createRepositoryItem(repoInfo);

             expect(item.className).toContain('repo-item');
             expect(item.innerHTML).toContain('fas fa-edit text-green-500');
             expect(item.innerHTML).toContain('Full access');
             expect(item.innerHTML).toContain('fas fa-lock text-gray-500');
             expect(item.innerHTML).toContain('Private');
         });

         test('createRepositoryItem should create item with read-only access styling', () => {
             const repoInfo = {
                 owner: 'test',
                 repo: 'repo',
                 accessLevel: 'read-only',
                 canModify: false,
                 isPrivate: false
             };

             const item = window.RepoManager.createRepositoryItem(repoInfo);

             expect(item.innerHTML).toContain('fas fa-eye text-blue-500');
             expect(item.innerHTML).toContain('Read-only');
             expect(item.innerHTML).toContain('fas fa-globe text-green-500');
             expect(item.innerHTML).toContain('Public');
         });

         test('createRepositoryItem should hide remove button for default repo', () => {
             const repoInfo = {
                 owner: 'super3',
                 repo: 'dashban',
                 accessLevel: 'full',
                 canModify: true,
                 isPrivate: false
             };

             const item = window.RepoManager.createRepositoryItem(repoInfo);

             expect(item.innerHTML).not.toContain('remove-repo-btn');
         });

         test('createRepositoryItem should show remove button for non-default repo', () => {
             const repoInfo = {
                 owner: 'other',
                 repo: 'repo',
                 accessLevel: 'full',
                 canModify: true,
                 isPrivate: false
             };

             const item = window.RepoManager.createRepositoryItem(repoInfo);

             expect(item.innerHTML).toContain('remove-repo-btn');
             expect(item.innerHTML).toContain('fas fa-times');
         });
     });

     describe('Modal Event Handlers', () => {
         test('modal should handle Enter key in input', async () => {
             // Create modal and get input
             window.RepoManager.showAddRepositoryModal();
             const input = document.getElementById('repo-input');
             
             // Set up a value to make parsing work
             input.value = 'https://github.com/test/repo';
             
             // Mock fetch to avoid actual API call
             fetch.mockResolvedValueOnce({
                 ok: true,
                 status: 200,
                 json: () => Promise.resolve({
                     name: 'repo',
                     owner: { login: 'test' },
                     private: false,
                     open_issues_count: 0
                 })
             });

             // Mock GitHubAPI.loadGitHubIssues to avoid error
             if (!window.GitHubAPI) {
                 window.GitHubAPI = { loadGitHubIssues: jest.fn() };
             }

             // Simulate Enter key press and wait for the async operation
             const event = new KeyboardEvent('keypress', { key: 'Enter', bubbles: true, cancelable: true });
             input.dispatchEvent(event);

             // Wait a bit for async operations
             await new Promise(resolve => setTimeout(resolve, 10));

             // Check that the repo was added
             expect(window.RepoManager.repoState.savedRepos.some(r => r.owner === 'test' && r.repo === 'repo')).toBe(true);
         });

         test('modal should handle cancel button click', () => {
             window.RepoManager.showAddRepositoryModal();
             const modal = document.getElementById('add-repo-modal');
             const cancelBtn = document.getElementById('cancel-add-repo');

             cancelBtn.click();

             expect(modal.classList.contains('hidden')).toBe(true);
         });

         test('modal should handle clicking outside to close', () => {
             window.RepoManager.showAddRepositoryModal();
             const modal = document.getElementById('add-repo-modal');

             // Simulate clicking on the modal backdrop
             modal.click();

             expect(modal.classList.contains('hidden')).toBe(true);
         });

         test('modal should not close when clicking inside content', () => {
             window.RepoManager.showAddRepositoryModal();
             const modal = document.getElementById('add-repo-modal');
             const input = document.getElementById('repo-input');

             // Simulate clicking on input (inside modal)
             input.click();

             expect(modal.classList.contains('hidden')).toBe(false);
         });
     });

     describe('initializeRepositorySelector comprehensive tests', () => {
         test('initializeRepositorySelector should add default repo when not in saved repos', () => {
             // Clear saved repos
             window.RepoManager.repoState.savedRepos = [];
             localStorage.clear();

             window.RepoManager.initializeRepositorySelector();

             const defaultRepo = window.RepoManager.repoState.savedRepos.find(r => 
                 r.owner === 'super3' && r.repo === 'dashban'
             );
             expect(defaultRepo).toBeTruthy();
             expect(defaultRepo.accessLevel).toBe('full');
             expect(defaultRepo.canModify).toBe(true);
         });

         test('initializeRepositorySelector should not duplicate default repo', () => {
             // Add default repo to saved repos first
             window.RepoManager.repoState.savedRepos = [{
                 owner: 'super3',
                 repo: 'dashban',
                 accessLevel: 'full',
                 canModify: true,
                 isPrivate: false,
                 issueCount: 0,
                 addedAt: new Date().toISOString()
             }];

             const initialLength = window.RepoManager.repoState.savedRepos.length;

             window.RepoManager.initializeRepositorySelector();

             expect(window.RepoManager.repoState.savedRepos.length).toBe(initialLength);
         });
     });

     describe('Edge Cases and Boundary Conditions', () => {
         test('parseGitHubUrl should handle URLs with multiple slashes', () => {
             const result = window.RepoManager.parseGitHubUrl('https://github.com/owner/repo/issues/123');
             expect(result).toEqual({ owner: 'owner', repo: 'repo' });
         });

         test('parseGitHubUrl should handle URLs with query parameters', () => {
             const result = window.RepoManager.parseGitHubUrl('https://github.com/owner/repo?tab=readme');
             expect(result).toEqual({ owner: 'owner', repo: 'repo' });
         });

         test('validateRepository should handle authentication check failure', async () => {
             // Set up authenticated state
             window.GitHubAuth.githubAuth.isAuthenticated = true;
             window.GitHubAuth.githubAuth.accessToken = 'test-token';

             // Mock first call success, second call failure
             fetch.mockResolvedValueOnce({
                 ok: true,
                 status: 200,
                 json: () => Promise.resolve({
                     name: 'repo',
                     owner: { login: 'test' },
                     private: false,
                     open_issues_count: 5
                 })
             });

             fetch.mockResolvedValueOnce({
                 ok: false,
                 status: 404
             });

             const result = await window.RepoManager.validateRepository('test', 'repo');

             // Should fall back to read-only access
             expect(result.valid).toBe(true);
             expect(result.accessLevel).toBe('read-only');
             expect(result.canModify).toBe(false);
         });

         test('switchRepository should update GitHub config', async () => {
             window.RepoManager.repoState.savedRepos = [{
                 owner: 'test',
                 repo: 'repo',
                 accessLevel: 'full',
                 canModify: true
             }];

             await window.RepoManager.switchRepository('test', 'repo');

             expect(window.GitHubAuth.GITHUB_CONFIG.owner).toBe('test');
             expect(window.GitHubAuth.GITHUB_CONFIG.repo).toBe('repo');
             expect(window.GitHubAPI.loadGitHubIssues).toHaveBeenCalled();
         });

         test('validateRepository with partial repo data should use defaults', async () => {
             fetch.mockResolvedValueOnce({
                 ok: true,
                 status: 200,
                 json: () => Promise.resolve({
                     name: 'repo',
                     owner: { login: 'test' },
                     private: undefined,
                     open_issues_count: undefined
                 })
             });

             const result = await window.RepoManager.validateRepository('test', 'repo');

             expect(result.valid).toBe(true);
             expect(result.isPrivate).toBe(false); // Default when private is undefined
             expect(result.issueCount).toBe(0); // Default when open_issues_count is undefined
         });
     });

     describe('Additional Coverage Edge Cases', () => {
         test('validateRepository should log write access check failure', async () => {
             window.GitHubAuth.githubAuth.isAuthenticated = true;
             window.GitHubAuth.githubAuth.accessToken = 'test-token';
             const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

             const mockRepoData = {
                 name: 'test-repo',
                 owner: { login: 'testuser' },
                 private: false,
                 open_issues_count: 5
             };

             // First call succeeds
             fetch.mockResolvedValueOnce({
                 ok: true,
                 status: 200,
                 json: () => Promise.resolve(mockRepoData)
             });

             // Second call throws an error (not rejects)
             fetch.mockImplementationOnce(() => {
                 throw new Error('Network timeout');
             });

             const result = await window.RepoManager.validateRepository('testuser', 'test-repo');

             expect(result.valid).toBe(true);
             expect(result.accessLevel).toBe('read-only');
             expect(consoleSpy).toHaveBeenCalledWith('Could not determine write access, defaulting to read-only');

             consoleSpy.mockRestore();
         });

         test('handleAddRepository should update dropdown when it exists', async () => {
             // Set up modal
             window.RepoManager.showAddRepositoryModal();
             const modal = document.getElementById('add-repo-modal');
             const input = modal.querySelector('#repo-input');
             
             // Create a mock dropdown
             const container = document.createElement('div');
             container.id = 'repo-selector';
             const dropdown = document.createElement('div');
             dropdown.className = 'repo-dropdown';
             const repoList = document.createElement('div');
             repoList.id = 'repo-list';
             dropdown.appendChild(repoList);
             container.appendChild(dropdown);
             document.body.appendChild(container);

             // Add some existing content to repoList
             repoList.innerHTML = '<div>existing content</div>';

             // Mock successful repository addition
             input.value = 'https://github.com/facebook/react';
             
             const mockRepoData = {
                 name: 'react',
                 owner: { login: 'facebook' },
                 private: false,
                 open_issues_count: 100
             };

             fetch.mockResolvedValueOnce({
                 ok: true,
                 status: 200,
                 json: () => Promise.resolve(mockRepoData)
             });

             // Mock switchRepository and addRepository
             const addSpy = jest.spyOn(window.RepoManager, 'addRepository').mockResolvedValue({
                 owner: 'facebook',
                 repo: 'react',
                 accessLevel: 'read-only'
             });
             const switchSpy = jest.spyOn(window.RepoManager, 'switchRepository').mockResolvedValue();

             await window.RepoManager.handleAddRepository();

             // Check that the dropdown list was cleared and rebuilt
             expect(repoList.innerHTML).not.toContain('existing content');

             // Cleanup
             document.body.removeChild(container);
             addSpy.mockRestore();
             switchSpy.mockRestore();
         });

         test('toggleRepositoryDropdown should return early when no container', () => {
             // Make sure no container exists
             const existingContainer = document.getElementById('repo-selector');
             if (existingContainer) {
                 existingContainer.remove();
             }

             // This should return early and not throw an error
             expect(() => {
                 window.RepoManager.toggleRepositoryDropdown();
             }).not.toThrow();
         });
     });
 }); 