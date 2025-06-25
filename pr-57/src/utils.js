// Utility functions for GitHub Actions status parsing

function parseStatusFromSVG(svgText) {
    // Convert to lowercase for easier matching
    const lowerText = svgText.toLowerCase();
    
    // Look for common status words
    if (lowerText.includes('passing') || lowerText.includes('success')) {
        return 'success';
    }
    
    if (lowerText.includes('failing') || lowerText.includes('failure') || lowerText.includes('failed')) {
        return 'failure';
    }
    
    if (lowerText.includes('pending') || lowerText.includes('running') || lowerText.includes('in progress')) {
        return 'in_progress';
    }
    
    if (lowerText.includes('no status') || lowerText.includes('unknown')) {
        return 'unknown';
    }
    
    return 'unknown';
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return `<1m ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

function parseShieldsStatus(statusValue) {
    if (!statusValue) return 'unknown';
    
    const status = statusValue.toLowerCase();
    
    // Map shields.io status values to our status system
    if (status.includes('passing') || status.includes('success')) {
        return 'success';
    }
    if (status.includes('failing') || status.includes('failure') || status.includes('error')) {
        return 'failure';
    }
    if (status.includes('pending') || status.includes('running') || status.includes('in progress')) {
        return 'in_progress';
    }
    if (status.includes('no status') || status.includes('unknown')) {
        return 'unknown';
    }
    
    // Default case
    return 'unknown';
}

// Parse SVG badge text to determine status
async function parseBadgeSVG(badgeUrl) {
    try {
        const response = await fetch(badgeUrl + `?t=${Date.now()}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const svgText = await response.text();
        
        // Parse the SVG text for status words
        const status = parseStatusFromSVG(svgText);
        return status;
        
    } catch (error) {
        console.error('Error fetching SVG badge:', error);
        return 'unknown';
    }
}

// Parse a numeric value from an SVG badge
function parseNumberFromSVG(svgText) {
    const match = svgText.match(/(\d+(?:\.\d+)?)/);
    if (!match) return null;
    return parseFloat(match[1]);
}

// Export functions for both Node.js and browser environments
function exportUtilities(moduleObj, windowObj) {
    const utilities = {
        parseStatusFromSVG,
        getTimeAgo,
        parseShieldsStatus,
        parseBadgeSVG,
        parseNumberFromSVG
    };
    
    if (moduleObj && moduleObj.exports) {
        // Node.js environment
        moduleObj.exports = utilities;
        return 'node';
    } else if (windowObj) {
        // Browser environment - attach to window
        windowObj.GitHubUtils = utilities;
        return 'browser';
    }
    return 'unknown';
}

// Environment detection function for testing
function detectEnvironment(moduleGlobal, windowGlobal) {
    // Allow injection for testing, otherwise use actual globals
    const hasModule = moduleGlobal !== undefined ? moduleGlobal !== null : typeof module !== 'undefined';
    const hasWindow = windowGlobal !== undefined ? windowGlobal !== null : typeof window !== 'undefined';
    
    return {
        hasModule,
        hasWindow,
        module: hasModule ? (moduleGlobal !== undefined ? moduleGlobal : module) : null,
        window: hasWindow ? (windowGlobal !== undefined ? windowGlobal : window) : null
    };
}

// Initialize exports based on environment
function initializeExports() {
    const env = detectEnvironment();
    return exportUtilities(env.module, env.window);
}

// Call the initialization
const exportResult = initializeExports();

// Export functions for testing
function addTestExports(moduleObj) {
    if (moduleObj && moduleObj.exports) {
        moduleObj.exports.exportUtilities = exportUtilities;
        moduleObj.exports.detectEnvironment = detectEnvironment;
        moduleObj.exports.initializeExports = initializeExports;
        moduleObj.exports.addTestExports = addTestExports; // Export for testing
        return true;
    }
    return false;
}

// Add test exports if in Node.js environment
const env = detectEnvironment();
const testExportsResult = addTestExports(env.module); 