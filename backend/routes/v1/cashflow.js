const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const { sendSuccess, sendError } = require('../../middleware/response');

const DATA_FILE = process.env.DATA_FILE || './data/cashflow.json';

async function readData() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function writeData(data) {
  const tempPath = `${DATA_FILE}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
  await fs.rename(tempPath, DATA_FILE);
}

function parseDateTime(dateStr, timeStr) {
  if (!dateStr) return 0;
  
  let time = timeStr || '';
  
  // Convert 12-hour format (7:11PM) to 24-hour format (19:11)
  if (time) {
    const match = time.match(/^(\d{1,2}):(\d{2})(am|pm)$/i);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2];
      const ampm = match[3].toLowerCase();
      
      if (ampm === 'pm' && hours !== 12) hours += 12;
      if (ampm === 'am' && hours === 12) hours = 0;
      
      time = `${String(hours).padStart(2, '0')}:${minutes}`;
    }
  }
  
  const date = new Date(`${dateStr} ${time}`);
  return isNaN(date.getTime()) ? 0 : date.getTime();
}

async function logActivity(req, actionType, description, details, status = 'success', errorMessage = null) {
  const ACTIVITY_LOGS_FILE = '/root/.openclaw/workspace/activity_logs.json';
  
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
    const data = await readData();
    const { category, currency, startDate, endDate, search, sortBy, sortOrder } = req.query;
    
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
    
    if (sortBy) {
      filtered.sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'date') {
          comparison = parseDateTime(a.date, a.time) - parseDateTime(b.date, b.time);
        } else if (sortBy === 'category') {
          comparison = (a.category || '').localeCompare(b.category || '');
        } else if (sortBy === 'amount') {
          comparison = (a.amount || 0) - (b.amount || 0);
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });
    } else {
      filtered.sort((a, b) => parseDateTime(b.date, b.time) - parseDateTime(a.date, a.time));
    }
    
    sendSuccess(res, filtered);
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.get('/summary', async (req, res) => {
  try {
    const data = await readData();
    const totalIncome = data.filter(e => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = Math.abs(data.filter(e => e.amount < 0).reduce((sum, e) => sum + e.amount, 0));
    const balance = totalIncome - totalExpenses;
    
    sendSuccess(res, {
      totalIncome,
      totalExpenses,
      balance,
      transactionCount: data.length
    });
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const data = await readData();
    const entry = data.find(e => e.id === req.params.id);
    
    if (!entry) {
      return sendError(res, 'RESOURCE_NOT_FOUND', 'Transaction not found', 404);
    }
    
    sendSuccess(res, entry);
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.post('/', async (req, res) => {
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
    
    await logActivity(
      req,
      'cashflow_add',
      `Added ${newEntry.amount >= 0 ? 'income' : 'expense'}: ${newEntry.item} ${newEntry.amount >= 0 ? '+' : ''}${newEntry.amount} ${newEntry.currency}`,
      {
        item: newEntry.item,
        amount: newEntry.amount,
        currency: newEntry.currency,
        category: newEntry.category
      },
      'success'
    );
    
    sendSuccess(res, newEntry, 'Transaction created', 201);
  } catch (error) {
    await logActivity(
      req,
      'cashflow_add',
      `Failed to add cashflow entry: ${req.body.item}`,
      { item: req.body.item },
      'failed',
      error.message
    );
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.put('/:id', async (req, res) => {
  try {
    const data = await readData();
    const index = data.findIndex(e => e.id === req.params.id);
    
    if (index === -1) {
      await logActivity(
        req,
        'cashflow_update',
        `Failed to update cashflow: Entry ${req.params.id} not found`,
        { entry_id: req.params.id },
        'failed',
        'Entry not found'
      );
      return sendError(res, 'RESOURCE_NOT_FOUND', 'Transaction not found', 404);
    }
    
    const oldEntry = data[index];
    data[index] = {
      ...data[index],
      ...req.body,
      id: data[index].id
    };
    
    await writeData(data);
    
    await logActivity(
      req,
      'cashflow_update',
      `Updated cashflow entry: ${data[index].item}`,
      {
        entry_id: req.params.id,
        old_values: oldEntry,
        new_values: data[index]
      },
      'success'
    );
    
    sendSuccess(res, data[index], 'Transaction updated');
  } catch (error) {
    await logActivity(
      req,
      'cashflow_update',
      `Failed to update cashflow entry: ${req.params.id}`,
      { entry_id: req.params.id },
      'failed',
      error.message
    );
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const data = await readData();
    const index = data.findIndex(e => e.id === req.params.id);
    
    if (index === -1) {
      await logActivity(
        req,
        'cashflow_delete',
        `Failed to delete cashflow: Entry ${req.params.id} not found`,
        { entry_id: req.params.id },
        'failed',
        'Entry not found'
      );
      return sendError(res, 'RESOURCE_NOT_FOUND', 'Transaction not found', 404);
    }
    
    const deletedEntry = data[index];
    data.splice(index, 1);
    await writeData(data);
    
    await logActivity(
      req,
      'cashflow_delete',
      `Deleted cashflow entry: ${deletedEntry.item} ${deletedEntry.amount} ${deletedEntry.currency}`,
      {
        entry_id: req.params.id,
        deleted_entry: deletedEntry
      },
      'success'
    );
    
    sendSuccess(res, { id: req.params.id }, 'Transaction deleted');
  } catch (error) {
    await logActivity(
      req,
      'cashflow_delete',
      `Failed to delete cashflow entry: ${req.params.id}`,
      { entry_id: req.params.id },
      'failed',
      error.message
    );
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

module.exports = router;
