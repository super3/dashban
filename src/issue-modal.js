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
    document.getElementById('issue-modal-title').textContent = title;
    document.getElementById('issue-modal-number').textContent = `#${issueNumber}`;
    document.getElementById('issue-title-edit').value = title;

    // Update description section
    document.getElementById('issue-description-display').innerHTML = description;
    document.getElementById('issue-description-edit').value = descriptionElement ? descriptionElement.textContent : '';

    // Update labels section
    const labelsDisplay = document.getElementById('issue-labels-display');
    labelsDisplay.innerHTML = '';
    
    if (priorityElement || categoryElement) {
        if (priorityElement) {
            const priority = priorityElement.textContent;
            const priorityColors = {
                'High': 'bg-red-100 text-red-800',
                'Medium': 'bg-yellow-100 text-yellow-800', 
                'Low': 'bg-green-100 text-green-800'
            };
            const colorClass = priorityColors[priority] || 'bg-gray-100 text-gray-800';
            labelsDisplay.innerHTML += `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}">${priority}</span>`;
        }
        
        if (categoryElement) {
            const category = categoryElement.textContent;
            const categoryColors = {
                'Frontend': 'bg-indigo-100 text-indigo-800',
                'Backend': 'bg-blue-100 text-blue-800',
                'Design': 'bg-purple-100 text-purple-800',
                'Testing': 'bg-red-100 text-red-800',
                'Database': 'bg-green-100 text-green-800',
                'Setup': 'bg-gray-100 text-gray-800',
                'Bug': 'bg-red-100 text-red-800',
                'Enhancement': 'bg-purple-100 text-purple-800',
                'Feature': 'bg-blue-100 text-blue-800'
            };
            const colorClass = categoryColors[category] || 'bg-gray-100 text-gray-800';
            labelsDisplay.innerHTML += `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}">${category}</span>`;
        }
    } else {
        labelsDisplay.innerHTML = '<div class="text-gray-500 text-sm">No labels assigned</div>';
    }

    // Update status section
    const stateBadge = document.getElementById('issue-state-badge');
    const columnBadge = document.getElementById('issue-column-badge');
    
    if (column === 'done') {
        stateBadge.className = 'px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800';
        stateBadge.textContent = 'Closed';
    } else {
        stateBadge.className = 'px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800';
        stateBadge.textContent = 'Open';
    }
    
    columnBadge.textContent = columnNames[column] || column;
    
    // Update action buttons
    const closeBtn = document.getElementById('close-issue-btn');
    const reopenBtn = document.getElementById('reopen-issue-btn');
    const viewBtn = document.getElementById('view-on-github-btn');
    
    if (column === 'done') {
        closeBtn.classList.add('hidden');
        reopenBtn.classList.remove('hidden');
    } else {
        closeBtn.classList.remove('hidden');
        reopenBtn.classList.add('hidden');
    }
    
    viewBtn.href = githubUrl;

    // Clear comments (will be populated with real data later)
    const commentsList = document.getElementById('comments-list');
    commentsList.innerHTML = `
        <div class="text-gray-500 text-center py-8">
            <i class="fas fa-comments text-2xl mb-2"></i>
            <p>Comments loading... (Feature coming soon)</p>
        </div>
    `;
    

}

function resetEditStates() {
    // Reset title editing
    const titleDisplay = document.getElementById('issue-modal-title');
    const titleEdit = document.getElementById('issue-title-edit');
    const titleActions = document.getElementById('title-edit-actions');
    const editTitleBtn = document.getElementById('edit-title-btn');
    
    if (titleDisplay) titleDisplay.classList.remove('hidden');
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
    
    // Reset labels editing
    const labelsDisplay = document.getElementById('issue-labels-display');
    const labelsEdit = document.getElementById('issue-labels-edit');
    
    if (labelsDisplay) labelsDisplay.classList.remove('hidden');
    if (labelsEdit) labelsEdit.classList.add('hidden');
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
        saveTitleBtn.addEventListener('click', function() {
            const newTitle = document.getElementById('issue-title-edit').value;
            document.getElementById('issue-modal-title').textContent = newTitle;
            
            document.getElementById('issue-modal-title').classList.remove('hidden');
            document.getElementById('issue-modal-number').classList.remove('hidden');
            document.getElementById('issue-title-edit').classList.add('hidden');
            document.getElementById('title-edit-actions').classList.add('hidden');
            editTitleBtn.classList.remove('hidden');
            
            // TODO: Save to GitHub API
            console.log('Save title to GitHub API:', newTitle);
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
    
    // Labels editing handlers
    const editLabelsBtn = document.getElementById('edit-labels-btn');
    const saveLabelsBtn = document.getElementById('save-labels-btn');
    const cancelLabelsBtn = document.getElementById('cancel-labels-btn');
    
    if (editLabelsBtn) {
        editLabelsBtn.addEventListener('click', function() {
            document.getElementById('issue-labels-display').classList.add('hidden');
            document.getElementById('issue-labels-edit').classList.remove('hidden');
            
            // TODO: Populate available labels
            console.log('Show labels editing interface');
        });
    }
    
    if (saveLabelsBtn) {
        saveLabelsBtn.addEventListener('click', function() {
            document.getElementById('issue-labels-display').classList.remove('hidden');
            document.getElementById('issue-labels-edit').classList.add('hidden');
            
            // TODO: Save labels to GitHub API
            console.log('Save labels to GitHub API');
        });
    }
    
    if (cancelLabelsBtn) {
        cancelLabelsBtn.addEventListener('click', function() {
            document.getElementById('issue-labels-display').classList.remove('hidden');
            document.getElementById('issue-labels-edit').classList.add('hidden');
        });
    }
    
    // Action button handlers
    const closeIssueBtn = document.getElementById('close-issue-btn');
    const reopenIssueBtn = document.getElementById('reopen-issue-btn');
    const addCommentBtn = document.getElementById('add-comment-btn');
    
    if (closeIssueBtn) {
        closeIssueBtn.addEventListener('click', function() {
            // TODO: Close issue via GitHub API
            console.log('Close issue via GitHub API');
            
            // Update UI temporarily
            document.getElementById('issue-state-badge').className = 'px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800';
            document.getElementById('issue-state-badge').textContent = 'Closed';
            closeIssueBtn.classList.add('hidden');
            reopenIssueBtn.classList.remove('hidden');
        });
    }
    
    if (reopenIssueBtn) {
        reopenIssueBtn.addEventListener('click', function() {
            // TODO: Reopen issue via GitHub API
            console.log('Reopen issue via GitHub API');
            
            // Update UI temporarily
            document.getElementById('issue-state-badge').className = 'px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800';
            document.getElementById('issue-state-badge').textContent = 'Open';
            reopenIssueBtn.classList.add('hidden');
            closeIssueBtn.classList.remove('hidden');
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