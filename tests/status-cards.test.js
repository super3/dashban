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

  describe('dependency check', () => {
    test('should handle missing GitHubUtils dependency', () => {
      // Reset modules and clear the GitHubUtils mock
      jest.resetModules();
      delete global.GitHubUtils;
      
      // Mock console.error to capture the error
      console.error = jest.fn();
      
      // Load the module without GitHubUtils
      require('../src/status-cards.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      
      expect(console.error).toHaveBeenCalledWith('❌ GitHubUtils not found. Make sure src/utils.js is loaded.');
    });
  });

  describe('badge debugging functionality', () => {
    test('should handle refresh badge button click', () => {
      const refreshBtn = document.getElementById('refresh-badge');
      const badgeImg = document.getElementById('github-badge');
      
      // Mock Date.now()
      const mockNow = 1234567890;
      Date.now = jest.fn(() => mockNow);
      
      // Simulate button click
      refreshBtn.click();
      
      expect(badgeImg.src).toContain(`?t=${mockNow}`);
      expect(console.log).toHaveBeenCalledWith('Badge refreshed manually');
    });

    test('should handle badge image load event', () => {
      const badgeImg = document.getElementById('github-badge');
      
      // Set up image properties
      Object.defineProperty(badgeImg, 'naturalWidth', { value: 100 });
      Object.defineProperty(badgeImg, 'naturalHeight', { value: 20 });
      Object.defineProperty(badgeImg, 'src', { value: 'test-url.svg' });
      
      // Trigger load event
      badgeImg.dispatchEvent(new Event('load'));
      
      expect(console.log).toHaveBeenCalledWith('Badge loaded successfully');
      expect(console.log).toHaveBeenCalledWith('Badge dimensions:', 100, 'x', 20);
      expect(console.log).toHaveBeenCalledWith('Badge src:', 'test-url.svg');
    });

    test('should handle badge image error event', () => {
      const badgeImg = document.getElementById('github-badge');
      
      // Trigger error event
      badgeImg.dispatchEvent(new Event('error'));
      
      expect(console.error).toHaveBeenCalledWith('Badge failed to load');
    });

    test('should handle missing refresh button gracefully', () => {
      // Create a DOM setup without refresh button
      document.body.innerHTML = `
        <div data-frontend-status></div>
        <div data-frontend-time></div>
        <div data-ci-status></div>
        <div data-ci-time></div>
        <div data-coverage-status></div>
        <div data-traffic-views></div>
        <div data-traffic-visitors></div>
        <div data-traffic-time></div>
        <img id="github-badge" src="" />
      `;

      expect(() => {
        statusAPI.setupBadgeDebugging();
      }).not.toThrow();
    });

    test('should handle missing badge image gracefully', () => {
      // Create a DOM setup without badge image
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
      `;

      expect(() => {
        statusAPI.setupBadgeDebugging();
      }).not.toThrow();
    });
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

    test('should parse coverage from text elements', () => {
      const svgWithTextElement = '<svg><text>Some text 75% coverage</text></svg>';
      const result = statusAPI.parseCoverageFromSVG(svgWithTextElement);
      expect(result).toBe(75);
    });

    test('should parse coverage using text element when first regex fails', () => {
      const trickySvg = {
        str: '<svg><text>Another text 66% here</text></svg>',
        match(regex) {
          if (regex.source === '(\\d+(?:\\.\\d+)?)%') {
            return null; // force first regex miss
          }
          return this.str.match(regex);
        },
        toLowerCase() {
          return this.str.toLowerCase();
        }
      };
      const result = statusAPI.parseCoverageFromSVG(trickySvg);
      expect(result).toBe(66);
    });

    test('should fall back when percent extraction fails', () => {
      const trickySvg = {
        str: '<svg><text>Yet another 44% text</text></svg>',
        match(regex) {
          if (regex.source === '(\\d+(?:\\.\\d+)?)%') {
            return null; // skip both first and second percentage matches
          }
          return this.str.match(regex);
        },
        toLowerCase() { return this.str.toLowerCase(); }
      };

      const result = statusAPI.parseCoverageFromSVG(trickySvg);
      expect(result).toBe(44);
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
      const svgWithNumber = '<svg><text>some text 92 more text</text></svg>';
      const result = statusAPI.parseCoverageFromSVG(svgWithNumber);
      expect(result).toBe(92);
    });

    test('should reject numbers outside 0-100 range', () => {
      const svgWithLargeNumber = '<svg><text>150</text></svg>';
      const result = statusAPI.parseCoverageFromSVG(svgWithLargeNumber);
      expect(result).toBe('unknown');
    });

    test('should return unknown when no valid data found', () => {
      const svgWithoutData = '<svg><text>no numbers here</text></svg>';
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

    test('should handle unknown/invalid status with fallback', () => {
      const workflowData = {
        status: 'invalid_status_that_does_not_exist',
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      statusAPI.updateWorkflowStatusUI(workflowData);

      const statusElement = document.querySelector('[data-frontend-status]');
      expect(statusElement.innerHTML).toContain('fas fa-question-circle');
      expect(statusElement.innerHTML).toContain('text-gray-500');
      expect(statusElement.innerHTML).toContain('Unknown');
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
      // Remove the elements
      document.querySelector('[data-frontend-status]').remove();
      
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
      expect(statusElement.innerHTML).toContain('Failing');
    });

    test('should handle unknown CI status with fallback', () => {
      const ciData = {
        status: 'invalid_ci_status',
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      statusAPI.updateCIStatusUI(ciData);

      const statusElement = document.querySelector('[data-ci-status]');
      expect(statusElement.innerHTML).toContain('fas fa-question-circle');
      expect(statusElement.innerHTML).toContain('Unknown');
    });

    test('should handle completely undefined CI status with fallback', () => {
      const ciData = {
        status: undefined,
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      statusAPI.updateCIStatusUI(ciData);

      const statusElement = document.querySelector('[data-ci-status]');
      expect(statusElement.innerHTML).toContain('fas fa-question-circle');
      expect(statusElement.innerHTML).toContain('Unknown');
    });

    test('should handle null CI status with fallback', () => {
      const ciData = {
        status: null,
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      statusAPI.updateCIStatusUI(ciData);

      const statusElement = document.querySelector('[data-ci-status]');
      expect(statusElement.innerHTML).toContain('fas fa-question-circle');
      expect(statusElement.innerHTML).toContain('Unknown');
    });

    test('should handle missing status property with fallback', () => {
      const ciData = {
        // status property is missing entirely
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      statusAPI.updateCIStatusUI(ciData);

      const statusElement = document.querySelector('[data-ci-status]');
      expect(statusElement.innerHTML).toContain('fas fa-question-circle');
      expect(statusElement.innerHTML).toContain('Unknown');
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

    test('should handle missing DOM elements gracefully', () => {
      // Remove the elements
      document.querySelector('[data-ci-status]').remove();
      
      const ciData = {
        status: 'success',
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      expect(() => {
        statusAPI.updateCIStatusUI(ciData);
      }).not.toThrow();
    });

    test('should make CI status clickable', () => {
      const ciData = {
        status: 'success',
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      statusAPI.updateCIStatusUI(ciData);

      const statusElement = document.querySelector('[data-ci-status]');
      expect(statusElement.style.cursor).toBe('pointer');
      
      // Simulate click
      statusElement.onclick();
      expect(global.window.open).toHaveBeenCalledWith(ciData.htmlUrl, '_blank');
    });
  });

  describe('updateCoverageStatusUI', () => {
    test('should update coverage with high percentage (green)', () => {
      const coverageData = {
        coverage: 85,
        updatedAt: new Date(),
        htmlUrl: 'https://coveralls.io/github/test/repo'
      };

      statusAPI.updateCoverageStatusUI(coverageData);

      const statusElement = document.querySelector('[data-coverage-status]');
      expect(statusElement.innerHTML).toContain('85%');
      expect(statusElement.innerHTML).toContain('text-green-600');
    });

    test('should update coverage with medium percentage (yellow)', () => {
      const coverageData = {
        coverage: 65,
        updatedAt: new Date(),
        htmlUrl: 'https://coveralls.io/github/test/repo'
      };

      statusAPI.updateCoverageStatusUI(coverageData);

      const statusElement = document.querySelector('[data-coverage-status]');
      expect(statusElement.innerHTML).toContain('65%');
      expect(statusElement.innerHTML).toContain('text-yellow-600');
    });

    test('should update coverage with low percentage (red)', () => {
      const coverageData = {
        coverage: 45,
        updatedAt: new Date(),
        htmlUrl: 'https://coveralls.io/github/test/repo'
      };

      statusAPI.updateCoverageStatusUI(coverageData);

      const statusElement = document.querySelector('[data-coverage-status]');
      expect(statusElement.innerHTML).toContain('45%');
      expect(statusElement.innerHTML).toContain('text-red-600');
    });

    test('should handle unknown coverage', () => {
      const coverageData = {
        coverage: 'unknown',
        updatedAt: new Date(),
        htmlUrl: 'https://coveralls.io/github/test/repo'
      };

      statusAPI.updateCoverageStatusUI(coverageData);

      const statusElement = document.querySelector('[data-coverage-status]');
      expect(statusElement.innerHTML).toContain('Unknown');
      expect(statusElement.innerHTML).toContain('text-gray-600');
    });

    test('should make coverage status clickable', () => {
      const coverageData = {
        coverage: 88,
        updatedAt: new Date(),
        htmlUrl: 'https://coveralls.io/github/test/repo'
      };

      statusAPI.updateCoverageStatusUI(coverageData);

      const statusElement = document.querySelector('[data-coverage-status]');
      statusElement.onclick();
      expect(global.window.open).toHaveBeenCalledWith(coverageData.htmlUrl, '_blank');
    });

    test('should handle missing coverage element gracefully', () => {
      document.querySelector('[data-coverage-status]').remove();

      const coverageData = {
        coverage: 90,
        updatedAt: new Date(),
        htmlUrl: 'https://coveralls.io/github/test/repo'
      };

      expect(() => {
        statusAPI.updateCoverageStatusUI(coverageData);
      }).not.toThrow();
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

    test('should handle missing time element gracefully', () => {
      document.querySelector('[data-traffic-time]').remove();
      
      const trafficData = {
        views: 1234,
        uniqueVisitors: 567,
        updatedAt: new Date()
      };

      expect(() => {
        statusAPI.updateTrafficUI(trafficData);
      }).not.toThrow();
    });

    test('should handle missing visitors element gracefully', () => {
      document.querySelector('[data-traffic-visitors]').remove();
      
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
      const result = await statusAPI.fetchTrafficData();
      
      expect(result).toHaveProperty('views');
      expect(result).toHaveProperty('uniqueVisitors');
      expect(result).toHaveProperty('updatedAt');
      expect(typeof result.views).toBe('number');
      expect(typeof result.uniqueVisitors).toBe('number');
      expect(result.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('fetchWorkflowStatus', () => {
    test('should fetch workflow status successfully', async () => {
      GitHubUtils.parseBadgeSVG.mockResolvedValue('success');
      
      await statusAPI.fetchWorkflowStatus();
      
      expect(GitHubUtils.parseBadgeSVG).toHaveBeenCalledWith(
        'https://img.shields.io/github/actions/workflow/status/super3/dashban/frontend.yml'
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
      
      expect(GitHubUtils.parseBadgeSVG).toHaveBeenCalled();
    });
  });

  describe('fetchCIStatus', () => {
    test('should fetch CI status successfully', async () => {
      GitHubUtils.parseBadgeSVG.mockResolvedValue('success');
      
      await statusAPI.fetchCIStatus();
      
      expect(GitHubUtils.parseBadgeSVG).toHaveBeenCalledWith(
        'https://img.shields.io/github/actions/workflow/status/super3/dashban/test.yml'
      );
    });

    test('should handle CI fetch errors', async () => {
      GitHubUtils.parseBadgeSVG.mockRejectedValue(new Error('CI fetch error'));
      
      await statusAPI.fetchCIStatus();
      
      expect(console.error).toHaveBeenCalledWith('Error fetching CI status:', expect.any(Error));
    });
  });

  describe('fetchCoverageStatus', () => {
    test('should fetch coverage status successfully', async () => {
      global.fetch.mockResolvedValue({
        text: async () => '<svg><text>85%</text></svg>'
      });
      
      await statusAPI.fetchCoverageStatus();
      
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://img.shields.io/coveralls/github/super3/dashban/main.svg?t=')
      );
    });

    test('should handle coverage fetch errors', async () => {
      global.fetch.mockRejectedValue(new Error('Coverage fetch error'));
      
      await statusAPI.fetchCoverageStatus();
      
      expect(console.error).toHaveBeenCalledWith('Error fetching coverage status:', expect.any(Error));
    });
  });

  describe('refreshAllStatuses', () => {
    test('should call the refresh function without errors', () => {
      expect(() => {
        statusAPI.refreshAllStatuses();
      }).not.toThrow();
    });
  });

  describe('updateTimestamp', () => {
    test('should update timestamps for elements with lastUpdated data', () => {
      // Set up elements with lastUpdated data
      const element = document.querySelector('[data-frontend-time]');
      element.dataset.lastUpdated = new Date().toISOString();
      element.innerHTML = '<span>Old timestamp</span>';
      
      statusAPI.updateTimestamp();
      
      const span = element.querySelector('span');
      expect(span.textContent).toContain('Updated');
    });

    test('should handle elements without lastUpdated data', () => {
      // Element without lastUpdated data
      const element = document.querySelector('[data-ci-time]');
      delete element.dataset.lastUpdated;

      expect(() => {
        statusAPI.updateTimestamp();
      }).not.toThrow();
    });

    test('should handle elements missing span child', () => {
      const element = document.querySelector('[data-ci-time]');
      element.dataset.lastUpdated = new Date().toISOString();
      element.innerHTML = '';

      expect(() => {
        statusAPI.updateTimestamp();
      }).not.toThrow();
    });
  });

  describe('setupBadgeDebugging', () => {
    test('should set up badge debugging when elements exist', () => {
      expect(() => {
        statusAPI.setupBadgeDebugging();
      }).not.toThrow();
    });
  });

  describe('module exports and initialization', () => {
    test('should export statusAPI to globalThis', () => {
      expect(global.statusCardsTestExports).toBeDefined();
      expect(global.statusCardsTestExports.fetchWorkflowStatus).toBeDefined();
      expect(global.statusCardsTestExports.updateWorkflowStatusUI).toBeDefined();
      expect(global.statusCardsTestExports.parseCoverageFromSVG).toBeDefined();
    });

    test('should have all expected functions in exports', () => {
      const expectedFunctions = [
        'fetchWorkflowStatus',
        'fetchCIStatus',
        'fetchCoverageStatus',
        'fetchTrafficData',
        'updateWorkflowStatusUI',
        'updateCIStatusUI',
        'updateCoverageStatusUI',
        'updateTrafficUI',
        'refreshAllStatuses',
        'parseCoverageFromSVG',
        'updateTimestamp',
        'setupBadgeDebugging'
      ];

      expectedFunctions.forEach(funcName => {
        expect(global.statusCardsTestExports[funcName]).toBeDefined();
        expect(typeof global.statusCardsTestExports[funcName]).toBe('function');
      });
    });

    test('should skip exports when globals are undefined', () => {
      const fs = require('fs');
      const vm = require('vm');
      const code = fs.readFileSync(require.resolve('../src/status-cards.js'), 'utf8');
      const sandbox = {
        console: { log: jest.fn(), error: jest.fn() },
        GitHubUtils: { parseBadgeSVG: async ()=>'success', getTimeAgo: ()=>'1m' },
        document: { addEventListener: (_, cb)=>cb(), querySelector: ()=>null, querySelectorAll: ()=>[], getElementById: ()=>null },
        fetch: async () => ({ text: async ()=>'' }),
        setTimeout: jest.fn(),
        setInterval: jest.fn(),
        window: {}
      };
      vm.createContext(sandbox);
      vm.runInContext('var globalThis = undefined; var module = undefined;\n' + code, sandbox);
      expect(sandbox.statusCardsTestExports).toBeUndefined();
    });
  });
}); 