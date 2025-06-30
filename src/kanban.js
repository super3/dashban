// Kanban Board JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check essential dependencies
    if (typeof Sortable === 'undefined') {
        console.error('❌ SortableJS not found. Make sure SortableJS is loaded.');
        return;
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
                        return 'about-card';
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
            const config = window.GitHubAuth?.GITHUB_CONFIG || window.GitHub?.GITHUB_CONFIG || { owner: 'super3', repo: 'dashban' };
            const storageKey = `cardOrder_${config.owner}_${config.repo}`;
            localStorage.setItem(storageKey, JSON.stringify(cardOrder));
        } catch (error) {
            console.warn('Failed to save card order to localStorage:', error);
        }
    }
    
    function loadCardOrder() {
        try {
            // Get repository context for storage key
            const config = window.GitHubAuth?.GITHUB_CONFIG || window.GitHub?.GITHUB_CONFIG || { owner: 'super3', repo: 'dashban' };
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
        
        columns.forEach(columnId => {
            const column = document.getElementById(columnId);
            const savedColumnOrder = savedOrder[columnId];
            
            if (column && savedColumnOrder && savedColumnOrder.length > 0) {
                const cards = column.querySelectorAll('.bg-white.border:not(.animate-pulse)');
                const cardMap = new Map();
                
                // Create a map of card identifiers to card elements
                Array.from(cards).forEach((card, index) => {
                    let id;
                    
                    // Check for special cards first (status/about)
                    if (card.querySelector('[data-frontend-status], [data-ci-status], [data-coverage-status]')) {
                        id = 'status-card';
                    } else {
                        const title = card.querySelector('h4');
                        if (title && title.textContent.includes('About')) {
                            id = 'about-card';
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
                    const card = cardMap.get(cardId);
                    if (card) {
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

    // Initialize sortable lists for each column
    const columns = ['backlog', 'todo', 'inprogress', 'review', 'done'];
    
    columns.forEach(columnId => {
        // All columns share the same group to allow dragging between them
        const group = 'kanban-tasks';
        
        new Sortable(document.getElementById(columnId), {
            group: group,
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: function(evt) {
                updateColumnCounts();
                
                // Save card order after any drag operation
                saveCardOrder();
                
                // Check if a GitHub issue was moved between columns
                const draggedElement = evt.item;
                const issueNumber = draggedElement.getAttribute('data-issue-number');
                const newColumnId = evt.to.id;
                
                if (issueNumber && evt.from.id !== evt.to.id) {
                    // This is a GitHub issue that was moved to a different column
                    console.log(`🏷️ GitHub issue #${issueNumber} moved from ${evt.from.id} to ${newColumnId}`);
                    
                    // Update GitHub issue labels if GitHub integration is available
                    if (window.GitHub && window.GitHub.updateGitHubIssueLabels) {
                        window.GitHub.updateGitHubIssueLabels(issueNumber, newColumnId);
                    }
                    
                    // Close GitHub issue if moved to Done column
                    if (newColumnId === 'done' && window.GitHub && window.GitHub.closeGitHubIssue) {
                        window.GitHub.closeGitHubIssue(issueNumber);
                    }
                }
                
                // Update card indicators for any task moved between columns (both GitHub and local tasks)
                if (evt.from.id !== evt.to.id && window.GitHub && window.GitHub.updateCardIndicators) {
                    window.GitHub.updateCardIndicators(draggedElement, newColumnId);
                }
                
                // Handle About card archiving when moved to/from done column
                if (evt.from.id !== evt.to.id) {
                    const titleElement = draggedElement.querySelector('h4');
                    if (titleElement && titleElement.textContent.includes('About')) {
                        if (newColumnId === 'done') {
                            addArchiveButtonToAboutCard(draggedElement);
                        } else {
                            removeArchiveButtonFromAboutCard(draggedElement);
                        }
                    }
                }

            }
        });
    });

    // Function to add archive button to About card when in done column
    function addArchiveButtonToAboutCard(cardElement) {
        // Check if archive button already exists
        if (cardElement.querySelector('.archive-btn')) {
            return;
        }
        
        // Create archive button
        const archiveButton = document.createElement('button');
        archiveButton.className = 'archive-btn text-red-600 hover:text-red-800 text-sm font-medium px-2 py-1 rounded border border-red-300 hover:bg-red-50 transition-colors duration-200';
        archiveButton.textContent = 'Archive';
        archiveButton.setAttribute('data-card-type', 'about');
        
        // Add button to the card (find a good place to insert it)
        const cardContent = cardElement.querySelector('.mb-3:last-child') || cardElement.querySelector('div:last-child');
        if (cardContent) {
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'mt-3 pt-3 border-t border-gray-200 flex justify-end';
            buttonContainer.appendChild(archiveButton);
            cardElement.appendChild(buttonContainer);
        }
    }

    // Function to remove archive button from About card when moved away from done column
    function removeArchiveButtonFromAboutCard(cardElement) {
        const archiveButton = cardElement.querySelector('.archive-btn[data-card-type="about"]');
        if (archiveButton) {
            const buttonContainer = archiveButton.closest('div');
            if (buttonContainer) {
                buttonContainer.remove();
            }
        }
    }

    // Modal and form elements
    const addTaskBtn = document.getElementById('add-task-btn');
    const addTaskModal = document.getElementById('add-task-modal');
    const cancelTaskBtn = document.getElementById('cancel-task');
    const addTaskForm = document.getElementById('add-task-form');

    // Show modal
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', function(e) {
            // Check if button is disabled
            if (addTaskBtn.disabled) {
                e.preventDefault();
                alert('Please connect to GitHub with a Personal Access Token first to create issues');
                return;
            }
            
            addTaskModal.classList.remove('hidden');
            document.getElementById('task-title').focus();
            
            // Check for missing labels and update warning
            if (window.GitHubLabels && window.GitHubLabels.updateLabelWarning) {
                setTimeout(() => {
                    window.GitHubLabels.updateLabelWarning();
                }, 100); // Small delay to ensure modal is fully shown
            }
        });
    }

    // Hide modal
    function hideModal() {
        addTaskModal.classList.add('hidden');
        addTaskForm.reset();
    }

    if (cancelTaskBtn) {
        cancelTaskBtn.addEventListener('click', hideModal);
    }

    // Handle form submission
    if (addTaskForm) {
        addTaskForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(addTaskForm);
            const title = formData.get('title');
            const description = formData.get('description');
            const priority = formData.get('priority');
            const category = formData.get('category');
            const column = formData.get('column');
            
            // Fallback to backlog if column is null/undefined/empty
            const targetColumn = column || 'backlog';
            
            // Validate required fields
            if (!title || !title.trim()) {
                alert('Please enter an issue title');
                return;
            }
            
            if (!window.GitHub.githubAuth.isAuthenticated || !window.GitHub.githubAuth.accessToken) {
                alert('Please connect to GitHub with a Personal Access Token first to create GitHub issues');
                return;
            }
            
            let taskElement;
            
            try {
                // Disable form during submission
                const submitBtn = addTaskForm.querySelector('button[type="submit"]');
                const originalText = submitBtn ? submitBtn.textContent : 'Add Issue';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Creating GitHub Issue...';
                }
                
                // Convert priority and category to GitHub labels
                const labels = [];
                if (priority && priority !== 'Medium') labels.push(priority.toLowerCase());
                if (category) labels.push(category.toLowerCase());
                
                // Create GitHub issue
                const githubIssue = await window.GitHub.createGitHubIssue(title, description, labels);
                
                if (githubIssue) {
                    // Use GitHub issue data to create the task element
                    taskElement = window.GitHub.createGitHubIssueElement(githubIssue, false);
                    console.log('✅ Created GitHub issue and local task');
                    
                    // Add to appropriate column
                    document.getElementById(targetColumn).appendChild(taskElement);
                    
                    // Update counts
                    updateColumnCounts();
                    
                    // Hide modal and reset form
                    hideModal();
                } else {
                    alert('Failed to create GitHub issue. Please try again.');
                }
                
                // Restore submit button
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
                
            } catch (error) {
                console.error('Error during GitHub issue creation:', error);
                alert('An error occurred while creating the GitHub issue. Please try again.');
                
                // Restore submit button
                const submitBtn = addTaskForm.querySelector('button[type="submit"]');
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Add Issue';
                }
            }
        });
    }

    // Close modal when clicking outside
    if (addTaskModal) {
        addTaskModal.addEventListener('click', (e) => {
            // Check if the click was outside the modal content
            const modalContent = addTaskModal.querySelector('.bg-white.rounded-lg.shadow-xl');
            if (modalContent && !modalContent.contains(e.target)) {
                hideModal();
            }
        });
    }

    // Update column counts
    function updateColumnCounts() {
        columns.forEach(columnId => {
            const column = document.getElementById(columnId);
            const columnWrapper = document.querySelector(`[data-column="${columnId}"]`);
            
            if (column && columnWrapper) {
                // Count only task cards (div elements with the specific classes, excluding skeleton cards)
                const taskCards = column.querySelectorAll('.bg-white.border:not(.animate-pulse)');
                const taskCount = taskCards.length;
                
                // Find the count badge span in this column's header
                const countBadge = columnWrapper.querySelector('.column-header span');
                
                if (countBadge) {
                    countBadge.textContent = taskCount.toString();
                }
            }
        });
    }

    // Expose updateColumnCounts globally for modal use
    window.KanbanBoard = window.KanbanBoard || {};
    window.KanbanBoard.updateColumnCounts = updateColumnCounts;

    // Load collapse states from localStorage
    function loadCollapseStates() {
        // Get repository context for storage key
        const config = window.GitHubAuth?.GITHUB_CONFIG || window.GitHub?.GITHUB_CONFIG || { owner: 'super3', repo: 'dashban' };
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
        const states = {};
        columns.forEach(columnId => {
            const columnWrapper = document.querySelector(`[data-column="${columnId}"]`);
            states[columnId] = columnWrapper ? columnWrapper.classList.contains('column-collapsed') : false;
        });
        // Get repository context for storage key
        const config = window.GitHubAuth?.GITHUB_CONFIG || window.GitHub?.GITHUB_CONFIG || { owner: 'super3', repo: 'dashban' };
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

    // Set up column collapse functionality
    document.addEventListener('click', function(e) {
        const collapseBtn = e.target.closest('.column-collapse-btn');
        if (collapseBtn) {
            const columnId = collapseBtn.getAttribute('data-column');
            if (columnId) {
                toggleColumn(columnId);
            }
        }
        
        // Also handle clicks on column titles
        const columnTitle = e.target.closest('.column-title');
        if (columnTitle) {
            const columnWrapper = columnTitle.closest('[data-column]');
            if (columnWrapper) {
                const columnId = columnWrapper.getAttribute('data-column');
                if (columnId) {
                    toggleColumn(columnId);
                }
            }
        }
    });

    // Add archive functionality for GitHub issues and other cards
    document.addEventListener('click', function(e) {
        if (e.target.closest('.archive-btn')) {
            const archiveBtn = e.target.closest('.archive-btn');
            const issueNumber = archiveBtn.getAttribute('data-issue-number');
            const cardType = archiveBtn.getAttribute('data-card-type');
            const taskElement = archiveBtn.closest('.bg-white.border');
            
            if (issueNumber) {
                // This is a GitHub issue
                window.GitHub.archiveGitHubIssue(issueNumber, taskElement);
            } else if (cardType === 'about') {
                // This is the About card - simply remove it from the board
                taskElement.remove();
                window.updateColumnCounts();
                console.log('📦 About card archived');
            }
        }
    });

    // Add click to open issue modal functionality
    document.addEventListener('click', function(e) {
        // Only handle clicks on issue cards with GitHub issue numbers
        const taskElement = e.target.closest('.bg-white.border');
        if (taskElement && taskElement.getAttribute('data-issue-number')) {
            // Prevent event if clicking on interactive elements
            if (e.target.closest('a, button, .archive-btn') || e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
                return;
            }
            
            const issueNumber = taskElement.getAttribute('data-issue-number');
            if (window.IssueModal && window.IssueModal.openIssueModal) {
                window.IssueModal.openIssueModal(issueNumber, taskElement);
            }
        }
    });

    // Add double-click to edit functionality (kept for non-GitHub cards)
    document.addEventListener('dblclick', function(e) {
        const taskElement = e.target.closest('.bg-white.border');
        if (taskElement && !taskElement.getAttribute('data-issue-number')) {
            // Add edit functionality for local tasks here
            console.log('Edit local task:', taskElement);
        }
    });

    // Task element creation (kept for testing compatibility)
    function createTaskElement(id, title, description, priority, category) {
        const taskElement = document.createElement('div');
        taskElement.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-move';
        taskElement.setAttribute('data-task-id', id);
        
        // Priority badge
        const priorityBadge = priority ? `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(priority)}">${priority}</span>` : '';
        
        // Category badge
        const categoryBadge = category ? `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(category)} ml-2">${category}</span>` : '';
        
        taskElement.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <h3 class="font-semibold text-gray-900 text-sm leading-tight">${title}</h3>
            </div>
            <div class="mb-3">
                ${priorityBadge}${categoryBadge}
                </div>
            ${description ? `<p class="text-gray-600 text-sm mb-3">${description}</p>` : ''}
            <div class="flex items-center text-xs text-gray-500">
                <span><i class="fas fa-user mr-1"></i>Local Task</span>
                <span class="ml-4"><i class="fas fa-calendar mr-1"></i>${new Date().toLocaleDateString()}</span>
            </div>
        `;

        return taskElement;
    }

    function getPriorityColor(priority) {
        const priorityColors = {
            'High': 'bg-red-100 text-red-800',
            'Medium': 'bg-yellow-100 text-yellow-800',
            'Low': 'bg-green-100 text-green-800'
        };
        return priorityColors[priority] || priorityColors['Medium'];
    }

    function getCategoryColor(category) {
        const categoryColors = {
            'Frontend': 'bg-indigo-100 text-indigo-800',
            'Backend': 'bg-blue-100 text-blue-800',
            'Design': 'bg-purple-100 text-purple-800',
            'Testing': 'bg-red-100 text-red-800',
            'Database': 'bg-green-100 text-green-800',
            'Setup': 'bg-gray-100 text-gray-800',
            'Bug': 'bg-red-100 text-red-800',
            'Enhancement': 'bg-purple-100 text-purple-800',
            'Feature': 'bg-blue-100 text-blue-800'
        };
        return categoryColors[category] || categoryColors['Setup'];
    }

    // Initialize components
    updateColumnCounts();
    loadCollapseStates();
    
    // Apply indicators to existing cards in columns (after GitHub integration loads)
    setTimeout(() => {
        if (window.GitHub && window.GitHub.applyReviewIndicatorsToColumn) {
            window.GitHub.applyReviewIndicatorsToColumn();
        }
        if (window.GitHub && window.GitHub.applyCompletedSectionsToColumn) {
            window.GitHub.applyCompletedSectionsToColumn();
        }
        // Update Add Issue button state based on authentication
        if (window.GitHubAuth && window.GitHubAuth.updateAddIssueButtonState) {
            window.GitHubAuth.updateAddIssueButtonState();
        }

        // Apply saved card order after GitHub issues are loaded
        applyCardOrder();
    }, 100);
    
    

    // Export functions to global scope for access from github.js
    window.updateColumnCounts = updateColumnCounts;
    window.getPriorityColor = getPriorityColor;
    window.getCategoryColor = getCategoryColor;
    
    

    // Export certain functions for testing environments
    const testAPI = {
        createTaskElement,
        updateColumnCounts,
        hideModal,
        addTaskBtn,
        addTaskModal,
        cancelTaskBtn,
        addTaskForm,
        // expose internals for testing
        loadCollapseStates,
        saveCollapseStates,
        applyDefaultCollapseStates,
        collapseColumn,
        expandColumn,
        toggleColumn,
        getPriorityColor,
        getCategoryColor,
        // Card order persistence functions
        saveCardOrder,
        loadCardOrder,
        applyCardOrder
    };

    // Attach to global for browser/Node access
    if (typeof globalThis !== 'undefined') {
        globalThis.kanbanTestExports = testAPI;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = testAPI;
    }


}); 