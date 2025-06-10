// Kanban Board JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check essential dependencies
    if (typeof Sortable === 'undefined') {
        console.error('❌ SortableJS not found. Make sure SortableJS is loaded.');
        return;
    }
    
    console.log('📋 Kanban Board initializing...');

    // Initialize sortable lists for each column
    const columns = ['info', 'backlog', 'inprogress', 'review', 'done'];
    
    columns.forEach(columnId => {
        // Info column has its own group to prevent dragging to other columns
        const group = columnId === 'info' ? 'info-cards' : 'kanban-tasks';
        
        new Sortable(document.getElementById(columnId), {
            group: group,
            animation: 150,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            dragClass: 'sortable-drag',
            onEnd: function(evt) {
                updateColumnCounts();
                
                // Check if a GitHub issue was moved between columns
                const draggedElement = evt.item;
                const issueNumber = draggedElement.getAttribute('data-issue-number');
                const newColumnId = evt.to.id;
                
                // Debug logging
                console.log('🔍 Drag end debug:', {
                    issueNumber,
                    hasIssueNumber: !!issueNumber,
                    fromColumn: evt.from.id,
                    toColumn: evt.to.id,
                    columnsDifferent: evt.from.id !== evt.to.id,
                    hasGitHub: !!window.GitHub,
                    hasUpdateFunction: !!(window.GitHub && window.GitHub.updateGitHubIssueLabels),
                    elementAttributes: {
                        'data-issue-number': draggedElement.getAttribute('data-issue-number'),
                        'data-github-issue': draggedElement.getAttribute('data-github-issue'),
                        'data-issue-id': draggedElement.getAttribute('data-issue-id'),
                        'data-task-id': draggedElement.getAttribute('data-task-id')
                    }
                });
                
                if (issueNumber && evt.from.id !== evt.to.id) {
                    // This is a GitHub issue that was moved to a different column
                    console.log(`🏷️ GitHub issue #${issueNumber} moved from ${evt.from.id} to ${newColumnId}`);
                    
                    // Update GitHub issue labels if GitHub integration is available
                    if (window.GitHub && window.GitHub.updateGitHubIssueLabels) {
                        window.GitHub.updateGitHubIssueLabels(issueNumber, newColumnId);
                    } else {
                        console.warn('⚠️ GitHub integration or updateGitHubIssueLabels function not available');
                    }
                } else {
                    console.log('📝 Not a GitHub issue or same column move - skipping label update');
                }
                
                console.log('Task moved from', evt.from.id, 'to', evt.to.id);
            }
        });
    });

    // Modal and form elements
    const addTaskBtn = document.getElementById('add-task-btn');
    const addTaskModal = document.getElementById('add-task-modal');
    const cancelTaskBtn = document.getElementById('cancel-task');
    const addTaskForm = document.getElementById('add-task-form');

    // Show modal
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', function() {
            addTaskModal.classList.remove('hidden');
            document.getElementById('task-title').focus();
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
            const createGitHub = formData.get('createGitHubIssue') === 'on';
            
            // Validate required fields
            if (!title || !title.trim()) {
                alert('Please enter an issue title');
                return;
            }
            
            if (createGitHub && (!window.GitHub.githubAuth.isAuthenticated || !window.GitHub.githubAuth.accessToken)) {
                alert('Please install the GitHub App and add a Personal Access Token first to create real issues');
                return;
            }
            
            let taskElement;
            const issueId = Date.now(); // Default ID for local tasks
            
            try {
                // Disable form during submission
                const submitBtn = addTaskForm.querySelector('button[type="submit"]');
                const originalText = submitBtn ? submitBtn.textContent : 'Add Issue';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = createGitHub ? 'Creating GitHub Issue...' : 'Adding Issue...';
                }
                
                if (createGitHub && window.GitHub.githubAuth.isAuthenticated && window.GitHub.githubAuth.accessToken) {
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
                    } else {
                        // Fallback to local task creation
                        taskElement = createTaskElement(issueId, title, description, priority, category);
                        console.log('⚠️ Created local task only (GitHub creation failed)');
                    }
                } else {
                    // Create local task only
                    taskElement = createTaskElement(issueId, title, description, priority, category);
                    console.log('📝 Created local task');
                }
                
                // Add to appropriate column
                document.getElementById(column).appendChild(taskElement);
                
                // Update counts
                updateColumnCounts();
                
                // Hide modal and reset form
                hideModal();
                
                // Restore submit button
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                }
                
            } catch (error) {
                console.error('Error during task creation:', error);
                alert('An error occurred while creating the task. Please try again.');
                
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
            if (e.target === addTaskModal) {
                hideModal();
            }
        });
    }

    // Task element creation
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

    // Update column counts
    function updateColumnCounts() {
        columns.forEach(columnId => {
            const column = document.getElementById(columnId);
            const header = document.querySelector(`h2[onclick*="${columnId}"]`);
            
            if (column && header) {
                const taskCount = column.children.length;
                const currentText = header.textContent;
                const baseName = currentText.split('(')[0].trim();
                header.textContent = `${baseName} (${taskCount})`;
            }
        });
    }

    // Load collapse states from localStorage
    function loadCollapseStates() {
        const saved = localStorage.getItem('columnCollapseStates');
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
                localStorage.removeItem('columnCollapseStates');
            }
        }
    }

    // Save collapse states to localStorage
    function saveCollapseStates() {
        const states = {};
        columns.forEach(columnId => {
            const columnWrapper = document.querySelector(`[data-column="${columnId}"]`);
            states[columnId] = columnWrapper ? columnWrapper.classList.contains('column-collapsed') : false;
        });
        localStorage.setItem('columnCollapseStates', JSON.stringify(states));
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
    });

    // Add archive functionality for GitHub issues
    document.addEventListener('click', function(e) {
        if (e.target.closest('.archive-btn')) {
            const archiveBtn = e.target.closest('.archive-btn');
            const issueNumber = archiveBtn.getAttribute('data-issue-number');
            const taskElement = archiveBtn.closest('.bg-white.border');
            
            window.GitHub.archiveGitHubIssue(issueNumber, taskElement);
        }
    });

    // Add double-click to edit functionality
    document.addEventListener('dblclick', function(e) {
        const taskElement = e.target.closest('.bg-white.border');
        if (taskElement) {
            // Add edit functionality here
            console.log('Edit task:', taskElement);
        }
    });

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
    
    // Export functions to global scope for access from github.js
    window.updateColumnCounts = updateColumnCounts;
    window.getPriorityColor = getPriorityColor;
    window.getCategoryColor = getCategoryColor;
    
    console.log('✅ Kanban Board initialized successfully!');

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
        collapseColumn,
        expandColumn,
        toggleColumn,
        getPriorityColor,
        getCategoryColor
    };

    // Attach to global for browser/Node access
    if (typeof globalThis !== 'undefined') {
        globalThis.kanbanTestExports = testAPI;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = testAPI;
    }
}); 