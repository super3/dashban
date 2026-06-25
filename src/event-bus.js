// EventBus - a tiny publish/subscribe hub used to decouple the modules.
//
// Instead of one module reaching directly into another via
// `window.OtherModule.someMethod(...)`, a module can broadcast a domain event
// (e.g. 'card:moved') and any interested module can subscribe. This removes the
// hard, order-dependent coupling between modules and makes the data flow
// explicit and testable.
//
// `safeInvoke` complements this by centralizing the very common
// `if (window.X && window.X.fn) window.X.fn(...)` guard used for the remaining
// direct calls into one place.
(function () {
    'use strict';

    // eventName -> Set<handler>
    const listeners = new Map();

    // Subscribe to an event. Returns an unsubscribe function.
    function on(eventName, handler) {
        if (typeof handler !== 'function') {
            return function noop() {};
        }

        let handlers = listeners.get(eventName);
        if (!handlers) {
            handlers = new Set();
            listeners.set(eventName, handlers);
        }
        handlers.add(handler);

        return function unsubscribe() {
            off(eventName, handler);
        };
    }

    // Remove a specific handler, or every handler for an event when omitted.
    function off(eventName, handler) {
        const handlers = listeners.get(eventName);
        if (!handlers) {
            return;
        }

        if (handler) {
            handlers.delete(handler);
        } else {
            handlers.clear();
        }

        if (handlers.size === 0) {
            listeners.delete(eventName);
        }
    }

    // Broadcast an event to all subscribers. A throwing handler is isolated so
    // one bad subscriber cannot break the others (or the emitter).
    function emit(eventName, payload) {
        const handlers = listeners.get(eventName);
        if (!handlers) {
            return;
        }

        // Iterate a snapshot so handlers may unsubscribe during dispatch.
        Array.from(handlers).forEach(function (handler) {
            try {
                handler(payload);
            } catch (error) {
                console.error('EventBus handler for "' + eventName + '" failed:', error);
            }
        });
    }

    // Remove all subscriptions (used mainly to keep tests isolated).
    function clear() {
        listeners.clear();
    }

    // Safely call window.<namespace>.<method>(...args) only when it exists.
    // Replaces the repeated `if (window.X && window.X.fn)` guards scattered
    // across the codebase with a single, consistent accessor.
    function safeInvoke(namespace, method) {
        const args = Array.prototype.slice.call(arguments, 2);
        const mod = window[namespace];
        if (mod && typeof mod[method] === 'function') {
            return mod[method].apply(mod, args);
        }
        return undefined;
    }

    const EventBus = { on, off, emit, clear, safeInvoke };

    window.EventBus = EventBus;
    window.safeInvoke = safeInvoke;

    /* istanbul ignore else: the browser-only path (no CommonJS module) is unreachable under Jest */
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = EventBus;
    }
})();
