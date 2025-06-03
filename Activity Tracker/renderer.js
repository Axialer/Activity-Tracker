//renderer.js
// Инициализация времени начала отслеживания
// const startTime = new Date(); // Удаляем эту строку
// document.getElementById('activeSince').textContent =
//     startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

import { initNotes, renderNotes } from './js/notes.js';
import { initDashboard, updateSummaryList, createOrUpdateActivityChart, updateTotalTrackerRunningTime, updateCurrentTime, activityChart, latestActivityData } from './js/dashboard.js';
import { initTheme, updateThemeIcon } from './js/theme.js';

// Переменная для хранения времени запуска приложения (как Date объект)
// let appLaunchTime = null; // Перемещено в dashboard.js

// Добавим в начало файла
// let notes = []; // Перемещено в notes.js
// let notificationTimer = null; // Перемещено в notes.js
// let currentEditingNoteId = null; // Перемещено в notes.js
let noteModal = null; // Остается здесь, так как modalElements привязывается к DOM в renderer.js
// let latestActivityData = {}; // Перемещено в dashboard.js

// Обработчик получения времени запуска из main.js
// window.electronAPI.onAppStartTime((event, timeString) => { // Перемещено в dashboard.js
//     appLaunchTime = new Date(timeString); // Сохраняем время запуска // Перемещено в dashboard.js
//     // Обновляем текст сразу после получения времени запуска // Перемещено в dashboard.js
//     updateTotalTrackerRunningTime(); // Обновляем время трекера при получении времени запуска // Перемещено в dashboard.js
// }); // Перемещено в dashboard.js

// Функция для обновления реального времени в элементе Active Since
// function updateCurrentTime() { // Перемещено в dashboard.js
// ... // Перемещено в dashboard.js
// } // Перемещено в dashboard.js

// Обновляем время каждую секунду
// setInterval(updateCurrentTime, 1000); // Перемещено в dashboard.js

// ... (Комментарии о перемещенных функциях заметок)

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded event fired in renderer.js');
    console.log('AddNoteFab exists:', !!document.getElementById('addNoteFab'));
    console.log('NoteModal exists:', !!document.getElementById('noteModal'));
    console.log('Close button exists:', !!document.querySelector('.close'));

    // Инициализация noteModal
    noteModal = document.getElementById('noteModal');
    if (!noteModal) {
        console.error('noteModal не найден!');
        return;
    }

    const closeButton = noteModal.querySelector('.close');
    const saveButton = document.getElementById('modalSaveNoteBtn');

    if (closeButton) {
        // closeButton.onclick = closeNoteModal; // Удалено (обработчик в notes.js)
        console.log('Кнопка закрытия инициализирована');
        } else {
        console.error('Кнопка закрытия не найдена');
    }

    if (saveButton) {
        // saveButton.onclick = saveNoteFromModal; // Удалено (обработчик в notes.js)
        console.log('Кнопка сохранения инициализирована');
    } else {
        console.error('Кнопка сохранения не найдена');
    }

    // Инициализация графиков
    // const ctx = document.getElementById('activityChart').getContext('2d'); // Перемещено в dashboard.js
    // let activityChart = null; // Перемещено в dashboard.js

    // Функция для создания/обновления основного графика
    // function createOrUpdateActivityChart(data) { // Перемещено в dashboard.js
    // ... // Перемещено в dashboard.js
    // } // Перемещено в dashboard.js

    // Функция обновления всего интерфейса (отвечает за график и сводку других приложений)
    // Эта функция теперь просто вызывает createOrUpdateActivityChart
    // function updateDashboard(data) { // Перемещено в dashboard.js
    //      createOrUpdateActivityChart(data); // Перемещено в dashboard.js
    // } // Перемещено в dashboard.js

    // function updateSummaryList(data, targetElementId = 'summaryList') { // Перемещено в dashboard.js
    // ... // Перемещено в dashboard.js
    // } // Перемещено в dashboard.js

    // Переключение между экранами (добавляем обработку нового экрана)
    // const tabs = document.querySelectorAll('.tab'); // Удалено
    // console.log(`Found ${tabs.length} tabs.`); // Добавлено для отладки // Удалено
// tabs.forEach(tab => { // Удалено
//     tab.addEventListener('click', () => { // Удалено
//         console.log('Tab clicked: ', tab.dataset.tab); // Удалено
//         // Убрать активный класс со всех вкладок и экранов // Удалено
//         document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); // Удалено
//         document.querySelectorAll('.screen').forEach(s => s.classList.remove('active')); // Удалено
//         
//         // Добавить активный класс текущей вкладке и экрану // Удалено
//         tab.classList.add('active'); // Удалено
//         const screenId = `${tab.dataset.tab}Screen`; // Удалено
//         document.getElementById(screenId).classList.add('active'); // Удалено

//         // Если переключаемся на заметки, рендерим их // Удалено
//         if (tab.dataset.tab === 'notes') { // Удалено
//             // Инициализация FAB-кнопки при переключении // Удалено
//             const addNoteFabBtn = document.getElementById('addNoteFab'); // Удалено
//             if (addNoteFabBtn) { // Удалено
//                 addNoteFabBtn.onclick = () => openNoteModal(); // Удалено
//                 console.log('FAB button initialized on tab switch'); // Удалено
//             } // Удалено
//             renderNotes(); // Удалено
//         } else if (tab.dataset.tab === 'summary') { // Для вкладки Detailed Summary // Удалено
//             updateSummaryList(latestActivityData, 'detailedSummaryList'); // Используем latestActivityData // Удалено
//         } else if (tab.dataset.tab === 'settings') { // Для новой вкладки Settings // Удалено
//             // Ничего не нужно делать, так как `intervalSelect` возвращен // Удалено
//         } // Удалено
//     }); // Удалено
// }); // Удалено

// Управление темной темой
    // const themeToggle = document.getElementById('themeToggle'); // Перемещено в theme.js
    // const savedTheme = localStorage.getItem('theme') || 'light'; // Перемещено в theme.js

// Применить сохраненную тему
    // document.body.setAttribute('data-theme', savedTheme); // Перемещено в theme.js
    // updateThemeIcon(savedTheme); // Перемещено в theme.js

    // themeToggle.addEventListener('click', () => { // Перемещено в theme.js
    // ... // Перемещено в theme.js
    // }); // Перемещено в theme.js

    // function updateThemeIcon(theme) { // Перемещено в theme.js
    // ... // Перемещено в theme.js
    // } // Перемещено в theme.js

// Обработчик получения данных
    // window.electronAPI.onActivityUpdate((event, data) => { // Перемещено в dashboard.js
    //     latestActivityData = data; // Сохраняем последние данные активности // Перемещено в dashboard.js
    //     updateDashboard(data); // Обновляем основной график и статистику // Перемещено в dashboard.js
    // }); // Перемещено в dashboard.js

    // Функция для переключения обратно на Dashboard
    // function showDashboardScreen() { // Перемещено в dashboard.js
    // ... // Перемещено в dashboard.js
    // } // Перемещено в dashboard.js

    // Обработчик для обновления заметок из main процесса
    window.electronAPI.onNoteNotified((event, noteId) => {
        // const note = notes.find(n => n.id === noteId); // Удалено
        // if (note) { // Удалено
        //     note.notified = true; // Удалено
        //     saveNotes(); // Удалено
        //     renderNotes(); // Удалено
        // } // Удалено
    });

    // Обработчик кнопки сброса
    // const resetBtn = document.getElementById('resetBtn'); // Перемещено в dashboard.js
    // if (resetBtn) { // Перемещено в dashboard.js
    //     resetBtn.addEventListener('click', () => { // Перемещено в dashboard.js
    //         window.electronAPI.resetActivityData(); // Перемещено в dashboard.js
    //     }); // Перемещено в dashboard.js
    // } else { // Перемещено в dashboard.js
    //     console.error('resetBtn не найден!'); // Перемещено в dashboard.js
    // } // Перемещено в dashboard.js

    // Обработчик изменения интервала (возвращаю, т.к. `intervalSelect` вернулся в HTML)
    // const intervalSelect = document.getElementById('intervalSelect');
    // if (intervalSelect) {
    //     intervalSelect.addEventListener('change', (e) => {
    //         window.electronAPI.setTrackingInterval(parseInt(e.target.value));
    //     });
    // } else {
    //     console.error('intervalSelect не найден!');
    // }

    // При старте отображаем Dashboard
    // showDashboardScreen(); // Перемещено в dashboard.js

    // Добавьте закрытие по ESC
    document.addEventListener('keydown', (e) => {
         if (e.key === 'Escape' && noteModal && noteModal.style.display === 'block') { // Удалено
             closeNoteModal(); // Удалено
         } // Удалено
    });
    
    // Инициализация темы
    // document.querySelectorAll('.theme-option').forEach(option => { // Перемещено в theme.js
    //     option.addEventListener('click', () => { // Перемещено в theme.js
    //         const theme = option.dataset.theme; // Перемещено в theme.js
    //         document.body.setAttribute('data-theme', theme); // Перемещено в theme.js
    //         localStorage.setItem('theme', theme); // Перемещено в theme.js
    //         updateThemeIcon(theme); // Перемещено в theme.js
    //     }); // Перемещено в theme.js
    // }); // Перемещено в theme.js

    // Обработчик изменения размера окна для обновления графиков
    // window.addEventListener('resize', () => { // Перемещено в dashboard.js
    //     console.log('Window resized. Resizing charts.'); // Перемещено в dashboard.js
    //     if (activityChart) activityChart.resize(); // Перемещено в dashboard.js
    // }); // Перемещено в dashboard.js

    initNotes();
    initDashboard();
    initTheme();

    console.log('renderer.js: latestActivityData after initDashboard:', latestActivityData);

    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
            
            tab.classList.add('active');
            const screenId = `${tab.dataset.tab}Screen`;
            document.getElementById(screenId).classList.add('active');

            if (tab.dataset.tab === 'notes') {
                renderNotes(); // From notes.js
            } else if (tab.dataset.tab === 'summary') {
                console.log('renderer.js: Switching to summary tab. latestActivityData:', latestActivityData);
                updateSummaryList(latestActivityData, 'detailedSummaryList');
            }
        });
    });
});

// Функции для работы с модальным окном
// Добавим параметр note, чтобы openNoteModal могла использоваться для редактирования
// function openNoteModal(note = null) { // Удалено
// ... // Удалено
// } // Удалено

// Оптимизированная функция закрытия
// function closeNoteModal() { // Удалено
// ... // Удалено
// } // Удалено

// async function saveNoteFromModal() { // Удалено
// ... // Удалено
// } // Удалено

// Функция для обновления Total Tracked Time (общее время работы трекера)
// function updateTotalTrackerRunningTime() { // Перемещено в dashboard.js
// ... // Перемещено в dashboard.js
// } // Перемещено в dashboard.js

// Функция для переключения обратно на Dashboard
// function showDashboardScreen() { // Перемещено в dashboard.js
// ... // Перемещено в dashboard.js
// } // Перемещено в dashboard.js

// Функция для обновления всего интерфейса (отвечает за график и сводку других приложений)
// Эта функция теперь просто вызывает createOrUpdateActivityChart
// function updateDashboard(data) { // Перемещено в dashboard.js
//     createOrUpdateActivityChart(data); // Перемещено в dashboard.js
// } // Перемещено в dashboard.js

// function updateSummaryList(data, targetElementId = 'summaryList') { // Перемещено в dashboard.js
// ... // Перемещено в dashboard.js
// } // Перемещено в dashboard.js

// Функция для создания/обновления основного графика
// function createOrUpdateActivityChart(data) { // Перемещено в dashboard.js
// ... // Перемещено в dashboard.js
// } // Перемещено в dashboard.js