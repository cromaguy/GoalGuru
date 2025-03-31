document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

// DOM Elements (Added Modal elements)
const taskInput = document.getElementById("taskInput");
const prioritySelect = document.getElementById("prioritySelect");
const addTaskBtn = document.getElementById("addTaskBtn");
const taskList = document.getElementById("taskList");
const searchInput = document.getElementById("searchInput");
const allTasksBtn = document.getElementById("allTasks");
const activeTasksBtn = document.getElementById("activeTasks");
const completedTasksBtn = document.getElementById("completedTasksBtn");
const clearCompletedBtn = document.getElementById("clearCompletedBtn");
const exportTasksBtn = document.getElementById("exportTasksBtn");
const themeToggle = document.getElementById("themeToggle");
const emptyState = document.getElementById("emptyState");
const totalTasksCounter = document.getElementById("totalTasks");
const completedTasksCounter = document.getElementById("completedTasks");
const pendingTasksCounter = document.getElementById("pendingTasks");
const taskTemplate = document.getElementById("taskTemplate");
const confirmationModal = document.getElementById("confirmationModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalConfirmBtn = document.getElementById("modalConfirmBtn");
const modalCancelBtn = document.getElementById("modalCancelBtn");


// State
let currentFilter = "all";
let taskToConfirm = null; // Store task ID or action type for modal confirmation
let actionToConfirm = null; // e.g., 'delete', 'clear'

function initApp() {
    loadTasks();
    setupEventListeners();
    loadTheme();
    updateTaskCounters();
    checkEmptyState();
    taskInput.focus();
    animateStatistics();
}

function setupEventListeners() {
    addTaskBtn.addEventListener("click", addTask);
    taskInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") addTask();
    });
    searchInput.addEventListener("input", filterTasks);
    allTasksBtn.addEventListener("click", () => setFilter("all"));
    activeTasksBtn.addEventListener("click", () => setFilter("active"));
    completedTasksBtn.addEventListener("click", () => setFilter("completed"));
    clearCompletedBtn.addEventListener("click", handleClearCompleted); // Changed to handler
    exportTasksBtn.addEventListener("click", exportTasks);
    themeToggle.addEventListener("change", toggleTheme);
    // Modal listeners
    modalCancelBtn.addEventListener("click", hideModal);
    modalConfirmBtn.addEventListener("click", confirmAction);
    confirmationModal.addEventListener("click", (e) => { // Close modal if overlay is clicked
       if (e.target === confirmationModal) {
            hideModal();
        }
    });
}


function loadTheme() {
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
        themeToggle.checked = true;
    }
}

function addTask() {
    const taskText = taskInput.value.trim();
    if (taskText === "") {
        showNotification("Please enter a task!", "warning");
        return;
    }

    const priority = prioritySelect.value;
    const task = {
        id: Date.now(),
        text: taskText,
        priority: priority,
        completed: false,
        dateAdded: new Date().toISOString()
    };

    appendTaskToDOM(task);
    saveTask(task);
    taskInput.value = "";
    taskInput.focus();
    updateTaskCounters();
    checkEmptyState();
    showNotification("Task added successfully!", "success");
}

function appendTaskToDOM(task) {
    const taskItem = taskTemplate.content.cloneNode(true);
    const li = taskItem.querySelector("li");
    const taskTextSpan = taskItem.querySelector(".task-text");
    const priorityBadge = taskItem.querySelector(".priority-badge");
    const dateAddedSpan = taskItem.querySelector(".date-added");
    const checkbox = taskItem.querySelector(".task-check");

    li.dataset.id = task.id;
    li.dataset.priority = task.priority;
    taskTextSpan.textContent = task.text;
    priorityBadge.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    priorityBadge.className = `priority-badge priority-${task.priority}`; // Reset class and add specific
    dateAddedSpan.textContent = formatDate(new Date(task.dateAdded));
    checkbox.checked = task.completed;

    if (task.completed) {
        li.classList.add("completed");
    }

    // Set border color directly (optional, can be done purely in CSS if preferred)
    // li.style.borderLeftColor = `var(--priority-${task.priority}-color)`; // Assumes CSS variables are defined

    addTaskEventListeners(li);
    taskList.appendChild(taskItem);
    applyFilter(); // Ensure new task respects current filter
}

function addTaskEventListeners(taskItem) {
    const checkbox = taskItem.querySelector(".task-check");
    const taskTextSpan = taskItem.querySelector(".task-text");
    const deleteBtn = taskItem.querySelector(".delete");
    const taskId = taskItem.dataset.id;

    // Checkbox
    checkbox.addEventListener("change", (e) => {
        const completed = e.target.checked;
        taskItem.classList.toggle("completed", completed);
        updateTaskInStorage(taskId, { completed });
        updateTaskCounters();
        applyFilter(); // Re-apply filter after completion change
    });

    // Inline Editing Logic
    taskTextSpan.addEventListener("click", () => {
        // Make editable only if not completed
        if (!taskItem.classList.contains("completed")) {
             makeEditable(taskTextSpan, taskId);
        }
    });

    // Delete Button - Show Modal
    deleteBtn.addEventListener("click", () => {
         showModal('delete', taskId, 'Delete Task', 'Are you sure you want to delete this task?');
    });
}

function makeEditable(spanElement, taskId) {
    spanElement.contentEditable = true;
    spanElement.focus();
    // Select all text
    const range = document.createRange();
    range.selectNodeContents(spanElement);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    const originalText = spanElement.textContent;

    // Save on Enter or Blur
    const saveChanges = () => {
        spanElement.contentEditable = false;
        const newText = spanElement.textContent.trim();
        if (newText && newText !== originalText) {
            updateTaskInStorage(taskId, { text: newText });
            showNotification("Task updated!", "success");
        } else {
            // Restore original text if empty or unchanged
            spanElement.textContent = originalText;
        }
        // Clean up listeners
        spanElement.removeEventListener('blur', saveChanges);
        spanElement.removeEventListener('keydown', handleKeydown);
    };

    const handleKeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent adding newline
            saveChanges();
        } else if (e.key === 'Escape') {
            spanElement.textContent = originalText; // Revert on escape
            saveChanges();
        }
    };

    spanElement.addEventListener('blur', saveChanges);
    spanElement.addEventListener('keydown', handleKeydown);
}


function loadTasks() {
    let tasks = getTasksFromStorage();
    taskList.innerHTML = ""; // Clear list before loading
    tasks.forEach(task => appendTaskToDOM(task));
    updateTaskCounters();
    checkEmptyState();
}

function getTasksFromStorage() {
    try {
        const storedTasks = localStorage.getItem("tasks");
        return storedTasks ? JSON.parse(storedTasks) : [];
    } catch (error) {
        console.error("Error loading tasks from localStorage:", error);
        showNotification("Failed to load tasks.", "error");
        return [];
    }
}

function saveTask(task) {
     try {
        let tasks = getTasksFromStorage();
        tasks.push(task);
        localStorage.setItem("tasks", JSON.stringify(tasks));
    } catch (error) {
        console.error("Error saving task to localStorage:", error);
        showNotification("Failed to save task.", "error");
    }
}

function updateTaskInStorage(taskId, updates) {
    try {
        let tasks = getTasksFromStorage();
        const taskIndex = tasks.findIndex(task => task.id == taskId);
        if (taskIndex !== -1) {
            tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
            localStorage.setItem("tasks", JSON.stringify(tasks));
        }
     } catch (error) {
        console.error("Error updating task in localStorage:", error);
        showNotification("Failed to update task.", "error");
    }
}

function removeTaskFromStorage(taskId) {
     try {
        let tasks = getTasksFromStorage();
        tasks = tasks.filter(task => task.id != taskId);
        localStorage.setItem("tasks", JSON.stringify(tasks));
     } catch (error) {
        console.error("Error removing task from localStorage:", error);
        showNotification("Failed to remove task.", "error");
    }
}

// Modal Confirmation Logic
function handleClearCompleted() {
    const completedTasks = document.querySelectorAll("#taskList li.completed");
    if (completedTasks.length === 0) {
        showNotification("No completed tasks to clear.", "info");
        return;
    }
    showModal('clear', null, 'Clear Completed Tasks', `Are you sure you want to clear ${completedTasks.length} completed task(s)?`);
}

function showModal(action, id, title, message) {
    actionToConfirm = action;
    taskToConfirm = id; // Store task ID if action is 'delete'
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    confirmationModal.style.display = 'flex';
     // Focus the cancel button for accessibility
    modalCancelBtn.focus();
}

function hideModal() {
    confirmationModal.style.display = 'none';
    actionToConfirm = null;
    taskToConfirm = null;
}

function confirmAction() {
    if (actionToConfirm === 'delete' && taskToConfirm) {
        const taskItem = taskList.querySelector(`li[data-id="${taskToConfirm}"]`);
        if (taskItem) {
            removeTaskFromStorage(taskToConfirm);
            taskItem.remove();
            updateTaskCounters();
            checkEmptyState();
            showNotification("Task deleted!", "success");
        }
    } else if (actionToConfirm === 'clear') {
         const completedTasks = document.querySelectorAll("#taskList li.completed");
        let tasksRemoved = 0;
         completedTasks.forEach(task => {
            removeTaskFromStorage(task.dataset.id);
            task.remove();
            tasksRemoved++;
        });
        updateTaskCounters();
        checkEmptyState();
        if (tasksRemoved > 0) {
            showNotification(`${tasksRemoved} completed task(s) cleared!`, "success");
        }
    }
    hideModal();
}


function filterTasks() {
    applyFilter(); // Combined search and filter logic is in applyFilter
}

function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll(".filter-btn").forEach(btn => btn.classList.remove("active"));
    document.getElementById(filter === 'completed' ? 'completedTasksBtn' : `${filter}Tasks`).classList.add("active");
    applyFilter();
}

function applyFilter() {
    const taskItems = document.querySelectorAll("#taskList li");
    const searchTerm = searchInput.value.toLowerCase().trim();

    taskItems.forEach(task => {
        const isCompleted = task.classList.contains("completed");
        const taskText = task.querySelector(".task-text").textContent.toLowerCase();
        const matchesSearch = taskText.includes(searchTerm);

        let show = false;
        if (currentFilter === "all" && matchesSearch) {
            show = true;
        } else if (currentFilter === "active" && !isCompleted && matchesSearch) {
            show = true;
        } else if (currentFilter === "completed" && isCompleted && matchesSearch) {
           show = true;
        }

        task.style.display = show ? "block" : "none";
    });
    checkEmptyState();
}


function updateTaskCounters() {
    // More robust way to count based on actual data might be better,
    // but counting visible elements is simpler for now.
    const tasks = getTasksFromStorage(); // Count from storage for accuracy
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;

    totalTasksCounter.textContent = total;
    completedTasksCounter.textContent = completed;
    pendingTasksCounter.textContent = pending;
    animateStatistics(); // Animate whenever counters update
}

function checkEmptyState() {
    const visibleTasks = Array.from(document.querySelectorAll("#taskList li"))
                           .filter(task => task.style.display !== 'none').length;

    if (visibleTasks === 0) {
        let message = "No tasks found. Ready to be productive?";
        if (currentFilter === "active") {
            message = "No active tasks matching your search.";
        } else if (currentFilter === "completed") {
            message = "No completed tasks matching your search.";
        } else if (searchInput.value.trim() !== "") {
             message = "No tasks match your search.";
        } else if (getTasksFromStorage().length === 0) {
             message = "No tasks yet. Add your first one!";
        }

        emptyState.querySelector("p").textContent = message;
        emptyState.style.display = "flex"; // Use flex for centering icon+text
    } else {
        emptyState.style.display = "none";
    }
}


function exportTasks() {
    try {
        const tasks = getTasksFromStorage();
        if (tasks.length === 0) {
            showNotification("No tasks to export!", "warning");
            return;
        }

        const tasksForExport = tasks.map(task => ({
            task: task.text,
            priority: task.priority,
            status: task.completed ? "Completed" : "Pending",
            dateAdded: formatDate(new Date(task.dateAdded)) // Using existing format
        }));

        const headers = ["Task", "Priority", "Status", "Date Added"];
        const csvContent = [
            headers.join(","),
            ...tasksForExport.map(row => [
                `"${row.task.replace(/"/g, '""')}"`,
                row.priority,
                row.status,
                row.dateAdded
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `goalguru-tasks-${formatDateForFilename(new Date())}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showNotification("Tasks exported successfully!", "success");
    } catch (error) {
        console.error("Error exporting tasks:", error);
        showNotification("Failed to export tasks.", "error");
    }
}

function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
}

function formatDate(date) {
    // Keep existing format but ensure it's a valid date object
     if (!(date instanceof Date) || isNaN(date)) {
        return 'Invalid Date';
    }
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatDateForFilename(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

// Notification Function (Remains the same)
function showNotification(message, type = "info") {
    let notifContainer = document.querySelector(".notification-container");
    if (!notifContainer) {
        notifContainer = document.createElement("div");
        notifContainer.className = "notification-container";
        document.body.appendChild(notifContainer);
        // Style injection remains the same
        const style = document.createElement("style");
        style.textContent = `
            .notification-container { position: fixed; bottom: 20px; right: 20px; z-index: 1000; } /* Changed to bottom */
            .notification { padding: 12px 16px; margin-top: 10px; /* Use margin-top */ border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15); color: white; font-size: 14px; font-weight: 500; display: flex; align-items: center; justify-content: space-between; min-width: 280px; max-width: 320px; opacity: 0; transform: translateY(30px); animation: slideUp 0.3s forwards, fadeOut 0.5s 2.5s forwards; }
            .notification.success { background-color: #22c55e; }
            .notification.error { background-color: #ef4444; }
            .notification.info { background-color: #3b82f6; }
            .notification.warning { background-color: #f59e0b; }
            .close-notification { background: none; border: none; color: white; opacity: 0.7; cursor: pointer; font-size: 16px; padding: 0 0 0 10px; transition: opacity 0.2s; }
            .close-notification:hover { opacity: 1; background: none; transform: none; box-shadow: none; }
            @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } } /* Changed animation */
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        `;
        document.head.appendChild(style);
    }

    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `${message} <button class="close-notification">×</button>`;
    notifContainer.appendChild(notification);

    notification.querySelector(".close-notification").addEventListener("click", () => {
        notification.remove();
    });

    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

// Animation Function (Remains the same)
function animateStatistics() {
    const statBoxes = document.querySelectorAll(".stat-box");
    statBoxes.forEach((box, index) => {
        // Only re-animate if the content actually changed maybe?
        // For simplicity, re-animating on each update.
        setTimeout(() => {
            box.style.animation = "none";
            setTimeout(() => {
                box.style.animation = "fadeInUp 0.4s ease forwards"; // Changed animation
            }, 10);
        }, index * 70); // Adjusted stagger
    });
}

// Add new animation keyframes if needed (e.g., in CSS or JS)
const animationStyle = document.createElement('style');
animationStyle.textContent = `
    @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(animationStyle);