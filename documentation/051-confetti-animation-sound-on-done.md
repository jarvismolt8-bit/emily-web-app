# Task 051: Add confetti animation and sound when ticket is done

**Created:** 2026-03-06
**Updated:** 2026-03-06

## Plan Notes
- Objective: Trigger a confetti animation and celebratory sound whenever a task transitions to `done` status.
- Scope: Frontend only — `useConfetti` hook + wiring in `Tasks.tsx`; two trigger paths (Kanban drag-and-drop, modal save); no repeat fire if already done.
- Phases: Install canvas-confetti, Create useConfetti hook, Wire up in Tasks.tsx, Build and deploy
- Complexity: Low

## Development Notes
### Affected Files
| File | Change Type |
|------|-------------|
| `frontend/src/hooks/useConfetti.ts` | Create |
| `frontend/src/components/Tasks.tsx` | Modify |
| `frontend/package.json` | Modify (add canvas-confetti + @types/canvas-confetti) |

### Schema Changes
None

### API Contract Changes
None

### Security Considerations
No new endpoints or auth requirements. canvas-confetti is client-side only. Web Audio API is triggered by user gestures (drag-end, button click) — no autoplay policy violation risk.

## Progress Notes
- 2026-03-06: Blueprint produced by /architect
