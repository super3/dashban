describe('Rate Limit Management', () => {
    let container;
    let originalFetch;
    let originalLocalStorage;
    let originalConsole;
    let originalSetTimeout;
    let originalSetInterval;
    let originalDateNow;
    let RateLimit;

    beforeEach(() => {
        // Store originals
        originalFetch = global.fetch;
        originalLocalStorage = global.localStorage;
        originalConsole = global.console;
        originalSetTimeout = global.setTimeout;
        originalSetInterval = global.setInterval;
        originalDateNow = Date.now;

        // Create test DOM
        container = document.createElement('div');
        container.innerHTML = `
            <div id="rate-limit-banner" class="hidden bg-amber-50 border-l-4 border-amber-400 p-4">
                <div class="flex">
                    <div class="flex-shrink-0">
                        <i class="fas fa-exclamation-triangle text-amber-400 text-lg"></i>
                    </div>
                    <div class="ml-3">
                        <p class="text-sm text-amber-700">
                            <strong>GitHub API Rate Limit Exceeded</strong>
                            <span id="rate-limit-message"></span>
                        </p>
                        <p class="text-xs text-amber-600 mt-1" id="rate-limit-details"></p>
                        <div class="mt-2">
                            <button id="dismiss-rate-limit-banner" class="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs px-2 py-1 rounded">
                                Dismiss
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(container);

        // Mock global functions
        global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
        global.fetch = jest.fn();
        global.setTimeout = jest.fn();
        global.setInterval = jest.fn();
        Date.now = jest.fn(() => 1000000);

        // Mock GitHubAuth
        global.window = window;
        window.GitHubAuth = {
            githubAuth: {
                accessToken: 'test-token',
                isAuthenticated: true
            }
        };

        // Clear any existing modules
        jest.resetModules();
        
        // Load the rate-limit module
        require('../src/rate-limit.js');
        RateLimit = window.RateLimit;
    });

    afterEach(() => {
        // Restore originals
        global.fetch = originalFetch;
        global.localStorage = originalLocalStorage;
        global.console = originalConsole;
        global.setTimeout = originalSetTimeout;
        global.setInterval = originalSetInterval;
        Date.now = originalDateNow;

        // Clean up DOM
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
        
        jest.clearAllMocks();
    });

    describe('isRateLimited', () => {
        test('should return false when not rate limited', () => {
            expect(RateLimit.isRateLimited()).toBe(false);
        });

        test('should return true when rate limited and reset time not passed', () => {
            RateLimit.state.isLimited = true;
            RateLimit.state.resetTime = 2000; // Future timestamp (2000 seconds)
            global.Date.now.mockReturnValue(1500000); // Current time in milliseconds
            
            expect(RateLimit.isRateLimited()).toBe(true);
        });

        test('should return false and clear state when reset time has passed', () => {
            RateLimit.state.isLimited = true;
            RateLimit.state.resetTime = 500; // Past timestamp (500 seconds)
            global.Date.now.mockReturnValue(1000000); // Current time in milliseconds
            
            expect(RateLimit.isRateLimited()).toBe(false);
            expect(RateLimit.state.isLimited).toBe(false);
            expect(RateLimit.state.resetTime).toBe(null);
        });

        test('should return false when isLimited is false', () => {
            RateLimit.state.isLimited = false;
            RateLimit.state.resetTime = 2000;
            
            expect(RateLimit.isRateLimited()).toBe(false);
        });

        test('should return false when resetTime is null', () => {
            RateLimit.state.isLimited = true;
            RateLimit.state.resetTime = null;
            
            expect(RateLimit.isRateLimited()).toBe(false);
        });
    });

    describe('checkRateLimit', () => {
        test('should successfully check rate limit with authentication', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    resources: {
                        core: {
                            remaining: 4500,
                            limit: 5000,
                            reset: 1600000
                        }
                    }
                })
            };
            global.fetch.mockResolvedValue(mockResponse);

            const result = await RateLimit.checkRateLimit();

            expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/rate_limit', {
                headers: {
                    'Authorization': 'token test-token'
                }
            });
            expect(result).toEqual({
                isLimited: false,
                remaining: 4500,
                limit: 5000,
                resetTime: 1600000
            });
            expect(RateLimit.state.remaining).toBe(4500);
            expect(RateLimit.state.limit).toBe(5000);
            expect(RateLimit.state.resetTime).toBe(1600000);
        });

        test('should check rate limit without authentication', async () => {
            window.GitHubAuth.githubAuth.accessToken = null;
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    resources: {
                        core: {
                            remaining: 50,
                            limit: 60,
                            reset: 1600000
                        }
                    }
                })
            };
            global.fetch.mockResolvedValue(mockResponse);

            await RateLimit.checkRateLimit();

            expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/rate_limit', {
                headers: {}
            });
        });

        test('should handle rate limit exceeded (remaining = 0)', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    resources: {
                        core: {
                            remaining: 0,
                            limit: 5000,
                            reset: 1600000
                        }
                    }
                })
            };
            global.fetch.mockResolvedValue(mockResponse);

            const result = await RateLimit.checkRateLimit();

            expect(result.isLimited).toBe(true);
            expect(RateLimit.state.isLimited).toBe(true);
            expect(document.getElementById('rate-limit-banner').classList.contains('hidden')).toBe(false);
        });

        test('should show low remaining warning when remaining < 10', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    resources: {
                        core: {
                            remaining: 5,
                            limit: 5000,
                            reset: 1600000
                        }
                    }
                })
            };
            global.fetch.mockResolvedValue(mockResponse);

            await RateLimit.checkRateLimit();

            expect(document.getElementById('rate-limit-banner').classList.contains('hidden')).toBe(false);
            expect(document.getElementById('rate-limit-banner').className).toContain('bg-yellow-50');
        });

        test('should hide banner when remaining >= 10', async () => {
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    resources: {
                        core: {
                            remaining: 50,
                            limit: 5000,
                            reset: 1600000
                        }
                    }
                })
            };
            global.fetch.mockResolvedValue(mockResponse);

            await RateLimit.checkRateLimit();

            expect(document.getElementById('rate-limit-banner').classList.contains('hidden')).toBe(true);
        });

        test('should handle fetch error', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));

            const result = await RateLimit.checkRateLimit();

            expect(result).toBe(null);
            expect(global.console.warn).toHaveBeenCalledWith('Failed to check rate limit:', expect.any(Error));
        });

        test('should handle non-ok response', async () => {
            const mockResponse = { ok: false };
            global.fetch.mockResolvedValue(mockResponse);

            const result = await RateLimit.checkRateLimit();

            expect(result).toBe(null);
        });

        test('should handle missing GitHubAuth', async () => {
            window.GitHubAuth = undefined;
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    resources: {
                        core: {
                            remaining: 50,
                            limit: 60,
                            reset: 1600000
                        }
                    }
                })
            };
            global.fetch.mockResolvedValue(mockResponse);

            await RateLimit.checkRateLimit();

            expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/rate_limit', {
                headers: {}
            });
        });
    });

    describe('handleApiResponse', () => {
        let mockResponse;

        beforeEach(() => {
            mockResponse = {
                status: 200,
                headers: {
                    get: jest.fn()
                }
            };
        });

        test('should handle normal response with rate limit headers', () => {
            mockResponse.headers.get.mockImplementation(header => {
                switch (header) {
                    case 'x-ratelimit-remaining': return '4500';
                    case 'x-ratelimit-limit': return '5000';
                    case 'x-ratelimit-reset': return '1600000';
                    default: return null;
                }
            });

            const result = RateLimit.handleApiResponse(mockResponse);

            expect(result).toBe(false);
            expect(RateLimit.state.remaining).toBe(4500);
            expect(RateLimit.state.limit).toBe(5000);
            expect(RateLimit.state.resetTime).toBe(1600000);
        });

        test('should handle 403 response with rate limit exceeded', () => {
            mockResponse.status = 403;
            mockResponse.headers.get.mockImplementation(header => {
                switch (header) {
                    case 'x-ratelimit-remaining': return '0';
                    case 'x-ratelimit-limit': return '5000';
                    case 'x-ratelimit-reset': return '1600000';
                    default: return null;
                }
            });

            const result = RateLimit.handleApiResponse(mockResponse);

            expect(result).toBe(true);
            expect(RateLimit.state.isLimited).toBe(true);
            expect(document.getElementById('rate-limit-banner').classList.contains('hidden')).toBe(false);
        });

        test('should handle 403 response without rate limit exceeded', () => {
            mockResponse.status = 403;
            mockResponse.headers.get.mockImplementation(header => {
                switch (header) {
                    case 'x-ratelimit-remaining': return '100';
                    case 'x-ratelimit-limit': return '5000';
                    case 'x-ratelimit-reset': return '1600000';
                    default: return null;
                }
            });

            const result = RateLimit.handleApiResponse(mockResponse);

            expect(result).toBe(false);
            expect(RateLimit.state.isLimited).toBe(false);
        });

        test('should handle remaining = 0 on non-403 response', () => {
            mockResponse.headers.get.mockImplementation(header => {
                switch (header) {
                    case 'x-ratelimit-remaining': return '0';
                    case 'x-ratelimit-limit': return '5000';
                    case 'x-ratelimit-reset': return '1600000';
                    default: return null;
                }
            });

            const result = RateLimit.handleApiResponse(mockResponse);

            expect(result).toBe(true);
            expect(RateLimit.state.isLimited).toBe(true);
        });

        test('should handle low remaining warning', () => {
            mockResponse.headers.get.mockImplementation(header => {
                switch (header) {
                    case 'x-ratelimit-remaining': return '5';
                    case 'x-ratelimit-limit': return '5000';
                    case 'x-ratelimit-reset': return '1600000';
                    default: return null;
                }
            });

            const result = RateLimit.handleApiResponse(mockResponse);

            expect(result).toBe(false);
            expect(document.getElementById('rate-limit-banner').classList.contains('hidden')).toBe(false);
            expect(document.getElementById('rate-limit-banner').className).toContain('bg-yellow-50');
        });

        test('should use default values for missing headers', () => {
            mockResponse.headers.get.mockReturnValue(null);

            const result = RateLimit.handleApiResponse(mockResponse);

            expect(result).toBe(true); // Because remaining defaults to 0
            expect(RateLimit.state.remaining).toBe(0);
            expect(RateLimit.state.limit).toBe(5000);
            expect(RateLimit.state.resetTime).toBe(0);
        });
    });

    describe('showBanner', () => {
        test('should show banner with authenticated user message', () => {
            const rateLimitInfo = {
                remaining: 0,
                limit: 5000,
                reset: 1600 // seconds
            };
            global.Date.now.mockReturnValue(1000000); // milliseconds

            RateLimit.showBanner(rateLimitInfo);

            const banner = document.getElementById('rate-limit-banner');
            const message = document.getElementById('rate-limit-message');
            const details = document.getElementById('rate-limit-details');

            expect(banner.classList.contains('hidden')).toBe(false);
            expect(message.textContent).toContain('Resets in');
            expect(message.textContent).toContain('minutes');
            expect(details.textContent).toBe('0/5000 requests remaining');
        });

        test('should show banner with unauthenticated user message', () => {
            window.GitHubAuth.githubAuth.isAuthenticated = false;
            const rateLimitInfo = {
                remaining: 0,
                limit: 60,
                reset: 1600
            };

            RateLimit.showBanner(rateLimitInfo);

            const message = document.getElementById('rate-limit-message');
            expect(message.textContent).toContain('Authenticate with a GitHub token');
            expect(message.textContent).toContain('83x higher limits');
        });

        test('should handle missing banner elements', () => {
            document.getElementById('rate-limit-banner').remove();
            const rateLimitInfo = { remaining: 0, limit: 5000, reset: 1600 };

            expect(() => RateLimit.showBanner(rateLimitInfo)).not.toThrow();
        });

        test('should set timeout for auto-hide', () => {
            const rateLimitInfo = {
                remaining: 0,
                limit: 5000,
                reset: 1700 // Future time
            };
            global.Date.now.mockReturnValue(1000000);

            RateLimit.showBanner(rateLimitInfo);

            expect(global.setTimeout).toHaveBeenCalled();
        });

        test('should execute timeout callback and hide banner when not rate limited', () => {
            const rateLimitInfo = {
                remaining: 0,
                limit: 5000,
                reset: 1700 // Future time
            };
            global.Date.now.mockReturnValue(1000000);
            
            // Mock setTimeout to capture and execute the callback
            global.setTimeout = jest.fn((callback) => {
                // Simulate that rate limit has been cleared
                RateLimit.state.isLimited = false;
                RateLimit.state.resetTime = null;
                callback();
            });

            RateLimit.showBanner(rateLimitInfo);

            // Check that banner is hidden after timeout callback
            const banner = document.getElementById('rate-limit-banner');
            expect(banner.classList.contains('hidden')).toBe(true);
        });

        test('should not hide banner in timeout if still rate limited', () => {
            const rateLimitInfo = {
                remaining: 0,
                limit: 5000,
                reset: 1700 // Future time
            };
            global.Date.now.mockReturnValue(1000000);
            
            // Mock setTimeout to capture and execute the callback
            global.setTimeout = jest.fn((callback) => {
                // Keep rate limit state as limited
                RateLimit.state.isLimited = true;
                RateLimit.state.resetTime = 2000;
                callback();
            });

            const banner = document.getElementById('rate-limit-banner');
            banner.classList.remove('hidden'); // Ensure banner is visible first

            RateLimit.showBanner(rateLimitInfo);

            // Banner should still be visible since still rate limited
            expect(banner.classList.contains('hidden')).toBe(false);
        });

        test('should not set timeout when timeUntilReset <= 0', () => {
            const rateLimitInfo = {
                remaining: 0,
                limit: 5000,
                reset: 900 // Past time
            };
            global.Date.now.mockReturnValue(1000000);

            RateLimit.showBanner(rateLimitInfo);

            expect(global.setTimeout).not.toHaveBeenCalled();
        });
    });

    describe('showLowRemainingWarning (via handleApiResponse)', () => {
        test('should show warning banner with authenticated user', () => {
            const mockResponse = {
                status: 200,
                headers: {
                    get: jest.fn().mockImplementation(header => {
                        switch (header) {
                            case 'x-ratelimit-remaining': return '5';
                            case 'x-ratelimit-limit': return '5000';
                            case 'x-ratelimit-reset': return '1600';
                            default: return null;
                        }
                    })
                }
            };

            RateLimit.handleApiResponse(mockResponse);

            const banner = document.getElementById('rate-limit-banner');
            const message = document.getElementById('rate-limit-message');

            expect(banner.classList.contains('hidden')).toBe(false);
            expect(banner.className).toContain('bg-yellow-50');
            expect(message.textContent).toContain('Only 5 requests remaining');
            expect(message.textContent).not.toContain('Consider authenticating');
        });

        test('should show warning banner with unauthenticated user', () => {
            window.GitHubAuth.githubAuth.isAuthenticated = false;
            const mockResponse = {
                status: 200,
                headers: {
                    get: jest.fn().mockImplementation(header => {
                        switch (header) {
                            case 'x-ratelimit-remaining': return '5';
                            case 'x-ratelimit-limit': return '60';
                            case 'x-ratelimit-reset': return '1600';
                            default: return null;
                        }
                    })
                }
            };

            RateLimit.handleApiResponse(mockResponse);

            const message = document.getElementById('rate-limit-message');
            expect(message.textContent).toContain('Consider authenticating for higher limits');
        });

        test('should handle missing banner elements', () => {
            document.getElementById('rate-limit-banner').remove();
            const mockResponse = {
                status: 200,
                headers: {
                    get: jest.fn().mockImplementation(header => {
                        switch (header) {
                            case 'x-ratelimit-remaining': return '5';
                            case 'x-ratelimit-limit': return '5000';
                            case 'x-ratelimit-reset': return '1600';
                            default: return null;
                        }
                    })
                }
            };

            expect(() => RateLimit.handleApiResponse(mockResponse)).not.toThrow();
        });

        test('should update icon and text colors', () => {
            const mockResponse = {
                status: 200,
                headers: {
                    get: jest.fn().mockImplementation(header => {
                        switch (header) {
                            case 'x-ratelimit-remaining': return '5';
                            case 'x-ratelimit-limit': return '5000';
                            case 'x-ratelimit-reset': return '1600';
                            default: return null;
                        }
                    })
                }
            };

            RateLimit.handleApiResponse(mockResponse);

            const icon = document.querySelector('i');
            expect(icon.className).toContain('text-yellow-400');
        });
    });

    describe('hideBanner', () => {
        test('should hide banner and reset styles', () => {
            const banner = document.getElementById('rate-limit-banner');
            banner.classList.remove('hidden');

            RateLimit.hideBanner();

            expect(banner.classList.contains('hidden')).toBe(true);
            expect(banner.className).toContain('bg-amber-50');
        });

        test('should reset icon and text colors', () => {
            RateLimit.hideBanner();

            const icon = document.querySelector('i');
            expect(icon.className).toContain('text-amber-400');
        });

        test('should reset text color classes from yellow to amber', () => {
            const banner = document.getElementById('rate-limit-banner');
            
            // Add some yellow text elements to test the color replacement
            const textElement = document.createElement('p');
            textElement.className = 'text-yellow-700';
            banner.appendChild(textElement);
            
            const textElement2 = document.createElement('span');
            textElement2.className = 'text-yellow-600';
            banner.appendChild(textElement2);

            RateLimit.hideBanner();

            expect(textElement.className).toBe('text-amber-700');
            expect(textElement2.className).toBe('text-amber-600');
        });

        test('should handle missing banner element', () => {
            document.getElementById('rate-limit-banner').remove();

            expect(() => RateLimit.hideBanner()).not.toThrow();
        });
    });

    describe('rateLimitedFetch', () => {
        test('should throw error when already rate limited', async () => {
            RateLimit.state.isLimited = true;
            RateLimit.state.resetTime = 2000;
            global.Date.now.mockReturnValue(1500000);

            await expect(RateLimit.rateLimitedFetch('https://example.com'))
                .rejects.toThrow('Rate limited - requests are temporarily blocked');
        });

        test('should make successful fetch when not rate limited', async () => {
            const mockResponse = {
                status: 200,
                headers: {
                    get: jest.fn().mockImplementation(header => {
                        switch (header) {
                            case 'x-ratelimit-remaining': return '4500';
                            case 'x-ratelimit-limit': return '5000';
                            case 'x-ratelimit-reset': return '1600000';
                            default: return null;
                        }
                    })
                }
            };
            global.fetch.mockResolvedValue(mockResponse);

            const result = await RateLimit.rateLimitedFetch('https://example.com', { method: 'GET' });

            expect(global.fetch).toHaveBeenCalledWith('https://example.com', { method: 'GET' });
            expect(result).toBe(mockResponse);
        });

        test('should throw error when rate limit exceeded in response', async () => {
            const mockResponse = {
                status: 403,
                headers: {
                    get: jest.fn().mockImplementation(header => {
                        switch (header) {
                            case 'x-ratelimit-remaining': return '0';
                            case 'x-ratelimit-limit': return '5000';
                            case 'x-ratelimit-reset': return '1600000';
                            default: return null;
                        }
                    })
                }
            };
            global.fetch.mockResolvedValue(mockResponse);

            await expect(RateLimit.rateLimitedFetch('https://example.com'))
                .rejects.toThrow('Rate limit exceeded');
        });

        test('should handle rate limit error and show banner', async () => {
            global.fetch.mockRejectedValue(new Error('Rate limit exceeded'));

            await expect(RateLimit.rateLimitedFetch('https://example.com'))
                .rejects.toThrow('Rate limit');

            expect(RateLimit.state.isLimited).toBe(true);
            expect(document.getElementById('rate-limit-banner').classList.contains('hidden')).toBe(false);
        });

        test('should handle 403 error and show banner', async () => {
            global.fetch.mockRejectedValue(new Error('Forbidden 403'));

            await expect(RateLimit.rateLimitedFetch('https://example.com'))
                .rejects.toThrow('403');

            expect(RateLimit.state.isLimited).toBe(true);
        });

        test('should handle other errors without setting rate limit', async () => {
            global.fetch.mockRejectedValue(new Error('Network error'));

            await expect(RateLimit.rateLimitedFetch('https://example.com'))
                .rejects.toThrow('Network error');

            expect(RateLimit.state.isLimited).toBe(false);
        });
    });

    describe('initialization', () => {
        test('should set up dismiss button click handler', () => {
            const dismissButton = document.getElementById('dismiss-rate-limit-banner');
            
            // Test that clicking the dismiss button actually hides the banner
            const banner = document.getElementById('rate-limit-banner');
            banner.classList.remove('hidden'); // Show banner first
            
            // Simulate click on dismiss button
            dismissButton.click();
            
            // Check that banner is hidden
            expect(banner.classList.contains('hidden')).toBe(true);
        });

        test('should handle missing dismiss button', () => {
            document.getElementById('dismiss-rate-limit-banner').remove();

            expect(() => {
                const event = new window.Event('DOMContentLoaded');
                document.dispatchEvent(event);
            }).not.toThrow();
        });

        test('should set up periodic rate limit checking', () => {
            expect(global.setInterval).toHaveBeenCalledWith(expect.any(Function), 5 * 60 * 1000);
        });

        test('should execute periodic check when not rate limited', () => {
            // Create a mock for fetch to track checkRateLimit calls indirectly
            const mockResponse = {
                ok: true,
                json: jest.fn().mockResolvedValue({
                    resources: {
                        core: {
                            remaining: 4500,
                            limit: 5000,
                            reset: 1600000
                        }
                    }
                })
            };
            global.fetch.mockResolvedValue(mockResponse);
            
            // Get the interval callback
            const intervalCallback = global.setInterval.mock.calls[0][0];
            
            // Ensure we're not rate limited
            RateLimit.state.isLimited = false;
            
            // Execute the interval callback
            intervalCallback();
            
            // Since checkRateLimit makes a fetch call, we can verify it was called
            expect(global.fetch).toHaveBeenCalledWith('https://api.github.com/rate_limit', expect.any(Object));
        });

        test('should not execute periodic check when rate limited', () => {
            // Clear any previous fetch calls
            global.fetch.mockClear();
            
            // Get the interval callback
            const intervalCallback = global.setInterval.mock.calls[0][0];
            
            // Set rate limited state
            RateLimit.state.isLimited = true;
            RateLimit.state.resetTime = 2000;
            global.Date.now.mockReturnValue(1500000);
            
            // Execute the interval callback
            intervalCallback();
            
            // Verify that fetch was not called (meaning checkRateLimit was not called)
            expect(global.fetch).not.toHaveBeenCalled();
        });

        test('should log initialization message', () => {
            expect(global.console.log).toHaveBeenCalledWith('📊 Rate limit manager initialized');
        });
    });

    describe('DOM ready states', () => {
        test('should initialize immediately when DOM is ready', () => {
            // Already tested in the main initialization since DOM is ready in beforeEach
            expect(global.console.log).toHaveBeenCalledWith('📊 Rate limit manager initialized');
        });

        test('should add event listener when DOM is loading', () => {
            // Create a fresh test environment
            const testContainer = document.createElement('div');
            testContainer.innerHTML = `
                <div id="test-rate-limit-banner" class="hidden">
                    <span id="test-rate-limit-message"></span>
                    <span id="test-rate-limit-details"></span>
                    <button id="test-dismiss-rate-limit-banner">Dismiss</button>
                </div>
            `;
            document.body.appendChild(testContainer);

            // Mock document.readyState as loading
            const originalReadyState = document.readyState;
            Object.defineProperty(document, 'readyState', {
                value: 'loading',
                configurable: true
            });

            const addEventListenerSpy = jest.fn();
            const originalAddEventListener = document.addEventListener;
            document.addEventListener = addEventListenerSpy;

            // Clear modules and reload
            jest.resetModules();
            require('../src/rate-limit.js');

            expect(addEventListenerSpy).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));

            // Restore
            document.addEventListener = originalAddEventListener;
            Object.defineProperty(document, 'readyState', {
                value: originalReadyState,
                configurable: true
            });
            document.body.removeChild(testContainer);
        });
    });

    describe('window.RateLimit exports', () => {
        test('should export all required functions and state', () => {
            expect(window.RateLimit).toBeDefined();
            expect(typeof window.RateLimit.isRateLimited).toBe('function');
            expect(typeof window.RateLimit.checkRateLimit).toBe('function');
            expect(typeof window.RateLimit.handleApiResponse).toBe('function');
            expect(typeof window.RateLimit.showBanner).toBe('function');
            expect(typeof window.RateLimit.hideBanner).toBe('function');
            expect(typeof window.RateLimit.rateLimitedFetch).toBe('function');
            expect(window.RateLimit.state).toBeDefined();
        });
    });
});