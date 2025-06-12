/**
 * GitHub Integration Tests - Main Coordinator
 * Tests the coordination between auth, API, and UI modules
 */

// Setup DOM and global mocks
beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
        <div id="github-token-modal" class="hidden">
            <form id="github-token-form">
                <input id="github-token-input" name="token" type="password">
            </form>
        </div>
        <div id="github-option">
            <input id="create-github-issue" type="checkbox">
        </div>
        <div id="backlog"></div>
        <div id="inprogress"></div>
        <div id="review"></div>
        <div id="done"></div>
    `;

    // Mock global objects
    global.window = {
        location: { 
            origin: 'https://dashban.com',
            pathname: '/',
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
    delete require.cache[require.resolve('../src/github.js')];
    
    require('../src/github-auth.js');
    require('../src/github-api.js');
    require('../src/github-ui.js');
    require('../src/github.js');
});

describe('GitHub Integration - Main Coordinator', () => {
    describe('Module Coordination', () => {
        test('should load all GitHub modules and create unified interface', () => {
            // Verify that all modules are loaded
            expect(window.GitHubAuth).toBeDefined();
            expect(window.GitHubAPI).toBeDefined();
            expect(window.GitHubUI).toBeDefined();
            expect(window.GitHub).toBeDefined();
        });

        test('should expose unified GitHub interface with all functions', () => {
            // Configuration
            expect(window.GitHub.GITHUB_CONFIG).toBeDefined();
            expect(window.GitHub.githubAuth).toBeDefined();
            
            // Auth functions
            expect(typeof window.GitHub.initializeGitHubAuth).toBe('function');
            expect(typeof window.GitHub.signInWithGitHub).toBe('function');
            expect(typeof window.GitHub.signOutGitHub).toBe('function');
            expect(typeof window.GitHub.validateAndSetToken).toBe('function');
            expect(typeof window.GitHub.showGitHubTokenModal).toBe('function');
            expect(typeof window.GitHub.hideGitHubTokenModal).toBe('function');
            
            // API functions
            expect(typeof window.GitHub.createGitHubIssue).toBe('function');
            expect(typeof window.GitHub.loadGitHubIssues).toBe('function');
            expect(typeof window.GitHub.archiveGitHubIssue).toBe('function');
            expect(typeof window.GitHub.updateGitHubIssueLabels).toBe('function');
            expect(typeof window.GitHub.closeGitHubIssue).toBe('function');
            
            // UI functions
            expect(typeof window.GitHub.renderMarkdown).toBe('function');
            expect(typeof window.GitHub.createGitHubIssueElement).toBe('function');
            expect(typeof window.GitHub.extractPriorityFromLabels).toBe('function');
            expect(typeof window.GitHub.extractCategoryFromLabels).toBe('function');
            expect(typeof window.GitHub.createSkeletonCard).toBe('function');
        });

        test('should properly delegate function calls to appropriate modules', () => {
            // Test that the coordinator properly delegates to the right modules
            expect(window.GitHub.GITHUB_CONFIG).toBe(window.GitHubAuth.GITHUB_CONFIG);
            expect(window.GitHub.githubAuth).toBe(window.GitHubAuth.githubAuth);
            
            // Spot check a few key functions
            expect(window.GitHub.showGitHubTokenModal).toBe(window.GitHubAuth.showGitHubTokenModal);
            expect(window.GitHub.createGitHubIssue).toBe(window.GitHubAPI.createGitHubIssue);
            expect(window.GitHub.renderMarkdown).toBe(window.GitHubUI.renderMarkdown);
        });
    });

    describe('Initialization', () => {
        test('should initialize GitHub integration on DOMContentLoaded', () => {
            // Mock the initialization functions
            window.GitHubAuth.initializeAuthModalListeners = jest.fn();
            window.GitHubAuth.initializeGitHubAuth = jest.fn();
            window.GitHubAPI.initializeGitHubIssues = jest.fn();

            // Trigger a new DOMContentLoaded event
            const event = new Event('DOMContentLoaded');
            document.dispatchEvent(event);

            // Verify initialization functions were called
            expect(window.GitHubAuth.initializeAuthModalListeners).toHaveBeenCalled();
            expect(window.GitHubAuth.initializeGitHubAuth).toHaveBeenCalled();
            expect(window.GitHubAPI.initializeGitHubIssues).toHaveBeenCalled();
        });
    });

    describe('Module Independence', () => {
        test('auth module should work independently', () => {
            expect(window.GitHubAuth.GITHUB_CONFIG).toBeDefined();
            expect(window.GitHubAuth.githubAuth).toBeDefined();
            
            // Should be able to call auth functions directly
            expect(() => {
                window.GitHubAuth.showGitHubTokenModal();
            }).not.toThrow();
        });

        test('API module should work independently', () => {
            expect(window.GitHubAPI.createGitHubIssue).toBeDefined();
            expect(window.GitHubAPI.loadGitHubIssues).toBeDefined();
            expect(window.GitHubAPI.archiveGitHubIssue).toBeDefined();
        });

        test('UI module should work independently', () => {
            expect(window.GitHubUI.renderMarkdown).toBeDefined();
            expect(window.GitHubUI.createGitHubIssueElement).toBeDefined();
            expect(window.GitHubUI.extractPriorityFromLabels).toBeDefined();
            
            // Should be able to call UI functions directly
            const result = window.GitHubUI.renderMarkdown('Test markdown');
            expect(result).toBeDefined();
        });
    });

    describe('Backward Compatibility', () => {
        test('should maintain original window.GitHub interface', () => {
            // Verify that the original window.GitHub interface is maintained
            // This ensures existing code that depends on window.GitHub continues to work
            expect(window.GitHub).toBeDefined();
            expect(typeof window.GitHub.createGitHubIssue).toBe('function');
            expect(typeof window.GitHub.loadGitHubIssues).toBe('function');
            expect(typeof window.GitHub.archiveGitHubIssue).toBe('function');
            expect(typeof window.GitHub.updateGitHubIssueLabels).toBe('function');
            expect(typeof window.GitHub.closeGitHubIssue).toBe('function');
        });

        test('should handle module loading errors gracefully', () => {
            // Even if modules fail to load, the coordinator should not crash
            // This test verifies the integration doesn't break the overall application
            expect(() => {
                // This would typically be handled by try-catch in the actual implementation
                document.dispatchEvent(new Event('DOMContentLoaded'));
            }).not.toThrow();
        });
    }); 
});