/**
 * Chat Command Handler
 * Processes natural language commands from chat and executes web app operations
 */

const fs = require('fs').promises;

// Data file paths
const DATA_FILE = process.env.DATA_FILE || './data/cashflow.json';
const TASKS_FILE = '/root/.openclaw/workspace/tasks.json';

class ChatCommandHandler {
  constructor() {
    this.commands = {
      // Cashflow commands
      'add_expense': this.handleAddExpense.bind(this),
      'add_income': this.handleAddIncome.bind(this),
      'delete_cashflow': this.handleDeleteCashflow.bind(this),
      'update_cashflow': this.handleUpdateCashflow.bind(this),
      'get_summary': this.handleGetSummary.bind(this),
      'list_cashflow': this.handleListCashflow.bind(this),
      
      // Task commands
      'add_task': this.handleAddTask.bind(this),
      'complete_task': this.handleCompleteTask.bind(this),
      'delete_task': this.handleDeleteTask.bind(this),
      'list_tasks': this.handleListTasks.bind(this),
      
      // General commands
      'help': this.handleHelp.bind(this),
      'clear': this.handleClear.bind(this)
    };
  }

  /**
   * Parse natural language command
   */
  parseCommand(message) {
    const lowerMsg = message.toLowerCase().trim();
    
    // Add expense patterns
    if (/(add|create|record).*(expense|spent|payment)/.test(lowerMsg) || 
        /(expense|spent).*(\d+)/.test(lowerMsg)) {
      return { command: 'add_expense', data: this.parseExpenseData(message) };
    }
    
    // Add income patterns
    if (/(add|create|record).*(income|earned|received)/.test(lowerMsg) ||
        /(income|earned|received).*(\d+)/.test(lowerMsg)) {
      return { command: 'add_income', data: this.parseIncomeData(message) };
    }
    
    // Delete cashflow patterns
    if (/(delete|remove).*(transaction|entry|expense|income)/.test(lowerMsg) ||
        /(delete|remove).*(id|#)\s*(\w+)/.test(lowerMsg)) {
      return { command: 'delete_cashflow', data: this.parseDeleteData(message) };
    }
    
    // Update cashflow patterns
    if (/(update|change|edit).*(transaction|entry)/.test(lowerMsg)) {
      return { command: 'update_cashflow', data: this.parseUpdateData(message) };
    }
    
    // Summary patterns
    if (/(summary|balance|overview|how much)/.test(lowerMsg) ||
        /(show|get|what).*(balance|summary)/.test(lowerMsg)) {
      return { command: 'get_summary', data: {} };
    }
    
    // List cashflow patterns
    if (/(list|show|get).*(cashflow|transactions|expenses|income)/.test(lowerMsg) ||
        /(what|show).*(i|did).*(spend|buy)/.test(lowerMsg)) {
      return { command: 'list_cashflow', data: this.parseListData(message) };
    }
    
    // Add task patterns
    if (/(add|create).*(task|todo)/.test(lowerMsg) ||
        /^task:/.test(lowerMsg)) {
      return { command: 'add_task', data: this.parseTaskData(message) };
    }
    
    // Complete task patterns
    if (/(complete|finish|done).*(task)/.test(lowerMsg)) {
      return { command: 'complete_task', data: this.parseTaskActionData(message) };
    }
    
    // Delete task patterns
    if (/(delete|remove).*(task)/.test(lowerMsg)) {
      return { command: 'delete_task', data: this.parseTaskActionData(message) };
    }
    
    // List tasks patterns
    if (/(list|show|get|what).*(tasks|todos)/.test(lowerMsg)) {
      return { command: 'list_tasks', data: {} };
    }
    
    // Help patterns
    if (/(help|what can you do|commands)/.test(lowerMsg) ||
        message === '?') {
      return { command: 'help', data: {} };
    }
    
    // Clear patterns
    if (/(clear|reset).*(chat|history|messages)/.test(lowerMsg)) {
      return { command: 'clear', data: {} };
    }
    
    return null;
  }

  /**
   * Execute parsed command
   */
  async executeCommand(command, data) {
    if (this.commands[command]) {
      try {
        return await this.commands[command](data);
      } catch (error) {
        console.error(`[ChatCommand] Error executing ${command}:`, error);
        return {
          success: false,
          message: `Sorry, I couldn't complete that action: ${error.message}`
        };
      }
    }
    
    return null;
  }

  // ============================================================================
  // CASHFLOW COMMAND HANDLERS
  // ============================================================================

  async handleAddExpense(data) {
    const entry = {
      id: Date.now().toString(),
      item: data.item || 'Expense',
      amount: -Math.abs(parseFloat(data.amount)),
      currency: data.currency || 'PHP',
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || new Date().toTimeString().slice(0, 5),
      timezone: 'PHT',
      category: data.category || 'Other',
      notes: data.notes || '',
      source: 'web_chat'
    };

    const entries = await this.readData();
    entries.push(entry);
    await this.writeData(entries);

    return {
      success: true,
      message: `✓ Added expense: ${entry.item} - ${entry.amount} ${entry.currency}`,
      data: entry,
      action: 'cashflow_add'
    };
  }

  async handleAddIncome(data) {
    const entry = {
      id: Date.now().toString(),
      item: data.item || 'Income',
      amount: Math.abs(parseFloat(data.amount)),
      currency: data.currency || 'PHP',
      date: data.date || new Date().toISOString().split('T')[0],
      time: data.time || new Date().toTimeString().slice(0, 5),
      timezone: 'PHT',
      category: data.category || 'Income',
      notes: data.notes || '',
      source: 'web_chat'
    };

    const entries = await this.readData();
    entries.push(entry);
    await this.writeData(entries);

    return {
      success: true,
      message: `✓ Added income: ${entry.item} +${entry.amount} ${entry.currency}`,
      data: entry,
      action: 'cashflow_add'
    };
  }

  async handleDeleteCashflow(data) {
    const entries = await this.readData();
    const index = entries.findIndex(e => e.id === data.id);
    
    if (index === -1) {
      return {
        success: false,
        message: `Transaction with ID ${data.id} not found.`
      };
    }

    const deleted = entries[index];
    entries.splice(index, 1);
    await this.writeData(entries);

    return {
      success: true,
      message: `✓ Deleted transaction: ${deleted.item} ${deleted.amount} ${deleted.currency}`,
      data: deleted,
      action: 'cashflow_delete'
    };
  }

  async handleUpdateCashflow(data) {
    const entries = await this.readData();
    const index = entries.findIndex(e => e.id === data.id);
    
    if (index === -1) {
      return {
        success: false,
        message: `Transaction with ID ${data.id} not found.`
      };
    }

    const oldEntry = { ...entries[index] };
    entries[index] = { ...entries[index], ...data.updates, id: entries[index].id };
    await this.writeData(entries);

    return {
      success: true,
      message: `✓ Updated transaction: ${entries[index].item}`,
      data: { old: oldEntry, new: entries[index] },
      action: 'cashflow_update'
    };
  }

  async handleGetSummary() {
    const entries = await this.readData();
    const totalIncome = entries.filter(e => e.amount > 0).reduce((sum, e) => sum + e.amount, 0);
    const totalExpenses = Math.abs(entries.filter(e => e.amount < 0).reduce((sum, e) => sum + e.amount, 0));
    const balance = totalIncome - totalExpenses;

    return {
      success: true,
      message: `📊 Summary:\nIncome: +${totalIncome.toFixed(2)}\nExpenses: -${totalExpenses.toFixed(2)}\nBalance: ${balance >= 0 ? '+' : ''}${balance.toFixed(2)}`,
      data: { totalIncome, totalExpenses, balance, count: entries.length }
    };
  }

  async handleListCashflow(data) {
    let entries = await this.readData();
    
    // Apply filters
    if (data.category && data.category !== 'All') {
      entries = entries.filter(e => e.category === data.category);
    }
    if (data.type === 'expense') {
      entries = entries.filter(e => e.amount < 0);
    } else if (data.type === 'income') {
      entries = entries.filter(e => e.amount > 0);
    }
    
    // Sort by date descending
    entries.sort((a, b) => new Date(b.date + ' ' + b.time) - new Date(a.date + ' ' + a.time));
    
    // Limit results
    const limit = data.limit || 10;
    const recent = entries.slice(0, limit);
    
    if (recent.length === 0) {
      return {
        success: true,
        message: 'No transactions found.'
      };
    }

    const list = recent.map(e => 
      `${e.date}: ${e.item} ${e.amount >= 0 ? '+' : ''}${e.amount} ${e.currency}`
    ).join('\n');

    return {
      success: true,
      message: `📋 Recent Transactions (${recent.length} of ${entries.length}):\n${list}`,
      data: recent
    };
  }

  // ============================================================================
  // TASK COMMAND HANDLERS
  // ============================================================================

  async handleAddTask(data) {
    const tasks = await this.readTasks();
    
    const newTask = {
      id: this.generateTaskId(tasks),
      name: data.name,
      date: data.date || '',
      time: data.time || '',
      status: 'active',
      priority: data.priority || 'medium'
    };

    tasks.push(newTask);
    await this.writeTasks(tasks);

    return {
      success: true,
      message: `✓ Added task: ${newTask.name} (${newTask.priority} priority)`,
      data: newTask,
      action: 'task_create'
    };
  }

  async handleCompleteTask(data) {
    const tasks = await this.readTasks();
    const index = tasks.findIndex(t => 
      t.id === data.id || 
      t.name.toLowerCase() === data.name?.toLowerCase()
    );
    
    if (index === -1) {
      return {
        success: false,
        message: `Task not found.`
      };
    }

    const oldTask = { ...tasks[index] };
    tasks[index].status = 'completed';
    await this.writeTasks(tasks);

    return {
      success: true,
      message: `✓ Completed task: ${tasks[index].name}`,
      data: { old: oldTask, new: tasks[index] },
      action: 'task_update'
    };
  }

  async handleDeleteTask(data) {
    const tasks = await this.readTasks();
    const index = tasks.findIndex(t => 
      t.id === data.id || 
      t.name.toLowerCase() === data.name?.toLowerCase()
    );
    
    if (index === -1) {
      return {
        success: false,
        message: `Task not found.`
      };
    }

    const deleted = tasks[index];
    tasks.splice(index, 1);
    await this.writeTasks(tasks);

    return {
      success: true,
      message: `✓ Deleted task: ${deleted.name}`,
      data: deleted,
      action: 'task_delete'
    };
  }

  async handleListTasks(data) {
    const tasks = await this.readTasks();
    const activeTasks = tasks.filter(t => t.status === 'active');
    
    if (activeTasks.length === 0) {
      return {
        success: true,
        message: 'No active tasks found. Great job! 🎉'
      };
    }

    const list = activeTasks.map(t => {
      let line = `• ${t.name}`;
      if (t.priority) line += ` (${t.priority})`;
      if (t.date) line += ` - ${t.date}`;
      return line;
    }).join('\n');

    return {
      success: true,
      message: `📋 Active Tasks (${activeTasks.length}):\n${list}`,
      data: activeTasks
    };
  }

  // ============================================================================
  // GENERAL COMMAND HANDLERS
  // ============================================================================

  async handleHelp() {
    return {
      success: true,
      message: `🥖 Bonjour! I'm Emily, your assistant. Here's what I can do:

💰 CASHFLOW:
• "Add expense 500 PHP for groceries"
• "Add income 1000 from freelance"
• "Show summary"
• "List recent transactions"
• "Delete transaction [ID]"

✅ TASKS:
• "Add task: Buy milk (high priority)"
• "Complete task [name]"
• "Delete task [name]"
• "Show my tasks"

Just chat naturally and I'll help you manage your data!`
    };
  }

  async handleClear() {
    return {
      success: true,
      message: 'Chat history cleared for this session.',
      action: 'clear_chat'
    };
  }

  // ============================================================================
  // DATA PARSERS
  // ============================================================================

  parseExpenseData(message) {
    // Extract amount and currency
    const amountMatch = message.match(/(\d+(?:\.\d{1,2})?)\s*(PHP|USD|EUR|GBP|\$|€|£)?/i);
    const amount = amountMatch ? amountMatch[1] : '0';
    const currency = amountMatch && amountMatch[2] ? 
      this.normalizeCurrency(amountMatch[2]) : 'PHP';
    
    // Extract item description
    let item = 'Expense';
    const forMatch = message.match(/(?:for|on)\s+(.+?)(?:\s+\d|$)/i);
    if (forMatch) {
      item = forMatch[1].trim();
    }
    
    // Extract category
    const categories = ['food', 'transport', 'groceries', 'entertainment', 'utilities', 'shopping', 'health'];
    const category = categories.find(c => message.toLowerCase().includes(c)) || 'Other';
    
    return { amount, currency, item, category };
  }

  parseIncomeData(message) {
    const amountMatch = message.match(/(\d+(?:\.\d{1,2})?)\s*(PHP|USD|EUR|GBP|\$|€|£)?/i);
    const amount = amountMatch ? amountMatch[1] : '0';
    const currency = amountMatch && amountMatch[2] ? 
      this.normalizeCurrency(amountMatch[2]) : 'PHP';
    
    let item = 'Income';
    const fromMatch = message.match(/(?:from|for)\s+(.+?)(?:\s+\d|$)/i);
    if (fromMatch) {
      item = fromMatch[1].trim();
    }
    
    return { amount, currency, item, category: 'Income' };
  }

  parseDeleteData(message) {
    const idMatch = message.match(/(?:id|#)\s*(\w+)/i);
    return { id: idMatch ? idMatch[1] : null };
  }

  parseUpdateData(message) {
    const idMatch = message.match(/(?:id|#)\s*(\w+)/i);
    return { 
      id: idMatch ? idMatch[1] : null,
      updates: {}
    };
  }

  parseListData(message) {
    const data = {};
    if (message.toLowerCase().includes('expense')) data.type = 'expense';
    if (message.toLowerCase().includes('income')) data.type = 'income';
    
    const categories = ['food', 'transport', 'groceries', 'entertainment', 'utilities'];
    const category = categories.find(c => message.toLowerCase().includes(c));
    if (category) data.category = category.charAt(0).toUpperCase() + category.slice(1);
    
    return data;
  }

  parseTaskData(message) {
    // Remove command prefix
    let name = message.replace(/^(add\s+)?task[:\s]*/i, '').trim();
    
    const data = { name };
    
    // Extract priority
    if (/\b(high|urgent)\b/i.test(message)) data.priority = 'high';
    else if (/\b(low)\b/i.test(message)) data.priority = 'low';
    else data.priority = 'medium';
    
    // Extract date if mentioned
    const dateMatch = message.match(/\b(today|tomorrow|next\s+week|\d{4}-\d{2}-\d{2})\b/i);
    if (dateMatch) {
      if (dateMatch[1].toLowerCase() === 'today') {
        data.date = new Date().toISOString().split('T')[0];
      } else if (dateMatch[1].toLowerCase() === 'tomorrow') {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        data.date = tomorrow.toISOString().split('T')[0];
      }
    }
    
    return data;
  }

  parseTaskActionData(message) {
    // Extract task name or ID
    const nameMatch = message.match(/(?:task[:\s]+)?(.+?)(?:\s*$|\s+(?:as|to)\s+)/i);
    return { 
      name: nameMatch ? nameMatch[1].trim() : null,
      id: null
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  normalizeCurrency(currency) {
    const map = {
      '$': 'USD',
      '€': 'EUR',
      '£': 'GBP'
    };
    return map[currency] || currency.toUpperCase();
  }

  async readData() {
    try {
      const data = await fs.readFile(DATA_FILE, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  async writeData(data) {
    const tempPath = `${DATA_FILE}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify(data, null, 2));
    await fs.rename(tempPath, DATA_FILE);
  }

  async readTasks() {
    try {
      const data = await fs.readFile(TASKS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      return parsed.tasks || [];
    } catch (error) {
      return [];
    }
  }

  async writeTasks(tasks) {
    const tempPath = `${TASKS_FILE}.tmp`;
    await fs.writeFile(tempPath, JSON.stringify({ tasks }, null, 2));
    await fs.rename(tempPath, TASKS_FILE);
  }

  generateTaskId(tasks) {
    const nextNumber = (tasks.length || 0) + 1;
    return String(nextNumber).padStart(3, '0');
  }
}

// Export singleton instance
module.exports = new ChatCommandHandler();
