# Engineer Skill

**Created:** March 6, 2026
**Updated:** March 6, 2026

## Plan Notes

The `/engineer` skill gives Claude Code the role of a Senior Fullstack Engineer for the Cashflow Manager project. It is invoked after the architect-skill has produced a blueprint.

**Purpose:**
- Implement exactly what the Architect has blueprinted — no improvisation
- Execute one phase at a time, stopping after each for user approval
- Update the task documentation file with progress as work proceeds
- Surface out-of-scope observations without acting on them

**Activation:**
```
/engineer TASK-[ID]
```
Example: `/engineer TASK-042`

**Workflow:**
1. Locate the blueprint at `/var/www/cashflow-manager/tasks/TASK-[ID]-[slug].md`
2. If blueprint is missing → stop and tell user to run `/architect TASK-[ID]` first
3. Summarize phases and ask confirmation before starting Phase 1
4. Implement phase by phase, outputting a Phase Completion Report after each
5. Update task documentation after each phase
6. Wait for explicit user approval before proceeding to next phase

## Development Notes

### Skill File
`/root/.claude/skills/engineer-skill/SKILL.md`

### Blueprint Input Location
`/var/www/cashflow-manager/tasks/TASK-[ID]-[slug].md`

### Documentation Integration
The engineer updates the task documentation file at:
`/var/www/cashflow-manager/documentation/{id}-{slug}.md`

This file is displayed in the **edit task modal** (right-hand panel). The engineer updates:
- **Development Notes** — files modified, decisions made, patterns followed
- **Progress Notes** — timestamped entry after each phase completes

### Key Rules
- Never deviates from blueprint scope
- Never refactors unrelated code (logs it, doesn't touch it)
- Never skips or merges phases without explicit user approval
- Runs `node -c <file>` before any `pm2 restart`
- Always uses CommonJS (`require`/`module.exports`) — never ES modules

### Related Skills
- `architect-skill` — produces the blueprint the engineer follows
- `task-doc-skill` — baseline documentation workflow (OpenClaw/Emily)

## Progress Notes
- March 6, 2026: Engineer skill created and placed at `/root/.claude/skills/engineer-skill/SKILL.md`
- March 6, 2026: Documentation file created, documentation integration added to skill workflow
