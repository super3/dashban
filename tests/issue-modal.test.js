/**
 * Issue Modal Tests
 * 
 * Tests for the issue modal functionality - basic module loading and function availability
 */

describe('Issue Modal', () => {
  beforeEach(() => {
    // Reset DOM and globals
    document.body.innerHTML = '';
    delete window.IssueModal;
    delete window.GitHubUI;

    // Clear module cache and require fresh copy
    jest.resetModules();
    
    // Load the issue modal module
    require('../src/issue-modal.js');

    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  describe('Module Loading', () => {
    test('should load module and export functions to global scope', () => {
      expect(window.IssueModal).toBeDefined();
      expect(typeof window.IssueModal.openIssueModal).toBe('function');
      expect(typeof window.IssueModal.closeIssueModal).toBe('function');
      expect(typeof window.IssueModal.populateIssueModal).toBe('function');
      expect(typeof window.IssueModal.resetEditStates).toBe('function');
      expect(typeof window.IssueModal.setupIssueModalEventHandlers).toBe('function');
    });
  });

  describe('Basic Error Handling', () => {
    test('openIssueModal should handle missing modal gracefully', () => {
      // No modal element exists
      const taskElement = document.createElement('div');
      
      expect(() => {
        window.IssueModal.openIssueModal('123', taskElement);
      }).not.toThrow();
      
      expect(console.error).toHaveBeenCalledWith('Issue modal not found');
    });

    test('setupIssueModalEventHandlers should handle missing elements gracefully', () => {
      // No modal elements exist - this function has proper error handling
      expect(() => {
        window.IssueModal.setupIssueModalEventHandlers();
      }).not.toThrow();
    });
  });
}); 