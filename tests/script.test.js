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
            expect(console.log).toHaveBeenCalledWith('✅ Found "passing" or "success" in SVG');
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
            expect(console.log).toHaveBeenCalledWith('❌ Found "failing" or "failure" in SVG');
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
            expect(console.log).toHaveBeenCalledWith('🔄 Found "pending" or "running" in SVG');
        });

        test('should detect in_progress status from SVG containing "pending"', () => {
            const svgWithPending = '<svg><text>build pending</text></svg>';
            const result = utils.parseStatusFromSVG(svgWithPending);
            expect(result).toBe('in_progress');
        });

        test('should detect unknown status from SVG containing "no status"', () => {
            const svgWithNoStatus = '<svg><text>no status</text></svg>';
            const result = utils.parseStatusFromSVG(svgWithNoStatus);
            expect(result).toBe('unknown');
            expect(console.log).toHaveBeenCalledWith('❔ Found "no status" or "unknown" in SVG');
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
    });

    describe('getTimeAgo', () => {
        test('should return seconds ago for recent dates', () => {
            const now = new Date();
            const fiveSecondsAgo = new Date(now.getTime() - 5000);
            const result = utils.getTimeAgo(fiveSecondsAgo);
            expect(result).toBe('5s ago');
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
            expect(result).toBe('-5s ago');
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