// Status Cards JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check essential dependencies
    if (typeof GitHubUtils === 'undefined') {
        console.error('❌ GitHubUtils not found. Make sure src/utils.js is loaded.');
        return;
    }
    
    console.log('📊 Status Cards initializing...');
    
    // GitHub workflow status fetcher using SVG text parsing
    async function fetchWorkflowStatus(skipTimeUpdate = false) {
        const owner = 'super3';
        const repo = 'dashban';
        const workflowFile = 'frontend.yml';
        
        try {
            // Use shields.io badge for better reliability
            const badgeUrl = `https://img.shields.io/github/actions/workflow/status/${owner}/${repo}/${workflowFile}`;
            const status = await GitHubUtils.parseBadgeSVG(badgeUrl)
            
            updateWorkflowStatusUI({
                status: status,
                updatedAt: new Date(),
                htmlUrl: `https://github.com/${owner}/${repo}/actions/workflows/${workflowFile}`,
                runNumber: '?'
            }, skipTimeUpdate);
        } catch (error) {
            console.error('Error fetching workflow status:', error);
            updateWorkflowStatusUI({
                status: 'unknown',
                updatedAt: new Date(),
                htmlUrl: `https://github.com/${owner}/${repo}/actions/workflows/${workflowFile}`,
                runNumber: '?'
            }, skipTimeUpdate);
        }
    }

    function updateWorkflowStatusUI(workflowData, skipTimeUpdate = false) {
        const statusElement = document.querySelector('[data-frontend-status]');
        const timeElement = document.querySelector('[data-frontend-time]');
        
        if (!statusElement || !timeElement) return;
        
        const statusConfig = {
            success: { icon: 'fas fa-check-circle', color: 'text-green-500', text: 'Deployed', bgColor: 'text-green-600' },
            failure: { icon: 'fas fa-times-circle', color: 'text-red-500', text: 'Failed', bgColor: 'text-red-600' },
            in_progress: { icon: 'fas fa-spinner fa-spin', color: 'text-blue-500', text: 'Deploying', bgColor: 'text-blue-600' },
            queued: { icon: 'fas fa-clock', color: 'text-yellow-500', text: 'Queued', bgColor: 'text-yellow-600' },
            unknown: { icon: 'fas fa-question-circle', color: 'text-gray-500', text: 'Unknown', bgColor: 'text-gray-600' }
        };
        
        const config = statusConfig[workflowData.status] || statusConfig.unknown;
        
        statusElement.innerHTML = `
            <div class="flex items-center space-x-1">
                <i class="${config.icon} ${config.color} text-sm"></i>
                <span class="text-sm ${config.bgColor} font-medium">${config.text}</span>
            </div>
        `;
        
        // Only update timestamp if not skipping
        if (!skipTimeUpdate) {
            const timeAgo = GitHubUtils.getTimeAgo(workflowData.updatedAt);
            timeElement.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-sync text-gray-400 text-xs"></i>
                    <span class="text-xs text-gray-500">Updated ${timeAgo}</span>
                </div>
            `;
        }
        
        // Make the status clickable to view on GitHub
        statusElement.style.cursor = 'pointer';
        statusElement.onclick = () => window.open(workflowData.htmlUrl, '_blank');
    }

    // Badge debugging functionality
    function setupBadgeDebugging() {
        const badgeImg = document.getElementById('github-badge');
        const refreshBtn = document.getElementById('refresh-badge');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                // Refresh the badge with a cache buster
                const baseUrl = 'https://img.shields.io/github/actions/workflow/status/super3/dashban/frontend.yml';
                badgeImg.src = baseUrl + '?t=' + Date.now();
                
                // Also refresh our status detection and timestamp
                refreshAllStatuses();
                
                console.log('Badge refreshed manually');
            });
        }
        
        if (badgeImg) {
            badgeImg.addEventListener('load', function() {
                console.log('Badge loaded successfully');
                console.log('Badge dimensions:', this.naturalWidth, 'x', this.naturalHeight);
                console.log('Badge src:', this.src);
            });
            
            badgeImg.addEventListener('error', function() {
                console.error('Badge failed to load');
            });
        }
    }

    // GitHub CI Tests status fetcher
    async function fetchCIStatus() {
        const owner = 'super3';
        const repo = 'dashban';
        const workflowFile = 'test.yml';
        
        try {
            const badgeUrl = `https://img.shields.io/github/actions/workflow/status/${owner}/${repo}/${workflowFile}`;
            const status = await GitHubUtils.parseBadgeSVG(badgeUrl);
            
            updateCIStatusUI({
                status: status,
                updatedAt: new Date(),
                htmlUrl: `https://github.com/${owner}/${repo}/actions/workflows/${workflowFile}`
            });
        } catch (error) {
            console.error('Error fetching CI status:', error);
            updateCIStatusUI({
                status: 'unknown',
                updatedAt: new Date(),
                htmlUrl: '#'
            });
        }
    }

    // Coverage status fetcher
    async function fetchCoverageStatus() {
        const owner = 'super3';
        const repo = 'dashban';
        
        try {
            // Use shields.io as a proxy to avoid CORS issues
            const badgeUrl = `https://img.shields.io/coveralls/github/${owner}/${repo}/main.svg`;
            const svgText = await fetch(badgeUrl + `?t=${Date.now()}`).then(r => r.text());
            
            // Parse coverage percentage from shields.io SVG
            const coverage = parseCoverageFromSVG(svgText);
            
            updateCoverageStatusUI({
                coverage: coverage,
                updatedAt: new Date(),
                htmlUrl: `https://coveralls.io/github/${owner}/${repo}?branch=main`
            });
        } catch (error) {
            console.error('Error fetching coverage status:', error);
            updateCoverageStatusUI({
                coverage: 'unknown',
                updatedAt: new Date(),
                htmlUrl: `https://coveralls.io/github/${owner}/${repo}?branch=main`
            });
        }
    }

    function parseCoverageFromSVG(svgText) {
        console.log('📊 Parsing coverage SVG...');
        
        // Method 1: Look for percentage patterns in SVG text content
        const percentMatch = svgText.match(/(\d+(?:\.\d+)?)%/);
        if (percentMatch) {
            const percent = parseFloat(percentMatch[1]);
            console.log(`📊 Found coverage percentage: ${percent}%`);
            return percent;
        }
        
        // Method 2: Look for text elements with percentage (shields.io format)
        const textMatch = svgText.match(/>([^<]*\d+(?:\.\d+)?%[^<]*)</);
        if (textMatch) {
            const textContent = textMatch[1];
            const percentInText = textContent.match(/(\d+(?:\.\d+)?)%/);
            if (percentInText) {
                const percent = parseFloat(percentInText[1]);
                console.log(`📊 Found coverage in text: ${percent}%`);
                return percent;
            }
        }
        
        // Method 3: Look for common status words
        const lowerText = svgText.toLowerCase();
        if (lowerText.includes('unknown') || lowerText.includes('pending') || lowerText.includes('inaccessible')) {
            console.log('📊 Coverage status: unknown/pending/inaccessible');
            return 'unknown';
        }
        
        // Method 4: Fallback - look for any number
        const numberMatch = svgText.match(/(\d+(?:\.\d+)?)/);
        if (numberMatch) {
            const number = parseFloat(numberMatch[1]);
            // Assume it's a percentage if it's reasonable
            if (number >= 0 && number <= 100) {
                console.log(`📊 Found potential coverage number: ${number}%`);
                return number;
            }
        }
        
        console.log('📊 Could not parse coverage from SVG');
        return 'unknown';
    }

    function updateCIStatusUI(ciData) {
        const statusElement = document.querySelector('[data-ci-status]');
        const timeElement = document.querySelector('[data-ci-time]');
        
        if (!statusElement || !timeElement) return;
        
        const statusConfig = {
            success: { icon: 'fas fa-check-circle', color: 'text-green-500', text: 'Passing', bgColor: 'text-green-600' },
            failure: { icon: 'fas fa-times-circle', color: 'text-red-500', text: 'Failing', bgColor: 'text-red-600' },
            in_progress: { icon: 'fas fa-spinner fa-spin', color: 'text-blue-500', text: 'Running', bgColor: 'text-blue-600' },
            queued: { icon: 'fas fa-clock', color: 'text-yellow-500', text: 'Queued', bgColor: 'text-yellow-600' },
            unknown: { icon: 'fas fa-question-circle', color: 'text-gray-500', text: 'Unknown', bgColor: 'text-gray-600' }
        };
        
        const config = statusConfig[ciData.status] || statusConfig.unknown;
        
        statusElement.innerHTML = `
            <div class="flex items-center space-x-1">
                <i class="${config.icon} ${config.color} text-sm"></i>
                <span class="text-sm ${config.bgColor} font-medium">${config.text}</span>
            </div>
        `;
        
        const timeAgo = GitHubUtils.getTimeAgo(ciData.updatedAt);
        timeElement.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-sync text-gray-400 text-xs"></i>
                <span class="text-xs text-gray-500">Updated ${timeAgo}</span>
            </div>
        `;
        
        // Make the status clickable to view on GitHub
        statusElement.style.cursor = 'pointer';
        statusElement.onclick = () => window.open(ciData.htmlUrl, '_blank');
    }

    function updateCoverageStatusUI(coverageData) {
        const statusElement = document.querySelector('[data-coverage-status]');
        const timeElement = document.querySelector('[data-coverage-time]');
        
        if (!statusElement || !timeElement) return;
        
        let color, bgColor, text;
        
        if (coverageData.coverage === 'unknown') {
            color = 'text-gray-500';
            bgColor = 'text-gray-600';
            text = 'Unknown';
        } else {
            const coverage = parseFloat(coverageData.coverage);
            text = `${coverage}%`;
            
            if (coverage >= 80) {
                color = 'text-green-500';
                bgColor = 'text-green-600';
            } else if (coverage >= 60) {
                color = 'text-yellow-500';
                bgColor = 'text-yellow-600';
            } else {
                color = 'text-red-500';
                bgColor = 'text-red-600';
            }
        }
        
        statusElement.innerHTML = `
            <div class="flex items-center space-x-1">
                <i class="fas fa-chart-line ${color} text-sm"></i>
                <span class="text-sm ${bgColor} font-medium">${text}</span>
            </div>
        `;
        
        const timeAgo = GitHubUtils.getTimeAgo(coverageData.updatedAt);
        timeElement.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fas fa-sync text-gray-400 text-xs"></i>
                <span class="text-xs text-gray-500">Updated ${timeAgo}</span>
            </div>
        `;
        
        // Make the status clickable to view on Coveralls
        statusElement.style.cursor = 'pointer';
        statusElement.onclick = () => window.open(coverageData.htmlUrl, '_blank');
    }

    // Traffic data fetcher (placeholder - requires backend implementation)
    async function fetchTrafficData() {
        // This would require a backend API to fetch GitHub traffic data
        // For now, return mock data
        return {
            views: Math.floor(Math.random() * 1000) + 100,
            uniqueVisitors: Math.floor(Math.random() * 500) + 50,
            updatedAt: new Date()
        };
    }

    function updateTrafficUI(data) {
        const viewsElement = document.querySelector('[data-traffic-views]');
        const visitorsElement = document.querySelector('[data-traffic-visitors]');
        const timeElement = document.querySelector('[data-traffic-time]');
        
        if (viewsElement) viewsElement.textContent = data.views.toLocaleString();
        if (visitorsElement) visitorsElement.textContent = data.uniqueVisitors.toLocaleString();
        
        if (timeElement) {
            const timeAgo = GitHubUtils.getTimeAgo(data.updatedAt);
            timeElement.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-sync text-gray-400 text-xs"></i>
                    <span class="text-xs text-gray-500">Updated ${timeAgo}</span>
                </div>
            `;
        }
    }

    // Update timestamps every minute
    function updateTimestamp() {
        const elements = document.querySelectorAll('[data-frontend-time], [data-ci-time], [data-coverage-time], [data-traffic-time]');
        elements.forEach(element => {
            if (element.dataset.lastUpdated) {
                const lastUpdated = new Date(element.dataset.lastUpdated);
                const timeAgo = GitHubUtils.getTimeAgo(lastUpdated);
                const span = element.querySelector('span');
                if (span) span.textContent = `Updated ${timeAgo}`;
            }
        });
    }

    // Refresh all statuses
    function refreshAllStatuses() {
        fetchWorkflowStatus();
        fetchCIStatus();
        fetchCoverageStatus();
        fetchTrafficData().then(updateTrafficUI);
    }

    // Initial load - start with loading workflow status immediately but skip timestamp
    function initialStatusLoad() {
        fetchWorkflowStatus(true);
        
        // Set up badge debugging
        setupBadgeDebugging();
        
        // Load other statuses with delays to avoid hitting rate limits
        setTimeout(() => fetchCIStatus(), 1000);
        setTimeout(() => fetchCoverageStatus(), 2000);
        setTimeout(() => {
            fetchTrafficData().then(updateTrafficUI);
        }, 3000);
        
        // Then do a full refresh after all initial loads
        setTimeout(() => {
            fetchWorkflowStatus(); // This time with timestamp
        }, 5000);
    }

    // Start the initial load
    initialStatusLoad();

    // Set up periodic updates
    setInterval(refreshAllStatuses, 5 * 60 * 1000); // Every 5 minutes
    setInterval(updateTimestamp, 60 * 1000); // Every minute

    console.log('Status Cards initialized successfully!');

    // Export functions for testing
    const statusAPI = {
        fetchWorkflowStatus,
        fetchCIStatus,
        fetchCoverageStatus,
        fetchTrafficData,
        updateWorkflowStatusUI,
        updateCIStatusUI,
        updateCoverageStatusUI,
        updateTrafficUI,
        refreshAllStatuses,
        parseCoverageFromSVG
    };

    // Attach to global for browser/Node access
    if (typeof globalThis !== 'undefined') {
        globalThis.statusCardsTestExports = statusAPI;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = statusAPI;
    }
}); 