// Quiets Dashban's routine console output.
//
// The app modules log a lot of informational/lifecycle detail via console.log.
// Loading this script first (before the other src modules) replaces console.log
// with a version that stays silent unless debugging is explicitly enabled by
// setting `window.DASHBAN_DEBUG = true` (e.g. from devtools). console.error and
// console.warn are left untouched, so genuine problems still surface.
(function () {
    'use strict';

    const original = console.log.bind(console);
    console.log = function () {
        if (globalThis.DASHBAN_DEBUG) {
            original.apply(null, arguments);
        }
    };
})();
