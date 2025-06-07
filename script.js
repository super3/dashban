// Kanban Board JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize sortable lists for each column
    const columns = ['info', 'backlog', 'inprogress', 'review', 'done'];
    
    columns.forEach(columnId => {
        new Sortable(document.getElementById(columnId), {
            group: 'kanban',
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

    // GitHub workflow status fetcher using SVG text parsing
    async function fetchWorkflowStatus(skipTimeUpdate = false) {
        const owner = 'super3';
        const repo = 'dashban';
        const workflowFile = 'frontend.yml';
        
        try {
            // Use shields.io badge for better reliability
            const badgeUrl = `https://img.shields.io/github/actions/workflow/status/${owner}/${repo}/${workflowFile}`;
            const status = await GitHubUtils.parseBadgeSVG(badgeUrl)
            
            updateWorkflowStatusUI({
                status: status,
                updatedAt: new Date(),
                htmlUrl: `https://github.com/${owner}/${repo}/actions/workflows/${workflowFile}`,
                runNumber: '?'
            }, skipTimeUpdate);
        } catch (error) {
            console.error('Error fetching workflow status:', error);
            updateWorkflowStatusUI({
                status: 'unknown',
                updatedAt: new Date(),
                htmlUrl: `https://github.com/${owner}/${repo}/actions/workflows/${workflowFile}`,
                runNumber: '?'
            }, skipTimeUpdate);
        }
    }


    function updateWorkflowStatusUI(workflowData, skipTimeUpdate = false) {
        const statusElement = document.querySelector('[data-frontend-status]');
        const timeElement = document.querySelector('[data-frontend-time]');
        
        if (!statusElement || !timeElement) return;
        
        const statusConfig = {
            success: { icon: 'fas fa-check-circle', color: 'text-green-500', text: 'Deployed', bgColor: 'text-green-600' },
            failure: { icon: 'fas fa-times-circle', color: 'text-red-500', text: 'Failed', bgColor: 'text-red-600' },
            in_progress: { icon: 'fas fa-spinner fa-spin', color: 'text-blue-500', text: 'Deploying', bgColor: 'text-blue-600' },
            queued: { icon: 'fas fa-clock', color: 'text-yellow-500', text: 'Queued', bgColor: 'text-yellow-600' },
            unknown: { icon: 'fas fa-question-circle', color: 'text-gray-500', text: 'Unknown', bgColor: 'text-gray-600' }
        };
        
        const config = statusConfig[workflowData.status] || statusConfig.unknown;
        
        statusElement.innerHTML = `
            <div class="flex items-center space-x-1">
                <i class="${config.icon} ${config.color} text-sm"></i>
                <span class="text-sm ${config.bgColor} font-medium">${config.text}</span>
            </div>
        `;
        
        // Only update timestamp if not skipping
        if (!skipTimeUpdate) {
            const timeAgo = GitHubUtils.getTimeAgo(workflowData.updatedAt);
            timeElement.innerHTML = `
                <div class="flex items-center space-x-2">
                    <i class="fas fa-sync text-gray-400 text-xs"></i>
                    <span class="text-xs text-gray-500">Updated ${timeAgo}</span>
                </div>
            `;
        }
        
        // Make the status clickable to view on GitHub
        statusElement.style.cursor = 'pointer';
        statusElement.onclick = () => window.open(workflowData.htmlUrl, '_blank');
    }

    // Badge debugging functionality
    function setupBadgeDebugging() {
        const badgeImg = document.getElementById('github-badge');
        const refreshBtn = document.getElementById('refresh-badge');
        
        if (refreshBtn) {
            refreshBtn.addEventListener('click', function() {
                // Refresh the badge with a cache buster
                const baseUrl = 'https://img.shields.io/github/actions/workflow/status/super3/dashban/frontend.yml';
                badgeImg.src = baseUrl + '?t=' + Date.now();
                
                // Also refresh our status detection and timestamp
                refreshAllStatuses();
                
                console.log('Badge refreshed manually');
            });
        }
        
        if (badgeImg) {
            badgeImg.addEventListener('load', function() {
                console.log('Badge loaded successfully');
                console.log('Badge dimensions:', this.naturalWidth, 'x', this.naturalHeight);
                console.log('Badge src:', this.src);
            });
            
            badgeImg.addEventListener('error', function() {
                console.error('Badge failed to load');
            });
        }
    }

    // GitHub CI Tests status fetcher
    async function fetchCIStatus() {
        const owner = 'super3';
        const repo = 'dashban';
        const workflowFile = 'test.yml';
        
        try {
            const badgeUrl = `https://img.shields.io/github/actions/workflow/status/${owner}/${repo}/${workflowFile}`;
            const status = await GitHubUtils.parseBadgeSVG(badgeUrl);
            
            updateCIStatusUI({
                status: status,
                updatedAt: new Date(),
                htmlUrl: `https://github.com/${owner}/${repo}/actions/workflows/${workflowFile}`
            });
        } catch (error) {
            console.error('Error fetching CI status:', error);
            updateCIStatusUI({
                status: 'unknown',
                updatedAt: new Date(),
                htmlUrl: '#'
            });
        }
    }

    // Coverage status fetcher
    async function fetchCoverageStatus() {
        const owner = 'super3';
        const repo = 'dashban';
        
        try {
            // Use shields.io as a proxy to avoid CORS issues
            const badgeUrl = `https://img.shields.io/coveralls/github/${owner}/${repo}/main.svg`;
            const svgText = await fetch(badgeUrl + `?t=${Date.now()}`).then(r => r.text());
            
            // Parse coverage percentage from shields.io SVG
            const coverage = parseCoverageFromSVG(svgText);
            
            updateCoverageStatusUI({
                coverage: coverage,
                updatedAt: new Date(),
                htmlUrl: `https://coveralls.io/github/${owner}/${repo}?branch=main`
            });
        } catch (error) {
            console.error('Error fetching coverage status:', error);
            updateCoverageStatusUI({
                coverage: 'unknown',
                updatedAt: new Date(),
                htmlUrl: `https://coveralls.io/github/${owner}/${repo}?branch=main`
            });
        }
    }

    function parseCoverageFromSVG(svgText) {
        console.log('📊 Parsing coverage SVG...');
        
        // Method 1: Look for percentage patterns in SVG text content
        const percentMatch = svgText.match(/(\d+(?:\.\d+)?)%/);
        if (percentMatch) {
            const percent = parseFloat(percentMatch[1]);
            console.log(`📊 Found coverage percentage: ${percent}%`);
            return percent;
        }
        
        // Method 2: Look for text elements with percentage (shields.io format)
        const textMatch = svgText.match(/>([^<]*\d+(?:\.\d+)?%[^<]*)</);
        if (textMatch) {
            const textContent = textMatch[1];
            const percentInText = textContent.match(/(\d+(?:\.\d+)?)%/);
            if (percentInText) {
                const percent = parseFloat(percentInText[1]);
                console.log(`📊 Found coverage in text: ${percent}%`);
                return percent;
            }
        }
        
        // Method 3: Look for common status words
        const lowerText = svgText.toLowerCase();
        if (lowerText.includes('unknown') || lowerText.includes('pending') || lowerText.includes('inaccessible')) {
            console.log('📊 Coverage status: unknown/pending/inaccessible');
            return 'unknown';
        }
        
        // If no percentage found, log the SVG for debugging
        console.log('📊 No coverage percentage found. SVG content preview:', svgText.substring(0, 200) + '...');
        return 'unknown';
    }

    function updateCIStatusUI(ciData) {
        const statusElement = document.querySelector('[data-ci-status]');
        if (!statusElement) return;
        
        const statusConfig = {
            success: { icon: 'fas fa-check-circle', color: 'text-green-500', text: 'Passing', bgColor: 'text-green-600' },
            failure: { icon: 'fas fa-times-circle', color: 'text-red-500', text: 'Failing', bgColor: 'text-red-600' },
            in_progress: { icon: 'fas fa-spinner fa-spin', color: 'text-blue-500', text: 'Running', bgColor: 'text-blue-600' },
            unknown: { icon: 'fas fa-question-circle', color: 'text-gray-500', text: 'Unknown', bgColor: 'text-gray-600' }
        };
        
        const config = statusConfig[ciData.status] || statusConfig.unknown;
        
        statusElement.innerHTML = `
            <div class="flex items-center space-x-1">
                <i class="${config.icon} ${config.color} text-sm"></i>
                <span class="text-sm ${config.bgColor} font-medium">${config.text}</span>
            </div>
        `;
        
        // Make the status clickable to view on GitHub
        statusElement.style.cursor = 'pointer';
        statusElement.onclick = () => window.open(ciData.htmlUrl, '_blank');
    }

    function updateCoverageStatusUI(coverageData) {
        const statusElement = document.querySelector('[data-coverage-status]');
        if (!statusElement) return;
        
        if (typeof coverageData.coverage === 'number') {
            const percent = coverageData.coverage;
            let color = 'text-red-600';
            
            if (percent >= 90) color = 'text-green-600';
            else if (percent >= 75) color = 'text-yellow-600';
            
            statusElement.innerHTML = `
                <span class="text-sm font-medium ${color}">${percent}%</span>
            `;
        } else {
            statusElement.innerHTML = `
                <span class="text-sm font-medium text-gray-600">Unknown</span>
            `;
        }
        
        // Make the status clickable to view on Coveralls
        statusElement.style.cursor = 'pointer';
        statusElement.onclick = () => window.open(coverageData.htmlUrl, '_blank');
    }

    // GitHub traffic statistics fetcher using badge parsing
    async function fetchTrafficData() {
        const owner = 'super3';
        const repo = 'dashban';
        const badgeUrl = `https://visitor-badge.laobi.icu/badge?page_id=${owner}.${repo}`;

        try {
            const svgText = await fetch(badgeUrl + `&t=${Date.now()}`).then(r => r.text());
            const count = GitHubUtils.parseNumberFromSVG(svgText);

            updateTrafficUI({
                views: count,
                visitors: count
            });
        } catch (error) {
            console.error('Error fetching traffic data:', error);
            updateTrafficUI({
                views: 'unknown',
                visitors: 'unknown'
            });
        }
    }

    function updateTrafficUI(data) {
        const viewsEl = document.querySelector('[data-traffic-views]');
        const visitorsEl = document.querySelector('[data-traffic-visitors]');

        if (viewsEl) {
            viewsEl.textContent = typeof data.views === 'number' ? data.views.toLocaleString() : data.views;
        }
        if (visitorsEl) {
            visitorsEl.textContent = typeof data.visitors === 'number' ? data.visitors.toLocaleString() : data.visitors;
        }
    }

    // Track last update time for status refresh (initialize to 1 minute ago)
    let lastStatusUpdate = new Date(Date.now() - 60 * 1000);
    
    // Function to update the timestamp display
    function updateTimestamp() {
        const timeElement = document.querySelector('[data-frontend-time] span');
        if (timeElement) {
            const timeSinceUpdate = GitHubUtils.getTimeAgo(lastStatusUpdate);
            timeElement.textContent = `Updated ${timeSinceUpdate}`;
        }
    }
    
    // Function to refresh all statuses and update timestamp
    function refreshAllStatuses() {
        lastStatusUpdate = new Date();
        fetchWorkflowStatus();
        fetchCIStatus();
        fetchCoverageStatus();
        fetchTrafficData();
        updateTimestamp();
    }
    
    // Function to refresh statuses without updating timestamp (for initial load)
    function initialStatusLoad() {
        fetchWorkflowStatus(true); // Skip timestamp update on initial load
        fetchCIStatus();
        fetchCoverageStatus();
        fetchTrafficData();
    }
    
    // Fetch all statuses on page load (without updating timestamp)
    initialStatusLoad();
    
    // Setup badge debugging
    setupBadgeDebugging();
    
    // Update timestamp every minute
    setInterval(updateTimestamp, 60 * 1000);
    
    // Refresh all statuses every 5 minutes
    setInterval(refreshAllStatuses, 5 * 60 * 1000);

    // Modal elements
    const addTaskBtn = document.getElementById('addTaskBtn');
    const addTaskModal = document.getElementById('addTaskModal');
    const cancelTaskBtn = document.getElementById('cancelTaskBtn');
    const addTaskForm = document.getElementById('addTaskForm');

    // Task counter
    let taskCounter = 9; // Starting from 9 since we have 8 sample tasks

    // Show modal
    addTaskBtn.addEventListener('click', function() {
        addTaskModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    });

    // Hide modal
    function hideModal() {
        addTaskModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
        addTaskForm.reset();
    }

    cancelTaskBtn.addEventListener('click', hideModal);

    // Hide modal when clicking outside
    addTaskModal.addEventListener('click', function(e) {
        if (e.target === addTaskModal) {
            hideModal();
        }
    });

    // Handle form submission
    addTaskForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const priority = document.getElementById('taskPriority').value;
        const category = document.getElementById('taskCategory').value;

        if (!title || !description) {
            alert('Please fill in all required fields');
            return;
        }

        // Create new task
        const taskId = String(taskCounter).padStart(3, '0');
        const newTask = createTaskElement(taskId, title, description, priority, category);
        
        // Add to backlog column
        const backlogColumn = document.getElementById('backlog');
        backlogColumn.appendChild(newTask);
        
        // Update counter and close modal
        taskCounter++;
        updateColumnCounts();
        hideModal();
    });

    // Create task element
    function createTaskElement(id, title, description, priority, category) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'bg-white border border-gray-200 rounded-lg p-4 cursor-move hover:shadow-md transition-shadow duration-200';
        
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
            addTaskBtn.click();
        }
    });

    // Initialize column counts
    updateColumnCounts();

    // Load and apply saved collapse states
    function loadCollapseStates() {
        const savedStates = localStorage.getItem('kanban-column-states');
        if (savedStates) {
            const states = JSON.parse(savedStates);
            
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
});
