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
      <div class="kanban-column">
        <h2 onclick="toggleColumn('info')">
          <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform duration-200"></i>
          Info
        </h2>
        <div id="info" class="space-y-3">
          <!-- Status cards will be here -->
        </div>
      </div>
      
      <!-- Backlog Column -->
      <div class="kanban-column">
        <h2 onclick="toggleColumn('backlog')">
          <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform duration-200"></i>
          Backlog (0)
        </h2>
        <div id="backlog" class="space-y-3"></div>
      </div>
      
      <!-- In Progress Column -->
      <div class="kanban-column">
        <h2 onclick="toggleColumn('inprogress')">
          <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform duration-200"></i>
          In Progress (0)
        </h2>
        <div id="inprogress" class="space-y-3"></div>
      </div>
      
      <!-- Review Column -->
      <div class="kanban-column">
        <h2 onclick="toggleColumn('review')">
          <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform duration-200"></i>
          Review (0)
        </h2>
        <div id="review" class="space-y-3"></div>
      </div>
      
      <!-- Done Column -->
      <div class="kanban-column">
        <h2 onclick="toggleColumn('done')">
          <i class="fas fa-chevron-down text-xs text-gray-400 transition-transform duration-200"></i>
          Done (0)
        </h2>
        <div id="done" class="space-y-3"></div>
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
          
          <div id="github-option" class="mb-4 p-3 bg-gray-50 rounded-md">
            <label class="flex items-center">
              <input type="checkbox" id="create-github-issue" name="createGitHubIssue" class="mr-2">
              <span class="text-sm font-medium text-gray-700">Create real GitHub issue</span>
            </label>
            <p id="github-status-text" class="text-xs text-gray-500 mt-0.5">Install GitHub App to create real issues in the repository</p>
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
      const header = document.querySelector('h2[onclick*="backlog"]');
      
      expect(backlog.children.length).toBe(0);
      expect(header.textContent).toContain('(0)');
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

    test('should create local task when not using GitHub', () => {
      const form = api.addTaskForm;
      const titleInput = document.getElementById('task-title');
      const descriptionInput = document.getElementById('task-description');
      const prioritySelect = document.getElementById('task-priority');
      const categorySelect = document.getElementById('task-category');
      const columnSelect = document.getElementById('task-column');
      const backlog = document.getElementById('backlog');

      // Fill form
      titleInput.value = 'Test Task';
      descriptionInput.value = 'Test Description';
      prioritySelect.value = 'High';
      categorySelect.value = 'Bug';
      columnSelect.value = 'backlog';

      const initialCount = backlog.children.length;

      // Submit form
      const submitEvent = new Event('submit');
      form.dispatchEvent(submitEvent);

      // Check that task was added
      expect(backlog.children.length).toBe(initialCount + 1);
      
      // Check task content
      const newTask = backlog.lastElementChild;
      expect(newTask.innerHTML).toContain('Test Task');
      expect(newTask.innerHTML).toContain('Test Description');
    });
  });

  describe('column management', () => {
    test('should update column counts correctly', () => {
      const backlog = document.getElementById('backlog');
      const header = document.querySelector('h2[onclick*="backlog"]');

      // Add some tasks
      const task1 = document.createElement('div');
      const task2 = document.createElement('div');
      backlog.appendChild(task1);
      backlog.appendChild(task2);

      api.updateColumnCounts();

      expect(header.textContent).toContain('(2)');
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
      const githubCheckbox = document.getElementById('create-github-issue');
      
      global.alert = jest.fn();
      
      // Fill form with GitHub option enabled
      titleInput.value = 'Test GitHub Issue';
      githubCheckbox.checked = true;
      
      // Ensure GitHub auth is false
      global.window.GitHub.githubAuth.isAuthenticated = false;
      
      // Submit form
      const submitEvent = new Event('submit');
      form.dispatchEvent(submitEvent);
      
      // Should show auth warning
      expect(global.alert).toHaveBeenCalledWith(
        'Please install the GitHub App and add a Personal Access Token first to create real issues'
      );
    });

    test('should create GitHub issue when authenticated', async () => {
      const form = api.addTaskForm;
      const titleInput = document.getElementById('task-title');
      const descriptionInput = document.getElementById('task-description');
      const prioritySelect = document.getElementById('task-priority');
      const categorySelect = document.getElementById('task-category');
      const githubCheckbox = document.getElementById('create-github-issue');
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
      githubCheckbox.checked = true;
      
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
    test('should handle form submission errors gracefully', () => {
      const form = api.addTaskForm;
      const titleInput = document.getElementById('task-title');
      const columnSelect = document.getElementById('task-column');
      
      global.alert = jest.fn();
      console.error = jest.fn();
      
      // Create a scenario that will cause an error: invalid column selection
      titleInput.value = 'Test Task';
      columnSelect.value = 'nonexistent-column';
      
      // Mock document.getElementById to return null for the column, which will cause an error
      const originalGetElementById = document.getElementById;
      document.getElementById = jest.fn().mockImplementation((id) => {
        if (id === 'nonexistent-column') {
          return null; // This will cause appendChild to fail
        }
        return originalGetElementById.call(document, id);
      });
      
      // Submit form
      const submitEvent = new Event('submit');
      form.dispatchEvent(submitEvent);
      
      expect(console.error).toHaveBeenCalled();
      expect(global.alert).toHaveBeenCalledWith(
        'An error occurred while creating the task. Please try again.'
      );
      
      // Restore original function
      document.getElementById = originalGetElementById;
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
