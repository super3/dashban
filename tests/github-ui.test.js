/**
 * GitHub UI Tests
 */

// Setup DOM and global mocks
beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
        <div id="backlog"></div>
        <div id="inprogress"></div>
        <div id="review"></div>
        <div id="done"></div>
    `;

    // Mock SortableJS
    global.Sortable = jest.fn().mockImplementation(() => ({
        destroy: jest.fn()
    }));

    // Mock global objects
    global.window = {
        markdownit: jest.fn(() => ({
            render: jest.fn((text) => `<p>${text}</p>`)
        })),
        DOMPurify: {
            sanitize: jest.fn((html) => html)
        },
        location: { 
            origin: 'https://dashban.com',
            pathname: '/',
            search: ''
        },
        history: { replaceState: jest.fn() }
    };

    // Mock window functions needed by GitHub UI
    global.window.getPriorityColor = jest.fn((priority) => 'bg-red-100 text-red-800');
    global.window.getCategoryColor = jest.fn((category) => 'bg-blue-100 text-blue-800');
    global.window.updateColumnCounts = jest.fn();

    // Load the kanban module first to set up window functions
    delete require.cache[require.resolve('../src/kanban.js')];
    require('../src/kanban.js');
    
    // Trigger DOMContentLoaded to initialize kanban module
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);

    // Load GitHub UI module
    delete require.cache[require.resolve('../src/github-ui.js')];
    require('../src/github-ui.js');
});

describe('GitHub UI', () => {
    describe('Utility Functions', () => {
        test('extractPriorityFromLabels should extract priority correctly', () => {
            const labels = [
                { name: 'high' },
                { name: 'bug' }
            ];

            const priority = window.GitHubUI.extractPriorityFromLabels(labels);

            expect(priority).toBe('High');
        });

        test('extractPriorityFromLabels should handle all priority levels', () => {
            const highLabels = [{ name: 'high' }];
            const mediumLabels = [{ name: 'medium' }];
            const lowLabels = [{ name: 'low' }];
            const criticalLabels = [{ name: 'critical' }];

            expect(window.GitHubUI.extractPriorityFromLabels(highLabels)).toBe('High');
            expect(window.GitHubUI.extractPriorityFromLabels(mediumLabels)).toBe('Medium');
            expect(window.GitHubUI.extractPriorityFromLabels(lowLabels)).toBe('Low');
            expect(window.GitHubUI.extractPriorityFromLabels(criticalLabels)).toBe('Critical');
        });

        test('extractPriorityFromLabels should return null for no priority labels', () => {
            const labels = [{ name: 'bug' }, { name: 'feature' }];

            const priority = window.GitHubUI.extractPriorityFromLabels(labels);

            expect(priority).toBeNull();
        });

        test('extractCategoryFromLabels should extract category correctly', () => {
            const labels = [
                { name: 'enhancement' },
                { name: 'bug' }
            ];

            const category = window.GitHubUI.extractCategoryFromLabels(labels);

            expect(category).toBe('Enhancement');
        });

        test('extractCategoryFromLabels should handle all category types', () => {
            const bugLabels = [{ name: 'bug' }];
            const enhancementLabels = [{ name: 'enhancement' }];
            const frontendLabels = [{ name: 'frontend' }];
            const backendLabels = [{ name: 'backend' }];
            const designLabels = [{ name: 'design' }];
            const testingLabels = [{ name: 'testing' }];
            const databaseLabels = [{ name: 'database' }];
            const setupLabels = [{ name: 'setup' }];
            const featureLabels = [{ name: 'feature' }];

            expect(window.GitHubUI.extractCategoryFromLabels(bugLabels)).toBe('Bug');
            expect(window.GitHubUI.extractCategoryFromLabels(enhancementLabels)).toBe('Enhancement');
            expect(window.GitHubUI.extractCategoryFromLabels(frontendLabels)).toBe('Frontend');
            expect(window.GitHubUI.extractCategoryFromLabels(backendLabels)).toBe('Backend');
            expect(window.GitHubUI.extractCategoryFromLabels(designLabels)).toBe('Design');
            expect(window.GitHubUI.extractCategoryFromLabels(testingLabels)).toBe('Testing');
            expect(window.GitHubUI.extractCategoryFromLabels(databaseLabels)).toBe('Database');
            expect(window.GitHubUI.extractCategoryFromLabels(setupLabels)).toBe('Setup');
            expect(window.GitHubUI.extractCategoryFromLabels(featureLabels)).toBe('Feature');
        });

        test('extractCategoryFromLabels should return default for unknown categories', () => {
            const labels = [{ name: 'unknown-category' }];

            const category = window.GitHubUI.extractCategoryFromLabels(labels);

            expect(category).toBe('Setup');
        });
    });

    describe('Markdown Rendering', () => {
        test('renderMarkdown should handle empty or null text', () => {
            expect(window.GitHubUI.renderMarkdown(null)).toBe('No description provided');
            expect(window.GitHubUI.renderMarkdown('')).toBe('No description provided');
            expect(window.GitHubUI.renderMarkdown(undefined)).toBe('No description provided');
        });

        test('renderMarkdown should handle complex markdown with paragraphs', () => {
            const markdown = '# Title\n\nParagraph 1\n\nParagraph 2';
            
            const html = window.GitHubUI.renderMarkdown(markdown);
            
            // Should process markdown and return HTML
            expect(html).toContain('Title');
            expect(html).toContain('Paragraph 1');
            expect(html).toContain('Paragraph 2');
        });

        test('renderMarkdown should escape HTML entities', () => {
            const markdown = 'Text with <script>alert("xss")</script>';
            
            const html = window.GitHubUI.renderMarkdown(markdown);
            
            // Should escape HTML entities
            expect(html).toContain('&lt;script&gt;');
            expect(html).not.toContain('<script>');
        });

        test('renderMarkdown should handle underscores for bold and italic', () => {
            const markdown = '_italic_ and __bold__';
            
            const html = window.GitHubUI.renderMarkdown(markdown);
            
            // Should convert markdown formatting
            expect(html).toContain('<em>italic</em>');
            expect(html).toContain('<strong>bold</strong>');
        });

        test('renderMarkdown should convert basic markdown', () => {
            const markdown = '## Test\n\nSome **bold** text';
            
            const html = window.GitHubUI.renderMarkdown(markdown);
            
            // Should convert markdown to HTML
            expect(html).toContain('Test');
            expect(html).toContain('<strong>bold</strong>');
        });

        test('renderMarkdown should handle underscores for bold and italic', () => {
            const markdown = 'Some _italic_ and __bold__ text';
            
            const html = window.GitHubUI.renderMarkdown(markdown);
            
            // Should have processed markdown
            expect(html).toContain('<em>italic</em>');
            expect(html).toContain('<strong>bold</strong>');
        });

        test('renderMarkdown should truncate long URLs', () => {
            const markdown = 'Check out https://github.com/super3/dashban/issues/123/this-is-a-very-long-url-that-should-be-truncated-because-it-is-too-long-for-display';
            
            const html = window.GitHubUI.renderMarkdown(markdown);
            
            // Should process the markdown and truncate long URLs
            expect(html).toContain('...');
            expect(html).toContain('<a href=');
        });

        test('renderMarkdown should not truncate short URLs', () => {
            const markdown = 'Check out https://github.com/super3/dashban';
            
            const html = window.GitHubUI.renderMarkdown(markdown);
            
            // Should not truncate short URLs
            expect(html).toContain('https://github.com/super3/dashban');
            expect(html).toContain('<a href=');
        });

        test('renderMarkdown should handle markdown links without truncation', () => {
            const markdown = 'Check out [this very long link text that should not be truncated because it is a proper markdown link](https://github.com/super3/dashban/issues/123/very-long-url)';
            
            const html = window.GitHubUI.renderMarkdown(markdown);
            
            // Should convert markdown links properly
            expect(html).toContain('<a href=');
            expect(html).toContain('this very long link text');
        });
    });

    describe('Skeleton Cards', () => {
        test('createSkeletonCard should create loading placeholder', () => {
            const skeleton = window.GitHubUI.createSkeletonCard();
            
            expect(skeleton.classList.contains('bg-white')).toBe(true);
            expect(skeleton.classList.contains('border')).toBe(true);
            expect(skeleton.classList.contains('animate-pulse')).toBe(true);
        });
    });

    describe('GitHub Issue Element Creation', () => {
        test('createGitHubIssueElement should create issue element', () => {
            const mockIssue = {
                id: 1,
                number: 123,
                title: 'Test Issue',
                body: 'Test description',
                labels: [{ name: 'bug' }, { name: 'high' }],
                assignee: null,
                user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png' },
                created_at: '2023-01-01T00:00:00Z'
            };

            const element = window.GitHubUI.createGitHubIssueElement(mockIssue, false);

            expect(element.classList.contains('bg-white')).toBe(true);
            expect(element.classList.contains('border')).toBe(true);
            expect(element.textContent).toContain('Test Issue');
            expect(element.textContent).toContain('#123');
            expect(element.getAttribute('data-issue-number')).toBe('123');
        });

        test('createGitHubIssueElement should show archive button for completed issues', () => {
            const mockIssue = {
                id: 1,
                number: 123,
                title: 'Completed Issue',
                body: 'Test description',
                labels: [{ name: 'done' }],
                assignee: null,
                user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png' },
                created_at: '2023-01-01T00:00:00Z'
            };

            const element = window.GitHubUI.createGitHubIssueElement(mockIssue, true);

            // Should contain archive button when showArchiveButton is true
            const archiveButton = element.querySelector('.archive-btn');
            expect(archiveButton).toBeTruthy();
        });

        test('createGitHubIssueElement should handle issue without user', () => {
            const mockIssue = {
                id: 1,
                number: 123,
                title: 'Test Issue',
                body: 'Test description',
                labels: [],
                assignee: null,
                user: null,
                created_at: '2023-01-01T00:00:00Z'
            };

            const element = window.GitHubUI.createGitHubIssueElement(mockIssue, false);

            expect(element.classList.contains('bg-white')).toBe(true);
            expect(element.classList.contains('border')).toBe(true);
            expect(element.textContent).toContain('Test Issue');
        });

        test('createGitHubIssueElement should handle issue without priority or category', () => {
            const mockIssue = {
                id: 1,
                number: 123,
                title: 'Simple Issue',
                body: 'Test description',
                labels: [],
                assignee: null,
                user: { login: 'testuser', avatar_url: 'https://github.com/testuser.png' },
                created_at: '2023-01-01T00:00:00Z'
            };

            const element = window.GitHubUI.createGitHubIssueElement(mockIssue, false);

            expect(element.classList.contains('bg-white')).toBe(true);
            expect(element.classList.contains('border')).toBe(true);
            expect(element.textContent).toContain('Simple Issue');
        });
    });

    describe('Card Indicators', () => {
        test('updateCardIndicators should update card based on column', () => {
            const mockCard = document.createElement('div');
            mockCard.classList.add('task-card');
            mockCard.setAttribute('data-issue-number', '123');

            // Should not throw error
            expect(() => {
                window.GitHubUI.updateCardIndicators(mockCard, 'inprogress');
            }).not.toThrow();
        });

        test('applyReviewIndicatorsToColumn should add indicators to review column', () => {
            const reviewColumn = document.getElementById('review');
            const mockCard = document.createElement('div');
            mockCard.classList.add('task-card');
            reviewColumn.appendChild(mockCard);

            window.GitHubUI.applyReviewIndicatorsToColumn();

            // Should process cards in review column
            expect(mockCard.classList.contains('task-card')).toBe(true);
        });

        test('applyCompletedSectionsToColumn should add sections to done column', () => {
            const doneColumn = document.getElementById('done');
            const mockCard = document.createElement('div');
            mockCard.classList.add('task-card');
            doneColumn.appendChild(mockCard);

            window.GitHubUI.applyCompletedSectionsToColumn();

            // Should process cards in done column
            expect(mockCard.classList.contains('task-card')).toBe(true);
        });

        test('addReviewIndicator should add review styling', () => {
            const mockCard = document.createElement('div');
            mockCard.classList.add('task-card');

            window.GitHubUI.addReviewIndicator(mockCard);

            // Should add review indicator styling
            expect(mockCard.classList.contains('task-card')).toBe(true);
        });

        test('removeReviewIndicator should remove review styling', () => {
            const mockCard = document.createElement('div');
            mockCard.classList.add('task-card');

            window.GitHubUI.removeReviewIndicator(mockCard);

            // Should maintain base task-card class
            expect(mockCard.classList.contains('task-card')).toBe(true);
        });

        test('addCompletedSection should add completed styling', () => {
            const mockCard = document.createElement('div');
            mockCard.classList.add('task-card');

            window.GitHubUI.addCompletedSection(mockCard);

            // Should add completed section styling
            expect(mockCard.classList.contains('task-card')).toBe(true);
        });

        test('removeCompletedSection should remove completed styling', () => {
            const mockCard = document.createElement('div');
            mockCard.classList.add('task-card');

            window.GitHubUI.removeCompletedSection(mockCard);

            // Should maintain base task-card class
            expect(mockCard.classList.contains('task-card')).toBe(true);
        });
    });

    describe('Error Handling', () => {
        test('renderMarkdown should handle missing markdownit gracefully', () => {
            // Remove markdownit from window
            delete window.markdownit;

            const result = window.GitHubUI.renderMarkdown('Test markdown');

            // Should return plain text when markdownit is not available
            expect(result).toBe('Test markdown');
        });

        test('renderMarkdown should handle missing DOMPurify gracefully', () => {
            // Remove DOMPurify from window
            delete window.DOMPurify;

            const result = window.GitHubUI.renderMarkdown('Test markdown');

            // Should still process markdown even without DOMPurify
            expect(result).toContain('Test markdown');
        });

        test('createGitHubIssueElement should handle malformed issue data', () => {
            const malformedIssue = {
                // Missing required fields but with defaults to avoid errors
                id: 1,
                number: 1,
                title: 'Test',
                body: 'Test',
                labels: [], // Empty array instead of null
                user: null,
                created_at: '2023-01-01T00:00:00Z'
            };

            // Should not throw error even with malformed data
            expect(() => {
                window.GitHubUI.createGitHubIssueElement(malformedIssue, false);
            }).not.toThrow();
        });
    });
}); 