// app.js
let appData = null;
let currentEngine = null;
let currentProcedure = null;
let engineBackFn = null;
let libState = { category: null, subtype: null, manufacturer: null };

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
  window.scrollTo(0, 0);
}

// 3. Онбординг — drill-down: категории → модели
let eqState = { category: null, subtype: null };

function renderEquipmentCategories() {
  if (!appData) return;
  const savedEq = JSON.parse(localStorage.getItem('eg_equipment') || '[]');
  const cats = appData.categories.filter(cat =>
    appData.engines.some(e => e.categoryId === cat.id)
  );
  const list = document.getElementById('equipment-categories');
  list.innerHTML = cats.map(cat => {
    const enginesInCat = appData.engines.filter(e => e.categoryId === cat.id);
    const selectedCount = enginesInCat.filter(e => savedEq.includes(e.id)).length;
    const badgeClass = selectedCount > 0 ? 'has-selection' : '';
    return `
      <div class="category-card" onclick="openEquipmentCategory('${cat.id}')">
        <div class="cat-info">
          <span class="cat-name">${cat.name}</span>
          <span class="cat-select-badge ${badgeClass}">${selectedCount} of ${enginesInCat.length} selected</span>
        </div>
        <span class="proc-arrow">→</span>
      </div>`;
  }).join('');
  updateConfirmButtons();
}

function openEquipmentCategory(catId) {
  eqState.category = appData.categories.find(c => c.id === catId);
  eqState.subtype = null;
  const enginesInCat = appData.engines.filter(e => e.categoryId === catId);
  const hasSubtypes = enginesInCat.some(e => e.subtype);
  if (hasSubtypes) renderEquipmentSubtypes();
  else renderEquipmentModels();
  showScreen('screen-equipment-models');
}

function renderEquipmentSubtypes() {
  const enginesInCat = appData.engines.filter(e => e.categoryId === eqState.category.id);
  const subtypes = [...new Set(enginesInCat.map(e => e.subtype).filter(Boolean))];
  document.getElementById('equipment-models-title').textContent = eqState.category.name;
  document.getElementById('equipment-models-list').innerHTML = subtypes.map(st => {
    const count = enginesInCat.filter(e => e.subtype === st).length;
    return `
      <div class="procedure-card" onclick="openEquipmentSubtype('${st}')">
        <div>
          <span class="proc-name">${st}</span>
          <span style="display:block; font-size:11px; color:var(--text-dim); margin-top:2px;">${count} model${count !== 1 ? 's' : ''}</span>
        </div>
        <span class="proc-arrow">→</span>
      </div>`;
  }).join('');
  updateConfirmButtons();
}

function openEquipmentSubtype(subtype) {
  eqState.subtype = subtype;
  renderEquipmentModels();
}

function renderEquipmentModels() {
  const savedEq = JSON.parse(localStorage.getItem('eg_equipment') || '[]');
  let engines = appData.engines.filter(e => e.categoryId === eqState.category.id);
  if (eqState.subtype) engines = engines.filter(e => e.subtype === eqState.subtype);

  const title = eqState.category.name + (eqState.subtype ? ' • ' + eqState.subtype : '');
  document.getElementById('equipment-models-title').textContent = title;
  document.getElementById('equipment-models-list').innerHTML = engines.map(e => {
    const sel = savedEq.includes(e.id) ? 'selected' : '';
    return `
      <div class="equipment-card ${sel}" data-id="${e.id}" onclick="toggleEquipmentModel('${e.id}')">
        <div class="eq-info">
          <span class="eq-name">${e.manufacturer} ${e.model}${e.subtype && !eqState.subtype ? ` (${e.subtype})` : ''}</span>
        </div>
        <div class="checkbox"></div>
      </div>`;
  }).join('');
  updateConfirmButtons();
}

function toggleEquipmentModel(engineId) {
  const savedEq = JSON.parse(localStorage.getItem('eg_equipment') || '[]');
  const idx = savedEq.indexOf(engineId);
  if (idx >= 0) savedEq.splice(idx, 1);
  else savedEq.push(engineId);
  localStorage.setItem('eg_equipment', JSON.stringify(savedEq));
  renderEquipmentModels();
}

function equipmentBack() {
  if (eqState.subtype) {
    eqState.subtype = null;
    renderEquipmentSubtypes();
  } else {
    eqState.category = null;
    renderEquipmentCategories();
    showScreen('screen-equipment');
  }
}

function updateConfirmButtons() {
  const savedEq = JSON.parse(localStorage.getItem('eg_equipment') || '[]');
  const label = savedEq.length === 0
    ? 'Confirm Selection'
    : `Confirm (${savedEq.length} selected)`;
  const btn1 = document.getElementById('btn-save-equipment');
  const btn2 = document.getElementById('btn-save-equipment-models');
  if (btn1) btn1.textContent = label;
  if (btn2) btn2.textContent = label;
}

// 4. My Watch — сгруппировано по категориям
function renderMyWatch(searchQuery = '') {
  if (!appData) return;
  const savedEq = JSON.parse(localStorage.getItem('eg_equipment') || '[]');
  const q = searchQuery.toLowerCase();
  let html = '';

  appData.categories.forEach(cat => {
    const engines = appData.engines.filter(e =>
      e.categoryId === cat.id &&
      savedEq.includes(e.id) &&
      (e.manufacturer.toLowerCase().includes(q) ||
       e.model.toLowerCase().includes(q) ||
       cat.name.toLowerCase().includes(q))
    );
    if (engines.length === 0) return;
    html += `<div class="cat-group-header">${cat.name}</div>`;
    engines.forEach(engine => {
      html += `
        <div class="equipment-card" onclick="openEngine('${engine.id}')">
          <div class="eq-info">
            <span class="eq-name">${engine.manufacturer} ${engine.model}${engine.subtype ? ` (${engine.subtype})` : ''}</span>
          </div>
          <div class="proc-arrow">→</div>
        </div>`;
    });
  });

  const list = document.getElementById('watch-list');
  list.innerHTML = html || '<p style="text-align:center; color:var(--text-dim); margin-top:40px;">No equipment found.</p>';
}

// 5. Library — режим поиска (плоский) или drill-down (категории)
function renderLibrary(searchQuery = '') {
  if (!appData) return;
  const list = document.getElementById('library-list');

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    const results = appData.engines.filter(e =>
      e.manufacturer.toLowerCase().includes(q) ||
      e.model.toLowerCase().includes(q) ||
      (e.subtype && e.subtype.toLowerCase().includes(q))
    );
    if (results.length === 0) {
      list.innerHTML = '<p style="text-align:center; color:var(--text-dim); margin-top:40px;">No matches.</p>';
      return;
    }
    list.innerHTML = results.map(e => `
      <div class="equipment-card" onclick="openEngine('${e.id}', () => { showScreen('screen-library'); renderLibrary(document.getElementById('search-library').value); })">
        <div class="eq-info">
          <span class="eq-name">${e.manufacturer} ${e.model}${e.subtype ? ` (${e.subtype})` : ''}</span>
        </div>
        <div class="proc-arrow">→</div>
      </div>`).join('');
    return;
  }

  const cats = appData.categories.filter(cat =>
    appData.engines.some(e => e.categoryId === cat.id)
  );
  if (cats.length === 0) {
    list.innerHTML = '<p style="text-align:center; color:var(--text-dim); margin-top:40px;">No equipment in library.</p>';
    return;
  }
  list.innerHTML = cats.map(cat => {
    const count = appData.engines.filter(e => e.categoryId === cat.id).length;
    return `
      <div class="category-card" onclick="openLibraryCategory('${cat.id}')">
        <div class="cat-info">
          <span class="cat-name">${cat.name}</span>
          <span class="cat-count">${count} item${count !== 1 ? 's' : ''}</span>
        </div>
        <span class="proc-arrow">→</span>
      </div>`;
  }).join('');
}

// 6. Library — drill-down уровни
function openLibraryCategory(catId) {
  libState.category = appData.categories.find(c => c.id === catId);
  libState.subtype = null;
  libState.manufacturer = null;
  const enginesInCat = appData.engines.filter(e => e.categoryId === catId);
  const hasSubtypes = enginesInCat.some(e => e.subtype);
  if (hasSubtypes) renderLibrarySubtypes();
  else renderLibraryManufacturers();
  showScreen('screen-library-drill');
}

function openLibrarySubtype(subtype) {
  libState.subtype = subtype;
  renderLibraryManufacturers();
}

function openLibraryManufacturer(manuf) {
  libState.manufacturer = manuf;
  renderLibraryModels();
}

function renderLibrarySubtypes() {
  const enginesInCat = appData.engines.filter(e => e.categoryId === libState.category.id);
  const subtypes = [...new Set(enginesInCat.map(e => e.subtype).filter(Boolean))];
  const content = document.getElementById('library-drill-content');
  content.innerHTML = `
    <h2 class="screen-title" style="font-size:28px; margin-bottom:20px;">${libState.category.name}</h2>
    <div class="section-title">Type</div>
    <div class="procedure-list">
      ${subtypes.map(st => {
        const count = enginesInCat.filter(e => e.subtype === st).length;
        return `
          <div class="procedure-card" onclick="openLibrarySubtype('${st}')">
            <div>
              <span class="proc-name">${st}</span>
              <span style="display:block; font-size:11px; color:var(--text-dim); margin-top:2px;">${count} model${count !== 1 ? 's' : ''}</span>
            </div>
            <span class="proc-arrow">→</span>
          </div>`;
      }).join('')}
    </div>`;
}

function renderLibraryManufacturers() {
  let engines = appData.engines.filter(e => e.categoryId === libState.category.id);
  if (libState.subtype) engines = engines.filter(e => e.subtype === libState.subtype);
  const manufacturers = [...new Set(engines.map(e => e.manufacturer))].sort();
  const content = document.getElementById('library-drill-content');
  content.innerHTML = `
    <h2 class="screen-title" style="font-size:28px; margin-bottom:20px;">${libState.category.name}${libState.subtype ? ' • ' + libState.subtype : ''}</h2>
    <div class="section-title">Manufacturer</div>
    <div class="procedure-list">
      ${manufacturers.map(m => {
        const count = engines.filter(e => e.manufacturer === m).length;
        return `
          <div class="procedure-card" onclick="openLibraryManufacturer('${m.replace(/'/g, "\\'")}')">
            <div>
              <span class="proc-name">${m}</span>
              <span style="display:block; font-size:11px; color:var(--text-dim); margin-top:2px;">${count} model${count !== 1 ? 's' : ''}</span>
            </div>
            <span class="proc-arrow">→</span>
          </div>`;
      }).join('')}
    </div>`;
}

function renderLibraryModels() {
  let engines = appData.engines.filter(e => e.categoryId === libState.category.id);
  if (libState.subtype) engines = engines.filter(e => e.subtype === libState.subtype);
  if (libState.manufacturer) engines = engines.filter(e => e.manufacturer === libState.manufacturer);
  const content = document.getElementById('library-drill-content');
  content.innerHTML = `
    <h2 class="screen-title" style="font-size:28px; margin-bottom:20px;">${libState.manufacturer}</h2>
    <div class="section-title">Model</div>
    <div class="procedure-list">
      ${engines.map(e => `
        <div class="procedure-card" onclick="openEngine('${e.id}', () => { showScreen('screen-library-drill'); renderLibraryModels(); })">
          <span class="proc-name">${e.model}</span>
          <span class="proc-arrow">→</span>
        </div>`).join('')}
    </div>`;
}

function libraryBack() {
  if (libState.manufacturer) {
    libState.manufacturer = null;
    renderLibraryManufacturers();
  } else if (libState.subtype) {
    libState.subtype = null;
    renderLibrarySubtypes();
  } else {
    libState.category = null;
    showScreen('screen-library');
    renderLibrary();
  }
}

// 7. Открытие двигателя
function openEngine(engineId, backFn) {
  engineBackFn = backFn || null;
  currentEngine = appData.engines.find(e => e.id === engineId);
  if (!currentEngine) return;
  const content = document.getElementById('engine-details-content');

  let specsHTML = '';
  if (currentEngine.overview) {
    specsHTML = Object.entries(currentEngine.overview).map(([key, val]) => `
      <div class="spec-item">
        <span class="spec-label">${key.replace(/([A-Z])/g, ' $1').trim()}</span>
        <span class="spec-value">${val}</span>
      </div>`).join('');
  }

  let procsHTML = '';
  if (currentEngine.procedures && currentEngine.procedures.length > 0) {
    procsHTML = currentEngine.procedures.map(proc => `
      <div class="procedure-card" onclick="openProcedure('${proc.id}')">
        <span class="proc-name">${proc.name}</span>
        <span class="proc-arrow">→</span>
      </div>`).join('');
  } else {
    procsHTML = '<p style="color:var(--text-dim); font-size:14px;">No procedures added yet.</p>';
  }

  content.innerHTML = `
    <div class="engine-hero">
      <h2>${currentEngine.model}</h2>
      <div class="type">${currentEngine.manufacturer} • ${currentEngine.type}${currentEngine.subtype ? ' • ' + currentEngine.subtype : ''}</div>
      <div class="specs-grid">${specsHTML}</div>
    </div>
    <div class="section-title">Maintenance Procedures</div>
    <div class="procedure-list">${procsHTML}</div>`;

  showScreen('screen-engine');
}

function engineBack() {
  if (engineBackFn) engineBackFn();
  else { renderMyWatch(); showScreen('screen-watch'); }
}

// 8. Открытие процедуры
function openProcedure(procId) {
  if (!currentEngine) return;
  currentProcedure = currentEngine.procedures.find(p => p.id === procId);
  if (!currentProcedure) return;
  const content = document.getElementById('procedure-details-content');

  const partsHTML = (currentProcedure.parts || []).map(p => `
    <div class="list-item">
      <span class="item-title">${p.name}</span>
      <span class="item-desc">Action: <b>${p.action.toUpperCase()}</b> | Criteria: ${p.criteria}</span>
    </div>`).join('') || '<div class="list-item item-desc">No parts data.</div>';

  const clearancesHTML = (currentProcedure.clearances || []).map(c => `
    <div class="list-item">
      <span class="item-title">${c.name}</span>
      <span class="item-val">${c.min || '?'} - ${c.max || '?'} ${c.unit}</span>
    </div>`).join('');
  const torquesHTML = (currentProcedure.torques || []).map(t => `
    <div class="list-item">
      <span class="item-title">${t.name}</span>
      <span class="item-val">${t.value} ${t.unit}${t.pattern ? ` (${t.pattern})` : ''}</span>
    </div>`).join('');

  const limitsHTML = `
    <div class="section-title" style="margin-top:12px;">Clearances</div>
    <div class="list-group">${clearancesHTML || '<div class="list-item item-desc">No clearances data.</div>'}</div>
    <div class="section-title" style="margin-top:24px;">Torques</div>
    <div class="list-group">${torquesHTML || '<div class="list-item item-desc">No torques data.</div>'}</div>`;

  const stepsHTML = (currentProcedure.steps || []).map((step, index) => `
    <div class="step-item">
      <div class="step-num">${String(index + 1).padStart(2, '0')}</div>
      <div class="step-text">${step}</div>
    </div>`).join('') || '<p style="color:var(--text-dim);">No steps data.</p>';

  content.innerHTML = `
    <h2 class="screen-title" style="font-size:28px; margin-bottom:20px;">${currentProcedure.name}</h2>
    <div class="proc-tabs">
      <button class="proc-tab-btn active" onclick="switchProcTab('parts', this)">Parts</button>
      <button class="proc-tab-btn" onclick="switchProcTab('limits', this)">Limits</button>
      <button class="proc-tab-btn" onclick="switchProcTab('steps', this)">Steps</button>
    </div>
    <div id="tab-parts" class="proc-content active"><div class="list-group">${partsHTML}</div></div>
    <div id="tab-limits" class="proc-content">${limitsHTML}</div>
    <div id="tab-steps" class="proc-content">${stepsHTML}</div>`;

  showScreen('screen-procedure');
}

function switchProcTab(tabId, btn) {
  document.querySelectorAll('.proc-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.proc-content').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-' + tabId).classList.add('active');
}

function backToEngine() {
  openEngine(currentEngine.id, engineBackFn);
}

// 9. Онбординг — выбор роли
const roleCards = document.querySelectorAll('.role-card');
roleCards.forEach(card => {
  card.addEventListener('click', () => {
    localStorage.setItem('eg_role', card.getAttribute('data-role'));
    renderEquipmentCategories();
    showScreen('screen-equipment');
  });
});

// 10. Подтверждение выбора (кнопки на обоих экранах онбординга)
function confirmEquipmentSelection() {
  const savedEq = JSON.parse(localStorage.getItem('eg_equipment') || '[]');
  if (savedEq.length === 0) {
    alert('Please select at least one piece of equipment.');
    return;
  }
  renderMyWatch();
  showScreen('screen-watch');
}
document.getElementById('btn-save-equipment').addEventListener('click', confirmEquipmentSelection);
document.getElementById('btn-save-equipment-models').addEventListener('click', confirmEquipmentSelection);

// 11. Поиск
document.getElementById('search-watch').addEventListener('input', (e) => renderMyWatch(e.target.value));
document.getElementById('search-library').addEventListener('input', (e) => renderLibrary(e.target.value));

// 12. Reset
document.getElementById('btn-reset').addEventListener('click', () => {
  if (confirm('Reset app and select new rank/equipment?')) {
    localStorage.clear();
    location.reload();
  }
});

// 13. Нижняя навигация
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    if (target === 'screen-watch') renderMyWatch();
    if (target === 'screen-library') renderLibrary();
    showScreen(target);
  });
});

// 14. Запуск
window.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  const savedRole = localStorage.getItem('eg_role');
  const savedEq = JSON.parse(localStorage.getItem('eg_equipment') || '[]');
  if (savedRole && savedEq.length === 0) {
    renderEquipmentCategories();
    showScreen('screen-equipment');
  } else if (savedRole && savedEq.length > 0) {
    renderMyWatch();
    showScreen('screen-watch');
  }
});

// 15. Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW failed', err));
  });
}