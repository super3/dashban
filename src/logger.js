class Logger {
  constructor() {
    this.levels = { debug: 0, info: 1, warn: 2, error: 3 };
    this.currentLevel = 'info';
  }

  setLevel(level) {
    if (this.levels[level] !== undefined) {
      this.currentLevel = level;
    }
  }

  log(level, ...args) {
    if (this.levels[level] >= this.levels[this.currentLevel]) {
      if (level === 'debug' || level === 'info') {
        console.log(...args);
      } else if (level === 'warn') {
        console.warn(...args);
      } else if (level === 'error') {
        console.error(...args);
      }
    }
  }

  debug(...args) { this.log('debug', ...args); }
  info(...args) { this.log('info', ...args); }
  warn(...args) { this.log('warn', ...args); }
  error(...args) { this.log('error', ...args); }
}

const logger = new Logger();

(function(moduleObj, globalObj) {
  if (moduleObj && moduleObj.exports) {
    moduleObj.exports = logger;
  }
  if (globalObj) {
    globalObj.Logger = logger;
  }
})(typeof module !== 'undefined' ? module : null,
   typeof window !== 'undefined' ? window : null);
