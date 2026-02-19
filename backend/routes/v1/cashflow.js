const express = require('express');
const router = express.Router();
const { sendSuccess, sendError } = require('../../middleware/response');
const cashflowRepo = require('../../repositories/cashflow.repository');
const { logActivityFromReq } = require('../../utils/activity-logger');

router.get('/', (req, res) => {
  try {
    const { category, currency, startDate, endDate, search, sortBy, sortOrder } = req.query;
    const data = cashflowRepo.findAll({ category, currency, startDate, endDate, search, sortBy, sortOrder });
    sendSuccess(res, data);
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.get('/summary', (req, res) => {
  try {
    const summary = cashflowRepo.getSummary();
    sendSuccess(res, summary);
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.get('/:id', (req, res) => {
  try {
    const entry = cashflowRepo.findById(req.params.id);
    if (!entry) {
      return sendError(res, 'RESOURCE_NOT_FOUND', 'Transaction not found', 404);
    }
    sendSuccess(res, entry);
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.post('/', (req, res) => {
  try {
    const newEntry = cashflowRepo.create(req.body);

    logActivityFromReq(
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
    logActivityFromReq(
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

router.put('/:id', (req, res) => {
  try {
    const oldEntry = cashflowRepo.findById(req.params.id);
    if (!oldEntry) {
      logActivityFromReq(
        req,
        'cashflow_update',
        `Failed to update cashflow: Entry ${req.params.id} not found`,
        { entry_id: req.params.id },
        'failed',
        'Entry not found'
      );
      return sendError(res, 'RESOURCE_NOT_FOUND', 'Transaction not found', 404);
    }

    const updatedEntry = cashflowRepo.update(req.params.id, req.body);

    logActivityFromReq(
      req,
      'cashflow_update',
      `Updated cashflow entry: ${updatedEntry.item}`,
      {
        entry_id: req.params.id,
        old_values: oldEntry,
        new_values: updatedEntry
      },
      'success'
    );

    sendSuccess(res, updatedEntry, 'Transaction updated');
  } catch (error) {
    logActivityFromReq(
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

router.delete('/:id', (req, res) => {
  try {
    const deletedEntry = cashflowRepo.delete(req.params.id);
    if (!deletedEntry) {
      logActivityFromReq(
        req,
        'cashflow_delete',
        `Failed to delete cashflow: Entry ${req.params.id} not found`,
        { entry_id: req.params.id },
        'failed',
        'Entry not found'
      );
      return sendError(res, 'RESOURCE_NOT_FOUND', 'Transaction not found', 404);
    }

    logActivityFromReq(
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
    logActivityFromReq(
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
