const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Import chokidar for file watching
const chokidar = require('chokidar');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = process.env.DATA_FILE || './data/cashflow.json';
const TASKS_FILE = '/root/.openclaw/workspace/tasks.json';
const ACTIVITY_LOGS_FILE = '/root/.openclaw/workspace/activity_logs.json';
const WEB_PASSWORD = process.env.WEB_PASSWORD;

// Track manual changes from web app
let isManualWebAppChange = false;

app.use(cors());
app.use(express.json());

// Middleware to track manual web app changes
app.use((req, res, next) => {
  // Mark as manual change if it's a task API request
  if (req.path.startsWith('/api/tasks') && req.method !== 'GET') {
    isManualWebAppChange = true;
    // Reset flag after a short delay
    setTimeout(() => {
      isManualWebAppChange = false;
    }, 1000);
  }
  next();
});

// Auth middleware
const verifyPassword = (req, res, next) => {
  const authHeader = req.headers['x-password'];
  if (authHeader === WEB_PASSWORD) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized' });
  }
};

// Ensure data file exists
async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2));
  }
}

// Helper: Read data
async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// Helper: Write data (atomic)
async function writeData(data) {
  const tempPath = `${DATA_FILE}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
  await fs.rename(tempPath, DATA_FILE);
}

// Helper: Read activity logs
async function readActivityLogs() {
  try {
    const data = await fs.readFile(ACTIVITY_LOGS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return {
      logs: parsed.logs || [],
      last_cleanup: parsed.last_cleanup || ''
    };
  } catch (error) {
    return { logs: [], last_cleanup: '' };
  }
}

// Helper: Write activity logs (atomic)
async function writeActivityLogs(logsData) {
  const tempPath = `${ACTIVITY_LOGS_FILE}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(logsData, null, 2));
  await fs.rename(tempPath, ACTIVITY_LOGS_FILE);
}

// Helper: Log activity
async function logActivity(actionType, description, details = {}, status = 'success', errorMessage = null, source = 'web_app') {
  try {
    const now = new Date();
    const philippineTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = `${months[philippineTime.getMonth()]} ${philippineTime.getDate()} ${philippineTime.getFullYear()}`;
    
    let hours = philippineTime.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutes = philippineTime.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}${ampm}`;
    
    const logsData = await readActivityLogs();
    
    const newLog = {
      id: Date.now().toString(),
      timestamp: now.toISOString(),
      date,
      time,
      timezone: 'PHT',
      actor: 'System',
      source,
      action_type: actionType,
      description,
      details,
      status,
      error_message: errorMessage
    };
    
    logsData.logs.unshift(newLog);
    
    // Keep only last 2000 logs to prevent file from getting too large
    if (logsData.logs.length > 2000) {
      logsData.logs = logsData.logs.slice(0, 2000);
    }
    
    await writeActivityLogs(logsData);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

// Helper: Cleanup old logs (older than 15 days)
async function cleanupOldLogs() {
  try {
    const logsData = await readActivityLogs();
    const now = Date.now();
    const fifteenDaysMs = 15 * 24 * 60 * 60 * 1000;
    
    const originalCount = logsData.logs.length;
    logsData.logs = logsData.logs.filter(log => {
      const logTime = new Date(log.timestamp).getTime();
      return (now - logTime) < fifteenDaysMs;
    });
    
    logsData.last_cleanup = new Date().toISOString();
    await writeActivityLogs(logsData);
    
    const removedCount = originalCount - logsData.logs.length;
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} old activity logs`);
    }
  } catch (error) {
    console.error('Failed to cleanup logs:', error);
  }
}

// Schedule cleanup to run every 24 hours
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

// Initialize task file watcher
initializeTaskWatcher();

// Task file watching for automatic activity logging
let tasksWatcher = null;
let lastTaskContent = null;

async function initializeTaskWatcher() {
  try {
    // Read initial content
    lastTaskContent = await fs.readFile(TASKS_FILE, 'utf8');
    
    // Watch for changes
    tasksWatcher = chokidar.watch(TASKS_FILE);
    
    tasksWatcher.on('change', async () => {
      if (isManualWebAppChange) {
        isManualWebAppChange = false;
        return;
      }
      
      try {
        const newContent = await fs.readFile(TASKS_FILE, 'utf8');
        if (newContent === lastTaskContent) {
          return;
        }
        
        const oldTasks = JSON.parse(lastTaskContent);
        const newTasks = JSON.parse(newContent);
        const changes = detectTaskChanges(oldTasks, newTasks);
        
        // Log detected changes
        for (const change of changes) {
          await logActivity(
            change.type,
            change.description,
            change.details,
            'success',
            null,
            'telegram'
          );
        }
        
        lastTaskContent = newContent;
      } catch (error) {
        console.error('Error watching tasks:', error);
      }
    });
    
    console.log('Task file watcher initialized');
  } catch (error) {
    console.error('Failed to initialize task watcher:', error);
  }
}

function detectTaskChanges(oldTasks, newTasks) {
  const changes = [];
  const oldIds = new Set(oldTasks.tasks?.map(t => t.id) || []);
  const newIds = new Set(newTasks.tasks?.map(t => t.id) || []);
  const oldTaskMap = new Map(oldTasks.tasks?.map(t => [t.id, t]) || []);
  const newTaskMap = new Map(newTasks.tasks?.map(t => [t.id, t]) || []);
  
  // Detect deletions
  for (const id of oldIds) {
    if (!newIds.has(id)) {
      const task = oldTaskMap.get(id);
      changes.push({
        type: 'task_delete',
        description: `Deleted task: ${task.name}`,
        details: { task_id: id, task_name: task.name }
      });
    }
  }
  
  // Detect additions
  for (const id of newIds) {
    if (!oldIds.has(id)) {
      const task = newTaskMap.get(id);
      changes.push({
        type: 'task_create',
        description: `Added task: ${task.name}`,
        details: {
          task_id: id,
          task_name: task.name,
          priority: task.priority || 'medium',
          date: task.date || '',
          time: task.time || ''
        }
      });
    }
  }
  
  // Detect updates
  for (const task of newTasks.tasks || []) {
    const oldTask = oldTaskMap.get(task.id);
    if (oldTask && JSON.stringify(oldTask) !== JSON.stringify(task)) {
      const changedFields = [];
      if (oldTask.name !== task.name) changedFields.push('name');
      if (oldTask.priority !== task.priority) changedFields.push('priority');
      if (oldTask.date !== task.date) changedFields.push('date');
      if (oldTask.time !== task.time) changedFields.push('time');
      
      changes.push({
        type: 'task_update',
        description: `Updated task: ${task.name}`,
        details: {
          task_id: task.id,
          task_name: task.name,
          changed_fields: changedFields,
          old_values: oldTask,
          new_values: task
        }
      });
    }
  }
  
  return changes;
}

// ============================================================================
// CENTRALIZED ACTIVITY LOGGER SERVICE
// All task and cashflow operations automatically log activities
// ============================================================================

const ActivityLogger = {
  /**
   * Log a task creation
   */
  async logTaskCreate(task, source = 'telegram') {
    await logActivity(
      'task_create',
      `Added task: ${task.name}`,
      {
        task_id: task.id,
        task_name: task.name,
        priority: task.priority || 'medium',
        date: task.date || '',
        time: task.time || ''
      },
      'success',
      null,
      source
    );
  },

  /**
   * Log a task update
   */
  async logTaskUpdate(task, oldTask, source = 'telegram') {
    const changedFields = [];
    if (oldTask.name !== task.name) changedFields.push('name');
    if (oldTask.priority !== task.priority) changedFields.push('priority');
    if (oldTask.date !== task.date) changedFields.push('date');
    if (oldTask.time !== task.time) changedFields.push('time');

    await logActivity(
      'task_update',
      `Updated task: ${task.name}`,
      {
        task_id: task.id,
        task_name: task.name,
        changed_fields: changedFields,
        old_values: oldTask,
        new_values: task
      },
      'success',
      null,
      source
    );
  },

  /**
   * Log a task deletion
   */
  async logTaskDelete(task, source = 'telegram') {
    await logActivity(
      'task_delete',
      `Deleted task: ${task.name}`,
      {
        task_id: task.id,
        task_name: task.name
      },
      'success',
      null,
      source
    );
  },

  /**
   * Log a cashflow entry addition
   */
  async logCashflowAdd(entry, source = 'web_app') {
    await logActivity(
      'cashflow_add',
      `Added ${entry.type}: ${entry.item} ${entry.amount} ${entry.currency}`,
      {
        item: entry.item,
        amount: entry.amount,
        currency: entry.currency,
        category: entry.category
      },
      'success',
      null,
      source
    );
  },

  /**
   * Log a cashflow entry deletion
   */
  async logCashflowDelete(entry, source = 'web_app') {
    await logActivity(
      'cashflow_delete',
      `Deleted ${entry.type}: ${entry.item} ${entry.amount} ${entry.currency}`,
      {
        entry_id: entry.id,
        item: entry.item,
        amount: entry.amount,
        currency: entry.currency
      },
      'success',
      null,
      source
    );
  }
};

// ============================================================================
// NEW API ENDPOINTS FOR EMILY (AI AGENT)
// These endpoints auto-log all activities
// ============================================================================

/**
 * POST /api/emily/tasks/create
 * Emily calls this to create a task - logging is automatic
 */
app.post('/api/emily/tasks/create', verifyPassword, async (req, res) => {
  try {
    const { name, priority, date, time, source } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Task name is required' 
      });
    }

    const tasks = await readTasks();
    
    // Generate new ID
    const existingIds = tasks.map(t => parseInt(t.id) || 0);
    const newId = existingIds.length > 0 
      ? (Math.max(...existingIds) + 1).toString().padStart(3, '0')
      : '001';

    // Create task
    const newTask = {
      id: newId,
      name: name.trim(),
      date: date || '',
      time: time || '',
      status: 'active',
      priority: priority || 'medium'
    };

    tasks.push(newTask);
    await writeTasks(tasks);

    // Auto-log activity
    await ActivityLogger.logTaskCreate(newTask, source || 'telegram');

    res.json({
      success: true,
      task: newTask,
      activity_logged: true
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/emily/tasks/update/:id
 * Emily calls this to update a task - logging is automatic
 */
app.post('/api/emily/tasks/update/:id', verifyPassword, async (req, res) => {
  try {
    const { name, priority, date, time, source } = req.body;
    const taskId = req.params.id;

    const tasks = await readTasks();
    const index = tasks.findIndex(t => t.id === taskId);

    if (index === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
    }

    const oldTask = { ...tasks[index] };
    
    // Update fields
    if (name !== undefined) tasks[index].name = name.trim();
    if (priority !== undefined) tasks[index].priority = priority;
    if (date !== undefined) tasks[index].date = date;
    if (time !== undefined) tasks[index].time = time;

    await writeTasks(tasks);

    // Auto-log activity
    await ActivityLogger.logTaskUpdate(tasks[index], oldTask, source || 'telegram');

    res.json({
      success: true,
      task: tasks[index],
      changes: { name, priority, date, time },
      activity_logged: true
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/emily/tasks/delete/:id
 * Emily calls this to delete a task - logging is automatic
 */
app.post('/api/emily/tasks/delete/:id', verifyPassword, async (req, res) => {
  try {
    const taskId = req.params.id;
    const { source } = req.body;

    const tasks = await readTasks();
    const index = tasks.findIndex(t => t.id === taskId);

    if (index === -1) {
      return res.status(404).json({ 
        success: false, 
        error: 'Task not found' 
      });
    }

    const deletedTask = tasks[index];
    tasks.splice(index, 1);
    await writeTasks(tasks);

    // Auto-log activity
    await ActivityLogger.logTaskDelete(deletedTask, source || 'telegram');

    res.json({
      success: true,
      deleted_task_id: taskId,
      deleted_task_name: deletedTask.name,
      activity_logged: true
    });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * POST /api/emily/tasks/delete-by-name
 * Emily calls this to delete a task by name - logging is automatic
 */
app.post('/api/emily/tasks/delete-by-name', verifyPassword, async (req, res) => {
  try {
    const { task_name, source } = req.body;

    if (!task_name) {
      return res.status(400).json({ 
        success: false, 
        error: 'Task name is required' 
      });
    }

    const tasks = await readTasks();
    const index = tasks.findIndex(t => 
      t.name.toLowerCase() === task_name.toLowerCase()
    );

    if (index === -1) {
      return res.status(404).json({ 
        success: false, 
        error: `Task "${task_name}" not found` 
      });
    }

    const deletedTask = tasks[index];
    tasks.splice(index, 1);
    await writeTasks(tasks);

    // Auto-log activity
    await ActivityLogger.logTaskDelete(deletedTask, source || 'telegram');

    res.json({
      success: true,
      deleted_task_id: deletedTask.id,
      deleted_task_name: deletedTask.name,
      activity_logged: true
    });
  } catch (error) {
    console.error('Error deleting task by name:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// ============================================================================
// EXISTING API ENDPOINTS
// ============================================================================
app.get('/api/cashflow', verifyPassword, async (req, res) => {
  try {
    const data = await readData();
    const { category, currency, startDate, endDate, search } = req.query;
    
    let filtered = data;
    
    if (category && category !== 'All') {
      filtered = filtered.filter(e => e.category === category);
    }
    if (currency && currency !== 'All') {
      filtered = filtered.filter(e => e.currency === currency);
    }
    if (startDate) {
      filtered = filtered.filter(e => e.date >= startDate);
    }
    if (endDate) {
      filtered = filtered.filter(e => e.date <= endDate);
    }
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(e => 
        e.item.toLowerCase().includes(searchLower) ||
        (e.notes && e.notes.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort by date descending
    filtered.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/summary - Get summary stats
app.get('/api/summary', verifyPassword, async (req, res) => {
  try {
    const data = await readData();
    const totalIncome = data.filter(e => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = Math.abs(data.filter(e => e.amount < 0).reduce((sum, e) => sum + e.amount, 0));
    const balance = totalIncome - totalExpenses;
    
    res.json({
      totalIncome,
      totalExpenses,
      balance,
      transactionCount: data.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/cashflow - Add new entry
app.post('/api/cashflow', verifyPassword, async (req, res) => {
  try {
    const data = await readData();
    
    const newEntry = {
      id: Date.now().toString(),
      item: req.body.item,
      amount: parseFloat(req.body.amount),
      currency: req.body.currency || 'PHP',
      date: req.body.date,
      time: req.body.time,
      timezone: req.body.timezone || 'PHT',
      category: req.body.category || 'Other',
      notes: req.body.notes || ''
    };
    
    data.push(newEntry);
    await writeData(data);
    
    // Determine source from request body (default to 'web_app')
    const source = req.body.source || 'web_app';
    
    // Log the activity
    await logActivity(
      'cashflow_add',
      `Added ${newEntry.amount >= 0 ? 'income' : 'expense'}: ${newEntry.item} ${newEntry.amount >= 0 ? '+' : ''}${newEntry.amount} ${newEntry.currency}`,
      {
        item: newEntry.item,
        amount: newEntry.amount,
        currency: newEntry.currency,
        category: newEntry.category
      },
      'success',
      null,
      source
    );
    
    res.status(201).json(newEntry);
  } catch (error) {
    // Determine source from request body (default to 'web_app')
    const source = req.body.source || 'web_app';
    
    // Log the failure
    await logActivity(
      'cashflow_add',
      `Failed to add cashflow entry: ${req.body.item}`,
      { item: req.body.item },
      'failed',
      error.message,
      source
    );
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/cashflow/:id - Update entry
app.put('/api/cashflow/:id', verifyPassword, async (req, res) => {
  try {
    const data = await readData();
    const index = data.findIndex(e => e.id === req.params.id);
    
    // Determine source from request body (default to 'web_app')
    const source = req.body.source || 'web_app';
    
    if (index === -1) {
      await logActivity(
        'cashflow_update',
        `Failed to update cashflow: Entry ${req.params.id} not found`,
        { entry_id: req.params.id },
        'failed',
        'Entry not found',
        source
      );
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const oldEntry = data[index];
    data[index] = {
      ...data[index],
      ...req.body,
      id: data[index].id
    };
    
    await writeData(data);
    
    // Log the activity
    await logActivity(
      'cashflow_update',
      `Updated cashflow entry: ${data[index].item}`,
      {
        entry_id: req.params.id,
        old_values: oldEntry,
        new_values: data[index]
      },
      'success',
      null,
      source
    );
    
    res.json(data[index]);
  } catch (error) {
    // Determine source from request body (default to 'web_app')
    const source = req.body.source || 'web_app';
    
    await logActivity(
      'cashflow_update',
      `Failed to update cashflow entry: ${req.params.id}`,
      { entry_id: req.params.id },
      'failed',
      error.message,
      source
    );
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/cashflow/:id - Delete entry
app.delete('/api/cashflow/:id', verifyPassword, async (req, res) => {
  try {
    const data = await readData();
    const index = data.findIndex(e => e.id === req.params.id);
    
    // Determine source from query params (default to 'web_app')
    const source = req.query.source || 'web_app';
    
    if (index === -1) {
      await logActivity(
        'cashflow_delete',
        `Failed to delete cashflow: Entry ${req.params.id} not found`,
        { entry_id: req.params.id },
        'failed',
        'Entry not found',
        source
      );
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const deletedEntry = data[index];
    data.splice(index, 1);
    await writeData(data);
    
    // Log the activity
    await logActivity(
      'cashflow_delete',
      `Deleted cashflow entry: ${deletedEntry.item} ${deletedEntry.amount} ${deletedEntry.currency}`,
      {
        entry_id: req.params.id,
        deleted_entry: deletedEntry
      },
      'success',
      null,
      source
    );
    
    res.status(204).send();
  } catch (error) {
    // Determine source from query params (default to 'web_app')
    const source = req.query.source || 'web_app';
    
    await logActivity(
      'cashflow_delete',
      `Failed to delete cashflow entry: ${req.params.id}`,
      { entry_id: req.params.id },
      'failed',
      error.message,
      source
    );
    res.status(500).json({ error: error.message });
  }
});

// Helper: Read tasks
async function readTasks() {
  try {
    const data = await fs.readFile(TASKS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.tasks || [];
  } catch (error) {
    return [];
  }
}

// Helper: Write tasks
async function writeTasks(tasks) {
  const tempPath = `${TASKS_FILE}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify({ tasks }, null, 2));
  await fs.rename(tempPath, TASKS_FILE);
}

// Helper: Generate next task ID
function generateTaskId(tasks) {
  // Always generate sequential IDs starting from 001
  // This prevents ID conflicts by using the array length as the counter
  const nextNumber = (tasks.length || 0) + 1;
  return String(nextNumber).padStart(3, '0');
}

// GET /api/tasks - Get all tasks
app.get('/api/tasks', verifyPassword, async (req, res) => {
  try {
    const tasks = await readTasks();
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tasks - Add new task
app.post('/api/tasks', verifyPassword, async (req, res) => {
  try {
    const tasks = await readTasks();
    
    // Source is determined by middleware
    const source = isManualWebAppChange ? 'web_app' : 'telegram';
    
    const newTask = {
      id: generateTaskId(tasks),
      name: req.body.name,
      date: req.body.date || '',
      time: req.body.time || '',
      status: req.body.status || 'active',
      priority: req.body.priority || 'medium'
    };
    
    tasks.push(newTask);
    await writeTasks(tasks);
    
    // Log the activity
    await logActivity(
      'task_create',
      `Created task: ${newTask.name}`,
      {
        task_id: newTask.id,
        task_name: newTask.name,
        status: newTask.status,
        priority: newTask.priority
      },
      'success',
      null,
      source
    );
    
    res.status(201).json(newTask);
  } catch (error) {
    // Source is determined by middleware
    const source = isManualWebAppChange ? 'web_app' : 'telegram';
    
    await logActivity(
      'task_create',
      `Failed to create task: ${req.body.name}`,
      { task_name: req.body.name },
      'failed',
      error.message,
      source
    );
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tasks/:id - Update task
app.put('/api/tasks/:id', verifyPassword, async (req, res) => {
  try {
    const tasks = await readTasks();
    const index = tasks.findIndex(t => t.id === req.params.id);
    
    // Source is determined by middleware
    const source = isManualWebAppChange ? 'web_app' : 'telegram';
    
    if (index === -1) {
      await logActivity(
        'task_update',
        `Failed to update task: Task ${req.params.id} not found`,
        { task_id: req.params.id },
        'failed',
        'Task not found',
        source
      );
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const oldTask = tasks[index];
    tasks[index] = {
      ...tasks[index],
      ...req.body,
      id: tasks[index].id
    };
    
    await writeTasks(tasks);
    
    // Log the activity
    await logActivity(
      'task_update',
      `Updated task: ${tasks[index].name}`,
      {
        task_id: req.params.id,
        old_values: oldTask,
        new_values: tasks[index]
      },
      'success',
      null,
      source
    );
    
    res.json(tasks[index]);
  } catch (error) {
    // Source is determined by middleware
    const source = isManualWebAppChange ? 'web_app' : 'telegram';
    
    await logActivity(
      'task_update',
      `Failed to update task: ${req.params.id}`,
      { task_id: req.params.id },
      'failed',
      error.message,
      source
    );
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tasks/:id - Delete task
app.delete('/api/tasks/:id', verifyPassword, async (req, res) => {
  try {
    const tasks = await readTasks();
    const index = tasks.findIndex(t => t.id === req.params.id);
    
    // Source is determined by middleware
    const source = isManualWebAppChange ? 'web_app' : 'telegram';
    
    if (index === -1) {
      await logActivity(
        'task_delete',
        `Failed to delete task: Task ${req.params.id} not found`,
        { task_id: req.params.id },
        'failed',
        'Task not found',
        source
      );
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const deletedTask = tasks[index];
    tasks.splice(index, 1);
    await writeTasks(tasks);
    
    // Log the activity
    await logActivity(
      'task_delete',
      `Deleted task: ${deletedTask.name}`,
      {
        task_id: req.params.id,
        deleted_task: deletedTask
      },
      'success',
      null,
      source
    );
    
    res.status(204).send();
  } catch (error) {
    // Source is determined by middleware
    const source = isManualWebAppChange ? 'web_app' : 'telegram';
    
    await logActivity(
      'task_delete',
      `Failed to delete task: ${req.params.id}`,
      { task_id: req.params.id },
      'failed',
      error.message,
      source
    );
    res.status(500).json({ error: error.message });
  }
});

// GET /api/activity-logs - Get activity logs with search/filter
app.get('/api/activity-logs', verifyPassword, async (req, res) => {
  try {
    const { search, action_type, date_from, date_to, status, source } = req.query;
    const logsData = await readActivityLogs();
    let logs = logsData.logs;
    
    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      logs = logs.filter(log => 
        log.description.toLowerCase().includes(searchLower) ||
        JSON.stringify(log.details).toLowerCase().includes(searchLower)
      );
    }
    
    if (action_type) {
      logs = logs.filter(log => log.action_type === action_type);
    }
    
    if (status) {
      logs = logs.filter(log => log.status === status);
    }
    
    if (source) {
      logs = logs.filter(log => log.source === source);
    }
    
    if (date_from) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(date_from));
    }
    
    if (date_to) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(date_to));
    }
    
    // Sort by timestamp descending (newest first)
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    res.json({
      logs,
      total_count: logs.length,
      last_cleanup: logsData.last_cleanup
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/activity-logs/stats - Get activity log statistics
app.get('/api/activity-logs/stats', verifyPassword, async (req, res) => {
  try {
    const logsData = await readActivityLogs();
    const logs = logsData.logs;
    
    // Calculate stats
    const totalLogs = logs.length;
    const successCount = logs.filter(l => l.status === 'success').length;
    const failedCount = logs.filter(l => l.status === 'failed').length;
    
    // Count by action type
    const actionTypes = {};
    logs.forEach(log => {
      actionTypes[log.action_type] = (actionTypes[log.action_type] || 0) + 1;
    });
    
    // Count by source
    const sources = {};
    logs.forEach(log => {
      sources[log.source] = (sources[log.source] || 0) + 1;
    });
    
    res.json({
      total_logs: totalLogs,
      success_count: successCount,
      failed_count: failedCount,
      action_types: actionTypes,
      sources: sources,
      last_cleanup: logsData.last_cleanup
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/activity-logs - Manual logging endpoint (for Emily/skills)
app.post('/api/activity-logs', verifyPassword, async (req, res) => {
  try {
    const { action_type, description, details, status, error_message, source, actor } = req.body;
    
    const now = new Date();
    const philippineTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const date = `${months[philippineTime.getMonth()]} ${philippineTime.getDate()} ${philippineTime.getFullYear()}`;
    
    let hours = philippineTime.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutes = philippineTime.getMinutes().toString().padStart(2, '0');
    const time = `${hours}:${minutes}${ampm}`;
    
    const logsData = await readActivityLogs();
    
    const newLog = {
      id: Date.now().toString(),
      timestamp: now.toISOString(),
      date,
      time,
      timezone: 'PHT',
      actor: actor || 'Emily',
      source: source || 'telegram',
      action_type,
      description,
      details: details || {},
      status: status || 'success',
      error_message: error_message || null
    };
    
    logsData.logs.unshift(newLog);
    
    // Keep only last 2000 logs
    if (logsData.logs.length > 2000) {
      logsData.logs = logsData.logs.slice(0, 2000);
    }
    
    await writeActivityLogs(logsData);
    
    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
ensureDataFile().then(() => {
  // Run cleanup on startup
  cleanupOldLogs().then(() => {
    console.log('Activity logs cleanup completed');
  });
  
  app.listen(PORT, () => {
    console.log(`Cashflow API running on http://localhost:${PORT}`);
    console.log(`Activity logging enabled`);
  });
}).catch(err => {
  console.error('Failed to initialize data file:', err);
  process.exit(1);
});
