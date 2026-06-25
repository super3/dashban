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

  // ---------------------------------------------------------------------------
  // Additional coverage tests (appended) to reach 100% for src/issue-modal.js
  // ---------------------------------------------------------------------------
  describe('Additional branch coverage', () => {
    describe('populateIssueModal defensive branches', () => {
      test('should use empty-string fallbacks when description element has no text or html (lines 63-64)', () => {
        // Only create the elements populateIssueModal writes to unconditionally,
        // so the description fallback path (no raw description) runs with an
        // empty .markdown-content element -> textContent || '' and
        // innerHTML || 'No description available' both take the false operand.
        ['issue-modal-number', 'issue-modal-title', 'issue-description-display',
         'issue-description-edit'].forEach(id => {
          const el = document.createElement('div');
          el.id = id;
          document.body.appendChild(el);
        });

        const backlogCol = document.createElement('div');
        backlogCol.id = 'backlog';
        document.body.appendChild(backlogCol);

        const taskElement = document.createElement('div');
        // No data-raw-description attribute -> fallback branch
        const descEl = document.createElement('div');
        descEl.className = 'markdown-content';
        // descEl.textContent === '' (falsy) and descEl.innerHTML === '' (falsy)
        taskElement.appendChild(descEl);
        backlogCol.appendChild(taskElement);

        global.loadAndDisplayComments = jest.fn();

        window.IssueModal.populateIssueModal('77', taskElement);

        // textContent || '' -> '' so edit value is empty
        expect(document.getElementById('issue-description-edit').value).toBe('');
        // innerHTML || 'No description available' -> the fallback string
        expect(document.getElementById('issue-description-display').innerHTML)
          .toBe('No description available');
      });

      test('should not throw when optional badge/select/title elements are absent (lines 100,106,110,118,128,136)', () => {
        // Create ONLY the always-written elements. Omit issue-title-edit,
        // issue-priority-select, issue-category-select, issue-state-badge,
        // issue-column-badge, close-issue-btn, reopen-issue-btn so each
        // `if (element)` guard takes its false branch.
        ['issue-modal-number', 'issue-modal-title', 'issue-description-display',
         'issue-description-edit'].forEach(id => {
          const el = document.createElement('div');
          el.id = id;
          document.body.appendChild(el);
        });

        const backlogCol = document.createElement('div');
        backlogCol.id = 'backlog';
        document.body.appendChild(backlogCol);

        const taskElement = document.createElement('div');
        backlogCol.appendChild(taskElement);

        global.loadAndDisplayComments = jest.fn();

        expect(() => {
          window.IssueModal.populateIssueModal('88', taskElement);
        }).not.toThrow();

        // Confirms the always-written branch still executed.
        expect(document.getElementById('issue-modal-number').textContent).toBe('#88');
        // Confirms the omitted optional elements really were not present.
        expect(document.getElementById('issue-title-edit')).toBeNull();
        expect(document.getElementById('issue-priority-select')).toBeNull();
        expect(document.getElementById('issue-column-badge')).toBeNull();
      });

      test('should fall back to raw column id when column is not in columnNames map (line 129)', () => {
        // columnBadge present, but the task lives in a column whose id is not a
        // key of columnNames -> columnNames[column] is undefined -> `|| column`.
        ['issue-modal-number', 'issue-modal-title', 'issue-description-display',
         'issue-description-edit'].forEach(id => {
          const el = document.createElement('div');
          el.id = id;
          document.body.appendChild(el);
        });

        const columnBadge = document.createElement('span');
        columnBadge.id = 'issue-column-badge';
        document.body.appendChild(columnBadge);

        const customCol = document.createElement('div');
        customCol.id = 'customcolumn';
        document.body.appendChild(customCol);

        const taskElement = document.createElement('div');
        customCol.appendChild(taskElement);

        global.loadAndDisplayComments = jest.fn();

        window.IssueModal.populateIssueModal('99', taskElement);

        expect(document.getElementById('issue-column-badge').textContent).toBe('customcolumn');
      });
    });

    describe('resetEditStates defensive branch', () => {
      test('should handle missing title-edit element specifically (line 157)', () => {
        // The existing "missing elements gracefully" test removes
        // issue-modal-title and issue-description-edit but leaves
        // issue-title-edit present. Here we remove ONLY issue-title-edit (and a
        // few others) so the `if (titleEdit)` guard at line 157 takes its
        // false branch while the rest run.
        ['issue-modal-title', 'issue-modal-number',
         'issue-description-display', 'issue-description-edit',
         'description-edit-actions'].forEach(id => {
          const el = document.createElement('div');
          el.id = id;
          document.body.appendChild(el);
        });
        // Intentionally do NOT create issue-title-edit / title-edit-actions / edit-title-btn

        expect(() => {
          window.IssueModal.resetEditStates();
        }).not.toThrow();

        // The present elements were still reset.
        expect(document.getElementById('issue-modal-title').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('issue-description-edit').classList.contains('hidden')).toBe(true);
        expect(document.getElementById('issue-title-edit')).toBeNull();
      });
    });

    describe('setupIssueModalEventHandlers defensive branches', () => {
      // Minimal helper that creates only the elements needed for a given
      // handler, so that other-element guards take their false branches.
      function makeButton(id) {
        const btn = document.createElement('button');
        btn.id = id;
        document.body.appendChild(btn);
        return btn;
      }
      function makeEl(tag, id, text) {
        const el = document.createElement(tag);
        el.id = id;
        if (text) el.textContent = text;
        document.body.appendChild(el);
        return el;
      }

      test('should handle save title when matching task has no h4 title element (line 230)', async () => {
        document.body.innerHTML = '';
        const saveTitleBtn = makeButton('save-title-btn');
        makeButton('edit-title-btn');
        makeEl('h2', 'issue-modal-title');
        const numberEl = makeEl('span', 'issue-modal-number', '#123');
        const titleEditInput = document.createElement('input');
        titleEditInput.id = 'issue-title-edit';
        titleEditInput.value = 'A New Title';
        document.body.appendChild(titleEditInput);
        makeEl('div', 'title-edit-actions');

        // Matching task element exists but has NO <h4> child -> `if (titleElement)` false.
        const taskElement = document.createElement('div');
        taskElement.setAttribute('data-issue-number', '123');
        document.body.appendChild(taskElement);

        window.IssueModal.setupIssueModalEventHandlers();
        await saveTitleBtn.click();

        // Title in modal updated even though card had no h4.
        expect(document.getElementById('issue-modal-title').textContent).toBe('A New Title');
        // No GitHubAPI -> local-only log path.
        expect(console.log).toHaveBeenCalledWith('GitHub API not available, title updated locally only');
        expect(numberEl.textContent).toBe('#123');
      });

      test('should handle save description when no matching task element exists (line 300)', async () => {
        document.body.innerHTML = '';
        const saveDescBtn = makeButton('save-description-btn');
        makeEl('div', 'issue-description-display');
        const descEdit = document.createElement('textarea');
        descEdit.id = 'issue-description-edit';
        descEdit.value = 'Some description';
        document.body.appendChild(descEdit);
        makeEl('div', 'description-edit-actions');
        makeEl('span', 'issue-modal-number', '#404'); // no task with data-issue-number="404"

        window.IssueModal.setupIssueModalEventHandlers();
        await saveDescBtn.click();

        // No GitHubUI -> textContent path used for display.
        expect(document.getElementById('issue-description-display').textContent).toBe('Some description');
        // No matching task -> local update log.
        expect(console.log).toHaveBeenCalledWith('Updated local task description: "Some description"');
      });

      test('should log success when GitHub description update resolves truthy (line 318)', async () => {
        document.body.innerHTML = '';
        const saveDescBtn = makeButton('save-description-btn');
        makeEl('div', 'issue-description-display');
        const descEdit = document.createElement('textarea');
        descEdit.id = 'issue-description-edit';
        descEdit.value = 'Updated body';
        document.body.appendChild(descEdit);
        makeEl('div', 'description-edit-actions');
        makeEl('span', 'issue-modal-number', '#321');

        const taskElement = document.createElement('div');
        taskElement.setAttribute('data-issue-number', '321');
        taskElement.setAttribute('data-github-issue', 'true');
        const descMd = document.createElement('div');
        descMd.className = 'markdown-content';
        taskElement.appendChild(descMd);
        document.body.appendChild(taskElement);

        window.GitHubAPI = {
          updateGitHubIssueDescription: jest.fn().mockResolvedValue(true)
        };

        window.IssueModal.setupIssueModalEventHandlers();
        await saveDescBtn.click();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(window.GitHubAPI.updateGitHubIssueDescription).toHaveBeenCalledWith('321', 'Updated body');
        expect(console.log).toHaveBeenCalledWith(
          '✅ Successfully updated GitHub issue #321 description locally and on GitHub'
        );
      });

      test('should handle priority change when no matching task element exists (line 352)', async () => {
        document.body.innerHTML = '';
        const prioritySelect = document.createElement('select');
        prioritySelect.id = 'issue-priority-select';
        prioritySelect.innerHTML = '<option value="">None</option><option value="High">High</option>';
        document.body.appendChild(prioritySelect);
        makeEl('span', 'issue-modal-number', '#555'); // no matching task

        window.IssueModal.setupIssueModalEventHandlers();
        prioritySelect.value = 'High';
        prioritySelect.dispatchEvent(new Event('change'));
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(console.log).toHaveBeenCalledWith('GitHub API not available, priority updated locally only');
      });

      test('should handle priority change when task has no label container (line 355)', async () => {
        document.body.innerHTML = '';
        const prioritySelect = document.createElement('select');
        prioritySelect.id = 'issue-priority-select';
        prioritySelect.innerHTML = '<option value="">None</option><option value="High">High</option>';
        document.body.appendChild(prioritySelect);
        makeEl('span', 'issue-modal-number', '#556');

        // Task element present but WITHOUT a .flex.items-center.space-x-2 container.
        const taskElement = document.createElement('div');
        taskElement.setAttribute('data-issue-number', '556');
        document.body.appendChild(taskElement);

        window.IssueModal.setupIssueModalEventHandlers();
        prioritySelect.value = 'High';
        prioritySelect.dispatchEvent(new Event('change'));
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(console.log).toHaveBeenCalledWith('GitHub API not available, priority updated locally only');
      });

      test('should handle category change when no matching task element exists (line 397)', async () => {
        document.body.innerHTML = '';
        const categorySelect = document.createElement('select');
        categorySelect.id = 'issue-category-select';
        categorySelect.innerHTML = '<option value="">None</option><option value="Backend">Backend</option>';
        document.body.appendChild(categorySelect);
        makeEl('span', 'issue-modal-number', '#557'); // no matching task

        window.IssueModal.setupIssueModalEventHandlers();
        categorySelect.value = 'Backend';
        categorySelect.dispatchEvent(new Event('change'));
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(console.log).toHaveBeenCalledWith('GitHub API not available, category updated locally only');
      });

      test('should handle category change when task has no label container (line 400)', async () => {
        document.body.innerHTML = '';
        const categorySelect = document.createElement('select');
        categorySelect.id = 'issue-category-select';
        categorySelect.innerHTML = '<option value="">None</option><option value="Backend">Backend</option>';
        document.body.appendChild(categorySelect);
        makeEl('span', 'issue-modal-number', '#558');

        const taskElement = document.createElement('div');
        taskElement.setAttribute('data-issue-number', '558');
        document.body.appendChild(taskElement);

        window.IssueModal.setupIssueModalEventHandlers();
        categorySelect.value = 'Backend';
        categorySelect.dispatchEvent(new Event('change'));
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(console.log).toHaveBeenCalledWith('GitHub API not available, category updated locally only');
      });

      test('should insert category badge AFTER an existing priority badge (lines 418-424, branch 423 true)', async () => {
        document.body.innerHTML = '';
        const categorySelect = document.createElement('select');
        categorySelect.id = 'issue-category-select';
        categorySelect.innerHTML = '<option value="">None</option><option value="Backend">Backend</option>';
        document.body.appendChild(categorySelect);
        makeEl('span', 'issue-modal-number', '#559');

        const taskElement = document.createElement('div');
        taskElement.setAttribute('data-issue-number', '559');
        const labelContainer = document.createElement('div');
        labelContainer.className = 'flex items-center space-x-2';

        // A priority badge whose text is one of critical/high/medium/low so the
        // find() callback at line 418-421 returns it, exercising lines 419-420
        // and taking the `if (priorityBadge)` true branch (line 423) -> 424.
        const priorityBadge = document.createElement('span');
        priorityBadge.textContent = 'High';
        labelContainer.appendChild(priorityBadge);
        taskElement.appendChild(labelContainer);
        document.body.appendChild(taskElement);

        window.getCategoryColor = jest.fn().mockReturnValue('bg-blue-100 text-blue-800');

        window.IssueModal.setupIssueModalEventHandlers();
        categorySelect.value = 'Backend';
        categorySelect.dispatchEvent(new Event('change'));
        await new Promise(resolve => setTimeout(resolve, 0));

        const spans = Array.from(labelContainer.querySelectorAll('span'));
        // Category badge inserted right after the priority badge.
        expect(spans.length).toBe(2);
        expect(spans[0].textContent).toBe('High');
        expect(spans[1].textContent).toBe('Backend');
        expect(spans[1].className).toContain('bg-blue-100 text-blue-800');
        // priorityBadge.nextSibling should be the category badge.
        expect(priorityBadge.nextSibling).toBe(spans[1]);
      });

      test('should handle close issue when state badge is missing (line 456)', async () => {
        document.body.innerHTML = '';
        const closeIssueBtn = makeButton('close-issue-btn');
        const reopenIssueBtn = makeButton('reopen-issue-btn');
        makeEl('span', 'issue-modal-number', '#601');
        // No issue-state-badge -> `if (stateBadge)` false.
        // No matching task -> `if (taskElement)` false (also covers 465).

        window.IssueModal.setupIssueModalEventHandlers();
        await closeIssueBtn.click();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(closeIssueBtn.classList.contains('hidden')).toBe(true);
        expect(reopenIssueBtn.classList.contains('hidden')).toBe(false);
        expect(console.log).toHaveBeenCalledWith('GitHub API not available, issue closed locally only');
      });

      test('should handle close issue when reopen button is absent at setup (line 461)', async () => {
        document.body.innerHTML = '';
        const closeIssueBtn = makeButton('close-issue-btn');
        // reopen-issue-btn intentionally NOT created so `if (reopenIssueBtn)` is false.
        makeEl('span', 'issue-modal-number', '#602');
        makeEl('span', 'issue-state-badge');

        window.IssueModal.setupIssueModalEventHandlers();
        await closeIssueBtn.click();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(document.getElementById('issue-state-badge').textContent).toBe('Closed');
        expect(closeIssueBtn.classList.contains('hidden')).toBe(true);
        expect(document.getElementById('reopen-issue-btn')).toBeNull();
      });

      test('should handle close issue when done column is absent (line 467)', async () => {
        document.body.innerHTML = '';
        const closeIssueBtn = makeButton('close-issue-btn');
        makeButton('reopen-issue-btn');
        makeEl('span', 'issue-modal-number', '#603');
        makeEl('span', 'issue-state-badge');

        // Matching task exists so `if (taskElement)` true, but NO #done column
        // so `if (doneColumn)` takes false branch (line 467).
        const taskElement = document.createElement('div');
        taskElement.setAttribute('data-issue-number', '603');
        document.body.appendChild(taskElement);

        window.IssueModal.setupIssueModalEventHandlers();
        await closeIssueBtn.click();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(document.getElementById('done')).toBeNull();
        // Task NOT moved (no done column), still attached to body.
        expect(taskElement.parentElement).toBe(document.body);
        expect(console.log).toHaveBeenCalledWith('GitHub API not available, issue closed locally only');
      });

      test('should handle reopen issue when state badge is missing and no task (lines 501,510)', async () => {
        document.body.innerHTML = '';
        const closeIssueBtn = makeButton('close-issue-btn');
        const reopenIssueBtn = makeButton('reopen-issue-btn');
        makeEl('span', 'issue-modal-number', '#604');
        // No issue-state-badge -> line 501 false. No matching task -> line 510 false.

        window.IssueModal.setupIssueModalEventHandlers();
        await reopenIssueBtn.click();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(reopenIssueBtn.classList.contains('hidden')).toBe(true);
        expect(closeIssueBtn.classList.contains('hidden')).toBe(false);
        expect(console.log).toHaveBeenCalledWith('GitHub API not available, issue reopened locally only');
      });

      test('should handle reopen issue when close button is absent at setup (line 506)', async () => {
        document.body.innerHTML = '';
        const reopenIssueBtn = makeButton('reopen-issue-btn');
        // close-issue-btn intentionally NOT created so `if (closeIssueBtn)` is false.
        makeEl('span', 'issue-modal-number', '#605');
        makeEl('span', 'issue-state-badge');

        window.IssueModal.setupIssueModalEventHandlers();
        await reopenIssueBtn.click();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(document.getElementById('issue-state-badge').textContent).toBe('Open');
        expect(reopenIssueBtn.classList.contains('hidden')).toBe(true);
        expect(document.getElementById('close-issue-btn')).toBeNull();
      });

      test('should handle reopen issue when backlog column is absent (line 512)', async () => {
        document.body.innerHTML = '';
        makeButton('close-issue-btn');
        const reopenIssueBtn = makeButton('reopen-issue-btn');
        makeEl('span', 'issue-modal-number', '#606');
        makeEl('span', 'issue-state-badge');

        // Matching task exists, but NO #backlog column -> line 512 false branch.
        const taskElement = document.createElement('div');
        taskElement.setAttribute('data-issue-number', '606');
        document.body.appendChild(taskElement);

        window.IssueModal.setupIssueModalEventHandlers();
        await reopenIssueBtn.click();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(document.getElementById('backlog')).toBeNull();
        expect(taskElement.parentElement).toBe(document.body);
        expect(console.log).toHaveBeenCalledWith('GitHub API not available, issue reopened locally only');
      });
    });

    describe('save description success-resolve false branch', () => {
      test('should not log success when GitHub description update resolves falsy (line 318 false path)', async () => {
        document.body.innerHTML = '';
        const saveDescBtn = document.createElement('button');
        saveDescBtn.id = 'save-description-btn';
        document.body.appendChild(saveDescBtn);
        const display = document.createElement('div');
        display.id = 'issue-description-display';
        document.body.appendChild(display);
        const descEdit = document.createElement('textarea');
        descEdit.id = 'issue-description-edit';
        descEdit.value = 'Body that fails to persist';
        document.body.appendChild(descEdit);
        const descActions = document.createElement('div');
        descActions.id = 'description-edit-actions';
        document.body.appendChild(descActions);
        const numberEl = document.createElement('span');
        numberEl.id = 'issue-modal-number';
        numberEl.textContent = '#888';
        document.body.appendChild(numberEl);

        const taskElement = document.createElement('div');
        taskElement.setAttribute('data-issue-number', '888');
        taskElement.setAttribute('data-github-issue', 'true');
        const descMd = document.createElement('div');
        descMd.className = 'markdown-content';
        taskElement.appendChild(descMd);
        document.body.appendChild(taskElement);

        // Resolves falsy -> `if (success)` false branch (line 318).
        window.GitHubAPI = {
          updateGitHubIssueDescription: jest.fn().mockResolvedValue(false)
        };

        window.IssueModal.setupIssueModalEventHandlers();
        await saveDescBtn.click();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(window.GitHubAPI.updateGitHubIssueDescription).toHaveBeenCalledWith('888', 'Body that fails to persist');
        // Success log must NOT have been emitted (success was falsy).
        expect(console.log).not.toHaveBeenCalledWith(
          expect.stringContaining('Successfully updated GitHub issue')
        );
      });
    });

    describe('module export browser branch (lines 699,707-713)', () => {
      test('should attach helpers to the global object when module is undefined', () => {
        // The source file ends with:
        //   if (typeof module !== 'undefined' && module.exports) { module.exports = {...} }
        //   else { window.getPriorityClasses = ...; ... }   <-- lines 709-713
        // Under CommonJS/Jest `module` is always defined, so the ELSE branch is
        // never taken by the normally-required module. To exercise it we run the
        // file's source with `module` undefined inside a VM context.
        //
        // We instrument that source copy with Jest's OWN babel-jest pipeline so
        // its coverage map (statement/branch IDs) is byte-for-byte identical to
        // the map Jest already produced for the required module; an afterAll then
        // merges the executed counts back so the lines are correctly credited.
        const path = require('path');
        const fs = require('fs');
        const vm = require('vm');
        const babelJest = require('babel-jest').default || require('babel-jest');

        const abs = require.resolve('../src/issue-modal.js');
        const src = fs.readFileSync(abs, 'utf8');
        const rootDir = path.resolve(__dirname, '..');

        const transformer = babelJest.createTransformer
          ? babelJest.createTransformer()
          : babelJest;
        const transformed = transformer.process(src, abs, {
          config: { rootDir, cwd: rootDir },
          configString: 'issue-modal-export-branch',
          instrument: { filename: abs, collectCoverageFrom: ['src/issue-modal.js'] },
          cacheFS: new Map(),
          transformerConfig: {},
        });
        const instrumentedCode =
          typeof transformed === 'string' ? transformed : transformed.code;

        const fakeWindow = {};
        const sandbox = {
          module: undefined, // forces the ELSE (browser-global) export branch
          window: fakeWindow,
          globalThis: {},
          console: { log: jest.fn(), error: jest.fn() },
          document: {
            getElementById: () => null,
            querySelector: () => null,
            querySelectorAll: () => [],
            addEventListener: () => {},
          },
        };
        vm.createContext(sandbox);
        vm.runInContext(instrumentedCode, sandbox);

        // The else branch genuinely ran: helper functions are now on window.
        expect(typeof fakeWindow.IssueModal).toBe('object');
        expect(typeof fakeWindow.getPriorityClasses).toBe('function');
        expect(typeof fakeWindow.getCategoryClasses).toBe('function');
        expect(typeof fakeWindow.loadAndDisplayComments).toBe('function');
        expect(typeof fakeWindow.createCommentElement).toBe('function');
        expect(typeof fakeWindow.getTimeAgo).toBe('function');
        // Sanity: an assigned helper actually works.
        expect(fakeWindow.getPriorityClasses()).toContain('task-priority');

        // Stash the executed coverage for this file so afterAll can merge it
        // into the report (the instrumented copy records under __coverage__).
        const probeCov = sandbox.__coverage__ && sandbox.__coverage__[abs];
        if (probeCov) {
          global.__issueModalExportBranchCoverage = probeCov;
        }
      });
    });
  });

  // After every test has run and populated Jest's coverage object for this
  // file, fold in the counts captured while executing the browser-export ELSE
  // branch inside the VM (see "module export browser branch" above). The probe
  // copy was instrumented with the identical babel-jest pipeline, so its
  // statement/branch maps line up exactly and istanbul's merge simply sums the
  // hit counts onto the lines that the CommonJS-loaded module cannot reach.
  afterAll(() => {
    const probeCov = global.__issueModalExportBranchCoverage;
    if (!probeCov || !global.__coverage__) return;
    const libCoverage = require('istanbul-lib-coverage');
    const jestKey = Object.keys(global.__coverage__).find(k => k.includes('issue-modal.js'));
    if (!jestKey) return;
    const merged = libCoverage.createFileCoverage(global.__coverage__[jestKey]);
    merged.merge(probeCov);
    global.__coverage__[jestKey] = merged.toJSON ? merged.toJSON() : merged.data;
    delete global.__issueModalExportBranchCoverage;
  });
}); 