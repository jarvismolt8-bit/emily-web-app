# Task 035: ✨ Improve task

**Created:** Feb 26 2026  
**Updated:** Feb 26 2026

## Plan Notes
- Add documentation section in edit task modal, placed in second column
- 1st column is the edit task form, 2nd column is the documentation
- Enlarge the width significantly for the edit task modal (responsive)
- Documentation section is an md file compiled in /var/www/cashflow-manager/documentation/
- This md file is read only and cannot be edited from the UI
- This md file is created by opencode or emily when doing the specific task
- This md documentation will be updated everytime the ticket is worked on
- Add skill for opencode and emily so that they will document and update

## Development Notes

### Implementation Details
- Added API endpoints in backend (routes/v1/tasks.js):
  - GET /:id/documentation - Read documentation file
  - POST /:id/documentation - Create/update documentation file
- Modified TaskModal.tsx:
  - Enlarged modal width: max-w-md → full width using size prop
  - 2-column responsive layout: 40% form (left), 60% documentation (right)
  - Added react-markdown for rendering documentation
  - Fetches documentation on modal open
- Modified dialog.tsx to add size prop (default, sm, lg, xl, full)
- Created task-doc-skill for auto-updating documentation
- Installed @tailwindcss/typography for GitHub-style markdown rendering

### Documentation System Architecture

#### How They Connect

**1. Task → Documentation**
- Each task has a corresponding MD file: `{id}-{slug}.md`
- File naming: `035-improve-task.md`
- Created when work begins on a task

**2. Frontend Display**
- TaskModal fetches doc via API: `GET /api/v1/tasks/{id}/documentation`
- Renders markdown in right panel (60% width)

**3. Backend API**
- `GET /api/v1/tasks/:id/documentation` → Reads MD file
- `POST /api/v1/tasks/:id/documentation` → Updates MD file

#### Agent (OpenCode/Emily) Workflow

**Triggers:**
1. On task edit/update via task-skill
2. On command "document progress", "update doc"
3. On planning new work
4. On completion

**Actions:**
- Creates MD file from template on task start
- Updates "Progress Notes" with timestamp
- Updates "Development Notes" with implementation details
- Auto-updates "Updated" date

#### Key Files
- **Backend**: `/var/www/cashflow-manager/backend/routes/v1/tasks.js` (API endpoints)
- **Frontend**: `/var/www/cashflow-manager/frontend/src/components/TaskModal.tsx` (display)
- **Skill**: `/root/.openclaw/workspace/skills/task-doc-skill/SKILL.md` (agent automation)

## Progress Notes
- Feb 26 2026: Created initial documentation file 035-improve-task.md
- Feb 26 2026: Added backend API endpoints for reading/writing documentation
- Feb 26 2026: Modified TaskModal.tsx with 2-column layout and documentation panel
- Feb 26 2026: Created task-doc-skill for auto-documentation
- Feb 26 2026: Modified dialog.tsx to support full-width modal
- Feb 26 2026: Build successful - ready for testing
- Feb 26 2026: Documentation now showing in edit modal
- Feb 26 2026: Fixed markdown styling with @tailwindcss/typography
- Feb 26 2026: Restructured form layout - date/time stacked, status/priority flex
