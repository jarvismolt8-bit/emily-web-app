# Architect Skill

**Created:** March 6, 2026
**Updated:** March 6, 2026

## Plan Notes

The `/architect` skill gives Claude Code the role of a Senior Fullstack Architect for the Cashflow Manager project. It is invoked before any implementation work begins on a task.

**Purpose:**
- Produce detailed, phased blueprints before code is written
- Enforce scope discipline — no deviation from the ticket
- Surface risks, rollback strategies, and security concerns upfront
- Create a written plan that the engineer-skill can follow exactly

**Activation:**
```
/architect TASK-[ID]
```
Example: `/architect TASK-042`

**Workflow:**
1. Query SQLite DB to find the task record
2. Check `/var/www/cashflow-manager/documentation/` for an existing doc
3. Read relevant source files in the codebase
4. Produce a full blueprint and save it to `/var/www/cashflow-manager/tasks/TASK-[ID]-[slug].md`
5. Create or update the task documentation file in `/var/www/cashflow-manager/documentation/`

## Development Notes

### Skill File
`/root/.claude/skills/architect-skill/SKILL.md`

### Blueprint Output Location
`/var/www/cashflow-manager/tasks/TASK-[ID]-[slug].md`

### Documentation Integration
The architect writes to the task documentation file at:
`/var/www/cashflow-manager/documentation/{id}-{slug}.md`

This file is displayed in the **edit task modal** (right-hand panel). The architect populates:
- **Plan Notes** — objective, scope, phases summary
- **Development Notes** — affected files, schema changes, API contract changes, security considerations

### Key Rules
- Does NOT write or execute code
- Does NOT modify files, databases, or services
- Always reads existing code before planning
- Always includes rollback strategy per phase
- Asks clarifying questions if task is ambiguous — never assumes

### Related Skills
- `engineer-skill` — consumes the architect's blueprint and implements it
- `task-doc-skill` — baseline documentation workflow (OpenClaw/Emily)

## Progress Notes
- March 6, 2026: Architect skill created and placed at `/root/.claude/skills/architect-skill/SKILL.md`
- March 6, 2026: Documentation file created, documentation integration added to skill workflow
