// app.js
let appData = null;
let currentEngine = null;
let currentProcedure = null;

// 1. Загрузка данных
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

  const bottomNav = document.getElementById('bottom-nav');
  if (screenId === 'screen-watch' || screenId === 'screen-library') {
    bottomNav.style.display = 'flex';
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.target === screenId);
    });
  } else {
    bottomNav.style.display = 'none';
  }
  window.scrollTo(0, 0); // Скролл вверх при смене экрана
}

// 3. Отрисовка списка выбора (Онбординг)
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

// 4. Отрисовка My Watch
function renderMyWatch(searchQuery = '') {
  if (!appData || !appData.engines) return;
  const list = document.getElementById('watch-list');
  list.innerHTML = '';
  const savedEq = JSON.parse(localStorage.getItem('eg_equipment') || '[]');
  
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
    card.onclick = () => openEngine(engine.id); // Клик открывает двигатель
    
    card.innerHTML = `
      <div class="eq-info">
        <span class="eq-name">${engine.manufacturer} ${engine.model}</span>
        <span class="eq-type">${engine.type}</span>
      </div>
      <div class="proc-arrow">→</div>
    `;
    list.appendChild(card);
  });
}

// 5. Отрисовка Библиотеки (Все механизмы)
function renderLibrary(searchQuery = '') {
  if (!appData || !appData.engines) return;
  const list = document.getElementById('library-list');
  list.innerHTML = '';
  
  const filtered = appData.engines.filter(engine => {
    const query = searchQuery.toLowerCase();
    return engine.manufacturer.toLowerCase().includes(query) || 
           engine.model.toLowerCase().includes(query) ||
           engine.type.toLowerCase().includes(query);
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
    card.onclick = () => openEngine(engine.id);
    
    card.innerHTML = `
      <div class="eq-info">
        <span class="eq-name">${engine.manufacturer} ${engine.model}</span>
        <span class="eq-type">${engine.type}</span>
      </div>
      <div class="proc-arrow">→</div>
    `;
    list.appendChild(card);
  });
}

// 6. Открытие Двигателя (Обзор + Процедуры)
function openEngine(engineId) {
  currentEngine = appData.engines.find(e => e.id === engineId);
  if (!currentEngine) return;
  
  const content = document.getElementById('engine-details-content');
  
  // Рендерим обзор (Specs)
  let specsHTML = '';
  if (currentEngine.overview) {
    specsHTML = Object.entries(currentEngine.overview).map(([key, val]) => `
      <div class="spec-item">
        <span class="spec-label">${key.replace(/([A-Z])/g, ' $1').trim()}</span>
        <span class="spec-value">${val}</span>
      </div>
    `).join('');
  }

  // Рендерим процедуры
  let procsHTML = '';
  if (currentEngine.procedures && currentEngine.procedures.length > 0) {
    procsHTML = currentEngine.procedures.map(proc => `
      <div class="procedure-card" onclick="openProcedure('${proc.id}')">
        <span class="proc-name">${proc.name}</span>
        <span class="proc-arrow">→</span>
      </div>
    `).join('');
  } else {
    procsHTML = `<p style="color:var(--text-dim); font-size:14px;">No procedures added yet.</p>`;
  }

  content.innerHTML = `
    <div class="engine-hero">
      <h2>${currentEngine.model}</h2>
      <div class="type">${currentEngine.manufacturer} • ${currentEngine.type}</div>
      <div class="specs-grid">${specsHTML}</div>
    </div>
    <div class="section-title">Maintenance Procedures</div>
    <div class="procedure-list">${procsHTML}</div>
  `;
  
  showScreen('screen-engine');
}

// 7. Открытие Процедуры (Вкладки Parts / Limits / Steps)
function openProcedure(procId) {
  if (!currentEngine) return;
  currentProcedure = currentEngine.procedures.find(p => p.id === procId);
  if (!currentProcedure) return;

  const content = document.getElementById('procedure-details-content');
  
  // Вкладка 1: Parts
  const partsHTML = (currentProcedure.parts || []).map(p => `
    <div class="list-item">
      <span class="item-title">${p.name}</span>
      <span class="item-desc">Action: <b>${p.action.toUpperCase()}</b> | Criteria: ${p.criteria}</span>
    </div>
  `).join('') || '<p style="color:var(--text-dim); padding:16px;">No parts data.</p>';

  // Вкладка 2: Limits (Clearances & Torques)
  const clearancesHTML = (currentProcedure.clearances || []).map(c => `
    <div class="list-item">
      <span class="item-title">${c.name}</span>
      <span class="item-val">${c.min || '?'} - ${c.max || '?'} ${c.unit}</span>
    </div>
  `).join('');
  
  const torquesHTML = (currentProcedure.torques || []).map(t => `
    <div class="list-item">
      <span class="item-title">${t.name}</span>
      <span class="item-val">${t.value} ${t.unit} ${t.pattern ? `(${t.pattern})` : ''}</span>
    </div>
  `).join('');
  
  const limitsHTML = `
    <div class="section-title" style="margin-top:12px;">Clearances</div>
    <div class="list-group">${clearancesHTML || '<div class="list-item item-desc">No clearances data.</div>'}</div>
    <div class="section-title" style="margin-top:24px;">Torques</div>
    <div class="list-group">${torquesHTML || '<div class="list-item item-desc">No torques data.</div>'}</div>
  `;

  // Вкладка 3: Steps
  const stepsHTML = (currentProcedure.steps || []).map((step, index) => `
    <div class="step-item">
      <div class="step-num">${String(index + 1).padStart(2, '0')}</div>
      <div class="step-text">${step}</div>
    </div>
  `).join('') || '<p style="color:var(--text-dim);">No steps data.</p>';

  content.innerHTML = `
    <h2 class="screen-title" style="font-size:28px; margin-bottom:20px;">${currentProcedure.name}</h2>
    
    <div class="proc-tabs">
      <button class="proc-tab-btn active" onclick="switchProcTab('parts')">Parts</button>
      <button class="proc-tab-btn" onclick="switchProcTab('limits')">Limits</button>
      <button class="proc-tab-btn" onclick="switchProcTab('steps')">Steps</button>
    </div>

    <div id="tab-parts" class="proc-content active">
      <div class="list-group">${partsHTML}</div>
    </div>
    <div id="tab-limits" class="proc-content">
      ${limitsHTML}
    </div>
    <div id="tab-steps" class="proc-content">
      ${stepsHTML}
    </div>
  `;

  showScreen('screen-procedure');
}

// 8. Переключение вкладок внутри процедуры
function switchProcTab(tabId) {
  document.querySelectorAll('.proc-tab-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.proc-content').forEach(c => c.classList.remove('active'));
  
  event.target.classList.add('active');
  document.getElementById('tab-' + tabId).classList.add('active');
}

// 9. Кнопка "Назад" из процедуры в двигатель
function backToEngine() {
  showScreen('screen-engine');
}

// 10. Логика онбординга
const roleCards = document.querySelectorAll('.role-card');
roleCards.forEach(card => {
  card.addEventListener('click', () => {
    const selectedRole = card.getAttribute('data-role');
    localStorage.setItem('eg_role', selectedRole);
    renderEquipmentList();
    showScreen('screen-equipment');
  });
});

// 11. Подтверждение выбора оборудования
document.getElementById('btn-save-equipment').addEventListener('click', () => {
  const selected = [];
  document.querySelectorAll('.equipment-card.selected').forEach(card => {
    selected.push(card.dataset.id);
  });
  localStorage.setItem('eg_equipment', JSON.stringify(selected));
  renderMyWatch();
  showScreen('screen-watch');
});

// 12. Поиск
document.getElementById('search-watch').addEventListener('input', (e) => {
  renderMyWatch(e.target.value);
});
document.getElementById('search-library').addEventListener('input', (e) => {
  renderLibrary(e.target.value);
});

// 13. Сброс
document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Reset app and select new rank/equipment?')) {
    localStorage.clear();
    location.reload();
  }
});

// 14. Нижняя навигация
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    if (target === 'screen-watch') renderMyWatch();
    if (target === 'screen-library') renderLibrary();
    showScreen(target);
  });
});

// 15. Запуск
window.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  
  const savedRole = localStorage.getItem('eg_role');
  const savedEq = JSON.parse(localStorage.getItem('eg_equipment') || '[]');
  
  if (savedRole && savedEq.length === 0) {
    renderEquipmentList();
    showScreen('screen-equipment');
  } 
  else if (savedRole && savedEq.length > 0) {
    renderMyWatch();
    showScreen('screen-watch');
  }
});

// 16. Регистрация Service Worker для offline-режима
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW failed', err));
  });
}