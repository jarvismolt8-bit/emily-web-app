---
name: task-skill-polished
description: Enhanced task management skill documentation with improved security, troubleshooting, and developer experience.
version: 1.0.2
last-updated: 2026-03-04
---

# TASK-SKILL Skill - Polished Documentation

This document provides enhanced documentation for the task-skill skill with improved security practices, troubleshooting guidance, and better developer experience.

## 🚨 CRITICAL EXECUTION REQUIREMENTS

When handling user requests:

1. **PARSE** the user's intent and extract task details
2. **EXECUTE** the curl command using bash tool
3. **WAIT** for API response before proceeding
4. **CONFIRM** only after receiving `{"success": true, ...}`

**DO NOT just acknowledge - you MUST run the curl command!**

If you don't execute the API call, data won't be saved. Always check the response envelope before confirming.

## API Configuration

**Base URL:** `http://localhost:3001/api/v1/tasks`
**Authentication:** Header `X-Password: 10716255` (use environment variable in production)
**Source Header:** Header `X-Source: telegram`
**Content-Type:** `application/json`

**Response Envelope:**
```json
{ "success": true, "data": { ... }, "message": "optional" }
{ "success": false, "error": { "code": "...", "message": "..." } }
```

## Task Status Workflow

Tasks progress through three statuses:
- **backlog** - Not yet started (default for new tasks)
- **in_progress** - Currently being worked on
- **done** - Completed

**IMPORTANT:** When user says "task is done", UPDATE status to "done" - do NOT delete the task!

## ADD TASK BEHAVIOR

**User Commands:**
- `add task water the plants at 3pm`
- `remind me to water the plants at 3pm`
- `add urgent task submit report`

**Implementation Steps:**

1. **Parse Task Details:**
   - Name: Extract main task
   - Priority: Keywords (urgent, critical, important → high)
   - Description: Optional details
   - Time: Parse time if provided

2. **Get Philippine Time:**
```bash
TZ='Asia/Manila' date '+%b %d %Y %l:%M%p'
```

3. **Execute API Call:**
```bash
curl -X POST "http://localhost:3001/api/v1/tasks" \
  -H "Content-Type: application/json" \
  -H "X-Password: 10716255" \
  -H "X-Source: telegram" \
  -d '{
    "name": "Task name here",
    "description": "Optional details about the task",
    "priority": "high",
    "date": "Feb 18 2026",
    "time": "5:30pm",
    "status": "backlog"
  }'
```

4. **Validate Response:** Check for `{"success": true}` before confirming

**Priority Keywords:**
- **high**: urgent, critical, important
- **medium**: (default)
- **low**: minor, optional

## UPDATE TASK STATUS

**Status Mapping Table:**
| User Says | Status Value |
|-----------|--------------|
| "done", "completed", "finished" | done |
| "in progress", "working on", "started" | in_progress |
| "backlog", "not started", "todo" | backlog |

**API Calls:**

**Mark as Done:**
```bash
curl -X PUT "http://localhost:3001/api/v1/tasks/001" \
  -H "Content-Type: application/json" \
  -H "X-Password: 10716255" \
  -H "X-Source: telegram" \
  -d '{"status": "done"}'
```

**Mark as In Progress:**
```bash
curl -X PUT "http://localhost:3001/api/v1/tasks/001" \
  -H "Content-Type: application/json" \
  -H "X-Password: 10716255" \
  -H "X-Source: telegram" \
  -d '{"status": "in_progress"}'
```

**Move to Backlog:**
```bash
curl -X PUT "http://localhost:3001/api/v1/tasks/001" \
  -H "Content-Type: application/json" \
  -H "X-Password: 10716255" \
  -H "X-Source: telegram" \
  -d '{"status": "backlog"}'
```

## DELETE TASK BEHAVIOR

**ONLY delete when user EXPLICITLY says "delete" or "remove"!**

**Delete by ID (if known):**
```bash
curl -X DELETE "http://localhost:3001/api/v1/tasks/012" \
  -H "X-Password: 10716255" \
  -H "X-Source: telegram"
```

**Delete by Name:**
```bash
curl -X DELETE "http://localhost:3001/api/v1/tasks?name=water%20the%20plants" \
  -H "X-Password: 10716255" \
  -H "X-Source: telegram"
```

## EDIT/UPDATE TASK BEHAVIOR

**Step 1: Find Task (if needed):**
```bash
curl -X GET "http://localhost:3001/api/v1/tasks" \
  -H "X-Password: 10716255" \
  -H "X-Source: telegram"
```

**Step 2: Update Task:**
```bash
curl -X PUT "http://localhost:3001/api/v1/tasks/001" \
  -H "Content-Type: application/json" \
  -H "X-Password: 10716255" \
  -H "X-Source: telegram" \
  -d '{
    "name": "New task name",
    "description": "Updated description",
    "priority": "high",
    "status": "in_progress"
  }'
```

## VIEW TASKS BEHAVIOR

**Default View (Priority High to Low):**
```bash
curl -X GET "http://localhost:3001/api/v1/tasks" \
  -H "X-Password: 10716255" \
  -H "X-Source: telegram"
```

## Sorting Tasks

**Available Sort Options:**
- `sortBy=id` - Sort by task ID number
- `sortBy=date` - Sort by due date
- `sortBy=priority` - Sort by priority level
- `sortOrder=asc` - Ascending order
- `sortOrder=desc` - Descending order

**User Phrases to Sort Options:**
- "show tasks by priority" → `sortBy=priority&sortOrder=desc`
- "sort by due date" → `sortBy=date&sortOrder=asc`
- "order by task number" → `sortBy=id&sortOrder=asc`
- "show urgent tasks first" → `sortBy=priority&sortOrder=desc`

**Visual Display Format:**
```
⛔ 001 | Submit report | Backlog | Feb 6, 2026 | 3:00pm
1f535 002 | Build an app | In Progress | Feb 7, 2026 | 6:00pm
2705 003 | Read book | Done |
```

**Priority Indicators:**
- ⛔ = high
- 1f535 = medium  
- 2705 = low

**Status Indicators:**
- 1f4c3 = backlog
- 1f504 = in_progress
- 2705 = done

## Filter Web App Tasks from Telegram

**When user says "filter the web app tasks":**

### Step 1: Parse Filter Request
- "show only done tasks" → status: "done"
- "show in progress tasks" → status: "in_progress"
- "show backlog tasks" → status: "backlog"
- "filter by high priority" → priority: "high"
- "search for report" → search: "report"

### Step 2: Call Filter API

**Send Filter to Web App:**
```bash
curl -X POST "http://localhost:3001/api/v1/tasks/filter" \
  -H "Content-Type: application/json" \
  -H "X-Password: 10716255" \
  -H "X-Source: telegram" \
  -d '{
    "status": "done",
    "priority": "",
    "search": ""
  }'
```

**Filter Values:**
- `status`: "" (all), "backlog", "in_progress", "done"
- `priority`: "" (all), "high", "medium", "low"
- `search`: "" (empty) or search term

### Step 3: Clear Filter

**Reset Filter:**
```bash
curl -X DELETE "http://localhost:3001/api/v1/tasks/filter" \
  -H "X-Password: 10716255" \
  -H "X-Source: telegram"
```

**Response Behavior Rules:**
- **If user explicitly says "filter the web app"** → Call filter API, then confirm: "Done! I've updated the web app's task list with the filter."
- **Otherwise** → Just show filtered results in Telegram using GET API with filter query params

**User Phrases:**
- "filter web app to show done tasks" → POST filter with status: "done"
- "show only high priority tasks in web app" → POST filter with priority: "high"
- "clear the task filter on web app" → DELETE filter

## IMPORTANT RULES

- **ALWAYS execute the curl command** - do not just say you did it
- **WAIT for the API response** before confirming to user
- **Check for `{"success": true}`** in the response
- **ALWAYS include headers:**
  - `X-Password: 10716255`
  - `X-Source: telegram`
- **Use proper REST methods:**
  - `POST` for create
  - `PUT` for update (including status changes)
  - `DELETE` for delete (only when explicitly requested!)
  - `GET` for view
- **Parse response envelope** - data is in `response.data`
- **Use Philippine Time** - UTC+8 for dates and times
- **DO NOT delete when "done"** - update status to "done" instead

## Security Note

**Production Warning:** The hardcoded password `10716255` should be replaced with environment variables or secure credential management in production environments.

## Troubleshooting

**Common Issues:**
- **API Unreachable:** Check if backend is running on port 3001
- **Authentication Failed:** Verify password and headers
- **Invalid JSON:** Check for proper escaping in curl commands
- **Time Zone Issues:** Ensure system time is set to UTC+8 for Philippine time

**Debug Commands:**
```bash
# Check backend status
curl -I http://localhost:3001/api/v1/tasks

# Test authentication
curl -X GET "http://localhost:3001/api/v1/tasks" \
  -H "X-Password: 10716255" \
  -H "X-Source: telegram"
```