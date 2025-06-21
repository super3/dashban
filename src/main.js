// Main ES6 Module Entry Point for Dashban
// This file demonstrates the ES6 module pattern and provides centralized state management

import {
    GITHUB_CONFIG,
    githubAuth,
    initializeGitHubAuth,
    signInWithGitHub,
    validateAndSetToken,
    signOutGitHub,
    updateGitHubSignInUI,
    updateGitHubOptionUI,
    updateAddIssueButtonState,
    promptForAccessToken,
    showGitHubTokenModal,
    hideGitHubTokenModal,
    initializeAuthModalListeners,
    toggleUserDropdown,
    updateHeaderRepoName
} from './github-auth.js';

import {
    createGitHubIssue,
    loadGitHubIssues,
    archiveGitHubIssue,
    updateGitHubIssueLabels,
    closeGitHubIssue,
    initializeGitHubIssues
} from './github-api.js';

import { getKanbanUtils } from './kanban.js';

// Centralized State Management System
class AppStateManager {
    constructor() {
        this.state = {
            // GitHub authentication state
            github: {
                isAuthenticated: false,
                user: null,
                config: GITHUB_CONFIG
            },
            
            // Application state
            app: {
                currentRepo: null,
                isLoading: false,
                lastError: null
            },
            
            // UI state
            ui: {
                activeModal: null,
                collapsedColumns: new Set(),
                notifications: []
            }
        };
        
        this.subscribers = [];
    }
    
    // Subscribe to state changes
    subscribe(callback) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(sub => sub !== callback);
        };
    }
    
    // Update state and notify subscribers
    updateState(path, value) {
        const pathArray = path.split('.');
        let current = this.state;
        
        for (let i = 0; i < pathArray.length - 1; i++) {
            current = current[pathArray[i]];
        }
        
        current[pathArray[pathArray.length - 1]] = value;
        this.notifySubscribers();
    }
    
    // Get state value
    getState(path) {
        if (!path) return this.state;
        
        const pathArray = path.split('.');
        let current = this.state;
        
        for (const key of pathArray) {
            current = current[key];
            if (current === undefined) return undefined;
        }
        
        return current;
    }
    
    // Notify all subscribers of state changes
    notifySubscribers() {
        this.subscribers.forEach(callback => {
            try {
                callback(this.state);
            } catch (error) {
                console.error('Error in state subscriber:', error);
            }
        });
    }
}

// Create global state manager instance
const appState = new AppStateManager();

// GitHub Integration Module
class GitHubIntegration {
    constructor(stateManager) {
        this.state = stateManager;
        this.auth = {
            GITHUB_CONFIG,
            githubAuth,
            initialize: initializeGitHubAuth,
            signIn: signInWithGitHub,
            validateToken: validateAndSetToken,
            signOut: signOutGitHub,
            updateUI: updateGitHubSignInUI,
            updateOptionUI: updateGitHubOptionUI,
            updateAddIssueButton: updateAddIssueButtonState,
            promptForToken: promptForAccessToken,
            showTokenModal: showGitHubTokenModal,
            hideTokenModal: hideGitHubTokenModal,
            initModalListeners: initializeAuthModalListeners,
            toggleUserDropdown: toggleUserDropdown,
            updateHeaderRepo: updateHeaderRepoName
        };
        
        this.api = {
            createIssue: createGitHubIssue,
            loadIssues: loadGitHubIssues,
            archiveIssue: archiveGitHubIssue,
            updateIssueLabels: updateGitHubIssueLabels,
            closeIssue: closeGitHubIssue,
            initializeIssues: initializeGitHubIssues
        };
    }
    
    // Initialize GitHub integration
    async initialize() {
        try {
            this.state.updateState('app.isLoading', true);
            await this.auth.initialize();
            this.auth.initModalListeners();
            
            // Sync state with auth module
            this.state.updateState('github.isAuthenticated', this.auth.githubAuth.isAuthenticated);
            this.state.updateState('github.user', this.auth.githubAuth.user);
            
            this.state.updateState('app.isLoading', false);
        } catch (error) {
            console.error('Failed to initialize GitHub integration:', error);
            this.state.updateState('app.lastError', error.message);
            this.state.updateState('app.isLoading', false);
        }
    }
}

// Application Initializer
class DashbanApp {
    constructor() {
        this.state = appState;
        this.github = new GitHubIntegration(this.state);
        
        // Subscribe to state changes for debugging
        this.state.subscribe((state) => {
            if (typeof jest === 'undefined') {  // Only log in non-test environments
                console.debug('App state updated:', state);
            }
        });
    }
    
    // Initialize the entire application
    async initialize() {
        try {
            console.log('🚀 Initializing Dashban with ES6 modules...');
            
            // Initialize GitHub integration
            await this.github.initialize();
            
            console.log('✅ Dashban initialization complete');
        } catch (error) {
            console.error('❌ Failed to initialize Dashban:', error);
            this.state.updateState('app.lastError', error.message);
        }
    }
    
    // Get current application state
    getState() {
        return this.state.getState();
    }
    
    // Access GitHub functionality
    getGitHub() {
        return this.github;
    }
}

// Create and export the main app instance
const dashbanApp = new DashbanApp();

// Export for ES6 module usage
export {
    dashbanApp as default,
    AppStateManager,
    GitHubIntegration,
    appState
};

// Also make available globally for backward compatibility
window.DashbanApp = dashbanApp;
window.AppState = appState;

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        dashbanApp.initialize();
    });
} else {
    // DOM is already ready
    dashbanApp.initialize();
}