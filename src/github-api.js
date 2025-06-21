// GitHub API Operations for Dashban Kanban Board

// Environment detection helper
function isTestEnvironment() {
    return typeof jest !== 'undefined';
}

// Archive GitHub issue by adding "archive" label
async function archiveGitHubIssue(issueNumber, taskElement) {
    const globalObject = (typeof window !== 'undefined') ? window : global;
    if (!globalObject.GitHubAuth.githubAuth.isAuthenticated || !globalObject.GitHubAuth.githubAuth.accessToken) {
        console.log('❌ Not authenticated with GitHub - cannot archive issue');
        // Remove from UI anyway
        taskElement.remove();
        if (typeof window !== 'undefined' && window.updateColumnCounts) {
            window.updateColumnCounts();
        }
        return;
    }

    try {


        // Add "archive" label to the issue
        const response = await fetch(`${globalObject.GitHubAuth.GITHUB_CONFIG.apiBaseUrl}/repos/${globalObject.GitHubAuth.GITHUB_CONFIG.owner}/${globalObject.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}/labels`, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${globalObject.GitHubAuth.githubAuth.accessToken}`,
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


        
        // Remove from UI
        taskElement.remove();
        if (typeof window !== 'undefined' && window.updateColumnCounts) {
            window.updateColumnCounts();
        }
        
    } catch (error) {
        console.error('❌ Failed to archive GitHub issue:', error);
        
        // Show user-friendly error message but still remove from UI
        alert(`Failed to add archive label to GitHub issue: ${error.message}\n\nThe task will be removed from the board anyway.`);
        taskElement.remove();
        if (typeof window !== 'undefined' && window.updateColumnCounts) {
            window.updateColumnCounts();
        }
    }
}

// Update GitHub issue labels when moved between columns
async function updateGitHubIssueLabels(issueNumber, newColumn) {
    const globalObject = (typeof window !== 'undefined') ? window : global;
    if (!globalObject.GitHubAuth.githubAuth.isAuthenticated || !globalObject.GitHubAuth.githubAuth.accessToken) {
        console.log('❌ Not authenticated with GitHub - cannot update issue labels');
        return;
    }

    try {


        // First, get current issue to preserve existing labels
        const getResponse = await fetch(`${globalObject.GitHubAuth.GITHUB_CONFIG.apiBaseUrl}/repos/${globalObject.GitHubAuth.GITHUB_CONFIG.owner}/${globalObject.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}?_t=${Date.now()}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${globalObject.GitHubAuth.githubAuth.accessToken}`
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
        const updateResponse = await fetch(`${globalObject.GitHubAuth.GITHUB_CONFIG.apiBaseUrl}/repos/${globalObject.GitHubAuth.GITHUB_CONFIG.owner}/${globalObject.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}/labels`, {
            method: 'PUT',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${globalObject.GitHubAuth.githubAuth.accessToken}`,
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
    const globalObject = (typeof window !== 'undefined') ? window : global;
    if (!globalObject.GitHubAuth.githubAuth.isAuthenticated || !globalObject.GitHubAuth.githubAuth.accessToken) {
        console.log('❌ Not authenticated with GitHub - cannot close issue');
        return;
    }

    try {


        // Close the issue via API
        const response = await fetch(`${globalObject.GitHubAuth.GITHUB_CONFIG.apiBaseUrl}/repos/${globalObject.GitHubAuth.GITHUB_CONFIG.owner}/${globalObject.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}`, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${globalObject.GitHubAuth.githubAuth.accessToken}`,
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


        
    } catch (error) {
        console.error('❌ Failed to close GitHub issue:', error);
        
        // Show user-friendly error message but don't revert the UI change
        alert(`Failed to close GitHub issue: ${error.message}\n\nThe issue was moved to Done on the board but wasn't closed on GitHub.`);
    }
}

// Create GitHub issue via API
async function createGitHubIssue(title, description, labels = []) {
    const globalObject = (typeof window !== 'undefined') ? window : global;
    if (!globalObject.GitHubAuth.githubAuth.isAuthenticated || !globalObject.GitHubAuth.githubAuth.accessToken) {
        console.log('❌ Not authenticated with GitHub - cannot create issue');
        return null;
    }

    try {


        const response = await fetch(`${globalObject.GitHubAuth.GITHUB_CONFIG.apiBaseUrl}/repos/${globalObject.GitHubAuth.GITHUB_CONFIG.owner}/${globalObject.GitHubAuth.GITHUB_CONFIG.repo}/issues`, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${globalObject.GitHubAuth.githubAuth.accessToken}`,
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

        return issue;

    } catch (error) {
        // Only log errors in non-test environments
        if (!isTestEnvironment()) {
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
        const globalObject = (typeof window !== 'undefined') ? window : global;
        
        // Fetch both open and closed issues with cache-busting
        const timestamp = Date.now();
        const [openResponse, closedResponse] = await Promise.all([
            fetch(`${globalObject.GitHubAuth.GITHUB_CONFIG.apiBaseUrl}/repos/${globalObject.GitHubAuth.GITHUB_CONFIG.owner}/${globalObject.GitHubAuth.GITHUB_CONFIG.repo}/issues?state=open&_t=${timestamp}`),
            fetch(`${globalObject.GitHubAuth.GITHUB_CONFIG.apiBaseUrl}/repos/${globalObject.GitHubAuth.GITHUB_CONFIG.owner}/${globalObject.GitHubAuth.GITHUB_CONFIG.repo}/issues?state=closed&_t=${timestamp}`)
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
            const taskElement = (typeof window !== 'undefined' && window.GitHubUI) ? 
                window.GitHubUI.createGitHubIssueElement(issue, false) : null;
            if (!taskElement) return;
            
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
            
            if (typeof document !== 'undefined') {
                const column = document.getElementById(targetColumn);
                if (column) {
                    column.appendChild(taskElement);
                }
            }
        });
        
        // Add closed issues to done column
        closedIssues.forEach(issue => {
            const taskElement = (typeof window !== 'undefined' && window.GitHubUI) ? 
                window.GitHubUI.createGitHubIssueElement(issue, false) : null; // Don't add completed section here
            if (!taskElement || typeof document === 'undefined') return;
            
            const doneColumn = document.getElementById('done');
            if (doneColumn) {
                doneColumn.appendChild(taskElement);
            }
        });
        
        // Update column counts
        if (typeof window !== 'undefined' && window.updateColumnCounts) {
            window.updateColumnCounts();
        }
        
        // Apply review indicators to all cards in the review column
        if (typeof window !== 'undefined' && window.GitHubUI && window.GitHubUI.applyReviewIndicatorsToColumn) {
            window.GitHubUI.applyReviewIndicatorsToColumn();
        }
        
        // Apply completed sections to all cards in the done column
        if (typeof window !== 'undefined' && window.GitHubUI && window.GitHubUI.applyCompletedSectionsToColumn) {
            window.GitHubUI.applyCompletedSectionsToColumn();
        }
        
        
        
    } catch (error) {
        // Only log errors in non-test environments to avoid console noise during tests
        if (!isTestEnvironment()) {
            console.error('❌ Failed to load GitHub issues:', error);
        }
        // Don't show alert for loading issues - just log the error
    }
}

function initializeGitHubIssues() {
    
    
    // Add skeleton cards while loading
    if (typeof document !== 'undefined' && typeof window !== 'undefined' && window.GitHubUI) {
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
    }
    
    // Load real issues
    loadGitHubIssues().then(() => {
        // Remove skeleton cards
        if (typeof document !== 'undefined') {
            document.querySelectorAll('.animate-pulse').forEach(skeleton => {
                skeleton.remove();
            });
        }
        
        // Apply saved card order after GitHub issues are loaded
        if (typeof window !== 'undefined' && window.kanbanTestExports && window.kanbanTestExports.applyCardOrder) {
            window.kanbanTestExports.applyCardOrder();
        }
    });
}

// Export API functions as ES6 modules
export {
    createGitHubIssue,
    loadGitHubIssues,
    archiveGitHubIssue,
    updateGitHubIssueLabels,
    closeGitHubIssue,
    initializeGitHubIssues
};

// Keep window.GitHubAPI for backward compatibility (can be removed later)
// Ensure global object is available in both browser and test environments
const globalObject = (typeof window !== 'undefined') ? window : global;
globalObject.GitHubAPI = {
    // API functions
    createGitHubIssue,
    loadGitHubIssues,
    archiveGitHubIssue,
    updateGitHubIssueLabels,
    closeGitHubIssue,
    initializeGitHubIssues
}; 