let appLaunchTime = null;
export let latestActivityData = {};
export let activityChart = null;

export function initDashboard() {
    const ctx = document.getElementById('activityChart').getContext('2d');
    
    window.electronAPI.onAppStartTime((event, timeString) => {
        appLaunchTime = new Date(timeString);
        updateTotalTrackerRunningTime();
    });

    window.electronAPI.onActivityUpdate((event, data) => {
        latestActivityData = data;
        createOrUpdateActivityChart(data);
        updateSummaryList(data, 'detailedSummaryList');
    });

    setInterval(updateCurrentTime, 1000);
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            window.electronAPI.resetActivityData();
        });
    } else {
        console.error('resetBtn не найден!');
    }

    showDashboardScreen();
    createOrUpdateActivityChart(latestActivityData);
    updateSummaryList(latestActivityData, 'detailedSummaryList');

    window.addEventListener('resize', () => {
        console.log('Window resized. Resizing charts.');
        if (activityChart) activityChart.resize();
    });
}

export function updateCurrentTime() {
    const now = new Date();
    document.getElementById('activeSince').textContent = 
        now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    updateTotalTrackerRunningTime();
}

export function updateTotalTrackerRunningTime() {
    if (appLaunchTime) {
        const now = new Date();
        const elapsedMilliseconds = now - appLaunchTime;
        const elapsedSeconds = Math.floor(elapsedMilliseconds / 1000);
        const hours = Math.floor(elapsedSeconds / 3600);
        const minutes = Math.floor((elapsedSeconds % 3600) / 60);
        const seconds = elapsedSeconds % 60;
        
        let timeString = '';
        if (hours > 0) timeString += `${hours}h `;
        if (minutes > 0 || hours > 0) timeString += `${minutes}m `;
        timeString += `${seconds}s`;

        document.getElementById('totalTime').textContent = timeString.trim();
    }
}

export function createOrUpdateActivityChart(data) {
    const ctx = document.getElementById('activityChart').getContext('2d');
    const apps = Object.keys(data);
    const activeData = apps.map(app => Math.round(data[app].active / 60));
    const inactiveData = apps.map(app => Math.round(data[app].inactive / 60));

    // Палитра цветов для приложений
    const colorPalette = [
        '#7b92f0', '#5de0cf', '#ffc16d', '#ff6b8e', '#8ee5ff',
        '#6a3ee5', '#a567ff', '#ff80b3', '#72ff99', '#ffe08c',
        '#53f3e0', '#3ed0ff', '#2a8f9c'
    ];

    // Функция для получения цвета приложения
    function getAppColor(app) {
        let hash = 0;
        for (let i = 0; i < app.length; i++) {
            hash = app.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % colorPalette.length;
        return colorPalette[index];
    }

    // Функция для установки прозрачности
    function setOpacity(hexColor, opacity) {
        let hex = hexColor.replace('#', '');
        if (hex.length === 3) {
            hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        }
        const r = parseInt(hex.substring(0,2), 16);
        const g = parseInt(hex.substring(2,4), 16);
        const b = parseInt(hex.substring(4,6), 16);
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }

    const appColors = apps.map(app => getAppColor(app));

    if (activityChart) {
        activityChart.data.labels = apps;
        activityChart.data.datasets[0].data = inactiveData;
        activityChart.data.datasets[0].backgroundColor = appColors.map(color => setOpacity(color, 0.5));
        activityChart.data.datasets[1].data = activeData;
        activityChart.data.datasets[1].backgroundColor = appColors;
        activityChart.update();
    } else {
        activityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: apps,
                datasets: [
                    {
                        label: 'Inactive Time',
                        data: inactiveData,
                        backgroundColor: appColors.map(color => setOpacity(color, 0.5)),
                        borderColor: 'rgba(0,0,0,0.1)',
                        borderWidth: 1,
                        borderRadius: 6,
                        barThickness: 40,
                    },
                    {
                        label: 'Active Time',
                        data: activeData,
                        backgroundColor: appColors,
                        borderColor: 'rgba(0,0,0,0.1)',
                        borderWidth: 1,
                        borderRadius: 6,
                        barThickness: 40,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { 
                        display: false,
                        position: 'top',
                        labels: {
                            color: 'var(--text)'
                        }
                    },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        callbacks: {
                            title: function(context) { 
                                return context[0].label; 
                            },
                            label: function(context) {
                                const datasetLabel = context.dataset.label;
                                const value = context.raw;
                                return `${datasetLabel}: ${value} min`;
                            }
                        },
                        backgroundColor: 'var(--card-bg)',
                        borderColor: 'var(--border)',
                        borderWidth: 1,
                        bodyFontColor: 'var(--text)',
                        titleFontColor: 'var(--text)',
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        grid: { display: false }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Minutes',
                            color: 'var(--dark)'
                        },
                        grid: { color: 'transparent' }
                    }
                }
            }
        });
    }

    document.getElementById('appCount').textContent = apps.length;
    updateSummaryList(data, 'detailedSummaryList');
}

export function updateDashboard(data) {
     createOrUpdateActivityChart(data);
}

export function updateSummaryList(data, targetElementId = 'detailedSummaryList') {
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
    
    apps.sort((a, b) => 
        (data[b].active + data[b].inactive) - 
        (data[a].active + data[a].inactive)
    ).forEach(app => {
        const activeMinutes = Math.round(data[app].active / 60);
        const inactiveMinutes = Math.round(data[app].inactive / 60);
        const totalMinutes = activeMinutes + inactiveMinutes;
        
        const item = document.createElement('div');
        item.className = 'activity-item';
        item.innerHTML = `
            <div class="app-info">
                <div class="app-icon">${app.charAt(0)}</div>
                <div class="app-name">${app}</div>
            </div>
            <div class="time-container">
                <div class="time-row">
                    <span class="time-label">Active:</span>
                    <span class="app-time">${activeMinutes}<span class="time-unit">min</span></span>
                </div>
                <div class="time-row">
                    <span class="time-label">Inactive:</span>
                    <span class="app-time">${inactiveMinutes}<span class="time-unit">min</span></span>
                </div>
                <div class="time-row total">
                    <span class="time-label">Total:</span>
                    <span class="app-time">${totalMinutes}<span class="time-unit">min</span></span>
                </div>
            </div>
        `;
        summaryList.appendChild(item);
    });
}

export function showDashboardScreen() {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('dashboardScreen').classList.add('active');
    document.querySelector('.tab[data-tab="dashboard"]').classList.add('active');
} 