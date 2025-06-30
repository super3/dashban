// About Card Management Module
// Handles all functionality related to the About card, including creation, archiving, and restoration

(function() {
    'use strict';

    // Module state
    const state = {
        initialized: false
    };

    // Get current repository context
    function getCurrentRepoContext() {
        let context = null;
        let source = 'unknown';
        
        // Try to get from RepoManager first (most reliable)
        if (window.RepoManager?.repoState?.currentRepo) {
            context = window.RepoManager.repoState.currentRepo;
            source = 'RepoManager';
        }
        // Try to get from localStorage directly
        else {
            try {
                const current = localStorage.getItem('dashban_current_repo');
                if (current) {
                    context = JSON.parse(current);
                    source = 'localStorage';
                }
            } catch (error) {
                console.warn('Failed to load current repo from localStorage:', error);
            }
        }
        
        // Fallback to GitHub config
        if (!context && window.GitHubAuth?.GITHUB_CONFIG) {
            context = window.GitHubAuth.GITHUB_CONFIG;
            source = 'GitHubAuth';
        }
        
        // Final fallback
        if (!context) {
            context = { owner: 'super3', repo: 'dashban' };
            source = 'default';
        }
        
        console.log(`📦 Repository context from ${source}:`, context);
        return context;
    }

    // Function to add archive button to About card when in done column
    function addArchiveButtonToAboutCard(cardElement) {
        // Check if archive button already exists
        if (cardElement.querySelector('.archive-btn')) {
            return;
        }
        
        // Create the completed section HTML (same style as GitHub issues)
        const completedSection = document.createElement('div');
        completedSection.className = 'completed-section border-t border-gray-200 mt-3 pt-1 -mb-2';
        completedSection.innerHTML = `
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-check-circle text-green-500 text-xs"></i>
                    <span class="text-xs text-green-600">Completed</span>
                </div>
                <button class="archive-btn text-gray-400 hover:text-gray-600 p-1 transition-colors" 
                        title="Archive card" 
                        data-card-type="about">
                    <i class="fas fa-archive text-xs"></i>
                </button>
            </div>
        `;
        
        // Add to the end of the card
        cardElement.appendChild(completedSection);
    }

    // Function to remove archive button from About card when moved away from done column
    function removeArchiveButtonFromAboutCard(cardElement) {
        const completedSection = cardElement.querySelector('.completed-section');
        if (completedSection) {
            // Check if this is the About card's completed section
            const archiveButton = completedSection.querySelector('.archive-btn[data-card-type="about"]');
            if (archiveButton) {
                completedSection.remove();
            }
        }
    }
    
    // Function to check if About card is in done column and add archive button
    function checkAboutCardInDoneColumn() {
        const doneColumn = document.getElementById('done');
        if (doneColumn) {
            const cards = doneColumn.querySelectorAll('.bg-white.border');
            cards.forEach(card => {
                const titleElement = card.querySelector('h4');
                if (titleElement && titleElement.textContent.includes('About')) {
                    // Check if it has the data-card-id attribute (it should)
                    if (card.getAttribute('data-card-id') === 'about-card' || !card.getAttribute('data-issue-number')) {
                        addArchiveButtonToAboutCard(card);
                    }
                }
            });
        }
    }

    // Save About card archived status to localStorage
    function saveAboutCardArchivedStatus(isArchived) {
        try {
            // Get repository context for storage key
            const config = getCurrentRepoContext();
            const storageKey = `aboutCardArchived_${config.owner}_${config.repo}`;
            localStorage.setItem(storageKey, JSON.stringify(isArchived));
            console.log(`📦 Saved About card archived status for ${config.owner}/${config.repo}: ${isArchived}`);
        } catch (error) {
            console.warn('Failed to save About card archived status to localStorage:', error);
        }
    }

    // Load About card archived status from localStorage
    function loadAboutCardArchivedStatus() {
        try {
            // Get repository context for storage key
            const config = getCurrentRepoContext();
            const storageKey = `aboutCardArchived_${config.owner}_${config.repo}`;
            const saved = localStorage.getItem(storageKey);
            const result = saved ? JSON.parse(saved) : false;
            console.log(`📦 Loaded About card archived status for ${config.owner}/${config.repo}: ${result}`);
            return result;
        } catch (error) {
            console.warn('Failed to load About card archived status from localStorage:', error);
            return false;
        }
    }

    // Hide About card if it was archived
    function hideAboutCardIfArchived() {
        const isArchived = loadAboutCardArchivedStatus();
        console.log('📦 Checking if About card should be hidden. Archived status:', isArchived);
        
        if (isArchived) {
            const aboutCard = document.querySelector('[data-card-id="about-card"]');
            if (aboutCard) {
                aboutCard.remove();
                if (typeof window.updateColumnCounts === 'function') {
                    window.updateColumnCounts();
                }
                console.log('📦 About card hidden (was previously archived)');
            } else {
                console.log('📦 About card was marked as archived but not found in DOM');
            }
        } else {
            console.log('📦 About card should be visible');
            // If not archived and About card doesn't exist, ensure it exists
            ensureAboutCardExists();
        }
    }

    // Ensure About card exists if it should be visible
    function ensureAboutCardExists() {
        const aboutCard = document.querySelector('[data-card-id="about-card"]');
        if (!aboutCard) {
            console.log('📦 About card missing but should be visible - creating it');
            // Create About card and add it to todo column (it will be moved by applyCardOrder if needed)
            const todoColumn = document.getElementById('todo');
            if (todoColumn) {
                const newAboutCard = createAboutCardElement();
                todoColumn.appendChild(newAboutCard);
                if (typeof window.updateColumnCounts === 'function') {
                    window.updateColumnCounts();
                }
                console.log('📦 About card recreated in Todo column');
            }
        }
    }

    // Create About card element
    function createAboutCardElement() {
        const aboutCard = document.createElement('div');
        aboutCard.className = 'bg-white border border-gray-200 rounded-lg p-4 cursor-move hover:shadow-md transition-shadow duration-200';
        aboutCard.setAttribute('data-card-id', 'about-card');
        aboutCard.innerHTML = `
            <div class="flex items-start justify-between mb-3">
                <div>
                    <h4 class="font-medium text-gray-900 mb-1">About</h4>
                </div>
                <span class="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">INFO</span>
            </div>
            
            <!-- Horizontal Separator -->
            <div class="border-b border-gray-200 mb-3"></div>
            
            <!-- Project Description -->
            <div class="mb-3">
                <p class="text-sm text-gray-700">
                    <strong>Dashban</strong> combines kanban project management with a realtime status dashboards in one clean interface.
                </p>
            </div>
            
            <!-- Features List -->
            <div class="mb-3">
                <ul class="text-sm text-gray-600 space-y-1">
                    <li class="flex items-center space-x-2">
                        <i class="fas fa-check text-green-500 text-xs"></i>
                        <span>Drag & drop task management</span>
                    </li>
                    <li class="flex items-center space-x-2">
                        <i class="fas fa-check text-green-500 text-xs"></i>
                        <span>Code and deployment monitoring</span>
                    </li>
                    <li class="flex items-center space-x-2">
                        <i class="fas fa-check text-green-500 text-xs"></i>
                        <span>Open-source (MIT License)</span>
                    </li>
                </ul>
            </div>
            
            <!-- Buttons Row -->
            <div class="flex space-x-2">
                <!-- Fork Button -->
                <a href="https://github.com/super3/dashban" target="_blank" class="flex items-center justify-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex-1">
                    <i class="fab fa-github"></i>
                    <span>Fork</span>
                </a>
                
                <!-- Give Feedback Button -->
                <a href="https://github.com/super3/dashban/issues/new?template=feedback.md&title=[Feedback]%20" target="_blank" class="flex items-center justify-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 flex-1">
                    <i class="fas fa-comment"></i>
                    <span>Feedback</span>
                </a>
            </div>
        `;
        return aboutCard;
    }

    // Restore About card (unarchive)
    function restoreAboutCard() {
        // Clear the archived status
        saveAboutCardArchivedStatus(false);
        
        // Check if About card already exists
        const existingAboutCard = document.querySelector('[data-card-id="about-card"]');
        if (existingAboutCard) {
            console.log('📦 About card is already visible');
            return;
        }
        
        // Create About card element using the common function
        const aboutCard = createAboutCardElement();
        
        // Add to todo column by default
        const todoColumn = document.getElementById('todo');
        if (todoColumn) {
            todoColumn.appendChild(aboutCard);
            if (typeof window.updateColumnCounts === 'function') {
                window.updateColumnCounts();
            }
            console.log('📦 About card restored to Todo column');
        }
    }

    // Initialize the module
    function initialize() {
        if (state.initialized) {
            return;
        }

        console.log('📦 About Card module initializing...');
        
        // Set up event delegation for archive button clicks (will be called from kanban.js)
        // Note: The actual event handler setup remains in kanban.js to maintain event flow
        
        state.initialized = true;
        console.log('📦 About Card module initialized');
    }

    // Export functions for use by kanban.js
    const AboutCard = {
        initialize,
        addArchiveButtonToAboutCard,
        removeArchiveButtonFromAboutCard,
        checkAboutCardInDoneColumn,
        saveAboutCardArchivedStatus,
        loadAboutCardArchivedStatus,
        hideAboutCardIfArchived,
        ensureAboutCardExists,
        createAboutCardElement,
        restoreAboutCard
    };

    // Export for browser usage
    window.AboutCard = AboutCard;

    // Export for Node.js/Jest testing
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = AboutCard;
    }
})();