/**
 * GitHub Labels Management Tests
 * Tests for the GitHub labels functionality
 */

// Mock functions
const mockFetch = jest.fn();
const mockConsoleLog = jest.fn();
const mockConsoleError = jest.fn();

// Mock window and global objects
const mockGitHubAuth = {
    githubAuth: {
        isAuthenticated: true,
        accessToken: 'test-token'
    },
    GITHUB_CONFIG: {
        apiBaseUrl: 'https://api.github.com',
        owner: 'super3',
        repo: 'dashban'
    }
};

// Set up window mock before loading module
Object.defineProperty(global, 'window', {
    value: {
        GitHubAuth: mockGitHubAuth
    },
    writable: true,
    configurable: true
});

// Load the module to get the functions
delete require.cache[require.resolve('../src/labels.js')];
require('../src/labels.js');

// Extract functions from window.GitHubLabels for direct testing
const { 
    loadRequiredLabels, 
    checkExistingLabels, 
    findMissingLabels, 
    installMissingLabels, 
    updateLabelWarning 
} = window.GitHubLabels;

describe('GitHub Labels Management', () => {
    beforeEach(() => {
        // Reset DOM
        document.body.innerHTML = `
            <div id="label-warning-section" style="display: none;">
                <div class="warning-text"></div>
            </div>
            <button id="install-labels-btn">Install Labels</button>
        `;

        // Reset GitHubAuth to default state
        window.GitHubAuth = {
            githubAuth: {
                isAuthenticated: true,
                accessToken: 'test-token'
            },
            GITHUB_CONFIG: {
                apiBaseUrl: 'https://api.github.com',
                owner: 'super3',
                repo: 'dashban'
            }
        };

        // Mock global objects
        global.fetch = mockFetch;
        global.console = {
            ...console,
            log: mockConsoleLog,
            error: mockConsoleError
        };

        // Reset mocks
        mockFetch.mockReset();
        mockConsoleLog.mockReset();
        mockConsoleError.mockReset();
    });

    describe('loadRequiredLabels', () => {
        test('should return the embedded required labels array', async () => {
            const result = await loadRequiredLabels();

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(14);
            
            // Check that all required properties exist
            result.forEach(label => {
                expect(label).toHaveProperty('name');
                expect(label).toHaveProperty('description');
                expect(label).toHaveProperty('color');
                expect(typeof label.name).toBe('string');
                expect(typeof label.description).toBe('string');
                expect(typeof label.color).toBe('string');
            });

            // Check for specific labels
            const labelNames = result.map(label => label.name);
            expect(labelNames).toContain('in progress');
            expect(labelNames).toContain('review');
            expect(labelNames).toContain('done');
            expect(labelNames).toContain('bug');
        });
    });

    describe('checkExistingLabels', () => {
        test('should fetch existing labels from GitHub API successfully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { name: 'bug' },
                    { name: 'enhancement' },
                    { name: 'In Progress' }
                ]
            });

            const result = await checkExistingLabels();

            expect(mockFetch).toHaveBeenCalledWith(
                'https://api.github.com/repos/super3/dashban/labels',
                {
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Authorization': 'token test-token'
                    }
                }
            );

            expect(result).toEqual(['bug', 'enhancement', 'in progress']);
        });

        test('should return empty array when not authenticated', async () => {
            window.GitHubAuth.githubAuth.isAuthenticated = false;

            const result = await checkExistingLabels();

            expect(result).toEqual([]);
            expect(mockConsoleLog).toHaveBeenCalledWith('❌ Not authenticated with GitHub - cannot check labels');
        });

        test('should return empty array when no access token', async () => {
            window.GitHubAuth.githubAuth.accessToken = null;

            const result = await checkExistingLabels();

            expect(result).toEqual([]);
            expect(mockConsoleLog).toHaveBeenCalledWith('❌ Not authenticated with GitHub - cannot check labels');
        });

        test('should handle API error response', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            const result = await checkExistingLabels();

            expect(result).toEqual([]);
            expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to check existing labels:', expect.any(Error));
        });

        test('should handle fetch network error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await checkExistingLabels();

            expect(result).toEqual([]);
            expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to check existing labels:', expect.any(Error));
        });

        test('should handle GitHubAuth being undefined', async () => {
            window.GitHubAuth = undefined;

            const result = await checkExistingLabels();

            expect(result).toEqual([]);
            expect(mockConsoleLog).toHaveBeenCalledWith('❌ Not authenticated with GitHub - cannot check labels');
        });

        test('should handle undefined githubAuth', async () => {
            window.GitHubAuth.githubAuth = undefined;

            const result = await checkExistingLabels();

            expect(result).toEqual([]);
            expect(mockConsoleLog).toHaveBeenCalledWith('❌ Not authenticated with GitHub - cannot check labels');
        });
    });

    describe('findMissingLabels', () => {
        test('should identify missing labels correctly', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { name: 'bug' },
                    { name: 'high' },
                    { name: 'In Progress' }
                ]
            });

            const result = await findMissingLabels();

            expect(result.total).toBe(14);
            expect(result.existing).toBe(3);
            expect(result.missingCount).toBe(11);
            expect(Array.isArray(result.missing)).toBe(true);
            expect(result.missing).toHaveLength(11);
            
            // Check that missing labels don't include the existing ones
            const missingNames = result.missing.map(label => label.name.toLowerCase());
            expect(missingNames).not.toContain('bug');
            expect(missingNames).not.toContain('high');
            expect(missingNames).not.toContain('in progress');
        });

        test('should handle case where all labels exist', async () => {
            // Mock all 14 required labels as existing
            const allLabels = [
                { name: 'in progress' },
                { name: 'review' },
                { name: 'done' },
                { name: 'archive' },
                { name: 'high' },
                { name: 'medium' },
                { name: 'low' },
                { name: 'frontend' },
                { name: 'backend' },
                { name: 'design' },
                { name: 'testing' },
                { name: 'database' },
                { name: 'setup' },
                { name: 'bug' }
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => allLabels
            });

            const result = await findMissingLabels();

            expect(result.total).toBe(14);
            expect(result.existing).toBe(14);
            expect(result.missingCount).toBe(0);
            expect(result.missing).toHaveLength(0);
        });

        test('should handle case where no labels exist', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

            const result = await findMissingLabels();

            expect(result.total).toBe(14);
            expect(result.existing).toBe(0);
            expect(result.missingCount).toBe(14);
            expect(result.missing).toHaveLength(14);
        });

        test('should handle case insensitive label matching', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { name: 'BUG' },
                    { name: 'HIGH' },
                    { name: 'IN PROGRESS' }
                ]
            });

            const result = await findMissingLabels();

            expect(result.existing).toBe(3);
            expect(result.missingCount).toBe(11);
        });
    });

    describe('installMissingLabels', () => {
        test('should install missing labels successfully', async () => {
            const missingLabels = [
                { name: 'bug', description: 'Bug', color: 'EF4444' },
                { name: 'enhancement', description: 'Enhancement', color: '10B981' }
            ];

            mockFetch.mockResolvedValueOnce({ ok: true })
                     .mockResolvedValueOnce({ ok: true });

            const result = await installMissingLabels(missingLabels);

            expect(result.success).toEqual(['bug', 'enhancement']);
            expect(result.failed).toEqual([]);

            expect(mockFetch).toHaveBeenCalledTimes(2);
            expect(mockFetch).toHaveBeenNthCalledWith(1,
                'https://api.github.com/repos/super3/dashban/labels',
                {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/vnd.github.v3+json',
                        'Authorization': 'token test-token',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: 'bug',
                        description: 'Bug',
                        color: 'EF4444'
                    })
                }
            );
        });

        test('should handle partial failures', async () => {
            const missingLabels = [
                { name: 'bug', description: 'Bug', color: 'EF4444' },
                { name: 'enhancement', description: 'Enhancement', color: '10B981' }
            ];

            mockFetch.mockResolvedValueOnce({ ok: true })
                     .mockResolvedValueOnce({ 
                         ok: false, 
                         json: async () => ({ message: 'Label already exists' })
                     });

            const result = await installMissingLabels(missingLabels);

            expect(result.success).toEqual(['bug']);
            expect(result.failed).toEqual([
                { name: 'enhancement', error: 'Label already exists' }
            ]);
        });

        test('should handle network errors during installation', async () => {
            const missingLabels = [{ name: 'bug', description: 'Bug', color: 'EF4444' }];

            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await installMissingLabels(missingLabels);

            expect(result.success).toEqual([]);
            expect(result.failed).toEqual([
                { name: 'bug', error: 'Network error' }
            ]);
        });

        test('should throw error when not authenticated', async () => {
            window.GitHubAuth.githubAuth.isAuthenticated = false;
            const missingLabels = [{ name: 'bug', description: 'Bug', color: 'EF4444' }];

            await expect(installMissingLabels(missingLabels))
                .rejects.toThrow('Not authenticated with GitHub');
        });

        test('should throw error when no access token', async () => {
            window.GitHubAuth.githubAuth.accessToken = null;
            const missingLabels = [{ name: 'bug', description: 'Bug', color: 'EF4444' }];

            await expect(installMissingLabels(missingLabels))
                .rejects.toThrow('Not authenticated with GitHub');
        });

        test('should throw error when GitHubAuth is undefined', async () => {
            window.GitHubAuth = undefined;
            const missingLabels = [{ name: 'bug', description: 'Bug', color: 'EF4444' }];

            await expect(installMissingLabels(missingLabels))
                .rejects.toThrow('Not authenticated with GitHub');
        });

        test('should throw error when githubAuth is undefined', async () => {
            window.GitHubAuth.githubAuth = undefined;
            const missingLabels = [{ name: 'bug', description: 'Bug', color: 'EF4444' }];

            await expect(installMissingLabels(missingLabels))
                .rejects.toThrow('Not authenticated with GitHub');
        });
    });

    describe('updateLabelWarning', () => {
        test('should hide warning when all labels exist', async () => {
            const warningSection = document.getElementById('label-warning-section');
            
            // Mock all labels existing
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { name: 'in progress' }, { name: 'review' }, { name: 'done' }, { name: 'archive' },
                    { name: 'high' }, { name: 'medium' }, { name: 'low' }, { name: 'frontend' },
                    { name: 'backend' }, { name: 'design' }, { name: 'testing' }, { name: 'database' },
                    { name: 'setup' }, { name: 'bug' }
                ]
            });

            await updateLabelWarning();

            expect(warningSection.style.display).toBe('none');
        });

        test('should show warning when labels are missing', async () => {
            const warningSection = document.getElementById('label-warning-section');
            
            // Mock some labels missing
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { name: 'bug' },
                    { name: 'enhancement' }
                ]
            });

            await updateLabelWarning();

            expect(warningSection.style.display).toBe('block');
        });

        test('should handle missing warning section element', async () => {
            document.body.innerHTML = '<div></div>'; // Remove warning section

            // Should not throw an error
            await expect(updateLabelWarning()).resolves.toBeUndefined();
        });

        test('should handle errors during label status check', async () => {
            const warningSection = document.getElementById('label-warning-section');
            
            // Mock an error in findMissingLabels by making checkExistingLabels fail
            mockFetch.mockRejectedValueOnce(new Error('API error'));

            await updateLabelWarning();

            // When findMissingLabels encounters an error, it should still show the warning
            // because checkExistingLabels returns [] on error, making it think all labels are missing
            expect(warningSection.style.display).toBe('block');
            expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to check existing labels:', expect.any(Error));
        });



        test('should handle errors during installation in button click handler', async () => {
            const installButton = document.getElementById('install-labels-btn');
            
            // Mock some labels missing to set up the button
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [{ name: 'bug' }]
            });

            await updateLabelWarning();

            // Mock window.GitHubAuth to be undefined during installation to cause an error
            const originalAuth = window.GitHubAuth;
            window.GitHubAuth = undefined;

            // Click the install button - this should cause an error in installMissingLabels
            await installButton.onclick();

            expect(mockConsoleError).toHaveBeenCalledWith('Failed to install labels:', expect.any(Error));
            expect(installButton.disabled).toBe(false);
            expect(installButton.textContent).toBe('Install Labels');

            // Restore original auth
            window.GitHubAuth = originalAuth;
        });

        test('should set up install button click handler', async () => {
            const installButton = document.getElementById('install-labels-btn');
            
            // Mock some labels missing
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { name: 'bug' }
                ]
            });

            await updateLabelWarning();

            expect(installButton.onclick).toBeDefined();
            expect(typeof installButton.onclick).toBe('function');
        });

        test('should handle install button click - successful installation', async () => {
            const installButton = document.getElementById('install-labels-btn');
            
            // Mock some labels missing
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { name: 'bug' }
                ]
            });

            await updateLabelWarning();

            // Mock successful installation
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { name: 'bug' }, { name: 'in progress' }, { name: 'review' }, { name: 'done' },
                    { name: 'archive' }, { name: 'high' }, { name: 'medium' }, { name: 'low' },
                    { name: 'frontend' }, { name: 'backend' }, { name: 'design' }, { name: 'testing' },
                    { name: 'database' }, { name: 'setup' }
                ]
            });

            // Mock installation API calls
            for (let i = 0; i < 13; i++) {
                mockFetch.mockResolvedValueOnce({ ok: true });
            }

            // Click the install button
            await installButton.onclick();

            expect(installButton.disabled).toBe(false);
            expect(installButton.textContent).toBe('Install Labels');
        });

        test('should handle install button click - partial failure', async () => {
            const installButton = document.getElementById('install-labels-btn');
            
            // Mock some labels missing
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { name: 'bug' }
                ]
            });

            await updateLabelWarning();

            // Mock partial failure during installation
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { name: 'bug' }
                ]
            });

            // Mock some installation failures
            mockFetch.mockResolvedValueOnce({ ok: true })  // First label succeeds
                     .mockResolvedValueOnce({ 
                         ok: false, 
                         json: async () => ({ message: 'Already exists' })
                     }); // Second label fails

            // Add more successful mocks for remaining labels
            for (let i = 0; i < 11; i++) {
                mockFetch.mockResolvedValueOnce({ ok: true });
            }

            // Mock final check after installation
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { name: 'bug' }, { name: 'in progress' }
                ]
            });

            // Click the install button
            await installButton.onclick();

            expect(installButton.disabled).toBe(false);
            expect(installButton.textContent).toBe('Install Labels');
        });

        test('should handle install button click - installation error', async () => {
            const installButton = document.getElementById('install-labels-btn');
            
            // Mock some labels missing
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => [
                    { name: 'bug' }
                ]
            });

            await updateLabelWarning();

            // Mock installation error
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            // Click the install button
            await installButton.onclick();

            expect(installButton.disabled).toBe(false);
            expect(installButton.textContent).toBe('Install Labels');
        });

        test('should handle missing install button element', async () => {
            document.body.innerHTML = `
                <div id="label-warning-section" style="display: none;">
                    <div class="warning-text"></div>
                </div>
            `; // Remove install button

            // Should not throw an error
            await expect(updateLabelWarning()).resolves.toBeUndefined();
        });

        test('should set correct button text during installation', async () => {
            const installButton = document.getElementById('install-labels-btn');
            
            // Mock some labels missing
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => []
            });

            await updateLabelWarning();

            // Start installation (should change button text)
            const installPromise = installButton.onclick();
            
            expect(installButton.disabled).toBe(true);
            expect(installButton.textContent).toBe('Installing...');

            // Mock installation completion
            for (let i = 0; i < 14; i++) {
                mockFetch.mockResolvedValueOnce({ ok: true });
            }

            await installPromise;

            expect(installButton.disabled).toBe(false);
            expect(installButton.textContent).toBe('Install Labels');
        });

        test('should trigger catch block when DOM manipulation throws error', async () => {
            // Create a warning section that throws an error when accessing style property
            let accessCount = 0;
            const mockElement = {
                get style() {
                    accessCount++;
                    if (accessCount === 1) {
                        // First access (in the try block) - throw error to trigger catch block
                        throw new Error('DOM manipulation error');
                    }
                    // Second access (in catch block) - return a working style object
                    return { display: '' };
                }
            };
            
            // Override getElementById to return our problematic element
            const originalGetElementById = document.getElementById;
            document.getElementById = jest.fn().mockReturnValue(mockElement);

            await updateLabelWarning();

            expect(mockConsoleError).toHaveBeenCalledWith('❌ Failed to update label warning:', expect.any(Error));
            expect(accessCount).toBe(2); // Verify both accesses happened
            
            // Restore original function
            document.getElementById = originalGetElementById;
        });
    });

    describe('Module Export', () => {
        test('should export all required functions', () => {
            expect(loadRequiredLabels).toBeDefined();
            expect(typeof loadRequiredLabels).toBe('function');
            expect(checkExistingLabels).toBeDefined();
            expect(typeof checkExistingLabels).toBe('function');
            expect(findMissingLabels).toBeDefined();
            expect(typeof findMissingLabels).toBe('function');
            expect(installMissingLabels).toBeDefined();
            expect(typeof installMissingLabels).toBe('function');
            expect(updateLabelWarning).toBeDefined();
            expect(typeof updateLabelWarning).toBe('function');
        });
    });
}); 