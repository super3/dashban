// GitHub UI Components and Rendering for Dashban Kanban Board

function renderMarkdown(text) {
    if (!text) return 'No description provided';
    
    // Check if we have access to markdown-it and DOMPurify (browser environment)
    if (typeof window !== 'undefined' && window.markdownit && window.DOMPurify) {
        try {
            // Initialize markdown-it with safe defaults
            const md = window.markdownit({
                html: false,        // Disable raw HTML input
                breaks: true,       // Convert '\n' to <br>
                linkify: true,      // Auto-convert URLs to links
                typographer: false  // Disable fancy quotes/dashes for consistency
            });
            
            // Configure markdown-it to add classes to links for our styling
            md.renderer.rules.link_open = function(tokens, idx, options, env, self) {
                // Add our link classes
                const aIndex = tokens[idx].attrIndex('class');
                if (aIndex < 0) {
                    tokens[idx].attrPush(['class', 'text-blue-600 hover:text-blue-800 underline break-all']);
                } else {
                    tokens[idx].attrs[aIndex][1] += ' text-blue-600 hover:text-blue-800 underline break-all';
                }
                
                // Add target="_blank" for external links
                const targetIndex = tokens[idx].attrIndex('target');
                if (targetIndex < 0) {
                    tokens[idx].attrPush(['target', '_blank']);
                }
                
                // Add title attribute for long URLs (for tooltips)
                const href = tokens[idx].attrGet('href');
                if (href && href.length > 50) {
                    const titleIndex = tokens[idx].attrIndex('title');
                    if (titleIndex < 0) {
                        tokens[idx].attrPush(['title', href]);
                    }
                }
                
                return self.renderToken(tokens, idx, options);
            };
            
            // Custom renderer for link text to handle URL truncation
            md.renderer.rules.link_close = function(tokens, idx, options, env, self) {
                // Check if this is an auto-linked URL by looking at the previous text token
                const linkOpenToken = tokens[idx - 2]; // link_open
                const textToken = tokens[idx - 1];     // text
                
                if (linkOpenToken && textToken && linkOpenToken.type === 'link_open') {
                    const href = linkOpenToken.attrGet('href');
                    const text = textToken.content;
                    
                    // If the text is the same as the href, it's an auto-linked URL
                    if (href === text && href.length > 50) {
                        // Truncate the display text
                        textToken.content = href.substring(0, 50) + '...';
                    }
                }
                
                return self.renderToken(tokens, idx, options);
            };
            
            // Render markdown to HTML
            let html = md.render(text);
            
            // Sanitize the HTML with DOMPurify
            html = window.DOMPurify.sanitize(html, {
                ALLOWED_TAGS: [
                    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                    'p', 'br', 'strong', 'em', 'u', 'del', 's',
                    'ul', 'ol', 'li',
                    'blockquote', 'code', 'pre',
                    'a', 'hr'
                ],
                ALLOWED_ATTR: ['href', 'title', 'target', 'class'],
                ALLOWED_CLASSES: {
                    'a': ['text-blue-600', 'hover:text-blue-800', 'underline', 'break-all'],
                    'code': ['bg-gray-100', 'text-gray-800', 'px-1', 'rounded', 'text-xs']
                }
            });
            
            // Add our custom styling classes
            html = html
                // Style headers to match our design - reduce bottom margin to avoid extra spacing
                .replace(/<h([1-6])>/g, '<h$1 class="font-bold text-gray-900 mb-1">')
                // Style code blocks
                .replace(/<code>/g, '<code class="bg-gray-100 text-gray-800 px-1 rounded text-xs">')
                // Style bullet lists - reduce margin and ensure consistent text size
                .replace(/<ul>/g, '<ul class="list-disc list-inside mb-1 space-y-0">')
                .replace(/<ol>/g, '<ol class="list-decimal list-inside mb-1 space-y-0">')
                // Style list items - ensure consistent text size with description
                .replace(/<li>/g, '<li class="text-sm text-gray-600">')
                // Style horizontal rules - reduce margin
                .replace(/<hr>/g, '<hr class="border-gray-200 my-2">')
                // Style blockquotes
                .replace(/<blockquote>/g, '<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600">');
            
            return html;
            
        } catch (error) {
            console.error('Error rendering markdown with markdown-it:', error);
            // Fall through to regex-based fallback
        }
    }
    
    // Fallback implementation (for tests or when libraries aren't available)
    // This is a simplified version that handles basic markdown patterns
    
    // Escape HTML first to prevent XSS
    const escapeHtml = (str) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    
    let html = escapeHtml(text);
    
    // Store URLs and markdown links temporarily to avoid conflicts with other markdown processing
    const placeholders = {};
    let counter = 0;
    
    // First, protect markdown links by replacing them with placeholders
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
        const placeholder = `LINKPLACEHOLDER${counter++}LINKPLACEHOLDER`;
        placeholders[placeholder] = `<a href="${url}" target="_blank" class="text-blue-600 hover:text-blue-800 underline">${linkText}</a>`;
        return placeholder;
    });
    
    // Then find and replace plain URLs with placeholders (now they won't conflict with markdown links)
    html = html.replace(/(^|[^"'>\]])(https?:\/\/[^\s<>"'\]]+)/g, (match, prefix, url) => {
        const placeholder = `URLPLACEHOLDER${counter++}URLPLACEHOLDER`;
        const maxLength = 50; // Maximum characters to display
        const displayUrl = url.length > maxLength ? 
            url.substring(0, maxLength) + '...' : 
            url;
        placeholders[placeholder] = `<a href="${url}" target="_blank" class="text-blue-600 hover:text-blue-800 underline break-all" title="${url}">${displayUrl}</a>`;
        return prefix + placeholder;
    });
    
    // Convert markdown patterns to HTML
    html = html
        // Bold text **text** or __text__
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.*?)__/g, '<strong>$1</strong>')
        
        // Italic text *text* or _text_
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/_(.*?)_/g, '<em>$1</em>')
        
        // Inline code `code`
        .replace(/`(.*?)`/g, '<code class="bg-gray-100 text-gray-800 px-1 rounded text-xs">$1</code>')
        
        // Headers ## Text
        .replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
            const level = hashes.length;
            return `<h${level} class="font-bold text-gray-900 mb-1">${text}</h${level}>`;
        })
        
        // Horizontal rules ------
        .replace(/^-{3,}$/gm, '<hr class="border-gray-200 my-2">')
        
        // Lists starting with -
        .replace(/^(\s*)-\s+(.+)$/gm, '<li class="text-sm text-gray-600">$2</li>')
        
        // Line breaks (convert double newlines to paragraph breaks)
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    
    // Wrap list items in ul tags
    html = html.replace(/(<li[^>]*>.*?<\/li>)(?:\s*<br>\s*<li[^>]*>.*?<\/li>)*/g, (match) => {
        return `<ul class="list-disc list-inside mb-1 space-y-0">${match.replace(/<br>/g, '')}</ul>`;
    });
    
    // Now replace all placeholders with their actual HTML
    Object.keys(placeholders).forEach(placeholder => {
        html = html.replace(placeholder, placeholders[placeholder]);
    });
    
    // Wrap in paragraph tags if it contains paragraph breaks
    if (html.includes('</p><p>')) {
        html = '<p>' + html + '</p>';
    }
    
    return html;
}

function createGitHubIssueElement(issue, isCompleted = false) {
    const taskDiv = document.createElement('div');
    taskDiv.className = 'bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-200 cursor-move';
    taskDiv.draggable = true;
    taskDiv.setAttribute('data-github-issue', issue.number);
    taskDiv.setAttribute('data-issue-number', issue.number);
    taskDiv.setAttribute('data-issue-id', issue.id);

    // Extract priority from labels (default to null if not found)
    const priority = extractPriorityFromLabels(issue.labels || []);
    const category = extractCategoryFromLabels(issue.labels || []);

    // Render markdown description
    const description = renderMarkdown(issue.body);

    taskDiv.innerHTML = `
        <div class="flex items-center justify-between mb-2">
            <h4 class="font-medium text-gray-900 text-sm">${issue.title}</h4>
            <a href="${issue.html_url}" target="_blank" class="text-gray-500 hover:text-gray-700 text-sm font-medium">
                #${issue.number}
            </a>
        </div>
        <div class="text-gray-600 text-sm mb-3 markdown-content">${description}</div>
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                ${priority ? `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${window.getPriorityColor(priority)}">${priority}</span>` : ''}
                ${category ? `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${window.getCategoryColor(category)}">${category}</span>` : ''}
            </div>
            ${issue.user ? 
                `<img src="${issue.user.avatar_url}" alt="${issue.user.login}" class="w-6 h-6 rounded-full">` :
                `<div class="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                    <i class="fas fa-user text-gray-400 text-xs"></i>
                </div>`
            }
        </div>
        ${isCompleted ? `
        <div class="border-t border-gray-200 mt-3 pt-1 -mb-2">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <i class="fas fa-check-circle text-green-500 text-xs"></i>
                    <span class="text-xs text-green-600">Completed</span>
                </div>
                <button class="archive-btn text-gray-400 hover:text-gray-600 p-1 transition-colors" 
                        title="Archive issue" 
                        data-issue-number="${issue.number}">
                    <i class="fas fa-archive text-xs"></i>
                </button>
            </div>
        </div>` : ''}
    `;

    return taskDiv;
}

function extractPriorityFromLabels(labels) {
    // Handle null or undefined labels
    if (!labels || !Array.isArray(labels)) {
        return null;
    }
    
    const priorityLabels = ['critical', 'high', 'medium', 'low'];
    const foundPriority = labels.find(label => 
        label && label.name && priorityLabels.includes(label.name.toLowerCase())
    );
    
    if (foundPriority) {
        return foundPriority.name.charAt(0).toUpperCase() + foundPriority.name.slice(1).toLowerCase();
    }
    
    return null;
}

function extractCategoryFromLabels(labels) {
    // Handle null or undefined labels
    if (!labels || !Array.isArray(labels)) {
        return 'Setup'; // default for GitHub issues
    }
    
    const categoryLabel = labels.find(label => {
        if (!label || !label.name) return false;
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
    
    return 'Setup'; // default for GitHub issues
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
        </div>
    `;
    
    return skeletonElement;
}

// Add "Ready for review" indicator to a card
function addReviewIndicator(taskElement) {
    // Check if indicator already exists
    if (taskElement.querySelector('.review-indicator')) {
        return;
    }
    
    // Create the review indicator HTML
    const reviewIndicator = document.createElement('div');
    reviewIndicator.className = 'review-indicator mt-3';
    reviewIndicator.innerHTML = `
        <div class="flex items-center space-x-2">
            <i class="fas fa-clock text-gray-400 text-xs"></i>
            <span class="text-xs text-gray-500">Ready for review</span>
        </div>
    `;
    
    // Add to the end of the card
    taskElement.appendChild(reviewIndicator);
}

// Remove "Ready for review" indicator from a card
function removeReviewIndicator(taskElement) {
    const indicator = taskElement.querySelector('.review-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Add completed section with archive button to a card
function addCompletedSection(taskElement) {
    // Check if completed section already exists (check for both class name and content)
    if (taskElement.querySelector('.completed-section') || 
        taskElement.innerHTML.includes('fas fa-check-circle text-green-500')) {
        return;
    }
    
    // Get the issue number from the task element
    const issueNumber = taskElement.getAttribute('data-issue-number');
    
    if (!issueNumber) {
        return; // Only add to GitHub issues
    }
    
    // Create the completed section HTML
    const completedSection = document.createElement('div');
    completedSection.className = 'completed-section border-t border-gray-200 mt-3 pt-1 -mb-2';
    completedSection.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center space-x-2">
                <i class="fas fa-check-circle text-green-500 text-xs"></i>
                <span class="text-xs text-green-600">Completed</span>
            </div>
            <button class="archive-btn text-gray-400 hover:text-gray-600 p-1 transition-colors" 
                    title="Archive issue" 
                    data-issue-number="${issueNumber}">
                <i class="fas fa-archive text-xs"></i>
            </button>
        </div>
    `;
    
    // Add to the end of the card
    taskElement.appendChild(completedSection);
}

// Remove completed section from a card
function removeCompletedSection(taskElement) {
    // Remove the new class-based completed section
    const completedSection = taskElement.querySelector('.completed-section');
    if (completedSection) {
        completedSection.remove();
    }
    
    // Also remove any inline completed section that might be in the original HTML
    // Look for the pattern from createGitHubIssueElement when isCompleted = true
    const inlineCompletedSections = taskElement.querySelectorAll('.border-t.border-gray-200.mt-3.pt-1.-mb-2');
    inlineCompletedSections.forEach(section => {
        if (section.innerHTML.includes('fas fa-check-circle text-green-500')) {
            section.remove();
        }
    });
}

// Update card indicators based on column
function updateCardIndicators(taskElement, columnId) {
    if (columnId === 'review') {
        addReviewIndicator(taskElement);
        removeCompletedSection(taskElement);
    } else if (columnId === 'done') {
        addCompletedSection(taskElement);
        removeReviewIndicator(taskElement);
    } else {
        removeReviewIndicator(taskElement);
        removeCompletedSection(taskElement);
    }
}

// Apply review indicators to all cards currently in the review column
function applyReviewIndicatorsToColumn() {
    const reviewColumn = document.getElementById('review');
    if (reviewColumn) {
        const cards = reviewColumn.querySelectorAll('.bg-white.border');
        cards.forEach(card => {
            addReviewIndicator(card);
        });
    }
}

// Apply completed sections to all cards currently in the done column
function applyCompletedSectionsToColumn() {
    const doneColumn = document.getElementById('done');
    if (doneColumn) {
        const cards = doneColumn.querySelectorAll('.bg-white.border');
        cards.forEach(card => {
            addCompletedSection(card);
        });
    }
}

// Export UI functions
window.GitHubUI = {
    // Rendering functions
    renderMarkdown,
    createGitHubIssueElement,
    extractPriorityFromLabels,
    extractCategoryFromLabels,
    createSkeletonCard,
    
    // Card indicator functions
    updateCardIndicators,
    applyReviewIndicatorsToColumn,
    applyCompletedSectionsToColumn,
    addReviewIndicator,
    removeReviewIndicator,
    addCompletedSection,
    removeCompletedSection
}; 