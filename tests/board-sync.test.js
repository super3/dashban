// Tests for the BoardSync module (GitHub side effects + revert on failure)

describe('BoardSync', () => {
    let BoardSync;
    let EventBus;
    let originalConsole;

    function setupColumns() {
        document.body.innerHTML = `
            <div id="todo" class="column-content"></div>
            <div id="inprogress" class="column-content"></div>
            <div id="done" class="column-content"></div>
        `;
    }

    function loadModules({ withEventBus = true } = {}) {
        jest.resetModules();
        delete require.cache[require.resolve('../src/event-bus.js')];
        delete require.cache[require.resolve('../src/board-sync.js')];

        EventBus = require('../src/event-bus.js');
        EventBus.clear();
        if (!withEventBus) {
            delete window.EventBus;
        }
        BoardSync = require('../src/board-sync.js');
    }

    beforeEach(() => {
        originalConsole = global.console;
        global.console = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };
        setupColumns();

        window.GitHub = {
            updateCardIndicators: jest.fn(),
            updateGitHubIssueLabels: jest.fn().mockResolvedValue(true),
            closeGitHubIssue: jest.fn().mockResolvedValue(true)
        };
        window.updateColumnCounts = jest.fn();

        loadModules();
    });

    afterEach(() => {
        global.console = originalConsole;
        delete window.GitHub;
        delete window.updateColumnCounts;
        if (EventBus) EventBus.clear();
        jest.clearAllMocks();
    });

    function movedCard(attrs) {
        const el = document.createElement('div');
        el.className = 'bg-white border';
        if (attrs && attrs.issueNumber) el.setAttribute('data-issue-number', attrs.issueNumber);
        document.getElementById((attrs && attrs.inColumn) || 'inprogress').appendChild(el);
        return el;
    }

    test('ignores a missing payload', async () => {
        await expect(BoardSync.handleCardMoved(undefined)).resolves.toBeUndefined();
        expect(window.GitHub.updateCardIndicators).not.toHaveBeenCalled();
    });

    test('ignores a move within the same column', async () => {
        await BoardSync.handleCardMoved({ movedBetweenColumns: false });
        expect(window.GitHub.updateCardIndicators).not.toHaveBeenCalled();
        expect(window.GitHub.updateGitHubIssueLabels).not.toHaveBeenCalled();
    });

    test('updates indicators but does not call the API for a non-issue card', async () => {
        const el = movedCard({});
        await BoardSync.handleCardMoved({
            element: el, issueNumber: null,
            fromColumnId: 'todo', toColumnId: 'inprogress', movedBetweenColumns: true
        });

        expect(window.GitHub.updateCardIndicators).toHaveBeenCalledWith(el, 'inprogress');
        expect(window.GitHub.updateGitHubIssueLabels).not.toHaveBeenCalled();
    });

    test('updates labels (no close) for an issue moved to a non-done column', async () => {
        const el = movedCard({ issueNumber: '5' });
        await BoardSync.handleCardMoved({
            element: el, issueNumber: '5',
            fromColumnId: 'todo', toColumnId: 'inprogress', movedBetweenColumns: true
        });

        expect(window.GitHub.updateGitHubIssueLabels).toHaveBeenCalledWith('5', 'inprogress');
        expect(window.GitHub.closeGitHubIssue).not.toHaveBeenCalled();
        expect(window.updateColumnCounts).not.toHaveBeenCalled(); // no revert
    });

    test('updates labels and closes the issue when moved to done', async () => {
        const el = movedCard({ issueNumber: '5', inColumn: 'done' });
        await BoardSync.handleCardMoved({
            element: el, issueNumber: '5',
            fromColumnId: 'inprogress', toColumnId: 'done', movedBetweenColumns: true
        });

        expect(window.GitHub.updateGitHubIssueLabels).toHaveBeenCalledWith('5', 'done');
        expect(window.GitHub.closeGitHubIssue).toHaveBeenCalledWith('5');
        expect(window.updateColumnCounts).not.toHaveBeenCalled(); // both succeeded, no revert
    });

    test('reverts the move to the origin column when label sync fails', async () => {
        window.GitHub.updateGitHubIssueLabels.mockResolvedValue(false);
        const el = movedCard({ issueNumber: '5', inColumn: 'inprogress' });

        await BoardSync.handleCardMoved({
            element: el, issueNumber: '5',
            fromColumnId: 'todo', toColumnId: 'inprogress', movedBetweenColumns: true
        });

        expect(document.getElementById('todo').contains(el)).toBe(true);
        expect(window.updateColumnCounts).toHaveBeenCalled();
    });

    test('reverts when closing the issue fails', async () => {
        window.GitHub.closeGitHubIssue.mockResolvedValue(false);
        const el = movedCard({ issueNumber: '5', inColumn: 'done' });

        await BoardSync.handleCardMoved({
            element: el, issueNumber: '5',
            fromColumnId: 'review', toColumnId: 'done', movedBetweenColumns: true
        });

        expect(document.getElementById('review')).toBeNull(); // not in DOM -> nothing to append to
        expect(window.updateColumnCounts).toHaveBeenCalled();
    });

    test('does not revert when the GitHub functions are not wired up (undefined result)', async () => {
        window.GitHub = {}; // no methods -> safeInvoke returns undefined
        const el = movedCard({ issueNumber: '5' });

        await BoardSync.handleCardMoved({
            element: el, issueNumber: '5',
            fromColumnId: 'todo', toColumnId: 'inprogress', movedBetweenColumns: true
        });

        expect(window.updateColumnCounts).not.toHaveBeenCalled();
    });

    describe('revertCardMove', () => {
        test('is a no-op (no throw) when the element or target column is missing', () => {
            delete window.updateColumnCounts;
            expect(() => BoardSync.revertCardMove(null, 'todo')).not.toThrow();
            const orphan = document.createElement('div');
            expect(() => BoardSync.revertCardMove(orphan, 'does-not-exist')).not.toThrow();
        });
    });

    describe('event wiring', () => {
        test('handles card:moved emitted on the EventBus', async () => {
            const el = movedCard({ issueNumber: '9' });

            EventBus.emit('card:moved', {
                element: el, issueNumber: '9',
                fromColumnId: 'todo', toColumnId: 'inprogress', movedBetweenColumns: true
            });
            // Allow the async handler to settle.
            await Promise.resolve();
            await Promise.resolve();

            expect(window.GitHub.updateGitHubIssueLabels).toHaveBeenCalledWith('9', 'inprogress');
        });

        test('loads without throwing when the EventBus is absent', () => {
            expect(() => loadModules({ withEventBus: false })).not.toThrow();
            expect(window.BoardSync).toBeDefined();
        });
    });

    describe('exports', () => {
        test('registers BoardSync on window and via module.exports', () => {
            expect(window.BoardSync).toBeDefined();
            expect(typeof window.BoardSync.handleCardMoved).toBe('function');
            const mod = require('../src/board-sync.js');
            expect(typeof mod.handleCardMoved).toBe('function');
        });
    });
});
