(function(windowObj, moduleObj) {
    function addReviewIndicator(taskElement) {
        if (taskElement.querySelector('.review-indicator')) {
            return;
        }
        const reviewIndicator = document.createElement('div');
        reviewIndicator.className = 'review-indicator mt-3';
        reviewIndicator.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas fa-clock text-gray-400 text-xs"></i>
            <span class="text-xs text-gray-500">Ready for review</span>
        </div>`;
        taskElement.appendChild(reviewIndicator);
    }

    function removeReviewIndicator(taskElement) {
        const indicator = taskElement.querySelector('.review-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function addCompletedSection(taskElement) {
        if (taskElement.querySelector('.completed-section') || taskElement.innerHTML.includes('fas fa-check-circle text-green-500')) {
            return;
        }
        const issueNumber = taskElement.getAttribute('data-issue-number');
        if (!issueNumber) {
            return;
        }
        const completedSection = document.createElement('div');
        completedSection.className = 'completed-section border-t border-gray-200 mt-3 pt-1 -mb-2';
        completedSection.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <i class="fas fa-check-circle text-green-500 text-xs"></i>
                <span class="text-xs text-green-600">Completed</span>
            </div>
            <button class="archive-btn text-gray-400 hover:text-gray-600 p-1 transition-colors" title="Archive issue" data-issue-number="${issueNumber}">
                <i class="fas fa-archive text-xs"></i>
            </button>
        </div>`;
        taskElement.appendChild(completedSection);
    }

    function removeCompletedSection(taskElement) {
        const completedSection = taskElement.querySelector('.completed-section');
        if (completedSection) {
            completedSection.remove();
        }
        const inlineCompletedSections = taskElement.querySelectorAll('.border-t.border-gray-200.mt-3.pt-1.-mb-2');
        inlineCompletedSections.forEach(section => {
            if (section.innerHTML.includes('fas fa-check-circle text-green-500')) {
                section.remove();
            }
        });
    }

    function updateCardIndicators(taskElement, columnId) {
        if (columnId === 'review') {
            addReviewIndicator(taskElement);
            removeCompletedSection(taskElement);
        } else if (columnId === 'done') {
            addCompletedSection(taskElement);
            removeReviewIndicator(taskElement);
        } else {
            removeReviewIndicator(taskElement);
            removeCompletedSection(taskElement);
        }
    }

    function applyReviewIndicatorsToColumn() {
        const reviewColumn = document.getElementById('review');
        if (reviewColumn) {
            const cards = reviewColumn.querySelectorAll('.bg-white.border');
            cards.forEach(card => {
                addReviewIndicator(card);
            });
        }
    }

    function applyCompletedSectionsToColumn() {
        const doneColumn = document.getElementById('done');
        if (doneColumn) {
            const cards = doneColumn.querySelectorAll('.bg-white.border');
            cards.forEach(card => {
                addCompletedSection(card);
            });
        }
    }

    const exports = {
        addReviewIndicator,
        removeReviewIndicator,
        addCompletedSection,
        removeCompletedSection,
        updateCardIndicators,
        applyReviewIndicatorsToColumn,
        applyCompletedSectionsToColumn
    };

    if (moduleObj && moduleObj.exports) {
        moduleObj.exports = exports;
    } else if (windowObj) {
        windowObj.GitHubUI = exports;
    }
})(typeof window !== 'undefined' ? window : null, typeof module !== 'undefined' ? module : null);
