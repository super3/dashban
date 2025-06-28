/**
 * Issue Modal Tests
 * 
 * Comprehensive tests for the issue modal functionality to achieve 100% coverage
 */

describe('Issue Modal', () => {
  let mockAlert, mockFocus;

  beforeEach(() => {
    // Reset DOM and globals
    document.body.innerHTML = '';
    delete window.IssueModal;
    delete window.GitHubUI;
    delete window.GitHubAPI;
    delete window.KanbanBoard;
    delete window.getPriorityColor;
    delete window.getCategoryColor;
    delete window.getTimeAgo;
    delete window.loadAndDisplayComments;
    delete window.createCommentElement;

    // Clear module cache and require fresh copy
    jest.resetModules();
    
    // Load the issue modal module
    const issueModalModule = require('../src/issue-modal.js');
    
    // Manually assign module exports to window for testing
    if (issueModalModule) {
      window.getPriorityClasses = issueModalModule.getPriorityClasses;
      window.getCategoryClasses = issueModalModule.getCategoryClasses;
      window.loadAndDisplayComments = issueModalModule.loadAndDisplayComments;
      window.createCommentElement = issueModalModule.createCommentElement;
      window.getTimeAgo = issueModalModule.getTimeAgo;
    }

    // Mock console methods
    console.log = jest.fn();
    console.error = jest.fn();

    // Mock browser APIs
    mockAlert = jest.fn();
    global.alert = mockAlert;

    mockFocus = jest.fn();
    HTMLElement.prototype.focus = mockFocus;

    // Mock Date
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2023-01-01T12:00:00Z').getTime());
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    document.body.innerHTML = '';
  });

  describe('Module Loading', () => {
    test('should load module and export functions to global scope', () => {
      expect(window.IssueModal).toBeDefined();
      expect(typeof window.IssueModal.openIssueModal).toBe('function');
      expect(typeof window.IssueModal.closeIssueModal).toBe('function');
      expect(typeof window.IssueModal.populateIssueModal).toBe('function');
      expect(typeof window.IssueModal.resetEditStates).toBe('function');
      expect(typeof window.IssueModal.setupIssueModalEventHandlers).toBe('function');
    });
  });

  describe('openIssueModal', () => {
    test('should handle missing modal gracefully', () => {
      const taskElement = document.createElement('div');
      
      expect(() => {
        window.IssueModal.openIssueModal('123', taskElement);
      }).not.toThrow();
      
      expect(console.error).toHaveBeenCalledWith('Issue modal not found');
    });

    test('should open modal and set up event handlers', () => {
      // Create modal element and required DOM elements
      const modal = document.createElement('div');
      modal.id = 'issue-modal';
      modal.classList.add('hidden');
      document.body.appendChild(modal);

      // Create required elements for populateIssueModal
      const elements = [
        'issue-modal-number', 'issue-modal-title', 'issue-description-display',
        'issue-description-edit', 'view-on-github-btn', 'issue-title-edit',
        'issue-priority-select', 'issue-category-select', 'issue-state-badge',
        'issue-column-badge', 'close-issue-btn', 'reopen-issue-btn'
      ];

      elements.forEach(id => {
        const el = document.createElement('div');
        el.id = id;
        document.body.appendChild(el);
      });

      // Create column container for taskElement
      const backlogCol = document.createElement('div');
      backlogCol.id = 'backlog';
      document.body.appendChild(backlogCol);

      // Create task element
      const taskElement = document.createElement('div');
      backlogCol.appendChild(taskElement);

      // Mock loadAndDisplayComments
      global.loadAndDisplayComments = jest.fn();

      window.IssueModal.openIssueModal('123', taskElement);

      expect(modal.classList.contains('hidden')).toBe(false);
      
      // Verify populateIssueModal was called by checking modal content
      const modalNumber = document.getElementById('issue-modal-number');
      expect(modalNumber.textContent).toBe('#123');
    });

    test('should not set up event handlers twice', () => {
      // Create modal element and required DOM elements
      const modal = document.createElement('div');
      modal.id = 'issue-modal';
      modal.classList.add('hidden');
      document.body.appendChild(modal);

      // Create required elements for populateIssueModal
      const elements = [
        'issue-modal-number', 'issue-modal-title', 'issue-description-display',
        'issue-description-edit', 'view-on-github-btn', 'issue-title-edit',
        'issue-priority-select', 'issue-category-select', 'issue-state-badge',
        'issue-column-badge', 'close-issue-btn', 'reopen-issue-btn'
      ];

      elements.forEach(id => {
        const el = document.createElement('div');
        el.id = id;
        document.body.appendChild(el);
      });

      // Create column container for taskElement
      const backlogCol = document.createElement('div');
      backlogCol.id = 'backlog';
      document.body.appendChild(backlogCol);

      const taskElement = document.createElement('div');
      backlogCol.appendChild(taskElement);
      
      // Mock loadAndDisplayComments
      global.loadAndDisplayComments = jest.fn();

      // Call twice
      window.IssueModal.openIssueModal('123', taskElement);
      window.IssueModal.openIssueModal('456', taskElement);
      
      // Verify the modal still works after second call
      const modalNumber = document.getElementById('issue-modal-number');
      expect(modalNumber.textContent).toBe('#456');
    });
  });

  describe('closeIssueModal', () => {
    test('should close modal and reset edit states when modal exists', () => {
      const modal = document.createElement('div');
      modal.id = 'issue-modal';
      document.body.appendChild(modal);

      // Set up some edit states to verify they get reset
      const titleEdit = document.createElement('input');
      titleEdit.id = 'issue-title-edit';
      titleEdit.classList.add('hidden');
      document.body.appendChild(titleEdit);
      
      window.IssueModal.closeIssueModal();

      expect(modal.classList.contains('hidden')).toBe(true);
      // resetEditStates is called internally, verify its effects
      expect(titleEdit.classList.contains('hidden')).toBe(true);
    });

    test('should handle missing modal gracefully', () => {
      expect(() => {
        window.IssueModal.closeIssueModal();
      }).not.toThrow();
    });
  });

  describe('populateIssueModal', () => {
    beforeEach(() => {
      // Set up required DOM elements
      const elements = [
        'issue-modal-number', 'issue-modal-title', 'issue-description-display',
        'issue-description-edit', 'view-on-github-btn', 'issue-title-edit',
        'issue-priority-select', 'issue-category-select', 'issue-state-badge',
        'issue-column-badge', 'close-issue-btn', 'reopen-issue-btn'
      ];

      elements.forEach(id => {
        const el = document.createElement('div');
        el.id = id;
        document.body.appendChild(el);
      });

      // Create column containers
      ['backlog', 'inprogress', 'review', 'done'].forEach(id => {
        const col = document.createElement('div');
        col.id = id;
        document.body.appendChild(col);
      });
    });

    test('should populate modal with task element data', () => {
      // Create task element with all data
      const taskElement = document.createElement('div');
      taskElement.setAttribute('data-raw-description', '# Test Description\nThis is a test');
      
      const titleEl = document.createElement('h4');
      titleEl.textContent = 'Test Issue';
      taskElement.appendChild(titleEl);

      const descEl = document.createElement('div');
      descEl.className = 'markdown-content';
      descEl.innerHTML = '<h1>Test Description</h1><p>This is a test</p>';
      taskElement.appendChild(descEl);

      const linkEl = document.createElement('a');
      linkEl.href = 'https://github.com/test/repo/issues/123';
      taskElement.appendChild(linkEl);

      const priorityEl = document.createElement('span');
      priorityEl.className = 'bg-red-100';
      priorityEl.textContent = 'High';
      taskElement.appendChild(priorityEl);

      const categoryEl = document.createElement('span');
      categoryEl.className = 'bg-blue-100';
      categoryEl.textContent = 'Frontend';
      taskElement.appendChild(categoryEl);

      // Add to backlog column
      const backlogCol = document.getElementById('backlog');
      backlogCol.appendChild(taskElement);

      // Mock GitHubUI
      window.GitHubUI = {
        renderMarkdown: jest.fn().mockReturnValue('<h1>Test Description</h1><p>This is a test</p>')
      };

      const loadCommentsSpy = jest.fn();
      global.loadAndDisplayComments = loadCommentsSpy;

      window.IssueModal.populateIssueModal('123', taskElement);

      expect(document.getElementById('issue-modal-number').textContent).toBe('#123');
      expect(document.getElementById('issue-modal-title').textContent).toBe('Test Issue');
      expect(document.getElementById('issue-description-display').innerHTML).toBe('<h1>Test Description</h1><p>This is a test</p>');
      expect(document.getElementById('issue-description-edit').value).toBe('# Test Description\nThis is a test');
      expect(document.getElementById('view-on-github-btn').href).toBe('https://github.com/test/repo/issues/123');
      expect(document.getElementById('issue-title-edit').value).toBe('Test Issue');
      expect(document.getElementById('issue-priority-select').value).toBe('High');
      expect(document.getElementById('issue-category-select').value).toBe('Frontend');
    });

    test('should handle missing elements gracefully', () => {
      // Create column container for taskElement
      const backlogCol = document.createElement('div');
      backlogCol.id = 'backlog';
      document.body.appendChild(backlogCol);

      const taskElement = document.createElement('div');
      backlogCol.appendChild(taskElement);

      // Mock loadAndDisplayComments
      global.loadAndDisplayComments = jest.fn();

      expect(() => {
        window.IssueModal.populateIssueModal('123', taskElement);
      }).not.toThrow();

      expect(document.getElementById('issue-modal-number').textContent).toBe('#123');
      expect(document.getElementById('issue-modal-title').textContent).toBe('Unknown Title');
      expect(document.getElementById('issue-description-display').innerHTML).toBe('No description available');
    });

    test('should handle done column status correctly', () => {
      const taskElement = document.createElement('div');
      const doneCol = document.getElementById('done');
      doneCol.appendChild(taskElement);

      window.IssueModal.populateIssueModal('123', taskElement);

      const stateBadge = document.getElementById('issue-state-badge');
      expect(stateBadge.className).toContain('bg-red-100');
      expect(stateBadge.textContent).toBe('Closed');
      
      expect(document.getElementById('close-issue-btn').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('reopen-issue-btn').classList.contains('hidden')).toBe(false);
    });

    test('should handle open status for non-done columns', () => {
      const taskElement = document.createElement('div');
      const backlogCol = document.getElementById('backlog');
      backlogCol.appendChild(taskElement);

      window.IssueModal.populateIssueModal('123', taskElement);

      const stateBadge = document.getElementById('issue-state-badge');
      expect(stateBadge.className).toContain('bg-green-100');
      expect(stateBadge.textContent).toBe('Open');
      
      expect(document.getElementById('close-issue-btn').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('reopen-issue-btn').classList.contains('hidden')).toBe(true);
    });

    test('should handle description without GitHubUI', () => {
      // Create column container for taskElement
      const backlogCol = document.createElement('div');
      backlogCol.id = 'backlog';
      document.body.appendChild(backlogCol);

      const taskElement = document.createElement('div');
      taskElement.setAttribute('data-raw-description', 'Plain text description');
      backlogCol.appendChild(taskElement);

      const descEl = document.createElement('div');
      descEl.className = 'markdown-content';
      taskElement.appendChild(descEl);

      // Mock loadAndDisplayComments
      global.loadAndDisplayComments = jest.fn();

      window.IssueModal.populateIssueModal('123', taskElement);

      expect(document.getElementById('issue-description-display').innerHTML).toBe('Plain text description');
    });

    test('should extract text content when no raw description available', () => {
      // Create column container for taskElement
      const backlogCol = document.createElement('div');
      backlogCol.id = 'backlog';
      document.body.appendChild(backlogCol);

      const taskElement = document.createElement('div');
      backlogCol.appendChild(taskElement);

      const descEl = document.createElement('div');
      descEl.className = 'markdown-content';
      descEl.innerHTML = '<p>Extracted HTML content</p>';
      taskElement.appendChild(descEl);

      // Mock loadAndDisplayComments
      global.loadAndDisplayComments = jest.fn();

      window.IssueModal.populateIssueModal('123', taskElement);

      expect(document.getElementById('issue-description-edit').value).toBe('Extracted HTML content');
      expect(document.getElementById('issue-description-display').innerHTML).toBe('<p>Extracted HTML content</p>');
    });
  });

  describe('resetEditStates', () => {
    beforeEach(() => {
      // Set up required DOM elements
      const elements = [
        { id: 'issue-modal-title', tag: 'h2' },
        { id: 'issue-modal-number', tag: 'span' },
        { id: 'issue-title-edit', tag: 'input' },
        { id: 'title-edit-actions', tag: 'div' },
        { id: 'edit-title-btn', tag: 'button' },
        { id: 'issue-description-display', tag: 'div' },
        { id: 'issue-description-edit', tag: 'textarea' },
        { id: 'description-edit-actions', tag: 'div' }
      ];

      elements.forEach(({id, tag}) => {
        const el = document.createElement(tag);
        el.id = id;
        document.body.appendChild(el);
      });
    });

    test('should reset all edit states to default', () => {
      // Set up elements in edit mode
      document.getElementById('issue-modal-title').classList.add('hidden');
      document.getElementById('issue-modal-number').classList.add('hidden');
      document.getElementById('issue-title-edit').classList.remove('hidden');
      document.getElementById('title-edit-actions').classList.remove('hidden');
      document.getElementById('edit-title-btn').classList.add('hidden');
      document.getElementById('issue-description-display').classList.add('hidden');
      document.getElementById('issue-description-edit').classList.remove('hidden');
      document.getElementById('description-edit-actions').classList.remove('hidden');

      window.IssueModal.resetEditStates();

      // Verify title edit state reset
      expect(document.getElementById('issue-modal-title').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('issue-modal-number').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('issue-title-edit').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('title-edit-actions').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('edit-title-btn').classList.contains('hidden')).toBe(false);

      // Verify description edit state reset
      expect(document.getElementById('issue-description-display').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('issue-description-edit').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('description-edit-actions').classList.contains('hidden')).toBe(true);
    });

    test('should handle missing elements gracefully', () => {
      // Remove some elements
      document.getElementById('issue-modal-title').remove();
      document.getElementById('issue-description-edit').remove();

      expect(() => {
        window.IssueModal.resetEditStates();
      }).not.toThrow();
    });
  });

  describe('setupIssueModalEventHandlers', () => {
    let modal, closeBtn, editTitleBtn, saveTitleBtn, cancelTitleBtn;
    let editDescBtn, saveDescBtn, cancelDescBtn, prioritySelect, categorySelect;
    let closeIssueBtn, reopenIssueBtn, addCommentBtn;

    beforeEach(() => {
      // Create modal
      modal = document.createElement('div');
      modal.id = 'issue-modal';
      const modalContent = document.createElement('div');
      modalContent.className = 'max-w-4xl';
      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Create close button
      closeBtn = document.createElement('button');
      closeBtn.id = 'close-issue-modal';
      document.body.appendChild(closeBtn);

      // Create title editing elements
      editTitleBtn = document.createElement('button');
      editTitleBtn.id = 'edit-title-btn';
      document.body.appendChild(editTitleBtn);

      saveTitleBtn = document.createElement('button');
      saveTitleBtn.id = 'save-title-btn';
      document.body.appendChild(saveTitleBtn);

      cancelTitleBtn = document.createElement('button');
      cancelTitleBtn.id = 'cancel-title-btn';
      document.body.appendChild(cancelTitleBtn);

      // Create description editing elements
      editDescBtn = document.createElement('button');
      editDescBtn.id = 'edit-description-btn';
      document.body.appendChild(editDescBtn);

      saveDescBtn = document.createElement('button');
      saveDescBtn.id = 'save-description-btn';
      document.body.appendChild(saveDescBtn);

      cancelDescBtn = document.createElement('button');
      cancelDescBtn.id = 'cancel-description-btn';
      document.body.appendChild(cancelDescBtn);

      // Create select elements
      prioritySelect = document.createElement('select');
      prioritySelect.id = 'issue-priority-select';
      prioritySelect.innerHTML = `
        <option value="">No Priority</option>
        <option value="Low">Low</option>
        <option value="Medium">Medium</option>
        <option value="High">High</option>
      `;
      document.body.appendChild(prioritySelect);

      categorySelect = document.createElement('select');
      categorySelect.id = 'issue-category-select';
      categorySelect.innerHTML = `
        <option value="">No Category</option>
        <option value="Frontend">Frontend</option>
        <option value="Backend">Backend</option>
        <option value="Design">Design</option>
      `;
      document.body.appendChild(categorySelect);

      // Create action buttons
      closeIssueBtn = document.createElement('button');
      closeIssueBtn.id = 'close-issue-btn';
      document.body.appendChild(closeIssueBtn);

      reopenIssueBtn = document.createElement('button');
      reopenIssueBtn.id = 'reopen-issue-btn';
      document.body.appendChild(reopenIssueBtn);

      addCommentBtn = document.createElement('button');
      addCommentBtn.id = 'add-comment-btn';
      document.body.appendChild(addCommentBtn);

      // Create required form elements
      const elements = [
        { id: 'issue-modal-title', tag: 'h2' },
        { id: 'issue-modal-number', tag: 'span', text: '#123' },
        { id: 'issue-title-edit', tag: 'input' },
        { id: 'title-edit-actions', tag: 'div' },
        { id: 'issue-description-display', tag: 'div' },
        { id: 'issue-description-edit', tag: 'textarea' },
        { id: 'description-edit-actions', tag: 'div' },
        { id: 'issue-state-badge', tag: 'span' },
        { id: 'new-comment-text', tag: 'textarea' }
      ];

      elements.forEach(({id, tag, text}) => {
        const el = document.createElement(tag);
        el.id = id;
        if (text) el.textContent = text;
        document.body.appendChild(el);
      });

      // Create column containers
      ['backlog', 'done'].forEach(id => {
        const col = document.createElement('div');
        col.id = id;
        document.body.appendChild(col);
      });
    });

    test('should handle missing elements gracefully', () => {
      // Remove all elements
      document.body.innerHTML = '';
      
      expect(() => {
        window.IssueModal.setupIssueModalEventHandlers();
      }).not.toThrow();
    });

    test('should set up close modal event handlers', () => {
      window.IssueModal.setupIssueModalEventHandlers();

      // Test close button click
      closeBtn.dispatchEvent(new Event('click'));
      expect(modal.classList.contains('hidden')).toBe(true);
      
      // Reset modal state
      modal.classList.remove('hidden');

      // Test modal backdrop click
      modal.dispatchEvent(new Event('click'));
      expect(modal.classList.contains('hidden')).toBe(true);
    });

    test('should not close modal when clicking inside modal content', () => {
      const closeSpy = jest.spyOn(window.IssueModal, 'closeIssueModal');
      
      window.IssueModal.setupIssueModalEventHandlers();

      // Click on modal content
      const modalContent = modal.querySelector('.max-w-4xl');
      modalContent.click();
      expect(closeSpy).not.toHaveBeenCalled();
    });

    test('should set up title editing handlers', () => {
      window.IssueModal.setupIssueModalEventHandlers();

      // Test edit title button
      editTitleBtn.click();
      
      expect(document.getElementById('issue-modal-title').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('issue-modal-number').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('issue-title-edit').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('title-edit-actions').classList.contains('hidden')).toBe(false);
      expect(editTitleBtn.classList.contains('hidden')).toBe(true);
      expect(mockFocus).toHaveBeenCalled();

      // Test cancel title button
      cancelTitleBtn.click();
      
      expect(document.getElementById('issue-modal-title').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('issue-modal-number').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('issue-title-edit').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('title-edit-actions').classList.contains('hidden')).toBe(true);
      expect(editTitleBtn.classList.contains('hidden')).toBe(false);
    });

    test('should handle save title with empty value', async () => {
      document.getElementById('issue-title-edit').value = '   ';
      
      window.IssueModal.setupIssueModalEventHandlers();

      saveTitleBtn.click();
      
      expect(mockAlert).toHaveBeenCalledWith('Title cannot be empty');
    });

    test('should handle save title successfully', async () => {
      document.getElementById('issue-title-edit').value = 'New Title';
      
      // Create task element
      const taskElement = document.createElement('div');
      taskElement.setAttribute('data-issue-number', '123');
      const titleEl = document.createElement('h4');
      taskElement.appendChild(titleEl);
      document.body.appendChild(taskElement);

      // Mock GitHubAPI
      window.GitHubAPI = {
        updateGitHubIssueTitle: jest.fn().mockResolvedValue(true)
      };

      window.IssueModal.setupIssueModalEventHandlers();

      await saveTitleBtn.click();
      
      expect(document.getElementById('issue-modal-title').textContent).toBe('New Title');
      expect(titleEl.textContent).toBe('New Title');
      expect(window.GitHubAPI.updateGitHubIssueTitle).toHaveBeenCalledWith('123', 'New Title');
    });

    test('should handle save title without GitHubAPI', async () => {
      document.getElementById('issue-title-edit').value = 'New Title';
      
      window.IssueModal.setupIssueModalEventHandlers();

      await saveTitleBtn.click();
      
      expect(console.log).toHaveBeenCalledWith('GitHub API not available, title updated locally only');
    });

    test('should set up description editing handlers', () => {
      window.IssueModal.setupIssueModalEventHandlers();

      // Test edit description button
      editDescBtn.click();
      
      expect(document.getElementById('issue-description-display').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('issue-description-edit').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('description-edit-actions').classList.contains('hidden')).toBe(false);
      expect(mockFocus).toHaveBeenCalled();

      // Test cancel description button
      cancelDescBtn.click();
      
      expect(document.getElementById('issue-description-display').classList.contains('hidden')).toBe(false);
      expect(document.getElementById('issue-description-edit').classList.contains('hidden')).toBe(true);
      expect(document.getElementById('description-edit-actions').classList.contains('hidden')).toBe(true);
    });

    test('should handle save description with GitHubUI', async () => {
      document.getElementById('issue-description-edit').value = 'New description';
      
      // Create task element
      const taskElement = document.createElement('div');
      taskElement.setAttribute('data-issue-number', '123');
      taskElement.setAttribute('data-github-issue', 'true');
      const descEl = document.createElement('div');
      descEl.className = 'markdown-content';
      taskElement.appendChild(descEl);
      document.body.appendChild(taskElement);

      // Mock GitHubUI and GitHubAPI
      window.GitHubUI = {
        renderMarkdown: jest.fn().mockReturnValue('<p>New description</p>')
      };
      window.GitHubAPI = {
        updateGitHubIssueDescription: jest.fn().mockResolvedValue(true)
      };

      window.IssueModal.setupIssueModalEventHandlers();

      await saveDescBtn.click();
      
      expect(document.getElementById('issue-description-display').innerHTML).toBe('<p>New description</p>');
      expect(descEl.innerHTML).toBe('<p>New description</p>');
      expect(taskElement.getAttribute('data-raw-description')).toBe('New description');
      expect(window.GitHubAPI.updateGitHubIssueDescription).toHaveBeenCalledWith('123', 'New description');
    });

    test('should handle save description without GitHubUI', async () => {
      document.getElementById('issue-description-edit').value = 'New description';
      
      // Create task element
      const taskElement = document.createElement('div');
      taskElement.setAttribute('data-issue-number', '123');
      const descEl = document.createElement('div');
      descEl.className = 'markdown-content';
      taskElement.appendChild(descEl);
      document.body.appendChild(taskElement);

      window.IssueModal.setupIssueModalEventHandlers();

      await saveDescBtn.click();
      
      expect(document.getElementById('issue-description-display').textContent).toBe('New description');
      expect(descEl.textContent).toBe('New description');
      expect(console.log).toHaveBeenCalledWith('Updated local task description: "New description"');
    });

    test('should handle save description API error', async () => {
      document.getElementById('issue-description-edit').value = 'New description';
      
      // Create task element
      const taskElement = document.createElement('div');
      taskElement.setAttribute('data-issue-number', '123');
      taskElement.setAttribute('data-github-issue', 'true');
      document.body.appendChild(taskElement);

      // Mock GitHubAPI to throw error
      window.GitHubAPI = {
        updateGitHubIssueDescription: jest.fn().mockRejectedValue(new Error('API Error'))
      };

      window.IssueModal.setupIssueModalEventHandlers();

      await saveDescBtn.click();
      
      expect(console.error).toHaveBeenCalledWith('❌ Failed to update GitHub issue description:', expect.any(Error));
    });

    test('should handle priority change', async () => {
      // Create task element with label container
      const taskElement = document.createElement('div');
      taskElement.setAttribute('data-issue-number', '123');
      const labelContainer = document.createElement('div');
      labelContainer.className = 'flex items-center space-x-2';
      
      // Add existing priority badge
      const existingBadge = document.createElement('span');
      existingBadge.textContent = 'Low';
      labelContainer.appendChild(existingBadge);
      
      taskElement.appendChild(labelContainer);
      document.body.appendChild(taskElement);

      // Set issue number in modal
      document.getElementById('issue-modal-number').textContent = '#123';
      
      // Mock getPriorityColor
      window.getPriorityColor = jest.fn().mockReturnValue('bg-red-100 text-red-800');
      window.GitHubAPI = {
        updateGitHubIssueMetadata: jest.fn().mockResolvedValue(true)
      };

      window.IssueModal.setupIssueModalEventHandlers();

      prioritySelect.value = 'High';
      prioritySelect.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async

      expect(window.GitHubAPI.updateGitHubIssueMetadata).toHaveBeenCalledWith('123', 'priority', 'High');
    });

    test('should handle priority change without API', async () => {
      // Create task element with label container
      const taskElement = document.createElement('div');
      taskElement.setAttribute('data-issue-number', '123');
      const labelContainer = document.createElement('div');
      labelContainer.className = 'flex items-center space-x-2';
      taskElement.appendChild(labelContainer);
      document.body.appendChild(taskElement);

      window.IssueModal.setupIssueModalEventHandlers();

      prioritySelect.value = 'High';
      prioritySelect.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async

      expect(console.log).toHaveBeenCalledWith('GitHub API not available, priority updated locally only');
    });

    test('should handle priority change without issue number element', async () => {
      document.getElementById('issue-modal-number').remove();

      window.IssueModal.setupIssueModalEventHandlers();

      prioritySelect.value = 'High';
      prioritySelect.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async

      // Should not crash
    });

    test('should handle category change', async () => {
      // Create task element with label container
      const taskElement = document.createElement('div');
      taskElement.setAttribute('data-issue-number', '123');
      const labelContainer = document.createElement('div');
      labelContainer.className = 'flex items-center space-x-2';
      
      // Add existing category badge
      const existingBadge = document.createElement('span');
      existingBadge.textContent = 'Frontend';
      labelContainer.appendChild(existingBadge);
      
      taskElement.appendChild(labelContainer);
      document.body.appendChild(taskElement);

      // Mock getCategoryColor
      // Set issue number in modal
      document.getElementById('issue-modal-number').textContent = '#123';
      
      window.getCategoryColor = jest.fn().mockReturnValue('bg-blue-100 text-blue-800');
      window.GitHubAPI = {
        updateGitHubIssueMetadata: jest.fn().mockResolvedValue(true)
      };

      window.IssueModal.setupIssueModalEventHandlers();

      categorySelect.value = 'Backend';
      categorySelect.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async

      expect(window.GitHubAPI.updateGitHubIssueMetadata).toHaveBeenCalledWith('123', 'category', 'Backend');
    });

    test('should handle category change without API', async () => {
      // Create task element with label container
      const taskElement = document.createElement('div');
      taskElement.setAttribute('data-issue-number', '123');
      const labelContainer = document.createElement('div');
      labelContainer.className = 'flex items-center space-x-2';
      taskElement.appendChild(labelContainer);
      document.body.appendChild(taskElement);

      window.IssueModal.setupIssueModalEventHandlers();

      categorySelect.value = 'Backend';
      categorySelect.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async

      expect(console.log).toHaveBeenCalledWith('GitHub API not available, category updated locally only');
    });

    test('should handle category change without issue number element', async () => {
      document.getElementById('issue-modal-number').remove();

      window.IssueModal.setupIssueModalEventHandlers();

      categorySelect.value = 'Backend';
      categorySelect.dispatchEvent(new Event('change'));

      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async

      // Should not crash
    });

    test('should handle close issue', async () => {
      // Create task element
      const taskElement = document.createElement('div');
      taskElement.setAttribute('data-issue-number', '123');
      document.body.appendChild(taskElement);

      // Mock KanbanBoard and GitHubUI
      window.KanbanBoard = {
        updateColumnCounts: jest.fn()
      };
      window.GitHubUI = {
        addCompletedSection: jest.fn()
      };
      window.GitHubAPI = {
        closeGitHubIssue: jest.fn().mockResolvedValue(true)
      };

      window.IssueModal.setupIssueModalEventHandlers();

      closeIssueBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async

      expect(document.getElementById('issue-state-badge').textContent).toBe('Closed');
      expect(closeIssueBtn.classList.contains('hidden')).toBe(true);
      expect(reopenIssueBtn.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('done').contains(taskElement)).toBe(true);
      expect(window.GitHubAPI.closeGitHubIssue).toHaveBeenCalledWith('123');
    });

    test('should handle close issue without API', async () => {
      const taskElement = document.createElement('div');
      taskElement.setAttribute('data-issue-number', '123');
      document.body.appendChild(taskElement);

      window.IssueModal.setupIssueModalEventHandlers();

      closeIssueBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async

      expect(console.log).toHaveBeenCalledWith('GitHub API not available, issue closed locally only');
    });

    test('should handle close issue without issue number element', async () => {
      document.getElementById('issue-modal-number').remove();

      window.IssueModal.setupIssueModalEventHandlers();

      closeIssueBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async

      // Should not crash
    });

    test('should handle reopen issue', async () => {
      // Create task element
      const taskElement = document.createElement('div');
      taskElement.setAttribute('data-issue-number', '123');
      document.body.appendChild(taskElement);

      // Mock KanbanBoard and GitHubUI
      window.KanbanBoard = {
        updateColumnCounts: jest.fn()
      };
      window.GitHubUI = {
        removeCompletedSection: jest.fn()
      };
      window.GitHubAPI = {
        reopenGitHubIssue: jest.fn().mockResolvedValue(true)
      };

      window.IssueModal.setupIssueModalEventHandlers();

      reopenIssueBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async

      expect(document.getElementById('issue-state-badge').textContent).toBe('Open');
      expect(reopenIssueBtn.classList.contains('hidden')).toBe(true);
      expect(closeIssueBtn.classList.contains('hidden')).toBe(false);
      expect(document.getElementById('backlog').contains(taskElement)).toBe(true);
      expect(window.GitHubAPI.reopenGitHubIssue).toHaveBeenCalledWith('123');
    });

    test('should handle reopen issue without API', async () => {
      const taskElement = document.createElement('div');
      taskElement.setAttribute('data-issue-number', '123');
      document.body.appendChild(taskElement);

      window.IssueModal.setupIssueModalEventHandlers();

      reopenIssueBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async

      expect(console.log).toHaveBeenCalledWith('GitHub API not available, issue reopened locally only');
    });

    test('should handle reopen issue without issue number element', async () => {
      document.getElementById('issue-modal-number').remove();

      window.IssueModal.setupIssueModalEventHandlers();

      reopenIssueBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async

      // Should not crash
    });

    test('should handle add comment with empty text', async () => {
      document.getElementById('new-comment-text').value = '   ';
      
      window.IssueModal.setupIssueModalEventHandlers();

      addCommentBtn.click();
      
      expect(mockAlert).toHaveBeenCalledWith('Please enter a comment');
    });

    test('should handle add comment successfully', async () => {
      // Set issue number in modal
      document.getElementById('issue-modal-number').textContent = '#123';
      document.getElementById('new-comment-text').value = 'Test comment';
      
      // Mock loadAndDisplayComments
      window.loadAndDisplayComments = jest.fn().mockResolvedValue();
      
      window.GitHubAPI = {
        createGitHubIssueComment: jest.fn().mockResolvedValue({ id: 1, body: 'Test comment' })
      };

      window.IssueModal.setupIssueModalEventHandlers();

      await addCommentBtn.click();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 10));
      
      expect(document.getElementById('new-comment-text').value).toBe('');
      expect(window.GitHubAPI.createGitHubIssueComment).toHaveBeenCalledWith('123', 'Test comment');
    });

    test('should handle add comment API error', async () => {
      document.getElementById('new-comment-text').value = 'Test comment';
      
      window.GitHubAPI = {
        createGitHubIssueComment: jest.fn().mockRejectedValue(new Error('API Error'))
      };

      window.IssueModal.setupIssueModalEventHandlers();

      await addCommentBtn.click();
      
      expect(console.error).toHaveBeenCalledWith('Failed to add comment:', expect.any(Error));
    });

    test('should handle add comment without issue number element', async () => {
      document.getElementById('issue-modal-number').remove();
      document.getElementById('new-comment-text').value = 'Test comment';

      window.IssueModal.setupIssueModalEventHandlers();

      addCommentBtn.click();

      await new Promise(resolve => setTimeout(resolve, 0)); // Wait for async

      // Should not crash
    });

    test('should handle add comment with null response', async () => {
      document.getElementById('new-comment-text').value = 'Test comment';
      
      window.GitHubAPI = {
        createGitHubIssueComment: jest.fn().mockResolvedValue(null)
      };

      window.IssueModal.setupIssueModalEventHandlers();

      await addCommentBtn.click();
      
      // Should not call loadAndDisplayComments if comment is null
      expect(document.getElementById('new-comment-text').value).toBe('Test comment'); // Value not cleared
    });
  });

  describe('Helper Functions', () => {
    describe('getPriorityClasses', () => {
      test('should return base classes when no priority', () => {
        const result = window.getPriorityClasses();
        expect(result).toBe('task-priority inline-flex items-center px-2 py-1 rounded-full text-xs font-medium');
      });

      test('should return base classes when no getPriorityColor function', () => {
        delete window.getPriorityColor;
        const result = window.getPriorityClasses('High');
        expect(result).toBe('task-priority inline-flex items-center px-2 py-1 rounded-full text-xs font-medium');
      });

      test('should return combined classes when getPriorityColor exists', () => {
        window.getPriorityColor = jest.fn().mockReturnValue('bg-red-100 text-red-800');
        const result = window.getPriorityClasses('High');
        expect(result).toBe('task-priority inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800');
      });
    });

    describe('getCategoryClasses', () => {
      test('should return base classes when no category', () => {
        const result = window.getCategoryClasses();
        expect(result).toBe('task-category inline-flex items-center px-2 py-1 rounded-full text-xs font-medium');
      });

      test('should return base classes when no getCategoryColor function', () => {
        delete window.getCategoryColor;
        const result = window.getCategoryClasses('Frontend');
        expect(result).toBe('task-category inline-flex items-center px-2 py-1 rounded-full text-xs font-medium');
      });

      test('should return combined classes when getCategoryColor exists', () => {
        window.getCategoryColor = jest.fn().mockReturnValue('bg-blue-100 text-blue-800');
        const result = window.getCategoryClasses('Frontend');
        expect(result).toBe('task-category inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800');
      });
    });

    describe('loadAndDisplayComments', () => {
      beforeEach(() => {
        const commentsList = document.createElement('div');
        commentsList.id = 'comments-list';
        document.body.appendChild(commentsList);
      });

      test('should handle missing comments list element', async () => {
        document.getElementById('comments-list').remove();
        
        await expect(window.loadAndDisplayComments('123')).resolves.toBeUndefined();
      });

      test('should display loading state', async () => {
        window.GitHubAPI = {
          getGitHubIssueComments: jest.fn().mockImplementation(() => new Promise(() => {})) // Never resolves
        };

        window.loadAndDisplayComments('123');
        
        const commentsList = document.getElementById('comments-list');
        expect(commentsList.innerHTML).toContain('Loading comments...');
      });

      test('should display no comments message', async () => {
        window.GitHubAPI = {
          getGitHubIssueComments: jest.fn().mockResolvedValue([])
        };

        await window.loadAndDisplayComments('123');
        
        const commentsList = document.getElementById('comments-list');
        expect(commentsList.innerHTML).toContain('No comments yet');
      });

      test('should display comments', async () => {
        const mockComments = [
          {
            id: 1,
            body: 'Test comment',
            user: { login: 'testuser', avatar_url: 'http://example.com/avatar.png' },
            created_at: '2023-01-01T12:00:00Z'
          }
        ];

        window.GitHubAPI = {
          getGitHubIssueComments: jest.fn().mockResolvedValue(mockComments)
        };

        await window.loadAndDisplayComments('123');
        
        const commentsList = document.getElementById('comments-list');
        expect(commentsList.innerHTML).toContain('data-comment-id="1"');
        expect(commentsList.innerHTML).toContain('Test comment');
        expect(commentsList.innerHTML).toContain('testuser');
      });

      test('should display error message on API failure', async () => {
        window.GitHubAPI = {
          getGitHubIssueComments: jest.fn().mockRejectedValue(new Error('API Error'))
        };

        await window.loadAndDisplayComments('123');
        
        const commentsList = document.getElementById('comments-list');
        expect(commentsList.innerHTML).toContain('Failed to load comments');
        expect(console.error).toHaveBeenCalledWith('Failed to load comments:', expect.any(Error));
      });
    });

    describe('createCommentElement', () => {
      test('should create comment element with avatar', () => {
        const comment = {
          id: 1,
          body: 'Test comment',
          user: { login: 'testuser', avatar_url: 'http://example.com/avatar.png' },
          created_at: '2023-01-01T12:00:00Z'
        };

        const result = window.createCommentElement(comment);
        
        expect(result).toContain('data-comment-id="1"');
        expect(result).toContain('testuser');
        expect(result).toContain('Test comment');
        expect(result).toContain('http://example.com/avatar.png');
      });

      test('should create comment element without avatar', () => {
        const comment = {
          id: 1,
          body: 'Test comment',
          user: { login: 'testuser' },
          created_at: '2023-01-01T12:00:00Z'
        };

        const result = window.createCommentElement(comment);
        
        expect(result).toContain('fa-user');
        expect(result).not.toContain('http://');
      });

      test('should render markdown if GitHubUI available', () => {
        window.GitHubUI = {
          renderMarkdown: jest.fn().mockReturnValue('<p>Rendered markdown</p>')
        };

        const comment = {
          id: 1,
          body: '**Bold text**',
          user: { login: 'testuser' },
          created_at: '2023-01-01T12:00:00Z'
        };

        const result = window.createCommentElement(comment);
        
        expect(result).toContain('<p>Rendered markdown</p>');
        expect(window.GitHubUI.renderMarkdown).toHaveBeenCalledWith('**Bold text**');
      });
    });

    describe('getTimeAgo', () => {
      beforeEach(() => {
        // Mock Date constructor to return a fixed time for new Date() calls
        const RealDate = Date;
        const mockCurrentTime = new Date('2023-01-01T12:00:00Z').getTime();
        
        global.Date = class extends RealDate {
          constructor(...args) {
            if (args.length === 0) {
              // new Date() with no arguments should return our mock time
              super(mockCurrentTime);
            } else {
              // new Date(string) should work normally
              super(...args);
            }
          }
          
          static now() {
            return mockCurrentTime;
          }
        };
        
        // Ensure getTimeAgo is available
        const issueModalModule = require('../src/issue-modal.js');
        if (issueModalModule && issueModalModule.getTimeAgo && !window.getTimeAgo) {
          window.getTimeAgo = issueModalModule.getTimeAgo;
        }
      });

      test('should return "just now" for recent dates', () => {
        const date = new Date('2023-01-01T11:59:30Z'); // 30 seconds ago
        expect(window.getTimeAgo(date)).toBe('just now');
      });

      test('should return minutes for recent times', () => {
        const date = new Date('2023-01-01T11:55:00Z'); // 5 minutes ago
        expect(window.getTimeAgo(date)).toBe('5 minutes ago');
      });

      test('should return singular minute', () => {
        const date = new Date('2023-01-01T11:59:00Z'); // 1 minute ago
        expect(window.getTimeAgo(date)).toBe('1 minute ago');
      });

      test('should return hours for times within a day', () => {
        const date = new Date('2023-01-01T10:00:00Z'); // 2 hours ago
        expect(window.getTimeAgo(date)).toBe('2 hours ago');
      });

      test('should return singular hour', () => {
        const date = new Date('2023-01-01T11:00:00Z'); // 1 hour ago
        expect(window.getTimeAgo(date)).toBe('1 hour ago');
      });

      test('should return days for times within a week', () => {
        const date = new Date('2022-12-30T12:00:00Z'); // 2 days ago
        expect(window.getTimeAgo(date)).toBe('2 days ago');
      });

      test('should return singular day', () => {
        const date = new Date('2022-12-31T12:00:00Z'); // 1 day ago
        expect(window.getTimeAgo(date)).toBe('1 day ago');
      });

      test('should return formatted date for older times', () => {
        const date = new Date('2022-12-01T12:00:00Z'); // More than a week ago
        const result = window.getTimeAgo(date);
        expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/); // Date format like 12/1/2022
      });
    });
  });
}); 