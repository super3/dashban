// Board Sync - keeps GitHub in step with optimistic board moves.
//
// When a card is dragged between columns, kanban broadcasts a 'card:moved'
// event (it no longer calls the GitHub module directly). This module subscribes
// to that event and performs the GitHub side effects:
//   - refresh the card's review/completed indicators
//   - update the issue's status labels, and close it when moved to Done
//   - if the GitHub sync fails, revert the optimistic move so the board never
//     silently disagrees with GitHub
(function () {
    'use strict';

    // Move a card back to the column it came from after a failed sync.
    function revertCardMove(element, fromColumnId) {
        const fromColumn = document.getElementById(fromColumnId);
        if (element && fromColumn) {
            fromColumn.appendChild(element);
        }
        if (typeof window.updateColumnCounts === 'function') {
            window.updateColumnCounts();
        }
    }

    async function handleCardMoved(payload) {
        if (!payload || !payload.movedBetweenColumns) {
            return;
        }

        const element = payload.element;
        const issueNumber = payload.issueNumber;
        const fromColumnId = payload.fromColumnId;
        const toColumnId = payload.toColumnId;

        // Refresh indicators for any card moved between columns (local or GitHub).
        window.safeInvoke('GitHub', 'updateCardIndicators', element, toColumnId);

        // Only GitHub-backed cards need to be synced to the API.
        if (!issueNumber) {
            return;
        }

        console.log(`🏷️ GitHub issue #${issueNumber} moved from ${fromColumnId} to ${toColumnId}`);

        const labelsOk = await window.safeInvoke('GitHub', 'updateGitHubIssueLabels', issueNumber, toColumnId);

        let closeOk = true;
        if (toColumnId === 'done') {
            closeOk = await window.safeInvoke('GitHub', 'closeGitHubIssue', issueNumber);
        }

        // A function that is wired up returns false on failure; missing functions
        // return undefined (nothing to sync) and must not trigger a revert.
        if (labelsOk === false || closeOk === false) {
            revertCardMove(element, fromColumnId);
        }
    }

    // Guarded so the module still loads when the EventBus has not been included
    // (e.g. an isolated unit test that only exercises handleCardMoved directly).
    if (window.EventBus) {
        window.EventBus.on('card:moved', handleCardMoved);
    }

    const BoardSync = { handleCardMoved, revertCardMove };
    window.BoardSync = BoardSync;

    /* istanbul ignore else: the browser-only path (no CommonJS module) is unreachable under Jest */
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = BoardSync;
    }
})();
