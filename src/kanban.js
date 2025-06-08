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
                // Here you could add persistence logic
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
        addTaskForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(addTaskForm);
            const title = formData.get('title');
            const description = formData.get('description');
            const priority = formData.get('priority');
            const category = formData.get('category');
            const column = formData.get('column');
            
            // Generate unique ID
            const id = Date.now();
            
            // Create task element
            const taskElement = createTaskElement(id, title, description, priority, category);
            
            // Add to appropriate column
            document.getElementById(column).appendChild(taskElement);
            
            // Update counts
            updateColumnCounts();
            
            // Hide modal
            hideModal();
        });
    }

    // Create task element
    function createTaskElement(id, title, description, priority, category) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'bg-white border border-gray-200 rounded-md p-3 mb-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer';
        taskDiv.draggable = true;

        // Priority colors
        const priorityColors = {
            'High': 'bg-red-100 text-red-800',
            'Medium': 'bg-yellow-100 text-yellow-800',
            'Low': 'bg-green-100 text-green-800'
        };

        // Category colors
        const categoryColors = {
            'Frontend': 'bg-indigo-100 text-indigo-800',
            'Backend': 'bg-blue-100 text-blue-800',
            'Design': 'bg-purple-100 text-purple-800',
            'Testing': 'bg-red-100 text-red-800',
            'Database': 'bg-green-100 text-green-800',
            'Setup': 'bg-gray-100 text-gray-800'
        };

        // Random user images
        const userImages = [
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
            'https://images.unsplash.com/photo-1494790108755-2616b612b77c?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
            'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
        ];
        
        const randomImage = userImages[Math.floor(Math.random() * userImages.length)];

        taskDiv.innerHTML = `
            <div class="flex items-start justify-between mb-2">
                <h4 class="font-medium text-gray-900 text-sm">${title}</h4>
                <span class="text-xs text-gray-500">#${id}</span>
            </div>
            <p class="text-gray-600 text-sm mb-3">${description}</p>
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <span class="${priorityColors[priority]} text-xs px-2 py-1 rounded-full font-medium">${priority}</span>
                    <span class="${categoryColors[category]} text-xs px-2 py-1 rounded-full font-medium">${category}</span>
                </div>
                <img src="${randomImage}" alt="Assignee" class="w-6 h-6 rounded-full">
            </div>
        `;

        return taskDiv;
    }

    // Update column counts
    function updateColumnCounts() {
        columns.forEach(columnId => {
            const column = document.getElementById(columnId);
            const tasks = column.querySelectorAll('.bg-white.border');
            const countElement = column.parentElement.querySelector('.px-2.py-1.rounded-full');
            
            if (countElement) {
                countElement.textContent = tasks.length;
            }
        });
    }

    // Add keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // ESC to close modal
        if (e.key === 'Escape' && !addTaskModal.classList.contains('hidden')) {
            hideModal();
        }
        
        // Ctrl/Cmd + N to add new task
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (addTaskBtn) {
                addTaskBtn.click();
            }
        }
    });

    // Initialize column counts
    updateColumnCounts();

    // Load and apply saved collapse states
    function loadCollapseStates() {
        const savedStates = localStorage.getItem('kanban-column-states');
        let states;
        
        if (savedStates) {
            states = JSON.parse(savedStates);
        } else {
            // Default state: collapse backlog column by default
            states = {
                'info': 'expanded',
                'backlog': 'collapsed',
                'inprogress': 'expanded', 
                'review': 'expanded',
                'done': 'expanded'
            };
        }
        
        // Temporarily disable transitions to prevent animation on page load
        const style = document.createElement('style');
        style.textContent = `
            .column-expanded, .column-collapsed {
                transition: none !important;
            }
            .column-expanded *, .column-collapsed * {
                transition: none !important;
            }
        `;
        document.head.appendChild(style);
        
        columns.forEach(columnId => {
            if (states[columnId] === 'collapsed') {
                const columnElement = document.querySelector(`[data-column="${columnId}"]`);
                const button = columnElement.querySelector('.column-collapse-btn');
                const icon = button.querySelector('i');
                
                // Apply collapsed state
                columnElement.classList.remove('column-expanded');
                columnElement.classList.add('column-collapsed');
                icon.className = 'fas fa-chevron-right';
                
                // Disable sortable for collapsed column
                const sortableElement = columnElement.querySelector('[id]');
                if (sortableElement && sortableElement._sortable) {
                    sortableElement._sortable.option("disabled", true);
                }
            }
        });
        
        // Re-enable transitions after a brief delay
        setTimeout(() => {
            document.head.removeChild(style);
        }, 100);
    }

    // Save collapse states to localStorage
    function saveCollapseStates() {
        const states = {};
        columns.forEach(columnId => {
            const columnElement = document.querySelector(`[data-column="${columnId}"]`);
            states[columnId] = columnElement.classList.contains('column-collapsed') ? 'collapsed' : 'expanded';
        });
        localStorage.setItem('kanban-column-states', JSON.stringify(states));
    }

    // Load saved states on page load
    loadCollapseStates();

    // Add column collapse/expand functionality
    document.addEventListener('click', function(e) {
        if (e.target.closest('.column-collapse-btn')) {
            const button = e.target.closest('.column-collapse-btn');
            const columnId = button.getAttribute('data-column');
            const columnElement = document.querySelector(`[data-column="${columnId}"]`);
            const icon = button.querySelector('i');
            
            if (columnElement.classList.contains('column-collapsed')) {
                // Expand column
                columnElement.classList.remove('column-collapsed');
                columnElement.classList.add('column-expanded');
                icon.className = 'fas fa-chevron-left';
                
                // Re-enable sortable
                const sortableElement = columnElement.querySelector('[id]');
                if (sortableElement && sortableElement._sortable) {
                    sortableElement._sortable.option("disabled", false);
                }
            } else {
                // Collapse column
                columnElement.classList.remove('column-expanded');
                columnElement.classList.add('column-collapsed');
                icon.className = 'fas fa-chevron-right';
                
                // Disable sortable for collapsed column
                const sortableElement = columnElement.querySelector('[id]');
                if (sortableElement && sortableElement._sortable) {
                    sortableElement._sortable.option("disabled", true);
                }
            }
            
            // Save the new state
            saveCollapseStates();
        }
    });

    // Add task deletion functionality
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-task')) {
            const taskElement = e.target.closest('.bg-white.border');
            if (taskElement && confirm('Are you sure you want to delete this task?')) {
                taskElement.remove();
                updateColumnCounts();
            }
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

    // Add task completion animation for done column
    const doneColumn = document.getElementById('done');
    new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1 && node.classList.contains('bg-white')) {
                        // Add completion animation
                        node.style.transform = 'scale(0.8)';
                        node.style.transition = 'transform 0.3s ease';
                        setTimeout(() => {
                            node.style.transform = 'scale(1)';
                        }, 100);
                    }
                });
            }
        });
    }).observe(doneColumn, { childList: true });

    console.log('Kanban Board initialized successfully!');

    // Export certain functions for testing environments
    const testAPI = {
        createTaskElement,
        updateColumnCounts,
        hideModal,
        addTaskBtn,
        addTaskModal,
        cancelTaskBtn,
        addTaskForm
    };

    // Attach to global for browser/Node access
    if (typeof globalThis !== 'undefined') {
        globalThis.kanbanTestExports = testAPI;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = testAPI;
    }
}); 