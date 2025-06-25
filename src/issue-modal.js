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
    const description = descriptionElement ? descriptionElement.innerHTML : 'No description available';
    const githubUrl = linkElement ? linkElement.href : '#';
    
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

    // Update modal header
    const modalTitle = document.getElementById('issue-modal-title');
    const modalNumber = document.getElementById('issue-modal-number');
    const titleEdit = document.getElementById('issue-title-edit');
    
    if (modalTitle) modalTitle.textContent = title;
    if (modalNumber) modalNumber.textContent = `#${issueNumber}`;
    if (titleEdit) titleEdit.value = title;

    // Update description section
    const descriptionDisplay = document.getElementById('issue-description-display');
    const descriptionEdit = document.getElementById('issue-description-edit');
    
    if (descriptionDisplay) descriptionDisplay.innerHTML = description;
    if (descriptionEdit) descriptionEdit.value = descriptionElement ? descriptionElement.textContent : '';

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
    const viewBtn = document.getElementById('view-on-github-btn');
    
    if (closeBtn && reopenBtn) {
        if (column === 'done') {
            closeBtn.classList.add('hidden');
            reopenBtn.classList.remove('hidden');
        } else {
            closeBtn.classList.remove('hidden');
            reopenBtn.classList.add('hidden');
        }
    }
    
    if (viewBtn) {
        viewBtn.href = githubUrl;
    }

    // Clear comments (will be populated with real data later)
    const commentsList = document.getElementById('comments-list');
    if (commentsList) {
        commentsList.innerHTML = `
            <div class="text-gray-500 text-center py-8">
                <i class="fas fa-comments text-2xl mb-2"></i>
                <p>Comments loading... (Feature coming soon)</p>
            </div>
        `;
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
                const titleElement = taskElement.querySelector('.task-title');
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
        saveDescBtn.addEventListener('click', function() {
            const newDesc = document.getElementById('issue-description-edit').value;
            // Render markdown if available
            if (window.GitHubUI && window.GitHubUI.renderMarkdown) {
                document.getElementById('issue-description-display').innerHTML = window.GitHubUI.renderMarkdown(newDesc);
            } else {
                document.getElementById('issue-description-display').textContent = newDesc;
            }
            
            document.getElementById('issue-description-display').classList.remove('hidden');
            document.getElementById('issue-description-edit').classList.add('hidden');
            document.getElementById('description-edit-actions').classList.add('hidden');
            
            // TODO: Save to GitHub API
            console.log('Save description to GitHub API:', newDesc);
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
            const issueNumber = issueNumberElement.textContent.replace('#', '');
            
            // Update the kanban card priority if it exists
            const taskElement = document.querySelector(`[data-issue-number="${issueNumber}"]`);
            if (taskElement) {
                const priorityElement = taskElement.querySelector('.task-priority');
                if (priorityElement) {
                    priorityElement.textContent = newPriority;
                    priorityElement.style.display = newPriority ? 'inline' : 'none';
                }
            }
            
            // TODO: Save to GitHub API
            console.log('Update priority to GitHub API:', newPriority);
        });
    }
    
    if (categorySelect) {
        categorySelect.addEventListener('change', async function() {
            const newCategory = this.value;
            const issueNumberElement = document.getElementById('issue-modal-number');
            const issueNumber = issueNumberElement.textContent.replace('#', '');
            
            // Update the kanban card category if it exists
            const taskElement = document.querySelector(`[data-issue-number="${issueNumber}"]`);
            if (taskElement) {
                const categoryElement = taskElement.querySelector('.task-category');
                if (categoryElement) {
                    categoryElement.textContent = newCategory;
                    categoryElement.style.display = newCategory ? 'inline' : 'none';
                }
            }
            
            // TODO: Save to GitHub API
            console.log('Update category to GitHub API:', newCategory);
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
                    window.updateColumnCounts();
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
            
            // Also move the task back to backlog column in the kanban board (default for reopened issues)
            const taskElement = document.querySelector(`[data-issue-number="${issueNumber}"]`);
            if (taskElement) {
                const backlogColumn = document.getElementById('backlog');
                if (backlogColumn) {
                    backlogColumn.appendChild(taskElement);
                    window.updateColumnCounts();
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
        addCommentBtn.addEventListener('click', function() {
            const commentText = document.getElementById('new-comment-text').value.trim();
            if (commentText) {
                // TODO: Add comment via GitHub API
                console.log('Add comment via GitHub API:', commentText);
                
                // Clear the textarea
                document.getElementById('new-comment-text').value = '';
                
                // TODO: Refresh comments list
            }
        });
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