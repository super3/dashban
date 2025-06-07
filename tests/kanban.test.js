// Helper to setup DOM with minimal markup
function setupDOM() {
  document.body.innerHTML = `
    <button id="addTaskBtn"></button>
    <div id="addTaskModal" class="hidden">
      <div>
        <form id="addTaskForm">
          <input id="taskTitle" />
          <textarea id="taskDescription"></textarea>
          <select id="taskPriority"><option>Low</option><option>Medium</option><option>High</option></select>
          <select id="taskCategory"><option>Frontend</option></select>
        </form>
        <button id="cancelTaskBtn"></button>
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
    require('../script.js');
    document.dispatchEvent(new Event('DOMContentLoaded'));
    api = global.testExports;
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
    const modal = document.getElementById('addTaskModal');
    const form = document.getElementById('addTaskForm');
    const resetSpy = jest.spyOn(form, 'reset');

    document.getElementById('addTaskBtn').click();
    expect(modal.classList.contains('hidden')).toBe(false);
    expect(document.body.style.overflow).toBe('hidden');

    document.getElementById('cancelTaskBtn').click();
    expect(modal.classList.contains('hidden')).toBe(true);
    expect(document.body.style.overflow).toBe('auto');
    expect(resetSpy).toHaveBeenCalled();
  });

  test('escape key closes modal', () => {
    const modal = document.getElementById('addTaskModal');
    document.getElementById('addTaskBtn').click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modal.classList.contains('hidden')).toBe(true);
  });
});
