/* -------------------- app.js -------------------- */
let todos = [];
let currentFilter = 'all';
let editId = null;

const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const filterBtns = document.querySelectorAll('.filter-btn');
const emptyState = document.getElementById('emptyState');
const emptyMessage = document.getElementById('emptyMessage');
const taskCountSpan = document.getElementById('taskCount');
const clearCompletedBtn = document.getElementById('clearCompletedBtn');
const messageBox = document.getElementById('messageBox');
const ringFill = document.getElementById('ringFill');
const ringText = document.getElementById('ringText');
const countAll = document.getElementById('countAll');
const countActive = document.getElementById('countActive');
const countCompleted = document.getElementById('countCompleted');

const STORAGE_KEY = 'glass_todo_premium_v2';

/* ---------- Storage ---------- */
function loadTodos() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        todos = parsed
          .filter(item => item && typeof item.id === 'string' && typeof item.text === 'string')
          .map(item => ({
            id: item.id,
            text: item.text.trim(),
            completed: !!item.completed,
          }));
      }
    }
  } catch (e) {
    console.warn('Failed to load todos', e);
    todos = [];
  }
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (e) {
    console.warn('Could not save todos', e);
  }
}

/* ---------- Utils ---------- */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

function showMessage(msg, isError = true) {
  messageBox.textContent = msg;
  messageBox.style.color = isError ? 'var(--danger)' : 'var(--success)';
  if (window.msgTimeout) clearTimeout(window.msgTimeout);
  window.msgTimeout = setTimeout(() => {
    messageBox.textContent = '';
  }, 2500);
}

function clearMessage() {
  messageBox.textContent = '';
  if (window.msgTimeout) clearTimeout(window.msgTimeout);
}

function isDuplicateTask(text, excludeId = null) {
  const normalized = text.trim().toLowerCase();
  return todos.some(t => t.id !== excludeId && t.text.trim().toLowerCase() === normalized);
}

/* ---------- Filtering ---------- */
function getFilteredTodos() {
  if (currentFilter === 'active') return todos.filter(t => !t.completed);
  if (currentFilter === 'completed') return todos.filter(t => t.completed);
  return todos;
}

/* ---------- Stats & UI ---------- */
function updateStats() {
  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const active = total - completed;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  taskCountSpan.textContent = `${active} active · ${completed} done`;
  countAll.textContent = total;
  countActive.textContent = active;
  countCompleted.textContent = completed;

  ringFill.setAttribute('stroke-dasharray', `${percent}, 100`);
  ringText.textContent = `${percent}%`;
}

function updateEmptyState() {
  const filtered = getFilteredTodos();
  if (filtered.length === 0) {
    todoList.classList.add('hidden');
    emptyState.classList.remove('hidden');
    if (currentFilter === 'all') {
      emptyMessage.textContent = 'Your task list is empty';
      emptyState.querySelector('.empty-hint').textContent = 'Add your first task to get started';
    } else if (currentFilter === 'active') {
      emptyMessage.textContent = 'No active tasks ✨';
      emptyState.querySelector('.empty-hint').textContent = 'All caught up! Great work.';
    } else {
      emptyMessage.textContent = 'No completed tasks yet';
      emptyState.querySelector('.empty-hint').textContent = 'Finish a task to see it here.';
    }
  } else {
    todoList.classList.remove('hidden');
    emptyState.classList.add('hidden');
  }
}

/* ---------- SVG Icons ---------- */
const editIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const deleteIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

/* ---------- Render ---------- */
function render() {
  const filtered = getFilteredTodos();
  todoList.innerHTML = '';

  filtered.forEach(todo => {
    const li = document.createElement('li');
    li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
    li.dataset.id = todo.id;

    // Checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'todo-check';
    checkbox.checked = todo.completed;
    checkbox.setAttribute('aria-label', `Mark task as ${todo.completed ? 'incomplete' : 'complete'}`);
    checkbox.addEventListener('change', () => toggleCompleted(todo.id));

    // Text or Edit Input
    let content;
    if (editId === todo.id) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'edit-input';
      input.value = todo.text;
      input.maxLength = 100;
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); commitEdit(todo.id, input.value); }
        else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
      });
      input.addEventListener('blur', () => {
        setTimeout(() => { if (editId === todo.id) commitEdit(todo.id, input.value); }, 150);
      });
      content = input;
      setTimeout(() => { input.focus(); input.select(); }, 0);
    } else {
      const span = document.createElement('span');
      span.className = 'todo-text';
      span.textContent = todo.text;
      span.addEventListener('click', () => toggleCompleted(todo.id));
      content = span;
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'todo-actions';

    if (editId !== todo.id) {
      const editBtn = document.createElement('button');
      editBtn.className = 'edit-btn';
      editBtn.innerHTML = editIcon;
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.addEventListener('click', (e) => { e.stopPropagation(); startEdit(todo.id); });

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.innerHTML = deleteIcon;
      delBtn.setAttribute('aria-label', 'Delete task');
      delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteTodo(todo.id); });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
    } else {
      const hint = document.createElement('span');
      hint.className = 'edit-hint';
      hint.textContent = '↵ save';
      actions.appendChild(hint);
    }

    li.appendChild(checkbox);
    li.appendChild(content);
    li.appendChild(actions);
    todoList.appendChild(li);
  });

  updateEmptyState();
  updateStats();
}

/* ---------- CRUD ---------- */
function addTodo() {
  const text = todoInput.value.trim();

  if (!text) { showMessage('Task cannot be empty'); todoInput.focus(); return; }
  if (text.length > 100) { showMessage('Max 100 characters allowed'); return; }
  if (isDuplicateTask(text)) {
    showMessage('Duplicate task — try a different name');
    todoInput.value = '';
    todoInput.focus();
    return;
  }

  clearMessage();
  todos.push({ id: generateId(), text, completed: false });
  saveTodos();
  todoInput.value = '';
  todoInput.focus();
  render();
}

function toggleCompleted(id) {
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    saveTodos();
    render();
  }
}

function deleteTodo(id) {
  todos = todos.filter(t => t.id !== id);
  if (editId === id) editId = null;
  saveTodos();
  render();
}

function startEdit(id) {
  editId = id;
  render();
}

function commitEdit(id, newText) {
  if (editId !== id) return;
  const trimmed = newText.trim();

  if (!trimmed) { showMessage('Task cannot be empty'); editId = null; render(); return; }
  if (trimmed.length > 100) { showMessage('Max 100 characters allowed'); editId = null; render(); return; }
  if (isDuplicateTask(trimmed, id)) { showMessage('Duplicate task — try a different name'); editId = null; render(); return; }

  const todo = todos.find(t => t.id === id);
  if (todo) todo.text = trimmed;
  saveTodos();
  editId = null;
  clearMessage();
  render();
}

function cancelEdit() {
  editId = null;
  render();
}

/* ---------- Filter ---------- */
function setFilter(filter) {
  if (filter === currentFilter) return;
  currentFilter = filter;
  filterBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === filter);
  });
  if (editId) editId = null;
  render();
}

/* ---------- Clear Completed ---------- */
function clearCompleted() {
  const completedCount = todos.filter(t => t.completed).length;
  if (completedCount === 0) {
    showMessage('No completed tasks to clear', false);
    return;
  }
  todos = todos.filter(t => !t.completed);
  if (editId && !todos.some(t => t.id === editId)) editId = null;
  saveTodos();
  render();
  showMessage(`Cleared ${completedCount} task${completedCount > 1 ? 's' : ''}`, false);
}

/* ---------- Init ---------- */
function init() {
  loadTodos();
  render();

  addBtn.addEventListener('click', addTodo);

  todoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTodo(); }
  });

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter));
  });

  clearCompletedBtn.addEventListener('click', clearCompleted);

  todoInput.focus();
}

init();