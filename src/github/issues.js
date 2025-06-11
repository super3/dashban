(function(windowObj, moduleObj) {
    const auth = (moduleObj && moduleObj.exports) ? require('./auth.js') : windowObj.GitHubAuth;
    const ui = (moduleObj && moduleObj.exports) ? require('./ui.js') : windowObj.GitHubUI;
    const { GITHUB_CONFIG, githubAuth } = auth;

    async function archiveGitHubIssue(issueNumber, taskElement) {
        if (!githubAuth.isAuthenticated || !githubAuth.accessToken) {
            console.log('❌ Not authenticated with GitHub App - cannot archive issue');
            taskElement.remove();
            windowObj.updateColumnCounts && windowObj.updateColumnCounts();
            return;
        }
        try {
            console.log(`🗃️ Archiving issue #${issueNumber}...`);
            const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues/${issueNumber}/labels`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `token ${githubAuth.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ labels: ['archive'] })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }
            console.log(`✅ Successfully archived issue #${issueNumber}`);
            taskElement.remove();
            windowObj.updateColumnCounts && windowObj.updateColumnCounts();
        } catch (error) {
            console.error('❌ Failed to archive GitHub issue:', error);
            alert(`Failed to add archive label to GitHub issue: ${error.message}\n\nThe task will be removed from the board anyway.`);
            taskElement.remove();
            windowObj.updateColumnCounts && windowObj.updateColumnCounts();
        }
    }

    async function updateGitHubIssueLabels(issueNumber, newColumn) {
        if (!githubAuth.isAuthenticated || !githubAuth.accessToken) {
            console.log('❌ Not authenticated with GitHub App - cannot update issue labels');
            return;
        }
        try {
            console.log(`🔄 Updating labels for issue #${issueNumber} moved to ${newColumn}...`);
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
            const statusLabels = ['in progress', 'inprogress', 'review', 'in review', 'done', 'completed'];
            const filteredLabels = currentLabels.filter(label => !statusLabels.includes(label.toLowerCase()));
            const columnLabelMap = {
                'backlog': null,
                'inprogress': 'in progress',
                'review': 'review',
                'done': 'done'
            };
            const newLabel = columnLabelMap[newColumn];
            const updatedLabels = newLabel ? [...filteredLabels, newLabel] : filteredLabels;
            const updateResponse = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues/${issueNumber}/labels`, {
                method: 'PUT',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `token ${githubAuth.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ labels: updatedLabels })
            });
            if (!updateResponse.ok) {
                const errorData = await updateResponse.json();
                throw new Error(`GitHub API error: ${updateResponse.status} - ${errorData.message || 'Unknown error'}`);
            }
            const columnDisplayName = newColumn === 'inprogress' ? 'In Progress' : newColumn.charAt(0).toUpperCase() + newColumn.slice(1);
            console.log(`✅ Successfully updated labels for issue #${issueNumber} (moved to ${columnDisplayName})`);
        } catch (error) {
            console.error('❌ Failed to update GitHub issue labels:', error);
            const columnDisplayName = newColumn === 'inprogress' ? 'In Progress' : newColumn.charAt(0).toUpperCase() + newColumn.slice(1);
            alert(`Failed to update GitHub issue labels: ${error.message}\n\nThe issue was moved to ${columnDisplayName} on the board but the labels weren't updated on GitHub.`);
        }
    }

    async function closeGitHubIssue(issueNumber) {
        if (!githubAuth.isAuthenticated || !githubAuth.accessToken) {
            console.log('❌ Not authenticated with GitHub App - cannot close issue');
            return;
        }
        try {
            console.log(`🔒 Closing GitHub issue #${issueNumber}...`);
            const response = await fetch(`${GITHUB_CONFIG.apiBaseUrl}/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/issues/${issueNumber}`, {
                method: 'PATCH',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `token ${githubAuth.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ state: 'closed' })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }
            console.log(`✅ Successfully closed GitHub issue #${issueNumber}`);
        } catch (error) {
            console.error('❌ Failed to close GitHub issue:', error);
            alert(`Failed to close GitHub issue: ${error.message}\n\nThe issue was moved to Done on the board but wasn't closed on GitHub.`);
        }
    }

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
                body: JSON.stringify({ title, body: description, labels })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`GitHub API error: ${response.status} - ${errorData.message || 'Unknown error'}`);
            }
            const issue = await response.json();
            console.log('✅ Successfully created GitHub issue:', issue.number);
            return issue;
        } catch (error) {
            if (typeof jest === 'undefined') {
                console.error('❌ Failed to create GitHub issue:', error);
            }
            const errorMessage = error.message.includes('GitHub API error') ? error.message : 'Failed to create GitHub issue. Check your token permissions and network connection.';
            alert(`GitHub Issue Creation Failed:\n${errorMessage}\n\nThe task will be created locally instead.`);
            return null;
        }
    }

    async function loadGitHubIssues() {
        try {
            console.log('Loading GitHub issues...');
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
            const openIssues = openIssuesRaw.filter(issue => !issue.labels.some(label => label.name.toLowerCase() === 'archive'));
            const closedIssues = closedIssuesRaw.filter(issue => !issue.labels.some(label => label.name.toLowerCase() === 'archive'));
            console.log(`Found ${openIssues.length} open and ${closedIssues.length} closed GitHub issues (filtered out archived issues)`);
            const columns = ['backlog', 'inprogress', 'review', 'done'];
            columns.forEach(columnId => {
                const column = document.getElementById(columnId);
                if (column) {
                    const issueCards = column.querySelectorAll('[data-issue-number]');
                    issueCards.forEach(card => card.remove());
                }
            });
            openIssues.forEach(issue => {
                const taskElement = createGitHubIssueElement(issue, false);
                let targetColumn = 'backlog';
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
            closedIssues.forEach(issue => {
                const taskElement = createGitHubIssueElement(issue, false);
                const doneColumn = document.getElementById('done');
                if (doneColumn) {
                    doneColumn.appendChild(taskElement);
                }
            });
            windowObj.updateColumnCounts && windowObj.updateColumnCounts();
            ui.applyReviewIndicatorsToColumn();
            ui.applyCompletedSectionsToColumn();
            console.log('✅ GitHub issues loaded successfully');
        } catch (error) {
            if (typeof jest === 'undefined') {
                console.error('❌ Failed to load GitHub issues:', error);
            }
        }
    }

    function renderMarkdown(text) {
        if (!text) return 'No description provided';
        const escapeHtml = (str) => str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        let html = escapeHtml(text);
        html = html
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-100 text-gray-800 px-1 rounded text-xs">$1</code>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-blue-600 hover:text-blue-800 underline">$1</a>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>');
        if (html.includes('</p><p>')) {
            html = '<p>' + html + '</p>';
        }
        return html;
    }

    function extractPriorityFromLabels(labels) {
        const priorityLabels = ['critical', 'high', 'medium', 'low'];
        const foundPriority = labels.find(label => priorityLabels.includes(label.name.toLowerCase()));
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
        return 'Setup';
    }

    function createGitHubIssueElement(issue, isCompleted = false) {
        const taskDiv = document.createElement('div');
        taskDiv.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-move';
        taskDiv.draggable = true;
        taskDiv.setAttribute('data-github-issue', issue.number);
        taskDiv.setAttribute('data-issue-number', issue.number);
        taskDiv.setAttribute('data-issue-id', issue.id);
        const priority = extractPriorityFromLabels(issue.labels);
        const category = extractCategoryFromLabels(issue.labels);
        const description = renderMarkdown(issue.body);
        taskDiv.innerHTML = `
        <div class="flex items-start justify-between mb-2">
            <h4 class="font-medium text-gray-900 text-sm">${issue.title}</h4>
            <a href="${issue.html_url}" target="_blank" class="text-gray-500 hover:text-gray-700 text-xs font-medium">#${issue.number}</a>
        </div>
        <p class="text-gray-600 text-sm mb-3">${description}</p>
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                ${priority ? `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${windowObj.getPriorityColor(priority)}">${priority}</span>` : ''}
                ${category ? `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${windowObj.getCategoryColor(category)}">${category}</span>` : ''}
            </div>
            ${issue.user ? `<img src="${issue.user.avatar_url}" alt="${issue.user.login}" class="w-6 h-6 rounded-full">` : `<div class="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center"><i class="fas fa-user text-gray-400 text-xs"></i></div>`}
        </div>
        ${isCompleted ? `<div class="border-t border-gray-200 mt-3 pt-1 -mb-2"><div class="flex items-center justify-between"><div class="flex items-center space-x-2"><i class="fas fa-check-circle text-green-500 text-xs"></i><span class="text-xs text-green-600">Completed</span></div><button class="archive-btn text-gray-400 hover:text-gray-600 p-1 transition-colors" title="Archive issue" data-issue-number="${issue.number}"><i class="fas fa-archive text-xs"></i></button></div></div>` : ''}`;
        return taskDiv;
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
        </div>`;
        return skeletonElement;
    }

    function initializeGitHubIssues() {
        console.log('🔄 Initializing GitHub issues integration...');
        const columns = ['backlog', 'inprogress', 'review', 'done'];
        columns.forEach(columnId => {
            const column = document.getElementById(columnId);
            if (column) {
                const skeletonCount = Math.floor(Math.random() * 2) + 1;
                for (let i = 0; i < skeletonCount; i++) {
                    column.appendChild(createSkeletonCard());
                }
            }
        });
        loadGitHubIssues().then(() => {
            document.querySelectorAll('.animate-pulse').forEach(skeleton => {
                skeleton.remove();
            });
        });
    }

    const exports = {
        archiveGitHubIssue,
        updateGitHubIssueLabels,
        closeGitHubIssue,
        createGitHubIssue,
        loadGitHubIssues,
        renderMarkdown,
        createGitHubIssueElement,
        extractPriorityFromLabels,
        extractCategoryFromLabels,
        createSkeletonCard,
        initializeGitHubIssues
    };

    if (moduleObj && moduleObj.exports) {
        moduleObj.exports = exports;
    } else if (windowObj) {
        windowObj.GitHubIssues = exports;
    }
})(typeof window !== 'undefined' ? window : null, typeof module !== 'undefined' ? module : null);
