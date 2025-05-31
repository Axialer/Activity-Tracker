//renderer.js
// Инициализация времени начала отслеживания
// const startTime = new Date(); // Удаляем эту строку
// document.getElementById('activeSince').textContent =
//     startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

// Переменная для хранения времени запуска приложения (как Date объект)
let appLaunchTime = null;

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

document.addEventListener('DOMContentLoaded', () => {

    // Инициализация основного графика
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

    function updateSummaryList(data) {
        const apps = Object.keys(data);
        const summaryList = document.getElementById('summaryList');
        
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
        
        summaryList.innerHTML = '';
        
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
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        // Убрать активный класс со всех вкладок и экранов
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        
        // Добавить активный класс текущей вкладке и экрану
        tab.classList.add('active');
        const screenId = `${tab.dataset.tab}Screen`;
        document.getElementById(screenId).classList.add('active');
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
        updateDashboard(data); // Обновляем основной график и статистику
        // updateTotalTrackerTime(); // Удаляем вызов функции обновления времени трекера
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

    // Обработчик кнопки "Назад"
    document.getElementById('backToDashboardBtn').addEventListener('click', () => {
        showDashboardScreen();
    });

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
        console.log('Подготовленные data для детального графика (кол-во активаций):', data);

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

// Обработчик кнопки сброса
document.getElementById('resetBtn').addEventListener('click', () => {
    window.electronAPI.resetActivityData();
        // При сбросе данных активности, возможно, стоит обновить и время запуска
        // Но пока оставим его как время фактического старта приложения
        // appLaunchTime = new Date(); // Опционально: сбросить время запуска при сбросе данных
        // updateTotalTrackerTime();
});

// Обработчик изменения интервала
document.getElementById('intervalSelect').addEventListener('change', (e) => {
    window.electronAPI.setTrackingInterval(parseInt(e.target.value));
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

    // При старте отображаем Dashboard
    showDashboardScreen();
});

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