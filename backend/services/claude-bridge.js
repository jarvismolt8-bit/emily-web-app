const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const BRIDGE_DIR = '/tmp/claude-bridge';
const LOG_PATH = path.join(BRIDGE_DIR, 'output.log');
// Target: session 'work', window 'claude' — use session:window format to avoid
// tmux resolving 'claude' as a window name inside the current session.
const TMUX_TARGET = 'work:claude';
const MAX_MESSAGE_LENGTH = 4000;
const MAX_OUTPUT_LENGTH = 16384;
const IDLE_POLL_INTERVAL = 500;
const IDLE_CONFIRMATIONS_NEEDED = 2;
const HARD_TIMEOUT = 90000;

let _queue = [];
let _busy = false;
let _pipePaneAttached = false;

function log(level, msg) {
  const prefix = '[claude-bridge]';
  if (level === 'error') {
    console.error(`${prefix} ERROR: ${msg}`);
  } else if (level === 'warn') {
    console.warn(`${prefix} WARNING: ${msg}`);
  } else {
    console.log(`${prefix} ${msg}`);
  }
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

function stripAnsi(str) {
  return str.replace(/\x1B\[[0-9;]*[A-Za-z]/g, '').replace(/[\r\n]+$/, '');
}

function ensureDirectory() {
  try {
    fs.mkdirSync(BRIDGE_DIR, { recursive: true, mode: 0o700 });
  } catch (err) {
    if (err.code !== 'EEXIST') throw err;
  }
}

function truncateLog() {
  try {
    fs.writeFileSync(LOG_PATH, '', { flag: 'w' });
  } catch (err) {
    log('error', `Failed to truncate log: ${err.message}`);
  }
}

function checkSession() {
  return new Promise((resolve) => {
    execFile('tmux', ['display-message', '-t', TMUX_TARGET, '-p', '#{session_name}'], (err) => {
      resolve(!err);
    });
  });
}

function attachPipePane() {
  return new Promise((resolve) => {
    execFile('tmux', ['pipe-pane', '-t', TMUX_TARGET, '-o', `cat >> ${LOG_PATH}`], (err) => {
      _pipePaneAttached = true;
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

function capturePane() {
  return new Promise((resolve, reject) => {
    execFile('tmux', ['capture-pane', '-t', TMUX_TARGET, '-p', '-S', '-50'], (err, stdout) => {
      if (err) reject(err);
      else resolve(stdout);
    });
  });
}

function getCurrentCommand() {
  return new Promise((resolve) => {
    execFile('tmux', ['display-message', '-t', TMUX_TARGET, '-p', '#{pane_current_command}'], (err, stdout) => {
      if (err) resolve(null);
      else resolve(stdout.trim());
    });
  });
}

function getLogOffset() {
  try {
    const stats = fs.statSync(LOG_PATH);
    return stats.size;
  } catch {
    return 0;
  }
}

function readFromOffset(offset) {
  try {
    const fd = fs.openSync(LOG_PATH, 'r');
    const stats = fs.fstatSync(fd);
    const len = stats.size - offset;
    if (len <= 0) {
      fs.closeSync(fd);
      return '';
    }
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, offset);
    fs.closeSync(fd);
    let content = buf.toString('utf8');
    content = stripAnsi(content);
    content = content.replace(/^\[Emily\]:.*$/m, '').trim();
    if (content.length > MAX_OUTPUT_LENGTH) {
      content = content.substring(0, MAX_OUTPUT_LENGTH) + '\n[...truncated]';
    }
    return content;
  } catch {
    return '';
  }
}

function waitForIdle(startOffset) {
  return new Promise((resolve, reject) => {
    let idleCount = 0;
    let lastOutputSize = startOffset;
    const startTime = Date.now();

    function poll() {
      if (Date.now() - startTime > HARD_TIMEOUT) {
        reject(new Error('timeout after 90s'));
        return;
      }

      getCurrentCommand().then((cmd) => {
        const currentSize = getLogOffset();
        const outputGrowing = currentSize > lastOutputSize;
        lastOutputSize = currentSize;

        const isIdle = (cmd === 'claude' || cmd === 'bash' || cmd === 'sh') && !outputGrowing;

        if (isIdle) {
          idleCount++;
        } else {
          idleCount = 0;
        }

        if (idleCount >= IDLE_CONFIRMATIONS_NEEDED) {
          resolve();
        } else {
          setTimeout(poll, IDLE_POLL_INTERVAL);
        }
      });
    }

    poll();
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

      if (!_pipePaneAttached) {
        await attachPipePane();
      }

      const sanitized = sanitizeInput(text);
      const logOffset = getLogOffset();
      await sendKeys(`[Emily]: ${sanitized}`);

      await waitForIdle(logOffset);

      const output = readFromOffset(logOffset);
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
  ensureDirectory();
  truncateLog();

  checkSession().then((exists) => {
    if (exists) {
      log('info', `log file ready at ${LOG_PATH}`);
      attachPipePane().then(() => {
        log('info', 'pipe-pane attached');
      });
    } else {
      log('warn', `tmux target "${TMUX_TARGET}" not found — bridge inactive`);
    }
  });
}

init();

module.exports = { sendMessage };
