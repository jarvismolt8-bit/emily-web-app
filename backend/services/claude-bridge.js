const { execFile } = require('child_process');

// Use 'claude:' (trailing colon) to force tmux to match the SESSION named 'claude'
// rather than a window named 'claude' inside the current session.
const TMUX_TARGET = 'claude:';
const MAX_MESSAGE_LENGTH = 4000;
const MAX_OUTPUT_LENGTH = 16384;
const IDLE_POLL_INTERVAL = 1000;
const IDLE_CONFIRMATIONS_NEEDED = 2;
const HARD_TIMEOUT = 120000;

// Claude Code's animated TUI requires broader ANSI stripping
const STRIP_ANSI = /\x1B\[[0-9;?]*[A-Za-z]|\x1B[()][AB012]|\x1B[^[\]]/g;

// Claude Code shows these patterns while generating a response
const PROCESSING_PATTERN = /\u2026|\bThinking\b|\bGenerating\b|\bCerebrating\b|\bRunning\b|\bArchitecting\b|\bPlanning\b|\bAnalyz/i;

// Claude Code's idle input prompt
const PROMPT_CHAR = '\u276F'; // ❯

let _queue = [];
let _busy = false;

function log(level, msg) {
  const prefix = '[claude-bridge]';
  if (level === 'error') console.error(`${prefix} ERROR: ${msg}`);
  else if (level === 'warn') console.warn(`${prefix} WARNING: ${msg}`);
  else console.log(`${prefix} ${msg}`);
}

function sanitizeInput(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/;/g, '')
    .replace(/\|/g, '')
    .replace(/&&/g, '')
    .replace(/`/g, '')
    .replace(/\$\([^)]*\)/g, '')
    .replace(/\$[^ ]*/g, '')
    .substring(0, MAX_MESSAGE_LENGTH);
}

function checkSession() {
  return new Promise((resolve) => {
    execFile('tmux', ['display-message', '-t', TMUX_TARGET, '-p', '#{session_name}'], (err) => {
      resolve(!err);
    });
  });
}

function sendKeys(text) {
  return new Promise((resolve, reject) => {
    execFile('tmux', ['send-keys', '-t', TMUX_TARGET, text, 'Enter'], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Poll capture-pane until Claude Code shows the ❯ idle prompt without processing indicators
function waitForPrompt() {
  return new Promise((resolve, reject) => {
    let promptCount = 0;
    const startTime = Date.now();

    // Give Claude a moment to receive the input and start processing
    setTimeout(poll, 2000);

    function poll() {
      if (Date.now() - startTime > HARD_TIMEOUT) {
        reject(new Error('timeout after 120s'));
        return;
      }

      execFile('tmux', ['capture-pane', '-t', TMUX_TARGET, '-p'], (err, stdout) => {
        if (err) {
          reject(err);
          return;
        }

        const text = stdout.replace(STRIP_ANSI, '');
        const tail = text.split('\n').slice(-15).join('\n');

        const hasPrompt = tail.includes(PROMPT_CHAR);
        const isProcessing = PROCESSING_PATTERN.test(tail);

        if (hasPrompt && !isProcessing) {
          promptCount++;
        } else {
          promptCount = 0;
        }

        if (promptCount >= IDLE_CONFIRMATIONS_NEEDED) {
          resolve();
        } else {
          setTimeout(poll, IDLE_POLL_INTERVAL);
        }
      });
    }
  });
}

// Capture pane history and extract the response after the last [Emily]: marker
function captureResponse() {
  return new Promise((resolve, reject) => {
    execFile('tmux', ['capture-pane', '-t', TMUX_TARGET, '-p', '-S', '-300'], (err, stdout) => {
      if (err) {
        reject(err);
        return;
      }

      const text = stdout.replace(STRIP_ANSI, '');

      // Find the last [Emily]: marker
      const emilyIdx = text.lastIndexOf('[Emily]:');
      if (emilyIdx === -1) {
        resolve('');
        return;
      }

      // Skip the [Emily]: line itself, collect response lines until ❯ or a separator
      const lines = text.slice(emilyIdx).split('\n').slice(1);
      const responseLines = [];
      for (const line of lines) {
        const stripped = line.trim();
        if (stripped.includes(PROMPT_CHAR) || /^[─━═\-]{5,}$/.test(stripped)) break;
        if (stripped) responseLines.push(stripped);
      }

      let response = responseLines.join('\n').trim();
      if (response.length > MAX_OUTPUT_LENGTH) {
        response = response.substring(0, MAX_OUTPUT_LENGTH) + '\n[...truncated]';
      }

      resolve(response);
    });
  });
}

function processQueue() {
  if (_busy || _queue.length === 0) return;

  _busy = true;
  const { text, resolve, reject } = _queue.shift();

  (async () => {
    try {
      const sessionExists = await checkSession();
      if (!sessionExists) {
        reject(new Error('Claude session not available'));
        _busy = false;
        processQueue();
        return;
      }

      const sanitized = sanitizeInput(text);
      await sendKeys(`[Emily]: ${sanitized}`);
      await waitForPrompt();
      const output = await captureResponse();
      resolve(output);
    } catch (err) {
      reject(err);
    }

    _busy = false;
    processQueue();
  })();
}

function sendMessage(text) {
  return new Promise((resolve, reject) => {
    _queue.push({ text, resolve, reject });
    processQueue();
  });
}

function init() {
  checkSession().then((exists) => {
    if (exists) {
      log('info', 'claude session ready');
    } else {
      log('warn', 'tmux session "claude" not found — bridge inactive');
    }
  });
}

init();

module.exports = { sendMessage };
