// GitHub API Operations for Dashban Kanban Board

// Environment detection helper
function isTestEnvironment() {
    return typeof jest !== 'undefined';
}

// Surface an error to the user. Prefers a non-blocking toast notification and
// falls back to a blocking alert only when the Notifications module is absent.
function notifyError(message) {
    if (window.Notifications && window.Notifications.showError) {
        window.Notifications.showError(message);
    } else {
        window['alert'](message);
    }
}

// Archive GitHub issue by adding "archive" label
async function archiveGitHubIssue(issueNumber, taskElement) {
    if (!window.GitHubAuth.isGitHubAuthed()) {
        console.log('❌ Not authenticated with GitHub - cannot archive issue');
        // Remove from UI anyway
        taskElement.remove();
        window.updateColumnCounts();
        return;
    }

    try {


        // Add "archive" label to the issue
        const response = await window.GitHubAuth.githubFetch(`/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}/labels`, {
            method: 'POST',
            headers: {
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
        window.updateColumnCounts();
        
    } catch (error) {
        console.error('❌ Failed to archive GitHub issue:', error);
        
        // Show user-friendly error message but still remove from UI
        notifyError(`Failed to add archive label to GitHub issue: ${error.message}\n\nThe task will be removed from the board anyway.`);
        taskElement.remove();
        window.updateColumnCounts();
    }
}

// Update GitHub issue labels when moved between columns
async function updateGitHubIssueLabels(issueNumber, newColumn) {
    if (!window.GitHubAuth.isGitHubAuthed()) {
        console.log('❌ Not authenticated with GitHub - cannot update issue labels');
        return;
    }

    try {


        // First, get current issue to preserve existing labels
        const getResponse = await window.GitHubAuth.githubFetch(`/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}?_t=${Date.now()}`);

        if (!getResponse.ok) {
            throw new Error(`Failed to fetch issue: ${getResponse.status}`);
        }

        const issue = await getResponse.json();
        const currentLabels = issue.labels.map(label => label.name);

        // Remove existing status labels
        const statusLabels = ['todo', 'in progress', 'inprogress', 'review', 'in review', 'done', 'completed'];
        const filteredLabels = currentLabels.filter(label => 
            !statusLabels.includes(label.toLowerCase())
        );

        // Map columns to labels
        const columnLabelMap = {
            'backlog': null, // No specific label for backlog
            'todo': 'todo',
            'inprogress': 'in progress',
            'review': 'review',
            'done': 'done'
        };

        // Add new status label if applicable
        const newLabel = columnLabelMap[newColumn];
        const updatedLabels = newLabel ? [...filteredLabels, newLabel] : filteredLabels;

        // Update labels via API
        const updateResponse = await window.GitHubAuth.githubFetch(`/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}/labels`, {
            method: 'PUT',
            headers: {
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

        return true;

    } catch (error) {
        console.error('❌ Failed to update GitHub issue labels:', error);

        // Notify the user; the caller (board sync) reverts the optimistic move.
        notifyError(`Failed to update GitHub issue labels: ${error.message}\n\nThe card was moved back.`);
        return false;
    }
}

// Update GitHub issue title
async function updateGitHubIssueTitle(issueNumber, newTitle) {
    if (!window.GitHubAuth.isGitHubAuthed()) {
        console.log('❌ Not authenticated with GitHub - cannot update issue title');
        return false;
    }

    try {
        // Update the issue title via API
        const response = await window.GitHubAuth.githubFetch(`/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: newTitle
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        const issue = await response.json();
        console.log(`✅ Successfully updated GitHub issue #${issueNumber} title to: "${newTitle}"`);
        return true;
        
    } catch (error) {
        console.error('❌ Failed to update GitHub issue title:', error);
        
        // Show user-friendly error message
        notifyError(`Failed to update GitHub issue title: ${error.message}\n\nThe title was updated on the board but not on GitHub.`);
        return false;
    }
}

// Update GitHub issue description
async function updateGitHubIssueDescription(issueNumber, newDescription) {
    if (!window.GitHubAuth.isGitHubAuthed()) {
        console.log('❌ Not authenticated with GitHub - cannot update issue description');
        return false;
    }

    try {
        // Update the issue description via API
        const response = await window.GitHubAuth.githubFetch(`/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                body: newDescription
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        const issue = await response.json();
        console.log(`✅ Successfully updated GitHub issue #${issueNumber} description`);
        
        // Update the stored raw description in the task element for future edits
        const taskElement = document.querySelector(`[data-issue-number="${issueNumber}"]`);
        if (taskElement) {
            taskElement.setAttribute('data-raw-description', newDescription);
        }
        
        return true;
        
    } catch (error) {
        console.error('❌ Failed to update GitHub issue description:', error);
        
        // Show user-friendly error message
        notifyError(`Failed to update GitHub issue description: ${error.message}\n\nThe description was updated on the board but not on GitHub.`);
        return false;
    }
}

// Close GitHub issue when moved to Done column
async function closeGitHubIssue(issueNumber) {
    if (!window.GitHubAuth.isGitHubAuthed()) {
        console.log('❌ Not authenticated with GitHub - cannot close issue');
        return;
    }

    try {


        // Close the issue via API
        const response = await window.GitHubAuth.githubFetch(`/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}`, {
            method: 'PATCH',
            headers: {
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

        return true;

    } catch (error) {
        console.error('❌ Failed to close GitHub issue:', error);

        // Notify the user; the caller (board sync) reverts the optimistic move.
        notifyError(`Failed to close GitHub issue: ${error.message}\n\nThe card was moved back.`);
        return false;
    }
}

// Reopen GitHub issue
async function reopenGitHubIssue(issueNumber) {
    if (!window.GitHubAuth.isGitHubAuthed()) {
        console.log('❌ Not authenticated with GitHub - cannot reopen issue');
        return;
    }

    try {
        // Reopen the issue via API
        const response = await window.GitHubAuth.githubFetch(`/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                state: 'open'
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        console.log(`✅ Successfully reopened GitHub issue #${issueNumber}`);
        
    } catch (error) {
        console.error('❌ Failed to reopen GitHub issue:', error);
        
        // Show user-friendly error message but don't revert the UI change
        notifyError(`Failed to reopen GitHub issue: ${error.message}\n\nThe issue state was changed on the board but wasn't reopened on GitHub.`);
    }
}

// Update GitHub issue priority or category label
async function updateGitHubIssueMetadata(issueNumber, type, newValue) {
    if (!window.GitHubAuth.isGitHubAuthed()) {
        console.log('❌ Not authenticated with GitHub - cannot update issue metadata');
        return false;
    }

    try {
        // First, get current issue to preserve existing labels
        const getResponse = await window.GitHubAuth.githubFetch(`/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}?_t=${Date.now()}`);

        if (!getResponse.ok) {
            throw new Error(`Failed to fetch issue: ${getResponse.status}`);
        }

        const issue = await getResponse.json();
        const currentLabels = issue.labels.map(label => label.name);

        // Define label categories
        const priorityLabels = ['critical', 'high', 'medium', 'low'];
        const categoryLabels = ['frontend', 'backend', 'design', 'testing', 'database', 'setup', 'bug', 'enhancement', 'feature'];

        let updatedLabels = [...currentLabels];

        if (type === 'priority') {
            // Remove existing priority labels
            updatedLabels = updatedLabels.filter(label => !priorityLabels.includes(label.toLowerCase()));
            
            // Add new priority label if not empty
            if (newValue && newValue.trim() !== '') {
                updatedLabels.push(newValue.toLowerCase());
            }
        } else if (type === 'category') {
            // Remove existing category labels
            updatedLabels = updatedLabels.filter(label => !categoryLabels.includes(label.toLowerCase()));
            
            // Add new category label if not empty
            if (newValue && newValue.trim() !== '') {
                updatedLabels.push(newValue.toLowerCase());
            }
        }

        // Update labels via API
        const updateResponse = await window.GitHubAuth.githubFetch(`/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}/labels`, {
            method: 'PUT',
            headers: {
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

        console.log(`✅ Successfully updated GitHub issue #${issueNumber} ${type} to: "${newValue}"`);
        return true;
        
    } catch (error) {
        console.error(`❌ Failed to update GitHub issue ${type}:`, error);
        
        // Show user-friendly error message
        notifyError(`Failed to update GitHub issue ${type}: ${error.message}\n\nThe ${type} was updated on the board but not on GitHub.`);
        return false;
    }
}

// Create GitHub issue via API
async function createGitHubIssue(title, description, labels = []) {
    if (!window.GitHubAuth.isGitHubAuthed()) {
        console.log('❌ Not authenticated with GitHub - cannot create issue');
        return null;
    }

    try {


        const response = await window.GitHubAuth.githubFetch(`/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues`, {
            method: 'POST',
            headers: {
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
        /* istanbul ignore next: this console logging only runs outside the Jest test environment */
        if (!isTestEnvironment()) {
            console.error('❌ Failed to create GitHub issue:', error);
        }
        
        // Show user-friendly error message
        const errorMessage = error.message.includes('GitHub API error') 
            ? error.message 
            : 'Failed to create GitHub issue. Check your token permissions and network connection.';
        
        notifyError(`GitHub Issue Creation Failed:\n${errorMessage}\n\nThe task will be created locally instead.`);
        return null;
    }
}

// GitHub Issues Integration
async function loadGitHubIssues() {
    try {
        
        
        // Fetch both open and closed issues with cache-busting. buildGitHubRequest
        // selects the right transport (the /api/github proxy in Clerk mode, or
        // api.github.com otherwise) and the matching auth headers; unauthenticated
        // browsing sends no auth headers, preserving anonymous read-only access.
        const timestamp = Date.now();
        const base = `/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues`;
        const openReq = await window.GitHubAuth.buildGitHubRequest(`${base}?state=open&_t=${timestamp}`);
        const closedReq = await window.GitHubAuth.buildGitHubRequest(`${base}?state=closed&_t=${timestamp}`);
        const doFetch = window.RateLimit?.rateLimitedFetch || fetch;

        const [openResponse, closedResponse] = await Promise.all([
            doFetch(openReq.url, { headers: openReq.headers }),
            doFetch(closedReq.url, { headers: closedReq.headers })
        ]);
        
        if (!openResponse.ok || !closedResponse.ok) {
            const failed = openResponse.ok ? closedResponse : openResponse;
            const remaining = failed.headers && failed.headers.get('x-ratelimit-remaining');

            // A genuine GitHub rate limit: HTTP 403 with the remaining-requests
            // header at 0 (the proxy forwards these headers).
            if (failed.status === 403 && remaining === '0') {
                if (window.RateLimit?.handleApiResponse) {
                    window.RateLimit.handleApiResponse(failed);
                }
                throw new Error(`GitHub API rate limit exceeded`);
            }

            // Auth/token failure — e.g. the Clerk proxy has no GitHub token for this
            // user (401/403). This is NOT a rate limit; surface an actionable message
            // instead of failing silently or mislabeling it.
            if (failed.status === 401 || failed.status === 403) {
                notifyError('Could not load GitHub issues — your GitHub access needs to be reconnected. Sign in again and make sure your account has access to this repository.');
                throw new Error(`GitHub authorization failed: ${failed.status}`);
            }

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
        const columns = ['backlog', 'todo', 'inprogress', 'review', 'done'];
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
            if (statusLabels.includes('todo')) {
                targetColumn = 'todo';
            } else if (statusLabels.includes('in progress') || statusLabels.includes('inprogress')) {
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
        
        
        
    } catch (error) {
        // Only log errors in non-test environments to avoid console noise during tests
        /* istanbul ignore next: this console logging only runs outside the Jest test environment */
        if (!isTestEnvironment()) {
            console.error('❌ Failed to load GitHub issues:', error);

            // Handle rate limiting gracefully
            if (error.message.includes('Rate limit') || error.message.includes('rate limit')) {
                console.log('📊 GitHub API rate limited - banner should be visible');
                // Don't show additional alert - rate limit banner handles this
                return;
            }
        }
        // Don't show alert for loading issues - just log the error
    }
}

function initializeGitHubIssues() {
    
    
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
        
        // Clean up closed issues from localStorage before applying saved order
        if (window.CardPersistence && window.CardPersistence.cleanupClosedIssuesFromStorage) {
            window.CardPersistence.cleanupClosedIssuesFromStorage();
        }

        // Apply saved card order after GitHub issues are loaded
        if (window.kanbanTestExports && window.kanbanTestExports.applyCardOrder) {
            window.kanbanTestExports.applyCardOrder();
        }
    });
}

// Get GitHub issue comments
async function getGitHubIssueComments(issueNumber) {
    if (!window.GitHubAuth.isGitHubAuthed()) {
        console.log('❌ Not authenticated with GitHub - cannot fetch comments');
        return [];
    }

    try {
        const response = await window.GitHubAuth.githubFetch(`/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}/comments`, {
            method: 'GET'
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        const comments = await response.json();
        console.log(`✅ Successfully fetched ${comments.length} comments for issue #${issueNumber}`);
        return comments;

    } catch (error) {
        console.error(`❌ Failed to fetch GitHub issue comments:`, error);
        
        // Show user-friendly error message
        notifyError(`Failed to fetch GitHub issue comments: ${error.message}`);
        return [];
    }
}

// Create GitHub issue comment
async function createGitHubIssueComment(issueNumber, commentBody) {
    if (!window.GitHubAuth.isGitHubAuthed()) {
        console.log('❌ Not authenticated with GitHub - cannot create comment');
        return null;
    }

    try {
        const response = await window.GitHubAuth.githubFetch(`/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/issues/${issueNumber}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                body: commentBody
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
        }

        const comment = await response.json();
        console.log(`✅ Successfully created comment on issue #${issueNumber}`);
        return comment;

    } catch (error) {
        console.error(`❌ Failed to create GitHub issue comment:`, error);
        
        // Show user-friendly error message
        notifyError(`Failed to create GitHub issue comment: ${error.message}`);
        return null;
    }
}

// Export API functions
window.GitHubAPI = {
    // API functions
    createGitHubIssue,
    loadGitHubIssues,
    archiveGitHubIssue,
    updateGitHubIssueLabels,
    updateGitHubIssueTitle,
    updateGitHubIssueDescription,
    updateGitHubIssueMetadata,
    closeGitHubIssue,
    reopenGitHubIssue,
    initializeGitHubIssues,
    getGitHubIssueComments,
    createGitHubIssueComment
}; 