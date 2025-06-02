const { app, BrowserWindow, ipcMain, dialog, Notification, Menu } = require('electron');
const path = require('path');
// const activeWin = require('active-win'); // Используем новый пакет
const { listOpenWindows } = require('@josephuspaye/list-open-windows');
const fs = require('fs');
const fsPromises = require('fs').promises; // Добавил для использования асинхронных файловых операций
const activeWindow = require('active-win');

const notesPath = path.join(app.getPath('userData'), 'notes.json'); // Путь к файлу данных для заметок

let intervalId = null;
let activityData = {}; // Суммарные данные активности по приложениям (секунды)
let activityLog = []; // Журнал активности: [{ timestamp: Date, appName: string }, ...]
let trackingInterval = 1000; // Интервал отслеживания по умолчанию (1 секунда)
let appStartTime = null; // Время запуска приложения

// Хранилище для таймера уведомлений
let notificationTimer = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1000, // Измененная ширина
    height: 800, // Измененная высота
    autoHideMenuBar: true, // Скрыть меню бар
    menu: null, // Удалить стандартное меню File, Edit, etc.
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Рекомендуется true для безопасности
      nodeIntegration: false   // Рекомендуется false
    }
  });

  win.loadFile('index.html');

  // Открыть DevTools при старте (для отладки)
  // win.webContents.openDevTools();
}

async function trackActiveWindow() {
  try {
    const windows = listOpenWindows();
    // console.log(`Found ${windows.length} open windows.`); // Remove Log 1
    const countedProcesses = new Set(); // Для отслеживания процессов, учтенных в этом интервале для activityData
    let currentActiveApp = null; // Определим активное приложение по zOrder (будем искать минимальный zOrder)
    let minZOrder = Infinity; // Переменная для поиска минимального zOrder

    if (windows.length === 0) {
        // Если нет открытых окон (рабочий стол, бездействие)
        activityLog.push({ timestamp: new Date().toISOString(), appName: 'Idle' });
        // console.log(`Record added to log: Idle. Total records: ${activityLog.length}`); // Remove Log 4 (Idle)
        sendActivityUpdate(); // Отправляем обновление, даже если данных нет (для сброса Total Time/Count)
        return;
    }

    const now = new Date();
    const intervalSeconds = trackingInterval / 1000;

    // Перебираем все открытые окна для обновления суммарных данных и поиска активного (с минимальным zOrder)
    windows.forEach(win => {
        // Игнорируем окна без заголовка или с определенными классами, которые не являются основными приложениями
        if (!win.caption || win.className.startsWith('Shell_') || win.className === 'WorkerW') {
            return;
        }
        const processPath = win.processPath;
        if (processPath) {
            const processName = path.basename(processPath).replace('.exe', '');

            // Обновляем суммарное время для любого процесса с видимым окном в этом интервале
             if (!countedProcesses.has(processName)) {
                 activityData[processName] = (activityData[processName] || 0) + intervalSeconds;
                 countedProcesses.add(processName); // Отмечаем процесс как учтенный
             }

             // Определяем активное приложение по минимальному zOrder
             // console.log(`Window: ${win.caption} | Process: ${processName} | zOrder: ${win.zOrder}`); // Remove Log 2
             if (win.zOrder < minZOrder) {
                 minZOrder = win.zOrder;
                 currentActiveApp = processName;
                 // console.log(`Tentative active window: ${processName} (zOrder: ${win.zOrder})`); // Optional: Лог 3 (промежуточный)
             }
        }
    });
    
    // console.log(`Final active window determined: ${currentActiveApp}`); // Remove Log 3

     // Записываем в лог найденное активное приложение (с минимальным zOrder)
     if (currentActiveApp) {
         activityLog.push({ timestamp: now.toISOString(), appName: currentActiveApp });
         // console.log(`Record added to log: ${currentActiveApp}. Total records: ${activityLog.length}`); // Remove Log 4 (Active)
     } // else: Если currentActiveApp остался null (например, все окна были отфильтрованы), в лог ничего не пишется

    // Отправляем обновленные суммарные данные в рендерер-процесс
    sendActivityUpdate();

  } catch (err) {
    console.error('Error getting open windows:', err);
    activityLog.push({ timestamp: new Date().toISOString(), appName: 'Error' }); // Записываем ошибку в лог
    // console.log(`Record added to log: Error. Total records: ${activityLog.length}`); // Optional: Log for Error
    sendActivityUpdate(); // Отправляем обновление даже при ошибке
  }
}

function startTracking() {
  intervalId = setInterval(trackActiveWindow, trackingInterval);
  console.log(`Tracking started with interval ${trackingInterval / 1000} seconds`);
}

function stopTracking() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('Tracking stopped');
  }
}

app.whenReady().then(() => {
  // Разрешение на показ уведомлений
  if (process.platform === 'win32') {
    app.setAppUserModelId(app.name);
  }
  createWindow();
  appStartTime = new Date(); // Записываем время запуска приложения
  sendActivityUpdate(); // Отправляем начальные данные (пустые) и время запуска
  startTracking();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  stopTracking();
  if (process.platform !== 'darwin') app.quit();
});

// Обработчики IPC
ipcMain.on('reset-activity-data', () => {
    activityData = {};
    sendActivityUpdate();
    console.log('Activity data reset');
  });

ipcMain.handle('save-notes', async (event, notesData) => {
    try {
        const dir = path.dirname(notesPath); // Получаем директорию из пути к файлу
        await fsPromises.mkdir(dir, { recursive: true }); // Создаем директорию, если она не существует
        await fsPromises.writeFile(notesPath, notesData); // Используем fsPromises.writeFile
        return true;
    } catch (error) {
        console.error('Failed to save notes:', error);
        return false;
    }
});
  
ipcMain.on('set-interval', (event, interval) => {
    stopTracking();
    trackingInterval = interval * 1000;
    startTracking();
  });
  
ipcMain.on('export-data', (event) => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.send('export-request', activityData);
    }
  });

  ipcMain.on('export-data-response', (event, data) => {
    // Логика сохранения данных в файл - ПЕРЕНЕСЕНО в main.js
    const filePath = dialog.showSaveDialogSync({
      title: 'Save Activity Data',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      defaultPath: 'activity_data.json'
    });
    
    if (filePath) {
      try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`Data exported to ${filePath}`);
      } catch (err) {
        console.error('Error exporting data:', err);
      }
    }
  });

// Добавляем обработчик IPC для запроса детальных данных по приложению
ipcMain.on('request-app-activity-log', (event, appName) => {
    console.log(`Received request for activity log for: ${appName}`);
    // Фильтруем лог по запрошенному приложению
    const appLog = activityLog.filter(entry => entry.appName === appName || entry.appName === 'Idle' || entry.appName === 'Error'); // Включаем Idle/Error для контекста
    // Отправляем отфильтрованный лог обратно в рендерер-процесс
    event.sender.send('response-app-activity-log', appLog);
});

// Вспомогательная функция для отправки данных
function sendActivityUpdate() {
  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    // Отправляем данные активности и время запуска
    windows[0].webContents.send('activity-update', activityData);
    if (appStartTime) {
        windows[0].webContents.send('app-start-time', appStartTime.toISOString()); // Отправляем время в формате ISO строки
    }
  }
}

// Обработчик обновления заметок
ipcMain.on('update-notes', (event, notes) => {
    // Отменяем предыдущий таймер
    if (notificationTimer) {
        clearTimeout(notificationTimer);
        notificationTimer = null;
    }
    
    // Фильтруем заметки, требующие уведомления
    const now = new Date();
    const upcomingNotes = notes.filter(note => 
        !note.completed && 
        !note.notified && 
        new Date(note.dueDate) > now
    );
    
    if (upcomingNotes.length > 0) {
        // Сортируем по дате выполнения
        upcomingNotes.sort((a, b) => 
            new Date(a.dueDate) - new Date(b.dueDate)
        );
        
        const nextNote = upcomingNotes[0];
        const timeUntilNotification = new Date(nextNote.dueDate) - now;
        
        // Устанавливаем новый таймер
        notificationTimer = setTimeout(() => {
            // Отправляем уведомление
            const notification = new Notification({
                title: nextNote.title,
                body: nextNote.content
            });
            notification.show();
            
            // Отправляем событие в renderer
            event.sender.send('note-notified', nextNote.id);
            
            // Планируем следующее уведомление
            event.sender.send('request-notes-update');
        }, timeUntilNotification);
    }
});

// Обработчик IPC для загрузки заметок
ipcMain.handle('load-notes', async () => { // Сделал асинхронной
    try {
        if (fs.existsSync(notesPath)) {
            return await fsPromises.readFile(notesPath, 'utf-8'); // Используем fsPromises.readFile
        }
        return '[]'; // Возвращаем пустой массив, если файла нет
    } catch (error) {
        console.error('Error loading notes:', error);
        return '[]'; // Возвращаем пустой массив в случае ошибки
    }
});

// API для показа уведомлений
ipcMain.handle('show-notification', (event, title, message) => {
    const notification = new Notification({ title, body: message });
    notification.show();
});

// API для запроса обновления заметок
ipcMain.on('request-notes-update', (event) => {
    event.sender.send('update-notes-request');
});