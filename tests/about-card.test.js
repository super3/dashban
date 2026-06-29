// Tests for About Card functionality

describe('About Card Module', () => {
    let AboutCard;
    let originalConsole;
    let mockStore;
    let originalLocalStorage;
    let mockLocalStorage;
    
    beforeEach(() => {
        // Save originals
        originalConsole = global.console;
        originalLocalStorage = global.localStorage;
        
        // Mock console
        global.console = {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn()
        };
        
        // Set up DOM
        document.body.innerHTML = `
            <div id="todo"></div>
            <div id="done"></div>
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
        
        // Mock window functions
        global.window = {
            updateColumnCounts: jest.fn(),
            RepoManager: null,
            GitHubAuth: null,
            AboutCard: null
        };
        
        // Clear module cache and reload
        jest.resetModules();
        delete require.cache[require.resolve('../src/about-card.js')];
        require('../src/about-card.js');
        AboutCard = window.AboutCard;
    });
    
    afterEach(() => {
        global.console = originalConsole;
        global.localStorage = originalLocalStorage;
        delete global.window;
        jest.clearAllMocks();
        jest.resetModules();
    });

    describe('initialize', () => {
        test('should not throw when initialized once or twice', () => {
            expect(() => AboutCard.initialize()).not.toThrow();
            // Second call hits the early-return guard.
            expect(() => AboutCard.initialize()).not.toThrow();
        });
    });

    describe('getCurrentRepoContext', () => {
        test('should get context from RepoManager when available', () => {
            window.RepoManager = {
                repoState: {
                    currentRepo: { owner: 'test-owner', repo: 'test-repo' }
                }
            };
            
            AboutCard.saveAboutCardArchivedStatus(true);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aboutCardArchived_test-owner_test-repo', 'true');
        });

        test('should get context from localStorage when RepoManager not available', () => {
            window.RepoManager = null;
            mockStore['dashban_current_repo'] = JSON.stringify({ owner: 'local-owner', repo: 'local-repo' });
            
            // Reload module to pick up localStorage value
            jest.resetModules();
            delete require.cache[require.resolve('../src/about-card.js')];
            require('../src/about-card.js');
            AboutCard = window.AboutCard;
            
            AboutCard.saveAboutCardArchivedStatus(true);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aboutCardArchived_local-owner_local-repo', 'true');
        });

        test('should handle invalid JSON in localStorage', () => {
            window.RepoManager = null;
            
            // Make getItem return invalid JSON for specific key
            mockLocalStorage.getItem = jest.fn((key) => {
                if (key === 'dashban_current_repo') {
                    return 'invalid-json';
                }
                return mockStore[key] || null;
            });
            
            // Mock JSON.parse to throw for invalid JSON
            const originalParse = JSON.parse;
            global.JSON.parse = jest.fn((str) => {
                if (str === 'invalid-json') {
                    throw new SyntaxError('Unexpected token');
                }
                return originalParse(str);
            });
            
            // Reload module to trigger the error
            jest.resetModules();
            delete require.cache[require.resolve('../src/about-card.js')];
            require('../src/about-card.js');
            AboutCard = window.AboutCard;
            
            AboutCard.saveAboutCardArchivedStatus(true);
            
            expect(console.warn).toHaveBeenCalledWith('Failed to load current repo from localStorage:', expect.any(Error));
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aboutCardArchived_super3_dashban', 'true');

            // Restore
            global.JSON.parse = originalParse;
        });

        test('should fallback to GitHubAuth config', () => {
            window.RepoManager = null;
            window.GitHubAuth = {
                GITHUB_CONFIG: { owner: 'github-owner', repo: 'github-repo' }
            };
            
            AboutCard.saveAboutCardArchivedStatus(true);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aboutCardArchived_github-owner_github-repo', 'true');
        });

        test('should use default fallback', () => {
            window.RepoManager = null;
            window.GitHubAuth = null;

            AboutCard.saveAboutCardArchivedStatus(true);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aboutCardArchived_super3_dashban', 'true');
        });
    });

    describe('addArchiveButtonToAboutCard', () => {
        test('should add archive button to card', () => {
            const card = document.createElement('div');
            AboutCard.addArchiveButtonToAboutCard(card);
            
            const archiveBtn = card.querySelector('.archive-btn');
            expect(archiveBtn).toBeTruthy();
            expect(archiveBtn.getAttribute('data-card-type')).toBe('about');
        });

        test('should not add duplicate archive button', () => {
            const card = document.createElement('div');
            AboutCard.addArchiveButtonToAboutCard(card);
            AboutCard.addArchiveButtonToAboutCard(card);
            
            const buttons = card.querySelectorAll('.archive-btn');
            expect(buttons.length).toBe(1);
        });
    });

    describe('removeArchiveButtonFromAboutCard', () => {
        test('should remove archive button from card', () => {
            const card = document.createElement('div');
            AboutCard.addArchiveButtonToAboutCard(card);
            AboutCard.removeArchiveButtonFromAboutCard(card);
            
            expect(card.querySelector('.archive-btn')).toBeFalsy();
            expect(card.querySelector('.completed-section')).toBeFalsy();
        });

        test('should only remove About card archive button', () => {
            const card = document.createElement('div');
            card.innerHTML = `
                <div class="completed-section">
                    <button class="archive-btn" data-card-type="issue"></button>
                </div>
            `;
            
            AboutCard.removeArchiveButtonFromAboutCard(card);
            expect(card.querySelector('.completed-section')).toBeTruthy();
        });

        test('should handle missing completed section', () => {
            const card = document.createElement('div');
            expect(() => AboutCard.removeArchiveButtonFromAboutCard(card)).not.toThrow();
        });
    });

    describe('handleCardMoved (board event subscriber)', () => {
        function aboutEl() {
            const el = document.createElement('div');
            el.className = 'bg-white border';
            el.innerHTML = '<h4>About This Project</h4>';
            return el;
        }

        test('ignores a missing payload and same-column moves', () => {
            expect(() => AboutCard.handleCardMoved(undefined)).not.toThrow();
            expect(() => AboutCard.handleCardMoved({ movedBetweenColumns: false })).not.toThrow();
        });

        test('adds the archive button when the About card moves to done', () => {
            const el = aboutEl();
            AboutCard.handleCardMoved({ element: el, toColumnId: 'done', movedBetweenColumns: true });
            expect(el.querySelector('.archive-btn')).toBeTruthy();
        });

        test('removes the archive button when the About card moves out of done', () => {
            const el = aboutEl();
            AboutCard.addArchiveButtonToAboutCard(el);
            AboutCard.handleCardMoved({ element: el, toColumnId: 'todo', movedBetweenColumns: true });
            expect(el.querySelector('.archive-btn')).toBeFalsy();
        });

        test('does nothing for a non-About card', () => {
            const el = document.createElement('div');
            el.innerHTML = '<h4>Some Other Card</h4>';
            AboutCard.handleCardMoved({ element: el, toColumnId: 'done', movedBetweenColumns: true });
            expect(el.querySelector('.archive-btn')).toBeFalsy();
        });

        test('does nothing when the moved card has no title element', () => {
            const el = document.createElement('div'); // no <h4>
            expect(() => AboutCard.handleCardMoved({ element: el, toColumnId: 'done', movedBetweenColumns: true })).not.toThrow();
            expect(el.querySelector('.archive-btn')).toBeFalsy();
        });

        test('subscribes to card:moved when an EventBus is available at load', () => {
            const on = jest.fn();
            global.window.EventBus = { on };

            jest.resetModules();
            delete require.cache[require.resolve('../src/about-card.js')];
            require('../src/about-card.js');

            expect(on).toHaveBeenCalledWith('card:moved', expect.any(Function));
            delete global.window.EventBus;
        });
    });

    describe('checkAboutCardInDoneColumn', () => {
        test('should add archive button to About card in done column', () => {
            const doneColumn = document.getElementById('done');
            const aboutCard = document.createElement('div');
            aboutCard.className = 'bg-white border';
            aboutCard.setAttribute('data-card-id', 'about-card');
            aboutCard.innerHTML = '<h4>About</h4>';
            doneColumn.appendChild(aboutCard);
            
            AboutCard.checkAboutCardInDoneColumn();
            expect(aboutCard.querySelector('.archive-btn')).toBeTruthy();
        });

        test('should check cards without data-issue-number', () => {
            const doneColumn = document.getElementById('done');
            const aboutCard = document.createElement('div');
            aboutCard.className = 'bg-white border';
            aboutCard.innerHTML = '<h4>About Dashban</h4>';
            doneColumn.appendChild(aboutCard);
            
            AboutCard.checkAboutCardInDoneColumn();
            expect(aboutCard.querySelector('.archive-btn')).toBeTruthy();
        });

        test('should handle missing done column', () => {
            document.body.innerHTML = '';
            expect(() => AboutCard.checkAboutCardInDoneColumn()).not.toThrow();
        });

        test('should not add button to non-About cards', () => {
            const doneColumn = document.getElementById('done');
            const regularCard = document.createElement('div');
            regularCard.className = 'bg-white border';
            regularCard.innerHTML = '<h4>Regular Task</h4>';
            doneColumn.appendChild(regularCard);
            
            AboutCard.checkAboutCardInDoneColumn();
            expect(regularCard.querySelector('.archive-btn')).toBeFalsy();
        });
    });

    describe('saveAboutCardArchivedStatus', () => {
        test('should save archived status to localStorage', () => {
            AboutCard.saveAboutCardArchivedStatus(true);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aboutCardArchived_super3_dashban', 'true');
        });

        test('should handle localStorage error', () => {
            mockLocalStorage.setItem = jest.fn(() => {
                throw new Error('Storage full');
            });
            
            expect(() => AboutCard.saveAboutCardArchivedStatus(true)).not.toThrow();
            expect(console.warn).toHaveBeenCalledWith('Failed to save About card archived status to localStorage:', expect.any(Error));
        });
    });

    describe('loadAboutCardArchivedStatus', () => {
        test('should load archived status from localStorage', () => {
            mockStore['aboutCardArchived_super3_dashban'] = 'true';
            const result = AboutCard.loadAboutCardArchivedStatus();
            expect(result).toBe(true);
        });

        test('should return false when no saved status', () => {
            // Ensure the key doesn't exist
            delete mockStore['aboutCardArchived_super3_dashban'];
            mockLocalStorage.getItem = jest.fn((key) => {
                if (key === 'aboutCardArchived_super3_dashban') {
                    return null;
                }
                return mockStore[key] || null;
            });
            
            const result = AboutCard.loadAboutCardArchivedStatus();
            expect(result).toBe(false);
        });

        test('should handle localStorage error', () => {
            mockLocalStorage.getItem = jest.fn(() => {
                throw new Error('Storage error');
            });
            
            const result = AboutCard.loadAboutCardArchivedStatus();
            expect(result).toBe(false);
            expect(console.warn).toHaveBeenCalledWith('Failed to load About card archived status from localStorage:', expect.any(Error));
        });
    });

    describe('hideAboutCardIfArchived', () => {
        test('should hide About card if archived', () => {
            mockStore['aboutCardArchived_super3_dashban'] = 'true';
            const aboutCard = document.createElement('div');
            aboutCard.setAttribute('data-card-id', 'about-card');
            document.body.appendChild(aboutCard);
            
            AboutCard.hideAboutCardIfArchived();
            expect(document.querySelector('[data-card-id="about-card"]')).toBeFalsy();
            expect(window.updateColumnCounts).toHaveBeenCalled();
        });

        test('should not throw when archived card not found in DOM', () => {
            mockStore['aboutCardArchived_super3_dashban'] = 'true';

            // Archived but no card present: the in-DOM guard is false, so nothing
            // is removed and no counts update happens.
            expect(() => AboutCard.hideAboutCardIfArchived()).not.toThrow();
            expect(window.updateColumnCounts).not.toHaveBeenCalled();
        });

        test('should ensure About card exists if not archived', () => {
            // Clear all mocks first
            jest.clearAllMocks();
            
            // Ensure not archived - return null to simulate no saved state
            mockLocalStorage.getItem = jest.fn(() => null);

            // Call the function
            AboutCard.hideAboutCardIfArchived();

            // Not archived: ensureAboutCardExists should recreate the missing card.
            const todoColumn = document.getElementById('todo');
            const aboutCard = todoColumn.querySelector('[data-card-id="about-card"]');
            expect(aboutCard).toBeTruthy();
            expect(window.updateColumnCounts).toHaveBeenCalled();
        });
    });

    describe('ensureAboutCardExists', () => {
        test('should create About card if missing', () => {
            AboutCard.ensureAboutCardExists();
            
            const todoColumn = document.getElementById('todo');
            const aboutCard = todoColumn.querySelector('[data-card-id="about-card"]');
            expect(aboutCard).toBeTruthy();
            expect(window.updateColumnCounts).toHaveBeenCalled();
        });

        test('should not create duplicate About card', () => {
            const existingCard = document.createElement('div');
            existingCard.setAttribute('data-card-id', 'about-card');
            document.body.appendChild(existingCard);
            
            AboutCard.ensureAboutCardExists();
            
            const cards = document.querySelectorAll('[data-card-id="about-card"]');
            expect(cards.length).toBe(1);
        });

        test('should handle missing todo column', () => {
            document.body.innerHTML = '';
            // No todo column: the inner guard is false, so no card is created.
            expect(() => AboutCard.ensureAboutCardExists()).not.toThrow();
            expect(document.querySelector('[data-card-id="about-card"]')).toBeFalsy();
        });
    });

    describe('createAboutCardElement', () => {
        test('should create About card with all elements', () => {
            const card = AboutCard.createAboutCardElement();
            
            expect(card.getAttribute('data-card-id')).toBe('about-card');
            expect(card.className).toContain('bg-white border');
            expect(card.querySelector('h4').textContent).toBe('About');
            expect(card.querySelector('.bg-purple-100').textContent).toBe('INFO');
            expect(card.querySelector('strong').textContent).toBe('Dashban');
            
            const features = card.querySelectorAll('li');
            expect(features.length).toBe(3);
            
            const buttons = card.querySelectorAll('a');
            expect(buttons.length).toBe(2);
            expect(buttons[0].href).toContain('github.com/super3/dashban');
            expect(buttons[1].href).toContain('issues/new');
        });
    });

    describe('restoreAboutCard', () => {
        test('should restore About card to todo column', () => {
            mockStore['aboutCardArchived_super3_dashban'] = 'true';
            
            AboutCard.restoreAboutCard();
            
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aboutCardArchived_super3_dashban', 'false');
            const todoColumn = document.getElementById('todo');
            const aboutCard = todoColumn.querySelector('[data-card-id="about-card"]');
            expect(aboutCard).toBeTruthy();
            expect(window.updateColumnCounts).toHaveBeenCalled();
        });

        test('should not create duplicate when About card already visible', () => {
            const existingCard = document.createElement('div');
            existingCard.setAttribute('data-card-id', 'about-card');
            document.body.appendChild(existingCard);

            AboutCard.restoreAboutCard();

            const cards = document.querySelectorAll('[data-card-id="about-card"]');
            expect(cards.length).toBe(1);
        });

        test('should handle missing todo column', () => {
            mockStore['aboutCardArchived_super3_dashban'] = 'true';
            document.body.innerHTML = '';
            
            AboutCard.restoreAboutCard();
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aboutCardArchived_super3_dashban', 'false');
        });
    });

    describe('module exports', () => {
        test('should export all functions', () => {
            expect(AboutCard.initialize).toBeDefined();
            expect(AboutCard.addArchiveButtonToAboutCard).toBeDefined();
            expect(AboutCard.removeArchiveButtonFromAboutCard).toBeDefined();
            expect(AboutCard.checkAboutCardInDoneColumn).toBeDefined();
            expect(AboutCard.saveAboutCardArchivedStatus).toBeDefined();
            expect(AboutCard.loadAboutCardArchivedStatus).toBeDefined();
            expect(AboutCard.hideAboutCardIfArchived).toBeDefined();
            expect(AboutCard.ensureAboutCardExists).toBeDefined();
            expect(AboutCard.createAboutCardElement).toBeDefined();
            expect(AboutCard.restoreAboutCard).toBeDefined();
        });

        test('should work in Node.js environment', () => {
            const AboutCardModule = require('../src/about-card.js');
            expect(AboutCardModule).toBeDefined();
            expect(AboutCardModule.initialize).toBeDefined();
        });
    });

    describe('edge cases for full coverage', () => {
        test('should handle RepoManager with truthy but invalid structure', () => {
            window.RepoManager = { repoState: null };
            window.GitHubAuth = null;

            AboutCard.saveAboutCardArchivedStatus(true);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aboutCardArchived_super3_dashban', 'true');
        });

        test('should handle GitHubAuth without GITHUB_CONFIG', () => {
            window.RepoManager = null;
            window.GitHubAuth = {};

            AboutCard.saveAboutCardArchivedStatus(true);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aboutCardArchived_super3_dashban', 'true');
        });

        test('should handle localStorage without current repo key', () => {
            window.RepoManager = null;
            window.GitHubAuth = null;
            mockStore['dashban_current_repo'] = null;

            AboutCard.saveAboutCardArchivedStatus(true);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith('aboutCardArchived_super3_dashban', 'true');
        });
    });

    describe('branch coverage for defensive guards', () => {
        // Covers line 100 else-path: an "About" card that is NOT the about-card
        // and HAS a data-issue-number, so no archive button should be added.
        test('should not add archive button to About-titled card that has a data-issue-number', () => {
            const doneColumn = document.getElementById('done');
            const issueCard = document.createElement('div');
            issueCard.className = 'bg-white border';
            issueCard.setAttribute('data-issue-number', '42');
            issueCard.innerHTML = '<h4>About time fix</h4>';
            doneColumn.appendChild(issueCard);

            AboutCard.checkAboutCardInDoneColumn();
            expect(issueCard.querySelector('.archive-btn')).toBeFalsy();
        });

        // Covers line 146 else-path: archived card is present in DOM but
        // window.updateColumnCounts is NOT a function (graceful skip).
        test('should hide archived About card without calling non-function updateColumnCounts', () => {
            window.updateColumnCounts = 'not-a-function';
            mockStore['aboutCardArchived_super3_dashban'] = 'true';
            const aboutCard = document.createElement('div');
            aboutCard.setAttribute('data-card-id', 'about-card');
            document.body.appendChild(aboutCard);

            expect(() => AboutCard.hideAboutCardIfArchived()).not.toThrow();
            expect(document.querySelector('[data-card-id="about-card"]')).toBeFalsy();
        });

        // Covers line 170 else-path: About card recreated but
        // window.updateColumnCounts is NOT a function (graceful skip).
        test('should recreate About card without calling non-function updateColumnCounts', () => {
            window.updateColumnCounts = undefined;

            expect(() => AboutCard.ensureAboutCardExists()).not.toThrow();
            const todoColumn = document.getElementById('todo');
            expect(todoColumn.querySelector('[data-card-id="about-card"]')).toBeTruthy();
        });

        // Covers line 256 else-path: About card restored but
        // window.updateColumnCounts is NOT a function (graceful skip).
        test('should restore About card without calling non-function updateColumnCounts', () => {
            window.updateColumnCounts = null;
            mockStore['aboutCardArchived_super3_dashban'] = 'true';

            expect(() => AboutCard.restoreAboutCard()).not.toThrow();
            const todoColumn = document.getElementById('todo');
            expect(todoColumn.querySelector('[data-card-id="about-card"]')).toBeTruthy();
        });

        // Exercises the module-export guard's browser path (line 296 else-branch
        // behaviorally): when `module` is undefined the IIFE attaches AboutCard to
        // window only and skips the module.exports assignment without throwing.
        // NOTE: this runs an un-instrumented copy of the source in a vm sandbox
        // (the repo's established pattern), so it documents the browser behavior
        // but does not register against the instrumented coverage of line 296.
        test('should attach AboutCard to window and skip module.exports when module is undefined', () => {
            const fs = require('fs');
            const vm = require('vm');
            const code = fs.readFileSync(require.resolve('../src/about-card.js'), 'utf8');

            const fakeWindow = {};
            const sandbox = {
                console: { log: jest.fn(), warn: jest.fn(), error: jest.fn() },
                localStorage: { getItem: () => null, setItem: () => {} },
                document: {
                    getElementById: () => null,
                    querySelector: () => null,
                    querySelectorAll: () => []
                },
                window: fakeWindow
            };
            vm.createContext(sandbox);
            vm.runInContext('var module = undefined;\n' + code, sandbox);

            // The browser export path ran: AboutCard attached to window.
            expect(typeof fakeWindow.AboutCard).toBe('object');
            expect(typeof fakeWindow.AboutCard.initialize).toBe('function');
            expect(typeof fakeWindow.AboutCard.createAboutCardElement).toBe('function');
        });
    });
});