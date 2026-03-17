const express = require('express');
const router = express.Router();
const insightsRepository = require('../../repositories/insights.repository');
const eventBus = require('../../events');

const VALID_CHART_TYPES = ['donut', 'bar', 'line', 'area'];

function validateInsightPayload(body) {
  const errors = [];

  if (!body.session_id || typeof body.session_id !== 'string' || body.session_id.trim() === '') {
    errors.push('session_id is required and must be a non-empty string');
  }

  if (!body.requested_by || typeof body.requested_by !== 'string' || body.requested_by.trim() === '') {
    errors.push('requested_by is required and must be a non-empty string');
  }

  if (!body.generated_at || typeof body.generated_at !== 'string' || body.generated_at.trim() === '') {
    errors.push('generated_at is required and must be a non-empty string');
  }

  if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim() === '') {
    errors.push('prompt is required and must be a non-empty string');
  }
  if (body.prompt && body.prompt.length > 500) {
    errors.push('prompt must be at most 500 characters');
  }

  if (!Array.isArray(body.charts)) {
    errors.push('charts is required and must be an array');
  } else {
    if (body.charts.length < 1) {
      errors.push('charts must have at least 1 item');
    }
    if (body.charts.length > 10) {
      errors.push('charts must have at most 10 items');
    }

    body.charts.forEach((chart, idx) => {
      if (!chart.chart_id || typeof chart.chart_id !== 'string' || chart.chart_id.trim() === '') {
        errors.push(`charts[${idx}].chart_id is required and must be a non-empty string`);
      }

      if (!chart.type || !VALID_CHART_TYPES.includes(chart.type)) {
        errors.push(`charts[${idx}].type must be one of: ${VALID_CHART_TYPES.join(', ')}`);
      }

      if (!chart.title || typeof chart.title !== 'string' || chart.title.trim() === '') {
        errors.push(`charts[${idx}].title is required and must be a non-empty string`);
      }
      if (chart.title && chart.title.length > 200) {
        errors.push(`charts[${idx}].title must be at most 200 characters`);
      }

      if (!Array.isArray(chart.data)) {
        errors.push(`charts[${idx}].data is required and must be an array`);
      } else {
        if (chart.data.length < 1) {
          errors.push(`charts[${idx}].data must have at least 1 item`);
        }
        if (chart.data.length > 200) {
          errors.push(`charts[${idx}].data must have at most 200 items`);
        }

        chart.data.forEach((point, pIdx) => {
          if (!point.label || typeof point.label !== 'string' || point.label.trim() === '') {
            errors.push(`charts[${idx}].data[${pIdx}].label is required and must be a non-empty string`);
          }
          if (point.value === undefined || point.value === null) {
            errors.push(`charts[${idx}].data[${pIdx}].value is required`);
          } else if (typeof point.value !== 'number' || !Number.isFinite(point.value)) {
            errors.push(`charts[${idx}].data[${pIdx}].value must be a finite number`);
          }
        });
      }

      if (chart.explanation && typeof chart.explanation === 'string' && chart.explanation.length > 1000) {
        errors.push(`charts[${idx}].explanation must be at most 1000 characters`);
      }

      if (chart.x_axis_label && typeof chart.x_axis_label === 'string' && chart.x_axis_label.length > 100) {
        errors.push(`charts[${idx}].x_axis_label must be at most 100 characters`);
      }

      if (chart.y_axis_label && typeof chart.y_axis_label === 'string' && chart.y_axis_label.length > 100) {
        errors.push(`charts[${idx}].y_axis_label must be at most 100 characters`);
      }
    });
  }

  return errors;
}

router.post('/', (req, res) => {
  try {
    const errors = validateInsightPayload(req.body);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    const { session_id, requested_by, generated_at, prompt, charts } = req.body;

    const existing = insightsRepository.findSessionById(session_id);
    if (existing) {
      // Delete existing session and charts to allow recreation
      insightsRepository.deleteSession(session_id);
    }

    insightsRepository.createSession({
      id: session_id,
      requested_by: requested_by.trim(),
      prompt: prompt.trim(),
      generated_at: generated_at.trim()
    });

    charts.forEach((chart, idx) => {
      insightsRepository.createChart({
        id: chart.chart_id,
        session_id,
        type: chart.type,
        title: chart.title.trim(),
        explanation: chart.explanation ? chart.explanation.trim() : '',
        x_axis_label: chart.x_axis_label ? chart.x_axis_label.trim() : '',
        y_axis_label: chart.y_axis_label ? chart.y_axis_label.trim() : '',
        data: chart.data,
        sort_order: idx
      });
    });

    eventBus.emit('insights:created', { session_id });

    return res.status(201).json({ success: true, data: { session_id } });
  } catch (error) {
    console.error('[Insights] POST error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', (req, res) => {
  try {
    const sessions = insightsRepository.getAllSessions();
    return res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    console.error('[Insights] GET error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const result = insightsRepository.deleteSession(sessionId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[Insights] DELETE error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
