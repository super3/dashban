// GitHub Integration for Dashban Kanban Board - Main Coordinator
// This file coordinates the three GitHub modules: Auth, API, and UI

// Initialize GitHub integration when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    
    // Initialize repository management FIRST
    if (window.RepoManager) {
        window.RepoManager.initializeRepositorySelector();
    }

    // Render the initial (signed-out) auth UI.
    window.GitHubAuth.initializeGitHubAuth();

    // Initialize Clerk "Sign in with GitHub". It is a no-op on the static build
    // where /api/config is absent (that build is read-only, public issues only).
    if (window.ClerkAuth) {
        window.ClerkAuth.initialize();
    }

    // Load GitHub issues
    window.GitHubAPI.initializeGitHubIssues();
    
    // Update header with repo name
    window.GitHubAuth.updateHeaderRepoName();
    
});

// Export functions to global scope for access from kanban.js and backward compatibility
// This maintains the original window.GitHub interface
window.GitHub = {
    // Configuration (from GitHubAuth)
    GITHUB_CONFIG: window.GitHubAuth.GITHUB_CONFIG,
    githubAuth: window.GitHubAuth.githubAuth,
    
    // Authentication functions (from GitHubAuth)
    isGitHubAuthed: window.GitHubAuth.isGitHubAuthed,
    initializeGitHubAuth: window.GitHubAuth.initializeGitHubAuth,
    signInWithGitHub: window.GitHubAuth.signInWithGitHub,
    signOutGitHub: window.GitHubAuth.signOutGitHub,
    updateGitHubSignInUI: window.GitHubAuth.updateGitHubSignInUI,
    updateHeaderRepoName: window.GitHubAuth.updateHeaderRepoName,

    // API functions (from GitHubAPI)
    createGitHubIssue: window.GitHubAPI.createGitHubIssue,
    loadGitHubIssues: window.GitHubAPI.loadGitHubIssues,
    archiveGitHubIssue: window.GitHubAPI.archiveGitHubIssue,
    updateGitHubIssueLabels: window.GitHubAPI.updateGitHubIssueLabels,
    closeGitHubIssue: window.GitHubAPI.closeGitHubIssue,
    initializeGitHubIssues: window.GitHubAPI.initializeGitHubIssues,
    
    // UI functions (from GitHubUI)
    renderMarkdown: window.GitHubUI.renderMarkdown,
    createGitHubIssueElement: window.GitHubUI.createGitHubIssueElement,
    extractPriorityFromLabels: window.GitHubUI.extractPriorityFromLabels,
    extractCategoryFromLabels: window.GitHubUI.extractCategoryFromLabels,
    createSkeletonCard: window.GitHubUI.createSkeletonCard,
    updateCardIndicators: window.GitHubUI.updateCardIndicators,
    applyReviewIndicatorsToColumn: window.GitHubUI.applyReviewIndicatorsToColumn,
    applyCompletedSectionsToColumn: window.GitHubUI.applyCompletedSectionsToColumn,
    addReviewIndicator: window.GitHubUI.addReviewIndicator,
    removeReviewIndicator: window.GitHubUI.removeReviewIndicator,
    addCompletedSection: window.GitHubUI.addCompletedSection,
    removeCompletedSection: window.GitHubUI.removeCompletedSection,
    
    // Repository management functions (from RepoManager)
    validateRepository: window.RepoManager?.validateRepository,
    addRepository: window.RepoManager?.addRepository,
    removeRepository: window.RepoManager?.removeRepository,
    switchRepository: window.RepoManager?.switchRepository,
    updateRepositoryDropdown: window.RepoManager?.updateRepositoryDropdown
}; 