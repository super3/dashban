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
        
        // Create the completed section HTML (same style as GitHub issues)
        const completedSection = document.createElement('div');
        completedSection.className = 'completed-section border-t border-gray-200 mt-3 pt-1 -mb-2';
        completedSection.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-check-circle text-green-500 text-xs"></i>
                    <span class="text-xs text-green-600">Completed</span>
                </div>
                <button class="archive-btn text-gray-400 hover:text-gray-600 p-1 transition-colors" 
                        title="Archive card" 
                        data-card-type="about">
                    <i class="fas fa-archive text-xs"></i>
                </button>
            </div>
        `;
        
        // Add to the end of the card
        cardElement.appendChild(completedSection);
    }

    // Function to remove archive button from About card when moved away from done column
    function removeArchiveButtonFromAboutCard(cardElement) {
        const completedSection = cardElement.querySelector('.completed-section');
        if (completedSection) {
            // Check if this is the About card's completed section
            const archiveButton = completedSection.querySelector('.archive-btn[data-card-type="about"]');
            if (archiveButton) {
                completedSection.remove();
            }
        }
    }
    
    // Function to check if About card is in done column and add archive button
    function checkAboutCardInDoneColumn() {
        const doneColumn = document.getElementById('done');
        if (doneColumn) {
            const cards = doneColumn.querySelectorAll('.bg-white.border');
            cards.forEach(card => {
                const titleElement = card.querySelector('h4');
                if (titleElement && titleElement.textContent.includes('About')) {
                    // Check if it has the data-card-id attribute (it should)
                    if (card.getAttribute('data-card-id') === 'about-card' || !card.getAttribute('data-issue-number')) {
                        addArchiveButtonToAboutCard(card);
                    }
                }
            });
        }
    }

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

    // Save About card archived status to localStorage
    function saveAboutCardArchivedStatus(isArchived) {
        try {
            // Get repository context for storage key
            const config = getCurrentRepoContext();
            const storageKey = `aboutCardArchived_${config.owner}_${config.repo}`;
            localStorage.setItem(storageKey, JSON.stringify(isArchived));
            console.log(`📦 Saved About card archived status for ${config.owner}/${config.repo}: ${isArchived}`);
        } catch (error) {
            console.warn('Failed to save About card archived status to localStorage:', error);
        }
    }

    // Load About card archived status from localStorage
    function loadAboutCardArchivedStatus() {
        try {
            // Get repository context for storage key
            const config = getCurrentRepoContext();
            const storageKey = `aboutCardArchived_${config.owner}_${config.repo}`;
            const saved = localStorage.getItem(storageKey);
            const result = saved ? JSON.parse(saved) : false;
            console.log(`📦 Loaded About card archived status for ${config.owner}/${config.repo}: ${result}`);
            return result;
        } catch (error) {
            console.warn('Failed to load About card archived status from localStorage:', error);
            return false;
        }
    }

    // Hide About card if it was archived
    function hideAboutCardIfArchived() {
        const isArchived = loadAboutCardArchivedStatus();
        console.log('📦 Checking if About card should be hidden. Archived status:', isArchived);
        
        if (isArchived) {
            const aboutCard = document.querySelector('[data-card-id="about-card"]');
            if (aboutCard) {
                aboutCard.remove();
                window.updateColumnCounts();
                console.log('📦 About card hidden (was previously archived)');
            } else {
                console.log('📦 About card was marked as archived but not found in DOM');
            }
        } else {
            console.log('📦 About card should be visible');
            // If not archived and About card doesn't exist, ensure it exists
            ensureAboutCardExists();
        }
    }

    // Ensure About card exists if it should be visible
    function ensureAboutCardExists() {
        const aboutCard = document.querySelector('[data-card-id="about-card"]');
        if (!aboutCard) {
            console.log('📦 About card missing but should be visible - creating it');
            // Create About card and add it to todo column (it will be moved by applyCardOrder if needed)
            const todoColumn = document.getElementById('todo');
            if (todoColumn) {
                const newAboutCard = createAboutCardElement();
                todoColumn.appendChild(newAboutCard);
                window.updateColumnCounts();
                console.log('📦 About card recreated in Todo column');
            }
        }
    }

    // Create About card element
    function createAboutCardElement() {
        const aboutCard = document.createElement('div');
        aboutCard.className = 'bg-white border border-gray-200 rounded-lg p-4 cursor-move hover:shadow-md transition-shadow duration-200';
        aboutCard.setAttribute('data-card-id', 'about-card');
        aboutCard.innerHTML = `
            <div class="flex items-start justify-between mb-3">
                <div>
                    <h4 class="font-medium text-gray-900 mb-1">About</h4>
                </div>
                <span class="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">INFO</span>
            </div>
            
            <!-- Horizontal Separator -->
            <div class="border-b border-gray-200 mb-3"></div>
            
            <!-- Project Description -->
            <div class="mb-3">
                <p class="text-sm text-gray-700">
                    <strong>Dashban</strong> combines kanban project management with a realtime status dashboards in one clean interface.
                </p>
            </div>
            
            <!-- Features List -->
            <div class="mb-3">
                <ul class="text-sm text-gray-600 space-y-1">
                    <li class="flex items-center space-x-2">
                        <i class="fas fa-check text-green-500 text-xs"></i>
                        <span>Drag & drop task management</span>
                    </li>
                    <li class="flex items-center space-x-2">
                        <i class="fas fa-check text-green-500 text-xs"></i>
                        <span>Code and deployment monitoring</span>
                    </li>
                    <li class="flex items-center space-x-2">
                        <i class="fas fa-check text-green-500 text-xs"></i>
                        <span>Open-source (MIT License)</span>
                    </li>
                </ul>
            </div>
            
            <!-- Buttons Row -->
            <div class="flex space-x-2">
                <!-- Fork Button -->
                <a href="https://github.com/super3/dashban" target="_blank" class="flex items-center justify-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex-1">
                    <i class="fab fa-github"></i>
                    <span>Fork</span>
                </a>
                
                <!-- Give Feedback Button -->
                <a href="https://github.com/super3/dashban/issues/new?template=feedback.md&title=[Feedback]%20" target="_blank" class="flex items-center justify-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex-1">
                    <i class="fas fa-comment"></i>
                    <span>Feedback</span>
                </a>
            </div>
        `;
        return aboutCard;
    }

    // Restore About card (unarchive)
    function restoreAboutCard() {
        // Clear the archived status
        saveAboutCardArchivedStatus(false);
        
        // Check if About card already exists
        const existingAboutCard = document.querySelector('[data-card-id="about-card"]');
        if (existingAboutCard) {
            console.log('📦 About card is already visible');
            return;
        }
        
        // Create About card element using the common function
        const aboutCard = createAboutCardElement();
        
        // Add to todo column by default
        const todoColumn = document.getElementById('todo');
        if (todoColumn) {
            todoColumn.appendChild(aboutCard);
            window.updateColumnCounts();
            console.log('📦 About card restored to Todo column');
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
                // This is the About card - save archived status and remove from the board
                saveAboutCardArchivedStatus(true);
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
        
        // Check if About card is in done column and add archive button if needed
        checkAboutCardInDoneColumn();
        
        // Hide About card if it was previously archived (after repository context is available)
        hideAboutCardIfArchived();
    }, 100);
    
    

    // Export functions to global scope for access from github.js
    window.updateColumnCounts = updateColumnCounts;
    window.getPriorityColor = getPriorityColor;
    window.getCategoryColor = getCategoryColor;
    
    // Export About card restore function globally for easy access
    window.restoreAboutCard = restoreAboutCard;
    
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
        const currentStatus = loadAboutCardArchivedStatus();
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
        // Card order persistence functions
        saveCardOrder,
        loadCardOrder,
        applyCardOrder,
        // About card functions
        checkAboutCardInDoneColumn,
        saveAboutCardArchivedStatus,
        loadAboutCardArchivedStatus,
        hideAboutCardIfArchived,
        restoreAboutCard,
        getCurrentRepoContext,
        ensureAboutCardExists,
        createAboutCardElement,
        addArchiveButtonToAboutCard,
        removeArchiveButtonFromAboutCard
    };

    // Attach to global for browser/Node access
    if (typeof globalThis !== 'undefined') {
        globalThis.kanbanTestExports = testAPI;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = testAPI;
    }


}); 