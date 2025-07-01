// Card Persistence Module
// Handles saving and loading card order and column collapse states

(function() {
    'use strict';

    // Module state
    const state = {
        initialized: false
    };

    // Get current repository context
    function getCurrentRepoContext() {
        let context = null;
        let source = 'unknown';
        
        // Try to get from RepoManager first (most reliable)
        if (window.RepoManager?.repoState?.currentRepo) {
            context = window.RepoManager.repoState.currentRepo;
            source = 'RepoManager';
        }
        // Try to get from localStorage directly
        else {
            try {
                const current = localStorage.getItem('dashban_current_repo');
                if (current) {
                    context = JSON.parse(current);
                    source = 'localStorage';
                }
            } catch (error) {
                console.warn('Failed to load current repo from localStorage:', error);
            }
        }
        
        // Fallback to GitHub config
        if (!context && window.GitHubAuth?.GITHUB_CONFIG) {
            context = window.GitHubAuth.GITHUB_CONFIG;
            source = 'GitHubAuth';
        }
        
        // Final fallback
        if (!context) {
            context = { owner: 'super3', repo: 'dashban' };
            source = 'default';
        }
        
        console.log(`📦 Repository context from ${source}:`, context);
        return context;
    }

    // Card order persistence functions
    function saveCardOrder() {
        const cardOrder = {};
        const columns = ['backlog', 'todo', 'inprogress', 'review', 'done'];
        
        columns.forEach(columnId => {
            const column = document.getElementById(columnId);
            if (column) {
                const cards = column.querySelectorAll('.bg-white.border:not(.animate-pulse)');
                cardOrder[columnId] = Array.from(cards).map((card, index) => {
                    // For special cards (status/about), create stable IDs based on content/structure
                    // Check if this is a status card (has data-frontend-status or similar)
                    if (card.querySelector('[data-frontend-status], [data-ci-status], [data-coverage-status]')) {
                        return 'status-card';
                    }
                    // Check if this is an about card (contains "About" in title)
                    const title = card.querySelector('h4');
                    if (title && title.textContent.includes('About')) {
                        return card.getAttribute('data-card-id') || 'about-card';
                    }
                    
                    // For other columns, use GitHub issue number if available, otherwise generate/use task ID
                    return card.getAttribute('data-issue-number') || 
                           card.getAttribute('data-task-id') || 
                           card.getAttribute('data-card-id') || 
                           `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                });
            }
        });
        
        try {
            // Get repository context for storage key
            const config = getCurrentRepoContext();
            const storageKey = `cardOrder_${config.owner}_${config.repo}`;
            localStorage.setItem(storageKey, JSON.stringify(cardOrder));
        } catch (error) {
            console.warn('Failed to save card order to localStorage:', error);
        }
    }
    
    function loadCardOrder() {
        try {
            // Get repository context for storage key
            const config = getCurrentRepoContext();
            const storageKey = `cardOrder_${config.owner}_${config.repo}`;
            const saved = localStorage.getItem(storageKey);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.warn('Failed to load card order from localStorage:', error);
            return null;
        }
    }
    
    function applyCardOrder() {
        const savedOrder = loadCardOrder();
        if (!savedOrder) return;
        
        const columns = ['backlog', 'todo', 'inprogress', 'review', 'done'];
        
        // Create a global map of all cards across all columns for cross-column moves
        const globalCardMap = new Map();
        
        // Find all cards in all columns and map them by their identifiers
        columns.forEach(columnId => {
            const column = document.getElementById(columnId);
            if (column) {
                const cards = column.querySelectorAll('.bg-white.border:not(.animate-pulse)');
                Array.from(cards).forEach(card => {
                    let id;
                    
                    // Check for special cards first (status/about)
                    if (card.querySelector('[data-frontend-status], [data-ci-status], [data-coverage-status]')) {
                        id = 'status-card';
                    } else {
                        const title = card.querySelector('h4');
                        if (title && title.textContent.includes('About')) {
                            id = card.getAttribute('data-card-id') || 'about-card';
                        } else {
                            // For other cards, use existing attributes
                            id = card.getAttribute('data-issue-number') || 
                                 card.getAttribute('data-task-id') || 
                                 card.getAttribute('data-card-id');
                        }
                    }
                    
                    if (id) {
                        globalCardMap.set(id, card);
                    }
                });
            }
        });
        
        columns.forEach(columnId => {
            const column = document.getElementById(columnId);
            const savedColumnOrder = savedOrder[columnId];
            
            if (column && savedColumnOrder && savedColumnOrder.length > 0) {
                const cards = column.querySelectorAll('.bg-white.border:not(.animate-pulse)');
                const cardMap = new Map();
                
                // Create a map of card identifiers to card elements in this column
                Array.from(cards).forEach((card, index) => {
                    let id;
                    
                    // Check for special cards first (status/about)
                    if (card.querySelector('[data-frontend-status], [data-ci-status], [data-coverage-status]')) {
                        id = 'status-card';
                    } else {
                        const title = card.querySelector('h4');
                        if (title && title.textContent.includes('About')) {
                            id = card.getAttribute('data-card-id') || 'about-card';
                        } else {
                            // For other cards, use existing attributes
                            id = card.getAttribute('data-issue-number') || 
                                 card.getAttribute('data-task-id') || 
                                 card.getAttribute('data-card-id');
                        }
                    }
                    
                    if (id) {
                        cardMap.set(id, card);
                    }
                });
                
                // Reorder cards according to saved order
                const fragment = document.createDocumentFragment();
                savedColumnOrder.forEach(cardId => {
                    // First try to find the card in this column
                    let card = cardMap.get(cardId);
                    
                    // If not found in this column, look in other columns (for cross-column moves like About card)
                    if (!card) {
                        card = globalCardMap.get(cardId);
                    }
                    
                    if (card) {
                        // Skip moving GitHub issues that should be in done column based on their state
                        const issueNumber = card.getAttribute('data-issue-number');
                        if (issueNumber && columnId !== 'done') {
                            // Check if this is a closed GitHub issue that should stay in done
                            const issueState = card.getAttribute('data-issue-state');
                            const isClosedIssue = issueState === 'closed';
                            
                            if (isClosedIssue) {
                                // Don't move closed issues out of done column
                                return;
                            }
                        }
                        
                        fragment.appendChild(card);
                        cardMap.delete(cardId);
                    }
                });
                
                // Append any remaining cards that weren't in the saved order
                cardMap.forEach(card => {
                    fragment.appendChild(card);
                });
                
                // Clear the column and append the reordered cards
                const existingCards = column.querySelectorAll('.bg-white.border:not(.animate-pulse)');
                existingCards.forEach(card => card.remove());
                column.appendChild(fragment);
            }
        });
        
        // If status cards exist anywhere, trigger a refresh
        if (window.StatusCards && window.StatusCards.refreshAllStatuses) {
            setTimeout(() => {
                window.StatusCards.refreshAllStatuses();
            }, 100);
        }
    }

    // Column collapse state management
    function loadCollapseStates() {
        // Get repository context for storage key
        const config = getCurrentRepoContext();
        const storageKey = `columnCollapseStates_${config.owner}_${config.repo}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const states = JSON.parse(saved);
                
                // Temporarily disable transitions during initial load
                const style = document.createElement('style');
                style.textContent = '.column-collapsed { transition: none !important; }';
                document.head.appendChild(style);
                
                Object.entries(states).forEach(([columnId, isCollapsed]) => {
                    if (isCollapsed) {
                        collapseColumn(columnId);
                    } else {
                        expandColumn(columnId);
                    }
                });
                
                // Re-enable transitions after a brief delay
                setTimeout(() => {
                    document.head.removeChild(style);
                }, 50);
                
            } catch (e) {
                // Only log errors in non-test environments
                if (typeof jest === 'undefined') {
                    console.error('Error loading collapse states:', e);
                }
                // Clear invalid data
                localStorage.removeItem(storageKey);
                // Fall through to default state
                applyDefaultCollapseStates();
            }
        } else {
            // No saved state - apply default collapse states
            applyDefaultCollapseStates();
        }
    }
    
    // Apply default collapse states when no saved state exists
    function applyDefaultCollapseStates() {
        // Temporarily disable transitions during initial load
        const style = document.createElement('style');
        style.textContent = '.column-collapsed { transition: none !important; }';
        document.head.appendChild(style);
        
        // Collapse the done column by default
        collapseColumn('done');
        
        // Re-enable transitions after a brief delay
        setTimeout(() => {
            document.head.removeChild(style);
        }, 50);
    }

    // Save collapse states to localStorage
    function saveCollapseStates() {
        const columns = ['backlog', 'todo', 'inprogress', 'review', 'done'];
        const states = {};
        columns.forEach(columnId => {
            const columnWrapper = document.querySelector(`[data-column="${columnId}"]`);
            states[columnId] = columnWrapper ? columnWrapper.classList.contains('column-collapsed') : false;
        });
        // Get repository context for storage key
        const config = getCurrentRepoContext();
        const storageKey = `columnCollapseStates_${config.owner}_${config.repo}`;
        localStorage.setItem(storageKey, JSON.stringify(states));
    }

    // Collapse a column
    function collapseColumn(columnId) {
        const columnWrapper = document.querySelector(`[data-column="${columnId}"]`);
        const collapseBtn = document.querySelector(`.column-collapse-btn[data-column="${columnId}"]`);
        const icon = collapseBtn ? collapseBtn.querySelector('i') : null;

        if (columnWrapper && collapseBtn && icon) {
            columnWrapper.classList.remove('column-expanded');
            columnWrapper.classList.add('column-collapsed');
            columnWrapper.style.width = '48px';
            
            // Hide column content and task count badge, but keep title visible (it will be styled vertically by CSS)
            const columnContent = columnWrapper.querySelector('.column-content');
            const taskCountBadge = columnWrapper.querySelector('.column-header span');
            
            if (columnContent) columnContent.style.display = 'none';
            if (taskCountBadge) taskCountBadge.style.display = 'none';
            
            // Update collapse button icon
            icon.className = 'fas fa-chevron-right';
        }
    }

    // Expand a column
    function expandColumn(columnId) {
        const columnWrapper = document.querySelector(`[data-column="${columnId}"]`);
        const collapseBtn = document.querySelector(`.column-collapse-btn[data-column="${columnId}"]`);
        const icon = collapseBtn ? collapseBtn.querySelector('i') : null;

        if (columnWrapper && collapseBtn && icon) {
            columnWrapper.classList.remove('column-collapsed');
            columnWrapper.classList.add('column-expanded');
            columnWrapper.style.width = '';
            
            // Show column content and task count badge (title is always visible)
            const columnContent = columnWrapper.querySelector('.column-content');
            const taskCountBadge = columnWrapper.querySelector('.column-header span');
            
            if (columnContent) columnContent.style.display = '';
            if (taskCountBadge) taskCountBadge.style.display = '';
            
            // Update collapse button icon
            icon.className = 'fas fa-chevron-left';
        }
    }

    // Toggle column collapse state
    function toggleColumn(columnId) {
        const columnWrapper = document.querySelector(`[data-column="${columnId}"]`);
        if (columnWrapper) {
            if (columnWrapper.classList.contains('column-collapsed')) {
                expandColumn(columnId);
            } else {
                collapseColumn(columnId);
            }
            saveCollapseStates();
        }
    }

    // Initialize the module
    function initialize() {
        if (state.initialized) {
            return;
        }

        console.log('💾 Card Persistence module initializing...');
        
        state.initialized = true;
        console.log('💾 Card Persistence module initialized');
    }

    function cleanupClosedIssuesFromStorage() {
        try {
            // Get repository context for storage key
            const config = getCurrentRepoContext();
            const storageKey = `cardOrder_${config.owner}_${config.repo}`;
            const savedOrder = localStorage.getItem(storageKey);
            
            if (!savedOrder) {
                return;
            }
            
            const cardOrder = JSON.parse(savedOrder);
            let hasChanges = false;
            
            // Remove closed GitHub issues from all columns in localStorage
            Object.keys(cardOrder).forEach(columnId => {
                if (columnId !== 'done') {
                    const originalLength = cardOrder[columnId].length;
                    cardOrder[columnId] = cardOrder[columnId].filter(cardId => {
                        // Find the card element to check if it's a closed GitHub issue
                        const cardElement = document.querySelector(`[data-issue-number="${cardId}"]`);
                        if (cardElement) {
                            const issueState = cardElement.getAttribute('data-issue-state');
                            const isClosedIssue = issueState === 'closed';
                            if (isClosedIssue) {
                                hasChanges = true;
                                return false; // Remove from this column
                            }
                        }
                        return true; // Keep in this column
                    });
                }
            });
            
            // Save updated order if there were changes
            if (hasChanges) {
                localStorage.setItem(storageKey, JSON.stringify(cardOrder));
            }
        } catch (error) {
            console.warn('Failed to cleanup closed issues from localStorage:', error);
        }
    }

    // Export functions for use by kanban.js
    const CardPersistence = {
        initialize,
        // Card order functions
        saveCardOrder,
        loadCardOrder,
        applyCardOrder,
        // Column collapse functions
        loadCollapseStates,
        saveCollapseStates,
        applyDefaultCollapseStates,
        collapseColumn,
        expandColumn,
        toggleColumn,
        // Utility functions
        getCurrentRepoContext,
        cleanupClosedIssuesFromStorage
    };

    // Export for browser usage
    window.CardPersistence = CardPersistence;

    // Export for Node.js/Jest testing
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = CardPersistence;
    }
})();