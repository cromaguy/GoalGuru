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
}

function addTask() {
    const taskText = taskInput.value.trim();
    if (taskText === "") {
        alert("Please enter a task!");
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
        li.style.borderLeftColor = "#ff5252";
    } else if (task.priority === "low") {
        li.style.borderLeftColor = "#4CAF50";
    } else {
        li.style.borderLeftColor = "#4e6cff";
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
    });
    
    // Edit button event
    taskItem.querySelector(".edit").addEventListener("click", () => {
        const taskText = taskItem.querySelector(".task-text").textContent;
        const newTaskText = prompt("Edit your task:", taskText);
        if (newTaskText !== null && newTaskText.trim() !== "") {
            taskItem.querySelector(".task-text").textContent = newTaskText;
            updateTaskInStorage(taskItem.dataset.id, { text: newTaskText });
        }
    });
    
    // Delete button event
    taskItem.querySelector(".delete").addEventListener("click", () => {
        if (confirm("Are you sure you want to delete this task?")) {
            taskItem.remove();
            removeTaskFromStorage(taskItem.dataset.id);
            updateTaskCounters();
            checkEmptyState();
        }
    });
}

// Save task to local storage
function saveTask(task) {
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasks.push(task);
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Load tasks from local storage
function loadTasks() {
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasks.forEach(task => {
        appendTaskToDOM(task);
    });
}

// Update task in local storage
function updateTaskInStorage(taskId, updates) {
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasks = tasks.map(task => {
        if (task.id == taskId) {
            return { ...task, ...updates };
        }
        return task;
    });
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Remove task from local storage
function removeTaskFromStorage(taskId) {
    let tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    tasks = tasks.filter(task => task.id != taskId);
    localStorage.setItem("tasks", JSON.stringify(tasks));
}

// Clear completed tasks
function clearCompleted() {
    const completedTasks = document.querySelectorAll("li.completed");
    if (completedTasks.length === 0) return;
    
    if (confirm("Are you sure you want to clear all completed tasks?")) {
        completedTasks.forEach(task => {
            removeTaskFromStorage(task.dataset.id);
            task.remove();
        });
        updateTaskCounters();
        checkEmptyState();
    }
}

// Export tasks
function exportTasks() {
    const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
    if (tasks.length === 0) {
        alert("No tasks to export!");
        return;
    }
    
    const taskText = tasks.map(task => 
        `[${task.completed ? "✓" : " "}] ${task.text} (${task.priority})`
    ).join("\n");
    
    const blob = new Blob([taskText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = "tasks.txt";
    a.click();
    
    URL.revokeObjectURL(url);
}

// Filter tasks
function filterTasks() {
    const searchTerm = searchInput.value.toLowerCase();
    const tasks = document.querySelectorAll("#taskList li");
    
    tasks.forEach(task => {
        const taskText = task.querySelector(".task-text").textContent.toLowerCase();
        const matchesSearch = taskText.includes(searchTerm);
        
        // Check if task matches the current filter
        let matchesFilter = true;
        if (currentFilter === "active") {
            matchesFilter = !task.classList.contains("completed");
        } else if (currentFilter === "completed") {
            matchesFilter = task.classList.contains("completed");
        }
        
        if (matchesSearch && matchesFilter) {
            task.style.display = "";
        } else {
            task.style.display = "none";
        }
    });
    
    checkEmptyState();
}

// Set filter
function setFilter(filter) {
    currentFilter = filter;
    
    // Update active button
    [allTasksBtn, activeTasksBtn, completedTasksBtn].forEach(btn => {
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

// Apply filter
function applyFilter() {
    const tasks = document.querySelectorAll("#taskList li");
    const searchTerm = searchInput.value.toLowerCase();
    
    tasks.forEach(task => {
        const taskText = task.querySelector(".task-text").textContent.toLowerCase();
        const matchesSearch = taskText.includes(searchTerm);
        
        let matchesFilter = true;
        if (currentFilter === "active") {
            matchesFilter = !task.classList.contains("completed");
        } else if (currentFilter === "completed") {
            matchesFilter = task.classList.contains("completed");
        }
        
        if (matchesSearch && matchesFilter) {
            task.style.display = "";
        } else {
            task.style.display = "none";
        }
    });
    
    checkEmptyState();
}

// Update task counters
function updateTaskCounters() {
    const tasks = document.querySelectorAll("#taskList li");
    const completedTasks = document.querySelectorAll("#taskList li.completed");
    
    totalTasksCounter.textContent = tasks.length;
    completedTasksCounter.textContent = completedTasks.length;
    pendingTasksCounter.textContent = tasks.length - completedTasks.length;
}

// Check empty state
function checkEmptyState() {
    const visibleTasks = Array.from(document.querySelectorAll("#taskList li"))
        .filter(task => task.style.display !== "none");
    
    if (visibleTasks.length === 0) {
        emptyState.style.display = "block";
    } else {
        emptyState.style.display = "none";
    }
}

// Toggle theme
function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    localStorage.setItem("theme", document.body.classList.contains("dark-mode") ? "dark" : "light");
}

// Format date
function formatDate(date) {
    const options = { month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}