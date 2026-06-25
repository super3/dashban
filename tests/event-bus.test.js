// Tests for the EventBus pub/sub hub and safeInvoke helper

describe('EventBus', () => {
    let EventBus;
    let originalConsole;

    beforeEach(() => {
        originalConsole = global.console;
        global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

        jest.resetModules();
        delete require.cache[require.resolve('../src/event-bus.js')];
        EventBus = require('../src/event-bus.js');
        EventBus.clear();
    });

    afterEach(() => {
        global.console = originalConsole;
        EventBus.clear();
        jest.clearAllMocks();
    });

    describe('on / emit', () => {
        test('delivers the payload to a subscribed handler', () => {
            const handler = jest.fn();
            EventBus.on('card:moved', handler);

            EventBus.emit('card:moved', { issueNumber: '1' });

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith({ issueNumber: '1' });
        });

        test('delivers to every subscriber of the same event', () => {
            const a = jest.fn();
            const b = jest.fn();
            EventBus.on('evt', a);
            EventBus.on('evt', b);

            EventBus.emit('evt', 42);

            expect(a).toHaveBeenCalledWith(42);
            expect(b).toHaveBeenCalledWith(42);
        });

        test('emitting an event with no subscribers is a no-op', () => {
            expect(() => EventBus.emit('nobody-listening', {})).not.toThrow();
        });

        test('a non-function handler is ignored and returns a usable unsubscribe', () => {
            const unsubscribe = EventBus.on('evt', null);
            expect(typeof unsubscribe).toBe('function');
            expect(() => unsubscribe()).not.toThrow();
            expect(() => EventBus.emit('evt', {})).not.toThrow();
        });

        test('isolates a throwing handler so others still run', () => {
            const boom = () => { throw new Error('handler boom'); };
            const ok = jest.fn();
            EventBus.on('evt', boom);
            EventBus.on('evt', ok);

            EventBus.emit('evt', 'x');

            expect(ok).toHaveBeenCalledWith('x');
            expect(console.error).toHaveBeenCalledWith(
                'EventBus handler for "evt" failed:',
                expect.any(Error)
            );
        });
    });

    describe('unsubscribe / off', () => {
        test('the function returned by on() removes that handler', () => {
            const handler = jest.fn();
            const unsubscribe = EventBus.on('evt', handler);

            unsubscribe();
            EventBus.emit('evt', {});

            expect(handler).not.toHaveBeenCalled();
        });

        test('off(event, handler) removes only that handler', () => {
            const a = jest.fn();
            const b = jest.fn();
            EventBus.on('evt', a);
            EventBus.on('evt', b);

            EventBus.off('evt', a);
            EventBus.emit('evt', {});

            expect(a).not.toHaveBeenCalled();
            expect(b).toHaveBeenCalled();
        });

        test('off(event) with no handler clears every handler for the event', () => {
            const a = jest.fn();
            const b = jest.fn();
            EventBus.on('evt', a);
            EventBus.on('evt', b);

            EventBus.off('evt');
            EventBus.emit('evt', {});

            expect(a).not.toHaveBeenCalled();
            expect(b).not.toHaveBeenCalled();
        });

        test('off() on an unknown event is a no-op', () => {
            expect(() => EventBus.off('never-registered', jest.fn())).not.toThrow();
        });
    });

    describe('clear', () => {
        test('removes all subscriptions', () => {
            const a = jest.fn();
            const b = jest.fn();
            EventBus.on('one', a);
            EventBus.on('two', b);

            EventBus.clear();
            EventBus.emit('one', {});
            EventBus.emit('two', {});

            expect(a).not.toHaveBeenCalled();
            expect(b).not.toHaveBeenCalled();
        });
    });

    describe('safeInvoke', () => {
        afterEach(() => {
            delete window.DemoModule;
        });

        test('calls window.<namespace>.<method> with the given args and returns the result', () => {
            window.DemoModule = { greet: jest.fn((name) => `hi ${name}`) };

            const result = EventBus.safeInvoke('DemoModule', 'greet', 'sam');

            expect(window.DemoModule.greet).toHaveBeenCalledWith('sam');
            expect(result).toBe('hi sam');
        });

        test('returns undefined when the module is absent', () => {
            delete window.DemoModule;
            expect(EventBus.safeInvoke('DemoModule', 'greet', 'sam')).toBeUndefined();
        });

        test('returns undefined when the method is not a function', () => {
            window.DemoModule = { greet: 'not-a-function' };
            expect(EventBus.safeInvoke('DemoModule', 'greet')).toBeUndefined();
        });

        test('is also exposed as window.safeInvoke', () => {
            window.DemoModule = { ping: jest.fn(() => 'pong') };
            expect(window.safeInvoke('DemoModule', 'ping')).toBe('pong');
        });
    });

    describe('exports', () => {
        test('registers EventBus and safeInvoke on window', () => {
            expect(window.EventBus).toBeDefined();
            expect(typeof window.EventBus.emit).toBe('function');
            expect(typeof window.safeInvoke).toBe('function');
        });

        test('is exported for Node/Jest via module.exports', () => {
            const mod = require('../src/event-bus.js');
            expect(typeof mod.on).toBe('function');
            expect(typeof mod.emit).toBe('function');
            expect(typeof mod.safeInvoke).toBe('function');
        });
    });
});
