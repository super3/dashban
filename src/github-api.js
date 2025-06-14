// GitHub API Operations for Dashban Kanban Board

// Environment detection helper
function isTestEnvironment() {
    return typeof jest !== 'undefined';
}

// Archive GitHub issue by adding "archive" label
async function archiveGitHubIssue(issueNumber, taskElement) {
    if (!window.GitHubAuth.githubAuth.isAuthenticated || !window.GitHubAuth.githubAuth.accessToken) {
        Logger.info('❌ Not authenticated with GitHub App - cannot archive issue');
        // Remove from UI anyway
        taskElement.remove();
        window.updateColumnCounts();
        return;
    }

    try {
        Logger.info(`🗃️ Archiving issue #${issueNumber}...`);

        // Add "archive" label to the issue
        const response = await fetch(`${window.GitHubAuth.GITHUB_CONFIG.apiBaseUrl}/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}/labels`, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${window.GitHubAuth.githubAuth.accessToken}`,
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

        Logger.info(`✅ Successfully archived issue #${issueNumber}`);
        
        // Remove from UI
        taskElement.remove();
        window.updateColumnCounts();
        
    } catch (error) {
        Logger.error('❌ Failed to archive GitHub issue:', error);
        
        // Show user-friendly error message but still remove from UI
        alert(`Failed to add archive label to GitHub issue: ${error.message}\n\nThe task will be removed from the board anyway.`);
        taskElement.remove();
        window.updateColumnCounts();
    }
}

// Update GitHub issue labels when moved between columns
async function updateGitHubIssueLabels(issueNumber, newColumn) {
    if (!window.GitHubAuth.githubAuth.isAuthenticated || !window.GitHubAuth.githubAuth.accessToken) {
        Logger.info('❌ Not authenticated with GitHub App - cannot update issue labels');
        return;
    }

    try {
        Logger.info(`🔄 Updating labels for issue #${issueNumber} moved to ${newColumn}...`);

        // First, get current issue to preserve existing labels
        const getResponse = await fetch(`${window.GitHubAuth.GITHUB_CONFIG.apiBaseUrl}/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}?_t=${Date.now()}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${window.GitHubAuth.githubAuth.accessToken}`
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
        const updateResponse = await fetch(`${window.GitHubAuth.GITHUB_CONFIG.apiBaseUrl}/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}/labels`, {
            method: 'PUT',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${window.GitHubAuth.githubAuth.accessToken}`,
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
        Logger.info(`✅ Successfully updated labels for issue #${issueNumber} (moved to ${columnDisplayName})`);
        
    } catch (error) {
        Logger.error('❌ Failed to update GitHub issue labels:', error);
        
        // Show user-friendly error message but don't revert the UI change
        const columnDisplayName = newColumn === 'inprogress' ? 'In Progress' : 
                                 newColumn.charAt(0).toUpperCase() + newColumn.slice(1);
        alert(`Failed to update GitHub issue labels: ${error.message}\n\nThe issue was moved to ${columnDisplayName} on the board but the labels weren't updated on GitHub.`);
    }
}

// Close GitHub issue when moved to Done column
async function closeGitHubIssue(issueNumber) {
    if (!window.GitHubAuth.githubAuth.isAuthenticated || !window.GitHubAuth.githubAuth.accessToken) {
        Logger.info('❌ Not authenticated with GitHub App - cannot close issue');
        return;
    }

    try {
        Logger.info(`🔒 Closing GitHub issue #${issueNumber}...`);

        // Close the issue via API
        const response = await fetch(`${window.GitHubAuth.GITHUB_CONFIG.apiBaseUrl}/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}`, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${window.GitHubAuth.githubAuth.accessToken}`,
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

        Logger.info(`✅ Successfully closed GitHub issue #${issueNumber}`);
        
    } catch (error) {
        Logger.error('❌ Failed to close GitHub issue:', error);
        
        // Show user-friendly error message but don't revert the UI change
        alert(`Failed to close GitHub issue: ${error.message}\n\nThe issue was moved to Done on the board but wasn't closed on GitHub.`);
    }
}

// Create GitHub issue via API
async function createGitHubIssue(title, description, labels = []) {
    if (!window.GitHubAuth.githubAuth.isAuthenticated || !window.GitHubAuth.githubAuth.accessToken) {
        Logger.info('❌ Not authenticated with GitHub App - cannot create issue');
        return null;
    }

    try {
        Logger.info('🔄 Creating GitHub issue...');

        const response = await fetch(`${window.GitHubAuth.GITHUB_CONFIG.apiBaseUrl}/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues`, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${window.GitHubAuth.githubAuth.accessToken}`,
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
        Logger.info('✅ Successfully created GitHub issue:', issue.number);
        return issue;

    } catch (error) {
        // Only log errors in non-test environments
        if (!isTestEnvironment()) {
            Logger.error('❌ Failed to create GitHub issue:', error);
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
        Logger.info('Loading GitHub issues...');
        
        // Fetch both open and closed issues with cache-busting
        const timestamp = Date.now();
        const [openResponse, closedResponse] = await Promise.all([
            fetch(`https://api.github.com/repos/super3/dashban/issues?state=open&_t=${timestamp}`),
            fetch(`https://api.github.com/repos/super3/dashban/issues?state=closed&_t=${timestamp}`)
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
        
        Logger.info(`Found ${openIssues.length} open and ${closedIssues.length} closed GitHub issues (filtered out archived issues)`);
        
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
            const taskElement = window.GitHubUI.createGitHubIssueElement(issue, false);
            
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
            const taskElement = window.GitHubUI.createGitHubIssueElement(issue, false); // Don't add completed section here
            const doneColumn = document.getElementById('done');
            if (doneColumn) {
                doneColumn.appendChild(taskElement);
            }
        });
        
        // Update column counts
        window.updateColumnCounts();
        
        // Apply review indicators to all cards in the review column
        window.GitHubUI.applyReviewIndicatorsToColumn();
        
        // Apply completed sections to all cards in the done column
        window.GitHubUI.applyCompletedSectionsToColumn();
        
        Logger.info('✅ GitHub issues loaded successfully');
        
    } catch (error) {
        // Only log errors in non-test environments to avoid console noise during tests
        if (!isTestEnvironment()) {
            Logger.error('❌ Failed to load GitHub issues:', error);
        }
        // Don't show alert for loading issues - just log the error
    }
}

function initializeGitHubIssues() {
    Logger.info('🔄 Initializing GitHub issues integration...');
    
    // Add skeleton cards while loading
    const columns = ['backlog', 'inprogress', 'review', 'done'];
    columns.forEach(columnId => {
        const column = document.getElementById(columnId);
        if (column) {
            // Add 1-2 skeleton cards per column
            const skeletonCount = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < skeletonCount; i++) {
                column.appendChild(window.GitHubUI.createSkeletonCard());
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

// Export API functions
window.GitHubAPI = {
    // API functions
    createGitHubIssue,
    loadGitHubIssues,
    archiveGitHubIssue,
    updateGitHubIssueLabels,
    closeGitHubIssue,
    initializeGitHubIssues
}; 