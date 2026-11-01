// app.js
let appData = null;

// 1. Загрузка данных из JSON
async function loadData() {
  try {
    const res = await fetch('data.json');
    appData = await res.json();
    console.log('Data loaded');
  } catch (e) {
    console.error('Failed to load data.json', e);
  }
}

// 2. Управление экранами
function showScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId).classList.add('active');
}

// 3. Отрисовка списка оборудования
function renderEquipmentList() {
  if (!appData || !appData.engines) return;
  const list = document.getElementById('equipment-list');
  list.innerHTML = '';
  
  // Получаем ранее сохраненные механизмы (если есть)
  const savedEq = JSON.parse(localStorage.getItem('eg_equipment') || '[]');

  appData.engines.forEach((engine) => {
    const card = document.createElement('div');
    card.className = 'equipment-card';
    card.dataset.id = engine.id;
    
    // Если механизм уже был выбран ранее, ставим галочку
    if (savedEq.includes(engine.id)) {
      card.classList.add('selected');
    }

    card.innerHTML = `
      <div class="eq-info">
        <span class="eq-name">${engine.manufacturer} ${engine.model}</span>
        <span class="eq-type">${engine.type}</span>
      </div>
      <div class="checkbox"></div>
    `;
    
    // Клик по карточке переключает галочку
    card.addEventListener('click', () => {
      card.classList.toggle('selected');
    });
    
    list.appendChild(card);
  });
}

// 4. Логика онбординга (Выбор роли)
const roleCards = document.querySelectorAll('.role-card');
roleCards.forEach(card => {
  card.addEventListener('click', () => {
    const selectedRole = card.getAttribute('data-role');
    localStorage.setItem('eg_role', selectedRole);
    
    // Переключаем экран на выбор оборудования
    renderEquipmentList();
    showScreen('screen-equipment');
  });
});

// 5. Логика кнопки "Confirm Selection"
document.getElementById('btn-save-equipment').addEventListener('click', () => {
  const selected = [];
  document.querySelectorAll('.equipment-card.selected').forEach(card => {
    selected.push(card.dataset.id);
  });
  
  localStorage.setItem('eg_equipment', JSON.stringify(selected));
  console.log('Saved equipment:', selected);
  
  alert(`Selected ${selected.length} items! Next: My Watch screen.`);
});

// 6. Запуск при загрузке страницы
window.addEventListener('DOMContentLoaded', async () => {
  await loadData();
  
  // Если роль уже выбрана (например, перезагрузили страницу), сразу кидаем на выбор оборудования
  const savedRole = localStorage.getItem('eg_role');
  if (savedRole) {
    renderEquipmentList();
    showScreen('screen-equipment');
  }
});