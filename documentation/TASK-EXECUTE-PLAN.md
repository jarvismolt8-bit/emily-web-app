# Task Execute Button - Implementation Plan

## Overview

Add an "Execute" button to in-progress tasks in the Cashflow Manager Kanban view. When clicked, this button will spawn a new OpenCode session with the task's details, enabling Emily (OpenClaw) to work on the task using plan/build mode.

## Requirements

1. **UI Button**: Add "Execute" button only visible for tasks with `status === 'in_progress'`
2. **Session Naming**: Use format `{id}-{title}` (e.g., `001-Cloudflare implementation`) for easy reference
3. **Initial Prompt**: Use task's `description` field as the initial prompt content
4. **Plan Mode**: New sessions must start in OpenCode plan/build mode

## Important Change: Foreground Session (Not Background)

The OpenCode session must run in the **foreground** (visible to user) rather than in the background. This allows:
- User to see the session running in real-time
- User to take over/interact with the session
- Better visibility into Emily's thought process and actions

The session should also be registered with the OpenClaw project at path `/` so it can be tracked and managed.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────────────────┐
│  TaskKanban    │────▶│  Tasks API       │────▶│  OpenCode Session (Foreground) │
│  (Frontend)    │     │  (Backend)       │     │  - Visible in terminal         │
└─────────────────┘     └──────────────────┘     │  - Connected to OpenClaw      │
        │                       │                  │  - Workdir: /                 │
   User clicks            POST /api/v1/          └────────────────────────────────┘
   "Execute"              tasks/:id/execute
```

## Implementation Steps

### Step 1: Frontend - Add Execute Button to TaskCard

**File**: `/var/www/cashflow-manager/frontend/src/components/TaskKanban.tsx`

**Changes**:
- Import `Play` icon from lucide-react
- Add `onExecute` prop to `TaskCard` and `BoardColumn` components
- Add conditional rendering: show "Execute" button only when `task.status === 'in_progress'`
- Style button with play icon, green color scheme

**Code Structure**:
```tsx
// TaskCard component additions
{task.status === 'in_progress' && (
  <Button 
    size="sm" 
    variant="outline"
    className="h-7 gap-1"
    onClick={(e) => {
      e.stopPropagation();
      onExecute(task);
    }}
  >
    <Play className="h-3 w-3" />
    Execute
  </Button>
)}
```

### Step 2: Frontend - Add Execute API Function

**File**: `/var/www/cashflow-manager/frontend/src/api/tasks.ts`

**Changes**:
- Add `executeTask(taskId: string): Promise<void>` function
- Call `POST /api/v1/tasks/${taskId}/execute`

**Code Structure**:
```ts
export const executeTask = async (taskId: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to execute task');
  }
  
  return response.json();
};
```

### Step 3: Frontend - Wire Up Execute Handler

**File**: `/var/www/cashflow-manager/frontend/src/components/Tasks.tsx`

**Changes**:
- Add `handleExecute` function to call API
- Pass `onExecute` prop to `TaskKanban`
- Add loading state handling

### Step 4: Backend - Add Execute Endpoint (Foreground Session)

**File**: `/var/www/cashflow-manager/backend/routes/v1/tasks.js`

**Important**: The session must run in the **foreground** (not detached/background) so the user can see it and interact with it.

**Changes**:
- Add new route: `POST /tasks/:id/execute`
- Validate task exists and status is 'in_progress'
- Retrieve task details (id, name, description)
- Register session with OpenClaw project at `/`
- Spawn OpenCode session in foreground using PTY

**Endpoint Logic**:
```javascript
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

router.post('/:id/execute', async (req, res) => {
  const { id } = req.params;
  
  // Get task from database
  const task = await tasksRepo.findById(id);
  
  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }
  
  if (task.status !== 'in_progress') {
    return res.status(400).json({ error: 'Only in_progress tasks can be executed' });
  }
  
  // Session configuration
  const sessionName = `${task.id}-${task.name}`;
  const description = task.description || '';
  const workdir = '/';  // OpenClaw project root
  
  // Register session with OpenClaw (create session file or update config)
  // This makes the session visible in OpenClaw project at "/"
  const openclawConfigPath = '/root/.openclaw/sessions.json';
  const sessionConfig = {
    name: sessionName,
    workdir: workdir,
    taskId: task.id,
    taskTitle: task.name,
    createdAt: new Date().toISOString(),
    status: 'running'
  };
  
  // Update OpenClaw sessions tracking
  let sessions = [];
  if (fs.existsSync(openclawConfigPath)) {
    sessions = JSON.parse(fs.readFileSync(openclawConfigPath, 'utf8'));
  }
  sessions.push(sessionConfig);
  fs.writeFileSync(openclawConfigPath, JSON.stringify(sessions, null, 2));
  
  // Spawn OpenCode session in foreground with PTY
  // Using spawn (not detached) so user can see and interact
  const command = `opencode`;
  const args = ['run', '--plan', '--name', sessionName, description];
  
  const proc = spawn(command, args, {
    cwd: workdir,
    stdio: 'inherit',  // Connect to parent terminal for visibility
    env: { 
      ...process.env,
      OPENCODE_SESSION_NAME: sessionName,
      OPENCODE_WORKDIR: workdir
    }
  });
  
  proc.on('close', (code) => {
    // Update session status when closed
    const sessions = JSON.parse(fs.readFileSync(openclawConfigPath, 'utf8'));
    const idx = sessions.findIndex(s => s.name === sessionName);
    if (idx >= 0) {
      sessions[idx].status = code === 0 ? 'completed' : 'failed';
      sessions[idx].exitCode = code;
      sessions[idx].endedAt = new Date().toISOString();
      fs.writeFileSync(openclawConfigPath, JSON.stringify(sessions, null, 2));
    }
  });
  
  return res.json({ 
    success: true, 
    message: 'OpenCode session started',
    sessionName,
    workdir,
    mode: 'plan'
  });
});
```

**Alternative: Using node-pty for better PTY support**:
```javascript
const pty = require('node-pty');

// In the route handler:
const ptyProcess = pty.spawn('opencode', [
  'run', 
  '--plan', 
  '--name', sessionName, 
  description
], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: '/',
  env: process.env
});

// Stream output to response for visibility
ptyProcess.onData((data) => {
  res.write(`data: ${data}\n\n`);
});

// Handle process exit
ptyProcess.onExit(({ exitCode }) => {
  res.end();
});

res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-open');
```

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `frontend/src/components/TaskKanban.tsx` | Modify | Add Execute button to TaskCard |
| `frontend/src/api/tasks.ts` | Modify | Add executeTask API function |
| `frontend/src/components/Tasks.tsx` | Modify | Wire up execute handler |
| `backend/routes/v1/tasks.js` | Modify | Add execute endpoint |
| `documentation/TASK-EXECUTE-PLAN.md` | Create | This document |

## Testing Checklist

- [ ] Execute button appears only on in_progress tasks
- [ ] Execute button hidden on backlog and done tasks
- [ ] Clicking Execute calls correct API endpoint
- [ ] API validates task status before execution
- [ ] OpenCode session spawns with correct name
- [ ] Session starts in plan mode
- [ ] Session runs in foreground (visible in terminal)
- [ ] Session is registered with OpenClaw project at "/"
- [ ] User can see session output in real-time
- [ ] User can take over/interact with session
- [ ] Error handling for failed spawns
- [ ] Loading state during execution
- [ ] Session status updated on completion

## Security Considerations

1. **Authentication**: Ensure backend endpoint validates authentication
2. **Rate Limiting**: Consider adding rate limit to prevent spam execution
3. **Input Sanitization**: Sanitize task name/description before passing to shell
4. **Timeout**: Add timeout for OpenCode session spawn

## OpenCode Session Details

- **Workspace**: `/` (root - OpenClaw project path)
- **Mode**: Plan mode (`--plan`)
- **Session Name Format**: `{id}-{title}` (e.g., `001-Cloudflare implementation`)
- **Initial Context**: Task description field content
- **Execution Mode**: Foreground (visible, interactive)
- **OpenClaw Integration**: Session registered with OpenClaw at path `/`

## OpenCode Command

```bash
# Template
opencode run --plan --name "{id}-{title}" "{description}"

# Example
opencode run --plan --name "001-Cloudflare implementation" "Implement Cloudflare for the web app"
```

## Session Lifecycle

1. **Trigger**: User clicks "Execute" button
2. **Registration**: Session registered with OpenClaw (sessions.json)
3. **Spawn**: OpenCode starts in foreground with PTY
4. **Visibility**: User sees session in terminal (stdio: inherit)
5. **Interaction**: User can take over anytime
6. **Completion**: Session status updated in OpenClaw

## Future Enhancements

1. **Session Tracking**: Store active sessions in database to track progress
2. **Real-time Updates**: WebSocket connection to show session status in UI
3. **Session Termination**: Ability to kill running OpenCode session
4. **Multiple Sessions**: Allow running multiple task sessions simultaneously
5. **Session History**: Log all executions for audit trail
