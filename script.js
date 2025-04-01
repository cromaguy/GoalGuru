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

// Add this to your script.js file

document.addEventListener('DOMContentLoaded', function() {
    // Vector icons related to tasks and goals
    const icons = [
        // Checkmark icon
        `<svg class="vector-icon" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17L4 12"></path>
        </svg>`,
        
        // Task list icon
        `<svg class="vector-icon" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
            <line x1="9" y1="12" x2="15" y2="12"></line>
            <line x1="9" y1="16" x2="15" y2="16"></line>
        </svg>`,
        
        // Star icon (achievements)
        `<svg class="vector-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>`,
        
        // Trophy icon
        `<svg class="vector-icon" width="45" height="45" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8 21V16.8C8 15.1198 8 14.2798 8.32698 13.638C8.6146 13.0735 9.07354 12.6146 9.63803 12.327C10.2798 12 11.1198 12 12.8 12H15.2C16.8802 12 17.7202 12 18.362 12.327C18.9265 12.6146 19.3854 13.0735 19.673 13.638C20 14.2798 20 15.1198 20 16.8V21M6.2 9H3M6.2 12H4M6.2 15H5M6.2 18H7M15 5H15.2C16.8802 5 17.7202 5 18.362 5.32698C18.9265 5.6146 19.3854 6.07354 19.673 6.63803C20 7.27976 20 8.11984 20 9.8V12M12 3L13.4 5.1C13.5171 5.28937 13.5171 5.28937 13.6402 5.43704C13.8728 5.70211 13.9891 5.83465 14.1365 5.93418C14.2475 6.00842 14.3666 6.06896 14.491 6.11507C14.6566 6.17481 14.8333 6.19595 15.1867 6.23822L17.4 6.6L15.5 8.5C15.3302 8.6698 15.3302 8.6698 15.1677 8.86443C14.9612 9.11801 14.858 9.2448 14.7856 9.39093C14.729 9.50314 14.6888 9.62264 14.6667 9.74603C14.6385 9.90038 14.6458 10.0597 14.6603 10.3784L14.85 12.6L12.9 11.55C12.7057 11.4458 12.7057 11.4458 12.5062 11.3393C12.2218 11.19 12.0796 11.1153 11.93 11.0831C11.811 11.0574 11.689 11.0574 11.57 11.0831C11.4204 11.1153 11.2782 11.19 10.9938 11.3393L9 12.4L9.25 10.15C9.27225 9.81284 9.28337 9.64177 9.25694 9.47778C9.23609 9.3451 9.19549 9.21689 9.13763 9.09707C9.06658 8.94628 8.96034 8.81591 8.74788 8.55516L7 6.6L9.2 6.2C9.5424 6.15762 9.7136 6.13643 9.87377 6.08341C10.0042 6.04125 10.1293 5.98554 10.2469 5.91709C10.3902 5.83521 10.5139 5.72197 10.7613 5.49549L12 3Z"></path>
        </svg>`,
        
        // Target/goal icon
        `<svg class="vector-icon" width="55" height="55" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="6"></circle>
            <circle cx="12" cy="12" r="2"></circle>
        </svg>`,
        
        // Calendar icon
        `<svg class="vector-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>`,
        
        // Clock icon
        `<svg class="vector-icon" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
        </svg>`,
        
        // Flag icon
        `<svg class="vector-icon" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
            <line x1="4" y1="22" x2="4" y2="15"></line>
        </svg>`
    ];
    
    // Place icons randomly in the background
    const body = document.body;
    const numIcons = 15; // Number of icons to display
    
    for (let i = 0; i < numIcons; i++) {
        // Create a wrapper for the icon
        const iconWrapper = document.createElement('div');
        
        // Select a random icon from the array
        const randomIcon = icons[Math.floor(Math.random() * icons.length)];
        iconWrapper.innerHTML = randomIcon;
        
        // Get the icon element
        const iconElement = iconWrapper.firstChild;
        
        // Set random positions
        const posX = Math.random() * 100; // Random percentage across width
        const posY = Math.random() * 100; // Random percentage across height
        
        // Set random rotation
        const rotation = Math.random() * 360;
        
        // Set random size (scale)
        const scale = 0.7 + Math.random() * 1.3;
        
        // Apply styles
        iconElement.style.left = `${posX}%`;
        iconElement.style.top = `${posY}%`;
        iconElement.style.transform = `rotate(${rotation}deg) scale(${scale})`;
        
        // Set the icon color based on theme
        const isDarkMode = body.classList.contains('dark-mode');
        iconElement.style.color = isDarkMode ? '#4b6bea' : '#5041ff';
        
        // Append to body
        body.appendChild(iconElement);
    }
    
    // Update icon colors when theme changes
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('change', function() {
            const icons = document.querySelectorAll('.vector-icon');
            const isDarkMode = body.classList.contains('dark-mode');
            
            icons.forEach(icon => {
                icon.style.color = isDarkMode ? '#4b6bea' : '#5041ff';
            });
        });
    }
});