const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = process.env.DATA_FILE || './data/cashflow.json';
const TASKS_FILE = '/root/.openclaw/workspace/tasks.json';
const WEB_PASSWORD = process.env.WEB_PASSWORD;

app.use(cors());
app.use(express.json());

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

// GET /api/cashflow - Get all entries
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
    
    res.status(201).json(newEntry);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/cashflow/:id - Update entry
app.put('/api/cashflow/:id', verifyPassword, async (req, res) => {
  try {
    const data = await readData();
    const index = data.findIndex(e => e.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    data[index] = {
      ...data[index],
      ...req.body,
      id: data[index].id
    };
    
    await writeData(data);
    res.json(data[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/cashflow/:id - Delete entry
app.delete('/api/cashflow/:id', verifyPassword, async (req, res) => {
  try {
    const data = await readData();
    const index = data.findIndex(e => e.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    data.splice(index, 1);
    await writeData(data);
    
    res.status(204).send();
  } catch (error) {
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
  const maxId = tasks.reduce((max, task) => {
    const num = parseInt(task.id, 10);
    return num > max ? num : max;
  }, 0);
  return String(maxId + 1).padStart(3, '0');
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
    
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tasks/:id - Update task
app.put('/api/tasks/:id', verifyPassword, async (req, res) => {
  try {
    const tasks = await readTasks();
    const index = tasks.findIndex(t => t.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    tasks[index] = {
      ...tasks[index],
      ...req.body,
      id: tasks[index].id
    };
    
    await writeTasks(tasks);
    res.json(tasks[index]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tasks/:id - Delete task
app.delete('/api/tasks/:id', verifyPassword, async (req, res) => {
  try {
    const tasks = await readTasks();
    const index = tasks.findIndex(t => t.id === req.params.id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    tasks.splice(index, 1);
    await writeTasks(tasks);
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
ensureDataFile().then(() => {
  app.listen(PORT, () => {
    console.log(`Cashflow API running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize data file:', err);
  process.exit(1);
});
