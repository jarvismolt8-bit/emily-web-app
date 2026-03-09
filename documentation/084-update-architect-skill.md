# Task 084: update architect-skill

**Created:** 2026-03-09
**Updated:** 2026-03-09

## Plan Notes
- Objective: Update the architect-skill to create a task-scoped git branch at planning time, record it in the blueprint and documentation, and document the full branch lifecycle for safe commit/push/rollback.
- Scope: Modify `/root/.claude/skills/architect-skill/SKILL.md` only — add git branch step to Activation Protocol, Git Branch field to blueprint template header, Git Workflow section (section 7) to blueprint template, Git Branch field to documentation template, and git items to Post-Completion Checklist.
- Phases: Phase 1 – Add Git Branch Step to Activation Protocol, Phase 2 – Add Git Branch Field to Blueprint Template, Phase 3 – Add Git Workflow Section to Blueprint Template, Phase 4 – Add Git Branch to Task Documentation Template, Phase 5 – Update Post-Completion Checklist, Phase 6 – Final Review & Self-Validation
- Complexity: Low
- Git Branch: `task/084-update-architect-skill`

## Development Notes
### Affected Files
| File | Change Type |
|------|-------------|
| `/root/.claude/skills/architect-skill/SKILL.md` | Modify |
| `/var/www/cashflow-manager/tasks/TASK-084-update-architect-skill.md` | Create (blueprint) |
| `/var/www/cashflow-manager/documentation/084-update-architect-skill.md` | Create (this file) |

### Schema Changes
None

### API Contract Changes
None

### Security Considerations
- Branch names derived from task slugs must use only lowercase letters, numbers, and hyphens
- No secrets or credentials involved
- No new auth surface or attack surface introduced

## Progress Notes
- 2026-03-09: Blueprint produced by /architect — 6 phases, Low complexity
- 2026-03-09: Implementation completed by opencode
