// Issue Modal JavaScript - Handles the detailed view and editing of GitHub issues

// Modal state tracking
let modalEventHandlersSetup = false;

// Issue Modal Functions
function openIssueModal(issueNumber, taskElement) {
    const modal = document.getElementById('issue-modal');
    if (!modal) {
        console.error('Issue modal not found');
        return;
    }

    // Set up event handlers only once
    if (!modalEventHandlersSetup) {
        setupIssueModalEventHandlers();
        modalEventHandlersSetup = true;
    }

    // Show modal
    modal.classList.remove('hidden');
    
    // Populate modal with issue data
    populateIssueModal(issueNumber, taskElement);
}

function closeIssueModal() {
    const modal = document.getElementById('issue-modal');
    if (modal) {
        modal.classList.add('hidden');
        // Reset edit states
        resetEditStates();
    }
}

function populateIssueModal(issueNumber, taskElement) {
    // Extract data from the task element
    const titleElement = taskElement.querySelector('h4');
    const descriptionElement = taskElement.querySelector('.markdown-content');
    const linkElement = taskElement.querySelector('a[href]');
    
    const title = titleElement ? titleElement.textContent : 'Unknown Title';
    
    // For description, we need to get the raw text content, not the rendered HTML
    // The kanban card stores rendered markdown, but we need to extract the original text
    // We'll try to get it from the data attribute if available, otherwise extract from HTML
    let rawDescription = '';
    let renderedDescription = 'No description available';
    
    if (descriptionElement) {
        // Try to get raw description from data attribute first
        rawDescription = taskElement.getAttribute('data-raw-description') || '';
        
        if (rawDescription) {
            // We have raw markdown, render it
            if (window.GitHubUI && window.GitHubUI.renderMarkdown) {
                renderedDescription = window.GitHubUI.renderMarkdown(rawDescription);
            } else {
                renderedDescription = rawDescription;
            }
        } else {
            // Fallback: extract text content from the rendered element
            rawDescription = descriptionElement.textContent || '';
            renderedDescription = descriptionElement.innerHTML || 'No description available';
        }
    }
    
    // Populate modal content
    document.getElementById('issue-modal-number').textContent = `#${issueNumber}`;
    document.getElementById('issue-modal-title').textContent = title;
    document.getElementById('issue-description-display').innerHTML = renderedDescription;
    
    // Store raw description for editing
    document.getElementById('issue-description-edit').value = rawDescription;
    
    // Extract GitHub URL
    if (linkElement) {
        const githubUrl = linkElement.href;
        document.getElementById('view-on-github-btn').href = githubUrl;
    }
    
    // Clear comments and load them from GitHub
    loadAndDisplayComments(issueNumber);
    
    // Extract labels from task element
    const priorityElement = taskElement.querySelector('[class*="bg-red-100"], [class*="bg-yellow-100"], [class*="bg-green-100"]');
    const categoryElement = taskElement.querySelector('[class*="bg-indigo-100"], [class*="bg-blue-100"], [class*="bg-purple-100"]');
    
    // Determine current column
    const column = taskElement.closest('[id]').id;
    const columnNames = {
        'backlog': 'Backlog',
        'inprogress': 'In Progress', 
        'review': 'Review',
        'done': 'Done'
    };

    // Update title editing field
    const titleEdit = document.getElementById('issue-title-edit');
    if (titleEdit) titleEdit.value = title;

    // Update priority and category dropdowns
    const prioritySelect = document.getElementById('issue-priority-select');
    const categorySelect = document.getElementById('issue-category-select');
    
    if (prioritySelect) {
        prioritySelect.value = priorityElement ? priorityElement.textContent : '';
    }
    
    if (categorySelect) {
        categorySelect.value = categoryElement ? categoryElement.textContent : '';
    }

    // Update status section
    const stateBadge = document.getElementById('issue-state-badge');
    const columnBadge = document.getElementById('issue-column-badge');
    
    if (stateBadge) {
        if (column === 'done') {
            stateBadge.className = 'px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800';
            stateBadge.textContent = 'Closed';
        } else {
            stateBadge.className = 'px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800';
            stateBadge.textContent = 'Open';
        }
    }
    
    if (columnBadge) {
        columnBadge.textContent = columnNames[column] || column;
    }
    
    // Update action buttons
    const closeBtn = document.getElementById('close-issue-btn');
    const reopenBtn = document.getElementById('reopen-issue-btn');
    
    if (closeBtn && reopenBtn) {
        if (column === 'done') {
            closeBtn.classList.add('hidden');
            reopenBtn.classList.remove('hidden');
        } else {
            closeBtn.classList.remove('hidden');
            reopenBtn.classList.add('hidden');
        }
    }
}

function resetEditStates() {
    // Reset title editing
    const titleDisplay = document.getElementById('issue-modal-title');
    const titleNumber = document.getElementById('issue-modal-number');
    const titleEdit = document.getElementById('issue-title-edit');
    const titleActions = document.getElementById('title-edit-actions');
    const editTitleBtn = document.getElementById('edit-title-btn');
    
    if (titleDisplay) titleDisplay.classList.remove('hidden');
    if (titleNumber) titleNumber.classList.remove('hidden');
    if (titleEdit) titleEdit.classList.add('hidden');
    if (titleActions) titleActions.classList.add('hidden');
    if (editTitleBtn) editTitleBtn.classList.remove('hidden');
    
    // Reset description editing
    const descDisplay = document.getElementById('issue-description-display');
    const descEdit = document.getElementById('issue-description-edit');
    const descActions = document.getElementById('description-edit-actions');
    
    if (descDisplay) descDisplay.classList.remove('hidden');
    if (descEdit) descEdit.classList.add('hidden');
    if (descActions) descActions.classList.add('hidden');
    

}

// Issue Modal Event Handlers
function setupIssueModalEventHandlers() {
    // Close modal handlers
    const closeModalBtn = document.getElementById('close-issue-modal');
    const modal = document.getElementById('issue-modal');
    
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeIssueModal);
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            // Close modal if clicking on the backdrop (outside the modal content)
            // Use more specific selector to find the actual modal content
            const modalContent = modal.querySelector('.max-w-4xl');
            if (modalContent && !modalContent.contains(e.target)) {
                closeIssueModal();
            }
        });
    }
    
    // Title editing handlers
    const editTitleBtn = document.getElementById('edit-title-btn');
    const saveTitleBtn = document.getElementById('save-title-btn');
    const cancelTitleBtn = document.getElementById('cancel-title-btn');
    
    if (editTitleBtn) {
        editTitleBtn.addEventListener('click', function() {
            document.getElementById('issue-modal-title').classList.add('hidden');
            document.getElementById('issue-modal-number').classList.add('hidden');
            document.getElementById('issue-title-edit').classList.remove('hidden');
            document.getElementById('title-edit-actions').classList.remove('hidden');
            editTitleBtn.classList.add('hidden');
            document.getElementById('issue-title-edit').focus();
        });
    }
    
    if (saveTitleBtn) {
        saveTitleBtn.addEventListener('click', async function() {
            const newTitle = document.getElementById('issue-title-edit').value.trim();
            
            if (!newTitle) {
                alert('Title cannot be empty');
                return;
            }
            
            // Get issue number from the modal
            const issueNumberElement = document.getElementById('issue-modal-number');
            const issueNumber = issueNumberElement.textContent.replace('#', '');
            
            // Update UI immediately for better UX
            document.getElementById('issue-modal-title').textContent = newTitle;
            
            // Also update the title in the kanban card if it exists
            const taskElement = document.querySelector(`[data-issue-number="${issueNumber}"]`);
            if (taskElement) {
                const titleElement = taskElement.querySelector('h4');
                if (titleElement) {
                    titleElement.textContent = newTitle;
                }
            }
            
            // Reset UI state
            document.getElementById('issue-modal-title').classList.remove('hidden');
            document.getElementById('issue-modal-number').classList.remove('hidden');
            document.getElementById('issue-title-edit').classList.add('hidden');
            document.getElementById('title-edit-actions').classList.add('hidden');
            editTitleBtn.classList.remove('hidden');
            
            // Save to GitHub API
            if (window.GitHubAPI && window.GitHubAPI.updateGitHubIssueTitle) {
                await window.GitHubAPI.updateGitHubIssueTitle(issueNumber, newTitle);
            } else {
                console.log('GitHub API not available, title updated locally only');
            }
        });
    }
    
    if (cancelTitleBtn) {
        cancelTitleBtn.addEventListener('click', function() {
            document.getElementById('issue-modal-title').classList.remove('hidden');
            document.getElementById('issue-modal-number').classList.remove('hidden');
            document.getElementById('issue-title-edit').classList.add('hidden');
            document.getElementById('title-edit-actions').classList.add('hidden');
            editTitleBtn.classList.remove('hidden');
        });
    }

    // Description editing handlers
    const editDescBtn = document.getElementById('edit-description-btn');
    const saveDescBtn = document.getElementById('save-description-btn');
    const cancelDescBtn = document.getElementById('cancel-description-btn');
    
    if (editDescBtn) {
        editDescBtn.addEventListener('click', function() {
            document.getElementById('issue-description-display').classList.add('hidden');
            document.getElementById('issue-description-edit').classList.remove('hidden');
            document.getElementById('description-edit-actions').classList.remove('hidden');
            document.getElementById('issue-description-edit').focus();
        });
    }
    
    if (saveDescBtn) {
        saveDescBtn.addEventListener('click', async function() {
            const newDesc = document.getElementById('issue-description-edit').value;
            
            // Get issue number from the modal
            const issueNumberElement = document.getElementById('issue-modal-number');
            const issueNumber = issueNumberElement.textContent.replace('#', '');
            
            // Render markdown if available
            let renderedDesc;
            if (window.GitHubUI && window.GitHubUI.renderMarkdown) {
                renderedDesc = window.GitHubUI.renderMarkdown(newDesc);
                document.getElementById('issue-description-display').innerHTML = renderedDesc;
            } else {
                renderedDesc = newDesc;
                document.getElementById('issue-description-display').textContent = renderedDesc;
            }
            
            // Exit edit mode
            document.getElementById('issue-description-display').classList.remove('hidden');
            document.getElementById('issue-description-edit').classList.add('hidden');
            document.getElementById('description-edit-actions').classList.add('hidden');
            
            // Update the kanban card description if it exists
            const taskElement = document.querySelector(`[data-issue-number="${issueNumber}"]`);
            if (taskElement) {
                const descElement = taskElement.querySelector('.markdown-content');
                if (descElement) {
                    if (window.GitHubUI && window.GitHubUI.renderMarkdown) {
                        descElement.innerHTML = window.GitHubUI.renderMarkdown(newDesc);
                    } else {
                        descElement.textContent = newDesc;
                    }
                }
                
                // Update the stored raw description for future edits
                taskElement.setAttribute('data-raw-description', newDesc);
            }
            
            // Update via GitHub API if this is a GitHub issue
            if (taskElement && taskElement.hasAttribute('data-github-issue')) {
                try {
                    const success = await window.GitHubAPI.updateGitHubIssueDescription(issueNumber, newDesc);
                    if (success) {
                        console.log(`✅ Successfully updated GitHub issue #${issueNumber} description locally and on GitHub`);
                    }
                } catch (error) {
                    console.error('❌ Failed to update GitHub issue description:', error);
                }
            } else {
                console.log(`Updated local task description: "${newDesc}"`);
            }
        });
    }
    
    if (cancelDescBtn) {
        cancelDescBtn.addEventListener('click', function() {
            document.getElementById('issue-description-display').classList.remove('hidden');
            document.getElementById('issue-description-edit').classList.add('hidden');
            document.getElementById('description-edit-actions').classList.add('hidden');
        });
    }
    
    // Priority and Category change handlers
    const prioritySelect = document.getElementById('issue-priority-select');
    const categorySelect = document.getElementById('issue-category-select');
    
    if (prioritySelect) {
        prioritySelect.addEventListener('change', async function() {
            const newPriority = this.value;
            const issueNumberElement = document.getElementById('issue-modal-number');
            if (!issueNumberElement) return;
            
            const issueNumber = issueNumberElement.textContent.replace('#', '');
            
            // Update the kanban card priority if it exists
            const taskElement = document.querySelector(`[data-issue-number="${issueNumber}"]`);
            if (taskElement) {
                // Find the current priority badge
                const labelContainer = taskElement.querySelector('.flex.items-center.space-x-2');
                if (labelContainer) {
                    // Remove existing priority badge (look for known priority texts)
                    const existingPriorityBadge = Array.from(labelContainer.querySelectorAll('span')).find(span => {
                        const text = span.textContent.toLowerCase();
                        return ['critical', 'high', 'medium', 'low'].includes(text);
                    });
                    
                    if (existingPriorityBadge) {
                        existingPriorityBadge.remove();
                    }
                    
                    // Add new priority badge if priority is selected
                    if (newPriority && window.getPriorityColor) {
                        const priorityBadge = document.createElement('span');
                        priorityBadge.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${window.getPriorityColor(newPriority)}`;
                        priorityBadge.textContent = newPriority;
                        
                        // Insert at the beginning of the label container
                        labelContainer.insertBefore(priorityBadge, labelContainer.firstChild);
                    }
                }
            }
            
            // Update GitHub issue labels
            if (window.GitHubAPI && window.GitHubAPI.updateGitHubIssueMetadata) {
                await window.GitHubAPI.updateGitHubIssueMetadata(issueNumber, 'priority', newPriority);
            } else {
                console.log('GitHub API not available, priority updated locally only');
            }
        });
    }
    
    if (categorySelect) {
        categorySelect.addEventListener('change', async function() {
            const newCategory = this.value;
            const issueNumberElement = document.getElementById('issue-modal-number');
            if (!issueNumberElement) return;
            
            const issueNumber = issueNumberElement.textContent.replace('#', '');
            
            // Update the kanban card category if it exists
            const taskElement = document.querySelector(`[data-issue-number="${issueNumber}"]`);
            if (taskElement) {
                // Find the current category badge
                const labelContainer = taskElement.querySelector('.flex.items-center.space-x-2');
                if (labelContainer) {
                    // Remove existing category badge (look for known category texts)
                    const existingCategoryBadge = Array.from(labelContainer.querySelectorAll('span')).find(span => {
                        const text = span.textContent.toLowerCase();
                        return ['frontend', 'backend', 'design', 'testing', 'database', 'setup', 'bug', 'enhancement', 'feature'].includes(text);
                    });
                    
                    if (existingCategoryBadge) {
                        existingCategoryBadge.remove();
                    }
                    
                    // Add new category badge if category is selected
                    if (newCategory && window.getCategoryColor) {
                        const categoryBadge = document.createElement('span');
                        categoryBadge.className = `inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${window.getCategoryColor(newCategory)}`;
                        categoryBadge.textContent = newCategory;
                        
                        // Insert after priority badge or at beginning if no priority
                        const priorityBadge = Array.from(labelContainer.querySelectorAll('span')).find(span => {
                            const text = span.textContent.toLowerCase();
                            return ['critical', 'high', 'medium', 'low'].includes(text);
                        });
                        
                        if (priorityBadge) {
                            labelContainer.insertBefore(categoryBadge, priorityBadge.nextSibling);
                        } else {
                            labelContainer.insertBefore(categoryBadge, labelContainer.firstChild);
                        }
                    }
                }
            }
            
            // Update GitHub issue labels
            if (window.GitHubAPI && window.GitHubAPI.updateGitHubIssueMetadata) {
                await window.GitHubAPI.updateGitHubIssueMetadata(issueNumber, 'category', newCategory);
            } else {
                console.log('GitHub API not available, category updated locally only');
            }
        });
    }
    
    // Action button handlers
    const closeIssueBtn = document.getElementById('close-issue-btn');
    const reopenIssueBtn = document.getElementById('reopen-issue-btn');
    const addCommentBtn = document.getElementById('add-comment-btn');
    
    if (closeIssueBtn) {
        closeIssueBtn.addEventListener('click', async function() {
            // Get issue number from the modal
            const issueNumberElement = document.getElementById('issue-modal-number');
            if (!issueNumberElement) return;
            
            const issueNumber = issueNumberElement.textContent.replace('#', '');
            
            // Update UI immediately for better UX
            const stateBadge = document.getElementById('issue-state-badge');
            if (stateBadge) {
                stateBadge.className = 'px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800';
                stateBadge.textContent = 'Closed';
            }
            closeIssueBtn.classList.add('hidden');
            if (reopenIssueBtn) reopenIssueBtn.classList.remove('hidden');
            
            // Also move the task to done column in the kanban board
            const taskElement = document.querySelector(`[data-issue-number="${issueNumber}"]`);
            if (taskElement) {
                const doneColumn = document.getElementById('done');
                if (doneColumn) {
                    doneColumn.appendChild(taskElement);
                    
                    // Update column counts using the global function
                    if (window.KanbanBoard && window.KanbanBoard.updateColumnCounts) {
                        window.KanbanBoard.updateColumnCounts();
                    }
                    
                    // Add completed section to the card
                    if (window.GitHubUI && window.GitHubUI.addCompletedSection) {
                        window.GitHubUI.addCompletedSection(taskElement);
                    }
                }
            }
            
            // Close issue via GitHub API
            if (window.GitHubAPI && window.GitHubAPI.closeGitHubIssue) {
                await window.GitHubAPI.closeGitHubIssue(issueNumber);
            } else {
                console.log('GitHub API not available, issue closed locally only');
            }
        });
    }
    
    if (reopenIssueBtn) {
        reopenIssueBtn.addEventListener('click', async function() {
            // Get issue number from the modal
            const issueNumberElement = document.getElementById('issue-modal-number');
            if (!issueNumberElement) return;
            
            const issueNumber = issueNumberElement.textContent.replace('#', '');
            
            // Update UI immediately for better UX
            const stateBadge = document.getElementById('issue-state-badge');
            if (stateBadge) {
                stateBadge.className = 'px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800';
                stateBadge.textContent = 'Open';
            }
            reopenIssueBtn.classList.add('hidden');
            if (closeIssueBtn) closeIssueBtn.classList.remove('hidden');
            
            // Also move the task back to backlog column in the kanban board
            const taskElement = document.querySelector(`[data-issue-number="${issueNumber}"]`);
            if (taskElement) {
                const backlogColumn = document.getElementById('backlog');
                if (backlogColumn) {
                    backlogColumn.appendChild(taskElement);
                    
                    // Update column counts using the global function
                    if (window.KanbanBoard && window.KanbanBoard.updateColumnCounts) {
                        window.KanbanBoard.updateColumnCounts();
                    }
                    
                    // Remove completed section from the card
                    if (window.GitHubUI && window.GitHubUI.removeCompletedSection) {
                        window.GitHubUI.removeCompletedSection(taskElement);
                    }
                }
            }
            
            // Reopen issue via GitHub API
            if (window.GitHubAPI && window.GitHubAPI.reopenGitHubIssue) {
                await window.GitHubAPI.reopenGitHubIssue(issueNumber);
            } else {
                console.log('GitHub API not available, issue reopened locally only');
            }
        });
    }
    
    if (addCommentBtn) {
        addCommentBtn.addEventListener('click', async function() {
            const commentText = document.getElementById('new-comment-text').value.trim();
            if (!commentText) {
                alert('Please enter a comment');
                return;
            }

            // Get issue number from the modal
            const issueNumberElement = document.getElementById('issue-modal-number');
            if (!issueNumberElement) return;
            
            const issueNumber = issueNumberElement.textContent.replace('#', '');
            
            // Disable button during API call
            addCommentBtn.disabled = true;
            addCommentBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>Adding...';
            
            try {
                // Create comment via GitHub API
                const comment = await window.GitHubAPI.createGitHubIssueComment(issueNumber, commentText);
                
                if (comment) {
                    // Clear the text area
                    document.getElementById('new-comment-text').value = '';
                    
                    // Refresh comments list to show the new comment
                    await loadAndDisplayComments(issueNumber);
                }
            } catch (error) {
                console.error('Failed to add comment:', error);
            } finally {
                // Re-enable button
                addCommentBtn.disabled = false;
                addCommentBtn.innerHTML = '<i class="fas fa-comment mr-1"></i>Add Comment';
            }
        });
    }
}

// Helper functions for styling priority and category badges
function getPriorityClasses(priority) {
    const baseClasses = 'task-priority inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
    if (!priority || !window.getPriorityColor) return baseClasses;
    return `${baseClasses} ${window.getPriorityColor(priority)}`;
}

function getCategoryClasses(category) {
    const baseClasses = 'task-category inline-flex items-center px-2 py-1 rounded-full text-xs font-medium';
    if (!category || !window.getCategoryColor) return baseClasses;
    return `${baseClasses} ${window.getCategoryColor(category)}`;
}

// Load and display GitHub issue comments
async function loadAndDisplayComments(issueNumber) {
    const commentsList = document.getElementById('comments-list');
    if (!commentsList) return;
    
    // Show loading state
    commentsList.innerHTML = `
        <div class="text-gray-500 text-center py-8">
            <i class="fas fa-spinner fa-spin text-2xl mb-2"></i>
            <p>Loading comments...</p>
        </div>
    `;
    
    try {
        // Fetch comments from GitHub API
        const comments = await window.GitHubAPI.getGitHubIssueComments(issueNumber);
        
        if (comments.length === 0) {
            // No comments
            commentsList.innerHTML = `
                <div class="text-gray-500 text-center py-8">
                    <i class="fas fa-comments text-2xl mb-2"></i>
                    <p>No comments yet. Be the first to comment!</p>
                </div>
            `;
        } else {
            // Display comments
            commentsList.innerHTML = comments.map(comment => createCommentElement(comment)).join('');
        }
    } catch (error) {
        // Error loading comments
        commentsList.innerHTML = `
            <div class="text-red-500 text-center py-8">
                <i class="fas fa-exclamation-triangle text-2xl mb-2"></i>
                <p>Failed to load comments</p>
                <button class="mt-2 text-sm text-blue-600 hover:text-blue-800 underline" onclick="loadAndDisplayComments('${issueNumber}')">
                    Try again
                </button>
            </div>
        `;
        console.error('Failed to load comments:', error);
    }
}

// Create HTML element for a single comment
function createCommentElement(comment) {
    const createdAt = new Date(comment.created_at);
    const timeAgo = getTimeAgo(createdAt);
    
    // Render markdown content if available
    let renderedBody = comment.body;
    if (window.GitHubUI && window.GitHubUI.renderMarkdown) {
        renderedBody = window.GitHubUI.renderMarkdown(comment.body);
    }
    
    return `
        <div class="border border-gray-200 rounded-lg p-4" data-comment-id="${comment.id}">
            <div class="flex items-start space-x-3">
                <div class="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    ${comment.user.avatar_url ? 
                        `<img src="${comment.user.avatar_url}" alt="${comment.user.login}" class="w-8 h-8 rounded-full">` :
                        `<i class="fas fa-user text-gray-600 text-sm"></i>`
                    }
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center space-x-2 mb-2">
                        <span class="font-medium text-gray-900">${comment.user.login}</span>
                        <span class="text-sm text-gray-500">${timeAgo}</span>
                    </div>
                    <div class="prose prose-sm max-w-none text-gray-700">
                        ${renderedBody}
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Helper function to get time ago string
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffSeconds < 60) {
        return 'just now';
    } else if (diffMinutes < 60) {
        return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
        return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
        return date.toLocaleDateString();
    }
}

// Export functions to global scope
window.IssueModal = {
    openIssueModal,
    closeIssueModal,
    populateIssueModal,
    resetEditStates,
    setupIssueModalEventHandlers
};

// Export helper functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getPriorityClasses,
        getCategoryClasses,
        loadAndDisplayComments,
        createCommentElement,
        getTimeAgo
    };
} else {
    // Make functions available globally for testing
    window.getPriorityClasses = getPriorityClasses;
    window.getCategoryClasses = getCategoryClasses;
    window.loadAndDisplayComments = loadAndDisplayComments;
    window.createCommentElement = createCommentElement;
    window.getTimeAgo = getTimeAgo;
} 