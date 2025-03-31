document.addEventListener("DOMContentLoaded", () => {
    // Initialize the application
    initApp();
});

// DOM Elements
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

// Counters
const totalTasksCounter = document.getElementById("totalTasks");
const completedTasksCounter = document.getElementById("completedTasks");
const pendingTasksCounter = document.getElementById("pendingTasks");

// Task template
const taskTemplate = document.getElementById("taskTemplate");

// Current filter
let currentFilter = "all";

function initApp() {
    // Load tasks from local storage
    loadTasks();
    
    // Set up event listeners
    addTaskBtn.addEventListener("click", addTask);
    taskInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") addTask();
    });
    searchInput.addEventListener("input", filterTasks);
    allTasksBtn.addEventListener("click", () => setFilter("all"));
    activeTasksBtn.addEventListener("click", () => setFilter("active"));
    completedTasksBtn.addEventListener("click", () => setFilter("completed"));
    clearCompletedBtn.addEventListener("click", clearCompleted);
    exportTasksBtn.addEventListener("click", exportTasks);
    
    // Theme toggle
    themeToggle.addEventListener("change", toggleTheme);
    
    // Load saved theme
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark-mode");
        themeToggle.checked = true;
    }
    
    // Update task counters
    updateTaskCounters();
    
    // Check empty state
    checkEmptyState();

    // Add focus to task input on load
    taskInput.focus();
    
    // Add animation to statistics on page load
    animateStatistics();
}

function addTask() {
    const taskText = taskInput.value.trim();
    if (taskText === "") {
        showNotification("Please enter a task!");
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
    
    // Add task to DOM
    appendTaskToDOM(task);
    
    // Save to local storage
    saveTask(task);
    
    // Reset input
    taskInput.value = "";
    taskInput.focus();
    
    // Update counters
    updateTaskCounters();
    
    // Check empty state
    checkEmptyState();

    // Show a success notification
    showNotification("Task added successfully!", "success");
}

function appendTaskToDOM(task) {
    // Clone the task template
    const taskItem = taskTemplate.content.cloneNode(true);
    const li = taskItem.querySelector("li");
    
    // Set task data
    li.dataset.id = task.id;
    li.dataset.priority = task.priority;
    
    // Set task text
    const taskText = taskItem.querySelector(".task-text");
    taskText.textContent = task.text;
    
    // Set priority badge
    const priorityBadge = taskItem.querySelector(".priority-badge");
    priorityBadge.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    priorityBadge.classList.add(`priority-${task.priority}`);
    
    // Set date
    const dateAdded = taskItem.querySelector(".date-added");
    dateAdded.textContent = formatDate(new Date(task.dateAdded));
    
    // Set completed state
    const checkbox = taskItem.querySelector(".task-check");
    checkbox.checked = task.completed;
    if (task.completed) {
        li.classList.add("completed");
    }
    
    // Set border color based on priority
    if (task.priority === "high") {
        li.style.borderLeftColor = "#ef4444";
    } else if (task.priority === "low") {
        li.style.borderLeftColor = "#22c55e";
    } else {
        li.style.borderLeftColor = "#4f46e5";
    }
    
    // Add event listeners
    addTaskEventListeners(li);
    
    // Append to task list
    taskList.appendChild(taskItem);
    
    // Apply current filter
    applyFilter();
}

function addTaskEventListeners(taskItem) {
    // Checkbox event
    taskItem.querySelector(".task-check").addEventListener("change", (e) => {
        const completed = e.target.checked;
        taskItem.classList.toggle("completed", completed);
        updateTaskInStorage(taskItem.dataset.id, { completed });
        updateTaskCounters();
        applyFilter();
        
        // Show notification
        if (completed) {
            showNotification("Task completed!", "success");
        }
    });
    
    // Edit button event
    taskItem.querySelector(".edit").addEventListener("click", () => {
        const taskText = taskItem.querySelector(".task-text").textContent;
        const newTaskText = prompt("Edit your task:", taskText);
        if (newTaskText !== null && newTaskText.trim() !== "") {
            taskItem.querySelector(".task-text").textContent = newTaskText;
            updateTaskInStorage(taskItem.dataset.id, { text: newTaskText });
            showNotification("Task updated!", "success");
        }
    });
    
    // Delete button event
    taskItem.querySelector(".delete").addEventListener("click", () => {
        if (confirm("Are you sure you want to delete this task?")) {
            deleteTask(taskItem.dataset.id);
            taskItem.remove();
            updateTaskCounters();
            checkEmptyState();
            showNotification("Task deleted!", "success");
        }
    });
}

function loadTasks() {
    let tasks = [];
    try {
        const storedTasks = localStorage.getItem("tasks");
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
        }
    } catch (error) {
        console.error("Error loading tasks from localStorage:", error);
        tasks = [];
    }
    
    // Clear existing tasks
    taskList.innerHTML = "";
    
    // Add tasks to DOM
    tasks.forEach(task => {
        appendTaskToDOM(task);
    });
    
    // Update counters
    updateTaskCounters();
    
    // Check empty state
    checkEmptyState();
}

function saveTask(task) {
    let tasks = [];
    try {
        const storedTasks = localStorage.getItem("tasks");
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
        }
        tasks.push(task);
        localStorage.setItem("tasks", JSON.stringify(tasks));
    } catch (error) {
        console.error("Error saving task to localStorage:", error);
        showNotification("Failed to save task. Please try again.", "error");
    }
}

function updateTaskInStorage(taskId, updates) {
    let tasks = [];
    try {
        const storedTasks = localStorage.getItem("tasks");
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
            const taskIndex = tasks.findIndex(task => task.id == taskId);
            if (taskIndex !== -1) {
                tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
                localStorage.setItem("tasks", JSON.stringify(tasks));
            }
        }
    } catch (error) {
        console.error("Error updating task in localStorage:", error);
        showNotification("Failed to update task. Please try again.", "error");
    }
}

function deleteTask(taskId) {
    let tasks = [];
    try {
        const storedTasks = localStorage.getItem("tasks");
        if (storedTasks) {
            tasks = JSON.parse(storedTasks);
            const taskIndex = tasks.findIndex(task => task.id == taskId);
            if (taskIndex !== -1) {
                tasks.splice(taskIndex, 1);
                localStorage.setItem("tasks", JSON.stringify(tasks));
            }
        }
    } catch (error) {
        console.error("Error deleting task from localStorage:", error);
        showNotification("Failed to delete task. Please try again.", "error");
    }
}

function clearCompleted() {
    const completedTasks = document.querySelectorAll("li.completed");
    if (completedTasks.length === 0) {
        showNotification("No completed tasks to clear!", "warning");
        return;
    }
    
    if (confirm(`Are you sure you want to delete ${completedTasks.length} completed task(s)?`)) {
        // Remove from DOM
        completedTasks.forEach(task => {
            deleteTask(task.dataset.id);
            task.remove();
        });
        
        // Update counters
        updateTaskCounters();
        
        // Check empty state
        checkEmptyState();
        
        showNotification("Completed tasks cleared!", "success");
    }
}

function filterTasks() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    const taskItems = document.querySelectorAll("#taskList li");
    
    taskItems.forEach(task => {
        const taskText = task.querySelector(".task-text").textContent.toLowerCase();
        if (taskText.includes(searchTerm)) {
            task.style.display = "block";
        } else {
            task.style.display = "none";
        }
    });
    
    checkEmptyState();
}

function setFilter(filter) {
    currentFilter = filter;
    
    // Update active filter button
    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    
    if (filter === "all") {
        allTasksBtn.classList.add("active");
    } else if (filter === "active") {
        activeTasksBtn.classList.add("active");
    } else if (filter === "completed") {
        completedTasksBtn.classList.add("active");
    }
    
    applyFilter();
}

function applyFilter() {
    const taskItems = document.querySelectorAll("#taskList li");
    
    taskItems.forEach(task => {
        const isCompleted = task.classList.contains("completed");
        
        if (currentFilter === "all") {
            task.style.display = "block";
        } else if (currentFilter === "active" && !isCompleted) {
            task.style.display = "block";
        } else if (currentFilter === "completed" && isCompleted) {
            task.style.display = "block";
        } else {
            task.style.display = "none";
        }
    });
    
    checkEmptyState();
}

function updateTaskCounters() {
    const totalTasks = document.querySelectorAll("#taskList li").length;
    const completedTasks = document.querySelectorAll("#taskList li.completed").length;
    const pendingTasks = totalTasks - completedTasks;
    
    totalTasksCounter.textContent = totalTasks;
    completedTasksCounter.textContent = completedTasks;
    pendingTasksCounter.textContent = pendingTasks;
    
    // Add animation to counters
    animateStatistics();
}

function checkEmptyState() {
    const visibleTasks = document.querySelectorAll("#taskList li[style='display: block']").length;
    
    if (visibleTasks === 0) {
        let message = "No tasks found. Ready to be productive?";
        
        if (currentFilter === "active") {
            message = "No active tasks. All done for now!";
        } else if (currentFilter === "completed") {
            message = "No completed tasks yet. Keep going!";
        } else if (searchInput.value.trim() !== "") {
            message = "No matching tasks found. Try a different search.";
        }
        
        emptyState.querySelector("p").textContent = message;
        emptyState.style.display = "block";
    } else {
        emptyState.style.display = "none";
    }
}

function exportTasks() {
    try {
        const storedTasks = localStorage.getItem("tasks");
        if (!storedTasks || JSON.parse(storedTasks).length === 0) {
            showNotification("No tasks to export!", "warning");
            return;
        }
        
        const tasks = JSON.parse(storedTasks);
        const tasksForExport = tasks.map(task => {
            return {
                task: task.text,
                priority: task.priority,
                status: task.completed ? "Completed" : "Pending",
                dateAdded: formatDate(new Date(task.dateAdded))
            };
        });
        
        // Convert to CSV
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
        
        // Create download link
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
        showNotification("Failed to export tasks. Please try again.", "error");
    }
}

function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
}

function formatDate(date) {
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

function formatDateForFilename(date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

function showNotification(message, type = "info") {
    // Check if notification container exists, if not create it
    let notifContainer = document.querySelector(".notification-container");
    if (!notifContainer) {
        notifContainer = document.createElement("div");
        notifContainer.className = "notification-container";
        document.body.appendChild(notifContainer);
        
        // Add styles for notification container
        const style = document.createElement("style");
        style.textContent = `
            .notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 1000;
            }
            .notification {
                padding: 12px 16px;
                margin-bottom: 10px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                color: white;
                font-size: 14px;
                font-weight: 500;
                display: flex;
                align-items: center;
                justify-content: space-between;
                min-width: 280px;
                max-width: 320px;
                opacity: 0;
                transform: translateX(50px);
                animation: slideIn 0.3s forwards, fadeOut 0.5s 2.5s forwards;
            }
            .notification.success {
                background-color: #22c55e;
            }
            .notification.error {
                background-color: #ef4444;
            }
            .notification.info {
                background-color: #3b82f6;
            }
            .notification.warning {
                background-color: #f59e0b;
            }
            .close-notification {
                background: none;
                border: none;
                color: white;
                opacity: 0.7;
                cursor: pointer;
                font-size: 16px;
                padding: 0 0 0 10px;
                transition: opacity 0.2s;
            }
            .close-notification:hover {
                opacity: 1;
                background: none;
                transform: none;
                box-shadow: none;
            }
            @keyframes slideIn {
                from { opacity: 0; transform: translateX(50px); }
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        ${message}
        <button class="close-notification">×</button>
    `;
    
    // Add to container
    notifContainer.appendChild(notification);
    
    // Add close button functionality
    notification.querySelector(".close-notification").addEventListener("click", () => {
        notification.remove();
    });
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 3000);
}

function animateStatistics() {
    const statBoxes = document.querySelectorAll(".stat-box");
    statBoxes.forEach((box, index) => {
        setTimeout(() => {
            box.style.animation = "none";
            setTimeout(() => {
                box.style.animation = "fadeIn 0.5s ease forwards";
            }, 10);
        }, index * 100);
    });
}