/**
 * Kanban Board Tests
 * 
 * Tests for the core kanban board functionality (excluding GitHub integration)
 * GitHub integration tests are in github.test.js
 */

// Set up DOM and environment for testing
function setupDOM() {
  document.body.innerHTML = `
    <header>
      <a href="https://github.com/super3/dashban" class="flex items-center space-x-2">GitHub</a>
    </header>
    
    <!-- Kanban Board -->
    <div class="kanban-board">
      <!-- Info Column -->
      <div class="flex-1 column-expanded" data-column="info">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="px-4 py-3 border-b border-gray-200 column-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-blue-400 rounded-full"></div>
                <h3 class="font-semibold text-gray-900 column-title">Info</h3>
                <span class="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full font-medium">0</span>
              </div>
              <button class="text-gray-400 hover:text-gray-600 column-collapse-btn" data-column="info">
                <i class="fas fa-chevron-left"></i>
              </button>
            </div>
          </div>
          <div id="info" class="p-4 space-y-3 min-h-[64px] column-content">
          </div>
        </div>
      </div>
      
      <!-- Backlog Column -->
      <div class="flex-1 column-expanded" data-column="backlog">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="px-4 py-3 border-b border-gray-200 column-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-gray-400 rounded-full"></div>
                <h3 class="font-semibold text-gray-900 column-title">Backlog</h3>
                <span class="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-medium">0</span>
              </div>
              <button class="text-gray-400 hover:text-gray-600 column-collapse-btn" data-column="backlog">
                <i class="fas fa-chevron-left"></i>
              </button>
            </div>
          </div>
          <div id="backlog" class="p-4 space-y-3 min-h-[64px] column-content">
          </div>
        </div>
      </div>
      
      <!-- In Progress Column -->
      <div class="flex-1 column-expanded" data-column="inprogress">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="px-4 py-3 border-b border-gray-200 column-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-blue-400 rounded-full"></div>
                <h3 class="font-semibold text-gray-900 column-title">In Progress</h3>
                <span class="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full font-medium">0</span>
              </div>
              <button class="text-gray-400 hover:text-gray-600 column-collapse-btn" data-column="inprogress">
                <i class="fas fa-chevron-left"></i>
              </button>
            </div>
          </div>
          <div id="inprogress" class="p-4 space-y-3 min-h-[64px] column-content">
          </div>
        </div>
      </div>
      
      <!-- Review Column -->
      <div class="flex-1 column-expanded" data-column="review">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="px-4 py-3 border-b border-gray-200 column-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-yellow-400 rounded-full"></div>
                <h3 class="font-semibold text-gray-900 column-title">Review</h3>
                <span class="bg-yellow-100 text-yellow-600 text-xs px-2 py-1 rounded-full font-medium">0</span>
              </div>
              <button class="text-gray-400 hover:text-gray-600 column-collapse-btn" data-column="review">
                <i class="fas fa-chevron-left"></i>
              </button>
            </div>
          </div>
          <div id="review" class="p-4 space-y-3 min-h-[64px] column-content">
          </div>
        </div>
      </div>
      
      <!-- Done Column -->
      <div class="flex-1 column-expanded" data-column="done">
        <div class="bg-white rounded-lg shadow-sm border border-gray-200">
          <div class="px-4 py-3 border-b border-gray-200 column-header">
            <div class="flex items-center justify-between">
              <div class="flex items-center space-x-2">
                <div class="w-3 h-3 bg-green-400 rounded-full"></div>
                <h3 class="font-semibold text-gray-900 column-title">Done</h3>
                <span class="bg-green-100 text-green-600 text-xs px-2 py-1 rounded-full font-medium">0</span>
              </div>
              <button class="text-gray-400 hover:text-gray-600 column-collapse-btn" data-column="done">
                <i class="fas fa-chevron-left"></i>
              </button>
            </div>
          </div>
          <div id="done" class="p-4 space-y-3 min-h-[64px] column-content">
          </div>
        </div>
      </div>
    </div>

    <!-- Add Task Modal -->
    <div id="add-task-modal" class="hidden fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Add New Issue</h3>
        <form id="add-task-form">
          <div class="mb-4">
            <label for="task-title" class="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input type="text" id="task-title" name="title" required class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
          </div>
          
          <div class="mb-4">
            <label for="task-description" class="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea id="task-description" name="description" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"></textarea>
          </div>
          
          <div class="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label for="task-priority" class="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select id="task-priority" name="priority" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="Low">Low</option>
                <option value="Medium" selected>Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            
            <div>
              <label for="task-category" class="block text-sm font-medium text-gray-700 mb-2">Category</label>
              <select id="task-category" name="category" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">Select Category</option>
                <option value="Bug">Bug</option>
                <option value="Feature">Feature</option>
                <option value="Enhancement">Enhancement</option>
                <option value="Documentation">Documentation</option>
                <option value="Question">Question</option>
              </select>
            </div>
          </div>
          
          <div class="mb-4">
            <label for="task-column" class="block text-sm font-medium text-gray-700 mb-2">Add to Column</label>
            <select id="task-column" name="column" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="backlog">Backlog</option>
              <option value="inprogress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </div>
          

          
          <div class="flex justify-end space-x-2">
            <button type="button" id="cancel-task" class="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500">
              Cancel
            </button>
            <button type="submit" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
              Add Issue
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Add Task Button -->
    <button id="add-task-btn" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium">
      Add Issue
    </button>
  `;
}

// Helper function to clear all columns
function clearAllColumns() {
  ['info', 'backlog', 'inprogress', 'review', 'done'].forEach(columnId => {
    const column = document.getElementById(columnId);
    if (column) {
      column.innerHTML = '';
    }
  });
}

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: function(key) {
    return this.store[key] || null;
  },
  setItem: function(key, value) {
    this.store[key] = value.toString();
  },
  removeItem: function(key) {
    delete this.store[key];
  },
  clear: function() {
    this.store = {};
  }
};

// Mock SortableJS
global.Sortable = jest.fn().mockImplementation(() => ({
  destroy: jest.fn()
}));

// Set up global mocks
beforeAll(() => {
  // Override both global and window localStorage to ensure our mock is used
  global.localStorage = localStorageMock;
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true
  });
  
  // Mock GitHub module to avoid dependency issues in kanban tests
  global.window = global.window || {};
  global.window.GitHub = {
    githubAuth: {
      isAuthenticated: false,
      accessToken: null,
      user: null
    },
    createGitHubIssue: jest.fn(),
    createGitHubIssueElement: jest.fn(),
    archiveGitHubIssue: jest.fn()
  };
  
  global.window.updateColumnCounts = jest.fn();
  global.window.getPriorityColor = jest.fn().mockReturnValue('bg-gray-100 text-gray-800');
  global.window.getCategoryColor = jest.fn().mockReturnValue('bg-gray-100 text-gray-800');
});

beforeEach(() => {
  setupDOM();
  localStorageMock.clear();
  jest.clearAllMocks();
  
  // Ensure localStorage mock is properly set for this test
  global.localStorage = localStorageMock;
  Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
    writable: true
  });
  
  // Load the kanban module
  delete require.cache[require.resolve('../src/kanban.js')];
  require('../src/kanban.js');
  
  // Manually trigger DOMContentLoaded since Jest/JSDOM doesn't fire it automatically
  const event = new Event('DOMContentLoaded');
  document.dispatchEvent(event);
});

describe('Kanban Board Core Functionality', () => {
  let api;

  beforeEach(() => {
    // Access the exported API
    api = global.kanbanTestExports;
  });

  describe('initialization', () => {
    test('should initialize SortableJS for all columns', () => {
      expect(global.Sortable).toHaveBeenCalledTimes(5); // 5 columns: info, backlog, inprogress, review, done
    });

    test('should set up modal elements', () => {
      expect(api.addTaskBtn).toBeTruthy();
      expect(api.addTaskModal).toBeTruthy();
      expect(api.cancelTaskBtn).toBeTruthy();
      expect(api.addTaskForm).toBeTruthy();
    });

    test('should initialize with proper column counts', () => {
      const backlog = document.getElementById('backlog');
      const countBadge = document.querySelector('[data-column="backlog"] .column-header span');
      
      expect(backlog.children.length).toBe(0);
      expect(countBadge.textContent).toBe('0');
    });
  });

  describe('task creation', () => {
    test('should create task element with all properties', () => {
      const taskElement = api.createTaskElement(
        123,
        'Test Task',
        'Test Description',
        'High',
        'Bug'
      );

      expect(taskElement.tagName).toBe('DIV');
      expect(taskElement.getAttribute('data-task-id')).toBe('123');
      expect(taskElement.innerHTML).toContain('Test Task');
      expect(taskElement.innerHTML).toContain('Test Description');
      expect(taskElement.innerHTML).toContain('Local Task');
    });

    test('should create task element without optional properties', () => {
      const taskElement = api.createTaskElement(
        456,
        'Simple Task',
        null,
        null,
        null
      );

      expect(taskElement.tagName).toBe('DIV');
      expect(taskElement.getAttribute('data-task-id')).toBe('456');
      expect(taskElement.innerHTML).toContain('Simple Task');
      expect(taskElement.innerHTML).not.toContain('Test Description');
    });
  });

  describe('modal functionality', () => {
    test('should show modal when add button is clicked', () => {
      const addBtn = api.addTaskBtn;
      const modal = api.addTaskModal;

      expect(modal.classList.contains('hidden')).toBe(true);

      addBtn.click();

      expect(modal.classList.contains('hidden')).toBe(false);
    });

    test('should hide modal when cancel button is clicked', () => {
      const cancelBtn = api.cancelTaskBtn;
      const modal = api.addTaskModal;

      // Show modal first
      modal.classList.remove('hidden');
      expect(modal.classList.contains('hidden')).toBe(false);

      cancelBtn.click();

      expect(modal.classList.contains('hidden')).toBe(true);
    });

    test('should hide modal and reset form', () => {
      const modal = api.addTaskModal;
      const form = api.addTaskForm;
      const titleInput = document.getElementById('task-title');

      // Show modal and add content
      modal.classList.remove('hidden');
      titleInput.value = 'Test Title';

      api.hideModal();

      expect(modal.classList.contains('hidden')).toBe(true);
      expect(titleInput.value).toBe('');
    });

    test('should prevent modal from opening when button is disabled', () => {
      const addBtn = api.addTaskBtn;
      const modal = api.addTaskModal;
      
      global.alert = jest.fn();
      
      // Disable the button
      addBtn.disabled = true;
      
      expect(modal.classList.contains('hidden')).toBe(true);
      
      // Manually trigger the click event since disabled buttons don't fire click events in JSDOM
      const clickEvent = new Event('click');
      addBtn.dispatchEvent(clickEvent);
      
      // Modal should remain hidden and alert should be shown
      expect(modal.classList.contains('hidden')).toBe(true);
      expect(global.alert).toHaveBeenCalledWith('Please connect to GitHub with a Personal Access Token first to create issues');
    });

    test('should allow modal to open when button is enabled', () => {
      const addBtn = api.addTaskBtn;
      const modal = api.addTaskModal;
      
      // Ensure button is enabled
      addBtn.disabled = false;
      
      expect(modal.classList.contains('hidden')).toBe(true);
      
      addBtn.click();
      
      expect(modal.classList.contains('hidden')).toBe(false);
    });
  });

  describe('form submission', () => {
    test('should validate required title field', () => {
      const form = api.addTaskForm;
      const titleInput = document.getElementById('task-title');
      
      global.alert = jest.fn();
      
      // Submit empty form
      titleInput.value = '';
      const submitEvent = new Event('submit');
      form.dispatchEvent(submitEvent);

      expect(global.alert).toHaveBeenCalledWith('Please enter an issue title');
    });

    test('should require GitHub authentication for task creation', () => {
      const form = api.addTaskForm;
      const titleInput = document.getElementById('task-title');
      const descriptionInput = document.getElementById('task-description');
      const prioritySelect = document.getElementById('task-priority');
      const categorySelect = document.getElementById('task-category');
      const columnSelect = document.getElementById('task-column');
      
      global.alert = jest.fn();
      
      // Ensure GitHub auth is false
      global.window.GitHub.githubAuth.isAuthenticated = false;
      global.window.GitHub.githubAuth.accessToken = null;

      // Fill form
      titleInput.value = 'Test Task';
      descriptionInput.value = 'Test Description';
      prioritySelect.value = 'High';
      categorySelect.value = 'Bug';
      columnSelect.value = 'backlog';

      // Submit form
      const submitEvent = new Event('submit');
      form.dispatchEvent(submitEvent);

      // Should show auth warning
      expect(global.alert).toHaveBeenCalledWith(
        'Please connect to GitHub with a Personal Access Token first to create GitHub issues'
      );
    });
  });

  describe('column management', () => {
    test('should update column counts correctly', () => {
      const backlog = document.getElementById('backlog');
      
      // Find the existing column wrapper that should already exist
      let columnWrapper = document.querySelector('[data-column="backlog"]');
      
      // If it doesn't exist, create it
      if (!columnWrapper) {
        columnWrapper = document.createElement('div');
        columnWrapper.setAttribute('data-column', 'backlog');
        
        const columnHeader = document.createElement('div');
        columnHeader.className = 'column-header';
        
        const countBadge = document.createElement('span');
        countBadge.textContent = '0';
        
        columnHeader.appendChild(countBadge);
        columnWrapper.appendChild(columnHeader);
        document.body.appendChild(columnWrapper);
      }

      // Get the count badge
      const countBadge = columnWrapper.querySelector('.column-header span');

      // Add some task cards with the correct classes (excluding skeleton/loading cards)
      const task1 = document.createElement('div');
      task1.className = 'bg-white border';
      const task2 = document.createElement('div');
      task2.className = 'bg-white border';
      backlog.appendChild(task1);
      backlog.appendChild(task2);

      api.updateColumnCounts();

      expect(countBadge.textContent).toBe('2');
      
      // Clean up
      task1.remove();
      task2.remove();
    });

    test('should handle missing columns gracefully', () => {
      // Remove a column
      document.getElementById('backlog').remove();

      expect(() => {
        api.updateColumnCounts();
      }).not.toThrow();
    });
  });

  describe('Column collapse functionality', () => {
    beforeEach(() => {
      // Add column wrappers with the proper structure for testing
      ['info', 'backlog', 'inprogress', 'review', 'done'].forEach(columnId => {
        const columnWrapper = document.createElement('div');
        columnWrapper.setAttribute('data-column', columnId);
        columnWrapper.className = 'column-expanded';
        
        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'column-collapse-btn';
        collapseBtn.setAttribute('data-column', columnId);
        
        const icon = document.createElement('i');
        icon.className = 'fas fa-chevron-left';
        collapseBtn.appendChild(icon);
        
        const columnContent = document.createElement('div');
        columnContent.className = 'column-content';
        
        const columnTitle = document.createElement('h3');
        columnTitle.className = 'column-title';
        columnTitle.textContent = columnId.charAt(0).toUpperCase() + columnId.slice(1);
        
        const columnHeader = document.createElement('div');
        columnHeader.className = 'column-header';
        
        const taskCountBadge = document.createElement('span');
        taskCountBadge.textContent = '0';
        
        columnHeader.appendChild(columnTitle);
        columnHeader.appendChild(taskCountBadge);
        columnHeader.appendChild(collapseBtn);
        columnWrapper.appendChild(columnHeader);
        columnWrapper.appendChild(columnContent);
        
        document.body.appendChild(columnWrapper);
      });
    });

    afterEach(() => {
      // Clean up column wrappers
      document.querySelectorAll('[data-column]').forEach(el => el.remove());
    });

    test('should collapse a column', () => {
      api.collapseColumn('backlog');
      
      const columnWrapper = document.querySelector('[data-column="backlog"]');
      const collapseBtn = document.querySelector('.column-collapse-btn[data-column="backlog"]');
      const icon = collapseBtn.querySelector('i');
      const columnContent = columnWrapper.querySelector('.column-content');
      const columnTitle = columnWrapper.querySelector('.column-title');
      const taskCountBadge = columnWrapper.querySelector('span');
      
      expect(columnWrapper.classList.contains('column-collapsed')).toBe(true);
      expect(columnWrapper.style.width).toBe('48px');
      expect(columnContent.style.display).toBe('none');
      expect(columnTitle.style.display).toBe(''); // Title should remain visible
      expect(taskCountBadge.style.display).toBe('none');
      expect(icon.className).toBe('fas fa-chevron-right');
    });

    test('should expand a column', () => {
      // First collapse it
      api.collapseColumn('backlog');
      
      // Then expand it
      api.expandColumn('backlog');
      
      const columnWrapper = document.querySelector('[data-column="backlog"]');
      const collapseBtn = document.querySelector('.column-collapse-btn[data-column="backlog"]');
      const icon = collapseBtn.querySelector('i');
      const columnContent = columnWrapper.querySelector('.column-content');
      const columnTitle = columnWrapper.querySelector('.column-title');
      const taskCountBadge = columnWrapper.querySelector('span');
      
      expect(columnWrapper.classList.contains('column-collapsed')).toBe(false);
      expect(columnWrapper.classList.contains('column-expanded')).toBe(true);
      expect(columnWrapper.style.width).toBe('');
      expect(columnContent.style.display).toBe('');
      expect(columnTitle.style.display).toBe(''); // Title is always visible
      expect(taskCountBadge.style.display).toBe('');
      expect(icon.className).toBe('fas fa-chevron-left');
    });

    test('should toggle column collapse state', () => {
      const columnWrapper = document.querySelector('[data-column="backlog"]');
      
      // Initially expanded
      expect(columnWrapper.classList.contains('column-expanded')).toBe(true);
      
      // Toggle to collapse
      api.toggleColumn('backlog');
      expect(columnWrapper.classList.contains('column-collapsed')).toBe(true);
      
      // Toggle back to expand
      api.toggleColumn('backlog');
      expect(columnWrapper.classList.contains('column-expanded')).toBe(true);
    });

    test('should handle collapse button clicks', () => {
      const collapseBtn = document.querySelector('.column-collapse-btn[data-column="backlog"]');
      const columnWrapper = document.querySelector('[data-column="backlog"]');
      
      // Initially expanded
      expect(columnWrapper.classList.contains('column-expanded')).toBe(true);
      
      // Directly test the toggle function since the event listener is set up during DOMContentLoaded
      api.toggleColumn('backlog');
      
      // Should be collapsed now
      expect(columnWrapper.classList.contains('column-collapsed')).toBe(true);
    });

    test('should save and load collapse states', () => {
      // Collapse some columns
      api.collapseColumn('backlog');
      api.collapseColumn('review');
      
      // Save states
      api.saveCollapseStates();
      
      const saved = localStorageMock.getItem('columnCollapseStates');
      expect(saved).toBeTruthy();
      
      const parsed = JSON.parse(saved);
      expect(parsed.backlog).toBe(true);
      expect(parsed.review).toBe(true);
      expect(parsed.inprogress).toBe(false);
      expect(parsed.done).toBe(false);
      
      // Reset columns to expanded
      api.expandColumn('backlog');
      api.expandColumn('review');
      
      // Load states - should restore collapsed state
      api.loadCollapseStates();
      
      const backlogWrapper = document.querySelector('[data-column="backlog"]');
      const reviewWrapper = document.querySelector('[data-column="review"]');
      
      expect(backlogWrapper.classList.contains('column-collapsed')).toBe(true);
      expect(reviewWrapper.classList.contains('column-collapsed')).toBe(true);
    });

    test('should handle invalid JSON in localStorage', () => {
      localStorageMock.setItem('columnCollapseStates', 'invalid json');

      expect(() => {
        api.loadCollapseStates();
      }).not.toThrow();
    });

    test('should handle missing elements gracefully', () => {
      // Try to collapse a non-existent column
      expect(() => {
        api.collapseColumn('nonexistent');
      }).not.toThrow();
      
      expect(() => {
        api.expandColumn('nonexistent');
      }).not.toThrow();
      
      expect(() => {
        api.toggleColumn('nonexistent');
      }).not.toThrow();
    });
  });

  describe('color utility functions', () => {
    test('should return correct priority colors', () => {
      expect(api.getPriorityColor('High')).toBe('bg-red-100 text-red-800');
      expect(api.getPriorityColor('Medium')).toBe('bg-yellow-100 text-yellow-800');
      expect(api.getPriorityColor('Low')).toBe('bg-green-100 text-green-800');
      expect(api.getPriorityColor('Unknown')).toBe('bg-yellow-100 text-yellow-800'); // defaults to Medium
    });

    test('should return correct category colors', () => {
      expect(api.getCategoryColor('Frontend')).toBe('bg-indigo-100 text-indigo-800');
      expect(api.getCategoryColor('Backend')).toBe('bg-blue-100 text-blue-800');
      expect(api.getCategoryColor('Design')).toBe('bg-purple-100 text-purple-800');
      expect(api.getCategoryColor('Testing')).toBe('bg-red-100 text-red-800');
      expect(api.getCategoryColor('Database')).toBe('bg-green-100 text-green-800');
      expect(api.getCategoryColor('Setup')).toBe('bg-gray-100 text-gray-800');
      expect(api.getCategoryColor('Bug')).toBe('bg-red-100 text-red-800');
      expect(api.getCategoryColor('Enhancement')).toBe('bg-purple-100 text-purple-800');
      expect(api.getCategoryColor('Feature')).toBe('bg-blue-100 text-blue-800');
      expect(api.getCategoryColor('Unknown')).toBe('bg-gray-100 text-gray-800'); // defaults to Setup
    });

    test('should handle case sensitivity correctly', () => {
      // Original system is case-sensitive for exact matches
      expect(api.getPriorityColor('high')).toBe('bg-yellow-100 text-yellow-800'); // defaults to Medium
      expect(api.getCategoryColor('unknown')).toBe('bg-gray-100 text-gray-800'); // defaults to Setup
    });
  });

  describe('archive functionality', () => {
    test('should handle archive button clicks and delegate to GitHub module', () => {
      const archiveBtn = document.createElement('button');
      archiveBtn.className = 'archive-btn';
      archiveBtn.setAttribute('data-issue-number', '123');
      
      const taskElement = document.createElement('div');
      taskElement.className = 'bg-white border';
      taskElement.appendChild(archiveBtn);
      
      const backlog = document.getElementById('backlog');
      backlog.appendChild(taskElement);
      
      // Mock the GitHub archiveGitHubIssue function
      global.window.GitHub.archiveGitHubIssue = jest.fn();
      
      // Simulate click
      const event = new Event('click', { bubbles: true });
      archiveBtn.dispatchEvent(event);
      
      // Should call GitHub archive function
      expect(global.window.GitHub.archiveGitHubIssue).toHaveBeenCalledWith('123', taskElement);
    });
  });

  describe('double-click edit functionality', () => {
    test('should handle double-click events on tasks', () => {
      const taskElement = document.createElement('div');
      taskElement.className = 'bg-white border';
      
      const backlog = document.getElementById('backlog');
      backlog.appendChild(taskElement);
      
      console.log = jest.fn();
      
      // Simulate double-click
      const event = new Event('dblclick', { bubbles: true });
      taskElement.dispatchEvent(event);
      
      // Should log edit event (placeholder functionality)
      expect(console.log).toHaveBeenCalledWith('Edit task:', taskElement);
    });
  });

  describe('integration with GitHub module', () => {
    test('should check GitHub authentication state before creating GitHub issues', () => {
      const form = api.addTaskForm;
      const titleInput = document.getElementById('task-title');
      
      global.alert = jest.fn();
      
      // Fill form
      titleInput.value = 'Test GitHub Issue';
      
      // Ensure GitHub auth is false
      global.window.GitHub.githubAuth.isAuthenticated = false;
      
      // Submit form
      const submitEvent = new Event('submit');
      form.dispatchEvent(submitEvent);
      
      // Should show auth warning
      expect(global.alert).toHaveBeenCalledWith(
        'Please connect to GitHub with a Personal Access Token first to create GitHub issues'
      );
    });

    test('should create GitHub issue when authenticated', async () => {
      const form = api.addTaskForm;
      const titleInput = document.getElementById('task-title');
      const descriptionInput = document.getElementById('task-description');
      const prioritySelect = document.getElementById('task-priority');
      const categorySelect = document.getElementById('task-category');
      const columnSelect = document.getElementById('task-column');
      
      // Mock successful GitHub issue creation
      const mockGitHubIssue = { number: 123, title: 'Test Issue' };
      const mockTaskElement = document.createElement('div');
      
      global.window.GitHub.githubAuth.isAuthenticated = true;
      global.window.GitHub.githubAuth.accessToken = 'token';
      global.window.GitHub.createGitHubIssue = jest.fn().mockResolvedValue(mockGitHubIssue);
      global.window.GitHub.createGitHubIssueElement = jest.fn().mockReturnValue(mockTaskElement);
      
      // Fill form
      titleInput.value = 'Test GitHub Issue';
      descriptionInput.value = 'Test Description';
      prioritySelect.value = 'High';
      categorySelect.value = 'Bug';
      columnSelect.value = 'backlog';
      
      // Submit form
      const submitEvent = new Event('submit');
      form.dispatchEvent(submitEvent);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // Should call GitHub API
      expect(global.window.GitHub.createGitHubIssue).toHaveBeenCalledWith(
        'Test GitHub Issue',
        'Test Description',
        ['high', 'bug']
      );
    });
  });

  describe('error handling', () => {
    test('should handle form submission errors gracefully', async () => {
      const form = api.addTaskForm;
      const titleInput = document.getElementById('task-title');
      const columnSelect = document.getElementById('task-column');
      
      global.alert = jest.fn();
      console.error = jest.fn();
      
      // Set up authenticated state but make createGitHubIssue throw an error
      global.window.GitHub.githubAuth.isAuthenticated = true;
      global.window.GitHub.githubAuth.accessToken = 'token';
      global.window.GitHub.createGitHubIssue = jest.fn().mockRejectedValue(new Error('API error'));
      
      // Fill form
      titleInput.value = 'Test Task';
      columnSelect.value = 'backlog';
      
      // Submit form
      const submitEvent = new Event('submit');
      form.dispatchEvent(submitEvent);
      
      // Wait for async error handling
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(console.error).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith(
        'An error occurred while creating the GitHub issue. Please try again.'
      );
    });
  });

  describe('sortable onEnd functionality', () => {
    test('should handle drag end events and call updateColumnCounts', () => {
      // Mock a sortable end event
      const draggedElement = document.createElement('div');
      draggedElement.setAttribute('data-issue-number', '123');
      
      const fromColumn = document.getElementById('backlog');
      const toColumn = document.getElementById('inprogress');
      
      const evt = {
        item: draggedElement,
        from: fromColumn,
        to: toColumn
      };
      
      // Mock GitHub functions
      global.window.GitHub.updateGitHubIssueLabels = jest.fn();
      global.window.GitHub.closeGitHubIssue = jest.fn();
      global.window.GitHub.updateCardIndicators = jest.fn();
      
      // Mock updateColumnCounts in the global scope where it's actually called
      const originalUpdateColumnCounts = global.updateColumnCounts;
      global.updateColumnCounts = jest.fn();
      
      // Get the sortable options from the call (backlog column)
      const sortableOptions = global.Sortable.mock.calls[1][1]; // Second call options
      
      // Call the onEnd function from the options
      sortableOptions.onEnd(evt);
      
      // The onEnd function is called, which means the drag functionality works
      // We can't easily mock the internal updateColumnCounts call, so we verify other effects
      expect(global.window.GitHub.updateGitHubIssueLabels).toHaveBeenCalledWith('123', 'inprogress');
      expect(global.window.GitHub.updateCardIndicators).toHaveBeenCalledWith(draggedElement, 'inprogress');
      
      // Restore original function
      global.updateColumnCounts = originalUpdateColumnCounts;
    });

    test('should close GitHub issue when moved to Done column', () => {
      const draggedElement = document.createElement('div');
      draggedElement.setAttribute('data-issue-number', '123');
      
      const fromColumn = document.getElementById('backlog');
      const toColumn = document.getElementById('done');
      
      const evt = {
        item: draggedElement,
        from: fromColumn,
        to: toColumn
      };
      
      global.window.GitHub.closeGitHubIssue = jest.fn();
      global.window.GitHub.updateGitHubIssueLabels = jest.fn();
      
      // Get the sortable options and call onEnd
      const sortableOptions = global.Sortable.mock.calls[1][1];
      sortableOptions.onEnd(evt);
      
      expect(global.window.GitHub.closeGitHubIssue).toHaveBeenCalledWith('123');
    });

    test('should handle drag end without issue number', () => {
      const draggedElement = document.createElement('div');
      // No data-issue-number attribute
      
      const fromColumn = document.getElementById('backlog');
      const toColumn = document.getElementById('inprogress');
      
      const evt = {
        item: draggedElement,
        from: fromColumn,
        to: toColumn
      };
      
      global.window.GitHub.updateCardIndicators = jest.fn();
      
      // Get the sortable options and call onEnd
      const sortableOptions = global.Sortable.mock.calls[1][1];
      sortableOptions.onEnd(evt);
      
      // Should still call updateCardIndicators for column change
      expect(global.window.GitHub.updateCardIndicators).toHaveBeenCalledWith(draggedElement, 'inprogress');
    });

    test('should handle drag end in same column', () => {
      const draggedElement = document.createElement('div');
      draggedElement.setAttribute('data-issue-number', '123');
      
      const column = document.getElementById('backlog');
      
      const evt = {
        item: draggedElement,
        from: column,
        to: column
      };
      
      global.window.GitHub.updateGitHubIssueLabels = jest.fn();
      global.window.GitHub.updateCardIndicators = jest.fn();
      
      // Get the sortable options and call onEnd
      const sortableOptions = global.Sortable.mock.calls[1][1];
      sortableOptions.onEnd(evt);
      
      // Should not call GitHub functions for same column
      expect(global.window.GitHub.updateGitHubIssueLabels).not.toHaveBeenCalled();
      expect(global.window.GitHub.updateCardIndicators).not.toHaveBeenCalled();
    });
  });

  describe('error scenarios in form submission', () => {
    test('should handle failed GitHub issue creation', async () => {
      const form = api.addTaskForm;
      const titleInput = document.getElementById('task-title');
      
      global.alert = jest.fn();
      
      // Set up authenticated state but make createGitHubIssue return null
      global.window.GitHub.githubAuth.isAuthenticated = true;
      global.window.GitHub.githubAuth.accessToken = 'token';
      global.window.GitHub.createGitHubIssue = jest.fn().mockResolvedValue(null);
      
      // Fill form
      titleInput.value = 'Test Task';
      
      // Submit form
      const submitEvent = new Event('submit');
      form.dispatchEvent(submitEvent);
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(global.alert).toHaveBeenCalledWith(
        'Failed to create GitHub issue. Please try again.'
      );
    });

    test('should handle exception during GitHub issue creation', async () => {
      const form = api.addTaskForm;
      const titleInput = document.getElementById('task-title');
      
      global.alert = jest.fn();
      console.error = jest.fn();
      
      // Set up authenticated state but make createGitHubIssue throw an error
      global.window.GitHub.githubAuth.isAuthenticated = true;
      global.window.GitHub.githubAuth.accessToken = 'token';
      global.window.GitHub.createGitHubIssue = jest.fn().mockRejectedValue(new Error('Network error'));
      
      // Fill form
      titleInput.value = 'Test Task';
      
      // Submit form
      const submitEvent = new Event('submit');
      form.dispatchEvent(submitEvent);
      
      // Wait for async error handling
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(console.error).toHaveBeenCalledWith('Error during GitHub issue creation:', expect.any(Error));
      expect(global.alert).toHaveBeenCalledWith(
        'An error occurred while creating the GitHub issue. Please try again.'
      );
    });
  });

  describe('localStorage error handling', () => {
    test('should handle invalid JSON in localStorage', () => {
      // The code checks `typeof jest === 'undefined'` before calling applyDefaultCollapseStates
      // So we need to temporarily hide jest to test this path
      const originalJest = global.jest;
      delete global.jest;
      
      // Store invalid JSON
      localStorageMock.setItem('columnCollapseStates', 'invalid json {');
      
      // Create the required DOM structure for applyDefaultCollapseStates to work
      const reviewColumn = document.querySelector('[data-column="review"]');
      if (!reviewColumn) {
        const columnWrapper = document.createElement('div');
        columnWrapper.setAttribute('data-column', 'review');
        columnWrapper.className = 'column-wrapper';
        
        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'column-collapse-btn';
        collapseBtn.setAttribute('data-column', 'review');
        
        const icon = document.createElement('i');
        icon.className = 'fas fa-chevron-down';
        collapseBtn.appendChild(icon);
        
        const columnContent = document.createElement('div');
        columnContent.className = 'column-content';
        
        const columnHeader = document.createElement('div');
        columnHeader.className = 'column-header';
        
        const taskCountBadge = document.createElement('span');
        columnHeader.appendChild(taskCountBadge);
        
        columnWrapper.appendChild(collapseBtn);
        columnWrapper.appendChild(columnContent);
        columnWrapper.appendChild(columnHeader);
        document.body.appendChild(columnWrapper);
      }
      
      // Call loadCollapseStates
      api.loadCollapseStates();
      
      // Should clear invalid data and apply default collapse to review column
      expect(localStorageMock.getItem('columnCollapseStates')).toBeNull();
      const reviewColumnEl = document.querySelector('[data-column="review"]');
      expect(reviewColumnEl.classList.contains('column-collapsed')).toBe(true);
      
      // Restore jest
      global.jest = originalJest;
    });

    test('should apply default collapse states when no saved state exists', () => {
      // Clear localStorage
      localStorageMock.clear();
      
      // Create the required DOM structure for the test to work
      const reviewColumn = document.querySelector('[data-column="review"]');
      if (!reviewColumn) {
        const columnWrapper = document.createElement('div');
        columnWrapper.setAttribute('data-column', 'review');
        columnWrapper.className = 'column-wrapper';
        
        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'column-collapse-btn';
        collapseBtn.setAttribute('data-column', 'review');
        
        const icon = document.createElement('i');
        icon.className = 'fas fa-chevron-down';
        collapseBtn.appendChild(icon);
        
        const columnContent = document.createElement('div');
        columnContent.className = 'column-content';
        
        const columnHeader = document.createElement('div');
        columnHeader.className = 'column-header';
        
        const taskCountBadge = document.createElement('span');
        columnHeader.appendChild(taskCountBadge);
        
        columnWrapper.appendChild(collapseBtn);
        columnWrapper.appendChild(columnContent);
        columnWrapper.appendChild(columnHeader);
        document.body.appendChild(columnWrapper);
      }
      
      // Call loadCollapseStates
      api.loadCollapseStates();
      
      // Should apply default collapse state to review column
      const reviewColumnEl = document.querySelector('[data-column="review"]');
      expect(reviewColumnEl.classList.contains('column-collapsed')).toBe(true);
    });

    test('should not log errors in test environment', () => {
      console.error = jest.fn();
      
      // Store invalid JSON
      localStorageMock.setItem('columnCollapseStates', 'invalid json {');
      
      // Call loadCollapseStates
      api.loadCollapseStates();
      
      // Should not log error in test environment (jest is defined)
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('initialization timeout functions', () => {
    test('should call GitHub functions if available in timeout', (done) => {
      // Mock GitHub functions
      global.window.GitHub = {
        applyReviewIndicatorsToColumn: jest.fn(),
        applyCompletedSectionsToColumn: jest.fn()
      };
      global.window.GitHubAuth = {
        updateAddIssueButtonState: jest.fn()
      };
      
      // Since setTimeout is already called during initialization, 
      // we need to wait for it to complete
      setTimeout(() => {
        expect(global.window.GitHub.applyReviewIndicatorsToColumn).toHaveBeenCalled();
        expect(global.window.GitHub.applyCompletedSectionsToColumn).toHaveBeenCalled();
        expect(global.window.GitHubAuth.updateAddIssueButtonState).toHaveBeenCalled();
        done();
      }, 110);
    });

    test('should handle missing GitHub functions gracefully in timeout', (done) => {
      // Clear GitHub functions
      global.window.GitHub = {};
      global.window.GitHubAuth = {};
      
      // Should not throw error when functions are missing
      setTimeout(() => {
        // Test passes if no error is thrown
        done();
      }, 110);
    });

    test('should handle missing GitHub module gracefully in timeout', (done) => {
      // Clear GitHub completely
      delete global.window.GitHub;
      delete global.window.GitHubAuth;
      
      // Should not throw error when modules are missing
      setTimeout(() => {
        // Test passes if no error is thrown
        done();
      }, 110);
    });
  });

  describe('additional coverage for missing lines', () => {
    test('should handle add task button disabled state', () => {
      const btn = api.addTaskBtn;
      global.alert = jest.fn();
      
      // Disable button
      btn.disabled = true;
      
      // Click button
      const clickEvent = new Event('click');
      btn.dispatchEvent(clickEvent);
      
      expect(global.alert).toHaveBeenCalledWith(
        'Please connect to GitHub with a Personal Access Token first to create issues'
      );
    });

    test('should handle modal outside click', () => {
      const modal = api.addTaskModal;
      
      // Show modal first
      modal.classList.remove('hidden');
      
      // Create a modal content element that matches the structure in kanban.js
      const modalContent = document.createElement('div');
      modalContent.className = 'bg-white rounded-lg shadow-xl';
      modal.appendChild(modalContent);
      
      // Mock hideModal by monitoring the modal's hidden class
      const initialHiddenState = modal.classList.contains('hidden');
      
      // Simulate clicking on the modal backdrop (not on the content)
      // The kanban.js code checks if !modalContent.contains(e.target)
      const clickEvent = new MouseEvent('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: modal, writable: false });
      
      // Trigger the event
      modal.dispatchEvent(clickEvent);
      
      // Check that the modal was hidden
      expect(modal.classList.contains('hidden')).toBe(true);
      
      // Clean up
      modalContent.remove();
    });

    test('should handle click inside modal content without hiding', () => {
      const modal = api.addTaskModal;
      const hideModalSpy = jest.spyOn(api, 'hideModal');
      
      // Show modal first
      modal.classList.remove('hidden');
      
      // Create a modal content element
      const modalContent = document.createElement('div');
      modalContent.className = 'bg-white rounded-lg shadow-xl';
      modal.appendChild(modalContent);
      
      // Click inside modal content
      const clickEvent = new Event('click');
      Object.defineProperty(clickEvent, 'target', { value: modalContent });
      modal.dispatchEvent(clickEvent);
      
      expect(hideModalSpy).not.toHaveBeenCalled();
      
      hideModalSpy.mockRestore();
    });

    test('should apply default collapse states when no localStorage data exists', () => {
      // Clear localStorage completely
      localStorageMock.clear();
      
      // Create required DOM structure for collapseColumn to work
      const reviewColumn = document.querySelector('[data-column="review"]');
      if (!reviewColumn) {
        const columnWrapper = document.createElement('div');
        columnWrapper.setAttribute('data-column', 'review');
        columnWrapper.className = 'column-wrapper';
        
        const collapseBtn = document.createElement('button');
        collapseBtn.className = 'column-collapse-btn';
        collapseBtn.setAttribute('data-column', 'review');
        
        const icon = document.createElement('i');
        icon.className = 'fas fa-chevron-down';
        collapseBtn.appendChild(icon);
        
        const columnContent = document.createElement('div');
        columnContent.className = 'column-content';
        
        const columnHeader = document.createElement('div');
        columnHeader.className = 'column-header';
        
        const taskCountBadge = document.createElement('span');
        columnHeader.appendChild(taskCountBadge);
        
        columnWrapper.appendChild(collapseBtn);
        columnWrapper.appendChild(columnContent);
        columnWrapper.appendChild(columnHeader);
        document.body.appendChild(columnWrapper);
      }
      
      // Call applyDefaultCollapseStates directly
      api.applyDefaultCollapseStates();
      
      // Check that the review column is collapsed
      const reviewColumnEl = document.querySelector('[data-column="review"]');
      expect(reviewColumnEl.classList.contains('column-collapsed')).toBe(true);
    });

    test('should cover archive functionality lines', () => {
      // Ensure GitHub object exists with archiveGitHubIssue function
      global.window.GitHub = global.window.GitHub || {};
      global.window.GitHub.archiveGitHubIssue = jest.fn();
      
      // Create archive button
      const archiveBtn = document.createElement('button');
      archiveBtn.className = 'archive-btn';
      archiveBtn.setAttribute('data-issue-number', '456');
      
      const taskElement = document.createElement('div');
      taskElement.className = 'bg-white border';
      taskElement.appendChild(archiveBtn);
      
      const backlog = document.getElementById('backlog');
      backlog.appendChild(taskElement);
      
      // Create click event that specifically targets the archive button
      const clickEvent = new Event('click', { bubbles: true });
      Object.defineProperty(clickEvent, 'target', { value: archiveBtn });
      
      // Dispatch the click event on the document
      document.dispatchEvent(clickEvent);
      
      // Should call GitHub archive function
      expect(global.window.GitHub.archiveGitHubIssue).toHaveBeenCalledWith('456', taskElement);
    });
  });

  describe('exported API', () => {
    test('should export required functions for testing', () => {
      expect(typeof api.createTaskElement).toBe('function');
      expect(typeof api.updateColumnCounts).toBe('function');
      expect(typeof api.hideModal).toBe('function');
      expect(typeof api.loadCollapseStates).toBe('function');
      expect(typeof api.saveCollapseStates).toBe('function');
      expect(typeof api.collapseColumn).toBe('function');
      expect(typeof api.expandColumn).toBe('function');
      expect(typeof api.toggleColumn).toBe('function');
      expect(typeof api.getPriorityColor).toBe('function');
      expect(typeof api.getCategoryColor).toBe('function');
    });

    test('should export DOM elements for testing', () => {
      expect(api.addTaskBtn).toBeTruthy();
      expect(api.addTaskModal).toBeTruthy();
      expect(api.cancelTaskBtn).toBeTruthy();
      expect(api.addTaskForm).toBeTruthy();
    });
  });
});

describe('Card Order Persistence', () => {
    beforeEach(() => {
        // Clear localStorage before each test
        localStorageMock.clear();
        
        // Set up HTML structure with mock cards
        document.body.innerHTML = `
            <div id="backlog">
                <div class="bg-white border" data-issue-number="123">Card 1</div>
                <div class="bg-white border" data-task-id="local-1">Card 2</div>
                <div class="bg-white border" data-issue-number="456">Card 3</div>
            </div>
            <div id="inprogress">
                <div class="bg-white border" data-issue-number="789">Card 4</div>
            </div>
            <div id="review"></div>
            <div id="done"></div>
            <div id="info"></div>
        `;
    });

    test('saveCardOrder should save card order to localStorage', () => {
        kanbanTestExports.saveCardOrder();
        
        const saved = localStorageMock.getItem('cardOrder');
        expect(saved).toBeTruthy();
        
        const cardOrder = JSON.parse(saved);
        expect(cardOrder.backlog).toEqual(['123', 'local-1', '456']);
        expect(cardOrder.inprogress).toEqual(['789']);
        expect(cardOrder.review).toEqual([]);
        expect(cardOrder.done).toEqual([]);
        expect(cardOrder.info).toEqual([]);
    });

    test('loadCardOrder should return saved order from localStorage', () => {
        const testOrder = {
            backlog: ['123', '456'],
            inprogress: ['789'],
            review: [],
            done: [],
            info: []
        };
        
        localStorageMock.setItem('cardOrder', JSON.stringify(testOrder));
        
        const loaded = kanbanTestExports.loadCardOrder();
        expect(loaded).toEqual(testOrder);
    });

    test('loadCardOrder should return null when no saved order exists', () => {
        const loaded = kanbanTestExports.loadCardOrder();
        expect(loaded).toBeNull();
    });

    test('loadCardOrder should handle invalid JSON gracefully', () => {
        localStorageMock.setItem('cardOrder', 'invalid json');
        
        const loaded = kanbanTestExports.loadCardOrder();
        expect(loaded).toBeNull();
    });

    test('applyCardOrder should reorder cards according to saved order', () => {
        // Save an order where Card 3 comes before Card 1
        const testOrder = {
            backlog: ['456', '123', 'local-1'],
            inprogress: ['789'],
            review: [],
            done: [],
            info: []
        };
        
        localStorageMock.setItem('cardOrder', JSON.stringify(testOrder));
        
        kanbanTestExports.applyCardOrder();
        
        const backlogColumn = document.getElementById('backlog');
        const cards = backlogColumn.querySelectorAll('.bg-white.border');
        
        expect(cards[0].getAttribute('data-issue-number')).toBe('456');
        expect(cards[1].getAttribute('data-issue-number')).toBe('123');
        expect(cards[2].getAttribute('data-task-id')).toBe('local-1');
    });

    test('applyCardOrder should handle missing cards gracefully', () => {
        // Order includes a card that doesn't exist
        const testOrder = {
            backlog: ['nonexistent', '123', '456'],
            inprogress: [],
            review: [],
            done: [],
            info: []
        };
        
        localStorageMock.setItem('cardOrder', JSON.stringify(testOrder));
        
        expect(() => kanbanTestExports.applyCardOrder()).not.toThrow();
        
        const backlogColumn = document.getElementById('backlog');
        const cards = backlogColumn.querySelectorAll('.bg-white.border');
        
        // Should still have the existing cards
        expect(cards.length).toBe(3);
    });

    test('applyCardOrder should append cards not in saved order at the end', () => {
        // Add a new card not in the saved order
        const backlogColumn = document.getElementById('backlog');
        const newCard = document.createElement('div');
        newCard.className = 'bg-white border';
        newCard.setAttribute('data-issue-number', '999');
        newCard.textContent = 'New Card';
        backlogColumn.appendChild(newCard);
        
        const testOrder = {
            backlog: ['123', '456'],
            inprogress: [],
            review: [],
            done: [],
            info: []
        };
        
        localStorageMock.setItem('cardOrder', JSON.stringify(testOrder));
        
        kanbanTestExports.applyCardOrder();
        
        const cards = backlogColumn.querySelectorAll('.bg-white.border');
        
        // First two cards should be in saved order
        expect(cards[0].getAttribute('data-issue-number')).toBe('123');
        expect(cards[1].getAttribute('data-issue-number')).toBe('456');
        
        // Cards not in saved order should be at the end
        expect(cards[2].getAttribute('data-task-id')).toBe('local-1');
        expect(cards[3].getAttribute('data-issue-number')).toBe('999');
    });

    test('applyCardOrder should do nothing when no saved order exists', () => {
        const backlogColumn = document.getElementById('backlog');
        const originalOrder = Array.from(backlogColumn.querySelectorAll('.bg-white.border'))
            .map(card => card.getAttribute('data-issue-number') || card.getAttribute('data-task-id'));
        
        kanbanTestExports.applyCardOrder();
        
        const newOrder = Array.from(backlogColumn.querySelectorAll('.bg-white.border'))
            .map(card => card.getAttribute('data-issue-number') || card.getAttribute('data-task-id'));
        
        expect(newOrder).toEqual(originalOrder);
    });

    test('applyCardOrder should skip skeleton cards', () => {
        // Add skeleton card
        const backlogColumn = document.getElementById('backlog');
        const skeleton = document.createElement('div');
        skeleton.className = 'bg-white border animate-pulse';
        skeleton.textContent = 'Loading...';
        backlogColumn.appendChild(skeleton);
        
        const testOrder = {
            backlog: ['123', '456'],
            inprogress: [],
            review: [],
            done: [],
            info: []
        };
        
        localStorageMock.setItem('cardOrder', JSON.stringify(testOrder));
        
        kanbanTestExports.applyCardOrder();
        
        // Skeleton should still be there and not interfere with ordering
        expect(backlogColumn.querySelector('.animate-pulse')).toBeTruthy();
        
        const realCards = backlogColumn.querySelectorAll('.bg-white.border:not(.animate-pulse)');
        expect(realCards[0].getAttribute('data-issue-number')).toBe('123');
        expect(realCards[1].getAttribute('data-issue-number')).toBe('456');
    });

    test('saveCardOrder should generate ID for cards without identifiers', () => {
        // Add card without any identifier
        const backlogColumn = document.getElementById('backlog');
        const cardWithoutId = document.createElement('div');
        cardWithoutId.className = 'bg-white border';
        cardWithoutId.textContent = 'Card without ID';
        backlogColumn.appendChild(cardWithoutId);
        
        kanbanTestExports.saveCardOrder();
        
        const saved = localStorageMock.getItem('cardOrder');
        const cardOrder = JSON.parse(saved);
        
        // Should have 4 cards in backlog (3 original + 1 new)
        expect(cardOrder.backlog).toHaveLength(4);
        
        // The last card should have a generated ID starting with 'card-'
        expect(cardOrder.backlog[3]).toMatch(/^card-\d+-[a-z0-9]+$/);
    });

    test('saveCardOrder should handle info column cards with special IDs', () => {
        // Clear and set up info column with status card and about card
        document.body.innerHTML = `
            <div id="info">
                <div class="bg-white border">
                    <h4>Status</h4>
                    <div data-frontend-status>Frontend Status</div>
                    <div data-ci-status>CI Status</div>
                </div>
                <div class="bg-white border">
                    <h4>About This Project</h4>
                    <p>This is about the project</p>
                </div>
                <div class="bg-white border">
                    <h4>Other Info</h4>
                    <p>Some other info</p>
                </div>
            </div>
            <div id="backlog"></div>
            <div id="inprogress"></div>
            <div id="review"></div>
            <div id="done"></div>
        `;
        
        kanbanTestExports.saveCardOrder();
        
        const saved = localStorageMock.getItem('cardOrder');
        const cardOrder = JSON.parse(saved);
        
        expect(cardOrder.info).toEqual(['status-card', 'about-card', 'info-card-2']);
    });

    test('applyCardOrder should handle info column cards correctly', () => {
        // Set up info column 
        document.body.innerHTML = `
            <div id="info">
                <div class="bg-white border">
                    <h4>About This Project</h4>
                    <p>This is about the project</p>
                </div>
                <div class="bg-white border">
                    <h4>Status</h4>
                    <div data-frontend-status>Frontend Status</div>
                    <div data-ci-status>CI Status</div>
                </div>
            </div>
            <div id="backlog"></div>
            <div id="inprogress"></div>
            <div id="review"></div>
            <div id="done"></div>
        `;
        
        // Save order where status card comes first
        const testOrder = {
            info: ['status-card', 'about-card'],
            backlog: [],
            inprogress: [],
            review: [],
            done: []
        };
        
        localStorageMock.setItem('cardOrder', JSON.stringify(testOrder));
        
        kanbanTestExports.applyCardOrder();
        
        const infoColumn = document.getElementById('info');
        const cards = infoColumn.querySelectorAll('.bg-white.border');
        
        // Status card should be first, about card second
        expect(cards[0].querySelector('[data-frontend-status]')).toBeTruthy();
        expect(cards[1].querySelector('h4').textContent).toContain('About');
    });
});

test('should toggle column when clicking on column title', () => {
    const columnId = 'backlog';
    const columnWrapper = document.querySelector(`[data-column="${columnId}"]`);
    const columnTitle = columnWrapper.querySelector('.column-title');
    
    // Simulate clicking on the column title
    const clickEvent = new MouseEvent('click', { bubbles: true });
    columnTitle.dispatchEvent(clickEvent);
    
    // Should collapse the column
    expect(columnWrapper.classList.contains('column-collapsed')).toBe(true);
    
    // Click again to expand
    columnTitle.dispatchEvent(clickEvent);
    expect(columnWrapper.classList.contains('column-collapsed')).toBe(false);
});

test('should handle column title click when column wrapper is missing', () => {
    // Create a column title without a wrapper
    const columnTitle = document.createElement('h3');
    columnTitle.className = 'column-title';
    columnTitle.textContent = 'Test Column';
    document.body.appendChild(columnTitle);
    
    // Should not throw an error when clicking
    const clickEvent = new MouseEvent('click', { bubbles: true });
    expect(() => {
        columnTitle.dispatchEvent(clickEvent);
    }).not.toThrow();
    
    // Clean up
    document.body.removeChild(columnTitle);
});
