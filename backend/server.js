const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');
const cron = require('node-cron');
const envFile = process.env.NODE_ENV === 'staging' ? '.env.staging' : '.env';
require('dotenv').config({ path: require('path').join(__dirname, envFile) });

const { getDb } = require('./db');
getDb();

const { initRedis, isRedisHealthy } = require('./lib/redis');
initRedis().catch(err => console.error('[Server] Redis init failed:', err.message));

const eventBus = require('./events');

const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));

const gatewayClient = require('./gateway-client');

const sourceMiddleware = require('./middleware/source');
const cashflowV1Routes = require('./routes/v1/cashflow');
const tasksV1Routes = require('./routes/v1/tasks');
const activityLogsV1Routes = require('./routes/v1/activity-logs');
const imageRenamerRoutes = require('./routes/image-renamer');

const cashflowRepo = require('./repositories/cashflow.repository');
const tasksRepo = require('./repositories/tasks.repository');
const { logActivity } = require('./utils/activity-logger');

const securityMiddleware = require('./middleware/security');
const authMiddleware = require('./middleware/authentication');
const authRoutes = require('./routes/auth');
const authV1Routes = require('./routes/v1/auth');
const cookieParser = require('cookie-parser');

const { monitorNoOrigin, corsMiddleware } = require('./middleware/cors');
const { logAuthEvent } = require('./middleware/audit');
const { requireNotLocked } = require('./middleware/accountLockout');
const { requirePermission } = require('./middleware/permissions');
const apiKeyRoutes = require('./routes/v1/api-key');
const insightsV1Routes = require('./routes/v1/insights');
const { verifyApiKey } = require('./routes/v1/api-key');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for rate limiter (handles X-Forwarded-For correctly)
app.set('trust proxy', 1);

const filterStore = new Map();

module.exports = { app, filterStore };

// Request timing
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// Security headers
app.use(securityMiddleware.securityHeaders);

// CORS
app.use(monitorNoOrigin);
app.use(corsMiddleware);

// Audit logging helper (logs after response)
app.use((req, res, next) => {
  const start = req.startTime;
  res.on('finish', () => {
    if (req.user) {
      logAuthEvent({
        action: 'api_response',
        userId: req.user.userId || req.user.id,
        path: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTimeMs: Date.now() - start
      });
    } else if (req.path.startsWith('/api/v1/auth')) {
      logAuthEvent({
        action: 'auth_attempt',
        path: req.path,
        method: req.method,
        statusCode: res.statusCode
      });
    }
  });
  next();
});

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(securityMiddleware.unauthenticatedLimiter);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Cashflow Manager API Docs'
}));

// Health endpoint
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    redis: isRedisHealthy() ? 'healthy' : 'unavailable',
    jwt: !!process.env.JWT_SECRET,
    node_version: process.version
  });
});

// Auth routes — always available
app.use('/api/v1/auth', securityMiddleware.loginRateLimiter, authV1Routes);

// API key routes — requires JWT authentication
app.use('/api/v1/api-key', authMiddleware.verifyAccessToken, apiKeyRoutes);

// Unified auth middleware — JWT or API key (also accepts token query param for SSE)
const verifyJwtOrApiKey = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return authMiddleware.verifyAccessToken(req, res, next);
  }
  if (req.headers['x-api-key']) {
    return verifyApiKey(req, res, next);
  }
  if (req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
    return authMiddleware.verifyAccessToken(req, res, next);
  }
  return res.status(401).json({ error: 'Authentication required' });
};

app.use('/api/v1/cashflow', securityMiddleware.apiRateLimiter, verifyJwtOrApiKey, cashflowV1Routes);
app.use('/api/v1/tasks', securityMiddleware.apiRateLimiter, verifyJwtOrApiKey, tasksV1Routes);
app.use('/api/v1/activity-logs', securityMiddleware.apiRateLimiter, verifyJwtOrApiKey, activityLogsV1Routes);

// Insights: POST requires X-API-Key, GET/DELETE requires JWT or X-API-Key
app.use('/api/v1/insights', verifyApiKey, insightsV1Routes);

app.use('/api/image-renamer', securityMiddleware.verifyToken, imageRenamerRoutes);

const deprecationWarning = (req, res, next) => {
  console.log(`[DEPRECATED] ${req.method} ${req.path} - Use /api/v1${req.path.replace('/api', '')} instead`);
  next();
};

app.use('/api/cashflow', deprecationWarning);
app.use('/api/tasks', deprecationWarning);
app.use('/api/emily', deprecationWarning);
app.use('/api/activity-logs', deprecationWarning);
app.use('/api/summary', deprecationWarning);

app.get('/api/cashflow', verifyJwtOrApiKey, (req, res) => {
  try {
    const { category, currency, startDate, endDate, search } = req.query;
    const data = cashflowRepo.findAll({ category, currency, startDate, endDate, search });
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/summary', verifyJwtOrApiKey, (req, res) => {
  try {
    const summary = cashflowRepo.getSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cashflow', verifyJwtOrApiKey, (req, res) => {
  try {
    const source = req.body.source || 'web_app';
    const newEntry = cashflowRepo.create(req.body, source);

    logActivity({
      source,
      actionType: 'cashflow_add',
      description: `Added ${newEntry.amount >= 0 ? 'income' : 'expense'}: ${newEntry.item} ${newEntry.amount >= 0 ? '+' : ''}${newEntry.amount} ${newEntry.currency}`,
      details: {
        item: newEntry.item,
        amount: newEntry.amount,
        currency: newEntry.currency,
        category: newEntry.category
      },
      status: 'success'
    });

    res.status(201).json(newEntry);
  } catch (error) {
    const source = req.body.source || 'web_app';
    logActivity({
      source,
      actionType: 'cashflow_add',
      description: `Failed to add cashflow entry: ${req.body.item}`,
      details: { item: req.body.item },
      status: 'failed',
      errorMessage: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/cashflow/:id', verifyJwtOrApiKey, (req, res) => {
  try {
    const source = req.body.source || 'web_app';
    const oldEntry = cashflowRepo.findById(req.params.id);

    if (!oldEntry) {
      logActivity({
        source,
        actionType: 'cashflow_update',
        description: `Failed to update cashflow: Entry ${req.params.id} not found`,
        details: { entry_id: req.params.id },
        status: 'failed',
        errorMessage: 'Entry not found'
      });
      return res.status(404).json({ error: 'Entry not found' });
    }

    const updatedEntry = cashflowRepo.update(req.params.id, req.body, source);

    logActivity({
      source,
      actionType: 'cashflow_update',
      description: `Updated cashflow entry: ${updatedEntry.item}`,
      details: {
        entry_id: req.params.id,
        old_values: oldEntry,
        new_values: updatedEntry
      },
      status: 'success'
    });

    res.json(updatedEntry);
  } catch (error) {
    const source = req.body.source || 'web_app';
    logActivity({
      source,
      actionType: 'cashflow_update',
      description: `Failed to update cashflow entry: ${req.params.id}`,
      details: { entry_id: req.params.id },
      status: 'failed',
      errorMessage: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/cashflow/:id', verifyJwtOrApiKey, (req, res) => {
  try {
    const source = req.query.source || 'web_app';
    const deletedEntry = cashflowRepo.delete(req.params.id, source);

    if (!deletedEntry) {
      logActivity({
        source,
        actionType: 'cashflow_delete',
        description: `Failed to delete cashflow: Entry ${req.params.id} not found`,
        details: { entry_id: req.params.id },
        status: 'failed',
        errorMessage: 'Entry not found'
      });
      return res.status(404).json({ error: 'Entry not found' });
    }

    logActivity({
      source,
      actionType: 'cashflow_delete',
      description: `Deleted cashflow entry: ${deletedEntry.item} ${deletedEntry.amount} ${deletedEntry.currency}`,
      details: {
        entry_id: req.params.id,
        deleted_entry: deletedEntry
      },
      status: 'success'
    });

    res.status(204).send();
  } catch (error) {
    const source = req.query.source || 'web_app';
    logActivity({
      source,
      actionType: 'cashflow_delete',
      description: `Failed to delete cashflow entry: ${req.params.id}`,
      details: { entry_id: req.params.id },
      status: 'failed',
      errorMessage: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks', verifyJwtOrApiKey, (req, res) => {
  try {
    const tasks = tasksRepo.findAll({});
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks', verifyJwtOrApiKey, (req, res) => {
  try {
    const source = req.body.source || 'web_app';
    const newTask = tasksRepo.create(req.body, source);

    logActivity({
      source,
      actionType: 'task_create',
      description: `Created task: ${newTask.name}`,
      details: {
        task_id: newTask.id,
        task_name: newTask.name,
        status: newTask.status,
        priority: newTask.priority
      },
      status: 'success'
    });

    res.status(201).json(newTask);
  } catch (error) {
    const source = req.body.source || 'web_app';
    logActivity({
      source,
      actionType: 'task_create',
      description: `Failed to create task: ${req.body.name}`,
      details: { task_name: req.body.name },
      status: 'failed',
      errorMessage: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/tasks/:id', verifyJwtOrApiKey, (req, res) => {
  try {
    const source = req.body.source || 'web_app';
    const oldTask = tasksRepo.findById(req.params.id);

    if (!oldTask) {
      logActivity({
        source,
        actionType: 'task_update',
        description: `Failed to update task: Task ${req.params.id} not found`,
        details: { task_id: req.params.id },
        status: 'failed',
        errorMessage: 'Task not found'
      });
      return res.status(404).json({ error: 'Task not found' });
    }

    const updatedTask = tasksRepo.update(req.params.id, req.body, source);

    logActivity({
      source,
      actionType: 'task_update',
      description: `Updated task: ${updatedTask.name}`,
      details: {
        task_id: req.params.id,
        old_values: oldTask,
        new_values: updatedTask
      },
      status: 'success'
    });

    res.json(updatedTask);
  } catch (error) {
    const source = req.body.source || 'web_app';
    logActivity({
      source,
      actionType: 'task_update',
      description: `Failed to update task: ${req.params.id}`,
      details: { task_id: req.params.id },
      status: 'failed',
      errorMessage: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/tasks/:id', verifyJwtOrApiKey, (req, res) => {
  try {
    const source = req.query.source || 'web_app';
    const deletedTask = tasksRepo.delete(req.params.id, source);

    if (!deletedTask) {
      logActivity({
        source,
        actionType: 'task_delete',
        description: `Failed to delete task: Task ${req.params.id} not found`,
        details: { task_id: req.params.id },
        status: 'failed',
        errorMessage: 'Task not found'
      });
      return res.status(404).json({ error: 'Task not found' });
    }

    logActivity({
      source,
      actionType: 'task_delete',
      description: `Deleted task: ${deletedTask.name}`,
      details: {
        task_id: req.params.id,
        deleted_task: deletedTask
      },
      status: 'success'
    });

    res.status(204).send();
  } catch (error) {
    const source = req.query.source || 'web_app';
    logActivity({
      source,
      actionType: 'task_delete',
      description: `Failed to delete task: ${req.params.id}`,
      details: { task_id: req.params.id },
      status: 'failed',
      errorMessage: error.message
    });
    res.status(500).json({ error: error.message });
  }
});

const activityRepo = require('./repositories/activity.repository');

app.get('/api/activity-logs', verifyJwtOrApiKey, (req, res) => {
  try {
    const { search, action_type, date_from, date_to, status, source } = req.query;
    const logs = activityRepo.findAll({ search, action_type, date_from, date_to, status, source });
    res.json({
      logs,
      total_count: logs.length,
      last_cleanup: null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/activity-logs/stats', verifyJwtOrApiKey, (req, res) => {
  try {
    const stats = activityRepo.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/activity-logs', verifyJwtOrApiKey, (req, res) => {
  try {
    const { action_type, description, details, status, error_message, source, actor } = req.body;

    const newLog = activityRepo.create({
      action_type,
      description,
      details,
      status,
      error_message,
      source: source || req.source || 'web_app',
      actor
    });

    res.status(201).json(newLog);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const sseClients = new Set();

app.get('/api/v1/events', securityMiddleware.sseRateLimiter, verifyJwtOrApiKey, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const clientId = Date.now();
  sseClients.add({ id: clientId, res });
  console.log(`[SSE] Client connected: ${clientId}, total clients: ${sseClients.size}`);

  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(clientId);
    console.log(`[SSE] Client disconnected: ${clientId}, total clients: ${sseClients.size}`);
  });
});

function broadcastSSE(eventType, payload) {
  const message = `data: ${JSON.stringify({ type: eventType, ...payload })}\n\n`;
  sseClients.forEach(client => {
    try {
      client.res.write(message);
    } catch (err) {
      console.error(`[SSE] Error sending to client ${client.id}:`, err.message);
      sseClients.delete(client.id);
    }
  });
}

eventBus.on('cashflow:created', (payload) => broadcastSSE('cashflow:created', payload));
eventBus.on('cashflow:updated', (payload) => broadcastSSE('cashflow:updated', payload));
eventBus.on('cashflow:deleted', (payload) => broadcastSSE('cashflow:deleted', payload));
eventBus.on('task:created', (payload) => broadcastSSE('task:created', payload));
eventBus.on('task:updated', (payload) => broadcastSSE('task:updated', payload));
eventBus.on('task:deleted', (payload) => broadcastSSE('task:deleted', payload));

eventBus.on('cashflow:filter', (payload) => broadcastSSE('cashflow:filter', payload));
eventBus.on('task:filter', (payload) => broadcastSSE('task:filter', payload));
eventBus.on('insights:created', (payload) => broadcastSSE('insights:created', payload));

app.post('/api/emily/tasks/create', verifyJwtOrApiKey, (req, res) => {
  try {
    const { name, priority, date, time, source } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Task name is required'
      });
    }

    const taskSource = source || 'telegram';
    const newTask = tasksRepo.create({ name, priority, date, time }, taskSource);

    logActivity({
      source: taskSource,
      actionType: 'task_create',
      description: `Added task: ${newTask.name}`,
      details: {
        task_id: newTask.id,
        task_name: newTask.name,
        priority: newTask.priority || 'medium',
        date: newTask.date || '',
        time: newTask.time || ''
      },
      status: 'success'
    });

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

app.post('/api/emily/tasks/update/:id', verifyJwtOrApiKey, (req, res) => {
  try {
    const { name, priority, date, time, source } = req.body;
    const taskId = req.params.id;
    const taskSource = source || 'telegram';

    const oldTask = tasksRepo.findById(taskId);
    if (!oldTask) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    const updatedTask = tasksRepo.update(taskId, { name, priority, date, time }, taskSource);

    logActivity({
      source: taskSource,
      actionType: 'task_update',
      description: `Updated task: ${updatedTask.name}`,
      details: {
        task_id: taskId,
        task_name: updatedTask.name,
        changed_fields: Object.keys(req.body).filter(k => ['name', 'priority', 'date', 'time'].includes(k)),
        old_values: oldTask,
        new_values: updatedTask
      },
      status: 'success'
    });

    res.json({
      success: true,
      task: updatedTask,
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

app.post('/api/emily/tasks/delete/:id', verifyJwtOrApiKey, (req, res) => {
  try {
    const taskId = req.params.id;
    const { source } = req.body;
    const taskSource = source || 'telegram';

    const deletedTask = tasksRepo.delete(taskId, taskSource);
    if (!deletedTask) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    logActivity({
      source: taskSource,
      actionType: 'task_delete',
      description: `Deleted task: ${deletedTask.name}`,
      details: {
        task_id: taskId,
        task_name: deletedTask.name
      },
      status: 'success'
    });

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

app.post('/api/emily/tasks/delete-by-name', verifyJwtOrApiKey, (req, res) => {
  try {
    const { task_name, source } = req.body;
    const taskSource = source || 'telegram';

    if (!task_name) {
      return res.status(400).json({
        success: false,
        error: 'Task name is required'
      });
    }

    const deletedTask = tasksRepo.deleteByName(task_name, taskSource);
    if (!deletedTask) {
      return res.status(404).json({
        success: false,
        error: `Task "${task_name}" not found`
      });
    }

    logActivity({
      source: taskSource,
      actionType: 'task_delete',
      description: `Deleted task: ${deletedTask.name}`,
      details: {
        task_id: deletedTask.id,
        task_name: deletedTask.name
      },
      status: 'success'
    });

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

const server = http.createServer(app);

// TEMPORARILY DISABLED - Chat WebSocket server disabled
/*
const wss = new WebSocket.Server({
  server,
  path: '/api/chat',
  verifyClient: (info, cb) => {
    const url = new URL(info.req.url, `http://${info.req.headers.host}`);
    const password = url.searchParams.get('password');

    if (password === WEB_PASSWORD) {
      cb(true);
    } else {
      cb(false, 401, 'Unauthorized');
    }
  }
});

const chatSessions = new Map();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const sessionId = url.searchParams.get('session') || `webchat-${Date.now()}`;
  const userId = url.searchParams.get('userId') || 'anonymous';
  const sessionKey = `agent:main:webchat:${userId}`;

  console.log(`[Chat] Client connected - Session: ${sessionKey}`);

  gatewayClient.registerClient(sessionKey, ws);

  ws.send(JSON.stringify({
    type: 'system',
    content: 'Connected to Emily. How can I help you today?',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());

      if (message.type === 'message') {
        const userMessage = {
          type: 'message',
          sender: 'user',
          content: message.content,
          timestamp: new Date().toISOString(),
          clientId: sessionId
        };

        gatewayClient.broadcastToSession(sessionKey, userMessage);

        try {
          ws.send(JSON.stringify({
            type: 'typing',
            sender: 'emily',
            timestamp: new Date().toISOString()
          }));

          await gatewayClient.sendChatMessage(sessionKey, message.content, ws);
        } catch (error) {
          console.error('[Chat] Error sending to gateway:', error);
          ws.send(JSON.stringify({
            type: 'error',
            content: 'Sorry, I could not process your message. Please try again.',
            timestamp: new Date().toISOString()
          }));
        }
      } else if (message.type === 'command') {
        handleChatCommand(ws, message, sessionKey);
      }
    } catch (error) {
      console.error('[Chat] Error handling message:', error);
    }
  });

  ws.on('close', () => {
    console.log(`[Chat] Client disconnected - Session: ${sessionKey}`);
    gatewayClient.unregisterClient(sessionKey, ws);
  });

  ws.on('error', (error) => {
    console.error('[Chat] WebSocket error:', error);
  });
});
*/

async function handleChatCommand(ws, message, sessionKey) {
  const { command, data } = message;

  try {
    switch (command) {
      case 'get_history':
        const history = await gatewayClient.getChatHistory(sessionKey, data?.limit || 50);
        ws.send(JSON.stringify({
          type: 'history',
          messages: history.messages || [],
          timestamp: new Date().toISOString()
        }));
        break;

      case 'clear_chat':
        ws.send(JSON.stringify({
          type: 'system',
          content: 'Chat history cleared for this session.',
          timestamp: new Date().toISOString()
        }));
        break;

      default:
        ws.send(JSON.stringify({
          type: 'error',
          content: `Unknown command: ${command}`,
          timestamp: new Date().toISOString()
        }));
    }
  } catch (error) {
    console.error('[Chat] Command error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      content: 'Failed to execute command.',
      timestamp: new Date().toISOString()
    }));
  }
}

/*
async function handleChatCommand(ws, message, sessionKey) {
  const { command, data } = message;

  try {
    switch (command) {
      case 'get_history':
        const history = await gatewayClient.getChatHistory(sessionKey, data?.limit || 50);
        ws.send(JSON.stringify({
          type: 'history',
          messages: history.messages || [],
          timestamp: new Date().toISOString()
        }));
        break;

      case 'clear_chat':
        ws.send(JSON.stringify({
          type: 'system',
          content: 'Chat history cleared for this session.',
          timestamp: new Date().toISOString()
        }));
        break;

      default:
        ws.send(JSON.stringify({
          type: 'error',
          content: `Unknown command: ${command}`,
          timestamp: new Date().toISOString()
        }));
    }
  } catch (error) {
    console.error('[Chat] Command error:', error);
    ws.send(JSON.stringify({
      type: 'error',
      content: 'Failed to execute command.',
      timestamp: new Date().toISOString()
    }));
  }
}
*/

// TEMPORARILY DISABLED - Chat to Emily via OpenClaw Gateway disabled
// gatewayClient.connect().then(() => {
//   console.log('[Gateway] Connected to OpenClaw');
// }).catch(err => {
//   console.error('[Gateway] Failed to connect:', err.message);
//   console.log('[Gateway] Will retry on first chat message');
// });

server.listen(PORT, () => {
  console.log(`Cashflow API running on http://localhost:${PORT}`);
  // console.log(`WebSocket chat available at ws://localhost:${PORT}/api/chat`);
  console.log(`WebSocket chat DISABLED - TEMPORARILY`);
  console.log(`SQLite database at ${process.env.DATABASE_PATH}`);

  // Daily cleanup: delete tasks archived > 30 days ago
  cron.schedule('0 0 * * *', () => {
    try {
      const deleted = tasksRepo.deleteExpiredArchived();
      if (deleted > 0) {
        console.log(`[cron] Deleted ${deleted} expired archived task(s)`);
      }
    } catch (err) {
      console.error('[cron] Archive cleanup failed:', err.message);
    }
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing connections...');
  gatewayClient.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, closing connections...');
  gatewayClient.disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
