// Tests for the Notifications (toast) module

describe('Notifications', () => {
    let Notifications;
    let originalConsole;

    beforeEach(() => {
        originalConsole = global.console;
        global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
        document.body.innerHTML = '';

        jest.resetModules();
        delete require.cache[require.resolve('../src/notifications.js')];
        Notifications = require('../src/notifications.js');
    });

    afterEach(() => {
        global.console = originalConsole;
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    function container() {
        return document.getElementById('dashban-toast-container');
    }

    test('showError renders a red alert toast with the message', () => {
        const toast = Notifications.showError('Something failed');

        expect(container()).not.toBeNull();
        expect(toast.textContent).toBe('Something failed');
        expect(toast.className).toContain('bg-red-600');
        expect(toast.getAttribute('role')).toBe('alert');
        expect(container().contains(toast)).toBe(true);
    });

    test('showSuccess renders a green status toast', () => {
        const toast = Notifications.showSuccess('Saved');
        expect(toast.className).toContain('bg-green-600');
        expect(toast.getAttribute('role')).toBe('status');
    });

    test('showInfo renders a neutral status toast', () => {
        const toast = Notifications.showInfo('Heads up');
        expect(toast.className).toContain('bg-gray-800');
        expect(toast.getAttribute('role')).toBe('status');
    });

    test('an unknown type falls back to the info styling', () => {
        const toast = Notifications.showToast('msg', 'mystery');
        expect(toast.className).toContain('bg-gray-800');
    });

    test('reuses the single toast container across multiple toasts', () => {
        Notifications.showError('one');
        Notifications.showSuccess('two');

        const containers = document.querySelectorAll('#dashban-toast-container');
        expect(containers.length).toBe(1);
        expect(containers[0].children.length).toBe(2);
    });

    test('clicking a toast dismisses it', () => {
        const toast = Notifications.showInfo('dismiss me');
        expect(container().contains(toast)).toBe(true);

        toast.dispatchEvent(new Event('click'));

        expect(container().contains(toast)).toBe(false);
    });

    test('error toasts auto-dismiss after 8s, others after 4s', () => {
        jest.useFakeTimers();

        const err = Notifications.showError('err');
        const ok = Notifications.showSuccess('ok');

        jest.advanceTimersByTime(4000);
        expect(container().contains(ok)).toBe(false);
        expect(container().contains(err)).toBe(true);

        jest.advanceTimersByTime(4000);
        expect(container().contains(err)).toBe(false);
    });

    test('removeToast is safe for null and already-detached toasts', () => {
        expect(() => Notifications.removeToast(null)).not.toThrow();

        const detached = document.createElement('div');
        expect(() => Notifications.removeToast(detached)).not.toThrow();
    });

    describe('exports', () => {
        test('registers Notifications on window', () => {
            expect(window.Notifications).toBeDefined();
            expect(typeof window.Notifications.showError).toBe('function');
        });

        test('is exported for Node/Jest via module.exports', () => {
            const mod = require('../src/notifications.js');
            expect(typeof mod.showToast).toBe('function');
        });
    });
});
