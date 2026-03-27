const express = require('express');
const router = express.Router();
const claudeBridge = require('../../services/claude-bridge');

// POST /api/v1/claude-bridge
// Body: { "prompt": "<text>" }
// Forwards prompt to the Claude CLI tmux session and returns the response.
router.post('/', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
    return res.status(400).json({ error: 'prompt is required and must be a non-empty string' });
  }

  if (prompt.length > 4000) {
    return res.status(400).json({ error: 'prompt must be at most 4000 characters' });
  }

  try {
    const response = await claudeBridge.sendMessage(prompt.trim());
    return res.status(200).json({ success: true, data: { response } });
  } catch (err) {
    console.error('[claude-bridge route] Error:', err.message);
    return res.status(503).json({ error: err.message });
  }
});

module.exports = router;
