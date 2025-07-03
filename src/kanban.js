// Kanban Board JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check essential dependencies
    if (typeof Sortable === 'undefined') {
        console.error('❌ SortableJS not found. Make sure SortableJS is loaded.');
        return;
    }
    
    // Initialize CardPersistence module
    if (window.CardPersistence && window.CardPersistence.initialize) {
        window.CardPersistence.initialize();
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
                if (window.CardPersistence && window.CardPersistence.saveCardOrder) {
                    window.CardPersistence.saveCardOrder();
                }
                
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
                            if (window.AboutCard && window.AboutCard.addArchiveButtonToAboutCard) {
                                window.AboutCard.addArchiveButtonToAboutCard(draggedElement);
                            }
                        } else {
                            if (window.AboutCard && window.AboutCard.removeArchiveButtonFromAboutCard) {
                                window.AboutCard.removeArchiveButtonFromAboutCard(draggedElement);
                            }
                        }
                    }
                }

            }
        });
    });

    // Get current repository context from CardPersistence module
    function getCurrentRepoContext() {
        if (window.CardPersistence && window.CardPersistence.getCurrentRepoContext) {
            return window.CardPersistence.getCurrentRepoContext();
        }
        // Fallback if module not loaded
        return { owner: 'super3', repo: 'dashban' };
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

    // Delegate column collapse functions to CardPersistence module
    function loadCollapseStates() {
        if (window.CardPersistence && window.CardPersistence.loadCollapseStates) {
            window.CardPersistence.loadCollapseStates();
        }
    }
    
    function applyDefaultCollapseStates() {
        if (window.CardPersistence && window.CardPersistence.applyDefaultCollapseStates) {
            window.CardPersistence.applyDefaultCollapseStates();
        }
    }

    function saveCollapseStates() {
        if (window.CardPersistence && window.CardPersistence.saveCollapseStates) {
            window.CardPersistence.saveCollapseStates();
        }
    }

    function collapseColumn(columnId) {
        if (window.CardPersistence && window.CardPersistence.collapseColumn) {
            window.CardPersistence.collapseColumn(columnId);
        }
    }

    function expandColumn(columnId) {
        if (window.CardPersistence && window.CardPersistence.expandColumn) {
            window.CardPersistence.expandColumn(columnId);
        }
    }

    function toggleColumn(columnId) {
        if (window.CardPersistence && window.CardPersistence.toggleColumn) {
            window.CardPersistence.toggleColumn(columnId);
        }
    }

    // Set up column collapse functionality
    document.addEventListener('click', function(e) {
        const collapseBtn = e.target.closest('.column-collapse-btn');
        if (collapseBtn) {
            const columnId = collapseBtn.getAttribute('data-column');
            if (columnId) {
                if (window.CardPersistence && window.CardPersistence.toggleColumn) {
                    window.CardPersistence.toggleColumn(columnId);
                }
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
                // This is the About card - save archived status and remove from the board
                if (window.AboutCard && window.AboutCard.saveAboutCardArchivedStatus) {
                    window.AboutCard.saveAboutCardArchivedStatus(true);
                }
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
        // Handle null/undefined categories
        if (!category) {
            return '';
        }
        
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
    
    // Initialize CardPersistence module if not already done
    if (window.CardPersistence && window.CardPersistence.initialize) {
        window.CardPersistence.initialize();
    }
    
    // Load collapse states
    if (window.CardPersistence && window.CardPersistence.loadCollapseStates) {
        window.CardPersistence.loadCollapseStates();
    }
    
    // Initialize About Card module
    if (window.AboutCard && window.AboutCard.initialize) {
        window.AboutCard.initialize();
    }
    
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
        if (window.CardPersistence && window.CardPersistence.applyCardOrder) {
            window.CardPersistence.applyCardOrder();
        }
        
        // Check if About card is in done column and add archive button if needed
        if (window.AboutCard && window.AboutCard.checkAboutCardInDoneColumn) {
            window.AboutCard.checkAboutCardInDoneColumn();
        }
        
        // Hide About card if it was previously archived (after repository context is available)
        if (window.AboutCard && window.AboutCard.hideAboutCardIfArchived) {
            window.AboutCard.hideAboutCardIfArchived();
        }
    }, 100);
    
    

    // Export functions to global scope for access from github.js
    window.updateColumnCounts = updateColumnCounts;
    window.getPriorityColor = getPriorityColor;
    window.getCategoryColor = getCategoryColor;
    
    // Export About card restore function globally for easy access
    window.restoreAboutCard = window.AboutCard ? window.AboutCard.restoreAboutCard : function() { console.warn('AboutCard module not loaded'); };
    
    // Debug function to check About card status for all repositories
    window.debugAboutCardStatus = function() {
        console.log('=== About Card Debug Info ===');
        console.log('Current repository context:', getCurrentRepoContext());
        
        // Check all stored About card statuses
        const keys = Object.keys(localStorage).filter(key => key.startsWith('aboutCardArchived_'));
        console.log('Stored About card statuses:');
        keys.forEach(key => {
            const value = localStorage.getItem(key);
            console.log(`  ${key}: ${value}`);
        });
        
        // Check current repository status
        const currentStatus = window.AboutCard ? window.AboutCard.loadAboutCardArchivedStatus() : false;
        console.log('Current repository About card archived status:', currentStatus);
        
        // Check if About card exists in DOM
        const aboutCard = document.querySelector('[data-card-id="about-card"]');
        console.log('About card in DOM:', aboutCard ? 'Found' : 'Not found');
        
        console.log('=== End Debug Info ===');
    };
    
    

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
        // Card order persistence functions (delegated to CardPersistence module)
        saveCardOrder: function() { 
            if (window.CardPersistence && window.CardPersistence.saveCardOrder) {
                return window.CardPersistence.saveCardOrder();
            } else {
                console.warn('CardPersistence module not loaded');
            }
        },
        loadCardOrder: function() { 
            if (window.CardPersistence && window.CardPersistence.loadCardOrder) {
                return window.CardPersistence.loadCardOrder();
            } else {
                console.warn('CardPersistence module not loaded');
                return null;
            }
        },
        applyCardOrder: function() { 
            if (window.CardPersistence && window.CardPersistence.applyCardOrder) {
                return window.CardPersistence.applyCardOrder();
            } else {
                console.warn('CardPersistence module not loaded');
            }
        },
        // About card functions (delegated to AboutCard module)
        checkAboutCardInDoneColumn: window.AboutCard?.checkAboutCardInDoneColumn,
        saveAboutCardArchivedStatus: window.AboutCard?.saveAboutCardArchivedStatus,
        loadAboutCardArchivedStatus: window.AboutCard?.loadAboutCardArchivedStatus,
        hideAboutCardIfArchived: window.AboutCard?.hideAboutCardIfArchived,
        restoreAboutCard: window.AboutCard?.restoreAboutCard,
        getCurrentRepoContext,
        ensureAboutCardExists: window.AboutCard?.ensureAboutCardExists,
        createAboutCardElement: window.AboutCard?.createAboutCardElement,
        addArchiveButtonToAboutCard: window.AboutCard?.addArchiveButtonToAboutCard,
        removeArchiveButtonFromAboutCard: window.AboutCard?.removeArchiveButtonFromAboutCard
    };

    // Attach to global for browser/Node access
    if (typeof globalThis !== 'undefined') {
        globalThis.kanbanTestExports = testAPI;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = testAPI;
    }


}); 