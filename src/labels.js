// GitHub Labels Management
// Handles checking for and installing required GitHub labels

// Required labels data (embedded to avoid CORS issues with file:// protocol)
const REQUIRED_LABELS = [
  {
    "name": "todo",
    "description": "Issues planned to be worked on",
    "color": "6366F1"
  },
  {
    "name": "in progress",
    "description": "Issues currently being worked on",
    "color": "3B82F6"
  },
  {
    "name": "review",
    "description": "Issues ready for review",
    "color": "8B5CF6"
  },
  {
    "name": "done",
    "description": "Completed issues",
    "color": "10B981"
  },
  {
    "name": "archive",
    "description": "Archived issues (hidden from board)",
    "color": "6B7280"
  },
  {
    "name": "high",
    "description": "High priority issues",
    "color": "EF4444"
  },
  {
    "name": "medium",
    "description": "Medium priority issues",
    "color": "F59E0B"
  },
  {
    "name": "low",
    "description": "Low priority issues",
    "color": "22C55E"
  },
  {
    "name": "frontend",
    "description": "Frontend development work",
    "color": "6366F1"
  },
  {
    "name": "backend",
    "description": "Backend development work", 
    "color": "3B82F6"
  },
  {
    "name": "design",
    "description": "Design and UI/UX work",
    "color": "8B5CF6"
  },
  {
    "name": "testing",
    "description": "Testing and QA work",
    "color": "EF4444"
  },
  {
    "name": "database",
    "description": "Database related work",
    "color": "10B981"
  },
  {
    "name": "setup",
    "description": "Setup, configuration, and infrastructure",
    "color": "6B7280"
  },
  {
    "name": "bug",
    "description": "Something isn't working correctly",
    "color": "EF4444"
  }
];

// Load required labels (now returns embedded data)
async function loadRequiredLabels() {
    return REQUIRED_LABELS;
}

// Check which labels exist in the repository
async function checkExistingLabels() {
    if (!window.GitHubAuth?.githubAuth?.isAuthenticated || !window.GitHubAuth?.githubAuth?.accessToken) {
        console.log('❌ Not authenticated with GitHub - cannot check labels');
        return [];
    }

    try {
        const response = await fetch(`${window.GitHubAuth.GITHUB_CONFIG.apiBaseUrl}/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/labels`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${window.GitHubAuth.githubAuth.accessToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status}`);
        }

        const existingLabels = await response.json();
        return existingLabels.map(label => label.name.toLowerCase());
    } catch (error) {
        console.error('❌ Failed to check existing labels:', error);
        return [];
    }
}

// Find missing labels
async function findMissingLabels() {
    const [requiredLabels, existingLabels] = await Promise.all([
        loadRequiredLabels(),
        checkExistingLabels()
    ]);

    const requiredLabelNames = requiredLabels.map(label => label.name.toLowerCase());
    const missingLabels = requiredLabels.filter(label => 
        !existingLabels.includes(label.name.toLowerCase())
    );

    return {
        total: requiredLabels.length,
        existing: requiredLabels.length - missingLabels.length,
        missing: missingLabels,
        missingCount: missingLabels.length
    };
}

// Install missing labels
async function installMissingLabels(missingLabels) {
    if (!window.GitHubAuth?.githubAuth?.isAuthenticated || !window.GitHubAuth?.githubAuth?.accessToken) {
        throw new Error('Not authenticated with GitHub');
    }

    const results = {
        success: [],
        failed: []
    };

    for (const label of missingLabels) {
        try {
            const response = await fetch(`${window.GitHubAuth.GITHUB_CONFIG.apiBaseUrl}/repos/${window.GitHubAuth.GITHUB_CONFIG.owner}/${window.GitHubAuth.GITHUB_CONFIG.repo}/labels`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/vnd.github.v3+json',
                    'Authorization': `token ${window.GitHubAuth.githubAuth.accessToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: label.name,
                    description: label.description,
                    color: label.color
                })
            });

            if (response.ok) {
                results.success.push(label.name);
                console.log(`✅ Created label: ${label.name}`);
            } else {
                const errorData = await response.json();
                results.failed.push({ name: label.name, error: errorData.message });
                console.error(`❌ Failed to create label ${label.name}:`, errorData.message);
            }
        } catch (error) {
            results.failed.push({ name: label.name, error: error.message });
            console.error(`❌ Failed to create label ${label.name}:`, error);
        }
    }

    return results;
}

// Update the label warning UI in the modal
async function updateLabelWarning() {
    const warningSection = document.getElementById('label-warning-section');
    const installButton = document.getElementById('install-labels-btn');
    
    if (!warningSection) return;

    try {
        const labelStatus = await findMissingLabels();
        
        if (labelStatus.missingCount === 0) {
            // All labels exist, hide warning
            warningSection.style.display = 'none';
            return;
        }

        // Show warning with missing label count
        warningSection.style.display = 'block';

        // Set up install button click handler
        if (installButton) {
            installButton.onclick = async () => {
                installButton.disabled = true;
                installButton.textContent = 'Installing...';
                
                try {
                    const results = await installMissingLabels(labelStatus.missing);
                    
                    if (results.failed.length === 0) {
                        // All labels installed successfully
                        warningSection.style.display = 'none';
                    } else {
                        // Some labels failed - refresh the warning to show remaining missing labels
                        await updateLabelWarning();
                    }
                } catch (error) {
                    console.error('Failed to install labels:', error);
                } finally {
                    installButton.disabled = false;
                    installButton.textContent = 'Install Labels';
                }
            };
        }
    } catch (error) {
        console.error('❌ Failed to update label warning:', error);
        warningSection.style.display = 'none';
    }
}

// Export functions for use by other modules
window.GitHubLabels = {
    loadRequiredLabels,
    checkExistingLabels,
    findMissingLabels,
    installMissingLabels,
    updateLabelWarning
}; 