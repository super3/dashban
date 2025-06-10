// GitHub Integration for Dashban Kanban Board

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

// GitHub Token Modal Functions
function showGitHubTokenModal() {
    const gitHubTokenModal = document.getElementById('github-token-modal');
    const gitHubTokenInput = document.getElementById('github-token-input');
    if (gitHubTokenModal) {
        gitHubTokenModal.classList.remove('hidden');
        if (gitHubTokenInput) {
            setTimeout(() => gitHubTokenInput.focus(), 100);
        }
    }
}

function hideGitHubTokenModal() {
    const gitHubTokenModal = document.getElementById('github-token-modal');
    const gitHubTokenForm = document.getElementById('github-token-form');
    const gitHubTokenInput = document.getElementById('github-token-input');
    const tokenEyeIcon = document.getElementById('token-eye-icon');
    
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
        const savedToken = localStorage.getItem('github_access_token');
        
        if (savedInstallationId) {
            validateAndSetInstallation(savedInstallationId);
        } else if (savedToken) {
            // We have a token but no installation ID - try to validate token
            console.log('🔄 Found saved token without installation ID, validating...');
            githubAuth.isAuthenticated = true; // Assume app is installed
            validateAndSetToken(savedToken);
            return; // Don't call updateGitHubSignInUI() yet, let validateAndSetToken() do it
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
        // Only log errors in non-test environments
        if (typeof jest === 'undefined') {
            console.error('❌ Token validation failed:', error);
        }
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
    console.log('🔓 Signing out of GitHub App...');
    
    // Check if app was installed before clearing state
    const hadInstallation = !!(githubAuth.installationId || localStorage.getItem('github_installation_id'));
    
    // Clear authentication state but preserve installation if it existed
    githubAuth.accessToken = null;
    githubAuth.user = null;
    
    if (hadInstallation) {
        // Keep installation state, just remove token
        githubAuth.isAuthenticated = true; // App still installed
        console.log('🔄 Cleared access token but keeping app installation');
    } else {
        // No installation, clear everything
        githubAuth.isAuthenticated = false;
        githubAuth.installationId = null;
    }
    
    // Clear stored access token only
    localStorage.removeItem('github_access_token');
    
    // Update UI
    updateGitHubSignInUI();
    
    console.log('✅ Successfully signed out and cleared access token');
    
    // Show appropriate reconnection message
    setTimeout(() => {
        if (window.location.href.includes('localhost') || window.location.href.includes('127.0.0.1')) {
            if (hadInstallation) {
                console.log('💡 To reconnect, click "Add Access Token" to add your personal access token');
            } else {
                console.log('💡 To reconnect, click "Install GitHub App" and add your access token');
            }
        }
    }, 100);
}

function updateGitHubSignInUI() {
    // Find the GitHub button in header - it might have href="#" or the original URL
    const signInButton = document.querySelector('header a[href="https://github.com/super3/dashban"]') || 
                        document.querySelector('header a[href="#"]') ||
                        document.querySelector('header .flex.items-center.space-x-2:last-child a');
    if (!signInButton) {
        // Only warn in non-test environments (when we're not in JSDOM)
        if (typeof navigator !== 'undefined' && !navigator.userAgent.includes('jsdom')) {
            console.warn('⚠️ GitHub sign-in button not found in header');
        }
        return;
    }
    
    // Debug logging to see authentication state
    console.log('🔄 Updating GitHub Sign-In UI - Auth state:', {
        isAuthenticated: githubAuth.isAuthenticated,
        hasAccessToken: !!githubAuth.accessToken,
        hasUser: !!githubAuth.user,
        userLogin: githubAuth.user?.login,
        installationId: githubAuth.installationId,
        accessTokenLength: githubAuth.accessToken ? githubAuth.accessToken.length : 0,
        fullAuthObject: githubAuth
    });
    
    if (githubAuth.isAuthenticated && githubAuth.accessToken && githubAuth.user) {
        // Fully authenticated
        signInButton.innerHTML = `
            <i class="fab fa-github"></i>
            <span>Signed in as ${githubAuth.user.login}</span>
            <i class="fas fa-sign-out-alt text-xs"></i>
        `;
        signInButton.title = 'Click to sign out';
        signInButton.href = '#';
        signInButton.className = 'flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200';
        signInButton.onclick = (e) => {
            e.preventDefault();
            if (confirm('Sign out of GitHub?')) {
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
        signInButton.className = 'flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200';
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
        signInButton.className = 'flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200';
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

// Archive GitHub issue by adding "archive" label
async function archiveGitHubIssue(issueNumber, taskElement) {
    if (!githubAuth.isAuthenticated || !githubAuth.accessToken) {
        console.log('❌ Not authenticated with GitHub App - cannot archive issue');
        // Remove from UI anyway
        taskElement.remove();
        window.updateColumnCounts();
        return;
    }

    try {
        console.log(`🗃️ Archiving issue #${issueNumber}...`);

        // Add "archive" label to the issue
        const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues/${issueNumber}/labels`, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${githubAuth.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                labels: ['archive']
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        console.log(`✅ Successfully archived issue #${issueNumber}`);
        
        // Remove from UI
        taskElement.remove();
        window.updateColumnCounts();
        
    } catch (error) {
        console.error('❌ Failed to archive GitHub issue:', error);
        
        // Show user-friendly error message but still remove from UI
        alert(`Failed to add archive label to GitHub issue: ${error.message}\n\nThe task will be removed from the board anyway.`);
        taskElement.remove();
        window.updateColumnCounts();
    }
}

// Update GitHub issue labels when moved between columns
async function updateGitHubIssueLabels(issueNumber, newColumn) {
    if (!githubAuth.isAuthenticated || !githubAuth.accessToken) {
        console.log('❌ Not authenticated with GitHub App - cannot update issue labels');
        return;
    }

    try {
        console.log(`🔄 Updating labels for issue #${issueNumber} moved to ${newColumn}...`);

        // First, get current issue to preserve existing labels
        const getResponse = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues/${issueNumber}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${githubAuth.accessToken}`
            }
        });

        if (!getResponse.ok) {
            throw new Error(`Failed to fetch issue: ${getResponse.status}`);
        }

        const issue = await getResponse.json();
        const currentLabels = issue.labels.map(label => label.name);

        // Remove existing status labels
        const statusLabels = ['in progress', 'inprogress', 'review', 'in review', 'done', 'completed'];
        const filteredLabels = currentLabels.filter(label => 
            !statusLabels.includes(label.toLowerCase())
        );

        // Map columns to labels
        const columnLabelMap = {
            'backlog': null, // No specific label for backlog
            'inprogress': 'in progress',
            'review': 'review',
            'done': 'done'
        };

        // Add new status label if applicable
        const newLabel = columnLabelMap[newColumn];
        const updatedLabels = newLabel ? [...filteredLabels, newLabel] : filteredLabels;

        // Update labels via API
        const updateResponse = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues/${issueNumber}/labels`, {
            method: 'PUT',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${githubAuth.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                labels: updatedLabels
            })
        });

        if (!updateResponse.ok) {
            const errorData = await updateResponse.json();
            throw new Error(`GitHub API error: ${updateResponse.status} - ${errorData.message || 'Unknown error'}`);
        }

        const columnDisplayName = newColumn === 'inprogress' ? 'In Progress' : 
                                 newColumn.charAt(0).toUpperCase() + newColumn.slice(1);
        console.log(`✅ Successfully updated labels for issue #${issueNumber} (moved to ${columnDisplayName})`);
        
    } catch (error) {
        console.error('❌ Failed to update GitHub issue labels:', error);
        
        // Show user-friendly error message but don't revert the UI change
        const columnDisplayName = newColumn === 'inprogress' ? 'In Progress' : 
                                 newColumn.charAt(0).toUpperCase() + newColumn.slice(1);
        alert(`Failed to update GitHub issue labels: ${error.message}\n\nThe issue was moved to ${columnDisplayName} on the board but the labels weren't updated on GitHub.`);
    }
}

// Close GitHub issue when moved to Done column
async function closeGitHubIssue(issueNumber) {
    if (!githubAuth.isAuthenticated || !githubAuth.accessToken) {
        console.log('❌ Not authenticated with GitHub App - cannot close issue');
        return;
    }

    try {
        console.log(`🔒 Closing GitHub issue #${issueNumber}...`);

        // Close the issue via API
        const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues/${issueNumber}`, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${githubAuth.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                state: 'closed'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        console.log(`✅ Successfully closed GitHub issue #${issueNumber}`);
        
    } catch (error) {
        console.error('❌ Failed to close GitHub issue:', error);
        
        // Show user-friendly error message but don't revert the UI change
        alert(`Failed to close GitHub issue: ${error.message}\n\nThe issue was moved to Done on the board but wasn't closed on GitHub.`);
    }
}

// Create GitHub issue via API
async function createGitHubIssue(title, description, labels = []) {
    if (!githubAuth.isAuthenticated || !githubAuth.accessToken) {
        console.log('❌ Not authenticated with GitHub App - cannot create issue');
        return null;
    }

    try {
        console.log('🔄 Creating GitHub issue...');

        const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues`, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${githubAuth.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title,
                body: description,
                labels
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        const issue = await response.json();
        console.log('✅ Successfully created GitHub issue:', issue.number);
        return issue;

    } catch (error) {
        // Only log errors in non-test environments
        if (typeof jest === 'undefined') {
            console.error('❌ Failed to create GitHub issue:', error);
        }
        
        // Show user-friendly error message
        const errorMessage = error.message.includes('GitHub API error') 
            ? error.message 
            : 'Failed to create GitHub issue. Check your token permissions and network connection.';
        
        alert(`GitHub Issue Creation Failed:\n${errorMessage}\n\nThe task will be created locally instead.`);
        return null;
    }
}

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
        
        // Clear existing issue cards (but keep manually created tasks)
        const columns = ['backlog', 'inprogress', 'review', 'done'];
        columns.forEach(columnId => {
            const column = document.getElementById(columnId);
            if (column) {
                // Remove only GitHub issue cards (those with data-issue-number)
                const issueCards = column.querySelectorAll('[data-issue-number]');
                issueCards.forEach(card => card.remove());
            }
        });
        
        // Add open issues to appropriate columns
        openIssues.forEach(issue => {
            const taskElement = createGitHubIssueElement(issue, false);
            
            // Determine column based on labels or default to backlog
            let targetColumn = 'backlog';
            
            // Check for status labels that indicate column
            const statusLabels = issue.labels.map(label => label.name.toLowerCase());
            if (statusLabels.includes('in progress') || statusLabels.includes('inprogress')) {
                targetColumn = 'inprogress';
            } else if (statusLabels.includes('review') || statusLabels.includes('in review')) {
                targetColumn = 'review';
            } else if (statusLabels.includes('done') || statusLabels.includes('completed')) {
                targetColumn = 'done';
            }
            
            const column = document.getElementById(targetColumn);
            if (column) {
                column.appendChild(taskElement);
            }
        });
        
        // Add closed issues to done column
        closedIssues.forEach(issue => {
            const taskElement = createGitHubIssueElement(issue, false); // Don't add completed section here
            const doneColumn = document.getElementById('done');
            if (doneColumn) {
                doneColumn.appendChild(taskElement);
            }
        });
        
        // Update column counts
        window.updateColumnCounts();
        
        // Apply review indicators to all cards in the review column
        applyReviewIndicatorsToColumn();
        
        // Apply completed sections to all cards in the done column
        applyCompletedSectionsToColumn();
        
        console.log('✅ GitHub issues loaded successfully');
        
    } catch (error) {
        // Only log errors in non-test environments to avoid console noise during tests
        if (typeof jest === 'undefined') {
            console.error('❌ Failed to load GitHub issues:', error);
        }
        // Don't show alert for loading issues - just log the error
    }
}

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
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    // Wrap in paragraph tags if it contains paragraph breaks
    if (html.includes('</p><p>')) {
        html = '<p>' + html + '</p>';
    }
    
    return html;
}

function createGitHubIssueElement(issue, isCompleted = false) {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-move';
    taskDiv.draggable = true;
    taskDiv.setAttribute('data-github-issue', issue.number);
    taskDiv.setAttribute('data-issue-number', issue.number);
    taskDiv.setAttribute('data-issue-id', issue.id);

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
        <p class="text-gray-600 text-sm mb-3">${description}</p>
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                ${priority ? `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${window.getPriorityColor(priority)}">${priority}</span>` : ''}
                ${category ? `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${window.getCategoryColor(category)}">${category}</span>` : ''}
            </div>
            ${issue.user ? 
                `<img src="${issue.user.avatar_url}" alt="${issue.user.login}" class="w-6 h-6 rounded-full">` :
                `<div class="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                    <i class="fas fa-user text-gray-400 text-xs"></i>
                </div>`
            }
        </div>
        ${isCompleted ? `
        <div class="border-t border-gray-200 mt-3 pt-1 -mb-2">
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
    const priorityLabels = ['critical', 'high', 'medium', 'low'];
    const foundPriority = labels.find(label => 
        priorityLabels.includes(label.name.toLowerCase())
    );
    
    if (foundPriority) {
        return foundPriority.name.charAt(0).toUpperCase() + foundPriority.name.slice(1).toLowerCase();
    }
    
    return null;
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
        if (name.includes('bug')) return 'Bug';
        if (name.includes('enhancement')) return 'Enhancement';
        if (name.includes('feature')) return 'Feature';
    }
    
    return 'Setup'; // default for GitHub issues
}

function createSkeletonCard() {
    const skeletonElement = document.createElement('div');
    skeletonElement.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm animate-pulse';
    
    skeletonElement.innerHTML = `
        <div class="mb-2">
            <div class="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
            <div class="h-3 bg-gray-300 rounded w-1/2"></div>
        </div>
        <div class="mb-3">
            <div class="h-5 bg-gray-300 rounded w-16 inline-block mr-2"></div>
            <div class="h-5 bg-gray-300 rounded w-12 inline-block"></div>
        </div>
        <div class="mb-3">
            <div class="h-3 bg-gray-300 rounded w-full mb-1"></div>
            <div class="h-3 bg-gray-300 rounded w-4/5"></div>
        </div>
        <div class="flex items-center space-x-4">
            <div class="h-3 bg-gray-300 rounded w-8"></div>
            <div class="h-3 bg-gray-300 rounded w-16"></div>
            <div class="h-3 bg-gray-300 rounded w-12"></div>
        </div>
    `;
    
    return skeletonElement;
}

function initializeGitHubIssues() {
    console.log('🔄 Initializing GitHub issues integration...');
    
    // Add skeleton cards while loading
    const columns = ['backlog', 'inprogress', 'review', 'done'];
    columns.forEach(columnId => {
        const column = document.getElementById(columnId);
        if (column) {
            // Add 1-2 skeleton cards per column
            const skeletonCount = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < skeletonCount; i++) {
                column.appendChild(createSkeletonCard());
            }
        }
    });
    
    // Load real issues
    loadGitHubIssues().then(() => {
        // Remove skeleton cards
        document.querySelectorAll('.animate-pulse').forEach(skeleton => {
            skeleton.remove();
        });
    });
}

// Initialize GitHub integration when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔄 Initializing GitHub integration...');
    
    // Set up GitHub token modal event listeners
    const gitHubTokenModal = document.getElementById('github-token-modal');
    const gitHubTokenForm = document.getElementById('github-token-form');
    const gitHubTokenInput = document.getElementById('github-token-input');
    const cancelGitHubTokenBtn = document.getElementById('cancel-github-token');
    const toggleTokenVisibilityBtn = document.getElementById('toggle-token-visibility');
    const tokenEyeIcon = document.getElementById('token-eye-icon');

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
                    // Force UI update after modal closes
                    updateGitHubSignInUI();
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

    // Initialize GitHub authentication
    initializeGitHubAuth();
    
    // Load GitHub issues
    initializeGitHubIssues();
    
    console.log('✅ GitHub integration initialized');
});

// Export functions to global scope for access from kanban.js
window.GitHub = {
    // Configuration
    GITHUB_CONFIG,
    githubAuth,
    
    // Authentication functions
    initializeGitHubAuth,
    signInWithGitHub,
    handleInstallationCallback,
    validateAndSetToken,
    validateAndSetInstallation,
    signOutGitHub,
    updateGitHubSignInUI,
    updateGitHubOptionUI,
    promptForAccessToken,
    
    // Modal functions
    showGitHubTokenModal,
    hideGitHubTokenModal,
    
    // API functions
    createGitHubIssue,
    loadGitHubIssues,
    archiveGitHubIssue,
    updateGitHubIssueLabels,
    createGitHubIssueElement,
    extractPriorityFromLabels,
    extractCategoryFromLabels,
    renderMarkdown,
    createSkeletonCard,
    initializeGitHubIssues,
    closeGitHubIssue,
    updateCardIndicators,
    applyReviewIndicatorsToColumn,
    applyCompletedSectionsToColumn
};

// Add "Ready for review" indicator to a card
function addReviewIndicator(taskElement) {
    // Check if indicator already exists
    if (taskElement.querySelector('.review-indicator')) {
        return;
    }
    
    // Create the review indicator HTML
    const reviewIndicator = document.createElement('div');
    reviewIndicator.className = 'review-indicator mt-3';
    reviewIndicator.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas fa-clock text-gray-400 text-xs"></i>
            <span class="text-xs text-gray-500">Ready for review</span>
        </div>
    `;
    
    // Add to the end of the card
    taskElement.appendChild(reviewIndicator);
}

// Remove "Ready for review" indicator from a card
function removeReviewIndicator(taskElement) {
    const indicator = taskElement.querySelector('.review-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Add completed section with archive button to a card
function addCompletedSection(taskElement) {
    // Check if completed section already exists (check for both class name and content)
    if (taskElement.querySelector('.completed-section') || 
        taskElement.innerHTML.includes('fas fa-check-circle text-green-500')) {
        return;
    }
    
    // Get the issue number from the task element
    const issueNumber = taskElement.getAttribute('data-issue-number');
    
    if (!issueNumber) {
        return; // Only add to GitHub issues
    }
    
    // Create the completed section HTML
    const completedSection = document.createElement('div');
    completedSection.className = 'completed-section border-t border-gray-200 mt-3 pt-1 -mb-2';
    completedSection.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <i class="fas fa-check-circle text-green-500 text-xs"></i>
                <span class="text-xs text-green-600">Completed</span>
            </div>
            <button class="archive-btn text-gray-400 hover:text-gray-600 p-1 transition-colors" 
                    title="Archive issue" 
                    data-issue-number="${issueNumber}">
                <i class="fas fa-archive text-xs"></i>
            </button>
        </div>
    `;
    
    // Add to the end of the card
    taskElement.appendChild(completedSection);
}

// Remove completed section from a card
function removeCompletedSection(taskElement) {
    // Remove the new class-based completed section
    const completedSection = taskElement.querySelector('.completed-section');
    if (completedSection) {
        completedSection.remove();
    }
    
    // Also remove any inline completed section that might be in the original HTML
    // Look for the pattern from createGitHubIssueElement when isCompleted = true
    const inlineCompletedSections = taskElement.querySelectorAll('.border-t.border-gray-200.mt-3.pt-1.-mb-2');
    inlineCompletedSections.forEach(section => {
        if (section.innerHTML.includes('fas fa-check-circle text-green-500')) {
            section.remove();
        }
    });
}

// Update card indicators based on column
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

// Apply review indicators to all cards currently in the review column
function applyReviewIndicatorsToColumn() {
    const reviewColumn = document.getElementById('review');
    if (reviewColumn) {
        const cards = reviewColumn.querySelectorAll('.bg-white.border');
        cards.forEach(card => {
            addReviewIndicator(card);
        });
    }
}

// Apply completed sections to all cards currently in the done column
function applyCompletedSectionsToColumn() {
    const doneColumn = document.getElementById('done');
    if (doneColumn) {
        const cards = doneColumn.querySelectorAll('.bg-white.border');
        cards.forEach(card => {
            addCompletedSection(card);
        });
    }
} 