const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const { sendSuccess, sendError } = require('../../middleware/response');

const ACTIVITY_LOGS_FILE = '/root/.openclaw/workspace/activity_logs.json';

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

async function writeActivityLogs(logsData) {
  const tempPath = `${ACTIVITY_LOGS_FILE}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(logsData, null, 2));
  await fs.rename(tempPath, ACTIVITY_LOGS_FILE);
}

router.get('/', async (req, res) => {
  try {
    const { search, action_type, date_from, date_to, status, source } = req.query;
    const logsData = await readActivityLogs();
    let logs = logsData.logs;
    
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
    
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    sendSuccess(res, {
      logs,
      total_count: logs.length,
      last_cleanup: logsData.last_cleanup
    });
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.get('/stats', async (req, res) => {
  try {
    const logsData = await readActivityLogs();
    const logs = logsData.logs;
    
    const totalLogs = logs.length;
    const successCount = logs.filter(l => l.status === 'success').length;
    const failedCount = logs.filter(l => l.status === 'failed').length;
    
    const actionTypes = {};
    logs.forEach(log => {
      actionTypes[log.action_type] = (actionTypes[log.action_type] || 0) + 1;
    });
    
    const sources = {};
    logs.forEach(log => {
      sources[log.source] = (sources[log.source] || 0) + 1;
    });
    
    sendSuccess(res, {
      total_logs: totalLogs,
      success_count: successCount,
      failed_count: failedCount,
      action_types: actionTypes,
      sources: sources,
      last_cleanup: logsData.last_cleanup
    });
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.post('/', async (req, res) => {
  try {
    const { action_type, description, details, status, error_message, source, actor } = req.body;
    
    if (!action_type || !description) {
      return sendError(res, 'VALIDATION_ERROR', 'action_type and description are required', 400);
    }
    
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
      actor: actor || 'System',
      source: source || req.source || 'web_app',
      action_type,
      description,
      details: details || {},
      status: status || 'success',
      error_message: error_message || null
    };
    
    logsData.logs.unshift(newLog);
    
    if (logsData.logs.length > 2000) {
      logsData.logs = logsData.logs.slice(0, 2000);
    }
    
    await writeActivityLogs(logsData);
    
    sendSuccess(res, newLog, 'Activity log created', 201);
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

module.exports = router;
