# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Dashban is a vanilla JavaScript Kanban board application with GitHub integration. The application runs entirely in the browser without any build process - simply open index.html.

## Essential Commands

```bash
# Run tests
npm test

# Generate coverage report
npm run test:coverage

# Run a specific test file
npm test tests/kanban.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="should create"
```

## Architecture

The application follows a modular architecture with clear separation of concerns:

- **kanban.js**: Core board functionality including drag-and-drop, column management, and persistence
- **github.js**: Orchestrates GitHub integration, coordinating between API, auth, and UI modules
- **github-api.js**: Handles all GitHub API interactions
- **github-auth.js**: Manages GitHub authentication and token storage
- **github-ui.js**: Renders GitHub-related UI components
- **issue-modal.js**: Modal dialog for creating/editing issues
- **status-cards.js**: Status monitoring cards for deployment and CI/CD

Key architectural patterns:
- Event-driven communication between modules
- LocalStorage for persistence (cards, column states, auth tokens)
- No build process - all modules use browser-native ES6 imports
- DOM manipulation using vanilla JavaScript (no framework)

## GitHub Integration

The application integrates with GitHub using fine-grained Personal Access Tokens. When working with GitHub features:

1. Token permissions required: `issues` (read/write) and `metadata` (read)
2. Labels are automatically managed based on column (todo, in-progress, etc.) and priority
3. Issue state (open/closed) is synchronized with column placement
4. The integration supports creating issues, updating them, and adding comments

## Testing Approach

Tests use Jest with jsdom environment. Key testing patterns:

1. Mock setup in tests/setup.js provides DOM APIs and localStorage
2. Each module has a corresponding test file (e.g., kanban.js → kanban.test.js)
3. Tests focus on DOM manipulation, event handling, and API interactions
4. Use `beforeEach` to reset DOM and localStorage state

## Development Workflow

1. Make changes to any .js file in src/
2. Refresh browser to see changes (no build required)
3. Run tests with `npm test` to ensure nothing breaks
4. The 'done' column is collapsed by default - this is intentional behavior

## Testing Requirements

- Run `npm test` before starting any task to establish baseline
- Run `npm test` after completing each task
- All tests must pass before considering work complete
- Code coverage should not decrease - run `npm run test:coverage` to verify

## Deployment

- Push to main branch automatically deploys to GitHub Pages via GitHub Actions
- No build process - the entire repository is deployed as-is
- Status monitoring cards on the board show deployment and test status