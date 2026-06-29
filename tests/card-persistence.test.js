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
        test('should not throw when initialized once or twice', () => {
            expect(() => CardPersistence.initialize()).not.toThrow();
            // Second call hits the early-return guard.
            expect(() => CardPersistence.initialize()).not.toThrow();
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
        });

        test('should get context from localStorage when RepoManager not available', () => {
            window.RepoManager = null;
            mockStore['dashban_current_repo'] = JSON.stringify({ owner: 'local-owner', repo: 'local-repo' });
            
            const context = CardPersistence.getCurrentRepoContext();
            expect(context).toEqual({ owner: 'local-owner', repo: 'local-repo' });
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
        });

        test('should use default fallback', () => {
            window.RepoManager = null;
            window.GitHubAuth = null;
            
            const context = CardPersistence.getCurrentRepoContext();
            expect(context).toEqual({ owner: 'super3', repo: 'dashban' });
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

    describe('saveCardOrder edge cases', () => {
        test('should skip a missing column when saving (column not in DOM)', () => {
            // Remove the inprogress column entirely so getElementById returns null
            // exercising the false branch of `if (column)` at line 58.
            document.getElementById('inprogress').parentElement.remove();

            CardPersistence.saveCardOrder();

            const saved = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
            // inprogress should not be present because its column was missing
            expect(saved.inprogress).toBeUndefined();
            // The remaining columns should still be saved
            expect(saved.backlog).toBeDefined();
            expect(saved.done).toBeDefined();
        });

        test('should use about-card fallback id when about card has no data-card-id', () => {
            // About card with a title containing "About" but NO data-card-id attribute
            // exercises the right side ('about-card') of the `||` at line 69.
            const backlog = document.getElementById('backlog');
            backlog.innerHTML = `
                <div class="bg-white border">
                    <h4>About Project</h4>
                </div>
            `;

            CardPersistence.saveCardOrder();

            const saved = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
            expect(saved.backlog).toEqual(['about-card']);
        });
    });

    describe('loadCardOrder edge cases', () => {
        test('should return null when no saved order exists', () => {
            // getItem returns null (nothing in mockStore) so the `: null` alternate
            // of the ternary at line 97 is exercised.
            const loaded = CardPersistence.loadCardOrder();
            expect(loaded).toBeNull();
        });
    });

    describe('applyCardOrder edge cases', () => {
        test('should return early when no saved order exists', () => {
            // loadCardOrder returns null -> `if (!savedOrder) return;` at line 106.
            const backlog = document.getElementById('backlog');
            backlog.innerHTML = '<div class="bg-white border" data-issue-number="999">Issue 999</div>';

            // No cardOrder in mockStore, so applyCardOrder should bail out early
            expect(() => CardPersistence.applyCardOrder()).not.toThrow();

            // Card should be untouched (still present, nothing reordered/removed)
            expect(backlog.querySelector('[data-issue-number="999"]')).toBeTruthy();
        });

        test('should skip a missing column when building the global card map', () => {
            // Remove the review column so the global-map-building loop hits the
            // false branch of `if (column)` at line 116.
            document.getElementById('review').parentElement.remove();

            const backlog = document.getElementById('backlog');
            backlog.innerHTML = '<div class="bg-white border" data-issue-number="42">Issue 42</div>';

            const savedOrder = {
                backlog: ['42'],
                todo: [],
                inprogress: [],
                review: ['111'],
                done: []
            };
            mockStore['cardOrder_super3_dashban'] = JSON.stringify(savedOrder);

            expect(() => CardPersistence.applyCardOrder()).not.toThrow();
            expect(backlog.querySelector('[data-issue-number="42"]')).toBeTruthy();
        });

        test('should ignore a saved id that does not match any card', () => {
            // savedColumnOrder references an id not present in any column, so the
            // `if (card)` check at line 186 takes its false branch (card undefined).
            const backlog = document.getElementById('backlog');
            backlog.innerHTML = '<div class="bg-white border" data-issue-number="7">Issue 7</div>';

            const savedOrder = {
                backlog: ['nonexistent-id', '7'],
                todo: [],
                inprogress: [],
                review: [],
                done: []
            };
            mockStore['cardOrder_super3_dashban'] = JSON.stringify(savedOrder);

            CardPersistence.applyCardOrder();

            // The real card is still present; the bogus id was simply skipped.
            const cards = document.getElementById('backlog').children;
            expect(cards).toHaveLength(1);
            expect(cards[0].getAttribute('data-issue-number')).toBe('7');
        });

        test('should skip moving a closed GitHub issue out of a non-done column', () => {
            // A closed issue listed in a non-done column must NOT be moved -> the
            // `return;` at line 196 (and true branch of isClosedIssue at line 194).
            const backlog = document.getElementById('backlog');
            const closedCard = document.createElement('div');
            closedCard.className = 'bg-white border';
            closedCard.setAttribute('data-issue-number', '500');
            closedCard.setAttribute('data-issue-state', 'closed');
            closedCard.textContent = 'Closed Issue 500';

            const openCard = document.createElement('div');
            openCard.className = 'bg-white border';
            openCard.setAttribute('data-issue-number', '501');
            openCard.setAttribute('data-issue-state', 'open');
            openCard.textContent = 'Open Issue 501';

            backlog.appendChild(closedCard);
            backlog.appendChild(openCard);

            const savedOrder = {
                backlog: ['500', '501'],
                todo: [],
                inprogress: [],
                review: [],
                done: []
            };
            mockStore['cardOrder_super3_dashban'] = JSON.stringify(savedOrder);

            CardPersistence.applyCardOrder();

            // Both cards remain in backlog; the closed one was skipped during the
            // fragment build but still survives via the leftover-cards loop.
            expect(backlog.querySelector('[data-issue-number="500"]')).toBeTruthy();
            expect(backlog.querySelector('[data-issue-number="501"]')).toBeTruthy();
        });

        test('should append remaining cards not present in the saved order', () => {
            // A card exists in the column but is NOT referenced by savedColumnOrder,
            // so it falls through to the leftover loop at lines 206-208 (anonymous_12).
            const backlog = document.getElementById('backlog');
            backlog.innerHTML = `
                <div class="bg-white border" data-issue-number="1">Issue 1</div>
                <div class="bg-white border" data-issue-number="2">Issue 2</div>
            `;

            const savedOrder = {
                backlog: ['2'], // Only mentions card "2"; card "1" is a leftover
                todo: [],
                inprogress: [],
                review: [],
                done: []
            };
            mockStore['cardOrder_super3_dashban'] = JSON.stringify(savedOrder);

            CardPersistence.applyCardOrder();

            const cards = document.getElementById('backlog').children;
            expect(cards).toHaveLength(2);
            // Ordered card first, leftover appended afterwards
            expect(cards[0].getAttribute('data-issue-number')).toBe('2');
            expect(cards[1].getAttribute('data-issue-number')).toBe('1');
        });

        test('should use about-card fallback id when building card maps without data-card-id', () => {
            // About card (title includes "About") with NO data-card-id exercises the
            // right side ('about-card') of the `||` at lines 127 and 161.
            const backlog = document.getElementById('backlog');
            backlog.innerHTML = `
                <div class="bg-white border">
                    <h4>About This Board</h4>
                </div>
            `;

            const savedOrder = {
                backlog: ['about-card'],
                todo: [],
                inprogress: [],
                review: [],
                done: []
            };
            mockStore['cardOrder_super3_dashban'] = JSON.stringify(savedOrder);

            CardPersistence.applyCardOrder();

            // The about card should remain in backlog, matched by the 'about-card' id.
            expect(document.getElementById('backlog').querySelector('h4').textContent)
                .toBe('About This Board');
            expect(document.getElementById('backlog').children).toHaveLength(1);
        });
    });

    describe('loadCollapseStates additional branches', () => {
        test('should apply default collapse states when nothing is saved', () => {
            // No saved state in localStorage -> else branch / applyDefaultCollapseStates
            // at line 265 (false branch of `if (saved)` at line 263).
            CardPersistence.loadCollapseStates();

            const doneColumn = document.querySelector('[data-column="done"]');
            expect(doneColumn.classList.contains('column-collapsed')).toBe(true);
        });

        test('should log an error in non-test environments on invalid JSON', () => {
            // Line 256 (`console.error('Error loading collapse states:', e)`) lives
            // inside `if (typeof jest === 'undefined')`. Jest injects `jest` as a
            // lexical binding into every module it loads via require(), so through the
            // normal instrumented-require path `typeof jest` is always 'object' and the
            // line can never run. To exercise it for real, we run the module's own
            // istanbul-instrumented source in a jest-free scope:
            //   - We instrument with @babel/core + babel-plugin-istanbul exactly as
            //     Jest does. This yields the IDENTICAL coverage hash + path, so the
            //     counters merge into Jest's shared global.__coverage__ entry.
            //   - `new Function(code)()` executes in the current (jsdom) realm where
            //     window/document/localStorage/__coverage__ all live, but its scope
            //     chain is only the global object. Since `jest` is a lexical binding
            //     (not a global property), `typeof jest === 'undefined'` is true there.
            const path = require('path');
            const babel = require('@babel/core');

            const srcPath = path.resolve(__dirname, '../src/card-persistence.js');
            const instrumented = babel.transformFileSync(srcPath, {
                plugins: [['babel-plugin-istanbul', {}]],
                babelrc: false,
                configFile: false
            }).code;

            // Provide a localStorage that returns invalid JSON for the collapse key so
            // JSON.parse throws and the catch block (and line 256) is reached. Other
            // keys return null so getCurrentRepoContext falls back to super3/dashban.
            const errorSpy = jest.fn();
            const removeSpy = jest.fn();
            const prevConsole = global.console;
            const prevLocalStorage = global.localStorage;
            global.console = { log: jest.fn(), warn: jest.fn(), error: errorSpy };
            Object.defineProperty(global, 'localStorage', {
                value: {
                    getItem: jest.fn(key =>
                        key === 'columnCollapseStates_super3_dashban' ? 'invalid-json' : null),
                    setItem: jest.fn(),
                    removeItem: removeSpy
                },
                writable: true,
                configurable: true
            });
            // Ensure window.GitHubAuth/RepoManager don't interfere with the storage key.
            global.window.RepoManager = null;
            global.window.GitHubAuth = null;

            try {
                // Sanity: the test wrapper still sees its own lexical `jest`...
                expect(typeof jest).toBe('object');
                // ...but a bare `new Function` body does not (jest is not a global).
                expect(new Function('return typeof jest')()).toBe('undefined');

                // Execute the instrumented module in that jest-free scope. It runs in
                // the jsdom realm, so it re-registers window.CardPersistence and writes
                // coverage to the same global.__coverage__ entry Jest reports on.
                new Function(instrumented)();
                global.window.CardPersistence.loadCollapseStates();
            } finally {
                global.console = prevConsole;
                Object.defineProperty(global, 'localStorage', {
                    value: prevLocalStorage,
                    writable: true,
                    configurable: true
                });
            }

            // The non-test (jest-undefined) branch logged the error and cleared data.
            expect(errorSpy).toHaveBeenCalledWith('Error loading collapse states:', expect.any(Error));
            expect(removeSpy).toHaveBeenCalledWith('columnCollapseStates_super3_dashban');
        });
    });

    describe('saveCollapseStates missing column', () => {
        test('should record false for a column wrapper that is missing', () => {
            // Remove the review column wrapper so `columnWrapper` is null and the
            // `: false` alternate of the ternary at line 291 is exercised.
            document.querySelector('[data-column="review"]').remove();

            CardPersistence.saveCollapseStates();

            const saved = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
            expect(saved.review).toBe(false);
        });
    });

    describe('collapse/expand/toggle guard false branches', () => {
        test('collapseColumn should do nothing for a nonexistent column', () => {
            // No matching wrapper/button -> false branch of the guard at line 305
            // (and `: null` alternate for icon at line 303).
            expect(() => CardPersistence.collapseColumn('nonexistent')).not.toThrow();
            expect(document.querySelector('[data-column="nonexistent"]')).toBeNull();
        });

        test('expandColumn should do nothing for a nonexistent column', () => {
            // False branch of the guard at line 328 (and `: null` alternate at 326).
            expect(() => CardPersistence.expandColumn('nonexistent')).not.toThrow();
            expect(document.querySelector('[data-column="nonexistent"]')).toBeNull();
        });

        test('toggleColumn should do nothing for a nonexistent column', () => {
            // False branch of `if (columnWrapper)` at line 348 -> saveCollapseStates
            // is never called.
            CardPersistence.toggleColumn('nonexistent');
            expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
        });

        test('collapseColumn should handle a column lacking content and badge elements', () => {
            // Wrapper + button + icon present, but no .column-content and no
            // .column-header span -> false branches of lines 314 and 315.
            document.body.innerHTML += `
                <div data-column="bare">
                    <button class="column-collapse-btn" data-column="bare">
                        <i class="fas fa-chevron-left"></i>
                    </button>
                </div>
            `;

            const wrapper = document.querySelector('[data-column="bare"]');
            const icon = wrapper.querySelector('.column-collapse-btn i');

            CardPersistence.collapseColumn('bare');

            // Guard passed (icon updated, collapsed class added) even without content/badge.
            expect(wrapper.classList.contains('column-collapsed')).toBe(true);
            expect(icon.className).toBe('fas fa-chevron-right');
        });

        test('expandColumn should handle a column lacking content and badge elements', () => {
            // Wrapper + button + icon present, but no .column-content and no
            // .column-header span -> false branches of lines 337 and 338.
            document.body.innerHTML += `
                <div data-column="bare2" class="column-collapsed">
                    <button class="column-collapse-btn" data-column="bare2">
                        <i class="fas fa-chevron-right"></i>
                    </button>
                </div>
            `;

            const wrapper = document.querySelector('[data-column="bare2"]');
            const icon = wrapper.querySelector('.column-collapse-btn i');

            CardPersistence.expandColumn('bare2');

            expect(wrapper.classList.contains('column-collapsed')).toBe(false);
            expect(icon.className).toBe('fas fa-chevron-left');
        });
    });

    describe('cleanupClosedIssuesFromStorage', () => {
        test('should return early when there is no saved order', () => {
            // localStorage has no cardOrder entry -> `if (!savedOrder) return;`
            // at line 377 (true branch).
            CardPersistence.cleanupClosedIssuesFromStorage();
            expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
        });

        test('should remove a closed issue from a non-done column and save', () => {
            // A closed issue in a non-done column gets filtered out and setItem
            // is called (lines 386 non-done, 391 found, 394 closed, 405 hasChanges).
            const backlog = document.getElementById('backlog');
            const closedCard = document.createElement('div');
            closedCard.className = 'bg-white border';
            closedCard.setAttribute('data-issue-number', '321');
            closedCard.setAttribute('data-issue-state', 'closed');
            backlog.appendChild(closedCard);

            const savedOrder = {
                backlog: ['321', '111'],
                todo: [],
                inprogress: [],
                review: [],
                done: ['999']
            };
            mockStore['cardOrder_super3_dashban'] = JSON.stringify(savedOrder);

            CardPersistence.cleanupClosedIssuesFromStorage();

            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'cardOrder_super3_dashban',
                expect.any(String)
            );
            const saved = JSON.parse(mockLocalStorage.setItem.mock.calls[0][1]);
            // Closed issue 321 removed; open/unknown 111 kept.
            expect(saved.backlog).toEqual(['111']);
            // The done column must be left untouched (false branch of line 386).
            expect(saved.done).toEqual(['999']);
        });

        test('should keep open issues and not save when there are no changes', () => {
            // Cards exist but are open (line 394 false) or have no matching DOM
            // element (line 391 false) -> hasChanges stays false (line 405 false).
            const backlog = document.getElementById('backlog');
            const openCard = document.createElement('div');
            openCard.className = 'bg-white border';
            openCard.setAttribute('data-issue-number', '200');
            openCard.setAttribute('data-issue-state', 'open');
            backlog.appendChild(openCard);

            const savedOrder = {
                backlog: ['200', 'missing-card'],
                todo: [],
                inprogress: [],
                review: [],
                done: []
            };
            mockStore['cardOrder_super3_dashban'] = JSON.stringify(savedOrder);

            CardPersistence.cleanupClosedIssuesFromStorage();

            // No closed issues found -> no changes -> setItem never called.
            expect(mockLocalStorage.setItem).not.toHaveBeenCalled();
        });

        test('should warn when localStorage access throws', () => {
            // getItem throws -> catch block at lines 408-409 logs a warning.
            mockLocalStorage.getItem = jest.fn(() => {
                throw new Error('Storage exploded');
            });

            expect(() => CardPersistence.cleanupClosedIssuesFromStorage()).not.toThrow();
            expect(console.warn).toHaveBeenCalledWith(
                'Failed to cleanup closed issues from localStorage:',
                expect.any(Error)
            );
        });
    });
});