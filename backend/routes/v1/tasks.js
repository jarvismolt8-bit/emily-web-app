const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const { sendSuccess, sendError } = require('../../middleware/response');

const TASKS_FILE = '/root/.openclaw/workspace/tasks.json';
const ACTIVITY_LOGS_FILE = '/root/.openclaw/workspace/activity_logs.json';

async function readTasks() {
  try {
    const data = await fs.readFile(TASKS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.tasks || [];
  } catch (error) {
    return [];
  }
}

async function writeTasks(tasks) {
  const tempPath = `${TASKS_FILE}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify({ tasks }, null, 2));
  await fs.rename(tempPath, TASKS_FILE);
}

function generateTaskId(tasks) {
  const existingIds = tasks.map(t => parseInt(t.id) || 0);
  const maxId = existingIds.length > 0 ? Math.max(...existingIds) : 0;
  return String(maxId + 1).padStart(3, '0');
}

async function logActivity(req, actionType, description, details, status = 'success', errorMessage = null) {
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
    
    let logsData;
    try {
      const data = await fs.readFile(ACTIVITY_LOGS_FILE, 'utf8');
      logsData = JSON.parse(data);
    } catch {
      logsData = { logs: [], last_cleanup: '' };
    }
    
    const newLog = {
      id: Date.now().toString(),
      timestamp: now.toISOString(),
      date,
      time,
      timezone: 'PHT',
      actor: 'System',
      source: req.source || 'web_app',
      action_type: actionType,
      description,
      details,
      status,
      error_message: errorMessage
    };
    
    logsData.logs.unshift(newLog);
    
    if (logsData.logs.length > 2000) {
      logsData.logs = logsData.logs.slice(0, 2000);
    }
    
    const tempPath = `${ACTIVITY_LOGS_FILE}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(logsData, null, 2));
    await fs.rename(tempPath, ACTIVITY_LOGS_FILE);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

router.get('/', async (req, res) => {
  try {
    const { sortBy, sortOrder } = req.query;
    const tasks = await readTasks();
    
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    
    if (sortBy) {
      tasks.sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'id') {
          comparison = parseInt(a.id) - parseInt(b.id);
        } else if (sortBy === 'date') {
          const dateA = a.date ? new Date(a.date) : new Date('9999-12-31');
          const dateB = b.date ? new Date(b.date) : new Date('9999-12-31');
          comparison = dateA - dateB;
        } else if (sortBy === 'priority') {
          comparison = (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    } else {
      tasks.sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1));
    }
    
    sendSuccess(res, tasks);
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const tasks = await readTasks();
    const task = tasks.find(t => t.id === req.params.id);
    
    if (!task) {
      return sendError(res, 'RESOURCE_NOT_FOUND', 'Task not found', 404);
    }
    
    sendSuccess(res, task);
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, date, time, status, priority } = req.body;
    
    if (!name) {
      return sendError(res, 'VALIDATION_ERROR', 'Task name is required', 400);
    }
    
    const tasks = await readTasks();
    
    const newTask = {
      id: generateTaskId(tasks),
      name: name.trim(),
      date: date || '',
      time: time || '',
      status: status || 'active',
      priority: priority || 'medium'
    };
    
    tasks.push(newTask);
    await writeTasks(tasks);
    
    await logActivity(
      req,
      'task_create',
      `Created task: ${newTask.name}`,
      {
        task_id: newTask.id,
        task_name: newTask.name,
        status: newTask.status,
        priority: newTask.priority
      },
      'success'
    );
    
    sendSuccess(res, newTask, 'Task created', 201);
  } catch (error) {
    await logActivity(
      req,
      'task_create',
      `Failed to create task: ${req.body.name}`,
      { task_name: req.body.name },
      'failed',
      error.message
    );
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const tasks = await readTasks();
    const index = tasks.findIndex(t => t.id === req.params.id);
    
    if (index === -1) {
      await logActivity(
        req,
        'task_update',
        `Failed to update task: Task ${req.params.id} not found`,
        { task_id: req.params.id },
        'failed',
        'Task not found'
      );
      return sendError(res, 'RESOURCE_NOT_FOUND', 'Task not found', 404);
    }
    
    const oldTask = { ...tasks[index] };
    
    if (req.body.name !== undefined) tasks[index].name = req.body.name.trim();
    if (req.body.date !== undefined) tasks[index].date = req.body.date;
    if (req.body.time !== undefined) tasks[index].time = req.body.time;
    if (req.body.status !== undefined) tasks[index].status = req.body.status;
    if (req.body.priority !== undefined) tasks[index].priority = req.body.priority;
    
    await writeTasks(tasks);
    
    await logActivity(
      req,
      'task_update',
      `Updated task: ${tasks[index].name}`,
      {
        task_id: req.params.id,
        old_values: oldTask,
        new_values: tasks[index]
      },
      'success'
    );
    
    sendSuccess(res, tasks[index], 'Task updated');
  } catch (error) {
    await logActivity(
      req,
      'task_update',
      `Failed to update task: ${req.params.id}`,
      { task_id: req.params.id },
      'failed',
      error.message
    );
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const tasks = await readTasks();
    const index = tasks.findIndex(t => t.id === req.params.id);
    
    if (index === -1) {
      await logActivity(
        req,
        'task_delete',
        `Failed to delete task: Task ${req.params.id} not found`,
        { task_id: req.params.id },
        'failed',
        'Task not found'
      );
      return sendError(res, 'RESOURCE_NOT_FOUND', 'Task not found', 404);
    }
    
    const deletedTask = tasks[index];
    tasks.splice(index, 1);
    await writeTasks(tasks);
    
    await logActivity(
      req,
      'task_delete',
      `Deleted task: ${deletedTask.name}`,
      {
        task_id: req.params.id,
        deleted_task: deletedTask
      },
      'success'
    );
    
    sendSuccess(res, { id: req.params.id, name: deletedTask.name }, 'Task deleted');
  } catch (error) {
    await logActivity(
      req,
      'task_delete',
      `Failed to delete task: ${req.params.id}`,
      { task_id: req.params.id },
      'failed',
      error.message
    );
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.delete('/', async (req, res) => {
  try {
    const { name } = req.query;
    
    if (!name) {
      return sendError(res, 'VALIDATION_ERROR', 'Task name is required (use ?name=...)', 400);
    }
    
    const tasks = await readTasks();
    const index = tasks.findIndex(t => 
      t.name.toLowerCase() === name.toLowerCase()
    );
    
    if (index === -1) {
      return sendError(res, 'RESOURCE_NOT_FOUND', `Task "${name}" not found`, 404);
    }
    
    const deletedTask = tasks[index];
    tasks.splice(index, 1);
    await writeTasks(tasks);
    
    await logActivity(
      req,
      'task_delete',
      `Deleted task by name: ${deletedTask.name}`,
      {
        task_id: deletedTask.id,
        task_name: deletedTask.name
      },
      'success'
    );
    
    sendSuccess(res, { id: deletedTask.id, name: deletedTask.name }, 'Task deleted');
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

module.exports = router;
