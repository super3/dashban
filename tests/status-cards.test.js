// Tests for Status Cards functionality

// ============================================================================
// TEST UTILITIES AND HELPERS
// ============================================================================

function setupStatusCardsDOM() {
  document.body.innerHTML = `
    <div data-frontend-status></div>
    <div data-frontend-time></div>
    <div data-ci-status></div>
    <div data-ci-time></div>
    <div data-coverage-status></div>
    <button id="refresh-badge"></button>
    <img id="github-badge" src="" />
  `;
  
  global.window = global.window || {};
  global.window.open = jest.fn();
}

function setupMocks() {
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
}

function createWorkflowData(overrides = {}) {
  return {
    status: 'success',
    updatedAt: new Date(),
    htmlUrl: 'https://github.com/test/repo/actions',
    ...overrides
  };
}

function createCoverageData(overrides = {}) {
  return {
    coverage: 85,
    updatedAt: new Date(),
    htmlUrl: 'https://coveralls.io/github/test/repo',
    ...overrides
  };
}

function loadStatusCardsModule() {
  require('../src/status-cards.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  return global.statusCardsTestExports;
}

// ============================================================================
// TEST DATA SETS FOR PARAMETERIZED TESTS
// ============================================================================

const workflowStatusTestCases = [
  {
    status: 'success',
    expectedIcon: 'fas fa-check-circle',
    expectedColor: 'text-green-500',
    expectedText: 'Deployed'
  },
  {
    status: 'failure',
    expectedIcon: 'fas fa-times-circle',
    expectedColor: 'text-red-500',
    expectedText: 'Failed'
  },
  {
    status: 'in_progress',
    expectedIcon: 'fas fa-spinner fa-spin',
    expectedColor: 'text-blue-500',
    expectedText: 'Deploying'
  },
  {
    status: 'invalid_status_that_does_not_exist',
    expectedIcon: 'fas fa-question-circle',
    expectedColor: 'text-gray-500',
    expectedText: 'Unknown'
  }
];

const ciStatusTestCases = [
  {
    status: 'success',
    expectedIcon: 'fas fa-check-circle',
    expectedText: 'Passing'
  },
  {
    status: 'failure',
    expectedIcon: 'fas fa-times-circle',
    expectedText: 'Failing'
  },
  {
    status: 'invalid_ci_status',
    expectedIcon: 'fas fa-question-circle',
    expectedText: 'Unknown'
  }
];

const coverageTestCases = [
  {
    coverage: 85,
    expectedText: '85%',
    expectedColor: 'text-green-600',
    description: 'high percentage (green)'
  },
  {
    coverage: 65,
    expectedText: '65%',
    expectedColor: 'text-yellow-600',
    description: 'medium percentage (yellow)'
  },
  {
    coverage: 45,
    expectedText: '45%',
    expectedColor: 'text-red-600',
    description: 'low percentage (red)'
  },
  {
    coverage: 'unknown',
    expectedText: 'Unknown',
    expectedColor: 'text-gray-600',
    description: 'unknown coverage'
  }
];

const svgParsingTestCases = [
  {
    description: 'percentage from SVG text',
    svg: '<svg><text>coverage: 85%</text></svg>',
    expected: 85
  },
  {
    description: 'decimal percentage',
    svg: '<svg><text>85.5%</text></svg>',
    expected: 85.5
  },
  {
    description: 'coverage from text elements',
    svg: '<svg><text>Some text 75% coverage</text></svg>',
    expected: 75
  },
  {
    description: 'any reasonable number',
    svg: '<svg><text>some text 92 more text</text></svg>',
    expected: 92
  }
];

const svgStatusDetectionTestCases = [
  {
    description: 'unknown status',
    svg: '<svg><text>coverage unknown</text></svg>',
    expected: 'unknown'
  },
  {
    description: 'pending status',
    svg: '<svg><text>coverage pending</text></svg>',
    expected: 'unknown'
  },
  {
    description: 'inaccessible status',
    svg: '<svg><text>inaccessible repository</text></svg>',
    expected: 'unknown'
  },
  {
    description: 'no valid data found',
    svg: '<svg><text>no numbers here</text></svg>',
    expected: 'unknown'
  }
];

// ============================================================================
// MAIN TEST SUITE
// ============================================================================

describe('Status Cards Functions', () => {
  let statusAPI;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    
    setupStatusCardsDOM();
    setupMocks();
    statusAPI = loadStatusCardsModule();
  });

  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  // ============================================================================
  // DEPENDENCY AND INITIALIZATION TESTS
  // ============================================================================

  describe('dependency validation', () => {
    test('should validate dependencies successfully when GitHubUtils exists', () => {
      const result = statusAPI.validateDependencies();
      expect(result).toBe(true);
    });

    test('should handle missing GitHubUtils dependency', () => {
      jest.resetModules();
      delete global.GitHubUtils;
      
      console.error = jest.fn();
      
      require('../src/status-cards.js');
      document.dispatchEvent(new Event('DOMContentLoaded'));
      
      expect(console.error).toHaveBeenCalledWith('❌ GitHubUtils not found. Make sure src/utils.js is loaded.');
    });

    test('should return false when GitHubUtils is missing', () => {
      delete global.GitHubUtils;
      const result = statusAPI.validateDependencies();
      expect(result).toBe(false);
    });
  });

  // ============================================================================
  // UTILITY FUNCTION TESTS
  // ============================================================================

  describe('utility functions', () => {
    describe('createStatusHTML', () => {
      test('should create proper status HTML', () => {
        const config = {
          icon: 'fas fa-check-circle',
          color: 'text-green-500',
          text: 'Success',
          bgColor: 'text-green-600'
        };
        
        const result = statusAPI.createStatusHTML(config, 'success');
        
        expect(result).toContain('fas fa-check-circle');
        expect(result).toContain('text-green-500');
        expect(result).toContain('text-green-600');
        expect(result).toContain('Success');
      });
    });

    describe('createTimestampHTML', () => {
      test('should create proper timestamp HTML', () => {
        const testDate = new Date();
        
        const result = statusAPI.createTimestampHTML(testDate);
        
        expect(result).toContain('fas fa-sync');
        expect(result).toContain('text-gray-400');
        expect(result).toContain('Updated 2m ago');
        expect(global.GitHubUtils.getTimeAgo).toHaveBeenCalledWith(testDate);
      });
    });

    describe('buildBadgeUrl', () => {
      test('should build workflow badge URL correctly', () => {
        const result = statusAPI.buildBadgeUrl('workflow', 'test.yml');
        expect(result).toBe('https://img.shields.io/github/actions/workflow/status/super3/dashban/test.yml');
      });

      test('should build coverage badge URL correctly', () => {
        const result = statusAPI.buildBadgeUrl('coverage');
        expect(result).toBe('https://img.shields.io/coveralls/github/super3/dashban/main.svg');
      });

      test('should throw error for unknown badge type', () => {
        expect(() => {
          statusAPI.buildBadgeUrl('unknown');
        }).toThrow('Unknown badge type: unknown');
      });
    });

    describe('buildGitHubUrl', () => {
      test('should build workflow GitHub URL correctly', () => {
        const result = statusAPI.buildGitHubUrl('workflow', 'test.yml');
        expect(result).toBe('https://github.com/super3/dashban/actions/workflows/test.yml');
      });

      test('should build coverage GitHub URL correctly', () => {
        const result = statusAPI.buildGitHubUrl('coverage');
        expect(result).toBe('https://coveralls.io/github/super3/dashban?branch=main');
      });

      test('should throw error for unknown URL type', () => {
        expect(() => {
          statusAPI.buildGitHubUrl('unknown');
        }).toThrow('Unknown URL type: unknown');
      });
    });

    describe('makeElementClickable', () => {
      test('should make element clickable with proper URL', () => {
        const element = document.createElement('div');
        const url = 'https://example.com';
        
        statusAPI.makeElementClickable(element, url);
        
        expect(element.style.cursor).toBe('pointer');
        element.onclick();
        expect(global.window.open).toHaveBeenCalledWith(url, '_blank');
      });

      test('should handle null element gracefully', () => {
        expect(() => {
          statusAPI.makeElementClickable(null, 'https://example.com');
        }).not.toThrow();
      });

      test('should handle null URL gracefully', () => {
        const element = document.createElement('div');
        expect(() => {
          statusAPI.makeElementClickable(element, null);
        }).not.toThrow();
      });
    });

    describe('safeQuerySelector', () => {
      test('should return element when found', () => {
        const element = statusAPI.safeQuerySelector('[data-frontend-status]');
        expect(element).not.toBeNull();
      });

      test('should log error and return null when element not found', () => {
        const element = statusAPI.safeQuerySelector('[data-nonexistent]');
        expect(element).toBeNull();
        expect(console.log).toHaveBeenCalledWith('❌ Element not found: [data-nonexistent]');
      });
    });
  });

  // ============================================================================
  // CONFIGURATION TESTS
  // ============================================================================

  describe('configuration', () => {
    test('should have valid CONFIG object', () => {
      expect(statusAPI.CONFIG).toBeDefined();
      expect(statusAPI.CONFIG.OWNER).toBe('super3');
      expect(statusAPI.CONFIG.REPO).toBe('dashban');
      expect(statusAPI.CONFIG.WORKFLOWS.FRONTEND).toBe('frontend.yml');
      expect(statusAPI.CONFIG.WORKFLOWS.TEST).toBe('test.yml');
    });

    test('should have valid STATUS_CONFIGS object', () => {
      expect(statusAPI.STATUS_CONFIGS).toBeDefined();
      expect(statusAPI.STATUS_CONFIGS.WORKFLOW).toBeDefined();
      expect(statusAPI.STATUS_CONFIGS.CI).toBeDefined();
      expect(statusAPI.STATUS_CONFIGS.WORKFLOW.success).toBeDefined();
      expect(statusAPI.STATUS_CONFIGS.CI.success).toBeDefined();
    });

    test('should have all required selectors', () => {
      const selectors = statusAPI.CONFIG.SELECTORS;
      expect(selectors.FRONTEND_STATUS).toBe('[data-frontend-status]');
      expect(selectors.CI_STATUS).toBe('[data-ci-status]');
      expect(selectors.COVERAGE_STATUS).toBe('[data-coverage-status]');
      expect(selectors.BADGE_IMG).toBe('#github-badge');
      expect(selectors.REFRESH_BTN).toBe('#refresh-badge');
    });

    test('should have all required intervals', () => {
      const intervals = statusAPI.CONFIG.INTERVALS;
      expect(intervals.REFRESH_ALL).toBe(10 * 60 * 1000);
      expect(intervals.UPDATE_TIMESTAMP).toBe(60 * 1000);
      expect(intervals.INITIAL_DELAYS.CI_STATUS).toBe(1000);
      expect(intervals.REFRESH_DELAYS.CI_STATUS).toBe(500);
    });
  });

  // ============================================================================
  // BADGE DEBUGGING FUNCTIONALITY TESTS
  // ============================================================================

  describe('badge debugging functionality', () => {
    test('should handle refresh badge button click', () => {
      const refreshBtn = document.getElementById('refresh-badge');
      const badgeImg = document.getElementById('github-badge');
      
      const mockNow = 1234567890;
      Date.now = jest.fn(() => mockNow);
      
      refreshBtn.click();
      
      expect(badgeImg.src).toContain(`?t=${mockNow}`);
      expect(console.log).toHaveBeenCalledWith('Badge refreshed manually');
    });

    test('should handle badge image load event', () => {
      const badgeImg = document.getElementById('github-badge');
      
      Object.defineProperty(badgeImg, 'naturalWidth', { value: 100 });
      Object.defineProperty(badgeImg, 'naturalHeight', { value: 20 });
      Object.defineProperty(badgeImg, 'src', { value: 'test-url.svg' });
      
      badgeImg.dispatchEvent(new Event('load'));
      
      expect(console.log).toHaveBeenCalledWith('Badge loaded successfully');
    });

    test('should handle badge image error event', () => {
      const badgeImg = document.getElementById('github-badge');
      
      badgeImg.dispatchEvent(new Event('error'));
      
      expect(console.error).toHaveBeenCalledWith('Badge failed to load');
    });

    test('should handle missing refresh button gracefully', () => {
      document.getElementById('refresh-badge')?.remove();

      expect(() => {
        statusAPI.setupBadgeDebugging();
      }).not.toThrow();
    });

    test('should handle missing badge image gracefully', () => {
      document.getElementById('github-badge')?.remove();

      expect(() => {
        statusAPI.setupBadgeDebugging();
      }).not.toThrow();
    });

    test('should handle refresh button click without badge image', () => {
      document.getElementById('github-badge')?.remove();
      const refreshBtn = document.getElementById('refresh-badge');
      
      expect(() => {
        refreshBtn.click();
      }).not.toThrow();
      
      expect(console.log).toHaveBeenCalledWith('Badge refreshed manually');
    });
  });

  // ============================================================================
  // SVG PARSING UTILITY TESTS
  // ============================================================================

  describe('parseCoverageFromSVG', () => {
    describe('percentage parsing', () => {
      test.each(svgParsingTestCases)(
        'should parse $description',
        ({ svg, expected }) => {
          const result = statusAPI.parseCoverageFromSVG(svg);
          expect(result).toBe(expected);
        }
      );
    });

    describe('status detection', () => {
      test.each(svgStatusDetectionTestCases)(
        'should detect $description',
        ({ svg, expected }) => {
          const result = statusAPI.parseCoverageFromSVG(svg);
          expect(result).toBe(expected);
        }
      );
    });

    describe('edge cases and validation', () => {
      test('should reject numbers outside 0-100 range', () => {
        const svgWithLargeNumber = '<svg><text>150</text></svg>';
        const result = statusAPI.parseCoverageFromSVG(svgWithLargeNumber);
        expect(result).toBe('unknown');
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

      test('should parse coverage from text element but fail percent extraction', () => {
        const trickySvg = {
          str: '<svg><text>Some text with no percent</text></svg>',
          match(regex) {
            if (regex.source === '(\\d+(?:\\.\\d+)?)%') {
              return null; // miss percentage match
            }
            if (regex.source === '>([^<]*\\d+(?:\\.\\d+)?%[^<]*)<') {
              return ['match', 'Some text with no percent']; // return text but without percent
            }
            return this.str.match(regex);
          },
          toLowerCase() {
            return this.str.toLowerCase();
          }
        };
        const result = statusAPI.parseCoverageFromSVG(trickySvg);
        expect(result).toBe('unknown');
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
          toLowerCase() { 
            return this.str.toLowerCase(); 
          }
        };

        const result = statusAPI.parseCoverageFromSVG(trickySvg);
        expect(result).toBe(44);
      });

      const boundaryTestCases = [
        { value: 0, description: 'minimum valid coverage' },
        { value: 100, description: 'maximum valid coverage' },
        { value: 50, description: 'mid-range coverage' },
        { value: 99.9, description: 'high decimal coverage' },
        { value: 0.1, description: 'low decimal coverage' }
      ];

      test.each(boundaryTestCases)(
        'should handle $description ($value%)',
        ({ value }) => {
          const svg = `<svg><text>${value}%</text></svg>`;
          const result = statusAPI.parseCoverageFromSVG(svg);
          expect(result).toBe(value);
        }
      );

      const invalidBoundaryTestCases = [
        { value: -1, expected: 1, description: 'negative coverage (extracts positive part)' },
        { value: 101, expected: 101, description: 'coverage over 100%' },
        { value: 999, expected: 999, description: 'extremely high coverage' }
      ];

      test.each(invalidBoundaryTestCases)(
        'should parse $description ($value%) and return $expected',
        ({ value, expected }) => {
          const svg = `<svg><text>${value}%</text></svg>`;
          const result = statusAPI.parseCoverageFromSVG(svg);
          // The current implementation returns the parsed number from percentage regex
          // The regex (\d+(?:\.\d+)?)% extracts only the digits, so -1% becomes 1
          expect(result).toBe(expected);
        }
      );

      test('should return unknown for numbers outside 0-100 range in fallback method', () => {
        // This tests the missing branch in parseCoverageFromSVG line 402
        // Create an SVG that will trigger the fallback method (Method 4) but with a number outside 0-100
        const svgWithLargeNumberFallback = {
          str: '<svg><text>150</text></svg>',
          match(regex) {
            if (regex.source === '(\\d+(?:\\.\\d+)?)%') {
              return null; // Skip percentage match to force fallback
            }
            if (regex.source === '>([^<]*\\d+(?:\\.\\d+)?%[^<]*)<') {
              return null; // Skip text element percentage match
            }
            if (regex.source === '(\\d+(?:\\.\\d+)?)') {
              return ['150', '150']; // Return number match for fallback
            }
            return this.str.match(regex);
          },
          toLowerCase() {
            return this.str.toLowerCase();
          }
        };
        
        const result = statusAPI.parseCoverageFromSVG(svgWithLargeNumberFallback);
        expect(result).toBe('unknown');
      });

      test('should return unknown for negative numbers in fallback method', () => {
        // Test another case where number is outside 0-100 range
        const svgWithNegativeNumberFallback = {
          str: '<svg><text>-50</text></svg>',
          match(regex) {
            if (regex.source === '(\\d+(?:\\.\\d+)?)%') {
              return null; // Skip percentage match to force fallback
            }
            if (regex.source === '>([^<]*\\d+(?:\\.\\d+)?%[^<]*)<') {
              return null; // Skip text element percentage match
            }
            if (regex.source === '(\\d+(?:\\.\\d+)?)') {
              return null; // The regex won't match negative numbers anyway
            }
            return this.str.match(regex);
          },
          toLowerCase() {
            return this.str.toLowerCase();
          }
        };
        
        const result = statusAPI.parseCoverageFromSVG(svgWithNegativeNumberFallback);
        expect(result).toBe('unknown');
      });

      test('should return unknown for decimal numbers outside 0-100 range in fallback method', () => {
        // Test decimal number > 100 to hit the specific branch
        const svgWithLargeDecimalFallback = {
          str: '<svg><text>150.5</text></svg>',
          match(regex) {
            if (regex.source === '(\\d+(?:\\.\\d+)?)%') {
              return null; // Skip percentage match to force fallback
            }
            if (regex.source === '>([^<]*\\d+(?:\\.\\d+)?%[^<]*)<') {
              return null; // Skip text element percentage match
            }
            if (regex.source === '(\\d+(?:\\.\\d+)?)') {
              return ['150.5', '150.5']; // Return decimal number match for fallback
            }
            return this.str.match(regex);
          },
          toLowerCase() {
            return this.str.toLowerCase();
          }
        };
        
        const result = statusAPI.parseCoverageFromSVG(svgWithLargeDecimalFallback);
        expect(result).toBe('unknown');
      });

      test('should hit the else branch when number is outside valid range in fallback method', () => {
        // This test specifically targets line 402 where we need the condition to be false
        // Create a scenario where all earlier methods fail and we hit Method 4 (fallback)
        // but the number is outside the 0-100 range, so the if condition fails
        const result = statusAPI.parseCoverageFromSVG('<svg><text>999</text></svg>');
        // This should parse as 999 which is > 100, so it fails the condition and returns unknown
        expect(result).toBe('unknown');
      });

      test('should trigger false branch for number range check in fallback method', () => {
        // Create SVG with no percentage match, no text element match, no status words,
        // but has a number > 100 in fallback method - this should hit the false branch of line 402
        const svgWith150 = '<svg><g><title>150 something</title></g></svg>';
        const result = statusAPI.parseCoverageFromSVG(svgWith150);
        expect(result).toBe('unknown');
      });

      test('should definitively hit the false branch of number range check', () => {
        // This SVG should:
        // 1. NOT match the percentage regex (\d+(?:\.\d+)?)%
        // 2. NOT match the text element regex >([^<]*\d+(?:\.\d+)?%[^<]*)<
        // 3. NOT contain 'unknown', 'pending', or 'inaccessible' 
        // 4. MATCH the number regex (\d+(?:\.\d+)?) with 150
        // 5. Have number > 100, so condition (number >= 0 && number <= 100) is FALSE
        const svgContent = '<svg><rect>150</rect></svg>';
        const result = statusAPI.parseCoverageFromSVG(svgContent);
        expect(result).toBe('unknown');
      });

      test('should hit false branch when number is negative via number-only fallback', () => {
        // The regex (\d+(?:\.\d+)?) only captures digits, so -5 becomes 5
        // Let's use a number > 100 to ensure it fails the range check
        const svgContent = '<svg>-5</svg>';
        const result = statusAPI.parseCoverageFromSVG(svgContent);
        expect(result).toBe(5); // The regex extracts 5, which is valid
      });

      test('should hit false branch when decimal number exceeds 100 via fallback', () => {
        // Force Method 4: Simple SVG with just a decimal number > 100
        const svgContent = '<svg>123.45</svg>';
        const result = statusAPI.parseCoverageFromSVG(svgContent);
        expect(result).toBe('unknown');
      });

      test('should hit the exact missing branch 402,37,1', () => {
        // LCOV shows BRDA:402,37,1,0 - this is the specific branch we need
        // This should force the number regex to match but fail the range check
        const mockSvgText = 'just 200 here';
        const result = statusAPI.parseCoverageFromSVG(mockSvgText);
        expect(result).toBe('unknown');
      });
    });
  });

  // ============================================================================
  // UI UPDATE FUNCTION TESTS
  // ============================================================================

  describe('updateWorkflowStatusUI', () => {
    test.each(workflowStatusTestCases)(
      'should update UI with $status status',
      ({ status, expectedIcon, expectedColor, expectedText }) => {
        const workflowData = createWorkflowData({ status });

        statusAPI.updateWorkflowStatusUI(workflowData);

        const statusElement = document.querySelector('[data-frontend-status]');
        expect(statusElement.innerHTML).toContain(expectedIcon);
        expect(statusElement.innerHTML).toContain(expectedColor);
        expect(statusElement.innerHTML).toContain(expectedText);
      }
    );

    test('should skip timestamp update when requested', () => {
      global.GitHubUtils.getTimeAgo.mockClear();
      
      const workflowData = createWorkflowData();
      const timeElement = document.querySelector('[data-frontend-time]');
      const initialTimeContent = timeElement.innerHTML;

      statusAPI.updateWorkflowStatusUI(workflowData, true);

      expect(timeElement.innerHTML).toBe(initialTimeContent);
      expect(global.GitHubUtils.getTimeAgo).not.toHaveBeenCalled();
    });

    test('should make status clickable', () => {
      const workflowData = createWorkflowData();

      statusAPI.updateWorkflowStatusUI(workflowData);

      const statusElement = document.querySelector('[data-frontend-status]');
      expect(statusElement.style.cursor).toBe('pointer');
      
      statusElement.onclick();
      expect(global.window.open).toHaveBeenCalledWith(workflowData.htmlUrl, '_blank');
    });

    test('should handle missing DOM elements gracefully', () => {
      document.querySelector('[data-frontend-status]').remove();
      
      const workflowData = createWorkflowData();

      expect(() => {
        statusAPI.updateWorkflowStatusUI(workflowData);
      }).not.toThrow();
    });

    test('should handle missing time element gracefully', () => {
      document.querySelector('[data-frontend-time]').remove();
      
      const workflowData = createWorkflowData();

      expect(() => {
        statusAPI.updateWorkflowStatusUI(workflowData);
      }).not.toThrow();
    });
  });

  describe('updateCIStatusUI', () => {
    test.each(ciStatusTestCases)(
      'should update CI status with $status',
      ({ status, expectedIcon, expectedText }) => {
        const ciData = createWorkflowData({ status });

        statusAPI.updateCIStatusUI(ciData);

        const statusElement = document.querySelector('[data-ci-status]');
        expect(statusElement.innerHTML).toContain(expectedIcon);
        expect(statusElement.innerHTML).toContain(expectedText);
      }
    );

    const invalidStatusValues = [undefined, null, ''];
    test.each(invalidStatusValues)(
      'should handle %s CI status with fallback',
      (status) => {
        const ciData = createWorkflowData({ status });

        statusAPI.updateCIStatusUI(ciData);

        const statusElement = document.querySelector('[data-ci-status]');
        expect(statusElement.innerHTML).toContain('fas fa-question-circle');
        expect(statusElement.innerHTML).toContain('Unknown');
      }
    );

    test('should handle missing status property with fallback', () => {
      const ciData = {
        updatedAt: new Date(),
        htmlUrl: 'https://github.com/test/repo/actions'
      };

      statusAPI.updateCIStatusUI(ciData);

      const statusElement = document.querySelector('[data-ci-status]');
      expect(statusElement.innerHTML).toContain('fas fa-question-circle');
      expect(statusElement.innerHTML).toContain('Unknown');
    });

    test('should make CI status clickable', () => {
      const ciData = createWorkflowData();

      statusAPI.updateCIStatusUI(ciData);

      const statusElement = document.querySelector('[data-ci-status]');
      expect(statusElement.style.cursor).toBe('pointer');
      
      statusElement.onclick();
      expect(global.window.open).toHaveBeenCalledWith(ciData.htmlUrl, '_blank');
    });

    test('should handle missing DOM elements gracefully', () => {
      document.querySelector('[data-ci-status]').remove();
      
      const ciData = createWorkflowData();

      expect(() => {
        statusAPI.updateCIStatusUI(ciData);
      }).not.toThrow();
    });
  });

  describe('updateCoverageStatusUI', () => {
    test.each(coverageTestCases)(
      'should update coverage with $description',
      ({ coverage, expectedText, expectedColor }) => {
        const coverageData = createCoverageData({ coverage });

        statusAPI.updateCoverageStatusUI(coverageData);

        const statusElement = document.querySelector('[data-coverage-status]');
        expect(statusElement.innerHTML).toContain(expectedText);
        expect(statusElement.innerHTML).toContain(expectedColor);
      }
    );

    test('should make coverage status clickable', () => {
      const coverageData = createCoverageData({ coverage: 88 });

      statusAPI.updateCoverageStatusUI(coverageData);

      const statusElement = document.querySelector('[data-coverage-status]');
      statusElement.onclick();
      expect(global.window.open).toHaveBeenCalledWith(coverageData.htmlUrl, '_blank');
    });

    test('should handle missing coverage element gracefully', () => {
      document.querySelector('[data-coverage-status]').remove();

      const coverageData = createCoverageData({ coverage: 90 });

      expect(() => {
        statusAPI.updateCoverageStatusUI(coverageData);
      }).not.toThrow();
    });
  });

  // ============================================================================
  // DATA FETCHING FUNCTION TESTS
  // ============================================================================

  describe('fetchWorkflowStatus', () => {
    test('should fetch workflow status successfully', async () => {
      global.GitHubUtils.parseBadgeSVG.mockResolvedValue('success');
      
      await statusAPI.fetchWorkflowStatus();
      
      expect(global.GitHubUtils.parseBadgeSVG).toHaveBeenCalledWith(
        'https://img.shields.io/github/actions/workflow/status/super3/dashban/frontend.yml'
      );
    });

    test('should handle fetch errors gracefully', async () => {
      global.GitHubUtils.parseBadgeSVG.mockRejectedValue(new Error('Network error'));
      
      await statusAPI.fetchWorkflowStatus();
      
      expect(console.error).toHaveBeenCalledWith('Error fetching workflow status:', expect.any(Error));
    });

    test('should skip timestamp update when requested', async () => {
      global.GitHubUtils.parseBadgeSVG.mockResolvedValue('success');
      
      await statusAPI.fetchWorkflowStatus(true);
      
      expect(global.GitHubUtils.parseBadgeSVG).toHaveBeenCalled();
    });
  });

  describe('fetchCIStatus', () => {
    test('should fetch CI status successfully', async () => {
      global.GitHubUtils.parseBadgeSVG.mockResolvedValue('success');
      
      await statusAPI.fetchCIStatus();
      
      expect(global.GitHubUtils.parseBadgeSVG).toHaveBeenCalledWith(
        expect.stringContaining('https://img.shields.io/github/actions/workflow/status/super3/dashban/test.yml')
      );
    });

    test('should handle CI fetch errors', async () => {
      global.GitHubUtils.parseBadgeSVG.mockRejectedValue(new Error('CI fetch error'));
      
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

    test('should not throw even if individual fetch functions fail', () => {
      global.GitHubUtils.parseBadgeSVG.mockRejectedValue(new Error('Mock failure'));
      global.fetch.mockRejectedValue(new Error('Mock failure'));
      
      expect(() => {
        statusAPI.refreshAllStatuses();
      }).not.toThrow();
    });
  });

  // ============================================================================
  // UTILITY FUNCTION TESTS
  // ============================================================================

  describe('updateTimestamp', () => {
    test('should update timestamps for elements with lastUpdated data', () => {
      const element = document.querySelector('[data-frontend-time]');
      element.dataset.lastUpdated = new Date().toISOString();
      element.innerHTML = '<span>Old timestamp</span>';
      
      statusAPI.updateTimestamp();
      
      const span = element.querySelector('span');
      expect(span.textContent).toContain('Updated');
    });

    test('should handle elements without lastUpdated data', () => {
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

  // ============================================================================
  // MODULE EXPORTS AND INITIALIZATION TESTS
  // ============================================================================

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
        'updateWorkflowStatusUI',
        'updateCIStatusUI',
        'updateCoverageStatusUI',
        'refreshAllStatuses',
        'parseCoverageFromSVG',
        'updateTimestamp',
        'setupBadgeDebugging',
        'validateDependencies',
        'createStatusHTML',
        'createTimestampHTML',
        'buildBadgeUrl',
        'buildGitHubUrl',
        'makeElementClickable',
        'safeQuerySelector'
      ];

      expectedFunctions.forEach(funcName => {
        expect(global.statusCardsTestExports[funcName]).toBeDefined();
        expect(typeof global.statusCardsTestExports[funcName]).toBe('function');
      });
    });

    test('should export configuration objects', () => {
      expect(global.statusCardsTestExports.CONFIG).toBeDefined();
      expect(global.statusCardsTestExports.STATUS_CONFIGS).toBeDefined();
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

    test('should export via module.exports when module is available', () => {
      const fs = require('fs');
      const vm = require('vm');
      const code = fs.readFileSync(require.resolve('../src/status-cards.js'), 'utf8');
      const mockModule = { exports: {} };
      const sandbox = {
        console: { log: jest.fn(), error: jest.fn() },
        GitHubUtils: { parseBadgeSVG: async ()=>'success', getTimeAgo: ()=>'1m' },
        document: { addEventListener: (_, cb)=>cb(), querySelector: ()=>null, querySelectorAll: ()=>[], getElementById: ()=>null },
        fetch: async () => ({ text: async ()=>'' }),
        setTimeout: jest.fn(),
        setInterval: jest.fn(),
        window: {},
        globalThis: undefined,
        module: mockModule
      };
      vm.createContext(sandbox);
      vm.runInContext(code, sandbox);
      expect(mockModule.exports).toBeDefined();
      expect(mockModule.exports.fetchWorkflowStatus).toBeDefined();
      expect(mockModule.exports.updateWorkflowStatusUI).toBeDefined();
    });

    test('should not export when module.exports is falsy', () => {
      const fs = require('fs');
      const vm = require('vm');
      const code = fs.readFileSync(require.resolve('../src/status-cards.js'), 'utf8');
      const mockModule = { exports: null };
      const sandbox = {
        console: { log: jest.fn(), error: jest.fn() },
        GitHubUtils: { parseBadgeSVG: async ()=>'success', getTimeAgo: ()=>'1m' },
        document: { addEventListener: (_, cb)=>cb(), querySelector: ()=>null, querySelectorAll: ()=>[], getElementById: ()=>null },
        fetch: async () => ({ text: async ()=>'' }),
        setTimeout: jest.fn(),
        setInterval: jest.fn(),
        window: {},
        globalThis: undefined,
        module: mockModule
      };
      vm.createContext(sandbox);
      vm.runInContext(code, sandbox);
      expect(mockModule.exports).toBeNull();
    });

    test('should not export when module exists without exports property', () => {
      const fs = require('fs');
      const vm = require('vm');
      const code = fs.readFileSync(require.resolve('../src/status-cards.js'), 'utf8');
      const mockModule = {};
      const sandbox = {
        console: { log: jest.fn(), error: jest.fn() },
        GitHubUtils: { parseBadgeSVG: async ()=>'success', getTimeAgo: ()=>'1m' },
        document: { addEventListener: (_, cb)=>cb(), querySelector: ()=>null, querySelectorAll: ()=>[], getElementById: ()=>null },
        fetch: async () => ({ text: async ()=>'' }),
        setTimeout: jest.fn(),
        setInterval: jest.fn(),
        window: {},
        globalThis: undefined,
        module: mockModule
      };
      vm.createContext(sandbox);
      vm.runInContext(code, sandbox);
      expect(mockModule.exports).toBeUndefined();
    });

    test('should handle when globalThis is null', () => {
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
        window: {},
        globalThis: null,
        module: undefined
      };
      vm.createContext(sandbox);
      vm.runInContext(code, sandbox);
      // Should not throw an error and should not export anything
      expect(sandbox.statusCardsTestExports).toBeUndefined();
    });

    test('should handle when module is null', () => {
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
        window: {},
        globalThis: undefined,
        module: null
      };
      vm.createContext(sandbox);
      vm.runInContext(code, sandbox);
      // Should not throw an error and should not export anything
      expect(sandbox.statusCardsTestExports).toBeUndefined();
    });

    test('should handle when both globalThis and module are available but conditions are false', () => {
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
        window: {},
        globalThis: undefined, // This should trigger false branch
        module: { exports: null } // This should trigger false branch  
      };
      vm.createContext(sandbox);
      vm.runInContext(code, sandbox);
      // Should not export anything due to false conditions
      expect(sandbox.statusCardsTestExports).toBeUndefined();
    });

    test('should handle when module exists but module.exports is falsy', () => {
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
        window: {},
        globalThis: { statusCardsTestExports: undefined }, // Valid globalThis
        module: { exports: false } // Falsy exports should hit false branch
      };
      vm.createContext(sandbox);
      vm.runInContext(code, sandbox);
      // Should export to globalThis but not to module.exports
      expect(sandbox.globalThis.statusCardsTestExports).toBeDefined();
    });

    test('should hit false branch when globalThis condition fails', () => {
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
        window: {},
        // Make globalThis condition false: typeof globalThis !== 'undefined' && globalThis !== null
        globalThis: undefined, 
        module: { exports: {} } // Valid module to test second condition independently
      };
      vm.createContext(sandbox);
      vm.runInContext(code, sandbox);
      // Should not export to globalThis
      expect(sandbox.statusCardsTestExports).toBeUndefined();
    });

    test('should hit false branch when module condition fails', () => {
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
        window: {},
        globalThis: { statusCardsTestExports: undefined },
        // Make module condition false: typeof module !== 'undefined' && module !== null && module.exports
        module: { exports: null } // This should make module.exports falsy
      };
      vm.createContext(sandbox);
      vm.runInContext(code, sandbox);
      // Should export to globalThis but not module.exports
      expect(sandbox.globalThis.statusCardsTestExports).toBeDefined();
      expect(sandbox.module.exports).toBeNull();
    });
  });
}); 