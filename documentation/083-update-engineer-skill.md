# Task 083: Update engineer-skill

**Created:** 2026-03-09
**Updated:** Mar 09, 2026

## Plan Notes
- Objective: Update both engineer-skill files (Claude Code and OpenCode) to read the task's git branch from the blueprint, commit after each phase, and support user-commanded git operations (stage, commit, push, undo).
- Scope: Modify `/root/.claude/skills/engineer-skill/SKILL.md` AND `/root/.config/opencode/skills/engineer-skill/SKILL.md` — same git additions adapted to each file's structure.
- Phases: Phase 1 – Add Git Branch Read to Activation Protocol, Phase 2 – Add Per-Phase Git Commit to Execution Flow, Phase 3 – Add Git Operations Reference Section, Phase 4 – Update Phase Completion Report Template, Phase 5 – Add Git Hard Rules, Phase 6 – Update OpenCode Engineer Skill, Phase 7 – Final Review & Self-Validation
- Complexity: Low
- Git Branch: None (skipped per user instruction for this task)

## Development Notes
### Affected Files
| File | Change Type |
|------|-------------|
| `/root/.claude/skills/engineer-skill/SKILL.md` | Modify |
| `/root/.openclaw/workspace/skills/engineer-skill/SKILL.md` | Modify |
| `/var/www/cashflow-manager/tasks/TASK-083-update-engineer-skill.md` | Create (blueprint) |
| `/var/www/cashflow-manager/documentation/083-update-engineer-skill.md` | Create (this file) |

### Schema Changes
None

### API Contract Changes
None

### Security Considerations
- No secrets or credentials involved
- Git operations use the existing server user — no new auth surface
- No `git add .` — specific file staging only to avoid accidental credential commits

## Progress Notes
- 2026-03-09: Blueprint produced by /architect — 6 phases, Low complexity. Git branch creation skipped per user instruction.
- 2026-03-09: Blueprint revised — scope expanded to include OpenCode engineer-skill. Phase 6 added for OpenCode updates; Phase 7 is Final Review. Now 7 phases.
- 2026-03-09: Implementation completed by opencode
