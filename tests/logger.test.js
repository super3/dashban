/**
 * Tests for src/logger.js — the console.log gate that keeps the browser console
 * quiet unless window.DASHBAN_DEBUG is set.
 */
describe('logger (console.log gate)', () => {
    let originalLog;
    let originalError;
    let originalWarn;

    beforeEach(() => {
        jest.resetModules();
        originalLog = console.log;
        originalError = console.error;
        originalWarn = console.warn;
        delete globalThis.DASHBAN_DEBUG;
    });

    afterEach(() => {
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
        delete globalThis.DASHBAN_DEBUG;
    });

    test('suppresses console.log by default (debugging off)', () => {
        const sink = jest.fn();
        console.log = sink; // stand in for the real console.log
        require('../src/logger.js'); // wraps console.log, capturing `sink` as the original

        console.log('hidden');

        expect(sink).not.toHaveBeenCalled();
    });

    test('forwards console.log when DASHBAN_DEBUG is enabled', () => {
        const sink = jest.fn();
        console.log = sink;
        require('../src/logger.js');

        globalThis.DASHBAN_DEBUG = true;
        console.log('shown', 1);

        expect(sink).toHaveBeenCalledWith('shown', 1);
    });

    test('leaves console.error and console.warn untouched', () => {
        const errSink = jest.fn();
        const warnSink = jest.fn();
        console.error = errSink;
        console.warn = warnSink;
        require('../src/logger.js');

        console.error('boom');
        console.warn('careful');

        expect(errSink).toHaveBeenCalledWith('boom');
        expect(warnSink).toHaveBeenCalledWith('careful');
    });
});
