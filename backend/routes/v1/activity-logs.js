const express = require('express');
const router = express.Router();
const { sendSuccess, sendError } = require('../../middleware/response');
const activityRepo = require('../../repositories/activity.repository');

router.get('/', (req, res) => {
  try {
    const { search, action_type, date_from, date_to, status, source, limit, offset } = req.query;
    
    const parsedLimit = limit ? parseInt(limit, 10) : 20;
    const parsedOffset = offset ? parseInt(offset, 10) : 0;
    
    const result = activityRepo.findAll({ 
      search, 
      action_type, 
      date_from, 
      date_to, 
      status, 
      source,
      limit: parsedLimit,
      offset: parsedOffset
    });

    sendSuccess(res, {
      ...result,
      last_cleanup: null
    });
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.get('/stats', (req, res) => {
  try {
    const stats = activityRepo.getStats();
    sendSuccess(res, stats);
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

router.post('/', (req, res) => {
  try {
    const { action_type, description, details, status, error_message, source, actor } = req.body;

    if (!action_type || !description) {
      return sendError(res, 'VALIDATION_ERROR', 'action_type and description are required', 400);
    }

    const newLog = activityRepo.create({
      action_type,
      description,
      details,
      status,
      error_message,
      source: source || req.source || 'web_app',
      actor
    });

    sendSuccess(res, newLog, 'Activity log created', 201);
  } catch (error) {
    sendError(res, 'INTERNAL_ERROR', error.message, 500);
  }
});

module.exports = router;
