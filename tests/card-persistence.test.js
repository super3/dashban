// Tests for Card Persistence Module

describe('Card Persistence Module', () => {
    let CardPersistence;
    let originalConsole;
    let mockStore;
    let mockLocalStorage;
    
    beforeEach(() => {
        // Save originals
        originalConsole = global.console;
        
        // Mock console
        global.console = {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };
        
        // Set up DOM
        document.body.innerHTML = `
            <div class="flex-1 column-expanded" data-column="backlog">
                <div class="column-header">
                    <span>0</span>
                    <button class="column-collapse-btn" data-column="backlog">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                </div>
                <div id="backlog" class="column-content"></div>
            </div>
            <div class="flex-1 column-expanded" data-column="todo">
                <div class="column-header">
                    <span>0</span>
                    <button class="column-collapse-btn" data-column="todo">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                </div>
                <div id="todo" class="column-content"></div>
            </div>
            <div class="flex-1 column-expanded" data-column="inprogress">
                <div class="column-header">
                    <span>0</span>
                    <button class="column-collapse-btn" data-column="inprogress">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                </div>
                <div id="inprogress" class="column-content"></div>
            </div>
            <div class="flex-1 column-expanded" data-column="review">
                <div class="column-header">
                    <span>0</span>
                    <button class="column-collapse-btn" data-column="review">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                </div>
                <div id="review" class="column-content"></div>
            </div>
            <div class="flex-1 column-expanded" data-column="done">
                <div class="column-header">
                    <span>0</span>
                    <button class="column-collapse-btn" data-column="done">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                </div>
                <div id="done" class="column-content"></div>
            </div>
        `;
        
        // Create mock localStorage
        mockStore = {};
        mockLocalStorage = {
            getItem: jest.fn(key => mockStore[key] || null),
            setItem: jest.fn((key, value) => { mockStore[key] = value; }),
            removeItem: jest.fn(key => { delete mockStore[key]; }),
            clear: jest.fn(() => { mockStore = {}; })
        };
        
        // Set localStorage on global
        Object.defineProperty(global, 'localStorage', {
            value: mockLocalStorage,
            writable: true,
            configurable: true
        });
        
        // Mock window
        global.window = {
            RepoManager: null,
            GitHubAuth: null,
            StatusCards: null
        };
        
        // Clear module cache and reload
        jest.resetModules();
        delete require.cache[require.resolve('../src/card-persistence.js')];
        require('../src/card-persistence.js');
        CardPersistence = window.CardPersistence;
    });
    
    afterEach(() => {
        global.console = originalConsole;
        delete global.window;
        jest.clearAllMocks();
        jest.resetModules();
    });

    describe('initialize', () => {
        test('should initialize the module', () => {
            CardPersistence.initialize();
            expect(console.log).toHaveBeenCalledWith('💾 Card Persistence module initializing...');
            expect(console.log).toHaveBeenCalledWith('💾 Card Persistence module initialized');
        });

        test('should not initialize twice', () => {
            CardPersistence.initialize();
            jest.clearAllMocks();
            CardPersistence.initialize();
            expect(console.log).not.toHaveBeenCalled();
        });
    });

    describe('getCurrentRepoContext', () => {
        test('should get context from RepoManager when available', () => {
            window.RepoManager = {
                repoState: {
                    currentRepo: { owner: 'test-owner', repo: 'test-repo' }
                }
            };
            
            const context = CardPersistence.getCurrentRepoContext();
            expect(context).toEqual({ owner: 'test-owner', repo: 'test-repo' });
            expect(console.log).toHaveBeenCalledWith('📦 Repository context from RepoManager:', context);
        });

        test('should get context from localStorage when RepoManager not available', () => {
            window.RepoManager = null;
            mockStore['dashban_current_repo'] = JSON.stringify({ owner: 'local-owner', repo: 'local-repo' });
            
            const context = CardPersistence.getCurrentRepoContext();
            expect(context).toEqual({ owner: 'local-owner', repo: 'local-repo' });
            expect(console.log).toHaveBeenCalledWith('📦 Repository context from localStorage:', context);
        });

        test('should handle invalid JSON in localStorage', () => {
            window.RepoManager = null;
            mockLocalStorage.getItem = jest.fn(() => 'invalid-json');
            
            const context = CardPersistence.getCurrentRepoContext();
            expect(console.warn).toHaveBeenCalledWith('Failed to load current repo from localStorage:', expect.any(Error));
            expect(context).toEqual({ owner: 'super3', repo: 'dashban' });
        });

        test('should fallback to GitHubAuth config', () => {
            window.RepoManager = null;
            window.GitHubAuth = {
                GITHUB_CONFIG: { owner: 'github-owner', repo: 'github-repo' }
            };
            
            const context = CardPersistence.getCurrentRepoContext();
            expect(context).toEqual({ owner: 'github-owner', repo: 'github-repo' });
            expect(console.log).toHaveBeenCalledWith('📦 Repository context from GitHubAuth:', context);
        });

        test('should use default fallback', () => {
            window.RepoManager = null;
            window.GitHubAuth = null;
            
            const context = CardPersistence.getCurrentRepoContext();
            expect(context).toEqual({ owner: 'super3', repo: 'dashban' });
            expect(console.log).toHaveBeenCalledWith('📦 Repository context from default:', context);
        });
    });

    describe('Card Order Persistence', () => {
        beforeEach(() => {
            // Add some cards to the DOM
            const backlog = document.getElementById('backlog');
            backlog.innerHTML = `
                <div class="bg-white border" data-issue-number="123">Issue 123</div>
                <div class="bg-white border" data-task-id="task-1">Task 1</div>
                <div class="bg-white border">No ID</div>
            `;
            
            const todo = document.getElementById('todo');
            todo.innerHTML = `
                <div class="bg-white border">
                    <h4>Status</h4>
                    <div data-frontend-status>Frontend Status</div>
                </div>
                <div class="bg-white border" data-card-id="about-card">
                    <h4>About Project</h4>
                </div>
            `;
        });

        test('should save card order', () => {
            CardPersistence.saveCardOrder();
            
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'cardOrder_super3_dashban',
                expect.any(String)
            );
            
            const saved = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
            expect(saved.backlog).toHaveLength(3);
            expect(saved.backlog[0]).toBe('123');
            expect(saved.backlog[1]).toBe('task-1');
            expect(saved.backlog[2]).toMatch(/^card-\d+-[a-z0-9]+$/);
            
            expect(saved.todo).toHaveLength(2);
            expect(saved.todo[0]).toBe('status-card');
            expect(saved.todo[1]).toBe('about-card');
        });

        test('should handle localStorage error when saving', () => {
            mockLocalStorage.setItem = jest.fn(() => {
                throw new Error('Storage full');
            });
            
            expect(() => CardPersistence.saveCardOrder()).not.toThrow();
            expect(console.warn).toHaveBeenCalledWith('Failed to save card order to localStorage:', expect.any(Error));
        });

        test('should load card order', () => {
            const testOrder = {
                backlog: ['123', '456'],
                todo: ['status-card', 'about-card']
            };
            mockStore['cardOrder_super3_dashban'] = JSON.stringify(testOrder);
            
            const loaded = CardPersistence.loadCardOrder();
            expect(loaded).toEqual(testOrder);
        });

        test('should handle localStorage error when loading', () => {
            mockLocalStorage.getItem = jest.fn(() => {
                throw new Error('Storage error');
            });
            
            const result = CardPersistence.loadCardOrder();
            expect(result).toBeNull();
            expect(console.warn).toHaveBeenCalledWith('Failed to load card order from localStorage:', expect.any(Error));
        });

        test('should apply card order', () => {
            // Set up saved order
            const savedOrder = {
                backlog: ['task-1', '123'], // Reverse order
                todo: ['about-card', 'status-card'], // Reverse order
                inprogress: [],
                review: [],
                done: []
            };
            mockStore['cardOrder_super3_dashban'] = JSON.stringify(savedOrder);
            
            CardPersistence.applyCardOrder();
            
            // Check backlog order
            const backlogCards = document.getElementById('backlog').children;
            expect(backlogCards[0].getAttribute('data-task-id')).toBe('task-1');
            expect(backlogCards[1].getAttribute('data-issue-number')).toBe('123');
            
            // Check todo order
            const todoCards = document.getElementById('todo').children;
            expect(todoCards[0].getAttribute('data-card-id')).toBe('about-card');
            expect(todoCards[1].querySelector('[data-frontend-status]')).toBeTruthy();
        });

        test('should skip skeleton cards', () => {
            const backlog = document.getElementById('backlog');
            backlog.innerHTML += '<div class="bg-white border animate-pulse">Loading...</div>';
            
            CardPersistence.saveCardOrder();
            
            const saved = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
            // Should only have 3 cards, not 4 (skeleton excluded)
            expect(saved.backlog).toHaveLength(3);
        });
    });

    describe('Column Collapse State Management', () => {
        test('should save collapse states', () => {
            // Collapse done column
            document.querySelector('[data-column="done"]').classList.add('column-collapsed');
            
            CardPersistence.saveCollapseStates();
            
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'columnCollapseStates_super3_dashban',
                expect.any(String)
            );
            
            const saved = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
            expect(saved.done).toBe(true);
            expect(saved.todo).toBe(false);
        });

        test('should load collapse states', () => {
            const savedStates = {
                backlog: false,
                todo: false,
                inprogress: false,
                review: false,
                done: true
            };
            mockStore['columnCollapseStates_super3_dashban'] = JSON.stringify(savedStates);
            
            CardPersistence.loadCollapseStates();
            
            // Done column should be collapsed
            const doneColumn = document.querySelector('[data-column="done"]');
            expect(doneColumn.classList.contains('column-collapsed')).toBe(true);
            expect(doneColumn.style.width).toBe('48px');
        });

        test('should apply default collapse states', () => {
            CardPersistence.applyDefaultCollapseStates();
            
            // Done column should be collapsed by default
            const doneColumn = document.querySelector('[data-column="done"]');
            expect(doneColumn.classList.contains('column-collapsed')).toBe(true);
        });

        test('should collapse a column', () => {
            const todoColumn = document.querySelector('[data-column="todo"]');
            const todoContent = todoColumn.querySelector('.column-content');
            const todoCount = todoColumn.querySelector('.column-header span');
            const todoIcon = todoColumn.querySelector('.column-collapse-btn i');
            
            CardPersistence.collapseColumn('todo');
            
            expect(todoColumn.classList.contains('column-collapsed')).toBe(true);
            expect(todoColumn.style.width).toBe('48px');
            expect(todoContent.style.display).toBe('none');
            expect(todoCount.style.display).toBe('none');
            expect(todoIcon.className).toBe('fas fa-chevron-right');
        });

        test('should expand a column', () => {
            // First collapse it
            const todoColumn = document.querySelector('[data-column="todo"]');
            todoColumn.classList.add('column-collapsed');
            todoColumn.style.width = '48px';
            
            const todoContent = todoColumn.querySelector('.column-content');
            const todoCount = todoColumn.querySelector('.column-header span');
            const todoIcon = todoColumn.querySelector('.column-collapse-btn i');
            
            todoContent.style.display = 'none';
            todoCount.style.display = 'none';
            todoIcon.className = 'fas fa-chevron-right';
            
            CardPersistence.expandColumn('todo');
            
            expect(todoColumn.classList.contains('column-collapsed')).toBe(false);
            expect(todoColumn.style.width).toBe('');
            expect(todoContent.style.display).toBe('');
            expect(todoCount.style.display).toBe('');
            expect(todoIcon.className).toBe('fas fa-chevron-left');
        });

        test('should toggle column state', () => {
            const todoColumn = document.querySelector('[data-column="todo"]');
            
            // First toggle - should collapse
            CardPersistence.toggleColumn('todo');
            expect(todoColumn.classList.contains('column-collapsed')).toBe(true);
            expect(mockLocalStorage.setItem).toHaveBeenCalled();
            
            // Second toggle - should expand
            CardPersistence.toggleColumn('todo');
            expect(todoColumn.classList.contains('column-collapsed')).toBe(false);
            expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
        });

        test('should handle invalid saved states', () => {
            mockStore['columnCollapseStates_super3_dashban'] = 'invalid-json';
            
            CardPersistence.loadCollapseStates();
            
            // Should apply default states
            const doneColumn = document.querySelector('[data-column="done"]');
            expect(doneColumn.classList.contains('column-collapsed')).toBe(true);
        });
    });

    describe('Cross-column card movement', () => {
        test('should handle moving cards between columns', () => {
            // Set up a card in backlog that should be in todo
            const backlog = document.getElementById('backlog');
            const aboutCard = document.createElement('div');
            aboutCard.className = 'bg-white border';
            aboutCard.setAttribute('data-card-id', 'about-card');
            aboutCard.innerHTML = '<h4>About</h4>';
            backlog.appendChild(aboutCard);
            
            // Set up saved order with about-card in todo
            const savedOrder = {
                backlog: [],
                todo: ['about-card'],
                inprogress: [],
                review: [],
                done: []
            };
            mockStore['cardOrder_super3_dashban'] = JSON.stringify(savedOrder);
            
            CardPersistence.applyCardOrder();
            
            // About card should now be in todo
            expect(document.getElementById('backlog').querySelector('[data-card-id="about-card"]')).toBeFalsy();
            expect(document.getElementById('todo').querySelector('[data-card-id="about-card"]')).toBeTruthy();
        });
    });

    describe('StatusCards integration', () => {
        test('should trigger status refresh if StatusCards available', (done) => {
            window.StatusCards = {
                refreshAllStatuses: jest.fn()
            };
            
            const savedOrder = { backlog: [], todo: [], inprogress: [], review: [], done: [] };
            mockStore['cardOrder_super3_dashban'] = JSON.stringify(savedOrder);
            
            CardPersistence.applyCardOrder();
            
            // Should call refresh after a delay
            setTimeout(() => {
                expect(window.StatusCards.refreshAllStatuses).toHaveBeenCalled();
                done();
            }, 150);
        });
    });

    describe('module exports', () => {
        test('should export all functions', () => {
            expect(CardPersistence.initialize).toBeDefined();
            expect(CardPersistence.saveCardOrder).toBeDefined();
            expect(CardPersistence.loadCardOrder).toBeDefined();
            expect(CardPersistence.applyCardOrder).toBeDefined();
            expect(CardPersistence.loadCollapseStates).toBeDefined();
            expect(CardPersistence.saveCollapseStates).toBeDefined();
            expect(CardPersistence.applyDefaultCollapseStates).toBeDefined();
            expect(CardPersistence.collapseColumn).toBeDefined();
            expect(CardPersistence.expandColumn).toBeDefined();
            expect(CardPersistence.toggleColumn).toBeDefined();
            expect(CardPersistence.getCurrentRepoContext).toBeDefined();
        });

        test('should work in Node.js environment', () => {
            const CardPersistenceModule = require('../src/card-persistence.js');
            expect(CardPersistenceModule).toBeDefined();
            expect(CardPersistenceModule.initialize).toBeDefined();
        });
    });
});