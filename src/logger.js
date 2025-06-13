class LoggerClass {
  constructor() {
    this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
    this.currentLevel = 'info';
    this.silent =
      typeof process !== 'undefined' && process.env.NODE_ENV === 'test';
  }

  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.currentLevel = level;
    }
  }

  log(level, ...args) {
    if (!this.silent && this.levels[level] >= this.levels[this.currentLevel]) {
      if (level === 'debug' || level === 'info') {
        console.log(...args);
      } else if (level === 'warn') {
        console.warn(...args);
      } else if (level === 'error') {
        console.error(...args);
      }
    }
  }

  setSilent(value) {
    this.silent = Boolean(value);
  }

  debug(...args) { this.log('debug', ...args); }
  info(...args) { this.log('info', ...args); }
  warn(...args) { this.log('warn', ...args); }
  error(...args) { this.log('error', ...args); }
}

// Create a single instance
const loggerInstance = new LoggerClass();

// Create the global Logger object
const Logger = {
  debug: (...args) => loggerInstance.debug(...args),
  info: (...args) => loggerInstance.info(...args),
  warn: (...args) => loggerInstance.warn(...args),
  error: (...args) => loggerInstance.error(...args),
  setLevel: (level) => loggerInstance.setLevel(level),
  setSilent: (value) => loggerInstance.setSilent(value)
};

// Export for both Node.js and browser environments
(function(moduleObj, globalObj) {
  if (moduleObj && moduleObj.exports) {
    moduleObj.exports = Logger;
  }
  if (globalObj) {
    globalObj.Logger = Logger;
  }
})(typeof module !== 'undefined' ? module : null,
   typeof window !== 'undefined' ? window : null);
