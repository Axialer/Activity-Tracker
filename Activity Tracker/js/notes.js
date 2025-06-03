let notes = [];
let notificationTimer = null;
let currentEditingNoteId = null;
let noteModal = null;

export function initNotes() {
    noteModal = document.getElementById('noteModal');
    if (!noteModal) {
        console.error('noteModal not found!');
        return;
    }

    const addNoteFabBtn = document.getElementById('addNoteFab');
    if (addNoteFabBtn) {
        addNoteFabBtn.onclick = () => openNoteModal();
    } else {
        console.error('addNoteFab button not found on DOMContentLoaded!');
    }

    const closeButton = noteModal.querySelector('.close');
    if (closeButton) {
        closeButton.onclick = closeNoteModal;
    } else {
        console.error('Кнопка закрытия не найдена');
    }

    const saveButton = document.getElementById('modalSaveNoteBtn');
    if (saveButton) {
        saveButton.onclick = saveNoteFromModal;
    } else {
        console.error('Кнопка сохранения не найдена');
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && noteModal && noteModal.style.display === 'block') {
            closeNoteModal();
        }
    });

    const sortSelect = document.getElementById('sortNotes');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortNotesBy(e.target.value);
        });
    }

    window.electronAPI.loadNotes().then(notesData => {
        notes = JSON.parse(notesData) || [];
        renderNotes();
        scheduleNotifications();
    }).catch(error => {
        console.error('Error loading notes via IPC:', error);
        notes = [];
        renderNotes();
        scheduleNotifications();
    });
}

export function renderNotes() {
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
                <p>Add your first note using the + button</p>
            </div>`;
        return;
    }

    notes.forEach(note => {
        const noteElement = document.createElement('div');
        const isOverdue = note.dueDate && new Date(note.dueDate) < new Date() && !note.completed;
        noteElement.className = `note ${note.type || 'general'} ${note.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`;
        noteElement.dataset.id = note.id;

        const dueDateHTML = note.dueDate 
            ? `<div class="note-due-date"><i class="fas fa-clock"></i> ${new Date(note.dueDate).toLocaleString()}</div>`
            : '';

        const contentHTML = note.content 
            ? `<div class="note-content markdown-body">${marked.parse(note.content)}</div>`
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
            ${contentHTML}
            <div class="note-meta">
                ${dueDateHTML}
                <div class="note-status">
                    <label class="status-label">
                        <input type="checkbox" class="completed-checkbox" data-id="${note.id}" ${note.completed ? 'checked' : ''}>
                        <span>Completed</span>
                    </label>
                </div>
            </div>
        `;

        // УДАЛЕНО: обработчик клика для разворачивания/сворачивания
        // noteElement.addEventListener('click', (e) => {
        //    if (!e.target.closest('.note-actions') && !e.target.closest('.completed-checkbox')) {
        //        noteElement.classList.toggle('expanded');
        //    }
        // });

        notesList.appendChild(noteElement);
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            editNote(id);
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            deleteNote(id);
        });
    });

    document.querySelectorAll('.completed-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const id = e.target.dataset.id;
            toggleNoteCompleted(id, e.target.checked);
        });
    });
}

async function saveNotes() {
    await window.electronAPI.saveNotes(JSON.stringify(notes));
}

async function addNote(title, content, dueDate, type = 'general') {
    const newNote = {
        id: Date.now(),
        title,
        content,
        dueDate,
        type,
        completed: false,
        notified: false
    };
    notes.push(newNote);
    await saveNotes();
    renderNotes();
    scheduleNotifications();
}

function editNote(id) {
    const note = notes.find(n => n.id == id);
    if (!note) return;

    currentEditingNoteId = note.id;
    document.getElementById('modalTitle').textContent = 'Edit Note';
    document.getElementById('modalNoteTitle').value = note.title;
    document.getElementById('modalNoteContent').value = note.content || '';
    document.getElementById('modalNoteDueDate').value = note.dueDate ? formatDateTimeLocal(new Date(note.dueDate)) : '';
    document.getElementById('modalNoteType').value = note.type || 'general';
    openNoteModal(note);
}

async function deleteNote(id, isEditing = false) {
    notes = notes.filter(note => note.id != id);
    await saveNotes();
    if (!isEditing) {
        renderNotes();
        scheduleNotifications();
    }
}

async function toggleNoteCompleted(id, completed) {
    const note = notes.find(n => n.id == id);
    if (note) {
        note.completed = completed;
        await saveNotes();
        renderNotes();
        scheduleNotifications();
    }
}

function formatDateTimeLocal(date) {
    return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
}

function scheduleNotifications() {
    if (notificationTimer) {
        clearTimeout(notificationTimer);
        notificationTimer = null;
    }

    const now = new Date();
    const upcomingNotes = notes.filter(note => 
        !note.completed && 
        !note.notified && 
        note.dueDate && 
        new Date(note.dueDate) > now
    );

    if (upcomingNotes.length > 0) {
        upcomingNotes.sort((a, b) => 
            new Date(a.dueDate) - new Date(b.dueDate)
        );

        const nextNote = upcomingNotes[0];
        const timeUntilNotification = new Date(nextNote.dueDate) - now;

        notificationTimer = setTimeout(() => {
            showNotification(nextNote.title, nextNote.content);
            const note = notes.find(n => n.id === nextNote.id);
            if (note) {
                note.notified = true;
                saveNotes();
                renderNotes();
            }
            scheduleNotifications();
        }, timeUntilNotification);
    }
}

function showNotification(title, message) {
    window.electronAPI.showNotification(title, message);
}

function openNoteModal(note = null) {
    if (!noteModal) {
        console.error('Note modal element not found in openNoteModal!');
        return;
    }

    if (note) {
        currentEditingNoteId = note.id;
        document.getElementById('modalTitle').textContent = 'Edit Note';
        document.getElementById('modalNoteTitle').value = note.title;
        document.getElementById('modalNoteContent').value = note.content || '';
        document.getElementById('modalNoteDueDate').value = note.dueDate ? formatDateTimeLocal(new Date(note.dueDate)) : '';
        document.getElementById('modalNoteType').value = note.type || 'general';
    } else {
        currentEditingNoteId = null;
        document.getElementById('modalTitle').textContent = 'Add New Note';
        document.getElementById('modalNoteTitle').value = '';
        document.getElementById('modalNoteContent').value = '';
        document.getElementById('modalNoteDueDate').value = '';
        document.getElementById('modalNoteType').value = 'general';
    }
    noteModal.style.display = 'block';
}

function closeNoteModal() {
    if (noteModal) {
        noteModal.style.display = 'none';
        currentEditingNoteId = null;
    }
}

async function saveNoteFromModal() {
    const titleInput = document.getElementById('modalNoteTitle');
    const contentInput = document.getElementById('modalNoteContent');
    const dueDateInput = document.getElementById('modalNoteDueDate');
    const typeInput = document.getElementById('modalNoteType');

    if (!titleInput || !contentInput || !dueDateInput || !typeInput) {
        console.error('One or more form elements not found');
        return;
    }

    const title = titleInput.value.trim();
    const content = contentInput.value.trim();
    const dueDate = dueDateInput.value;
    const type = typeInput.value;

    if (!title) {
        alert('Title is required!');
        return;
    }

    if (currentEditingNoteId) {
        const noteIndex = notes.findIndex(n => n.id == currentEditingNoteId);
        if (noteIndex !== -1) {
            notes[noteIndex].title = title;
            notes[noteIndex].content = content;
            notes[noteIndex].dueDate = dueDate || null;
            notes[noteIndex].type = type;
            notes[noteIndex].notified = false;
        }
        await saveNotes();
    } else {
        await addNote(title, content, dueDate || null, type);
    }

    renderNotes();
    scheduleNotifications();
    closeNoteModal();
}

export function sortNotesBy(criteria) {
    notes.sort((a, b) => {
        if (criteria === 'dueDate') {
            const dateA = a.dueDate ? new Date(a.dueDate) : new Date(Infinity);
            const dateB = b.dueDate ? new Date(b.dueDate) : new Date(Infinity);
            return dateA - dateB;
        } else if (criteria === 'type') {
            const typeOrder = { 'urgent': 1, 'important': 2, 'general': 3 };
            const typeA = typeOrder[a.type || 'general'];
            const typeB = typeOrder[b.type || 'general'];
            return typeA - typeB;
        } else if (criteria === 'title') {
            return a.title.localeCompare(b.title);
        }
        return 0;
    });
    saveNotes();
    renderNotes();
}

window.electronAPI.onNoteNotified((event, noteId) => {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        note.notified = true;
        saveNotes();
        renderNotes();
    }
}); 