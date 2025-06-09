// Kanban Board JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Check essential dependencies
    if (typeof Sortable === 'undefined') {
        console.error('❌ SortableJS not found. Make sure SortableJS is loaded.');
        return;
    }
    
    console.log('📋 Kanban Board initializing...');

    // GitHub App configuration
    const GITHUB_CONFIG = {
        appId: '1385203', // Replace with your GitHub App ID
        redirectUri: window.location.origin + window.location.pathname,
        apiBaseUrl: 'https://api.github.com',
        owner: 'super3',
        repo: 'dashban',
        installationUrl: 'https://github.com/apps/dashban' // Replace with your app name
    };

    // GitHub App authentication state
    let githubAuth = {
        isAuthenticated: false,
        installationId: null,
        accessToken: null,
        user: null
    };
    
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

    // GitHub Token Modal Functions
    const gitHubTokenModal = document.getElementById('github-token-modal');
    const gitHubTokenForm = document.getElementById('github-token-form');
    const gitHubTokenInput = document.getElementById('github-token-input');
    const cancelGitHubTokenBtn = document.getElementById('cancel-github-token');
    const toggleTokenVisibilityBtn = document.getElementById('toggle-token-visibility');
    const tokenEyeIcon = document.getElementById('token-eye-icon');

    function showGitHubTokenModal() {
        if (gitHubTokenModal) {
            gitHubTokenModal.classList.remove('hidden');
            if (gitHubTokenInput) {
                setTimeout(() => gitHubTokenInput.focus(), 100);
            }
        }
    }

    function hideGitHubTokenModal() {
        if (gitHubTokenModal) {
            gitHubTokenModal.classList.add('hidden');
            if (gitHubTokenForm) {
                gitHubTokenForm.reset();
            }
            // Reset password visibility
            if (gitHubTokenInput && tokenEyeIcon) {
                gitHubTokenInput.type = 'password';
                tokenEyeIcon.className = 'fas fa-eye';
            }
        }
    }

    // Toggle token visibility
    if (toggleTokenVisibilityBtn && gitHubTokenInput && tokenEyeIcon) {
        toggleTokenVisibilityBtn.addEventListener('click', () => {
            if (gitHubTokenInput.type === 'password') {
                gitHubTokenInput.type = 'text';
                tokenEyeIcon.className = 'fas fa-eye-slash';
            } else {
                gitHubTokenInput.type = 'password';
                tokenEyeIcon.className = 'fas fa-eye';
            }
        });
    }

    // Handle cancel button
    if (cancelGitHubTokenBtn) {
        cancelGitHubTokenBtn.addEventListener('click', () => {
            hideGitHubTokenModal();
            updateGitHubSignInUI();
        });
    }

    // Handle form submission
    if (gitHubTokenForm) {
        gitHubTokenForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(gitHubTokenForm);
            const token = formData.get('token');
            
            if (!token || !token.trim()) {
                alert('Please enter a valid Personal Access Token');
                return;
            }

            const saveButton = gitHubTokenForm.querySelector('button[type="submit"]');
            if (saveButton) {
                saveButton.disabled = true;
                saveButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Validating...';
            }

            try {
                const success = await validateAndSetToken(token.trim());
                if (success) {
                    hideGitHubTokenModal();
                }
            } finally {
                if (saveButton) {
                    saveButton.disabled = false;
                    saveButton.innerHTML = '<i class="fas fa-key mr-2"></i>Save Token';
                }
            }
        });
    }

    // Close modal when clicking outside
    if (gitHubTokenModal) {
        gitHubTokenModal.addEventListener('click', (e) => {
            if (e.target === gitHubTokenModal) {
                hideGitHubTokenModal();
                updateGitHubSignInUI();
            }
        });
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
            
            if (createGitHub && (!githubAuth.isAuthenticated || !githubAuth.accessToken)) {
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
                
                if (createGitHub && githubAuth.isAuthenticated && githubAuth.accessToken) {
                    // Convert priority and category to GitHub labels
                    const labels = [];
                    if (priority && priority !== 'Medium') labels.push(priority.toLowerCase());
                    if (category) labels.push(category.toLowerCase());
                    
                    // Create GitHub issue
                    const githubIssue = await createGitHubIssue(title, description, labels);
                    
                    if (githubIssue) {
                        // Use GitHub issue data to create the task element
                        taskElement = createGitHubIssueElement(githubIssue, false);
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
            // Default state: collapse in progress column by default
            states = {
                'info': 'expanded',
                'backlog': 'expanded',
                'inprogress': 'collapsed', 
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

    // Add archive functionality for GitHub issues
    document.addEventListener('click', function(e) {
        if (e.target.closest('.archive-btn')) {
            const archiveBtn = e.target.closest('.archive-btn');
            const issueNumber = archiveBtn.getAttribute('data-issue-number');
            const taskElement = archiveBtn.closest('.bg-white.border');
            
            if (confirm(`Archive issue #${issueNumber}? This will hide it from the kanban board.`)) {
                console.log(`Archiving issue #${issueNumber} - Note: This only removes from UI, GitHub API changes would require authentication`);
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

    // GitHub App Authentication Functions
    function initializeGitHubAuth() {
        // Check if we're returning from GitHub App installation/authorization
        const urlParams = new URLSearchParams(window.location.search);
        const installationId = urlParams.get('installation_id');
        const setupAction = urlParams.get('setup_action');
        const code = urlParams.get('code');
        
        if (installationId && setupAction === 'install') {
            // Handle GitHub App installation with OAuth authorization
            handleInstallationCallback(installationId, code);
            
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
        } else {
            // Check for existing installation
            const savedInstallationId = localStorage.getItem('github_installation_id');
            if (savedInstallationId) {
                validateAndSetInstallation(savedInstallationId);
            }
        }
        
        updateGitHubSignInUI();
    }

    function signInWithGitHub() {
        // For GitHub Apps, we redirect to the installation URL
        // This will install the app on the user's account/organization
        const installUrl = new URL(GITHUB_CONFIG.installationUrl);
        installUrl.searchParams.set('state', window.location.href); // Return to current page
        
        // Redirect to GitHub App installation
        window.location.href = installUrl.toString();
    }

    async function handleInstallationCallback(installationId, authCode = null) {
        try {
            console.log('🔄 Processing GitHub App installation...');
            
            // Store installation ID
            githubAuth.installationId = installationId;
            githubAuth.isAuthenticated = true;
            localStorage.setItem('github_installation_id', installationId);
            
            console.log('✅ GitHub App installed successfully!');
            
            if (authCode) {
                // We have an OAuth authorization code
                console.log('🔄 OAuth authorization code received');
                
                // Show the GitHub token modal instead of browser prompt
                showGitHubTokenModal();
            } else {
                // No OAuth code, just installation
                updateGitHubSignInUI();
            }
        } catch (error) {
            console.error('❌ Installation callback error:', error);
            alert('Installation failed. Please try again.');
        }
    }

    async function validateAndSetToken(token) {
        try {
            console.log('🔄 Validating GitHub token...');
            
            const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/user`, {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Invalid token');
            }
            
            const user = await response.json();
            
            // Store authentication
            githubAuth.isAuthenticated = true;
            githubAuth.accessToken = token;
            githubAuth.user = user;
            
            localStorage.setItem('github_access_token', token);
            
            console.log('✅ GitHub authentication successful:', user.login);
            updateGitHubSignInUI();
            
            return true;
        } catch (error) {
            console.error('❌ Token validation failed:', error);
            signOutGitHub();
            return false;
        }
    }

    async function validateAndSetInstallation(installationId) {
        try {
            console.log('🔄 Validating GitHub App installation...');
            
            // Store installation
            githubAuth.installationId = installationId;
            githubAuth.isAuthenticated = true;
            
            // Check for existing token
            const savedToken = localStorage.getItem('github_access_token');
            if (savedToken) {
                await validateAndSetToken(savedToken);
            } else {
                updateGitHubSignInUI();
            }
            
            return true;
        } catch (error) {
            console.error('❌ Installation validation failed:', error);
            signOutGitHub();
            return false;
        }
    }

    function signOutGitHub() {
        githubAuth.isAuthenticated = false;
        githubAuth.installationId = null;
        githubAuth.accessToken = null;
        githubAuth.user = null;
        
        localStorage.removeItem('github_installation_id');
        localStorage.removeItem('github_access_token');
        updateGitHubSignInUI();
        
        console.log('🔓 Signed out of GitHub App');
    }

    function updateGitHubSignInUI() {
        const signInButton = document.querySelector('a[href="https://github.com/super3/dashban"]');
        if (!signInButton) return;
        
        if (githubAuth.isAuthenticated && githubAuth.accessToken && githubAuth.user) {
            // Fully authenticated with token
            signInButton.innerHTML = `
                <i class="fab fa-github"></i>
                <span>Signed in as ${githubAuth.user.login}</span>
                <i class="fas fa-sign-out-alt text-xs"></i>
            `;
            signInButton.title = 'Click to sign out of GitHub App';
            signInButton.href = '#';
            signInButton.onclick = (e) => {
                e.preventDefault();
                if (confirm('Sign out of GitHub App?')) {
                    signOutGitHub();
                }
            };
        } else if (githubAuth.isAuthenticated) {
            // App installed but no token
            signInButton.innerHTML = `
                <i class="fab fa-github"></i>
                <span>Add Access Token</span>
                <i class="fas fa-key text-xs"></i>
            `;
            signInButton.title = 'Add Personal Access Token to create issues';
            signInButton.href = '#';
            signInButton.onclick = (e) => {
                e.preventDefault();
                promptForAccessToken();
            };
        } else {
            // Not installed
            signInButton.innerHTML = `
                <i class="fab fa-github"></i>
                <span>Install GitHub App</span>
            `;
            signInButton.title = 'Install GitHub App to create issues';
            signInButton.href = '#';
            signInButton.onclick = (e) => {
                e.preventDefault();
                signInWithGitHub();
            };
        }
        
        // Update GitHub option in form
        updateGitHubOptionUI();
    }

    function promptForAccessToken() {
        showGitHubTokenModal();
    }

    function updateGitHubOptionUI() {
        const gitHubOption = document.getElementById('github-option');
        const gitHubCheckbox = document.getElementById('create-github-issue');
        const gitHubStatusText = document.getElementById('github-status-text');
        
        if (!gitHubOption || !gitHubCheckbox || !gitHubStatusText) return;
        
        if (githubAuth.isAuthenticated && githubAuth.accessToken) {
            gitHubCheckbox.disabled = false;
            const userDisplay = githubAuth.user ? ` as ${githubAuth.user.login}` : '';
            gitHubStatusText.textContent = `Create real issues in the repository${userDisplay}`;
            gitHubStatusText.className = 'text-xs text-green-600 mt-0.5';
        } else if (githubAuth.isAuthenticated) {
            gitHubCheckbox.disabled = true;
            gitHubCheckbox.checked = false;
            gitHubStatusText.textContent = 'GitHub App installed. Add a Personal Access Token to create issues.';
            gitHubStatusText.className = 'text-xs text-orange-600 mt-0.5';
        } else {
            gitHubCheckbox.disabled = true;
            gitHubCheckbox.checked = false;
            gitHubStatusText.textContent = 'Install GitHub App to create real issues in the repository';
            gitHubStatusText.className = 'text-xs text-gray-500 mt-0.5';
        }
    }

    // Create GitHub issue via API
    async function createGitHubIssue(title, description, labels = []) {
        if (!githubAuth.isAuthenticated || !githubAuth.accessToken) {
            console.log('❌ Not authenticated with GitHub App or missing access token');
            return null;
        }

        try {
            console.log('🔄 Creating GitHub issue:', title);

            const issueData = {
                title: title,
                body: description || 'No description provided',
                labels: labels.filter(label => label) // Remove empty labels
            };

            const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `token ${githubAuth.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(issueData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }

            const createdIssue = await response.json();
            console.log('✅ GitHub issue created successfully:', createdIssue.html_url);
            
            return createdIssue;
        } catch (error) {
            console.error('❌ Failed to create GitHub issue:', error);
            
            // Show user-friendly error message
            const errorMessage = error.message.includes('GitHub API error') 
                ? error.message 
                : 'Failed to create GitHub issue. Check your token permissions and network connection.';
            
            alert(`GitHub Issue Creation Failed:\n${errorMessage}\n\nThe task will be created locally instead.`);
            return null;
        }
    }

    // Note: Completion animation removed for cleaner loading experience

    // GitHub Issues Integration
    async function loadGitHubIssues() {
        try {
            console.log('Loading GitHub issues...');
            
            // Fetch both open and closed issues
            const [openResponse, closedResponse] = await Promise.all([
                fetch('https://api.github.com/repos/super3/dashban/issues?state=open'),
                fetch('https://api.github.com/repos/super3/dashban/issues?state=closed')
            ]);
            
            if (!openResponse.ok || !closedResponse.ok) {
                throw new Error(`GitHub API error: ${openResponse.status} or ${closedResponse.status}`);
            }
            
            const [openIssuesRaw, closedIssuesRaw] = await Promise.all([
                openResponse.json(),
                closedResponse.json()
            ]);
            
            // Filter out issues with "archive" label
            const openIssues = openIssuesRaw.filter(issue => 
                !issue.labels.some(label => label.name.toLowerCase() === 'archive')
            );
            const closedIssues = closedIssuesRaw.filter(issue => 
                !issue.labels.some(label => label.name.toLowerCase() === 'archive')
            );
            
            console.log(`Found ${openIssues.length} open and ${closedIssues.length} closed GitHub issues (filtered out archived issues)`);
            
            const backlogColumn = document.getElementById('backlog');
            const doneColumn = document.getElementById('done');
            
            // Remove skeleton cards from both columns
            const backlogSkeletons = backlogColumn.querySelectorAll('.skeleton-card');
            const doneSkeletons = doneColumn.querySelectorAll('.skeleton-card');
            backlogSkeletons.forEach(card => card.remove());
            doneSkeletons.forEach(card => card.remove());
            
            // Add open issues to backlog
            openIssues.forEach(issue => {
                const taskElement = createGitHubIssueElement(issue, false);
                backlogColumn.appendChild(taskElement);
            });
            
            // Add closed issues to done column
            closedIssues.slice(0, 5).forEach(issue => { // Limit to 5 most recent closed issues
                const taskElement = createGitHubIssueElement(issue, true);
                doneColumn.appendChild(taskElement);
            });
            
            updateColumnCounts();
            
        } catch (error) {
            console.error('Failed to load GitHub issues:', error);
            
            // Remove skeleton cards even if there's an error
            const backlogColumn = document.getElementById('backlog');
            const doneColumn = document.getElementById('done');
            const backlogSkeletons = backlogColumn.querySelectorAll('.skeleton-card');
            const doneSkeletons = doneColumn.querySelectorAll('.skeleton-card');
            backlogSkeletons.forEach(card => card.remove());
            doneSkeletons.forEach(card => card.remove());
            updateColumnCounts();
        }
    }

    // Simple markdown renderer for issue descriptions
    function renderMarkdown(text) {
        if (!text) return 'No description provided';
        
        // Escape HTML first to prevent XSS
        const escapeHtml = (str) => str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        
        let html = escapeHtml(text);
        
        // Convert markdown patterns to HTML
        html = html
            // Bold text **text** or __text__
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            
            // Italic text *text* or _text_
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            
            // Inline code `code`
            .replace(/`(.*?)`/g, '<code class="bg-gray-100 text-gray-800 px-1 rounded text-xs">$1</code>')
            
            // Links [text](url)
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-600 hover:text-blue-800 underline">$1</a>')
            
            // Line breaks (convert double newlines to paragraph breaks)
            .replace(/\n\s*\n/g, '<br><br>')
            .replace(/\n/g, '<br>');
        
        return html;
    }

    function createGitHubIssueElement(issue, isCompleted = false) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'bg-white border border-gray-200 rounded-md p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer';
        taskDiv.draggable = true;
        taskDiv.setAttribute('data-github-issue', issue.number);

        // Extract priority from labels (default to Medium if not found)
        const priority = extractPriorityFromLabels(issue.labels);
        const category = extractCategoryFromLabels(issue.labels);

        // Render markdown description
        const description = renderMarkdown(issue.body);

        taskDiv.innerHTML = `
            <div class="flex items-start justify-between mb-2">
                <h4 class="font-medium text-gray-900 text-sm">${issue.title}</h4>
                <a href="${issue.html_url}" target="_blank" class="text-gray-500 hover:text-gray-700 text-xs font-medium">
                    #${issue.number}
                </a>
            </div>
            <div class="text-gray-600 text-sm mb-3 line-clamp-2">${description}</div>
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <span class="${getPriorityColor(priority)} text-xs px-2 py-1 rounded-full font-medium">${priority}</span>
                    <span class="${getCategoryColor(category)} text-xs px-2 py-1 rounded-full font-medium">${category}</span>
                </div>
                ${issue.user ? 
                    `<img src="${issue.user.avatar_url}" alt="${issue.user.login}" class="w-6 h-6 rounded-full">` : 
                    `<div class="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                        <i class="fas fa-user text-gray-400 text-xs"></i>
                    </div>`
                }
            </div>
            ${isCompleted ? `
            <div class="border-t border-gray-200 mt-3 pt-2">
                <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-check-circle text-green-500 text-xs"></i>
                        <span class="text-xs text-green-600">Completed</span>
                    </div>
                    <button class="archive-btn text-gray-400 hover:text-gray-600 p-1 transition-colors" 
                            title="Archive issue" 
                            data-issue-number="${issue.number}">
                        <i class="fas fa-archive text-xs"></i>
                    </button>
                </div>
            </div>` : ''}
        `;

        return taskDiv;
    }

    function extractPriorityFromLabels(labels) {
        const priorityLabel = labels.find(label => {
            const name = label.name.toLowerCase();
            return ['priority: high', 'high', 'urgent', 'priority: low', 'low', 'priority: medium', 'medium', 'critical'].includes(name);
        });
        
        if (priorityLabel) {
            const name = priorityLabel.name.toLowerCase();
            if (name.includes('high') || name.includes('urgent') || name.includes('critical')) return 'High';
            if (name.includes('low')) return 'Low';
        }
        
        return 'Low'; // default
    }

    function extractCategoryFromLabels(labels) {
        const categoryLabel = labels.find(label => {
            const name = label.name.toLowerCase();
            return ['frontend', 'backend', 'design', 'testing', 'database', 'setup', 'bug', 'enhancement', 'feature'].includes(name);
        });
        
        if (categoryLabel) {
            const name = categoryLabel.name.toLowerCase();
            if (name.includes('frontend') || name.includes('ui')) return 'Frontend';
            if (name.includes('backend') || name.includes('api')) return 'Backend';
            if (name.includes('design')) return 'Design';
            if (name.includes('test')) return 'Testing';
            if (name.includes('database') || name.includes('db')) return 'Database';
            if (name.includes('setup') || name.includes('config')) return 'Setup';
        }
        
        return 'Setup'; // default for GitHub issues
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
            'Setup': 'bg-gray-100 text-gray-800'
        };
        return categoryColors[category] || categoryColors['Setup'];
    }

    // Create skeleton loading cards
    function createSkeletonCard() {
        const skeletonDiv = document.createElement('div');
        skeletonDiv.className = 'bg-white border border-gray-200 rounded-md p-3 shadow-sm skeleton-card animate-pulse';
        
        skeletonDiv.innerHTML = `
            <div class="flex items-start justify-between mb-2">
                <div class="bg-gray-200 h-4 rounded w-3/4"></div>
                <div class="bg-gray-200 h-3 rounded w-8"></div>
            </div>
            <div class="space-y-2 mb-3">
                <div class="bg-gray-200 h-3 rounded w-full"></div>
                <div class="bg-gray-200 h-3 rounded w-2/3"></div>
            </div>
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <div class="bg-gray-200 h-5 rounded-full w-12"></div>
                    <div class="bg-gray-200 h-5 rounded-full w-16"></div>
                </div>
                <div class="bg-gray-200 w-6 h-6 rounded-full"></div>
            </div>
        `;
        
        return skeletonDiv;
    }

    // Show skeleton cards immediately and load real GitHub issues
    function initializeGitHubIssues() {
        const backlogColumn = document.getElementById('backlog');
        const doneColumn = document.getElementById('done');
        
        if (!backlogColumn || !doneColumn || backlogColumn.hasAttribute('data-github-loaded')) return;
        
        console.log('Showing skeleton cards...');
        
        // Add skeleton cards to backlog
        for (let i = 0; i < 2; i++) {
            const skeletonCard = createSkeletonCard();
            backlogColumn.appendChild(skeletonCard);
        }
        
        // Add skeleton cards to done column
        for (let i = 0; i < 2; i++) {
            const skeletonCard = createSkeletonCard();
            doneColumn.appendChild(skeletonCard);
        }
        
        updateColumnCounts();
        
        // Load real GitHub issues after a short delay
        setTimeout(() => {
            loadGitHubIssues();
        }, 800);
        
        backlogColumn.setAttribute('data-github-loaded', 'true');
    }
    
    // Initialize GitHub Authentication
    initializeGitHubAuth();
    
    // Initialize GitHub issues loading after UI is ready
    setTimeout(() => {
        initializeGitHubIssues();
    }, 100);

    console.log('Kanban Board initialized successfully!');

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
        loadGitHubIssues,
        createGitHubIssue,
        renderMarkdown,
        createGitHubIssueElement,
        extractPriorityFromLabels,
        extractCategoryFromLabels,
        getPriorityColor,
        getCategoryColor,
        createSkeletonCard,
        initializeGitHubIssues,
        // GitHub App authentication functions
        initializeGitHubAuth,
        signInWithGitHub,
        signOutGitHub,
        updateGitHubSignInUI,
        updateGitHubOptionUI,
        validateAndSetToken,
        validateAndSetInstallation,
        handleInstallationCallback,
        promptForAccessToken,
        showGitHubTokenModal,
        hideGitHubTokenModal
    };

    // Attach to global for browser/Node access
    if (typeof globalThis !== 'undefined') {
        globalThis.kanbanTestExports = testAPI;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = testAPI;
    }
}); 