const { z } = require('zod');

const cashflowSchema = z.object({
  item: z.string().min(1).max(255),
  amount: z.number().min(-999999999.99).max(999999999.99),
  currency: z.enum(['PHP', 'USD', 'EUR', 'GBP']),
  date: z.string().datetime(),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  category: z.enum(['Income', 'Food', 'Transport', 'Utilities', 'Shopping', 'Entertainment', 'Health', 'Airbnb', 'Other']),
  notes: z.string().max(1000).optional()
});

const taskSchema = z.object({
  name: z.string().min(1).max(255),
  date: z.string().datetime().optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  status: z.enum(['backlog', 'in_progress', 'done']),
  priority: z.enum(['low', 'medium', 'high'])
});

const activityLogSchema = z.object({
  action_type: z.enum(['task_create', 'task_update', 'task_delete', 'cashflow_add', 'cashflow_update', 'cashflow_delete']),
  description: z.string().min(1).max(1000),
  status: z.enum(['success', 'failed']).optional(),
  error_message: z.string().max(1000).optional()
});

const validateCashflow = (req, res, next) => {
  try {
    cashflowSchema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(400).json({ error: 'Validation failed' });
  }
};

const validateTask = (req, res, next) => {
  try {
    taskSchema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(400).json({ error: 'Validation failed' });
  }
};

const validateActivityLog = (req, res, next) => {
  try {
    activityLogSchema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(400).json({ error: 'Validation failed' });
  }
};

module.exports = {
  validateCashflow,
  validateTask,
  validateActivityLog,
  cashflowSchema,
  taskSchema,
  activityLogSchema
};
