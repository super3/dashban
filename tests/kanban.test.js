// Helper to setup DOM with minimal markup
function setupDOM() {
  document.body.innerHTML = `
    <button id="add-task-btn"></button>
    <div id="add-task-modal" class="hidden">
      <div>
        <form id="add-task-form">
          <input id="task-title" name="title" />
          <textarea id="task-description" name="description"></textarea>
          <select id="task-priority" name="priority"><option>Low</option><option>Medium</option><option>High</option></select>
          <select id="task-category" name="category"><option>Frontend</option></select>
          <select id="task-column" name="column"><option>backlog</option></select>
        </form>
        <button id="cancel-task"></button>
      </div>
    </div>
    <div class="column" data-column="info"><span class="px-2 py-1 rounded-full">0</span><div id="info"></div></div>
    <div class="column" data-column="backlog"><span class="px-2 py-1 rounded-full">0</span><div id="backlog"></div></div>
    <div class="column" data-column="inprogress"><span class="px-2 py-1 rounded-full">0</span><div id="inprogress"></div></div>
    <div class="column" data-column="review"><span class="px-2 py-1 rounded-full">0</span><div id="review"></div></div>
    <div class="column" data-column="done"><span class="px-2 py-1 rounded-full">0</span><div id="done"></div></div>
  `;
}

describe('Kanban DOM functions', () => {
  let api;

  beforeEach(() => {
    jest.resetModules();
    setupDOM();
    global.Sortable = jest.fn(() => ({ option: jest.fn() }));
    global.GitHubUtils = {
      parseBadgeSVG: jest.fn(async () => 'success'),
      getTimeAgo: jest.fn(() => '1m ago')
    };
    global.fetch = jest.fn(async () => ({ ok: true, text: async () => '<svg></svg>' }));
    console.error = jest.fn();
    console.log = jest.fn();
    require('../src/kanban.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    api = global.kanbanTestExports;
  });

  test('createTaskElement builds task DOM structure', () => {
    const el = api.createTaskElement('001', 'Test', 'Desc', 'High', 'Frontend');
    expect(el.querySelector('h4').textContent).toBe('Test');
    expect(el.querySelector('p').textContent).toBe('Desc');
    expect(el.querySelector('span.text-xs.text-gray-500').textContent).toBe('#001');
  });

  test('updateColumnCounts updates task numbers', () => {
    const backlog = document.getElementById('backlog');
    backlog.appendChild(document.createElement('div')).className = 'bg-white border';
    backlog.appendChild(document.createElement('div')).className = 'bg-white border';
    api.updateColumnCounts();
    const count = backlog.parentElement.querySelector('.px-2.py-1.rounded-full');
    expect(count.textContent).toBe('2');
  });

  test('modal open and close interactions', () => {
    const modal = document.getElementById('add-task-modal');
    const form = document.getElementById('add-task-form');
    const resetSpy = jest.spyOn(form, 'reset');

    document.getElementById('add-task-btn').click();
    expect(modal.classList.contains('hidden')).toBe(false);

    document.getElementById('cancel-task').click();
    expect(modal.classList.contains('hidden')).toBe(true);
    expect(resetSpy).toHaveBeenCalled();
  });

  test('escape key closes modal', () => {
    const modal = document.getElementById('add-task-modal');
    document.getElementById('add-task-btn').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modal.classList.contains('hidden')).toBe(true);
  });
});
