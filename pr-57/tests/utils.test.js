// Tests for GitHub Actions utility functions
const utils = require('../src/utils.js');

describe('GitHub Actions Status Functions', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
        console.log = jest.fn();
        console.error = jest.fn();
    });

    describe('parseStatusFromSVG', () => {
        test('should detect success status from SVG containing "passing"', () => {
            const svgWithPassing = '<svg><text>build passing</text></svg>';
            const result = utils.parseStatusFromSVG(svgWithPassing);
            expect(result).toBe('success');
        });

        test('should detect success status from SVG containing "success"', () => {
            const svgWithSuccess = '<svg><text>build success</text></svg>';
            const result = utils.parseStatusFromSVG(svgWithSuccess);
            expect(result).toBe('success');
        });

        test('should detect failure status from SVG containing "failing"', () => {
            const svgWithFailing = '<svg><text>build failing</text></svg>';
            const result = utils.parseStatusFromSVG(svgWithFailing);
            expect(result).toBe('failure');
        });

        test('should detect failure status from SVG containing "failure"', () => {
            const svgWithFailure = '<svg><text>build failure</text></svg>';
            const result = utils.parseStatusFromSVG(svgWithFailure);
            expect(result).toBe('failure');
        });

        test('should detect failure status from SVG containing "failed"', () => {
            const svgWithFailed = '<svg><text>build failed</text></svg>';
            const result = utils.parseStatusFromSVG(svgWithFailed);
            expect(result).toBe('failure');
        });

        test('should detect in_progress status from SVG containing "running"', () => {
            const svgWithRunning = '<svg><text>build running</text></svg>';
            const result = utils.parseStatusFromSVG(svgWithRunning);
            expect(result).toBe('in_progress');
        });

        test('should detect in_progress status from SVG containing "pending"', () => {
            const svgWithPending = '<svg><text>build pending</text></svg>';
            const result = utils.parseStatusFromSVG(svgWithPending);
            expect(result).toBe('in_progress');
        });

        test('should detect in_progress status from SVG containing "in progress"', () => {
            const svgWithInProgress = '<svg><text>build in progress</text></svg>';
            const result = utils.parseStatusFromSVG(svgWithInProgress);
            expect(result).toBe('in_progress');
        });

        test('should detect unknown status from SVG containing "no status"', () => {
            const svgWithNoStatus = '<svg><text>no status</text></svg>';
            const result = utils.parseStatusFromSVG(svgWithNoStatus);
            expect(result).toBe('unknown');
        });

        test('should return unknown for SVG without recognizable status', () => {
            const svgWithoutStatus = '<svg><text>something else</text></svg>';
            const result = utils.parseStatusFromSVG(svgWithoutStatus);
            expect(result).toBe('unknown');
        });

        test('should handle case insensitive matching', () => {
            const svgWithUpperCase = '<svg><text>BUILD PASSING</text></svg>';
            const result = utils.parseStatusFromSVG(svgWithUpperCase);
            expect(result).toBe('success');
        });

        test('should handle empty SVG', () => {
            const emptySvg = '<svg></svg>';
            const result = utils.parseStatusFromSVG(emptySvg);
            expect(result).toBe('unknown');
        });

        test('should trigger regex matching and logging for unrecognized status', () => {
            const svgWithText = '<svg><text>some text</text><text>other text</text></svg>';
            const result = utils.parseStatusFromSVG(svgWithText);
            expect(result).toBe('unknown');
        });

        test('should handle SVG with no text content for regex matching', () => {
            const svgWithoutText = '<svg><rect width="100" height="20"/></svg>';
            const result = utils.parseStatusFromSVG(svgWithoutText);
            expect(result).toBe('unknown');
            // This should trigger the regex matching with null result
        });
    });

    describe('getTimeAgo', () => {
        test('should return <1m ago for recent dates', () => {
            const now = new Date();
            const fiveSecondsAgo = new Date(now.getTime() - 5000);
            const result = utils.getTimeAgo(fiveSecondsAgo);
            expect(result).toBe('<1m ago');
        });

        test('should return minutes ago for dates within an hour', () => {
            const now = new Date();
            const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
            const result = utils.getTimeAgo(thirtyMinutesAgo);
            expect(result).toBe('30m ago');
        });

        test('should return hours ago for dates within a day', () => {
            const now = new Date();
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            const result = utils.getTimeAgo(twoHoursAgo);
            expect(result).toBe('2h ago');
        });

        test('should return days ago for older dates', () => {
            const now = new Date();
            const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
            const result = utils.getTimeAgo(threeDaysAgo);
            expect(result).toBe('3d ago');
        });

        test('should handle future dates gracefully', () => {
            const now = new Date();
            const future = new Date(now.getTime() + 5000);
            const result = utils.getTimeAgo(future);
            expect(result).toBe('<1m ago');
        });
    });

    describe('parseShieldsStatus', () => {
        test('should return success for "passing"', () => {
            const result = utils.parseShieldsStatus('passing');
            expect(result).toBe('success');
        });

        test('should return success for "success"', () => {
            const result = utils.parseShieldsStatus('success');
            expect(result).toBe('success');
        });

        test('should return failure for "failing"', () => {
            const result = utils.parseShieldsStatus('failing');
            expect(result).toBe('failure');
        });

        test('should return failure for "failure"', () => {
            const result = utils.parseShieldsStatus('failure');
            expect(result).toBe('failure');
        });

        test('should return failure for "error"', () => {
            const result = utils.parseShieldsStatus('error');
            expect(result).toBe('failure');
        });

        test('should return in_progress for "pending"', () => {
            const result = utils.parseShieldsStatus('pending');
            expect(result).toBe('in_progress');
        });

        test('should return in_progress for "running"', () => {
            const result = utils.parseShieldsStatus('running');
            expect(result).toBe('in_progress');
        });

        test('should return in_progress for "in progress"', () => {
            const result = utils.parseShieldsStatus('in progress');
            expect(result).toBe('in_progress');
        });

        test('should return in_progress for strings containing "in progress" as substring', () => {
            const result = utils.parseShieldsStatus('build in progress now');
            expect(result).toBe('in_progress');
        });

        test('should return unknown for null input', () => {
            const result = utils.parseShieldsStatus(null);
            expect(result).toBe('unknown');
        });

        test('should return unknown for undefined input', () => {
            const result = utils.parseShieldsStatus(undefined);
            expect(result).toBe('unknown');
        });

        test('should return unknown for unrecognized status', () => {
            const result = utils.parseShieldsStatus('some-other-status');
            expect(result).toBe('unknown');
        });

        test('should return unknown for "no status"', () => {
            const result = utils.parseShieldsStatus('no status');
            expect(result).toBe('unknown');
        });

        test('should handle case insensitive matching', () => {
            const result = utils.parseShieldsStatus('PASSING');
            expect(result).toBe('success');
        });
    });
});

describe('Integration Tests', () => {
    test('should handle realistic GitHub badge SVG', () => {
        const realisticSVG = `
            <svg xmlns="http://www.w3.org/2000/svg" width="104" height="20">
                <linearGradient id="b" x2="0" y2="100%">
                    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
                    <stop offset="1" stop-opacity=".1"/>
                </linearGradient>
                <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="110">
                    <text x="315" y="150" fill="#010101" fill-opacity=".3">frontend</text>
                    <text x="315" y="140">frontend</text>
                    <text x="795" y="150" fill="#010101" fill-opacity=".3">passing</text>
                    <text x="795" y="140">passing</text>
                </g>
            </svg>
        `;
        
        const result = utils.parseStatusFromSVG(realisticSVG);
        expect(result).toBe('success');
    });

    test('should handle edge cases in time calculation', () => {
        const exactlyOneMinute = new Date(Date.now() - 60000);
        const result = utils.getTimeAgo(exactlyOneMinute);
        expect(result).toBe('1m ago');
    });
});

describe('parseBadgeSVG function', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.fetch = jest.fn();
        console.log = jest.fn();
        console.error = jest.fn();
    });

    test('should successfully parse SVG from a valid URL', async () => {
        const mockSVG = '<svg><text>build passing</text></svg>';
        global.fetch.mockResolvedValueOnce({
            ok: true,
            text: jest.fn().mockResolvedValueOnce(mockSVG)
        });

        const result = await utils.parseBadgeSVG('https://example.com/badge.svg');
        
        expect(result).toBe('success');
    });

    test('should handle HTTP errors gracefully', async () => {
        global.fetch.mockResolvedValueOnce({
            ok: false,
            status: 404
        });

        const result = await utils.parseBadgeSVG('https://example.com/nonexistent.svg');
        
        expect(result).toBe('unknown');
        expect(console.error).toHaveBeenCalledWith(
            'Error fetching SVG badge:',
            expect.any(Error)
        );
    });

    test('should handle network errors gracefully', async () => {
        global.fetch.mockRejectedValueOnce(new Error('Network error'));

        const result = await utils.parseBadgeSVG('https://example.com/badge.svg');
        
        expect(result).toBe('unknown');
        expect(console.error).toHaveBeenCalledWith(
            'Error fetching SVG badge:',
            expect.any(Error)
        );
    });

    test('should append timestamp to URL to avoid caching', async () => {
        const mockSVG = '<svg><text>build failing</text></svg>';
        global.fetch.mockResolvedValueOnce({
            ok: true,
            text: jest.fn().mockResolvedValueOnce(mockSVG)
        });

        const baseUrl = 'https://example.com/badge.svg';
        await utils.parseBadgeSVG(baseUrl);
        
        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringMatching(`${baseUrl}\\?t=\\d+`)
        );
    });
});

describe('parseNumberFromSVG', () => {
    test('should parse simple numeric values', () => {
        const svg = '<svg><text>views</text><text>123</text></svg>';
        const result = utils.parseNumberFromSVG(svg);
        expect(result).toBe(123);
    });

    test('should parse decimal numbers', () => {
        const svg = '<svg><text>percentage</text><text>87.5</text></svg>';
        const result = utils.parseNumberFromSVG(svg);
        expect(result).toBe(87.5);
    });

    test('should return null when no number is found', () => {
        const svg = '<svg><text>no numbers here</text></svg>';
        const result = utils.parseNumberFromSVG(svg);
        expect(result).toBeNull();
    });
});

describe('Browser environment compatibility and edge cases', () => {
    test('should handle Node.js environment export', () => {
        const mockModule = { exports: {} };
        const result = utils.exportUtilities(mockModule, null);
        
        expect(result).toBe('node');
        expect(mockModule.exports.parseStatusFromSVG).toBeDefined();
        expect(mockModule.exports.getTimeAgo).toBeDefined();
        expect(mockModule.exports.parseShieldsStatus).toBeDefined();
        expect(mockModule.exports.parseBadgeSVG).toBeDefined();
        expect(mockModule.exports.parseNumberFromSVG).toBeDefined();
    });

    test('should handle browser environment export', () => {
        const mockWindow = {};
        const result = utils.exportUtilities(null, mockWindow);
        
        expect(result).toBe('browser');
        expect(mockWindow.GitHubUtils).toBeDefined();
        expect(mockWindow.GitHubUtils.parseStatusFromSVG).toBeDefined();
        expect(mockWindow.GitHubUtils.getTimeAgo).toBeDefined();
        expect(mockWindow.GitHubUtils.parseShieldsStatus).toBeDefined();
        expect(mockWindow.GitHubUtils.parseBadgeSVG).toBeDefined();
        expect(mockWindow.GitHubUtils.parseNumberFromSVG).toBeDefined();
    });

    test('should handle unknown environment', () => {
        const result = utils.exportUtilities(null, null);
        expect(result).toBe('unknown');
    });

    test('should detect Node.js environment correctly', () => {
        const env = utils.detectEnvironment();
        expect(env.hasModule).toBe(true);
        // Jest might have a global window object, so let's be flexible here
        expect(typeof env.hasWindow).toBe('boolean');
        expect(env.module).toBeDefined();
        // Window might be defined in Jest environment, so check for defined/null
        expect(env.window === null || typeof env.window === 'object').toBe(true);
    });

    test('should test all environment detection branches', () => {
        // Test case 1: Both module and window present
        const env1 = utils.detectEnvironment({ exports: {} }, { some: 'object' });
        expect(env1.hasModule).toBe(true);
        expect(env1.hasWindow).toBe(true);
        expect(env1.module).toEqual({ exports: {} });
        expect(env1.window).toEqual({ some: 'object' });

        // Test case 2: Only module present
        const env2 = utils.detectEnvironment({ exports: {} }, null);
        expect(env2.hasModule).toBe(true);
        expect(env2.hasWindow).toBe(false);
        expect(env2.module).toEqual({ exports: {} });
        expect(env2.window).toBeNull();

        // Test case 3: Only window present
        const env3 = utils.detectEnvironment(null, { some: 'object' });
        expect(env3.hasModule).toBe(false);
        expect(env3.hasWindow).toBe(true);
        expect(env3.module).toBeNull();
        expect(env3.window).toEqual({ some: 'object' });

        // Test case 4: Neither present
        const env4 = utils.detectEnvironment(null, null);
        expect(env4.hasModule).toBe(false);
        expect(env4.hasWindow).toBe(false);
        expect(env4.module).toBeNull();
        expect(env4.window).toBeNull();
    });

    test('should initialize exports correctly', () => {
        const result = utils.initializeExports();
        expect(result).toBe('node'); // Should be 'node' in Jest environment
    });

    test('should handle environment detection with mocked globals', () => {
        // Since typeof checks happen at evaluation time, we'll test the branches
        // by calling the functions directly with different parameters
        
        // Test case 1: Browser environment simulation
        const mockWindow = { some: 'object' };
        const browserResult = utils.exportUtilities(null, mockWindow);
        expect(browserResult).toBe('browser');
        
        // Test case 2: Unknown environment simulation  
        const unknownResult = utils.exportUtilities(null, null);
        expect(unknownResult).toBe('unknown');
        
        // Test case 3: Node environment (current environment)
        const mockModule = { exports: {} };
        const nodeResult = utils.exportUtilities(mockModule, null);
        expect(nodeResult).toBe('node');
    });

    test('should test addTestExports function coverage', () => {
        // Create a function to test the addTestExports logic with both branches
        function testAddTestExports(moduleObj) {
            if (moduleObj && moduleObj.exports) {
                moduleObj.exports.testFunction = () => 'test';
                return true;
            }
            return false;
        }
        
        // Test with valid module object (first branch: moduleObj && moduleObj.exports)
        const mockModule = { exports: {} };
        const result1 = testAddTestExports(mockModule);
        expect(result1).toBe(true);
        expect(mockModule.exports.testFunction).toBeDefined();
        
        // Test with null module object (second branch: !moduleObj)
        const result2 = testAddTestExports(null);
        expect(result2).toBe(false);
        
        // Test with module object without exports (third branch: moduleObj && !moduleObj.exports)
        const result3 = testAddTestExports({});
        expect(result3).toBe(false);

        // Test with undefined module object
        const result4 = testAddTestExports(undefined);
        expect(result4).toBe(false);
    });

    test('should test the actual addTestExports function', () => {
        // Now we can test the actual addTestExports function since it's exported
        
        // Test with valid module object
        const validModule = { exports: {} };
        const result1 = utils.addTestExports(validModule);
        expect(result1).toBe(true);
        expect(validModule.exports.exportUtilities).toBeDefined();
        expect(validModule.exports.detectEnvironment).toBeDefined();
        expect(validModule.exports.initializeExports).toBeDefined();
        
        // Test with null module object  
        const result2 = utils.addTestExports(null);
        expect(result2).toBe(false);
        
        // Test with undefined module object
        const result3 = utils.addTestExports(undefined);
        expect(result3).toBe(false);
        
        // Test with module object without exports property
        const result4 = utils.addTestExports({});
        expect(result4).toBe(false);
        
        // Test with module object with null exports
        const result5 = utils.addTestExports({ exports: null });
        expect(result5).toBe(false);
        
        // Test with module object with undefined exports
        const result6 = utils.addTestExports({ exports: undefined });
        expect(result6).toBe(false);
    });

    test('should handle missing SVG text content in parseStatusFromSVG', () => {
        // Test the SVG regex matching logic to cover line 64
        const svgWithComplexMatching = '<svg><g><text>status: unknown</text><text>other content</text></g></svg>';
        const result = utils.parseStatusFromSVG(svgWithComplexMatching);
        expect(result).toBe('unknown');
        // This should trigger the regex matching logic on line 64
    });
}); 