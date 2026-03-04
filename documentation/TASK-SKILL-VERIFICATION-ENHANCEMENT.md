# Task Skill Verification Enhancement

**DATE:** 2025-03-04  
**TASK:** Prevent false success reports in task operations  
**SKILL:** `/root/.openclaw/workspace/skills/task-skill/`

---

## Problem

On 2025-03-04, Emily reported creating task "study remotion" with ID 068, but the task did not exist in the database. Investigation revealed that the backend was likely down during the creation attempt, causing the API call to fail, but Emily prematurely reported success.

---

## Root Cause

The task-skill only checked for `"success": true` in the API response but did **not verify** that the task actually exists after the operation. A failed network request or backend error could result in no task being created despite a success response (or Emily misinterpreting the output).

---

## Solution: Mandatory Verification

Added verification steps to **every** CRUD operation:

### CREATE (ADD TASK)
1. Execute POST to `/api/v1/tasks`
2. Extract `task.id` from `response.data.id`
3. **VERIFY:** GET `/api/v1/tasks/{id}`
4. Confirm task exists with correct name
5. If verification fails → retry once → report error

### UPDATE
1. Execute PUT to update task
2. **VERIFY:** GET `/api/v1/tasks/{id}`
3. Confirm updated fields match
4. If verification fails → retry once → report error

### DELETE
1. Execute DELETE
2. **VERIFY:** GET `/api/v1/tasks/{id}`
3. Confirm task returns 404/not found
4. If verification fails → retry once → report error

---

## Files Modified

| File | Changes |
|------|---------|
| `SKILL.md` | Added verification steps to ADD, UPDATE, DELETE operations; added "CRITICAL VERIFICATION" section; updated IMPORTANT RULES |
| `SKILL-ESSENTIAL.md` | Condensed verification instructions for all operations; added retry and no-confirm-without-verify rules |

---

## Key Improvements

- ✅ **No premature success reports** - Emily must verify before confirming
- ✅ **Backend failure detection** - Silent failures are caught by verification
- ✅ **Retry logic** - Single retry on transient errors
- ✅ **User gets accurate feedback** - Errors reported instead of false confirmations

---

## Expected Behavior After Update

When Emily adds a task:

```
User: Add task study remotion
Emily: [executes POST]
Emily: [extracts task ID from response]
Emily: [executes GET to verify]
Emily: ✅ "Task added with ID 068" (only if verification succeeds)
```

If verification fails:

```
Emily: "I encountered an error. Let me retry..."
[retries once]
Emily: If still failing: "Failed to create task. Please try again or check the backend."
```

---

## Testing Recommendation

Test the improved skill by:
1. Having Emily add a new task
2. Asking her to show the verification step
3. Simulating backend downtime (stop server) to test retry/error handling
4. Confirming tasks appear in web app after successful creation

---

## No Backend Changes Required

The existing API already supports all required endpoints (`GET /tasks/:id`). This improvement is purely in the skill instructions that Emily follows.
