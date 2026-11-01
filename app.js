// app.js
let appData = null;

// 1. Загрузка данных из JSON
async function loadData() {
  try {
    const res = await fetch('data.json');
    appData = await res.json();
  } catch (e) {
    console.error('Failed to load data.json', e);
  }
}

// 2. Управление экранами
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) target.classList.add('active');

  // Показывать нижнее меню только на главных экранах
  const bottomNav = document.getElementById('bottom-nav');
  if (screenId === 'screen-watch' || screenId === 'screen-library') {
    bottomNav.style.display = 'flex';
    // Обновить активную кнопку в меню
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.target === screenId);
    });
  } else {
    bottomNav.style.display = 'none';
  }
}

// 3. Отрисовка списка оборудования (Выбор)
function renderEquipmentList() {
  if (!appData || !appData.engines) return;
  const list = document.getElementById('equipment-list');
  list.innerHTML = '';
  const savedEq = JSON.parse(localStorage.getItem('eg_equipment') || '[]');

  appData.engines.forEach((engine) => {
    const card = document.createElement('div');
    card.className = 'equipment-card';
    card.dataset.id = engine.id;
    if (savedEq.includes(engine.id)) card.classList.add('selected');

    card.innerHTML = `
      <div class="eq-info">
        <span class="eq-name">${engine.manufacturer} ${engine.model}</span>
        <span class="eq-type">${engine.type}</span>
      </div>
      <div class="checkbox"></div>
    `;
    card.addEventListener('click', () => card.classList.toggle('selected'));
    list.appendChild(card);
  });
}

// 4. Отрисовка экрана My Watch
function renderMyWatch(searchQuery = '') {
  if (!appData || !appData.engines) return;
  const list = document.getElementById('watch-list');
  list.innerHTML = '';
  
  const savedEq = JSON.parse(localStorage.getItem('eg_equipment') || '[]');
  
  // Фильтруем: только выбранное оборудование + поиск
  const filtered = appData.engines.filter(engine => {
    const isSelected = savedEq.includes(engine.id);
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      engine.manufacturer.toLowerCase().includes(query) || 
      engine.model.toLowerCase().includes(query) ||
      engine.type.toLowerCase().includes(query);
    return isSelected && matchesSearch;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<p style="text-align:center; color:var(--text-dim); margin-top:40px;">No equipment found.</p>`;
    return;
  }

  filtered.forEach((engine, index) => {
    const card = document.createElement('div');
    card.className = 'equipment-card';
    card.style.animation = `cardSlideUp 600ms var(--ease) forwards ${index * 50}ms`;
    card.style.opacity = '0';
    
    card.innerHTML = `
      <div class="eq-info">
        <span class="eq-name">${engine.manufacturer} ${engine.model}</span>
        <span class="eq-type">${engine.type}</span>
      </div>
    `;
    // Пока карточка не кликабельна (на будущем шаге добавим переход в процедуры)
    list.appendChild(card);
  });
}

// 5. Логика онбординга (Выбор роли)
const roleCards = document.querySelectorAll('.role-card');
roleCards.forEach(card => {
  card.addEventListener('click', () => {
    const selectedRole = card.getAttribute('data-role');
    localStorage.setItem('eg_role', selectedRole);
    renderEquipmentList();
    showScreen('screen-equipment');
  });
});

// 6. Логика кнопки "Confirm Selection"
document.getElementById('btn-save-equipment').addEventListener('click', () => {
  const selected = [];
  document.querySelectorAll('.equipment-card.selected').forEach(card => {
    selected.push(card.dataset.id);
  });
  localStorage.setItem('eg_equipment', JSON.stringify(selected));
  
  // Переходим в My Watch
  renderMyWatch();
  showScreen('screen-watch');
});

// 7. Поиск на экране My Watch
document.getElementById('search-watch').addEventListener('input', (e) => {
  renderMyWatch(e.target.value);
});

// 8. Кнопка Reset (Сброс)
document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Are you sure you want to reset and select a new rank/equipment?')) {
    localStorage.clear();
    location.reload();
  }
});

// 9. Нижняя навигация
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    if (target === 'screen-watch') renderMyWatch();
    showScreen(target);
  });
});

// 10. Запуск при загрузке
window.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  
  const savedRole = localStorage.getItem('eg_role');
  const savedEq = JSON.parse(localStorage.getItem('eg_equipment') || '[]');
  
  // Если роль есть, но оборудование не выбрано — кидаем на выбор оборудования
  if (savedRole && savedEq.length === 0) {
    renderEquipmentList();
    showScreen('screen-equipment');
  } 
  // Если всё выбрано — сразу в My Watch
  else if (savedRole && savedEq.length > 0) {
    renderMyWatch();
    showScreen('screen-watch');
  }
});