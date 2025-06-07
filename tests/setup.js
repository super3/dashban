// Jest setup file for DOM testing

// Mock DOM methods that might not be available in Jest
global.Image = class {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.src = '';
  }
  
  set src(value) {
    this._src = value;
    // Simulate async loading
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
  
  get src() {
    return this._src;
  }
};

// Mock fetch for testing API calls
global.fetch = jest.fn();

// Mock canvas context
global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  drawImage: jest.fn(),
  getImageData: jest.fn(),
  canvas: { width: 100, height: 20 }
}));

// Mock DOMParser
global.DOMParser = class {
  parseFromString(str, type) {
    // Simple mock that returns an object with querySelector
    return {
      querySelectorAll: jest.fn(() => [])
    };
  }
};

// Mock localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  fetch.mockClear();
}); 