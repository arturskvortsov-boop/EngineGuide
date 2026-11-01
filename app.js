// app.js

// 1. Логика Онбординга
const roleCards = document.querySelectorAll('.role-card');

roleCards.forEach(card => {
  card.addEventListener('click', () => {
    const selectedRole = card.getAttribute('data-role');
    
    // Сохраняем выбор в localStorage
    localStorage.setItem('eg_role', selectedRole);
    
    // Визуальный отклик (кратковременная вспышка перед переходом)
    card.style.transform = 'scale(0.98)';
    
    setTimeout(() => {
      card.style.transform = 'scale(1)';
      console.log(`Role saved: ${selectedRole}`);
      
      // Пока просто скрываем онбординг и пишем в консоль
      // На следующем шаге мы заменим это на переход к выбору оборудования
      document.getElementById('screen-onboarding').classList.remove('active');
      alert(`Welcome aboard, ${selectedRole.toUpperCase()}!`);
      
    }, 150);
  });
});

// 2. Проверка при загрузке (если роль уже выбрана, пропускаем онбординг)
window.addEventListener('DOMContentLoaded', () => {
  const savedRole = localStorage.getItem('eg_role');
  if (savedRole) {
    console.log(`User already onboarded as: ${savedRole}`);
    // На будущем шаге здесь будет редирект на главный экран
  }
});