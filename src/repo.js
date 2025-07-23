// Repository Management for Dashban Kanban Board
// Handles multiple repository selection, validation, and switching

// Repository management state
const repoState = {
    savedRepos: [],
    currentRepo: null,
    defaultRepo: {
        owner: 'super3',
        repo: 'dashban'
    }
};

// Repository validation and access checking
async function validateRepository(owner, repo) {
    try {
        // Check if repository exists and determine access level
        const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        
        if (repoResponse.status === 404) {
            return { 
                valid: false, 
                error: 'Repository not found or private' 
            };
        }
        
        if (!repoResponse.ok) {
            return { 
                valid: false, 
                error: `GitHub API error: ${repoResponse.status}` 
            };
        }
        
        const repoData = await repoResponse.json();
        
        // Determine access level
        let accessLevel = 'read-only'; // Default for public repos
        let canModify = false;
        
        // If user is authenticated, check write access
        if (window.GitHubAuth?.githubAuth?.isAuthenticated && window.GitHubAuth?.githubAuth?.accessToken) {
            try {
                const authResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
                    headers: {
                        'Authorization': `token ${window.GitHubAuth.githubAuth.accessToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                if (authResponse.ok) {
                    const authRepoData = await authResponse.json();
                    if (authRepoData.permissions && (authRepoData.permissions.push || authRepoData.permissions.admin)) {
                        accessLevel = 'full';
                        canModify = true;
                    }
                }
            } catch (error) {
                console.log('Could not determine write access, defaulting to read-only');
            }
        }
        
        return {
            valid: true,
            repository: repoData,
            accessLevel,
            canModify,
            isPrivate: Boolean(repoData.private),
            issueCount: repoData.open_issues_count || 0
        };
        
    } catch (error) {
        return { 
            valid: false, 
            error: 'Network error or repository not accessible' 
        };
    }
}

// Repository management functions
function loadSavedRepositories() {
    try {
        const saved = localStorage.getItem('dashban_repositories');
        if (saved) {
            repoState.savedRepos = JSON.parse(saved);
        }
        
        // Load current repository
        const current = localStorage.getItem('dashban_current_repo');
        if (current) {
            repoState.currentRepo = JSON.parse(current);
        } else {
            // Set default repository
            repoState.currentRepo = repoState.defaultRepo;
        }
        
    } catch (error) {
        console.error('Error loading saved repositories:', error);
        repoState.savedRepos = [];
        repoState.currentRepo = repoState.defaultRepo;
    }
}

function saveRepositories() {
    try {
        localStorage.setItem('dashban_repositories', JSON.stringify(repoState.savedRepos));
        localStorage.setItem('dashban_current_repo', JSON.stringify(repoState.currentRepo));
    } catch (error) {
        console.error('Error saving repositories:', error);
    }
}

async function addRepository(owner, repo) {
    // Validate repository first
    const validation = await validateRepository(owner, repo);
    
    if (!validation.valid) {
        throw new Error(validation.error);
    }
    
    // Check if already exists
    const exists = repoState.savedRepos.some(r => r.owner === owner && r.repo === repo);
    if (exists) {
        throw new Error('Repository already added');
    }
    
    // Add to saved repositories
    const newRepo = {
        owner,
        repo,
        accessLevel: validation.accessLevel,
        canModify: validation.canModify,
        isPrivate: validation.isPrivate,
        issueCount: validation.issueCount,
        addedAt: new Date().toISOString()
    };
    
    repoState.savedRepos.push(newRepo);
    saveRepositories();
    
    // Update UI
    updateRepositoryDropdown();
    
    return newRepo;
}

async function removeRepository(owner, repo) {
    // Prevent removing the default repository
    if (owner === repoState.defaultRepo.owner && repo === repoState.defaultRepo.repo) {
        alert('Cannot remove the default repository');
        return false;
    }
    
    // Check if this is the currently selected repository
    const isCurrentRepo = repoState.currentRepo.owner === owner && repoState.currentRepo.repo === repo;
    
    if (isCurrentRepo) {
        // Switch to default repository before removing
        await switchRepository(repoState.defaultRepo.owner, repoState.defaultRepo.repo);
    }
    
    // Remove from saved repositories
    repoState.savedRepos = repoState.savedRepos.filter(r => 
        !(r.owner === owner && r.repo === repo)
    );
    saveRepositories();
    updateRepositoryDropdown();
    
    return true;
}

async function switchRepository(owner, repo) {
    // Update current repository
    repoState.currentRepo = { owner, repo };
    saveRepositories();
    
    // Update GitHub config for API calls
    if (window.GitHubAuth?.GITHUB_CONFIG) {
        window.GitHubAuth.GITHUB_CONFIG.owner = owner;
        window.GitHubAuth.GITHUB_CONFIG.repo = repo;
    }
    
    // Update UI
    updateHeaderRepoName();
    updateRepositoryDropdown();
    
    // Refresh status cards for new repository
    if (window.StatusCards?.refreshStatusCardsForRepository) {
        window.StatusCards.refreshStatusCardsForRepository();
    }
    
    // Reload issues from new repository
    if (window.GitHubAPI?.loadGitHubIssues) {
        await window.GitHubAPI.loadGitHubIssues();
    }
    
    // Update access level UI
    const repoInfo = repoState.savedRepos.find(r => r.owner === owner && r.repo === repo);
    if (repoInfo) {
        updateUIForAccessLevel(repoInfo.accessLevel, repoInfo.canModify);
    }
    
    // Reload column collapse states for the new repository
    if (window.kanbanTestExports?.loadCollapseStates) {
        window.kanbanTestExports.loadCollapseStates();
    }
    
    // Apply saved card order for the new repository
    if (window.kanbanTestExports?.applyCardOrder) {
        window.kanbanTestExports.applyCardOrder();
    }
    
    // Hide About card if it was archived for this repository (after applying card order)
    if (window.kanbanTestExports?.hideAboutCardIfArchived) {
        window.kanbanTestExports.hideAboutCardIfArchived();
    }
    
    // Check if About card is in done column after repository switch
    setTimeout(() => {
        if (window.kanbanTestExports?.checkAboutCardInDoneColumn) {
            window.kanbanTestExports.checkAboutCardInDoneColumn();
        }
    }, 150);
}

// UI Functions
function initializeRepositorySelector() {
    loadSavedRepositories();
    
    // Sync GitHub config with the loaded current repository
    if (repoState.currentRepo && window.GitHubAuth?.GITHUB_CONFIG) {
        window.GitHubAuth.GITHUB_CONFIG.owner = repoState.currentRepo.owner;
        window.GitHubAuth.GITHUB_CONFIG.repo = repoState.currentRepo.repo;
    }
    
    createRepositoryDropdown();
    updateHeaderRepoName();
    
    // Ensure default repo is in saved repos
    if (!repoState.savedRepos.some(r => 
        r.owner === repoState.defaultRepo.owner && r.repo === repoState.defaultRepo.repo
    )) {
        // Add default repo with full access
        repoState.savedRepos.unshift({
            ...repoState.defaultRepo,
            accessLevel: 'full',
            canModify: true,
            isPrivate: false,
            issueCount: 0,
            addedAt: new Date().toISOString()
        });
        saveRepositories();
    }
}

function createRepositoryDropdown() {
    const repoSelector = document.querySelector('#repo-selector .project-selector');
    
    if (!repoSelector) {
        console.warn('Repository selector element not found');
        return;
    }
    
    // Add click handler to toggle dropdown
    repoSelector.addEventListener('click', toggleRepositoryDropdown);
}

function toggleRepositoryDropdown() {
    const container = document.getElementById('repo-selector');
    if (!container) return;
    
    // Remove existing dropdown
    const existingDropdown = container.querySelector('.repo-dropdown');
    if (existingDropdown) {
        existingDropdown.remove();
        return;
    }
    
    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'repo-dropdown absolute top-full left-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50';
    
    // Header
    const header = document.createElement('div');
    header.className = 'px-3 py-2 border-b border-gray-100';
    header.innerHTML = '<h4 class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Repositories</h4>';
    dropdown.appendChild(header);
    
    // Repository list
    const repoList = document.createElement('div');
    repoList.className = 'max-h-64 overflow-y-auto';
    repoList.id = 'repo-list';
    
    // Add repositories
    repoState.savedRepos.forEach(repoInfo => {
        const repoItem = createRepositoryItem(repoInfo);
        repoList.appendChild(repoItem);
    });
    
    dropdown.appendChild(repoList);
    
    // Add repository section
    const addSection = document.createElement('div');
    addSection.className = 'border-t border-gray-100';
    addSection.innerHTML = `
        <button id="add-repo-btn" class="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-50 text-indigo-600 hover:text-indigo-700 text-sm font-medium rounded-b-lg">
            <div class="w-8 h-8 bg-indigo-50 rounded-full flex items-center justify-center">
                <i class="fas fa-plus text-indigo-600 text-xs"></i>
            </div>
            <span>Add Repository</span>
        </button>
    `;
    dropdown.appendChild(addSection);
    
    // Add click handler for add repository button
    addSection.querySelector('#add-repo-btn').addEventListener('click', showAddRepositoryModal);
    
    // Close dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function closeDropdown(e) {
            if (!container.contains(e.target)) {
                dropdown.remove();
                document.removeEventListener('click', closeDropdown);
            }
        });
    }, 0);
    
    container.appendChild(dropdown);
}

function createRepositoryItem(repoInfo) {
    const item = document.createElement('div');
    item.className = 'repo-item flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer';
    
    const accessIcon = repoInfo.accessLevel === 'full' ? 'fas fa-edit text-green-500' : 'fas fa-eye text-blue-500';
    const accessText = repoInfo.accessLevel === 'full' ? 'Full access' : 'Read-only';
    const visibilityIcon = repoInfo.isPrivate ? 'fas fa-lock text-gray-500' : 'fas fa-globe text-green-500';
    const visibilityText = repoInfo.isPrivate ? 'Private' : 'Public';
    
    item.innerHTML = `
        <div class="flex items-center space-x-3">
            <div class="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <i class="fab fa-github text-gray-600 text-sm"></i>
            </div>
            <div>
                <div class="font-medium text-gray-900">${repoInfo.owner}/${repoInfo.repo}</div>
                <div class="flex items-center space-x-2 text-xs text-gray-500">
                    <span class="flex items-center space-x-1">
                        <i class="${visibilityIcon}"></i>
                        <span>${visibilityText}</span>
                    </span>
                    <span>•</span>
                    <span class="flex items-center space-x-1">
                        <i class="${accessIcon}"></i>
                        <span>${accessText}</span>
                    </span>
                </div>
            </div>
        </div>
        <div class="flex items-center space-x-2">
            ${repoInfo.owner !== repoState.defaultRepo.owner || repoInfo.repo !== repoState.defaultRepo.repo ? 
                '<button class="remove-repo-btn text-gray-400 hover:text-red-500 text-xs"><i class="fas fa-times"></i></button>' : 
                ''}
        </div>
    `;
    
    // Add click handler to switch repository
    item.addEventListener('click', async (e) => {
        if (e.target.closest('.remove-repo-btn')) {
            e.stopPropagation();
            await removeRepository(repoInfo.owner, repoInfo.repo);
            return;
        }
        
        await switchRepository(repoInfo.owner, repoInfo.repo);
        
        // Close dropdown
        const dropdown = document.querySelector('.repo-dropdown');
        if (dropdown) {
            dropdown.remove();
        }
    });
    
    return item;
}

function showAddRepositoryModal() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('add-repo-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'add-repo-modal';
        modal.className = 'fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                <div class="px-6 py-4 border-b border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900">Add GitHub Repository</h3>
                </div>
                
                <div class="px-6 py-4">
                    <div class="mb-4">
                        <label class="block text-sm font-medium text-gray-700 mb-2">GitHub Repository URL</label>
                        <input 
                            type="text" 
                            id="repo-input"
                            placeholder="e.g., https://github.com/microsoft/vscode"
                            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                        <p class="text-xs text-gray-500 mt-1">Paste any GitHub repository URL</p>
                    </div>
                    
                    <div id="repo-error" class="hidden mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p class="text-sm text-red-600"></p>
                    </div>
                </div>
                
                <div class="px-6 py-4 bg-gray-50 flex justify-end space-x-3">
                    <button id="cancel-add-repo" class="px-4 py-2 text-gray-700 hover:text-gray-900">Cancel</button>
                    <button id="confirm-add-repo" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">Add Repository</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Add event listeners
        modal.querySelector('#cancel-add-repo').addEventListener('click', hideAddRepositoryModal);
        modal.querySelector('#confirm-add-repo').addEventListener('click', handleAddRepository);
        modal.querySelector('#repo-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleAddRepository();
            }
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideAddRepositoryModal();
            }
        });
    }
    
    // Show modal and focus input
    modal.classList.remove('hidden');
    modal.querySelector('#repo-input').focus();
    
    // Clear previous input and errors
    modal.querySelector('#repo-input').value = '';
    modal.querySelector('#repo-error').classList.add('hidden');
}

function hideAddRepositoryModal() {
    const modal = document.getElementById('add-repo-modal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

async function handleAddRepository() {
    const input = document.getElementById('repo-input');
    const errorDiv = document.getElementById('repo-error');
    const button = document.getElementById('confirm-add-repo');
    
    const repoString = input.value.trim();
    if (!repoString) {
        showError(errorDiv, 'Please enter a GitHub repository URL');
        return;
    }
    
    // Parse GitHub URL
    const parsed = parseGitHubUrl(repoString);
    if (!parsed) {
        showError(errorDiv, 'Please enter a valid GitHub URL (e.g., https://github.com/microsoft/vscode)');
        return;
    }
    
    const { owner, repo } = parsed;
    
    // Show loading state
    button.disabled = true;
    button.textContent = 'Adding...';
    errorDiv.classList.add('hidden');
    
    try {
        await addRepository(owner, repo);
        hideAddRepositoryModal();
        
        // Auto-switch to the newly added repository
        await switchRepository(owner, repo);
        
        // Update the dropdown content in place without closing/reopening
        const dropdown = document.querySelector('.repo-dropdown');
        if (dropdown) {
            const repoList = dropdown.querySelector('#repo-list');
            if (repoList) {
                // Clear and rebuild the repository list
                repoList.innerHTML = '';
                repoState.savedRepos.forEach(repoInfo => {
                    const repoItem = createRepositoryItem(repoInfo);
                    repoList.appendChild(repoItem);
                });
            }
        }
    } catch (error) {
        showError(errorDiv, error.message);
    } finally {
        button.disabled = false;
        button.textContent = 'Add Repository';
    }
}

function parseGitHubUrl(input) {
    // Remove whitespace
    input = input.trim();
    
    // Parse GitHub URL patterns first
    const githubPatterns = [
        // https://github.com/owner/repo
        /^https?:\/\/github\.com\/([^\/]+)\/([^\/\?]+?)(?:\.git)?(?:[\/?].*)?$/,
        // git@github.com:owner/repo.git
        /^git@github\.com:([^\/]+)\/([^\/\?]+?)(?:\.git)?$/,
        // github.com/owner/repo
        /^(?:www\.)?github\.com\/([^\/]+)\/([^\/\?]+?)(?:\.git)?(?:[\/?].*)?$/
    ];
    
    for (const pattern of githubPatterns) {
        const match = input.match(pattern);
        if (match) {
            const [, owner, repo] = match;
            return { owner, repo };
        }
    }
    
    // If it's already in owner/repo format, return as is
    if (!input.includes('://') && !input.includes('@') && input.split('/').length === 2) {
        const [owner, repo] = input.split('/');
        if (owner && repo) {
            return { owner, repo };
        }
    }
    
    return null;
}

function showError(errorDiv, message) {
    errorDiv.querySelector('p').textContent = message;
    errorDiv.classList.remove('hidden');
}

function updateRepositoryDropdown() {
    // If dropdown is open, update it in place
    const dropdown = document.querySelector('.repo-dropdown');
    if (dropdown) {
        const repoList = dropdown.querySelector('#repo-list');
        if (repoList) {
            // Clear and rebuild the repository list
            repoList.innerHTML = '';
            repoState.savedRepos.forEach(repoInfo => {
                const repoItem = createRepositoryItem(repoInfo);
                repoList.appendChild(repoItem);
            });
        }
    }
}

function updateHeaderRepoName() {
    const repoNameElement = document.getElementById('repo-name');
    if (repoNameElement && repoState.currentRepo) {
        repoNameElement.textContent = repoState.currentRepo.repo;
    }
}

function updateUIForAccessLevel(accessLevel, canModify) {
    const addIssueButton = document.getElementById('add-task-btn');
    
    if (!addIssueButton) return;
    
    if (!canModify) {
        addIssueButton.disabled = true;
        addIssueButton.className = 'bg-gray-400 cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2';
        addIssueButton.title = 'Read-only access - cannot create issues';
    } else {
        addIssueButton.disabled = false;
        addIssueButton.className = 'bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2';
        addIssueButton.title = 'Create a new GitHub issue';
    }
}

// Export repository management functions
const RepoManager = {
    // State
    repoState,
    
    // Core functions
    validateRepository,
    addRepository,
    removeRepository,
    switchRepository,
    loadSavedRepositories,
    saveRepositories,
    parseGitHubUrl,
    
    // UI functions
    initializeRepositorySelector,
    updateRepositoryDropdown,
    updateHeaderRepoName,
    updateUIForAccessLevel,
    toggleRepositoryDropdown,
    showAddRepositoryModal,
    hideAddRepositoryModal,
    handleAddRepository,
    showError,
    createRepositoryItem,
    createRepositoryDropdown
};

// Export for browser
if (typeof window !== 'undefined') {
    window.RepoManager = RepoManager;
}

// Export for Node.js (for testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RepoManager;
} 