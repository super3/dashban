// Tests for Status Cards functionality

// Helper to setup DOM with required elements
function setupStatusCardsDOM() {
  document.body.innerHTML = `
    <div data-frontend-status></div>
    <div data-frontend-time></div>
    <div data-ci-status></div>
    <div data-ci-time></div>
    <div data-coverage-status></div>
    <div data-traffic-views></div>
    <div data-traffic-visitors></div>
    <div data-traffic-time></div>
    <button id="refresh-badge"></button>
    <img id="github-badge" src="" />
  `;
  
  global.window = global.window || {};
  global.window.open = jest.fn();
}

describe('Status Cards Functions', () => {
  let statusAPI;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    // Setup DOM
    setupStatusCardsDOM();
    
    // Mock GitHubUtils
    global.GitHubUtils = {
      parseBadgeSVG: jest.fn(async () => 'success'),
      getTimeAgo: jest.fn(() => '2m ago')
    };
    
    // Mock fetch
    global.fetch = jest.fn(async () => ({
      ok: true,
      text: async () => '<svg><text>85%</text></svg>'
    }));
    
    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
    
    // Mock timers
    jest.useFakeTimers();
    global.setTimeout = jest.fn((cb, delay) => {
      if (typeof cb === 'function') {
        cb();
      }
      return 123;
    });
    global.setInterval = jest.fn();
    
    // Load the module and trigger DOMContentLoaded
    require('../src/status-cards.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    statusAPI = global.statusCardsTestExports;
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  describe('parseCoverageFromSVG', () => {
    test('should parse percentage from SVG text', () => {
      const svgWithPercent = '<svg><text>coverage: 85%</text></svg>';
      const result = statusAPI.parseCoverageFromSVG(svgWithPercent);
      expect(result).toBe(85);
    });

    test('should parse decimal percentage', () => {
      const svgWithDecimal = '<svg><text>85.5%</text></svg>';
      const result = statusAPI.parseCoverageFromSVG(svgWithDecimal);
      expect(result).toBe(85.5);
    });

    test('should detect unknown status', () => {
      const svgWithUnknown = '<svg><text>coverage unknown</text></svg>';
      const result = statusAPI.parseCoverageFromSVG(svgWithUnknown);
      expect(result).toBe('unknown');
    });

    test('should detect pending status', () => {
      const svgWithPending = '<svg><text>coverage pending</text></svg>';
      const result = statusAPI.parseCoverageFromSVG(svgWithPending);
      expect(result).toBe('unknown');
    });

    test('should detect inaccessible status', () => {
      const svgWithInaccessible = '<svg><text>inaccessible repository</text></svg>';
      const result = statusAPI.parseCoverageFromSVG(svgWithInaccessible);
      expect(result).toBe('unknown');
    });

    test('should fallback to any reasonable number', () => {
      const svgWithNumber = '<svg><text>75</text></svg>';
      const result = statusAPI.parseCoverageFromSVG(svgWithNumber);
      expect(result).toBe(75);
    });

    test('should reject numbers outside 0-100 range', () => {
      const svgWithLargeNumber = '<svg><text>150</text></svg>';
      const result = statusAPI.parseCoverageFromSVG(svgWithLargeNumber);
      expect(result).toBe('unknown');
    });

    test('should return unknown when no valid data found', () => {
      const svgWithoutData = '<svg><text>no coverage data</text></svg>';
      const result = statusAPI.parseCoverageFromSVG(svgWithoutData);
      expect(result).toBe('unknown');
    });
  });

  describe('updateWorkflowStatusUI', () => {
    test('should update UI with success status', () => {
      const workflowData = {
        status: 'success',
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      statusAPI.updateWorkflowStatusUI(workflowData);

      const statusElement = document.querySelector('[data-frontend-status]');
      expect(statusElement.innerHTML).toContain('fas fa-check-circle');
      expect(statusElement.innerHTML).toContain('text-green-500');
      expect(statusElement.innerHTML).toContain('Deployed');
    });

    test('should update UI with failure status', () => {
      const workflowData = {
        status: 'failure',
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      statusAPI.updateWorkflowStatusUI(workflowData);

      const statusElement = document.querySelector('[data-frontend-status]');
      expect(statusElement.innerHTML).toContain('fas fa-times-circle');
      expect(statusElement.innerHTML).toContain('text-red-500');
      expect(statusElement.innerHTML).toContain('Failed');
    });

    test('should update UI with in_progress status', () => {
      const workflowData = {
        status: 'in_progress',
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      statusAPI.updateWorkflowStatusUI(workflowData);

      const statusElement = document.querySelector('[data-frontend-status]');
      expect(statusElement.innerHTML).toContain('fas fa-spinner fa-spin');
      expect(statusElement.innerHTML).toContain('text-blue-500');
      expect(statusElement.innerHTML).toContain('Deploying');
    });

    test('should skip timestamp update when requested', () => {
      // Reset the getTimeAgo mock call count for this test
      GitHubUtils.getTimeAgo.mockClear();
      
      const workflowData = {
        status: 'success',
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      const timeElement = document.querySelector('[data-frontend-time]');
      const initialTimeContent = timeElement.innerHTML;

      statusAPI.updateWorkflowStatusUI(workflowData, true);

      // When skipTimeUpdate is true, the timestamp should not be updated
      expect(timeElement.innerHTML).toBe(initialTimeContent);
      expect(GitHubUtils.getTimeAgo).not.toHaveBeenCalled();
    });

    test('should make status clickable', () => {
      const workflowData = {
        status: 'success',
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      statusAPI.updateWorkflowStatusUI(workflowData);

      const statusElement = document.querySelector('[data-frontend-status]');
      expect(statusElement.style.cursor).toBe('pointer');
      
      // Simulate click
      statusElement.onclick();
      expect(global.window.open).toHaveBeenCalledWith(workflowData.htmlUrl, '_blank');
    });

    test('should handle missing DOM elements gracefully', () => {
      // Remove elements
      document.querySelector('[data-frontend-status]').remove();
      document.querySelector('[data-frontend-time]').remove();

      const workflowData = {
        status: 'success',
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      expect(() => {
        statusAPI.updateWorkflowStatusUI(workflowData);
      }).not.toThrow();
    });
  });

  describe('updateCIStatusUI', () => {
    test('should update CI status with success', () => {
      const ciData = {
        status: 'success',
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      statusAPI.updateCIStatusUI(ciData);

      const statusElement = document.querySelector('[data-ci-status]');
      expect(statusElement.innerHTML).toContain('fas fa-check-circle');
      expect(statusElement.innerHTML).toContain('text-green-500');
      expect(statusElement.innerHTML).toContain('Passing');
    });

    test('should update CI status with failure', () => {
      const ciData = {
        status: 'failure',
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      statusAPI.updateCIStatusUI(ciData);

      const statusElement = document.querySelector('[data-ci-status]');
      expect(statusElement.innerHTML).toContain('fas fa-times-circle');
      expect(statusElement.innerHTML).toContain('text-red-500');
      expect(statusElement.innerHTML).toContain('Failing');
    });

    test('should always update timestamp', () => {
      const ciData = {
        status: 'success',
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      statusAPI.updateCIStatusUI(ciData);

      const timeElement = document.querySelector('[data-ci-time]');
      expect(timeElement.innerHTML).toContain('Updated 2m ago');
      expect(GitHubUtils.getTimeAgo).toHaveBeenCalledWith(ciData.updatedAt);
    });
  });

  describe('updateCoverageStatusUI', () => {
    test('should update coverage with high percentage (green)', () => {
      const coverageData = {
        coverage: 85,
        updatedAt: new Date(),
        htmlUrl: 'https://coveralls.io/test'
      };

      statusAPI.updateCoverageStatusUI(coverageData);

      const statusElement = document.querySelector('[data-coverage-status]');
      expect(statusElement.innerHTML).toContain('text-green-600');
      expect(statusElement.innerHTML).toContain('85%');
    });

    test('should update coverage with medium percentage (yellow)', () => {
      const coverageData = {
        coverage: 65,
        updatedAt: new Date(),
        htmlUrl: 'https://coveralls.io/test'
      };

      statusAPI.updateCoverageStatusUI(coverageData);

      const statusElement = document.querySelector('[data-coverage-status]');
      expect(statusElement.innerHTML).toContain('text-yellow-600');
      expect(statusElement.innerHTML).toContain('65%');
    });

    test('should update coverage with low percentage (red)', () => {
      const coverageData = {
        coverage: 45,
        updatedAt: new Date(),
        htmlUrl: 'https://coveralls.io/test'
      };

      statusAPI.updateCoverageStatusUI(coverageData);

      const statusElement = document.querySelector('[data-coverage-status]');
      expect(statusElement.innerHTML).toContain('text-red-600');
      expect(statusElement.innerHTML).toContain('45%');
    });

    test('should handle unknown coverage', () => {
      const coverageData = {
        coverage: 'unknown',
        updatedAt: new Date(),
        htmlUrl: 'https://coveralls.io/test'
      };

      statusAPI.updateCoverageStatusUI(coverageData);

      const statusElement = document.querySelector('[data-coverage-status]');
      expect(statusElement.innerHTML).toContain('text-gray-600');
      expect(statusElement.innerHTML).toContain('Unknown');
    });
  });

  describe('updateTrafficUI', () => {
    test('should update traffic data', () => {
      const trafficData = {
        views: 1234,
        uniqueVisitors: 567,
        updatedAt: new Date()
      };

      statusAPI.updateTrafficUI(trafficData);

      const viewsElement = document.querySelector('[data-traffic-views]');
      const visitorsElement = document.querySelector('[data-traffic-visitors]');
      const timeElement = document.querySelector('[data-traffic-time]');

      expect(viewsElement.textContent).toBe('1,234');
      expect(visitorsElement.textContent).toBe('567');
      expect(timeElement.innerHTML).toContain('Updated 2m ago');
    });

    test('should handle missing elements gracefully', () => {
      document.querySelector('[data-traffic-views]').remove();
      
      const trafficData = {
        views: 1234,
        uniqueVisitors: 567,
        updatedAt: new Date()
      };

      expect(() => {
        statusAPI.updateTrafficUI(trafficData);
      }).not.toThrow();
    });
  });

  describe('fetchTrafficData', () => {
    test('should return mock traffic data', async () => {
      const data = await statusAPI.fetchTrafficData();
      
      expect(data).toHaveProperty('views');
      expect(data).toHaveProperty('uniqueVisitors');
      expect(data).toHaveProperty('updatedAt');
      expect(typeof data.views).toBe('number');
      expect(typeof data.uniqueVisitors).toBe('number');
      expect(data.updatedAt).toBeInstanceOf(Date);
      expect(data.views).toBeGreaterThanOrEqual(100);
      expect(data.views).toBeLessThanOrEqual(1100);
      expect(data.uniqueVisitors).toBeGreaterThanOrEqual(50);
      expect(data.uniqueVisitors).toBeLessThanOrEqual(550);
    });
  });

  describe('fetchWorkflowStatus', () => {
    test('should fetch workflow status successfully', async () => {
      GitHubUtils.parseBadgeSVG.mockResolvedValue('success');
      
      await statusAPI.fetchWorkflowStatus();
      
      expect(GitHubUtils.parseBadgeSVG).toHaveBeenCalledWith(
        expect.stringContaining('https://img.shields.io/github/actions/workflow/status/super3/dashban/frontend.yml')
      );
    });

    test('should handle fetch errors gracefully', async () => {
      GitHubUtils.parseBadgeSVG.mockRejectedValue(new Error('Network error'));
      
      await statusAPI.fetchWorkflowStatus();
      
      expect(console.error).toHaveBeenCalledWith('Error fetching workflow status:', expect.any(Error));
    });

    test('should skip timestamp update when requested', async () => {
      GitHubUtils.parseBadgeSVG.mockResolvedValue('success');
      
      await statusAPI.fetchWorkflowStatus(true);
      
      // Should still call the parsing function
      expect(GitHubUtils.parseBadgeSVG).toHaveBeenCalled();
    });
  });

  describe('fetchCIStatus', () => {
    test('should fetch CI status successfully', async () => {
      GitHubUtils.parseBadgeSVG.mockResolvedValue('failure');
      
      await statusAPI.fetchCIStatus();
      
      expect(GitHubUtils.parseBadgeSVG).toHaveBeenCalledWith(
        expect.stringContaining('https://img.shields.io/github/actions/workflow/status/super3/dashban/test.yml')
      );
    });

    test('should handle CI fetch errors', async () => {
      GitHubUtils.parseBadgeSVG.mockRejectedValue(new Error('API error'));
      
      await statusAPI.fetchCIStatus();
      
      expect(console.error).toHaveBeenCalledWith('Error fetching CI status:', expect.any(Error));
    });
  });

  describe('fetchCoverageStatus', () => {
    test('should fetch coverage status successfully', async () => {
      global.fetch.mockResolvedValue({
        text: async () => '<svg><text>75%</text></svg>'
      });
      
      await statusAPI.fetchCoverageStatus();
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://img.shields.io/coveralls/github/super3/dashban/main.svg'),
      );
    });

    test('should handle coverage fetch errors', async () => {
      global.fetch.mockRejectedValue(new Error('Fetch error'));
      
      await statusAPI.fetchCoverageStatus();
      
      expect(console.error).toHaveBeenCalledWith('Error fetching coverage status:', expect.any(Error));
    });
  });

  describe('refreshAllStatuses', () => {
    test('should call the refresh function without errors', () => {
      // Since refreshAllStatuses calls internal functions, we can't easily spy on them
      // but we can verify that calling refreshAllStatuses doesn't throw errors
      expect(() => {
        statusAPI.refreshAllStatuses();
      }).not.toThrow();
      
      // Verify that the required utility functions were called
      expect(GitHubUtils.parseBadgeSVG).toHaveBeenCalled();
    });
  });
}); 