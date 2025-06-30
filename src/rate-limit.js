// GitHub API Rate Limit Management
// Handles detection, display, and recovery from rate limiting

// Rate limit state
let rateLimitState = {
    isLimited: false,
    resetTime: null,
    remaining: null,
    limit: null,
    lastChecked: null
};

// Check if we're currently rate limited
function isRateLimited() {
    // If we know we're rate limited and reset time hasn't passed
    if (rateLimitState.isLimited && rateLimitState.resetTime) {
        const now = Date.now();
        if (now < rateLimitState.resetTime * 1000) {
            return true;
        } else {
            // Reset time has passed, clear rate limit state
            clearRateLimitState();
            return false;
        }
    }
    return false;
}

// Clear rate limit state
function clearRateLimitState() {
    rateLimitState.isLimited = false;
    rateLimitState.resetTime = null;
    hideBanner();
}

// Check GitHub API rate limit status
async function checkRateLimit() {
    try {
        const headers = {};
        
        // Add auth header if available
        if (window.GitHubAuth?.githubAuth?.accessToken) {
            headers['Authorization'] = `token ${window.GitHubAuth.githubAuth.accessToken}`;
        }
        
        const response = await fetch('https://api.github.com/rate_limit', {
            headers: headers
        });
        
        if (response.ok) {
            const data = await response.json();
            const core = data.resources.core;
            
            // Update rate limit state
            rateLimitState.remaining = core.remaining;
            rateLimitState.limit = core.limit;
            rateLimitState.resetTime = core.reset;
            rateLimitState.lastChecked = Date.now();
            
            // Check if we're rate limited
            if (core.remaining === 0) {
                rateLimitState.isLimited = true;
                showBanner(core);
            } else if (core.remaining < 10) {
                // Show warning when getting close to limit
                showLowRemainingWarning(core);
            } else {
                hideBanner();
            }
            
            console.log(`📊 GitHub API Rate Limit: ${core.remaining}/${core.limit} remaining (resets at ${new Date(core.reset * 1000).toLocaleTimeString()})`);
            
            return {
                isLimited: core.remaining === 0,
                remaining: core.remaining,
                limit: core.limit,
                resetTime: core.reset
            };
        }
    } catch (error) {
        console.warn('Failed to check rate limit:', error);
    }
    
    return null;
}

// Handle API response and check for rate limiting
function handleApiResponse(response) {
    // Check rate limit headers
    const remaining = parseInt(response.headers.get('x-ratelimit-remaining') || '0');
    const limit = parseInt(response.headers.get('x-ratelimit-limit') || '5000');
    const resetTime = parseInt(response.headers.get('x-ratelimit-reset') || '0');
    
    // Update state
    rateLimitState.remaining = remaining;
    rateLimitState.limit = limit;
    rateLimitState.resetTime = resetTime;
    rateLimitState.lastChecked = Date.now();
    
    // Check if response indicates rate limiting
    if (response.status === 403) {
        const rateLimitExceeded = response.headers.get('x-ratelimit-remaining') === '0';
        if (rateLimitExceeded) {
            rateLimitState.isLimited = true;
            showBanner({ remaining, limit, reset: resetTime });
            return true; // Indicates rate limited
        }
    } else if (remaining === 0) {
        rateLimitState.isLimited = true;
        showBanner({ remaining, limit, reset: resetTime });
        return true;
    } else if (remaining < 10) {
        showLowRemainingWarning({ remaining, limit, reset: resetTime });
    }
    
    return false; // Not rate limited
}

// Show the rate limit banner
function showBanner(rateLimitInfo) {
    const banner = document.getElementById('rate-limit-banner');
    const message = document.getElementById('rate-limit-message');
    const details = document.getElementById('rate-limit-details');
    
    if (!banner || !message || !details) return;
    
    const resetDate = new Date(rateLimitInfo.reset * 1000);
    const timeUntilReset = Math.ceil((resetDate.getTime() - Date.now()) / 60000); // minutes
    
    // Determine message based on authentication status
    const isAuthenticated = window.GitHubAuth?.githubAuth?.isAuthenticated;
    let bannerMessage = '';
    
    if (isAuthenticated) {
        bannerMessage = ` - Resets in ${timeUntilReset} minutes at ${resetDate.toLocaleTimeString()}.`;
    } else {
        bannerMessage = ` - Authenticate with a GitHub token for 83x higher limits (5,000/hour vs 60/hour). Resets in ${timeUntilReset} minutes.`;
    }
    
    message.textContent = bannerMessage;
    details.textContent = `${rateLimitInfo.remaining}/${rateLimitInfo.limit} requests remaining`;
    
    banner.classList.remove('hidden');
    
    // Auto-hide when rate limit resets
    if (timeUntilReset > 0) {
        setTimeout(() => {
            if (!isRateLimited()) {
                hideBanner();
            }
        }, timeUntilReset * 60000);
    }
}

// Show warning when approaching rate limit
function showLowRemainingWarning(rateLimitInfo) {
    const banner = document.getElementById('rate-limit-banner');
    const message = document.getElementById('rate-limit-message');
    const details = document.getElementById('rate-limit-details');
    
    if (!banner || !message || !details) return;
    
    // Change banner to warning style
    banner.className = 'bg-yellow-50 border-l-4 border-yellow-400 p-4';
    
    const resetDate = new Date(rateLimitInfo.reset * 1000);
    const isAuthenticated = window.GitHubAuth?.githubAuth?.isAuthenticated;
    
    let bannerMessage = ` - Only ${rateLimitInfo.remaining} requests remaining.`;
    if (!isAuthenticated) {
        bannerMessage += ' Consider authenticating for higher limits.';
    }
    
    // Update banner content
    const warningIcon = banner.querySelector('i');
    if (warningIcon) {
        warningIcon.className = 'fas fa-exclamation-triangle text-yellow-400 text-lg';
    }
    
    const textElements = banner.querySelectorAll('.text-amber-700, .text-amber-600');
    textElements.forEach(el => {
        el.className = el.className.replace('text-amber-', 'text-yellow-');
    });
    
    message.textContent = bannerMessage;
    details.textContent = `${rateLimitInfo.remaining}/${rateLimitInfo.limit} requests remaining`;
    
    banner.classList.remove('hidden');
}

// Hide the rate limit banner
function hideBanner() {
    const banner = document.getElementById('rate-limit-banner');
    if (banner) {
        banner.classList.add('hidden');
        
        // Reset banner to error style for next time
        banner.className = 'hidden bg-amber-50 border-l-4 border-amber-400 p-4';
        
        // Reset icon and text colors
        const warningIcon = banner.querySelector('i');
        if (warningIcon) {
            warningIcon.className = 'fas fa-exclamation-triangle text-amber-400 text-lg';
        }
        
        const textElements = banner.querySelectorAll('.text-yellow-700, .text-yellow-600');
        textElements.forEach(el => {
            el.className = el.className.replace('text-yellow-', 'text-amber-');
        });
    }
}

// Initialize rate limit management
function initializeRateLimitManager() {
    // Set up dismiss button
    const dismissButton = document.getElementById('dismiss-rate-limit-banner');
    if (dismissButton) {
        dismissButton.addEventListener('click', hideBanner);
    }
    
    // Check rate limit on initialization
    checkRateLimit();
    
    // Set up periodic rate limit checking (every 5 minutes)
    setInterval(() => {
        if (!isRateLimited()) {
            checkRateLimit();
        }
    }, 5 * 60 * 1000);
    
    console.log('📊 Rate limit manager initialized');
}

// Wrapper for fetch that automatically handles rate limiting
async function rateLimitedFetch(url, options = {}) {
    // Check if we're already rate limited
    if (isRateLimited()) {
        throw new Error('Rate limited - requests are temporarily blocked');
    }
    
    try {
        const response = await fetch(url, options);
        
        // Handle rate limit response
        const isLimited = handleApiResponse(response);
        
        if (isLimited) {
            throw new Error('Rate limit exceeded');
        }
        
        return response;
    } catch (error) {
        // If it's a rate limit error, make sure banner is shown
        if (error.message.includes('Rate limit') || error.message.includes('403')) {
            rateLimitState.isLimited = true;
            showBanner({
                remaining: 0,
                limit: rateLimitState.limit || 5000,
                reset: rateLimitState.resetTime || (Date.now() / 1000 + 3600) // 1 hour from now as fallback
            });
        }
        throw error;
    }
}

// Export rate limit manager
window.RateLimit = {
    isRateLimited,
    checkRateLimit,
    handleApiResponse,
    showBanner,
    hideBanner,
    rateLimitedFetch,
    state: rateLimitState
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeRateLimitManager);
} else {
    initializeRateLimitManager();
}