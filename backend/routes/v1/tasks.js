const express = require('express');
const router = express.Router();
const { sendSuccess, sendError } = require('../../middleware/response');
const tasksRepo = require('../../repositories/tasks.repository');
const { logActivityFromReq } = require('../../utils/activity-logger');
const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '../../../documentation');

function getDocFilePath(taskId) {
  return path.join(DOCS_DIR, `${taskId}-improve-task.md`);
}

router.get('/:id/documentation', (req, res) => {
  try {
    const task = tasksRepo.findById(req.params.id);
    if (!task) {
      return sendError(res, 'RESOURCE_NOT_FOUND', 'Task not found', 404);
    }

    const docPath = getDocFilePath(req.params.id);
    
    if (fs.existsSync(docPath)) {
      const content = fs.readFileSync(docPath, 'utf8');
      sendSuccess(res, { content, exists: true });
    } else {
      sendSuccess(res, { content: '', exists: false });
    }
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.post('/:id/documentation', (req, res) => {
  try {
    const task = tasksRepo.findById(req.params.id);
    if (!task) {
      return sendError(res, 'RESOURCE_NOT_FOUND', 'Task not found', 404);
    }

    const { content } = req.body;
    if (!content) {
      return sendError(res, 'VALIDATION_ERROR', 'Content is required', 400);
    }

    const docPath = getDocFilePath(req.params.id);
    const today = new Date().toLocaleDateString('en-US', { 'month': 'short', 'day': '2-digit', 'year': 'numeric' });
    
    let finalContent = content;
    
    if (fs.existsSync(docPath)) {
      const existing = fs.readFileSync(docPath, 'utf8');
      const updatedMatch = existing.match(/^\*\*Updated:\*\* .+$/m);
      if (updatedMatch) {
        finalContent = content.replace(/^\*\*Updated:\*\* .+$/m, `**Updated:** ${today}`);
      }
    } else {
      finalContent = content.replace(/^\*\*Updated:\*\* .+$/m, `**Updated:** ${today}`);
    }

    fs.writeFileSync(docPath, finalContent, 'utf8');

    logActivityFromReq(
      req,
      'task_documentation_update',
      `Updated documentation for task ${req.params.id}`,
      { task_id: req.params.id },
      'success'
    );

    sendSuccess(res, { path: docPath }, 'Documentation updated');
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.get('/', (req, res) => {
  try {
    const { sortBy, sortOrder, status } = req.query;
    const tasks = tasksRepo.findAll({ sortBy, sortOrder, status });
    sendSuccess(res, tasks);
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.get('/:id', (req, res) => {
  try {
    const task = tasksRepo.findById(req.params.id);
    if (!task) {
      return sendError(res, 'RESOURCE_NOT_FOUND', 'Task not found', 404);
    }
    sendSuccess(res, task);
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.post('/', (req, res) => {
  try {
    const { name, description, date, time, status, priority } = req.body;

    if (!name) {
      return sendError(res, 'VALIDATION_ERROR', 'Task name is required', 400);
    }

    const source = req.body.source || req.source || 'web_app';
    const newTask = tasksRepo.create({ name, description, date, time, status, priority }, source);

    logActivityFromReq(
      req,
      'task_create',
      `Created task: ${newTask.name}`,
      {
        task_id: newTask.id,
        task_name: newTask.name,
        description: newTask.description,
        status: newTask.status,
        priority: newTask.priority
      },
      'success'
    );

    sendSuccess(res, newTask, 'Task created', 201);
  } catch (error) {
    logActivityFromReq(
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

router.put('/:id', (req, res) => {
  try {
    const oldTask = tasksRepo.findById(req.params.id);
    if (!oldTask) {
      logActivityFromReq(
        req,
        'task_update',
        `Failed to update task: Task ${req.params.id} not found`,
        { task_id: req.params.id },
        'failed',
        'Task not found'
      );
      return sendError(res, 'RESOURCE_NOT_FOUND', 'Task not found', 404);
    }

    const source = req.body.source || req.source || 'web_app';
    const updatedTask = tasksRepo.update(req.params.id, req.body, source);

    if (oldTask.status !== updatedTask.status) {
      logActivityFromReq(
        req,
        'task_status_change',
        `Changed task "${updatedTask.name}" status from ${oldTask.status} to ${updatedTask.status}`,
        {
          task_id: req.params.id,
          task_name: updatedTask.name,
          old_status: oldTask.status,
          new_status: updatedTask.status
        },
        'success'
      );
    } else {
      logActivityFromReq(
        req,
        'task_update',
        `Updated task: ${updatedTask.name}`,
        {
          task_id: req.params.id,
          old_values: oldTask,
          new_values: updatedTask
        },
        'success'
      );
    }

    sendSuccess(res, updatedTask, 'Task updated');
  } catch (error) {
    logActivityFromReq(
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

router.delete('/:id', (req, res) => {
  try {
    const source = req.query.source || req.source || 'web_app';
    const deletedTask = tasksRepo.delete(req.params.id, source);
    if (!deletedTask) {
      logActivityFromReq(
        req,
        'task_delete',
        `Failed to delete task: Task ${req.params.id} not found`,
        { task_id: req.params.id },
        'failed',
        'Task not found'
      );
      return sendError(res, 'RESOURCE_NOT_FOUND', 'Task not found', 404);
    }

    logActivityFromReq(
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
    logActivityFromReq(
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

router.delete('/', (req, res) => {
  try {
    const { name } = req.query;

    if (!name) {
      return sendError(res, 'VALIDATION_ERROR', 'Task name is required (use ?name=...)', 400);
    }

    const source = req.query.source || req.source || 'web_app';
    const deletedTask = tasksRepo.deleteByName(name, source);
    if (!deletedTask) {
      return sendError(res, 'RESOURCE_NOT_FOUND', `Task "${name}" not found`, 404);
    }

    logActivityFromReq(
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
