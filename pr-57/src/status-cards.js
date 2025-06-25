// Status Cards JavaScript - Clean and Testable Implementation
document.addEventListener('DOMContentLoaded', function() {
    // ============================================================================
    // CONSTANTS AND CONFIGURATION
    // ============================================================================
    
    const CONFIG = {
        // Default values - will be overridden by current repository
        OWNER: 'super3',
        REPO: 'dashban',
        WORKFLOWS: {
            FRONTEND: 'frontend.yml',
            TEST: 'test.yml'
        },
        INTERVALS: {
            REFRESH_ALL: 10 * 60 * 1000, // 10 minutes
            UPDATE_TIMESTAMP: 60 * 1000, // 1 minute
            INITIAL_DELAYS: {
                CI_STATUS: 1000,
                COVERAGE: 2000,
                FINAL_REFRESH: 5000
            },
            REFRESH_DELAYS: {
                CI_STATUS: 500,
                COVERAGE: 1000
            }
        },
        SELECTORS: {
            FRONTEND_STATUS: '[data-frontend-status]',
            FRONTEND_TIME: '[data-frontend-time]',
            CI_STATUS: '[data-ci-status]',
            CI_TIME: '[data-ci-time]',
            COVERAGE_STATUS: '[data-coverage-status]',
            TIMESTAMP_ELEMENTS: '[data-frontend-time], [data-ci-time]',
            BADGE_IMG: '#github-badge',
            REFRESH_BTN: '#refresh-badge'
        }
    };

    const STATUS_CONFIGS = {
        WORKFLOW: {
            success: { icon: 'fas fa-check-circle', color: 'text-green-500', text: 'Deployed', bgColor: 'text-green-600' },
            failure: { icon: 'fas fa-times-circle', color: 'text-red-500', text: 'Failed', bgColor: 'text-red-600' },
            in_progress: { icon: 'fas fa-spinner fa-spin', color: 'text-blue-500', text: 'Deploying', bgColor: 'text-blue-600' },
            queued: { icon: 'fas fa-clock', color: 'text-yellow-500', text: 'Queued', bgColor: 'text-yellow-600' },
            unknown: { icon: 'fas fa-question-circle', color: 'text-gray-500', text: 'Unknown', bgColor: 'text-gray-600' }
        },
        CI: {
            success: { icon: 'fas fa-check-circle', color: 'text-green-500', text: 'Passing', bgColor: 'text-green-600' },
            failure: { icon: 'fas fa-times-circle', color: 'text-red-500', text: 'Failing', bgColor: 'text-red-600' },
            in_progress: { icon: 'fas fa-spinner fa-spin', color: 'text-blue-500', text: 'Running', bgColor: 'text-blue-600' },
            queued: { icon: 'fas fa-clock', color: 'text-yellow-500', text: 'Queued', bgColor: 'text-yellow-600' },
            unknown: { icon: 'fas fa-question-circle', color: 'text-gray-500', text: 'Unknown', bgColor: 'text-gray-600' }
        }
    };

    // ============================================================================
    // REPOSITORY CONFIGURATION HELPERS
    // ============================================================================
    
    function getCurrentRepoConfig() {
        // Use current repository from GitHubAuth if available, otherwise fall back to defaults
        if (window.GitHubAuth?.GITHUB_CONFIG) {
            return {
                OWNER: window.GitHubAuth.GITHUB_CONFIG.owner || CONFIG.OWNER,
                REPO: window.GitHubAuth.GITHUB_CONFIG.repo || CONFIG.REPO
            };
        }
        return {
            OWNER: CONFIG.OWNER,
            REPO: CONFIG.REPO
        };
    }

    // ============================================================================
    // DEPENDENCY VALIDATION
    // ============================================================================
    
    function validateDependencies() {
        if (typeof GitHubUtils === 'undefined') {
            console.error('❌ GitHubUtils not found. Make sure src/utils.js is loaded.');
            return false;
        }
        return true;
    }

    if (!validateDependencies()) {
        return;
    }

    

    // ============================================================================
    // UTILITY FUNCTIONS
    // ============================================================================
    
    function createStatusHTML(config, status) {
        return `
            <div class="flex items-center space-x-1">
                <i class="${config.icon} ${config.color} text-sm"></i>
                <span class="text-sm ${config.bgColor} font-medium">${config.text}</span>
            </div>
        `;
    }

    function createTimestampHTML(updatedAt) {
        const timeAgo = GitHubUtils.getTimeAgo(updatedAt);
        return `
            <div class="flex items-center space-x-2">
                <i class="fas fa-sync text-gray-400 text-xs"></i>
                <span class="text-xs text-gray-500">Updated ${timeAgo}</span>
            </div>
        `;
    }

    function buildBadgeUrl(type, workflowFile = null) {
        const { OWNER, REPO } = getCurrentRepoConfig();
        if (type === 'workflow') {
            return `https://img.shields.io/github/actions/workflow/status/${OWNER}/${REPO}/${workflowFile}`;
        } else if (type === 'coverage') {
            return `https://img.shields.io/coveralls/github/${OWNER}/${REPO}/main.svg`;
        }
        throw new Error(`Unknown badge type: ${type}`);
    }

    function buildGitHubUrl(type, workflowFile = null) {
        const { OWNER, REPO } = getCurrentRepoConfig();
        if (type === 'workflow') {
            return `https://github.com/${OWNER}/${REPO}/actions/workflows/${workflowFile}`;
        } else if (type === 'coverage') {
            return `https://coveralls.io/github/${OWNER}/${REPO}?branch=main`;
        }
        throw new Error(`Unknown URL type: ${type}`);
    }

    function makeElementClickable(element, url) {
        if (element && url) {
            element.style.cursor = 'pointer';
            element.onclick = () => window.open(url, '_blank');
        }
    }

    function safeQuerySelector(selector) {
        const element = document.querySelector(selector);
        if (!element) {
            console.log(`❌ Element not found: ${selector}`);
        }
        return element;
    }

    // ============================================================================
    // API FUNCTIONS
    // ============================================================================
    
    async function fetchWorkflowStatus(skipTimeUpdate = false) {
        const workflowFile = CONFIG.WORKFLOWS.FRONTEND;
        
        try {
            const badgeUrl = buildBadgeUrl('workflow', workflowFile);
            
            const status = await GitHubUtils.parseBadgeSVG(badgeUrl);
            
            const workflowData = {
                status: status,
                updatedAt: new Date(),
                htmlUrl: buildGitHubUrl('workflow', workflowFile),
                runNumber: '?'
            };
            
            updateWorkflowStatusUI(workflowData, skipTimeUpdate);
        } catch (error) {
            console.error('Error fetching workflow status:', error);
            
            const fallbackData = {
                status: 'unknown',
                updatedAt: new Date(),
                htmlUrl: buildGitHubUrl('workflow', workflowFile),
                runNumber: '?'
            };
            
            updateWorkflowStatusUI(fallbackData, skipTimeUpdate);
        }
    }

    async function fetchCIStatus() {
        const workflowFile = CONFIG.WORKFLOWS.TEST;
        
        try {
            // Add stronger cache busting for CI status checks
            const timestamp = Date.now();
            const badgeUrl = `${buildBadgeUrl('workflow', workflowFile)}?t=${timestamp}&cacheSeconds=0`;
            
            const status = await GitHubUtils.parseBadgeSVG(badgeUrl);
            
            const ciData = {
                status: status,
                updatedAt: new Date(),
                htmlUrl: buildGitHubUrl('workflow', workflowFile)
            };
            
            updateCIStatusUI(ciData);
        } catch (error) {
            console.error('Error fetching CI status:', error);
            
            const fallbackData = {
                status: 'unknown',
                updatedAt: new Date(),
                htmlUrl: buildGitHubUrl('workflow', workflowFile)
            };
            
            updateCIStatusUI(fallbackData);
        }
    }

    async function fetchCoverageStatus() {
        try {
            const badgeUrl = `${buildBadgeUrl('coverage')}?t=${Date.now()}`;
            
            const svgText = await fetch(badgeUrl).then(r => r.text());
            const coverage = parseCoverageFromSVG(svgText);
            
            const coverageData = {
                coverage: coverage,
                updatedAt: new Date(),
                htmlUrl: buildGitHubUrl('coverage')
            };
            
            updateCoverageStatusUI(coverageData);
        } catch (error) {
            console.error('Error fetching coverage status:', error);
            
            const fallbackData = {
                coverage: 'unknown',
                updatedAt: new Date(),
                htmlUrl: buildGitHubUrl('coverage')
            };
            
            updateCoverageStatusUI(fallbackData);
        }
    }

    // ============================================================================
    // UI UPDATE FUNCTIONS
    // ============================================================================
    
    function updateWorkflowStatusUI(workflowData, skipTimeUpdate = false) {
        const statusElement = safeQuerySelector(CONFIG.SELECTORS.FRONTEND_STATUS);
        const timeElement = safeQuerySelector(CONFIG.SELECTORS.FRONTEND_TIME);
        
        if (!statusElement || !timeElement) return;
        
        const config = STATUS_CONFIGS.WORKFLOW[workflowData.status] || STATUS_CONFIGS.WORKFLOW.unknown;
        
        statusElement.innerHTML = createStatusHTML(config, workflowData.status);
        
        // Only update timestamp if not skipping
        if (!skipTimeUpdate) {
            timeElement.innerHTML = createTimestampHTML(workflowData.updatedAt);
        }
        
        makeElementClickable(statusElement, workflowData.htmlUrl);
    }

    function updateCIStatusUI(ciData) {
        const statusElement = safeQuerySelector(CONFIG.SELECTORS.CI_STATUS);
        
        if (!statusElement) return;
        
        const config = STATUS_CONFIGS.CI[ciData.status] || STATUS_CONFIGS.CI.unknown;
        
        statusElement.innerHTML = createStatusHTML(config, ciData.status);
        makeElementClickable(statusElement, ciData.htmlUrl);
    }

    function updateCoverageStatusUI(coverageData) {
        const statusElement = safeQuerySelector(CONFIG.SELECTORS.COVERAGE_STATUS);
        
        if (!statusElement) return;
        
        if (coverageData.coverage === 'unknown') {
            // Use consistent styling with CI unknown status, including question icon
            statusElement.innerHTML = `
                <div class="flex items-center space-x-1">
                    <i class="fas fa-question-circle text-gray-500 text-sm"></i>
                    <span class="text-sm text-gray-600 font-medium">Unknown</span>
                </div>
            `;
        } else {
            const coverage = parseFloat(coverageData.coverage);
            const text = `${coverage}%`;
            let bgColor;
            
            if (coverage >= 80) {
                bgColor = 'text-green-600';
            } else if (coverage >= 60) {
                bgColor = 'text-yellow-600';
            } else {
                bgColor = 'text-red-600';
            }
            
            statusElement.innerHTML = `<span class="text-sm ${bgColor} font-medium">${text}</span>`;
        }
        
        makeElementClickable(statusElement, coverageData.htmlUrl);
    }

    // ============================================================================
    // SVG PARSING FUNCTIONS
    // ============================================================================
    
    function parseCoverageFromSVG(svgText) {
        // Method 1: Check for error/unknown states FIRST before looking for numbers
        const lowerText = svgText.toLowerCase();
        if (lowerText.includes('unknown') || 
            lowerText.includes('pending') || 
            lowerText.includes('inaccessible') ||
            lowerText.includes('invalid') ||
            lowerText.includes('error') ||
            lowerText.includes('not found') ||
            lowerText.includes('unavailable')) {
            return 'unknown';
        }
        
        // Method 2: Look for percentage patterns in SVG text content
        const percentMatch = svgText.match(/(\d+(?:\.\d+)?)%/);
        if (percentMatch) {
            const percent = parseFloat(percentMatch[1]);
            return percent;
        }
        
        // Method 3: Look for text elements with percentage (shields.io format)
        const textMatch = svgText.match(/>([^<]*\d+(?:\.\d+)?%[^<]*)</);
        if (textMatch) {
            const textContent = textMatch[1];
            const percentInText = textContent.match(/(\d+(?:\.\d+)?)%/);
            if (percentInText) {
                const percent = parseFloat(percentInText[1]);
                return percent;
            }
        }
        
        // Method 4: Look for shields.io text elements that contain coverage data
        // Extract all text elements and check if they contain coverage-related numbers
        const textElements = svgText.match(/<text[^>]*>([^<]+)<\/text>/g);
        if (textElements) {
            let foundCoverageKeyword = false;
            let potentialNumbers = [];
            
            // First pass: identify if this is a coverage badge and collect potential numbers
            for (const textElement of textElements) {
                const textContent = textElement.match(/<text[^>]*>([^<]+)<\/text>/);
                if (textContent && textContent[1]) {
                    const content = textContent[1].trim();
                    
                    // Check if this text element indicates coverage
                    if (content.toLowerCase().includes('coverage') || content.toLowerCase().includes('cov')) {
                        foundCoverageKeyword = true;
                    }
                    
                    // Collect potential coverage numbers (must be just a number)
                    if (/^\d+(\.\d+)?$/.test(content)) {
                        const number = parseFloat(content);
                        if (number >= 0 && number <= 100) {
                            potentialNumbers.push(number);
                        }
                    }
                }
            }
            
            // Only return a number if we found both a coverage keyword AND a reasonable number
            if (foundCoverageKeyword && potentialNumbers.length > 0) {
                return potentialNumbers[0]; // Return the first valid number we found
            }
        }
        
        return 'unknown';
    }

    // ============================================================================
    // UTILITY AND MAINTENANCE FUNCTIONS
    // ============================================================================
    
    function updateTimestamp() {
        const elements = document.querySelectorAll(CONFIG.SELECTORS.TIMESTAMP_ELEMENTS);
        elements.forEach(element => {
            if (element.dataset.lastUpdated) {
                const lastUpdated = new Date(element.dataset.lastUpdated);
                const timeAgo = GitHubUtils.getTimeAgo(lastUpdated);
                const span = element.querySelector('span');
                if (span) span.textContent = `Updated ${timeAgo}`;
            }
        });
    }

    function refreshAllStatuses() {
        fetchWorkflowStatus();
        setTimeout(() => fetchCIStatus(), CONFIG.INTERVALS.REFRESH_DELAYS.CI_STATUS);
        setTimeout(() => fetchCoverageStatus(), CONFIG.INTERVALS.REFRESH_DELAYS.COVERAGE);
    }

    // ============================================================================
    // REPOSITORY CHANGE HANDLING
    // ============================================================================
    
    function refreshStatusCardsForRepository() {
        console.log('🔄 Refreshing status cards for repository:', getCurrentRepoConfig());
        
        // Clear any existing status to show loading state
        const statusElements = [
            document.querySelector(CONFIG.SELECTORS.FRONTEND_STATUS),
            document.querySelector(CONFIG.SELECTORS.CI_STATUS),
            document.querySelector(CONFIG.SELECTORS.COVERAGE_STATUS)
        ];
        
        statusElements.forEach(element => {
            if (element) {
                element.innerHTML = '<div class="flex items-center space-x-1"><i class="fas fa-spinner fa-spin text-gray-400 text-sm"></i><span class="text-sm text-gray-500 font-medium">Loading...</span></div>';
            }
        });
        
        // Refresh all statuses with the new repository
        refreshAllStatuses();
        
        // Also update the badge image if it exists
        const badgeImg = document.querySelector(CONFIG.SELECTORS.BADGE_IMG);
        if (badgeImg) {
            const baseUrl = buildBadgeUrl('workflow', CONFIG.WORKFLOWS.FRONTEND);
            badgeImg.src = baseUrl + '?t=' + Date.now();
        }
    }

    // ============================================================================
    // BADGE DEBUGGING FUNCTIONALITY
    // ============================================================================
    
    function setupBadgeDebugging() {
        const badgeImg = document.querySelector(CONFIG.SELECTORS.BADGE_IMG);
        const refreshBtn = document.querySelector(CONFIG.SELECTORS.REFRESH_BTN);
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                if (badgeImg) {
                    // Refresh the badge with a cache buster
                    const baseUrl = buildBadgeUrl('workflow', CONFIG.WORKFLOWS.FRONTEND);
                    badgeImg.src = baseUrl + '?t=' + Date.now();
                }
                
                // Also refresh our status detection and timestamp
                refreshAllStatuses();
                
                console.log('Badge refreshed manually');
            });
        }
        
        if (badgeImg) {
            badgeImg.addEventListener('load', function() {
                console.log('Badge loaded successfully');
            });
            
            badgeImg.addEventListener('error', function() {
                console.error('Badge failed to load');
            });
        }
    }

    // ============================================================================
    // INITIALIZATION AND LIFECYCLE
    // ============================================================================
    
    function initialStatusLoad() {
        fetchWorkflowStatus(true);
        
        // Set up badge debugging
        setupBadgeDebugging();
        
        // Load other statuses with delays to avoid hitting rate limits
        setTimeout(() => fetchCIStatus(), CONFIG.INTERVALS.INITIAL_DELAYS.CI_STATUS);
        setTimeout(() => fetchCoverageStatus(), CONFIG.INTERVALS.INITIAL_DELAYS.COVERAGE);
        
        // Then do a full refresh after all initial loads
        setTimeout(() => {
            fetchWorkflowStatus(); // This time with timestamp
        }, CONFIG.INTERVALS.INITIAL_DELAYS.FINAL_REFRESH);
    }

    function initializeStatusCards() {
        // Start the initial load
        initialStatusLoad();

        // Set up periodic updates
        setInterval(refreshAllStatuses, CONFIG.INTERVALS.REFRESH_ALL);
        setInterval(updateTimestamp, CONFIG.INTERVALS.UPDATE_TIMESTAMP);

        
    }

    // ============================================================================
    // API EXPORTS FOR TESTING
    // ============================================================================
    
    const statusAPI = {
        // Core API functions
        fetchWorkflowStatus,
        fetchCIStatus,
        fetchCoverageStatus,
        
        // UI update functions
        updateWorkflowStatusUI,
        updateCIStatusUI,
        updateCoverageStatusUI,
        
        // Utility functions
        refreshAllStatuses,
        refreshStatusCardsForRepository,
        parseCoverageFromSVG,
        updateTimestamp,
        setupBadgeDebugging,
        
        // New utility functions for better testability
        validateDependencies,
        createStatusHTML,
        createTimestampHTML,
        buildBadgeUrl,
        buildGitHubUrl,
        makeElementClickable,
        safeQuerySelector,
        getCurrentRepoConfig,
        
        // Configuration access for testing
        CONFIG,
        STATUS_CONFIGS
    };

    // Export for testing environments
    if (typeof globalThis !== 'undefined' && globalThis !== null) {
        globalThis.statusCardsTestExports = statusAPI;
    }

    if (typeof module !== 'undefined' && module !== null && module.exports) {
        module.exports = statusAPI;
    }
    
    // Export key functions to global scope for use by other modules
    window.StatusCards = {
        refreshAllStatuses: refreshAllStatuses,
        refreshStatusCardsForRepository: refreshStatusCardsForRepository,
        updateTimestamp: updateTimestamp
    };

    // Initialize the application
    initializeStatusCards();
}); 