//renderer.js
// Инициализация времени начала отслеживания
// const startTime = new Date(); // Удаляем эту строку
// document.getElementById('activeSince').textContent =
//     startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

// Переменная для хранения времени запуска приложения (как Date объект)
let appLaunchTime = null;

// Добавим в начало файла
let notes = []; // Инициализируем пустым массивом, чтобы загрузка шла только из файла
let notificationTimer = null;
let currentEditingNoteId = null;
let noteModal = null; // Делаем глобальной и инициализируем null
let latestActivityData = {}; // Восстанавливаю latestActivityData

// Обработчик получения времени запуска из main.js
window.electronAPI.onAppStartTime((event, timeString) => {
    appLaunchTime = new Date(timeString); // Сохраняем время запуска
    // Обновляем текст сразу после получения времени запуска
    updateTotalTrackerRunningTime(); // Обновляем время трекера при получении времени запуска
});

// Функция для обновления реального времени в элементе Active Since
function updateCurrentTime() {
    const now = new Date();
document.getElementById('activeSince').textContent = 
        now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    // Также обновляем общее время работы трекера
    updateTotalTrackerRunningTime();
}

// Обновляем время каждую секунду
setInterval(updateCurrentTime, 1000);

// Функция для рендеринга заметок
function renderNotes() {
    try {
        const notesList = document.getElementById('notesList');
        if (!notesList) {
            console.error('notesList element not found');
            return;
        }
    
        notesList.innerHTML = '';
        
        if (notes.length === 0) {
            notesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sticky-note"></i>
                    <h3>No notes yet</h3>
                    <p>Add your first note using the form above</p>
                </div>
            `;
            return;
        }
        
        // Сортируем по дате выполнения (сначала ближайшие)
        const sortedNotes = [...notes].sort((a, b) => 
            new Date(a.dueDate) - new Date(b.dueDate)
        );
        
        sortedNotes.forEach(note => {
            const noteElement = document.createElement('div');
            noteElement.className = `note ${note.completed ? 'completed' : ''} ${new Date(note.dueDate) < new Date() && !note.completed ? 'overdue' : ''}`;
            noteElement.dataset.id = note.id;
            
            // Обновляем отображение даты выполнения
            const dueDateHTML = note.dueDate 
                ? `<div class="note-due-date">
                       <i class="fas fa-clock"></i>
                       ${new Date(note.dueDate).toLocaleString()}
                   </div>`
                : '';
            
            noteElement.innerHTML = `
                <div class="note-header">
                    <h3 class="note-title">${note.title}</h3>
                    <div class="note-actions">
                        <button class="icon-btn edit-btn" data-id="${note.id}">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="icon-btn delete-btn" data-id="${note.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="note-content">${note.content}</div>
                <div class="note-meta">
                    ${dueDateHTML}
                    <div class="note-status">
                        <label class="status-label">
                            <input type="checkbox" class="completed-checkbox" 
                                   data-id="${note.id}" ${note.completed ? 'checked' : ''}>
                            <span>Completed</span>
                        </label>
                    </div>
                </div>
            `;
            
            notesList.appendChild(noteElement);
        });
        
        // Добавляем обработчики событий
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                deleteNote(id);
            });
        });
        
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                editNote(id);
            });
        });
        
        document.querySelectorAll('.completed-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const id = e.target.dataset.id;
                toggleNoteCompleted(id, e.target.checked);
            });
        });
    } catch (error) {
        console.error('Error rendering notes:', error);
    }
}

// Сохранение заметок в localStorage
async function saveNotes() {
    // localStorage.setItem('notes', JSON.stringify(notes)); // Удаляем старую логику localStorage
    // window.electronAPI.updateNotes(notes); // Этот вызов больше не нужен
    await window.electronAPI.saveNotes(JSON.stringify(notes)); // Сохраняем через IPC
}

// Функция для добавления новой заметки
async function addNote(title, content, dueDate) {
    try {
        const newNote = {
            id: Date.now(),
            title,
            content,
            dueDate,
            completed: false,
            notified: false
        };
        
        notes.push(newNote);
        await saveNotes();
        renderNotes();
        scheduleNotifications();
    } catch (error) {
        console.error('Error adding note:', error);
        alert('Failed to add note. See console for details.');
    }
}

// Функция для редактирования заметки
function editNote(id) {
    const note = notes.find(n => n.id == id);
    if (!note) return;
    
    currentEditingNoteId = note.id;
    document.getElementById('modalTitle').textContent = 'Edit Note';
    document.getElementById('modalNoteTitle').value = note.title;
    document.getElementById('modalNoteContent').value = note.content || '';
    
    // Если есть дата выполнения, форматируем ее
    if (note.dueDate) {
        document.getElementById('modalNoteDueDate').value = formatDateTimeLocal(new Date(note.dueDate));
    } else {
        document.getElementById('modalNoteDueDate').value = '';
    }
    
    openNoteModal(note); // Используем существующую функцию openNoteModal
}

// Функция для удаления заметки
async function deleteNote(id, isEditing = false) {
    notes = notes.filter(note => note.id != id);
    await saveNotes();
    
    if (!isEditing) {
        renderNotes();
        scheduleNotifications();
    }
}

// Функция для отметки выполнения
async function toggleNoteCompleted(id, completed) {
    const note = notes.find(n => n.id == id);
    if (note) {
        note.completed = completed;
        await saveNotes();
        renderNotes();
        scheduleNotifications();
    }
}

// Форматирование даты для input[type=datetime-local]
function formatDateTimeLocal(date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
}

// Планирование уведомлений
function scheduleNotifications() {
    // Очищаем предыдущий таймер
    if (notificationTimer) {
        clearTimeout(notificationTimer);
        notificationTimer = null;
    }
    
    // Находим ближайшую заметку, требующую уведомления
    const now = new Date();
    const upcomingNotes = notes.filter(note => 
        !note.completed && 
        !note.notified && 
        note.dueDate && // Только если указана дата
        new Date(note.dueDate) > now
    );
    
    if (upcomingNotes.length > 0) {
        // Sортируем по дате выполнения
        upcomingNotes.sort((a, b) => 
            new Date(a.dueDate) - new Date(b.dueDate)
        );
        
        const nextNote = upcomingNotes[0];
        const timeUntilNotification = new Date(nextNote.dueDate) - now;
        
        // Устанавливаем таймер для уведомления
        notificationTimer = setTimeout(() => {
            showNotification(nextNote.title, nextNote.content);
            
            // Помечаем заметку как уведомленную
            const note = notes.find(n => n.id === nextNote.id);
            if (note) {
                note.notified = true;
                saveNotes();
                renderNotes();
            }
            
            // Планируем следующее уведомление
            scheduleNotifications();
        }, timeUntilNotification);
    }
}

// Показ уведомления
function showNotification(title, message) {
    window.electronAPI.showNotification(title, message);
}

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
        closeButton.onclick = closeNoteModal;
        console.log('Кнопка закрытия инициализирована');
    } else {
        console.error('Кнопка закрытия не найдена');
    }

    if (saveButton) {
        saveButton.onclick = saveNoteFromModal;
        console.log('Кнопка сохранения инициализирована');
    } else {
        console.error('Кнопка сохранения не найдена');
    }

    // Инициализация графиков
    const ctx = document.getElementById('activityChart').getContext('2d');
    let activityChart = null; // Переменная для хранения экземпляра основного графика

    // Инициализация детального графика
    const detailedCtx = document.getElementById('detailedActivityChart').getContext('2d');
    let detailedActivityChart = null; // Переменная для хранения экземпляра детального графика

    // Функция для создания/обновления основного графика
    function createOrUpdateActivityChart(data) {
        // Фильтруем приложения с нулевым временем активности (меньше 60 секунд)
        const filteredData = Object.keys(data)
            .filter(app => data[app] >= 60) // Оставляем только те, где время >= 60 секунд (1 минута)
            .reduce((obj, key) => {
                obj[key] = data[key];
                return obj;
            }, {});

        const apps = Object.keys(filteredData);
        const minutesData = apps.map(app => Math.round(filteredData[app] / 60));

        if (activityChart) {
            // Если график уже существует, обновляем данные
            activityChart.data.labels = apps;
            activityChart.data.datasets[0].data = minutesData;
            // Обновляем цвета, если нужно (можно сделать функцию для генерации цветов)
            activityChart.data.datasets[0].backgroundColor = [
                 '#4361ee', '#3a0ca3', '#4cc9f0', '#f72585',
                 '#7209b9', '#4895ef', '#2ec4b6', '#e71d36',
                 '#ff9f1c', '#011627'
             ];
            activityChart.update();
        } else {
            // Если графика нет, создаем новый
            activityChart = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: apps,
                    datasets: [{
                        label: 'Minutes Used',
                        data: minutesData,
                        backgroundColor: [
                            '#4361ee', '#3a0ca3', '#4cc9f0', '#f72585', 
                            '#7209b7', '#4895ef', '#2ec4b6', '#e71d36',
                            '#ff9f1c', '#011627'
                        ],
                        borderColor: 'rgba(0,0,0,0.1)',
                        borderWidth: 1,
                        borderRadius: 6,
                        barThickness: 40,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            enabled: true,
                            callbacks: {
                                title: function(context) {
                                    return context[0].label;
                                },
                                label: function(context) {
                                    const hours = context.raw / 60;
                                    return `${hours.toFixed(1)} hours`;
                                }
                            },
                            backgroundColor: 'var(--card-bg)',
                            borderColor: 'var(--border)',
                            borderWidth: 1,
                            bodyFontColor: 'var(--text)',
                            titleFontColor: 'var(--text)',
                            displayColors: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Minutes',
                                color: 'var(--dark)'
                            },
                            grid: {
                                color: 'transparent'
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    },
                    // Добавляем обработчик клика на столбцы
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const firstElement = elements[0];
                            const label = activityChart.data.labels[firstElement.index];
                            console.log('Клик по приложению:', label);
                            // Запрашиваем детальный лог для этого приложения
                            window.electronAPI.requestAppActivityLog(label);
                            // Переключаемся на экран детального графика
                            showDetailedActivityScreen(label);
                        }
                    }
                }
            });
        }

        // Обновление статистики
        document.getElementById('appCount').textContent = apps.length;

        // Обновление сводки
        updateSummaryList(data); // Передаем полные данные для сводки, нефильтрованные по 1 минуте
    }

    // Функция обновления всего интерфейса (отвечает за график и сводку других приложений)
    // Эта функция теперь просто вызывает createOrUpdateActivityChart
    function updateDashboard(data) {
         createOrUpdateActivityChart(data);
    }

    function updateSummaryList(data, targetElementId = 'summaryList') {
        const apps = Object.keys(data);
        const summaryList = document.getElementById(targetElementId);
        
        if (!summaryList) {
            console.error(`Element with ID '${targetElementId}' not found for summary list.`);
            return;
        }
        
        summaryList.innerHTML = '';
        
        if (apps.length === 0) {
            summaryList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <h3>No activity data yet</h3>
                    <p>Active applications will appear here</p>
                </div>
            `;
            return;
        }
        
        apps.sort((a, b) => data[b] - data[a]).forEach(app => {
            const minutes = Math.round(data[app] / 60);
            const hours = (minutes / 60).toFixed(1);
            
            const item = document.createElement('div');
            item.className = 'activity-item';
            item.innerHTML = `
                <div class="app-info">
                    <div class="app-icon">${app.charAt(0)}</div>
                    <div class="app-name">${app}</div>
                </div>
                <div class="app-time">${minutes}<span class="time-unit">min</span></div>
            `;
            summaryList.appendChild(item);
        });
    }

    // Переключение между экранами (добавляем обработку нового экрана)
    const tabs = document.querySelectorAll('.tab');
    console.log(`Found ${tabs.length} tabs.`); // Добавлено для отладки
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        console.log('Tab clicked: ', tab.dataset.tab);
        // Убрать активный класс со всех вкладок и экранов
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        
        // Добавить активный класс текущей вкладке и экрану
        tab.classList.add('active');
        const screenId = `${tab.dataset.tab}Screen`;
        document.getElementById(screenId).classList.add('active');

        // Если переключаемся на заметки, рендерим их
        if (tab.dataset.tab === 'notes') {
            // Инициализация FAB-кнопки при переключении
            const addNoteFabBtn = document.getElementById('addNoteFab');
            if (addNoteFabBtn) {
                addNoteFabBtn.onclick = () => openNoteModal();
                console.log('FAB button initialized on tab switch');
            }
            renderNotes();
        } else if (tab.dataset.tab === 'summary') { // Для вкладки Detailed Summary
            updateSummaryList(latestActivityData, 'detailedSummaryList'); // Используем latestActivityData
        }
    });
});

// Управление темной темой
const themeToggle = document.getElementById('themeToggle');
const savedTheme = localStorage.getItem('theme') || 'light';

// Применить сохраненную тему
document.body.setAttribute('data-theme', savedTheme);
updateThemeIcon(savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Обработчик получения данных
window.electronAPI.onActivityUpdate((event, data) => {
    latestActivityData = data; // Сохраняем последние данные активности
    updateDashboard(data); // Обновляем основной график и статистику
});

// Обработчик получения детального лога активности
window.electronAPI.onResponseAppActivityLog((event, appLog) => {
    console.log('Получен лог активности:', appLog);
    // Строим линейный график на основе полученного лога
    createOrUpdateDetailedActivityChart(appLog);
});

// Функция для переключения на экран детального графика
function showDetailedActivityScreen(appName) {
    // Скрываем все экраны
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    // Отображаем экран детального графика
    document.getElementById('detailedActivityScreen').classList.add('active');
    // Обновляем заголовок
    document.getElementById('detailedAppTitle').textContent = appName;

    // Удаляем активный класс со всех вкладок
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    // Можно добавить активный класс кастомной "вкладке" детального графика, если она есть
    // Или просто не иметь активной вкладки в этот момент
}

// Функция для переключения обратно на Dashboard
function showDashboardScreen() {
    // Скрываем все экраны
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    // Отображаем экран Dashboard
    document.getElementById('dashboardScreen').classList.add('active');
    // Делаем вкладку Dashboard активной
    document.querySelector('.tab[data-tab="dashboard"]').classList.add('active');

    // Уничтожаем детальный график, чтобы избежать утечек памяти и конфликтов
    if (detailedActivityChart) {
        detailedActivityChart.destroy();
        detailedActivityChart = null; // Сбрасываем переменную
    }
}

// Обработчик для обновления заметок из main процесса
window.electronAPI.onNoteNotified((event, noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        note.notified = true;
        saveNotes();
        renderNotes();
    }
});

// Обработчик кнопки "Назад"
const backToDashboardBtn = document.getElementById('backToDashboardBtn');
if (backToDashboardBtn) {
    backToDashboardBtn.addEventListener('click', () => {
        showDashboardScreen();
    });
} else {
    console.error('backToDashboardBtn не найден!');
}

// Обработчик кнопки сброса
const resetBtn = document.getElementById('resetBtn');
if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        window.electronAPI.resetActivityData();
    });
} else {
    console.error('resetBtn не найден!');
}

// При старте отображаем Dashboard
showDashboardScreen();

// Инициализация FAB-кнопки при загрузке
const addNoteFabBtn = document.getElementById('addNoteFab');
console.log('addNoteFabBtn element (on DOMContentLoaded):', addNoteFabBtn); // Добавлено для отладки
if (addNoteFabBtn) {
    addNoteFabBtn.onclick = () => openNoteModal();
    console.log('FAB button initialized on DOMContentLoaded');
} else {
    console.error('addNoteFab button not found on DOMContentLoaded!');
}

// Добавьте закрытие по ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && noteModal && noteModal.style.display === 'block') {
        closeNoteModal();
    }
});
    
// Загрузка заметок при запуске через IPC
window.electronAPI.loadNotes().then(notesData => {
    notes = JSON.parse(notesData) || [];
    renderNotes();
    scheduleNotifications();
}).catch(error => {
    console.error('Error loading notes via IPC:', error);
    notes = []; // Убедимся, что notes пуст в случае ошибки загрузки
    renderNotes();
    scheduleNotifications();
});
    
// Инициализация темы
document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => {
        const theme = option.dataset.theme;
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        updateThemeIcon(theme);
    });
});

// Обработчик изменения размера окна для обновления графиков
window.addEventListener('resize', () => {
    console.log('Window resized. Resizing charts.');
    if (activityChart) activityChart.resize();
});
});

// Функции для работы с модальным окном
// Добавим параметр note, чтобы openNoteModal могла использоваться для редактирования
function openNoteModal(note = null) {
    console.log('openNoteModal function called'); // Debug log
    // const noteModal = document.getElementById('noteModal'); // Удаляем локальное объявление
    console.log('noteModal inside openNoteModal (global ref):', noteModal); // Используем глобальную переменную
    
    if (!noteModal) {
        console.error('Note modal element not found in openNoteModal!'); // Error log
        return; // Предотвращаем ошибку TypeError
    }

    if (note) {
        currentEditingNoteId = note.id;
        document.getElementById('modalTitle').textContent = 'Edit Note';
        document.getElementById('modalNoteTitle').value = note.title;
        document.getElementById('modalNoteContent').value = note.content || '';
        if (note.dueDate) {
            document.getElementById('modalNoteDueDate').value = formatDateTimeLocal(new Date(note.dueDate));
        } else {
            document.getElementById('modalNoteDueDate').value = '';
        }
    } else {
        currentEditingNoteId = null;
        document.getElementById('modalTitle').textContent = 'Add New Note';
        document.getElementById('modalNoteTitle').value = '';
        document.getElementById('modalNoteContent').value = '';
        document.getElementById('modalNoteDueDate').value = '';
    }
    noteModal.style.display = 'block';
}

// Оптимизированная функция закрытия
function closeNoteModal() {
    // const noteModal = document.getElementById('noteModal'); // Удаляем локальное объявление
    if (noteModal) { // Используем глобальную переменную
        noteModal.style.display = 'none';
        currentEditingNoteId = null; // Сбрасываем id редактируемой заметки при закрытии
    }
}

async function saveNoteFromModal() {
    const titleInput = document.getElementById('modalNoteTitle');
    const contentInput = document.getElementById('modalNoteContent');
    const dueDateInput = document.getElementById('modalNoteDueDate');
    
    // Проверяем существование элементов
    if (!titleInput || !contentInput || !dueDateInput) {
        console.error('One or more form elements not found');
        return;
    }
    
    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const dueDate = dueDateInput.value; // dueDate может быть пустой строкой, что означает null
    
    if (!title) {
        alert('Title is required!');
        return;
    }
    
    try {
        if (currentEditingNoteId) {
            // Обновление существующей заметки
            const noteIndex = notes.findIndex(n => n.id == currentEditingNoteId);
            if (noteIndex !== -1) {
                notes[noteIndex].title = title;
                notes[noteIndex].content = content;
                notes[noteIndex].dueDate = dueDate || null;
                notes[noteIndex].notified = false; // Сбрасываем статус уведомления, если заметка была отредактирована
            }
            await saveNotes();
        } else {
            // Добавление новой заметки
            await addNote(title, content, dueDate || null);
        }
        
        // saveNotes(); // Этот вызов теперь избыточен, так как addNote уже вызывает saveNotes, а в случае редактирования saveNotes вызывается явно
        renderNotes();
        scheduleNotifications();
        closeNoteModal();
    } catch (error) {
        console.error('Error saving note:', error);
        alert('Failed to save note. See console for details.');
    }
}

// Функция для обновления Total Tracked Time (общее время работы трекера)
function updateTotalTrackerRunningTime() {
    if (appLaunchTime) {
        const now = new Date();
        const elapsedMilliseconds = now - appLaunchTime;
        const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
        const hours = Math.floor(elapsedSeconds / 3600);
        const minutes = Math.floor((elapsedSeconds % 3600) / 60);
        const seconds = elapsedSeconds % 60;
        
        // Форматируем время как Hh Mм Ss (или только Hh Mм, если секунд 0)
        let timeString = '';
        if (hours > 0) timeString += `${hours}h `;
        if (minutes > 0 || hours > 0) timeString += `${minutes}m `;
        timeString += `${seconds}s`;

        document.getElementById('totalTime').textContent = timeString.trim();
    }
}

// Функция для создания/обновления детального линейного графика
function createOrUpdateDetailedActivityChart(appLog) {
    console.log('Получен лог активности в createOrUpdateDetailedActivityChart:', appLog);

    const appName = document.getElementById('detailedAppTitle').textContent;
    const appSpecificLog = appLog.filter(entry => entry.appName === appName); // Фильтруем только записи для текущего приложения
    console.log(`Отфильтрованный лог для ${appName}:`, appSpecificLog);

    // Группируем активации по минутным интервалам
    const activationsPerMinute = {};
    appSpecificLog.forEach(entry => {
        const date = new Date(entry.timestamp);
        // Определяем начало минутного интервала (отбрасываем секунды и миллисекунды)
        const minuteKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()} ${date.getHours()}:${('0' + date.getMinutes()).slice(-2)}`;
        activationsPerMinute[minuteKey] = (activationsPerMinute[minuteKey] || 0) + 1;
    });
    console.log('Активации по минутам:', activationsPerMinute);

    // Подготавливаем данные для графика
    const sortedMinutes = Object.keys(activationsPerMinute).sort(); // Сортируем интервалы по времени

    const labels = sortedMinutes.map(key => {
        // Форматируем метку для оси X (например, HH:mm)
        const [datePart, timePart] = key.split(' ');
        return timePart; // Показываем только время (часы:минуты)
    });

    const data = sortedMinutes.map(key => activationsPerMinute[key]);

    console.log('Подготовленные labels для детального графика (по минутам):', labels);
    console.log('Подготовленные data для детального графика (кол-во активаций): ', data);

    // Уничтожаем предыдущий график, если он существует
    if (detailedActivityChart) {
        detailedActivityChart.destroy();
        detailedActivityChart = null;
    }

    // Создаем новый график
    detailedActivityChart = new Chart(detailedCtx, {
        type: 'line', // Используем линейный график
        data: {
            labels: labels,
            datasets: [{
                label: `Активации ${appName} в минуту`,
                data: data,
                borderColor: 'var(--primary)',
                backgroundColor: 'rgba(67, 97, 238, 0.2)',
                borderWidth: 2,
                pointRadius: 3, // Показываем точки
                stepped: false, // Создаем ступенчатый график (возвращаем обратно на false, если было изменено)
                fill: true, // Заполняем область под графиком
                tension: 0.1 // Добавляем небольшое сглаживание линии
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true // Показываем легенду
                },
                tooltip: {
                     callbacks: {
                         title: function(context) {
                             // Метка времени интервала
                             return `Время: ${context[0].label}`;
                         },
                         label: function(context) {
                             // Количество активаций
                             return `Активаций: ${context.raw}`;
                         }
                     },
                     backgroundColor: 'var(--card-bg)',
                     borderColor: 'var(--border)',
                     borderWidth: 1,
                     bodyFontColor: 'var(--text)',
                     titleFontColor: 'var(--text)',
                     displayColors: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Время (минутные интервалы)',
                        color: 'var(--dark)'
                    },
                     ticks: {
                         autoSkip: true,
                         maxTicksLimit: 15 // Ограничиваем количество меток для читаемости
                     },
                     grid: {
                         color: 'var(--border)'
                     }
                },
                y: {
                    beginAtZero: true,
                    // Ось Y будет показывать количество активаций
                    ticks: {
                        stepSize: 1, // Шаг в 1 активацию
                        // callback: function(value) { return value; } // Показываем число
                    },
                    title: {
                         display: true,
                         text: 'Количество активаций',
                         color: 'var(--dark)'
                     },
                     grid: {
                          color: 'var(--border)'
                     }
                }
            }
        }
    });
}