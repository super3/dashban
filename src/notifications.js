// Notifications - small, non-blocking toast messages.
//
// Replaces blocking `alert()` dialogs for asynchronous failures (e.g. a GitHub
// API call failing after a card was optimistically moved). Toasts give the user
// feedback without freezing the board, and auto-dismiss.
(function () {
    'use strict';

    const CONTAINER_ID = 'dashban-toast-container';

    const TYPE_CLASSES = {
        error: 'bg-red-600',
        success: 'bg-green-600',
        info: 'bg-gray-800'
    };

    function getContainer() {
        let container = document.getElementById(CONTAINER_ID);
        if (!container) {
            container = document.createElement('div');
            container.id = CONTAINER_ID;
            container.className = 'fixed bottom-4 right-4 z-50 flex flex-col space-y-2';
            document.body.appendChild(container);
        }
        return container;
    }

    function removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }

    function showToast(message, type) {
        const container = getContainer();
        const toast = document.createElement('div');
        const colorClass = TYPE_CLASSES[type] || TYPE_CLASSES.info;

        toast.className = colorClass + ' text-white text-sm px-4 py-3 rounded shadow-lg max-w-sm cursor-pointer';
        toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
        toast.textContent = message;

        // Let the user dismiss it immediately by clicking.
        toast.addEventListener('click', function () {
            removeToast(toast);
        });
        container.appendChild(toast);

        // Auto-dismiss (errors linger a little longer than confirmations).
        const timeout = type === 'error' ? 8000 : 4000;
        setTimeout(function () {
            removeToast(toast);
        }, timeout);

        return toast;
    }

    function showError(message) {
        return showToast(message, 'error');
    }

    function showSuccess(message) {
        return showToast(message, 'success');
    }

    function showInfo(message) {
        return showToast(message, 'info');
    }

    const Notifications = { showToast, showError, showSuccess, showInfo, removeToast };

    window.Notifications = Notifications;

    /* istanbul ignore else: the browser-only path (no CommonJS module) is unreachable under Jest */
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Notifications;
    }
})();
